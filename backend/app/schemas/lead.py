"""Pydantic schemas for the Lead domain.

Provides request/response models for leads, lead activities,
and related CRUD operations.
"""

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Lead Activity
# ---------------------------------------------------------------------------


class LeadActivityCreate(BaseModel):
    """Schema for creating a new lead activity."""

    activity_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class LeadActivityResponse(BaseModel):
    """Schema for returning a lead activity."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    advisor_id: uuid.UUID
    activity_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Lead
# ---------------------------------------------------------------------------


class LeadCreate(BaseModel):
    """Schema for creating a new lead."""

    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = "new"
    probability: Optional[float] = None
    expected_value: Optional[float] = None
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    """Schema for updating an existing lead. All fields are optional."""

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = None
    probability: Optional[float] = None
    expected_value: Optional[float] = None
    notes: Optional[str] = None


class LeadResponse(BaseModel):
    """Schema for returning a lead."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    advisor_id: uuid.UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    stage: str
    probability: Optional[float] = None
    expected_value: Optional[float] = None
    assigned_to: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    converted_client_id: Optional[uuid.UUID] = None
    converted_at: Optional[datetime] = None
    last_contacted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class LeadDetailResponse(LeadResponse):
    """Lead response with nested activities."""

    activities: list[LeadActivityResponse] = []
