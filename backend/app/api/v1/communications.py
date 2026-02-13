"""Communication log API endpoints.

Provides endpoints for listing and creating communication logs,
and retrieving message templates, scoped by the authenticated advisor.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.communication import CommunicationLog, MessageTemplate
from app.schemas.communication import (
    CommunicationCreate,
    CommunicationResponse,
    MessageTemplateResponse,
)

router = APIRouter()


@router.get("", response_model=list[CommunicationResponse])
async def list_communications(
    client_id: Optional[uuid.UUID] = Query(
        None, description="Filter by client ID"
    ),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[CommunicationResponse]:
    """List communication logs for the current advisor."""
    query = select(CommunicationLog).where(
        CommunicationLog.advisor_id == current_user["id"]
    )

    if client_id:
        query = query.where(CommunicationLog.client_id == client_id)

    query = (
        query.order_by(CommunicationLog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    logs = result.scalars().all()
    return [CommunicationResponse.model_validate(log) for log in logs]


@router.post("", response_model=CommunicationResponse, status_code=201)
async def create_communication(
    payload: CommunicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> CommunicationResponse:
    """Create a new communication log entry."""
    log = CommunicationLog(
        advisor_id=current_user["id"],
        **payload.model_dump(exclude_unset=True),
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return CommunicationResponse.model_validate(log)


@router.get("/templates", response_model=list[MessageTemplateResponse])
async def list_templates(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[MessageTemplateResponse]:
    """List message templates for the current advisor."""
    query = (
        select(MessageTemplate)
        .where(
            MessageTemplate.advisor_id == current_user["id"],
            MessageTemplate.is_active.is_(True),
        )
        .order_by(MessageTemplate.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    templates = result.scalars().all()
    return [MessageTemplateResponse.model_validate(t) for t in templates]
