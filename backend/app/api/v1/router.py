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
