"""Admin API endpoints.

Provides admin-only endpoints for viewing audit logs and managing users.
Access is restricted to users with the 'admin' role.
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_active_user, get_db
from app.models.compliance import AuditLog
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas (co-located since they are admin-specific)
# ---------------------------------------------------------------------------


class AuditLogResponse(BaseModel):
    """Schema for returning an audit log entry."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    table_name: str
    record_id: str
    action: str
    changed_by: Optional[uuid.UUID] = None
    old_data: Optional[dict] = None
    new_data: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    changed_at: datetime
    created_at: datetime


class UserResponse(BaseModel):
    """Schema for returning a user record (admin view)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    avatar_url: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _require_admin(current_user: User) -> None:
    """Raise 403 if the current user is not an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Admin access required"
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[AuditLogResponse]:
    """List audit log entries. Admin only."""
    _require_admin(current_user)

    query = (
        select(AuditLog)
        .order_by(AuditLog.changed_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    logs = result.scalars().all()
    return [AuditLogResponse.model_validate(log) for log in logs]


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[UserResponse]:
    """List all users. Admin only."""
    _require_admin(current_user)

    query = (
        select(User)
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]
