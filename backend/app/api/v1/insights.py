"""AI Insights API endpoints (placeholder).

Provides placeholder endpoints for AI-powered analysis features
that will be connected to ML/AI services in future iterations.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/growth-scan")
async def growth_scan(
    current_user: User = Depends(get_current_active_user),
) -> JSONResponse:
    """Trigger an AI-powered growth opportunity scan.

    Returns 202 Accepted with a task_id that can be used to poll
    for results once the async processing pipeline is implemented.
    """
    task_id = str(uuid.uuid4())
    return JSONResponse(
        status_code=202,
        content={
            "task_id": task_id,
            "status": "accepted",
            "message": "Growth scan queued for processing.",
        },
    )


@router.post("/ai-growth-engine")
async def ai_growth_engine(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """AI Growth Engine insights endpoint (stub).

    Returns placeholder data matching the GrowthEngineData interface.
    """
    return {
        "clients_needing_attention": [],
        "dividend_opportunities": [],
        "rebalance_suggestions": [],
        "investment_opportunities": [],
        "lead_scores": [],
        "churn_risks": [],
        "smart_alerts": [],
        "summary": {
            "total_clients": 0,
            "at_risk_clients": 0,
            "hot_leads": 0,
            "pending_dividends": 0,
            "rebalance_needed": 0,
            "total_opportunity_value": 0,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/corporate-actions")
async def corporate_actions_insights(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Corporate actions insights endpoint (stub).

    Returns placeholder data for corporate actions analysis.
    """
    return {
        "actions": [],
        "alerts": [],
        "upcoming": [],
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/silent-clients")
async def silent_clients(
    current_user: User = Depends(get_current_active_user),
) -> list:
    """Silent clients detection endpoint (stub).

    Returns an empty list until the ML pipeline is connected.
    """
    return []


@router.post("/silent-clients/{client_id}/follow-up")
async def create_silent_client_followup(
    client_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Create follow-up task for a silent client (stub)."""
    return {
        "status": "created",
        "client_id": str(client_id),
        "message": "Follow-up task created.",
    }
