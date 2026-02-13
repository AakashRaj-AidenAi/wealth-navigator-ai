"""Pydantic schemas for authentication and user endpoints.

Defines request/response models for registration, login, token
refresh, and user profile retrieval.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class UserRegister(BaseModel):
    """Schema for new user registration."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=256)
    role: str = Field(
        default="wealth_advisor",
        pattern="^(wealth_advisor|compliance_officer|client|admin)$",
        description="User role. Defaults to wealth_advisor.",
    )


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class TokenRefresh(BaseModel):
    """Schema for refreshing an access token."""

    refresh_token: str


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class UserOut(BaseModel):
    """Public-facing user representation (no sensitive fields)."""

    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Response returned after successful authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
