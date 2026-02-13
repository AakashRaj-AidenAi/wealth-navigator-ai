"""Order, Payment, and Invoice models for trading and billing operations.

These models handle order management, payment processing, and invoice
generation for client transactions.
"""

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


class Order(BaseMixin, Base):
    """Order model for managing buy, sell, and switch orders.

    Tracks all trading orders with execution details, pricing, and status
    management across different exchanges and segments.
    """

    __tablename__ = "orders"

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

    # Order Details
    symbol: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    security_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    order_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        comment="buy, sell, switch",
    )
    execution_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="market",
        server_default="market",
        comment="market, limit, stop_loss, amo",
    )

    # Quantities and Pricing
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    limit_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Status and Execution
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
        comment="pending, approved, executed, cancelled, rejected, partially_executed",
    )
    exchange: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    segment: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Timestamps
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    executed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Additional Information
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<Order(id={self.id}, symbol={self.symbol}, "
            f"type={self.order_type}, status={self.status})>"
        )


class Payment(BaseMixin, Base):
    """Payment model for tracking client payments and transactions.

    Manages payment processing, status tracking, and reference numbers
    for all payment transactions.
    """

    __tablename__ = "payments"

    # Foreign Keys
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Payment Details
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )
    method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_number: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payment_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:
        return (
            f"<Payment(id={self.id}, amount={self.amount}, "
            f"status={self.status})>"
        )


class Invoice(BaseMixin, Base):
    """Invoice model for billing and invoicing operations.

    Handles invoice generation, tax calculations, line items, and
    payment tracking for client billing.
    """

    __tablename__ = "invoices"

    # Foreign Keys
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Invoice Details
    invoice_number: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        unique=True,
        index=True,
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    tax_amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
        server_default="0",
    )
    total_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Status and Dates
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
        server_default="draft",
        index=True,
    )
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Additional Information
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    line_items: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<Invoice(id={self.id}, invoice_number={self.invoice_number}, "
            f"status={self.status}, total_amount={self.total_amount})>"
        )
