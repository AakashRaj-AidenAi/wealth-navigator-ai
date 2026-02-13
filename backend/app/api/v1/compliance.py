"""Compliance domain API endpoints.

Provides endpoints for compliance alerts, churn predictions,
and client engagement scores, scoped by the authenticated advisor.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.compliance import (
    ChurnPrediction,
    ClientEngagementScore,
    ComplianceAlert,
)
from app.schemas.compliance import (
    ChurnPredictionResponse,
    ComplianceAlertResponse,
    EngagementScoreResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Compliance Alerts
# ---------------------------------------------------------------------------


@router.get("/alerts", response_model=list[ComplianceAlertResponse])
async def list_alerts(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[ComplianceAlertResponse]:
    """List compliance alerts for the current advisor."""
    query = (
        select(ComplianceAlert)
        .where(ComplianceAlert.advisor_id == current_user["id"])
        .order_by(ComplianceAlert.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    alerts = result.scalars().all()
    return [ComplianceAlertResponse.model_validate(a) for a in alerts]


@router.put(
    "/alerts/{alert_id}/resolve",
    response_model=ComplianceAlertResponse,
)
async def resolve_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> ComplianceAlertResponse:
    """Resolve a compliance alert."""
    query = select(ComplianceAlert).where(
        ComplianceAlert.id == alert_id,
        ComplianceAlert.advisor_id == current_user["id"],
    )
    result = await db.execute(query)
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by = current_user["id"]

    await db.flush()
    await db.refresh(alert)
    return ComplianceAlertResponse.model_validate(alert)


# ---------------------------------------------------------------------------
# Churn Predictions
# ---------------------------------------------------------------------------


@router.get(
    "/churn-predictions", response_model=list[ChurnPredictionResponse]
)
async def list_churn_predictions(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[ChurnPredictionResponse]:
    """List churn predictions for the current advisor's clients."""
    query = (
        select(ChurnPrediction)
        .where(ChurnPrediction.advisor_id == current_user["id"])
        .order_by(ChurnPrediction.churn_risk_percentage.desc().nullslast())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    predictions = result.scalars().all()
    return [ChurnPredictionResponse.model_validate(p) for p in predictions]


# ---------------------------------------------------------------------------
# Engagement Scores
# ---------------------------------------------------------------------------


@router.get(
    "/engagement-scores", response_model=list[EngagementScoreResponse]
)
async def list_engagement_scores(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[EngagementScoreResponse]:
    """List client engagement scores for the current advisor."""
    query = (
        select(ClientEngagementScore)
        .where(ClientEngagementScore.advisor_id == current_user["id"])
        .order_by(
            ClientEngagementScore.engagement_score.desc().nullslast()
        )
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    scores = result.scalars().all()
    return [EngagementScoreResponse.model_validate(s) for s in scores]
