"""Portfolio ORM models for portfolio management.

This module defines the core portfolio entities:
- PortfolioAdminPortfolio: Main portfolio entity
- PortfolioAdminPosition: Securities positions within portfolios
- PortfolioAdminAccount: Account information linked to portfolios
- PortfolioAdminTransaction: Transaction history for portfolios
"""

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


class PortfolioAdminPortfolio(BaseMixin, Base):
    """Portfolio entity representing a client's investment portfolio.

    Attributes:
        id: Unique identifier (UUID primary key)
        advisor_id: ID of the advisor managing this portfolio
        client_id: Foreign key to clients table (nullable)
        portfolio_name: Name of the portfolio
        portfolio_type: Type classification (e.g., growth, income, balanced)
        base_currency: Base currency for portfolio valuation (default: INR)
        benchmark: Benchmark index for comparison
        inception_date: Date when portfolio was created
        status: Current status (default: active)
        target_equity: Target equity allocation percentage
        target_debt: Target debt allocation percentage
        target_other: Target other assets allocation percentage
        notes: Additional notes about the portfolio
        positions: Related positions in this portfolio
        accounts: Related accounts for this portfolio
        transactions: Related transactions for this portfolio
    """

    __tablename__ = "portfolio_admin_portfolios"

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

    portfolio_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    portfolio_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    base_currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    benchmark: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    inception_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",
        server_default="active",
    )

    target_equity: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    target_debt: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    target_other: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    positions: Mapped[list["PortfolioAdminPosition"]] = relationship(
        "PortfolioAdminPosition",
        back_populates="portfolio",
        cascade="all, delete-orphan",
    )

    accounts: Mapped[list["PortfolioAdminAccount"]] = relationship(
        "PortfolioAdminAccount",
        back_populates="portfolio",
        cascade="all, delete-orphan",
    )

    transactions: Mapped[list["PortfolioAdminTransaction"]] = relationship(
        "PortfolioAdminTransaction",
        back_populates="portfolio",
        cascade="all, delete-orphan",
    )


class PortfolioAdminPosition(BaseMixin, Base):
    """Position entity representing a security holding in a portfolio.

    Attributes:
        id: Unique identifier (UUID primary key)
        portfolio_id: Foreign key to portfolio_admin_portfolios
        advisor_id: ID of the advisor managing this position
        security_name: Name of the security
        security_id: Unique identifier for the security (e.g., ISIN, ticker)
        security_type: Type of security (equity, debt, mutual_fund, etf, etc.)
        exchange: Exchange where security is traded
        quantity: Number of units held
        average_cost: Average cost per unit
        current_price: Current market price per unit
        market_value: Total market value (quantity * current_price)
        unrealized_pnl: Unrealized profit/loss
        weight: Portfolio weight percentage
        sector: Sector classification
        last_price_update: Timestamp of last price update
        portfolio: Related portfolio entity
        transactions: Related transactions for this position
    """

    __tablename__ = "portfolio_admin_positions"

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portfolio_admin_portfolios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    security_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    security_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    security_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    exchange: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0.0",
    )

    average_cost: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0.0",
    )

    current_price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0.0",
    )

    market_value: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    unrealized_pnl: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    weight: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    sector: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    last_price_update: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    portfolio: Mapped["PortfolioAdminPortfolio"] = relationship(
        "PortfolioAdminPortfolio",
        back_populates="positions",
    )

    transactions: Mapped[list["PortfolioAdminTransaction"]] = relationship(
        "PortfolioAdminTransaction",
        back_populates="position",
        cascade="all, delete-orphan",
    )


class PortfolioAdminAccount(BaseMixin, Base):
    """Account entity representing trading/demat accounts linked to a portfolio.

    Attributes:
        id: Unique identifier (UUID primary key)
        portfolio_id: Foreign key to portfolio_admin_portfolios
        advisor_id: ID of the advisor managing this account
        account_name: Name of the account
        account_number: Account number with custodian
        account_type: Type of account (demat, trading, mutual_fund, pms)
        custodian_name: Name of the custodian/broker
        status: Current status (default: active)
        portfolio: Related portfolio entity
    """

    __tablename__ = "portfolio_admin_accounts"

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portfolio_admin_portfolios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    account_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    account_number: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    account_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    custodian_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",
        server_default="active",
    )

    # Relationships
    portfolio: Mapped["PortfolioAdminPortfolio"] = relationship(
        "PortfolioAdminPortfolio",
        back_populates="accounts",
    )


class PortfolioAdminTransaction(BaseMixin, Base):
    """Transaction entity representing a trade or corporate action in a portfolio.

    Attributes:
        id: Unique identifier (UUID primary key)
        portfolio_id: Foreign key to portfolio_admin_portfolios
        position_id: Foreign key to portfolio_admin_positions (nullable)
        advisor_id: ID of the advisor managing this transaction
        transaction_type: Type of transaction (buy, sell, dividend, bonus, split, transfer)
        security_name: Name of the security
        quantity: Number of units in the transaction
        price: Price per unit
        total_amount: Total transaction amount
        fees: Transaction fees/charges
        trade_date: Date when trade was executed
        settlement_date: Date when trade was settled
        notes: Additional notes about the transaction
        status: Current status (default: executed)
        portfolio: Related portfolio entity
        position: Related position entity
    """

    __tablename__ = "portfolio_admin_transactions"

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portfolio_admin_portfolios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    position_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portfolio_admin_positions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    transaction_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    security_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    total_amount: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    fees: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0.0",
    )

    trade_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    settlement_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="executed",
        server_default="executed",
    )

    # Relationships
    portfolio: Mapped["PortfolioAdminPortfolio"] = relationship(
        "PortfolioAdminPortfolio",
        back_populates="transactions",
    )

    position: Mapped[Optional["PortfolioAdminPosition"]] = relationship(
        "PortfolioAdminPosition",
        back_populates="transactions",
    )
