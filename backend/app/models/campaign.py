"""Campaign and segment ORM models.

Defines tables for communication campaigns, segments, message logs, and recipients.
Supports multi-channel campaign management with tracking and analytics.

Every model inherits from both ``BaseMixin`` (id, created_at, updated_at)
and the declarative ``Base``.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


# ---------------------------------------------------------------------------
# CommunicationCampaign
# ---------------------------------------------------------------------------


class CommunicationCampaign(BaseMixin, Base):
    """Multi-channel communication campaigns for client engagement."""

    __tablename__ = "communication_campaigns"

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    campaign_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    channel: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # email, sms, whatsapp
    status: Mapped[str] = mapped_column(
        String, default="draft", server_default="draft"
    )  # draft, scheduled, active, paused, completed, cancelled
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sent_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    delivered_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )
    opened_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    failed_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # -- relationships -------------------------------------------------------
    segments: Mapped[List["CampaignSegment"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    message_logs: Mapped[List["CampaignMessageLog"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    recipients: Mapped[List["CampaignRecipient"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# CampaignSegment
# ---------------------------------------------------------------------------


class CampaignSegment(BaseMixin, Base):
    """Client segments for targeted campaigns."""

    __tablename__ = "campaign_segments"

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communication_campaigns.id"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    filter_criteria: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    client_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_auto_updating: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    # -- relationships -------------------------------------------------------
    campaign: Mapped[Optional["CommunicationCampaign"]] = relationship(
        back_populates="segments"
    )


# ---------------------------------------------------------------------------
# CampaignMessageLog
# ---------------------------------------------------------------------------


class CampaignMessageLog(BaseMixin, Base):
    """Individual message delivery logs for campaigns."""

    __tablename__ = "campaign_message_logs"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communication_campaigns.id"),
        nullable=False,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    channel: Mapped[str] = mapped_column(String, nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String, default="pending", server_default="pending"
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # -- relationships -------------------------------------------------------
    campaign: Mapped["CommunicationCampaign"] = relationship(
        back_populates="message_logs"
    )
    client: Mapped["Client"] = relationship(back_populates="campaign_message_logs")


# ---------------------------------------------------------------------------
# CampaignRecipient
# ---------------------------------------------------------------------------


class CampaignRecipient(BaseMixin, Base):
    """Campaign recipients with delivery tracking."""

    __tablename__ = "campaign_recipients"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communication_campaigns.id"),
        nullable=False,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String, default="pending", server_default="pending"
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    opened_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    campaign: Mapped["CommunicationCampaign"] = relationship(
        back_populates="recipients"
    )
    client: Mapped["Client"] = relationship(back_populates="campaign_recipients")
