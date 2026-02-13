"""Corporate Action domain ORM models.

Defines all corporate action-related tables: corporate actions, client corporate
actions, and corporate action alerts.

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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


# ---------------------------------------------------------------------------
# Corporate Action
# ---------------------------------------------------------------------------


class CorporateAction(BaseMixin, Base):
    """Corporate action event (dividend, split, bonus, etc.) for a security."""

    __tablename__ = "corporate_actions"

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    action_type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # dividend | bonus | split | rights | buyback | merger | demerger
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ex_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    record_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    payment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    dividend_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ratio: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(
        String, default="announced", server_default="announced"
    )  # announced | upcoming | ex_date_passed | completed | cancelled
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_suggestion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # -- relationships -------------------------------------------------------
    client_corporate_actions: Mapped[List["ClientCorporateAction"]] = relationship(
        back_populates="corporate_action", cascade="all, delete-orphan"
    )
    alerts: Mapped[List["CorporateActionAlert"]] = relationship(
        back_populates="corporate_action", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Client Corporate Action
# ---------------------------------------------------------------------------


class ClientCorporateAction(BaseMixin, Base):
    """Client-specific impact record for a corporate action."""

    __tablename__ = "client_corporate_actions"

    corporate_action_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("corporate_actions.id"), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    holdings_quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estimated_impact: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_personalized_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    is_notified: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    notified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    corporate_action: Mapped["CorporateAction"] = relationship(
        back_populates="client_corporate_actions"
    )
    client: Mapped["Client"] = relationship()


# ---------------------------------------------------------------------------
# Corporate Action Alert
# ---------------------------------------------------------------------------


class CorporateActionAlert(BaseMixin, Base):
    """Alert notification for a corporate action event."""

    __tablename__ = "corporate_action_alerts"

    corporate_action_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("corporate_actions.id"), nullable=True
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(
        String, default="info", server_default="info"
    )  # info | warning | critical
    is_read: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    corporate_action: Mapped[Optional["CorporateAction"]] = relationship(
        back_populates="alerts"
    )
