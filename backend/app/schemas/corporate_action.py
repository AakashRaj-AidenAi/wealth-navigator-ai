"""Pydantic schemas for the Corporate Action domain.

Provides response models for corporate actions and
client-specific corporate action impacts.
"""

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Corporate Action
# ---------------------------------------------------------------------------


class CorporateActionResponse(BaseModel):
    """Schema for returning a corporate action."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    advisor_id: uuid.UUID
    symbol: str
    company_name: Optional[str] = None
    action_type: str
    description: Optional[str] = None
    ex_date: Optional[date] = None
    record_date: Optional[date] = None
    payment_date: Optional[date] = None
    dividend_amount: Optional[float] = None
    ratio: Optional[str] = None
    status: str
    ai_summary: Optional[str] = None
    ai_suggestion: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Client Corporate Action
# ---------------------------------------------------------------------------


class ClientCorporateActionResponse(BaseModel):
    """Schema for returning a client-specific corporate action impact."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    corporate_action_id: uuid.UUID
    client_id: uuid.UUID
    advisor_id: uuid.UUID
    holdings_quantity: Optional[float] = None
    estimated_impact: Optional[float] = None
    ai_personalized_summary: Optional[str] = None
    is_notified: bool
    notified_at: Optional[datetime] = None
    created_at: datetime


class CorporateActionDetailResponse(CorporateActionResponse):
    """Corporate action response with nested client impacts."""

    client_corporate_actions: list[ClientCorporateActionResponse] = []
