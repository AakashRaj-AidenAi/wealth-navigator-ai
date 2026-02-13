"""Corporate Action API endpoints.

Provides endpoints for listing corporate actions, viewing details
with client impacts, and filtering by client, scoped by the
authenticated advisor.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db
from app.models.corporate_action import (
    ClientCorporateAction,
    CorporateAction,
)
from app.schemas.corporate_action import (
    ClientCorporateActionResponse,
    CorporateActionDetailResponse,
    CorporateActionResponse,
)

router = APIRouter()


@router.get("", response_model=list[CorporateActionResponse])
async def list_corporate_actions(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[CorporateActionResponse]:
    """List corporate actions for the current advisor."""
    query = (
        select(CorporateAction)
        .where(CorporateAction.advisor_id == current_user["id"])
        .order_by(CorporateAction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    actions = result.scalars().all()
    return [CorporateActionResponse.model_validate(a) for a in actions]


@router.get("/{action_id}", response_model=CorporateActionDetailResponse)
async def get_corporate_action(
    action_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> CorporateActionDetailResponse:
    """Get a corporate action with its client impacts."""
    query = (
        select(CorporateAction)
        .where(
            CorporateAction.id == action_id,
            CorporateAction.advisor_id == current_user["id"],
        )
        .options(selectinload(CorporateAction.client_corporate_actions))
    )
    result = await db.execute(query)
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(
            status_code=404, detail="Corporate action not found"
        )
    return CorporateActionDetailResponse.model_validate(action)


@router.get(
    "/client/{client_id}",
    response_model=list[ClientCorporateActionResponse],
)
async def get_client_corporate_actions(
    client_id: uuid.UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[ClientCorporateActionResponse]:
    """Get corporate actions impacting a specific client."""
    query = (
        select(ClientCorporateAction)
        .where(
            ClientCorporateAction.client_id == client_id,
            ClientCorporateAction.advisor_id == current_user["id"],
        )
        .order_by(ClientCorporateAction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    impacts = result.scalars().all()
    return [ClientCorporateActionResponse.model_validate(i) for i in impacts]
