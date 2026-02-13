"""Main v1 API router.

Aggregates all domain-specific routers under the /api/v1 prefix.
New domain routers should be included here as they are created.
"""

from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.campaigns import router as campaigns_router
from app.api.v1.chat import router as chat_router
from app.api.v1.clients import router as clients_router
from app.api.v1.communications import router as communications_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.corporate_actions import router as corporate_actions_router
from app.api.v1.funding import router as funding_router
from app.api.v1.goals import router as goals_router
from app.api.v1.insights import router as insights_router
from app.api.v1.leads import router as leads_router
from app.api.v1.orders import router as orders_router
from app.api.v1.portfolios import router as portfolios_router
from app.api.v1.reports import router as reports_router
from app.api.v1.market import router as market_router
from app.api.v1.tasks import router as tasks_router

v1_router = APIRouter()

# ---------------------------------------------------------------------------
# Include domain routers below as they are implemented.
# ---------------------------------------------------------------------------
v1_router.include_router(auth_router, prefix="/auth", tags=["auth"])
v1_router.include_router(chat_router, prefix="/chat", tags=["chat"])
v1_router.include_router(clients_router, prefix="/clients", tags=["clients"])
v1_router.include_router(portfolios_router, prefix="/portfolios", tags=["portfolios"])
v1_router.include_router(orders_router, prefix="/orders", tags=["orders"])
v1_router.include_router(goals_router, prefix="/goals", tags=["goals"])
v1_router.include_router(funding_router, prefix="/funding", tags=["funding"])
v1_router.include_router(leads_router, prefix="/leads", tags=["leads"])
v1_router.include_router(campaigns_router, prefix="/campaigns", tags=["campaigns"])
v1_router.include_router(communications_router, prefix="/communications", tags=["communications"])
v1_router.include_router(compliance_router, prefix="/compliance", tags=["compliance"])
v1_router.include_router(corporate_actions_router, prefix="/corporate-actions", tags=["corporate-actions"])
v1_router.include_router(admin_router, prefix="/admin", tags=["admin"])
v1_router.include_router(reports_router, prefix="/reports", tags=["reports"])
v1_router.include_router(insights_router, prefix="/insights", tags=["insights"])
v1_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
v1_router.include_router(market_router, prefix="/market", tags=["market"])

# ---------------------------------------------------------------------------
# Legacy/Alternative Routes
# These provide backward compatibility for frontend code that calls
# endpoints directly on /api/v1 instead of the domain-specific prefixes.
# ---------------------------------------------------------------------------

# Redirect compliance-alerts to the compliance router
v1_router.include_router(
    compliance_router,
    prefix="",
    tags=["compliance-legacy"],
    include_in_schema=False,
)

# Add legacy routes for compliance endpoints
from fastapi import Depends, Query
from app.dependencies import get_current_active_user, get_db
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession

# /churn_predictions -> /compliance/churn-predictions
@v1_router.get("/churn_predictions")
async def legacy_churn_predictions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    churn_risk_percentage_gte: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Legacy endpoint - redirects to /compliance/churn-predictions."""
    from app.api.v1.compliance import list_churn_predictions
    return await list_churn_predictions(
        skip=skip,
        limit=limit,
        churn_risk_percentage_gte=churn_risk_percentage_gte,
        db=db,
        current_user=current_user,
    )


# /client_engagement_scores -> /compliance/engagement-scores
@v1_router.get("/client_engagement_scores")
async def legacy_engagement_scores(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    engagement_score_gte: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Legacy endpoint - redirects to /compliance/engagement-scores."""
    from app.api.v1.compliance import list_engagement_scores
    return await list_engagement_scores(
        skip=skip,
        limit=limit,
        engagement_score_gte=engagement_score_gte,
        db=db,
        current_user=current_user,
    )


# /sentiment_logs -> /compliance/sentiment-logs
@v1_router.get("/sentiment_logs")
async def legacy_sentiment_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sentiment_in: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Legacy endpoint - redirects to /compliance/sentiment-logs."""
    from app.api.v1.compliance import list_sentiment_logs
    return await list_sentiment_logs(
        skip=skip,
        limit=limit,
        sentiment_in=sentiment_in,
        db=db,
        current_user=current_user,
    )


# /client-tags -> stub returning empty list
@v1_router.get("/client-tags")
async def list_client_tags(
    client_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Stub endpoint for client tags (not yet implemented)."""
    return {"items": [], "total": 0}


# /compliance-alerts -> /compliance/alerts
@v1_router.get("/compliance-alerts")
async def legacy_compliance_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Legacy endpoint - redirects to /compliance/alerts."""
    from app.api.v1.compliance import list_alerts
    return await list_alerts(
        skip=skip,
        limit=limit,
        db=db,
        current_user=current_user,
    )
