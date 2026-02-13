"""Pydantic schemas for the Campaign domain.

Provides request/response models for communication campaigns,
message logs, and related CRUD operations.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Campaign Message Log
# ---------------------------------------------------------------------------


class CampaignMessageLogResponse(BaseModel):
    """Schema for returning a campaign message log entry."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    campaign_id: uuid.UUID
    client_id: uuid.UUID
    channel: str
    subject: Optional[str] = None
    content: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Campaign
# ---------------------------------------------------------------------------


class CampaignCreate(BaseModel):
    """Schema for creating a new campaign."""

    name: str
    description: Optional[str] = None
    campaign_type: Optional[str] = None
    channel: Optional[str] = None
    content: Optional[str] = None
    subject: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class CampaignUpdate(BaseModel):
    """Schema for updating an existing campaign. All fields are optional."""

    name: Optional[str] = None
    description: Optional[str] = None
    campaign_type: Optional[str] = None
    channel: Optional[str] = None
    content: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class CampaignResponse(BaseModel):
    """Schema for returning a campaign."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    advisor_id: uuid.UUID
    name: str
    description: Optional[str] = None
    campaign_type: Optional[str] = None
    channel: Optional[str] = None
    status: str
    content: Optional[str] = None
    subject: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    sent_count: int = 0
    delivered_count: int = 0
    opened_count: int = 0
    failed_count: int = 0
    created_at: datetime
