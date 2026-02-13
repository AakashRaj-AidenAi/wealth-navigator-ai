"""Funding, Payout, and Cash Balance models for fund management operations.

These models handle funding requests, payout processing, account management,
compliance tracking, and audit logging for all funding-related operations.
"""

import uuid
from datetime import date, datetime
from typing import Optional, List

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


class FundingRequest(BaseMixin, Base):
    """Funding request model for managing fund inflow operations.

    Tracks funding requests through workflow stages with settlement
    details and history tracking.
    """

    __tablename__ = "funding_requests"

    # Foreign Keys
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Funding Details
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    funding_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    workflow_stage: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="initiated",
        server_default="initiated",
        index=True,
    )

    # Account Information
    source_account: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    destination_account: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Settlement and Tracking
    settlement_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    stage_updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    status_history: Mapped[List["FundingStatusHistory"]] = relationship(
        "FundingStatusHistory",
        back_populates="funding_request",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<FundingRequest(id={self.id}, amount={self.amount}, "
            f"stage={self.workflow_stage})>"
        )


class FundingAccount(BaseMixin, Base):
    """Funding account model for managing client bank accounts.

    Stores bank account information for funding and payout operations
    with verification status tracking.
    """

    __tablename__ = "funding_accounts"

    # Foreign Keys
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Account Details
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ifsc_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    account_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Status Flags
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    def __repr__(self) -> str:
        return (
            f"<FundingAccount(id={self.id}, account_name={self.account_name}, "
            f"is_primary={self.is_primary})>"
        )


class FundingStatusHistory(BaseMixin, Base):
    """Funding status history model for tracking workflow stage changes.

    Maintains an audit trail of all status transitions for funding requests.
    """

    __tablename__ = "funding_status_history"

    # Foreign Keys
    funding_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("funding_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Status Change Details
    from_stage: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_stage: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    funding_request: Mapped["FundingRequest"] = relationship(
        "FundingRequest",
        back_populates="status_history",
    )

    def __repr__(self) -> str:
        return (
            f"<FundingStatusHistory(id={self.id}, "
            f"from={self.from_stage} -> to={self.to_stage})>"
        )


class FundingTransaction(BaseMixin, Base):
    """Funding transaction model for individual transaction records.

    Tracks individual transactions with references to funding requests,
    statuses, and bank references.
    """

    __tablename__ = "funding_transactions"

    # Foreign Keys
    funding_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("funding_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Transaction Details
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    transaction_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )
    reference_number: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
        index=True,
    )
    bank_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    def __repr__(self) -> str:
        return (
            f"<FundingTransaction(id={self.id}, amount={self.amount}, "
            f"type={self.transaction_type}, status={self.status})>"
        )


class FundingAlert(BaseMixin, Base):
    """Funding alert model for tracking issues and notifications.

    Manages alerts related to funding operations with severity levels
    and resolution tracking.
    """

    __tablename__ = "funding_alerts"

    # Foreign Keys
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    funding_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("funding_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Alert Details
    alert_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="medium",
        server_default="medium",
        index=True,
    )

    # Resolution Tracking
    is_resolved: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        index=True,
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:
        return (
            f"<FundingAlert(id={self.id}, type={self.alert_type}, "
            f"severity={self.severity}, resolved={self.is_resolved})>"
        )


class FundingAuditLog(BaseMixin, Base):
    """Funding audit log model for compliance and security tracking.

    Maintains detailed audit trail of all actions performed on funding
    requests with user and IP tracking.
    """

    __tablename__ = "funding_audit_log"

    # Foreign Keys
    funding_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("funding_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Audit Details
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    def __repr__(self) -> str:
        return f"<FundingAuditLog(id={self.id}, action={self.action})>"


class CashBalance(BaseMixin, Base):
    """Cash balance model for tracking client cash positions.

    Maintains current and pending cash balances for clients with
    currency support and timestamp tracking.
    """

    __tablename__ = "cash_balances"

    # Foreign Keys
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Balance Details
    available_cash: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
        server_default="0",
    )
    pending_cash: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
        server_default="0",
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="INR",
        server_default="INR",
    )
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<CashBalance(id={self.id}, available={self.available_cash}, "
            f"pending={self.pending_cash}, currency={self.currency})>"
        )


class PayoutRequest(BaseMixin, Base):
    """Payout request model for managing fund withdrawal operations.

    Tracks payout requests through status stages with destination
    account and timeline management.
    """

    __tablename__ = "payout_requests"

    # Foreign Keys
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Payout Details
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payout_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )
    destination_account: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Timeline
    requested_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    estimated_completion: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    status_history: Mapped[List["PayoutStatusHistory"]] = relationship(
        "PayoutStatusHistory",
        back_populates="payout_request",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<PayoutRequest(id={self.id}, amount={self.amount}, "
            f"status={self.status})>"
        )


class PayoutStatusHistory(BaseMixin, Base):
    """Payout status history model for tracking status changes.

    Maintains an audit trail of all status transitions for payout requests.
    """

    __tablename__ = "payout_status_history"

    # Foreign Keys
    payout_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payout_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Status Change Details
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    payout_request: Mapped["PayoutRequest"] = relationship(
        "PayoutRequest",
        back_populates="status_history",
    )

    def __repr__(self) -> str:
        return (
            f"<PayoutStatusHistory(id={self.id}, "
            f"from={self.from_status} -> to={self.to_status})>"
        )


class PayoutTransaction(BaseMixin, Base):
    """Payout transaction model for individual payout records.

    Tracks individual payout transactions with references and status.
    """

    __tablename__ = "payout_transactions"

    # Foreign Keys
    payout_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payout_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Transaction Details
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    transaction_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )
    reference_number: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<PayoutTransaction(id={self.id}, amount={self.amount}, "
            f"type={self.transaction_type}, status={self.status})>"
        )


class PayoutComplianceAlert(BaseMixin, Base):
    """Payout compliance alert model for regulatory tracking.

    Manages compliance alerts related to payout operations with
    severity levels and resolution tracking.
    """

    __tablename__ = "payout_compliance_alerts"

    # Foreign Keys
    payout_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payout_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Alert Details
    alert_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="medium",
        server_default="medium",
        index=True,
    )

    # Resolution Tracking
    is_resolved: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<PayoutComplianceAlert(id={self.id}, type={self.alert_type}, "
            f"severity={self.severity}, resolved={self.is_resolved})>"
        )
