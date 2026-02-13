"""WebSocket chat endpoint with JWT auth and agent integration."""
import asyncio
import json
import logging
import uuid
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.core.security import decode_token
from app.models.user import User
from app.models.chat import Conversation, Message
from app.agents.base_agent import AgentContext
from app.agents.orchestrator import get_orchestrator
from app.agents.memory import get_memory_manager
from app.nlp import get_nlp_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()

class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}  # user_id -> ws

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: user {user_id}")

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)
        logger.info(f"WebSocket disconnected: user {user_id}")

    async def send_json(self, user_id: str, data: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            await ws.send_json(data)

manager = ConnectionManager()

async def authenticate_websocket(token: str) -> User | None:
    """Authenticate WebSocket connection via JWT token."""
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None

        async with async_session_factory() as db:
            result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
            return result.scalar_one_or_none()
    except (JWTError, ValueError):
        return None

@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time chat with AI agents."""
    # Authenticate via query param
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    user = await authenticate_websocket(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid authentication token")
        return

    user_id = str(user.id)
    await manager.connect(websocket, user_id)

    memory = get_memory_manager()
    orchestrator = get_orchestrator()
    nlp_pipeline = get_nlp_pipeline()

    try:
        while True:
            # Receive message
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = data.get("type", "message")

            # Handle ping/pong heartbeat
            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
                continue

            if msg_type != "message":
                await websocket.send_json({"type": "error", "message": f"Unknown message type: {msg_type}"})
                continue

            content = data.get("content", "").strip()
            if not content:
                await websocket.send_json({"type": "error", "message": "Empty message"})
                continue

            conversation_id = data.get("conversation_id")

            # Process in a database session
            async with async_session_factory() as db:
                # Create or get conversation
                if not conversation_id:
                    convo = await memory.create_conversation(
                        user_id=user_id,
                        db=db,
                        title=content[:100],
                    )
                    conversation_id = str(convo.id)
                    await db.commit()

                    await websocket.send_json({
                        "type": "conversation_created",
                        "conversation_id": conversation_id,
                        "title": content[:100],
                    })

                # Save user message
                await memory.save_message(
                    conversation_id=conversation_id,
                    role="user",
                    content=content,
                    db=db,
                )
                await db.commit()

                # Run NLP pipeline
                nlp_result = await nlp_pipeline.process(content)

                # Get conversation context for agent
                context_messages = await memory.get_conversation_context(conversation_id, db)

                # Build agent context
                agent_context = AgentContext(
                    user_id=user_id,
                    advisor_id=user_id,  # Use user_id as advisor_id for now
                    conversation_id=conversation_id,
                    session_messages=context_messages,
                )

                # Generate message ID for streaming
                message_id = str(uuid.uuid4())

                await websocket.send_json({
                    "type": "stream_start",
                    "conversation_id": conversation_id,
                    "message_id": message_id,
                    "agent": nlp_result.intent.name,
                })

                # Stream agent response
                full_content = ""
                agent_name = ""
                tool_calls = []

                async for event in orchestrator.process_stream(
                    message=content,
                    context=agent_context,
                    db=db,
                    nlp_result=nlp_result.to_dict(),
                ):
                    event_type = event.get("type")

                    if event_type == "stream_token":
                        token = event.get("token", "")
                        full_content += token
                        await websocket.send_json({
                            "type": "stream_token",
                            "token": token,
                            "message_id": message_id,
                        })
                    elif event_type == "agent_status":
                        await websocket.send_json({
                            "type": "agent_status",
                            "status": event.get("status"),
                            "agent": event.get("agent", ""),
                            "message": event.get("message", ""),
                        })
                        agent_name = event.get("agent", agent_name)
                    elif event_type == "stream_end":
                        full_content = event.get("content", full_content)
                        agent_name = event.get("agent", agent_name)
                        tool_calls = event.get("tool_calls", [])

                # Save assistant response
                await memory.save_message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_content,
                    db=db,
                    metadata={
                        "agent": agent_name,
                        "intent": nlp_result.intent.name,
                        "entities": nlp_result.entities.to_dict(),
                        "tools_used": tool_calls,
                    },
                )
                await db.commit()

                # Send stream end
                await websocket.send_json({
                    "type": "stream_end",
                    "message_id": message_id,
                    "conversation_id": conversation_id,
                    "full_content": full_content,
                    "metadata": {
                        "agent": agent_name,
                        "intent": nlp_result.intent.name,
                        "entities": nlp_result.entities.to_dict(),
                        "sentiment": nlp_result.sentiment.to_dict(),
                        "tools_used": tool_calls,
                    },
                })

                # Check if summarization is needed
                if await memory.should_summarize(conversation_id, db):
                    await memory.summarize_conversation(conversation_id, db)
                    await db.commit()

    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(user_id)
