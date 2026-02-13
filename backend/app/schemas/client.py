"""Pydantic schemas for the Client domain.

Defines request/response models for client CRUD operations.
"""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ClientBase(BaseModel):
    """Shared fields for client create and update operations."""

    client_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    client_type: Optional[str] = None
    risk_profile: Optional[str] = None
    total_assets: Optional[float] = None
    kyc_expiry_date: Optional[date] = None
    pan_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    occupation: Optional[str] = None
    annual_income: Optional[float] = None
    source_of_wealth: Optional[str] = None
    investment_experience: Optional[str] = None
    preferred_communication: Optional[str] = None


class ClientCreate(ClientBase):
    """Schema for creating a new client. client_name is required (inherited)."""

    pass


class ClientUpdate(ClientBase):
    """Schema for updating an existing client. All fields are optional."""

    client_name: Optional[str] = None  # type: ignore[assignment]


class ClientResponse(ClientBase):
    """Schema for returning a client record in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    advisor_id: uuid.UUID
    is_active: bool
    onboarding_completed: bool
    created_at: datetime
    updated_at: datetime


class ClientListResponse(BaseModel):
    """Paginated list of clients."""

    items: list[ClientResponse]
    total: int
    page: int
    limit: int
