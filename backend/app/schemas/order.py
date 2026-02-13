"""Pydantic schemas for order domain.

Covers CRUD operations for trading orders.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------


class OrderCreate(BaseModel):
    """Schema for creating a new order."""

    client_id: uuid.UUID
    symbol: str
    order_type: str  # buy, sell, switch
    quantity: float
    execution_type: str = "market"  # market, limit, stop_loss, amo
    price: Optional[float] = None
    limit_price: Optional[float] = None
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    """Schema for partially updating an order (status and notes)."""

    status: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    """Schema for order response data."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    advisor_id: uuid.UUID
    symbol: str
    security_name: Optional[str] = None
    order_type: str
    execution_type: str
    quantity: float
    price: Optional[float] = None
    limit_price: Optional[float] = None
    total_amount: Optional[float] = None
    status: str
    exchange: Optional[str] = None
    segment: Optional[str] = None
    expires_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Paginated response wrapper
# ---------------------------------------------------------------------------


class PaginatedOrderResponse(BaseModel):
    """Paginated list of orders."""

    items: list[OrderResponse]
    total: int
    page: int
    limit: int
