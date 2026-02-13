"""Pydantic schemas for portfolio domain.

Covers CRUD operations for portfolios, positions, and transactions.
"""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Portfolio
# ---------------------------------------------------------------------------


class PortfolioCreate(BaseModel):
    """Schema for creating a new portfolio."""

    portfolio_name: str
    client_id: Optional[uuid.UUID] = None
    portfolio_type: Optional[str] = None
    base_currency: str = "INR"
    benchmark: Optional[str] = None
    inception_date: Optional[date] = None
    status: str = "active"
    target_equity: Optional[float] = None
    target_debt: Optional[float] = None
    target_other: Optional[float] = None
    notes: Optional[str] = None


class PortfolioUpdate(BaseModel):
    """Schema for updating an existing portfolio (all fields optional)."""

    portfolio_name: Optional[str] = None
    client_id: Optional[uuid.UUID] = None
    portfolio_type: Optional[str] = None
    base_currency: Optional[str] = None
    benchmark: Optional[str] = None
    inception_date: Optional[date] = None
    status: Optional[str] = None
    target_equity: Optional[float] = None
    target_debt: Optional[float] = None
    target_other: Optional[float] = None
    notes: Optional[str] = None


class PortfolioResponse(BaseModel):
    """Schema for portfolio response data."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    advisor_id: uuid.UUID
    client_id: Optional[uuid.UUID] = None
    portfolio_name: str
    portfolio_type: Optional[str] = None
    base_currency: str
    benchmark: Optional[str] = None
    inception_date: Optional[date] = None
    status: str
    target_equity: Optional[float] = None
    target_debt: Optional[float] = None
    target_other: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Position
# ---------------------------------------------------------------------------


class PositionResponse(BaseModel):
    """Schema for position response data."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    portfolio_id: uuid.UUID
    advisor_id: uuid.UUID
    security_name: str
    security_id: Optional[str] = None
    security_type: Optional[str] = None
    exchange: Optional[str] = None
    quantity: float
    average_cost: float
    current_price: float
    market_value: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    weight: Optional[float] = None
    sector: Optional[str] = None
    last_price_update: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Transaction
# ---------------------------------------------------------------------------


class TransactionResponse(BaseModel):
    """Schema for transaction response data."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    portfolio_id: uuid.UUID
    position_id: Optional[uuid.UUID] = None
    advisor_id: uuid.UUID
    transaction_type: str
    security_name: str
    quantity: float
    price: float
    total_amount: Optional[float] = None
    fees: float
    trade_date: date
    settlement_date: Optional[date] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Paginated response wrapper
# ---------------------------------------------------------------------------


class PaginatedPortfolioResponse(BaseModel):
    """Paginated list of portfolios."""

    items: list[PortfolioResponse]
    total: int
    page: int
    limit: int


class PaginatedPositionResponse(BaseModel):
    """Paginated list of positions."""

    items: list[PositionResponse]
    total: int
    page: int
    limit: int


class PaginatedTransactionResponse(BaseModel):
    """Paginated list of transactions."""

    items: list[TransactionResponse]
    total: int
    page: int
    limit: int
