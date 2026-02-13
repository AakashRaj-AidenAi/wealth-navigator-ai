"""Pydantic schemas for funding domain.

Covers CRUD operations for funding requests, cash balances, and payouts.
"""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Funding Request
# ---------------------------------------------------------------------------


class FundingRequestCreate(BaseModel):
    """Schema for creating a new funding request."""

    client_id: uuid.UUID
    amount: float
    funding_type: str
    source_account: Optional[str] = None
    destination_account: Optional[str] = None
    settlement_date: Optional[date] = None
    notes: Optional[str] = None


class FundingRequestResponse(BaseModel):
    """Schema for funding request response data."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    advisor_id: uuid.UUID
    amount: float
    funding_type: str
    workflow_stage: str
    source_account: Optional[str] = None
    destination_account: Optional[str] = None
    settlement_date: Optional[date] = None
    stage_updated_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Cash Balance
# ---------------------------------------------------------------------------


class CashBalanceResponse(BaseModel):
    """Schema for cash balance response data."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    advisor_id: uuid.UUID
    available_cash: float
    pending_cash: float
    currency: str
    last_updated: datetime
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Payout Request
# ---------------------------------------------------------------------------


class PayoutRequestCreate(BaseModel):
    """Schema for creating a new payout request."""

    client_id: uuid.UUID
    amount: float
    payout_type: str
    destination_account: Optional[str] = None
    notes: Optional[str] = None


class PayoutRequestResponse(BaseModel):
    """Schema for payout request response data."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    advisor_id: uuid.UUID
    amount: float
    payout_type: str
    status: str
    destination_account: Optional[str] = None
    requested_date: Optional[date] = None
    estimated_completion: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Paginated response wrappers
# ---------------------------------------------------------------------------


class PaginatedFundingRequestResponse(BaseModel):
    """Paginated list of funding requests."""

    items: list[FundingRequestResponse]
    total: int
    page: int
    limit: int


class PaginatedCashBalanceResponse(BaseModel):
    """Paginated list of cash balances."""

    items: list[CashBalanceResponse]
    total: int
    page: int
    limit: int


class PaginatedPayoutRequestResponse(BaseModel):
    """Paginated list of payout requests."""

    items: list[PayoutRequestResponse]
    total: int
    page: int
    limit: int
