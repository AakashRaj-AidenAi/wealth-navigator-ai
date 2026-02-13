"""Communication and engagement ORM models.

Defines tables for communication logs, AI meeting summaries, sentiment analysis,
message templates, and voice note transcriptions.

Every model inherits from both ``BaseMixin`` (id, created_at, updated_at)
and the declarative ``Base``.
"""

import uuid
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


# ---------------------------------------------------------------------------
# CommunicationLog
# ---------------------------------------------------------------------------


class CommunicationLog(BaseMixin, Base):
    """Log of all communications with clients across channels."""

    __tablename__ = "communication_logs"

    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    communication_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # email, sms, whatsapp, call, meeting
    direction: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # inbound, outbound
    subject: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="sent", server_default="sent")
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    opened_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # -- relationships -------------------------------------------------------
    client: Mapped[Optional["Client"]] = relationship(
        back_populates="communication_logs"
    )


# ---------------------------------------------------------------------------
# AiMeetingSummary
# ---------------------------------------------------------------------------


class AiMeetingSummary(BaseMixin, Base):
    """AI-generated summaries of advisor-client meetings."""

    __tablename__ = "ai_meeting_summaries"

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    raw_notes: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    key_discussion_points: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), nullable=True
    )
    action_items: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), nullable=True
    )
    decisions_made: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), nullable=True
    )
    next_steps: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), nullable=True
    )
    risks_discussed: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), nullable=True
    )
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    tasks_created: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    # -- relationships -------------------------------------------------------
    client: Mapped[Optional["Client"]] = relationship(
        back_populates="ai_meeting_summaries"
    )


# ---------------------------------------------------------------------------
# SentimentLog
# ---------------------------------------------------------------------------


class SentimentLog(BaseMixin, Base):
    """Sentiment analysis logs for client communications."""

    __tablename__ = "sentiment_logs"

    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment_label: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # positive, neutral, negative
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # -- relationships -------------------------------------------------------
    client: Mapped[Optional["Client"]] = relationship(back_populates="sentiment_logs")


# ---------------------------------------------------------------------------
# MessageTemplate
# ---------------------------------------------------------------------------


class MessageTemplate(BaseMixin, Base):
    """Reusable message templates for communications."""

    __tablename__ = "message_templates"

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    template_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )


# ---------------------------------------------------------------------------
# VoiceNoteTranscription
# ---------------------------------------------------------------------------


class VoiceNoteTranscription(BaseMixin, Base):
    """Transcriptions of voice notes recorded by advisors."""

    __tablename__ = "voice_note_transcriptions"

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    audio_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    transcription_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # -- relationships -------------------------------------------------------
    client: Mapped[Optional["Client"]] = relationship(
        back_populates="voice_note_transcriptions"
    )
