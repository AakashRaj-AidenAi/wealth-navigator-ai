"""Portfolio API endpoints.

Provides CRUD operations for portfolios, positions, and transactions.
All endpoints require authentication and scope data by advisor_id.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.dependencies import get_current_active_user, get_db
from app.models.portfolio import (
    PortfolioAdminPortfolio,
    PortfolioAdminPosition,
    PortfolioAdminTransaction,
)
from app.models.user import User
from app.schemas.portfolio import (
    PaginatedPortfolioResponse,
    PaginatedPositionResponse,
    PaginatedTransactionResponse,
    PortfolioCreate,
    PortfolioResponse,
    PortfolioUpdate,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Portfolios
# ---------------------------------------------------------------------------


@router.get("", response_model=PaginatedPortfolioResponse)
async def list_portfolios(
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedPortfolioResponse:
    """List portfolios for the authenticated advisor, optionally filtered by client."""
    base_query = select(PortfolioAdminPortfolio).where(
        PortfolioAdminPortfolio.advisor_id == current_user.id
    )
    if client_id is not None:
        base_query = base_query.where(PortfolioAdminPortfolio.client_id == client_id)

    # Total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Paginated results
    offset = (page - 1) * limit
    items_query = base_query.order_by(PortfolioAdminPortfolio.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(items_query)
    portfolios = result.scalars().all()

    return PaginatedPortfolioResponse(
        items=[PortfolioResponse.model_validate(p) for p in portfolios],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PortfolioResponse:
    """Get a single portfolio by ID with its positions loaded."""
    query = (
        select(PortfolioAdminPortfolio)
        .where(
            PortfolioAdminPortfolio.id == portfolio_id,
            PortfolioAdminPortfolio.advisor_id == current_user.id,
        )
        .options(selectinload(PortfolioAdminPortfolio.positions))
    )
    result = await db.execute(query)
    portfolio = result.scalar_one_or_none()
    if portfolio is None:
        raise NotFoundError(detail=f"Portfolio {portfolio_id} not found")
    return PortfolioResponse.model_validate(portfolio)


@router.post("", response_model=PortfolioResponse, status_code=201)
async def create_portfolio(
    payload: PortfolioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PortfolioResponse:
    """Create a new portfolio for the authenticated advisor."""
    portfolio = PortfolioAdminPortfolio(
        **payload.model_dump(),
        advisor_id=current_user.id,
    )
    db.add(portfolio)
    await db.flush()
    await db.refresh(portfolio)
    return PortfolioResponse.model_validate(portfolio)


@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: uuid.UUID,
    payload: PortfolioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PortfolioResponse:
    """Update an existing portfolio owned by the authenticated advisor."""
    query = select(PortfolioAdminPortfolio).where(
        PortfolioAdminPortfolio.id == portfolio_id,
        PortfolioAdminPortfolio.advisor_id == current_user.id,
    )
    result = await db.execute(query)
    portfolio = result.scalar_one_or_none()
    if portfolio is None:
        raise NotFoundError(detail=f"Portfolio {portfolio_id} not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(portfolio, field, value)

    await db.flush()
    await db.refresh(portfolio)
    return PortfolioResponse.model_validate(portfolio)


# ---------------------------------------------------------------------------
# Positions
# ---------------------------------------------------------------------------


@router.get("/{portfolio_id}/positions", response_model=PaginatedPositionResponse)
async def list_positions(
    portfolio_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedPositionResponse:
    """List positions for a given portfolio owned by the authenticated advisor."""
    # Verify portfolio ownership
    portfolio_check = select(PortfolioAdminPortfolio.id).where(
        PortfolioAdminPortfolio.id == portfolio_id,
        PortfolioAdminPortfolio.advisor_id == current_user.id,
    )
    exists = (await db.execute(portfolio_check)).scalar_one_or_none()
    if exists is None:
        raise NotFoundError(detail=f"Portfolio {portfolio_id} not found")

    base_query = select(PortfolioAdminPosition).where(
        PortfolioAdminPosition.portfolio_id == portfolio_id,
        PortfolioAdminPosition.advisor_id == current_user.id,
    )

    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * limit
    items_query = base_query.order_by(PortfolioAdminPosition.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(items_query)
    positions = result.scalars().all()

    return PaginatedPositionResponse(
        items=[p for p in positions],
        total=total,
        page=page,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------


@router.get("/{portfolio_id}/transactions", response_model=PaginatedTransactionResponse)
async def list_transactions(
    portfolio_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedTransactionResponse:
    """List transactions for a given portfolio owned by the authenticated advisor."""
    # Verify portfolio ownership
    portfolio_check = select(PortfolioAdminPortfolio.id).where(
        PortfolioAdminPortfolio.id == portfolio_id,
        PortfolioAdminPortfolio.advisor_id == current_user.id,
    )
    exists = (await db.execute(portfolio_check)).scalar_one_or_none()
    if exists is None:
        raise NotFoundError(detail=f"Portfolio {portfolio_id} not found")

    base_query = select(PortfolioAdminTransaction).where(
        PortfolioAdminTransaction.portfolio_id == portfolio_id,
        PortfolioAdminTransaction.advisor_id == current_user.id,
    )

    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    offset = (page - 1) * limit
    items_query = base_query.order_by(PortfolioAdminTransaction.trade_date.desc()).offset(offset).limit(limit)
    result = await db.execute(items_query)
    transactions = result.scalars().all()

    return PaginatedTransactionResponse(
        items=[t for t in transactions],
        total=total,
        page=page,
        limit=limit,
    )
