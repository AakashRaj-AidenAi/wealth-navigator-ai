"""Pydantic schemas for the Compliance domain.

Provides response models for compliance alerts, churn predictions,
and client engagement scores.
"""

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Compliance Alert
# ---------------------------------------------------------------------------


class ComplianceAlertResponse(BaseModel):
    """Schema for returning a compliance alert."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: Optional[uuid.UUID] = None
    advisor_id: uuid.UUID
    alert_type: str
    title: str
    description: Optional[str] = None
    severity: str
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[uuid.UUID] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Churn Prediction
# ---------------------------------------------------------------------------


class ChurnPredictionResponse(BaseModel):
    """Schema for returning a churn prediction."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    advisor_id: uuid.UUID
    churn_risk_percentage: Optional[float] = None
    risk_factors: Optional[dict[str, Any]] = None
    risk_level: Optional[str] = None
    predicted_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Engagement Score
# ---------------------------------------------------------------------------


class EngagementScoreResponse(BaseModel):
    """Schema for returning a client engagement score."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    advisor_id: uuid.UUID
    engagement_score: Optional[float] = None
    engagement_level: Optional[str] = None
    login_frequency: int = 0
    campaign_response_rate: float = 0.0
    days_since_last_interaction: Optional[int] = None
    last_calculated_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Sentiment Log
# ---------------------------------------------------------------------------


class SentimentLogResponse(BaseModel):
    """Schema for returning a sentiment log."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: Optional[uuid.UUID] = None
    advisor_id: uuid.UUID
    source: Optional[str] = None
    content: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None
    analyzed_at: datetime
