"""Chat system ORM models.

Defines tables for conversations, messages, and conversation summaries
for the AI-powered chat interface with multi-agent support.

Every model inherits from both ``BaseMixin`` (id, created_at, updated_at)
and the declarative ``Base``.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


# ---------------------------------------------------------------------------
# Conversation
# ---------------------------------------------------------------------------


class Conversation(BaseMixin, Base):
    """Conversation thread containing messages between user and AI agents."""

    __tablename__ = "conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    title: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # auto-generated from first message
    agent_type: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # portfolio, cio, advisor, compliance, tax, meeting, growth, funding, or null for auto-routed
    is_archived: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    is_pinned: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    last_message_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    message_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )
    extra_data: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # -- relationships -------------------------------------------------------
    messages: Mapped[List["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )
    summaries: Mapped[List["ConversationSummary"]] = relationship(
        back_populates="conversation"
    )


# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------


class Message(BaseMixin, Base):
    """Individual message within a conversation."""

    __tablename__ = "messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String, nullable=False
    )  # user, assistant, system, tool
    content: Mapped[str] = mapped_column(Text, nullable=False)
    agent_name: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # which agent responded
    extra_data: Mapped[Optional[dict]] = mapped_column(
        "metadata", JSON, nullable=True
    )  # stores: tool_calls, entities extracted, intent, action_cards, table_data, chart_config
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    model_used: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # gpt-4o, gpt-4o-mini
    response_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # -- relationships -------------------------------------------------------
    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


# ---------------------------------------------------------------------------
# ConversationSummary
# ---------------------------------------------------------------------------


class ConversationSummary(BaseMixin, Base):
    """Summary of conversation messages for context efficiency."""

    __tablename__ = "conversation_summaries"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    key_entities: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # extracted client names, tickers, etc. mentioned
    messages_summarized: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # how many messages this summary covers
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # -- relationships -------------------------------------------------------
    conversation: Mapped["Conversation"] = relationship(back_populates="summaries")
