"""Compliance, analytics, and risk management ORM models.

Defines all compliance-related tables: churn predictions, engagement scores,
compliance alerts, risk profiles, audit logs, advice records, and withdrawal limits.

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
    func,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


# ---------------------------------------------------------------------------
# Churn Prediction
# ---------------------------------------------------------------------------


class ChurnPrediction(BaseMixin, Base):
    """ML-powered prediction of client churn risk."""

    __tablename__ = "churn_predictions"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    churn_risk_percentage: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    risk_factors: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    risk_level: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # low | medium | high | critical
    predicted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(foreign_keys=[client_id])


# ---------------------------------------------------------------------------
# Client Engagement Score
# ---------------------------------------------------------------------------


class ClientEngagementScore(BaseMixin, Base):
    """Tracks client engagement metrics and scoring."""

    __tablename__ = "client_engagement_scores"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    engagement_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    engagement_level: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # hot | warm | cold
    login_frequency: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )
    campaign_response_rate: Mapped[float] = mapped_column(
        Float, default=0, server_default="0"
    )
    days_since_last_interaction: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    last_calculated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(foreign_keys=[client_id])


# ---------------------------------------------------------------------------
# Compliance Alert
# ---------------------------------------------------------------------------


class ComplianceAlert(BaseMixin, Base):
    """System-generated compliance alerts and warnings."""

    __tablename__ = "compliance_alerts"

    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    alert_type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(
        String, default="medium", server_default="medium"
    )  # low | medium | high | critical
    is_resolved: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    client: Mapped[Optional["Client"]] = relationship(foreign_keys=[client_id])


# ---------------------------------------------------------------------------
# Risk Profile
# ---------------------------------------------------------------------------


class RiskProfile(BaseMixin, Base):
    """Client risk assessment profile based on questionnaire."""

    __tablename__ = "risk_profiles"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    risk_category: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # conservative | moderate | aggressive
    assessment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    questionnaire_version: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(foreign_keys=[client_id])
    answers: Mapped[List["RiskAnswer"]] = relationship(
        back_populates="risk_profile", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Risk Answer
# ---------------------------------------------------------------------------


class RiskAnswer(BaseMixin, Base):
    """Individual answer to a risk assessment question."""

    __tablename__ = "risk_answers"

    risk_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("risk_profiles.id"), nullable=False
    )
    question_id: Mapped[str] = mapped_column(String, nullable=False)
    question_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    answer: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    score: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # -- relationships -------------------------------------------------------
    risk_profile: Mapped["RiskProfile"] = relationship(back_populates="answers")


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------


class AuditLog(BaseMixin, Base):
    """System-wide audit trail for all data changes."""

    __tablename__ = "audit_logs"

    table_name: Mapped[str] = mapped_column(String, nullable=False)
    record_id: Mapped[str] = mapped_column(String, nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)  # insert | update | delete
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    old_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ---------------------------------------------------------------------------
# Advice Record
# ---------------------------------------------------------------------------


class AdviceRecord(BaseMixin, Base):
    """Formal advice and recommendations provided to clients."""

    __tablename__ = "advice_records"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    advice_type: Mapped[str] = mapped_column(String, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    risk_considerations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    client_acknowledged: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(foreign_keys=[client_id])


# ---------------------------------------------------------------------------
# Withdrawal Limit
# ---------------------------------------------------------------------------


class WithdrawalLimit(BaseMixin, Base):
    """Configurable withdrawal limits for client accounts."""

    __tablename__ = "withdrawal_limits"

    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    daily_limit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    monthly_limit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    annual_limit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    requires_approval_above: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )

    # -- relationships -------------------------------------------------------
    client: Mapped[Optional["Client"]] = relationship(foreign_keys=[client_id])
