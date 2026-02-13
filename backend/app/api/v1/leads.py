"""Lead management API endpoints.

Provides CRUD operations for leads and lead activities,
scoped by the authenticated advisor.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db
from app.models.lead import Lead, LeadActivity
from app.schemas.lead import (
    LeadActivityCreate,
    LeadActivityResponse,
    LeadCreate,
    LeadDetailResponse,
    LeadResponse,
    LeadUpdate,
)

router = APIRouter()


@router.get("", response_model=list[LeadResponse])
async def list_leads(
    stage: Optional[str] = Query(None, description="Filter by lead stage"),
    search: Optional[str] = Query(None, description="Search by lead name"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[LeadResponse]:
    """List leads for the current advisor with optional filtering."""
    query = select(Lead).where(Lead.advisor_id == current_user["id"])

    if stage:
        query = query.where(Lead.stage == stage)
    if search:
        query = query.where(Lead.name.ilike(f"%{search}%"))

    query = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    leads = result.scalars().all()
    return [LeadResponse.model_validate(lead) for lead in leads]


@router.get("/{lead_id}", response_model=LeadDetailResponse)
async def get_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> LeadDetailResponse:
    """Get a single lead with its activities."""
    query = (
        select(Lead)
        .where(Lead.id == lead_id, Lead.advisor_id == current_user["id"])
        .options(selectinload(Lead.activities))
    )
    result = await db.execute(query)
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadDetailResponse.model_validate(lead)


@router.post("", response_model=LeadResponse, status_code=201)
async def create_lead(
    payload: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> LeadResponse:
    """Create a new lead for the current advisor."""
    lead = Lead(
        advisor_id=current_user["id"],
        **payload.model_dump(exclude_unset=True),
    )
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: uuid.UUID,
    payload: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> LeadResponse:
    """Update an existing lead."""
    query = select(Lead).where(
        Lead.id == lead_id, Lead.advisor_id == current_user["id"]
    )
    result = await db.execute(query)
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    await db.flush()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


@router.post(
    "/{lead_id}/activities",
    response_model=LeadActivityResponse,
    status_code=201,
)
async def add_lead_activity(
    lead_id: uuid.UUID,
    payload: LeadActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> LeadActivityResponse:
    """Add an activity to an existing lead."""
    # Verify the lead exists and belongs to the advisor
    query = select(Lead).where(
        Lead.id == lead_id, Lead.advisor_id == current_user["id"]
    )
    result = await db.execute(query)
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activity = LeadActivity(
        lead_id=lead_id,
        advisor_id=current_user["id"],
        **payload.model_dump(exclude_unset=True),
    )
    db.add(activity)
    await db.flush()
    await db.refresh(activity)
    return LeadActivityResponse.model_validate(activity)
