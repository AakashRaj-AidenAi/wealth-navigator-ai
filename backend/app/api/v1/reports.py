"""Reports API endpoints (placeholder).

Provides a basic summary statistics endpoint that will be
expanded with more detailed reporting capabilities later.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.client import Client
from app.models.lead import Lead

router = APIRouter()


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Return basic summary statistics for the current advisor."""
    advisor_id = current_user["id"]

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
