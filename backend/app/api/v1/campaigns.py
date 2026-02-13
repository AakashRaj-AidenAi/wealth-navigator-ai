"""Campaign management API endpoints.

Provides CRUD operations for communication campaigns
and message log retrieval, scoped by the authenticated advisor.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_active_user, get_db
from app.models.campaign import CampaignMessageLog, CommunicationCampaign
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreate,
    CampaignMessageLogResponse,
    CampaignResponse,
    CampaignUpdate,
)

router = APIRouter()


@router.get("", response_model=list[CampaignResponse])
async def list_campaigns(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[CampaignResponse]:
    """List campaigns for the current advisor."""
    query = (
        select(CommunicationCampaign)
        .where(CommunicationCampaign.advisor_id == current_user.id)
        .order_by(CommunicationCampaign.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    campaigns = result.scalars().all()
    return [CampaignResponse.model_validate(c) for c in campaigns]


@router.post("", response_model=CampaignResponse, status_code=201)
async def create_campaign(
    payload: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CampaignResponse:
    """Create a new campaign for the current advisor."""
    campaign = CommunicationCampaign(
        advisor_id=current_user.id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: uuid.UUID,
    payload: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CampaignResponse:
    """Update an existing campaign."""
    query = select(CommunicationCampaign).where(
        CommunicationCampaign.id == campaign_id,
        CommunicationCampaign.advisor_id == current_user.id,
    )
    result = await db.execute(query)
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(campaign, field, value)

    await db.flush()
    await db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


@router.get(
    "/{campaign_id}/messages",
    response_model=list[CampaignMessageLogResponse],
)
async def get_campaign_messages(
    campaign_id: uuid.UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[CampaignMessageLogResponse]:
    """Get message logs for a specific campaign."""
    # Verify campaign belongs to advisor
    campaign_query = select(CommunicationCampaign).where(
        CommunicationCampaign.id == campaign_id,
        CommunicationCampaign.advisor_id == current_user.id,
    )
    campaign_result = await db.execute(campaign_query)
    if not campaign_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found")

    query = (
        select(CampaignMessageLog)
        .where(CampaignMessageLog.campaign_id == campaign_id)
        .order_by(CampaignMessageLog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    logs = result.scalars().all()
    return [CampaignMessageLogResponse.model_validate(log) for log in logs]
