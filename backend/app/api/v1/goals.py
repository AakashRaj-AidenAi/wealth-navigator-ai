"""Goal API endpoints.

Provides CRUD operations for client life goals.
All endpoints require authentication and scope data by advisor_id.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.dependencies import get_current_active_user, get_db
from app.models.client import ClientLifeGoal
from app.models.user import User
from app.schemas.goal import (
    GoalCreate,
    GoalResponse,
    GoalUpdate,
    PaginatedGoalResponse,
)

router = APIRouter()


@router.get("", response_model=PaginatedGoalResponse)
async def list_goals(
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedGoalResponse:
    """List goals for the authenticated advisor, optionally filtered by client."""
    base_query = select(ClientLifeGoal).where(
        ClientLifeGoal.advisor_id == current_user.id
    )
    if client_id is not None:
        base_query = base_query.where(ClientLifeGoal.client_id == client_id)

    # Total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Paginated results
    offset = (page - 1) * limit
    items_query = base_query.order_by(ClientLifeGoal.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(items_query)
    goals = result.scalars().all()

    return PaginatedGoalResponse(
        items=[GoalResponse.model_validate(g) for g in goals],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("", response_model=GoalResponse, status_code=201)
async def create_goal(
    payload: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> GoalResponse:
    """Create a new goal for the authenticated advisor."""
    goal = ClientLifeGoal(
        **payload.model_dump(),
        advisor_id=current_user.id,
    )
    db.add(goal)
    await db.flush()
    await db.refresh(goal)
    return GoalResponse.model_validate(goal)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: uuid.UUID,
    payload: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> GoalResponse:
    """Update an existing goal owned by the authenticated advisor."""
    query = select(ClientLifeGoal).where(
        ClientLifeGoal.id == goal_id,
        ClientLifeGoal.advisor_id == current_user.id,
    )
    result = await db.execute(query)
    goal = result.scalar_one_or_none()
    if goal is None:
        raise NotFoundError(detail=f"Goal {goal_id} not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)

    await db.flush()
    await db.refresh(goal)
    return GoalResponse.model_validate(goal)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a goal owned by the authenticated advisor."""
    query = select(ClientLifeGoal).where(
        ClientLifeGoal.id == goal_id,
        ClientLifeGoal.advisor_id == current_user.id,
    )
    result = await db.execute(query)
    goal = result.scalar_one_or_none()
    if goal is None:
        raise NotFoundError(detail=f"Goal {goal_id} not found")

    await db.delete(goal)
    await db.flush()
