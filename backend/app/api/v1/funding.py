"""Funding API endpoints.

Provides CRUD operations for funding requests, cash balances, and payouts.
All endpoints require authentication and scope data by advisor_id.
"""

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_active_user, get_db
from app.models.funding import CashBalance, FundingRequest, PayoutRequest
from app.models.user import User
from app.schemas.funding import (
    CashBalanceResponse,
    FundingRequestCreate,
    FundingRequestResponse,
    PaginatedCashBalanceResponse,
    PaginatedFundingRequestResponse,
    PaginatedPayoutRequestResponse,
    PayoutRequestCreate,
    PayoutRequestResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Funding Requests
# ---------------------------------------------------------------------------


@router.get("/requests", response_model=PaginatedFundingRequestResponse)
async def list_funding_requests(
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedFundingRequestResponse:
    """List funding requests for the authenticated advisor."""
    base_query = select(FundingRequest).where(
        FundingRequest.advisor_id == current_user.id
    )
    if client_id is not None:
        base_query = base_query.where(FundingRequest.client_id == client_id)

    # Total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Paginated results
    offset = (page - 1) * limit
    items_query = base_query.order_by(FundingRequest.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(items_query)
    requests = result.scalars().all()

    return PaginatedFundingRequestResponse(
        items=[FundingRequestResponse.model_validate(r) for r in requests],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("/requests", response_model=FundingRequestResponse, status_code=201)
async def create_funding_request(
    payload: FundingRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> FundingRequestResponse:
    """Create a new funding request for the authenticated advisor."""
    funding_request = FundingRequest(
        **payload.model_dump(),
        advisor_id=current_user.id,
    )
    db.add(funding_request)
    await db.flush()
    await db.refresh(funding_request)
    return FundingRequestResponse.model_validate(funding_request)


# ---------------------------------------------------------------------------
# Cash Balances
# ---------------------------------------------------------------------------


@router.get("/cash-balances", response_model=PaginatedCashBalanceResponse)
async def list_cash_balances(
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedCashBalanceResponse:
    """List cash balances for the authenticated advisor, optionally filtered by client."""
    base_query = select(CashBalance).where(
        CashBalance.advisor_id == current_user.id
    )
    if client_id is not None:
        base_query = base_query.where(CashBalance.client_id == client_id)

    # Total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Paginated results
    offset = (page - 1) * limit
    items_query = base_query.order_by(CashBalance.last_updated.desc()).offset(offset).limit(limit)
    result = await db.execute(items_query)
    balances = result.scalars().all()

    return PaginatedCashBalanceResponse(
        items=[CashBalanceResponse.model_validate(b) for b in balances],
        total=total,
        page=page,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# Payout Requests
# ---------------------------------------------------------------------------


@router.get("/payouts", response_model=PaginatedPayoutRequestResponse)
async def list_payout_requests(
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedPayoutRequestResponse:
    """List payout requests for the authenticated advisor."""
    base_query = select(PayoutRequest).where(
        PayoutRequest.advisor_id == current_user.id
    )
    if client_id is not None:
        base_query = base_query.where(PayoutRequest.client_id == client_id)

    # Total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Paginated results
    offset = (page - 1) * limit
    items_query = base_query.order_by(PayoutRequest.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(items_query)
    payouts = result.scalars().all()

    return PaginatedPayoutRequestResponse(
        items=[PayoutRequestResponse.model_validate(p) for p in payouts],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("/payouts", response_model=PayoutRequestResponse, status_code=201)
async def create_payout_request(
    payload: PayoutRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PayoutRequestResponse:
    """Create a new payout request for the authenticated advisor."""
    payout = PayoutRequest(
        **payload.model_dump(),
        advisor_id=current_user.id,
        requested_date=date.today(),
    )
    db.add(payout)
    await db.flush()
    await db.refresh(payout)
    return PayoutRequestResponse.model_validate(payout)
