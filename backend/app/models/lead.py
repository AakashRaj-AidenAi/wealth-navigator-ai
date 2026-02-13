"""Lead management and revenue tracking ORM models.

Defines all lead-related tables: leads, lead activities, stage history,
commission records, and revenue records.

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
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


# ---------------------------------------------------------------------------
# Lead
# ---------------------------------------------------------------------------


class Lead(BaseMixin, Base):
    """Prospect or opportunity being tracked through the sales pipeline."""

    __tablename__ = "leads"

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # referral | website | event | social_media | cold_call | other
    stage: Mapped[str] = mapped_column(
        String, default="new", server_default="new"
    )  # new | contacted | qualified | proposal | negotiation | won | lost
    probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    expected_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    converted_client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    converted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_contacted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    converted_client: Mapped[Optional["Client"]] = relationship(
        foreign_keys=[converted_client_id]
    )
    activities: Mapped[List["LeadActivity"]] = relationship(
        back_populates="lead", cascade="all, delete-orphan"
    )
    stage_history: Mapped[List["LeadStageHistory"]] = relationship(
        back_populates="lead", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Lead Activity
# ---------------------------------------------------------------------------


class LeadActivity(BaseMixin, Base):
    """Activity log for interactions with a lead."""

    __tablename__ = "lead_activities"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    activity_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # call | email | meeting | note | proposal_sent | follow_up
    title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # -- relationships -------------------------------------------------------
    lead: Mapped["Lead"] = relationship(back_populates="activities")


# ---------------------------------------------------------------------------
# Lead Stage History
# ---------------------------------------------------------------------------


class LeadStageHistory(BaseMixin, Base):
    """Audit trail of lead stage transitions."""

    __tablename__ = "lead_stage_history"

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False
    )
    from_stage: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    to_stage: Mapped[str] = mapped_column(String, nullable=False)
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # -- relationships -------------------------------------------------------
    lead: Mapped["Lead"] = relationship(back_populates="stage_history")


# ---------------------------------------------------------------------------
# Commission Record
# ---------------------------------------------------------------------------


class CommissionRecord(BaseMixin, Base):
    """Commission earned by advisors on client transactions."""

    __tablename__ = "commission_records"

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    product_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    upfront_commission: Mapped[float] = mapped_column(
        Float, default=0, server_default="0"
    )
    trail_commission: Mapped[float] = mapped_column(
        Float, default=0, server_default="0"
    )
    total_commission: Mapped[float] = mapped_column(
        Float, default=0, server_default="0"
    )
    commission_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String, default="pending", server_default="pending"
    )  # pending | paid | cancelled

    # -- relationships -------------------------------------------------------
    client: Mapped[Optional["Client"]] = relationship(foreign_keys=[client_id])


# ---------------------------------------------------------------------------
# Revenue Record
# ---------------------------------------------------------------------------


class RevenueRecord(BaseMixin, Base):
    """Revenue tracking for advisors and clients."""

    __tablename__ = "revenue_records"

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    revenue_type: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # advisory_fee | management_fee | performance_fee | commission | other
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    revenue_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    period_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    period_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # -- relationships -------------------------------------------------------
    client: Mapped[Optional["Client"]] = relationship(foreign_keys=[client_id])
