"""Pydantic schemas for goal domain.

Covers CRUD operations for client life goals.
"""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Goal
# ---------------------------------------------------------------------------


class GoalCreate(BaseModel):
    """Schema for creating a new goal."""

    client_id: uuid.UUID
    name: str
    goal_type: Optional[str] = None
    target_amount: float = 0
    current_amount: float = 0
    target_date: Optional[date] = None
    monthly_sip: float = 0
    priority: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None


class GoalUpdate(BaseModel):
    """Schema for updating an existing goal (all fields optional)."""

    name: Optional[str] = None
    goal_type: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[date] = None
    monthly_sip: Optional[float] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class GoalResponse(BaseModel):
    """Schema for goal response data."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    advisor_id: uuid.UUID
    name: str
    goal_type: Optional[str] = None
    target_amount: float
    current_amount: float
    target_date: Optional[date] = None
    monthly_sip: float
    priority: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Paginated response wrapper
# ---------------------------------------------------------------------------


class PaginatedGoalResponse(BaseModel):
    """Paginated list of goals."""

    items: list[GoalResponse]
    total: int
    page: int
    limit: int
