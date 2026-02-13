"""Reports API endpoints (placeholder).

Provides a basic summary statistics endpoint that will be
expanded with more detailed reporting capabilities later.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_active_user, get_db
from app.models.client import Client
from app.models.lead import Lead
from app.models.user import User

router = APIRouter()


@router.get("")
async def list_reports(
    sort_by: str = Query(None, alias="_sort"),
    sort_order: str = Query(None, alias="_order"),
    limit_str: str = Query(None, alias="_limit"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list:
    """List reports (stub). Returns empty list until report storage is implemented."""
    return []


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Return basic summary statistics for the current advisor."""
    advisor_id = current_user.id

    # Total clients
    client_count_result = await db.execute(
        select(func.count(Client.id)).where(Client.advisor_id == advisor_id)
    )
    total_clients = client_count_result.scalar() or 0

    # Total leads
    lead_count_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.advisor_id == advisor_id)
    )
    total_leads = lead_count_result.scalar() or 0

    # Active leads (not won or lost)
    active_leads_result = await db.execute(
        select(func.count(Lead.id)).where(
            Lead.advisor_id == advisor_id,
            Lead.stage.notin_(["won", "lost"]),
        )
    )
    active_leads = active_leads_result.scalar() or 0

    # Total AUM
    total_aum_result = await db.execute(
        select(func.coalesce(func.sum(Client.total_assets), 0)).where(
            Client.advisor_id == advisor_id
        )
    )
    total_aum = float(total_aum_result.scalar() or 0)

    return {
        "total_clients": total_clients,
        "total_leads": total_leads,
        "active_leads": active_leads,
        "total_aum": total_aum,
    }
