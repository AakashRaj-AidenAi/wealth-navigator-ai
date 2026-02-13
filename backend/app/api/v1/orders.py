"""Order API endpoints.

Provides CRUD operations for trading orders.
All endpoints require authentication and scope data by advisor_id.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.dependencies import get_current_active_user, get_db
from app.models.order import Order
from app.models.user import User
from app.schemas.order import (
    OrderCreate,
    OrderResponse,
    OrderUpdate,
    PaginatedOrderResponse,
)

router = APIRouter()


@router.get("", response_model=PaginatedOrderResponse)
async def list_orders(
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client ID"),
    status: Optional[str] = Query(None, description="Filter by order status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedOrderResponse:
    """List orders for the authenticated advisor with optional filters."""
    base_query = select(Order).where(Order.advisor_id == current_user.id)

    if client_id is not None:
        base_query = base_query.where(Order.client_id == client_id)
    if status is not None:
        base_query = base_query.where(Order.status == status)

    # Total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Paginated results
    offset = (page - 1) * limit
    items_query = base_query.order_by(Order.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(items_query)
    orders = result.scalars().all()

    return PaginatedOrderResponse(
        items=[OrderResponse.model_validate(o) for o in orders],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> OrderResponse:
    """Get a single order by ID."""
    query = select(Order).where(
        Order.id == order_id,
        Order.advisor_id == current_user.id,
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError(detail=f"Order {order_id} not found")
    return OrderResponse.model_validate(order)


@router.post("", response_model=OrderResponse, status_code=201)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> OrderResponse:
    """Create a new order for the authenticated advisor."""
    order = Order(
        **payload.model_dump(),
        advisor_id=current_user.id,
    )
    db.add(order)
    await db.flush()
    await db.refresh(order)
    return OrderResponse.model_validate(order)


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: uuid.UUID,
    payload: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> OrderResponse:
    """Update an existing order (status and notes) owned by the authenticated advisor."""
    query = select(Order).where(
        Order.id == order_id,
        Order.advisor_id == current_user.id,
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError(detail=f"Order {order_id} not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    await db.flush()
    await db.refresh(order)
    return OrderResponse.model_validate(order)
