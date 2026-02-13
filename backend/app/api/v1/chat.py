"""Chat REST API endpoints for conversation management and SSE streaming."""
import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.models.chat import Conversation, Message
from app.schemas.chat import (
    ConversationCreate, ConversationResponse, ConversationListResponse,
    MessageResponse, MessageListResponse,
)
from app.agents.base_agent import AgentContext
from app.agents.orchestrator import get_orchestrator
from app.agents.memory import get_memory_manager
from app.nlp import get_nlp_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()


# --- Agents Listing ---


@router.get("/agents")
async def list_agents(
    user: User = Depends(get_current_active_user),
):
    """Return all registered agents with name, description, and category."""
    orchestrator = get_orchestrator()
    agents = orchestrator.get_agent_info()
    return {"agents": agents, "total": len(agents)}


# --- SSE Streaming ---

class ChatStreamRequest(BaseModel):
    content: str
    conversation_id: str | None = None
    agent_type: str | None = None


def _sse_event(event: str, data: dict) -> str:
    """Format a server-sent event."""
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@router.post("/stream")
async def chat_stream(
    body: ChatStreamRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    """SSE streaming endpoint for chat. Accepts a message, streams agent response."""

    async def event_generator():
        memory = get_memory_manager()
        orchestrator = get_orchestrator()
        nlp_pipeline = get_nlp_pipeline()

        conversation_id = body.conversation_id
        content = body.content.strip()

        if not content:
            yield _sse_event("error", {"message": "Empty message"})
            return

        try:
            # Create conversation if needed
            if not conversation_id:
                convo = await memory.create_conversation(
                    user_id=str(user.id),
                    db=db,
                    title=content[:100],
                    agent_type=body.agent_type,
                )
                conversation_id = str(convo.id)
                await db.commit()

                yield _sse_event("conversation_created", {
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

            # Get conversation context
            context_messages = await memory.get_conversation_context(
                conversation_id, db
            )

            # Build agent context
            agent_context = AgentContext(
                user_id=str(user.id),
                advisor_id=str(user.id),
                conversation_id=conversation_id,
                session_messages=context_messages,
            )

            # If user explicitly selected an agent, override intent routing
            if body.agent_type and body.agent_type not in ("general", "advisor_assistant"):
                agent_context.metadata["forced_agent"] = body.agent_type

            message_id = str(uuid.uuid4())

            # Stream agent response
            full_content = ""
            agent_name = ""
            tool_calls: list[str] = []

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
                    yield _sse_event("stream_token", {
                        "token": token,
                        "message_id": message_id,
                    })
                elif event_type == "agent_status":
                    yield _sse_event("agent_status", {
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
                extra_data={
                    "agent": agent_name,
                    "intent": nlp_result.intent.name,
                    "entities": nlp_result.entities.to_dict(),
                    "tools_used": tool_calls,
                },
            )
            await db.commit()

            # Send stream end
            yield _sse_event("stream_end", {
                "message_id": message_id,
                "conversation_id": conversation_id,
                "content": full_content,
                "metadata": {
                    "agent": agent_name,
                    "intent": nlp_result.intent.name,
                    "tools_used": tool_calls,
                },
            })

            # Check if summarization is needed
            if await memory.should_summarize(conversation_id, db):
                await memory.summarize_conversation(conversation_id, db)
                await db.commit()

        except Exception as e:
            logger.error(f"SSE stream error: {e}", exc_info=True)
            yield _sse_event("error", {"message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# --- Conversation CRUD ---

@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    body: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    convo = Conversation(
        id=uuid.uuid4(),
        user_id=user.id,
        title=body.title or "New Conversation",
        agent_type=body.agent_type,
    )
    db.add(convo)
    await db.flush()
    return convo

@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    archived: bool = False,
):
    base_query = select(Conversation).where(
        Conversation.user_id == user.id,
        Conversation.is_archived == archived,
    )

    # Count
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0

    # Fetch
    result = await db.execute(
        base_query.order_by(Conversation.last_message_at.desc().nulls_last(), Conversation.created_at.desc())
        .offset(skip).limit(limit)
    )
    conversations = result.scalars().all()

    return ConversationListResponse(conversations=conversations, total=total)

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    convo = result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return convo

@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
async def get_messages(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    # Verify conversation belongs to user
    convo_result = await db.execute(
        select(Conversation.id).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    if not convo_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")

    base_query = select(Message).where(Message.conversation_id == conversation_id)

    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(
        base_query.order_by(Message.created_at).offset(skip).limit(limit)
    )
    messages = result.scalars().all()

    return MessageListResponse(messages=messages, total=total)

@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    convo = result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(convo)

@router.patch("/conversations/{conversation_id}/archive")
async def toggle_archive(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    convo = result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    convo.is_archived = not convo.is_archived
    return {"archived": convo.is_archived}

@router.post("/conversations/{conversation_id}/search")
async def search_messages(
    conversation_id: uuid.UUID,
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    """Full-text search within a conversation."""
    convo_result = await db.execute(
        select(Conversation.id).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )
    if not convo_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await db.execute(
        select(Message).where(
            Message.conversation_id == conversation_id,
            Message.content.ilike(f"%{q}%"),
        ).order_by(Message.created_at)
    )
    messages = result.scalars().all()

    return {"messages": [MessageResponse.model_validate(m) for m in messages], "total": len(messages)}


@router.get("/suggestions")
async def get_suggestions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    """Return dynamic prompt suggestions based on knowledge graph context and user data."""
    suggestions: list[dict] = []

    # Try knowledge graph first
    try:
        from app.services.knowledge_graph import KnowledgeGraphService
        kg = KnowledgeGraphService()
        user_context = await kg.get_user_context(str(user.id), limit=10)

        # Suggest based on overdue/pending tasks
        tasks = user_context.get("tasks", [])
        overdue = [t for t in tasks if t.get("properties", {}).get("status") == "overdue"]
        if overdue:
            suggestions.append({
                "text": f"Review {len(overdue)} overdue task{'s' if len(overdue) > 1 else ''}",
                "icon": "\u23f0",
                "category": "Tasks",
            })

        # Suggest based on active alerts
        alerts = user_context.get("alerts", [])
        active_alerts = [a for a in alerts if a.get("properties", {}).get("status") != "resolved"]
        if active_alerts:
            suggestions.append({
                "text": f"Check {len(active_alerts)} active compliance alert{'s' if len(active_alerts) > 1 else ''}",
                "icon": "\u26a0\ufe0f",
                "category": "Compliance",
            })

        # Suggest based on client count
        clients = user_context.get("clients", [])
        if clients:
            suggestions.append({
                "text": f"Analyze portfolio performance for your {len(clients)} client{'s' if len(clients) > 1 else ''}",
                "icon": "\ud83d\udcca",
                "category": "Portfolio",
            })
    except Exception:
        pass

    # Fallback: DB-driven suggestions
    if len(suggestions) < 3:
        try:
            from app.models.task import Task
            overdue_result = await db.execute(
                select(func.count()).where(
                    Task.assigned_to == user.id,
                    Task.status == "overdue",
                )
            )
            overdue_count = overdue_result.scalar() or 0
            if overdue_count > 0 and not any(s["category"] == "Tasks" for s in suggestions):
                suggestions.append({
                    "text": f"Review {overdue_count} overdue task{'s' if overdue_count > 1 else ''}",
                    "icon": "\u23f0",
                    "category": "Tasks",
                })
        except Exception:
            pass

    # Always include some generic suggestions
    generic = [
        {"text": "What are the latest market insights?", "icon": "\ud83d\udcc8", "category": "Markets"},
        {"text": "Prepare talking points for client meetings", "icon": "\ud83d\udcc5", "category": "Planning"},
        {"text": "Show me high-priority leads", "icon": "\ud83c\udfaf", "category": "Leads"},
    ]
    for g in generic:
        if len(suggestions) < 6 and not any(s["text"] == g["text"] for s in suggestions):
            suggestions.append(g)

    return {"suggestions": suggestions[:6]}
