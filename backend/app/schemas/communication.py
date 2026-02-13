"""Pydantic schemas for the Communication domain.

Provides request/response models for communication logs
and message templates.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Communication Log
# ---------------------------------------------------------------------------


class CommunicationCreate(BaseModel):
    """Schema for creating a new communication log entry."""

    client_id: uuid.UUID
    communication_type: str
    direction: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = "sent"


class CommunicationResponse(BaseModel):
    """Schema for returning a communication log entry."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: Optional[uuid.UUID] = None
    advisor_id: uuid.UUID
    communication_type: str
    direction: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    status: str
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Message Template
# ---------------------------------------------------------------------------


class MessageTemplateResponse(BaseModel):
    """Schema for returning a message template."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    advisor_id: uuid.UUID
    name: str
    subject: Optional[str] = None
    content: str
    template_type: Optional[str] = None
    category: Optional[str] = None
    is_active: bool
    created_at: datetime
