"""Chat REST API endpoints for conversation management."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.models.chat import Conversation, Message
from app.schemas.chat import (
    ConversationCreate, ConversationResponse, ConversationListResponse,
    MessageResponse, MessageListResponse,
)

router = APIRouter()

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
        base_query.order_by(desc(Conversation.last_message_at.nulls_last()), desc(Conversation.created_at))
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
