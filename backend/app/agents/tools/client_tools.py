"""Client data lookup tools for AI agents.

Provides tool functions for querying client profiles, activities,
engagement scores, compliance status, churn predictions, and more.
All functions use async SQLAlchemy sessions and return JSON-serializable dicts.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tools import tool
from app.models.client import (
    Client,
    ClientActivity,
    ClientAUM,
    ClientLifeGoal,
    ClientNote,
    ClientReminder,
)
from app.models.communication import CommunicationLog
from app.models.compliance import (
    AuditLog,
    ChurnPrediction,
    ClientEngagementScore,
    ComplianceAlert,
)
from app.models.order import Order


# ---------------------------------------------------------------------------
# get_client_profile
# ---------------------------------------------------------------------------


@tool(
    name="get_client_profile",
    description=(
        "Fetch a client profile including personal details, AUM breakdown, "
        "and life goals. Requires a client_id."
    ),
)
async def get_client_profile(client_id: str, db: AsyncSession) -> dict:
    """Return client profile, AUM, and goals for the given client_id."""
    # Client record
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        return {"error": f"Client {client_id} not found"}

    # Latest AUM snapshot
    aum_result = await db.execute(
        select(ClientAUM)
        .where(ClientAUM.client_id == client_id)
        .order_by(ClientAUM.created_at.desc())
        .limit(1)
    )
    aum = aum_result.scalar_one_or_none()

    # Life goals
    goals_result = await db.execute(
        select(ClientLifeGoal).where(ClientLifeGoal.client_id == client_id)
    )
    goals = goals_result.scalars().all()

    return {
        "client_id": str(client.id),
        "client_name": client.client_name,
        "email": client.email,
        "phone": client.phone,
        "client_type": client.client_type,
        "risk_profile": client.risk_profile,
        "total_assets": client.total_assets,
        "kyc_expiry_date": str(client.kyc_expiry_date) if client.kyc_expiry_date else None,
        "pan_number": client.pan_number,
        "occupation": client.occupation,
        "annual_income": client.annual_income,
        "city": client.city,
        "state": client.state,
        "is_active": client.is_active,
        "aum": {
            "current_aum": aum.current_aum if aum else 0,
            "equity_aum": aum.equity_aum if aum else 0,
            "debt_aum": aum.debt_aum if aum else 0,
            "hybrid_aum": aum.hybrid_aum if aum else 0,
            "other_assets": aum.other_assets if aum else 0,
        },
        "goals": [
            {
                "name": g.name,
                "goal_type": g.goal_type,
                "target_amount": g.target_amount,
                "current_amount": g.current_amount,
                "target_date": str(g.target_date) if g.target_date else None,
                "monthly_sip": g.monthly_sip,
                "priority": g.priority,
                "status": g.status,
            }
            for g in goals
        ],
    }


# ---------------------------------------------------------------------------
# get_recent_activity
# ---------------------------------------------------------------------------


@tool(
    name="get_recent_activity",
    description=(
        "Fetch recent activities for a client such as calls, meetings, "
        "emails, portfolio updates. Returns up to ``limit`` entries."
    ),
)
async def get_recent_activity(
    client_id: str, db: AsyncSession, limit: int = 10
) -> list[dict]:
    """Return the most recent activities for a client."""
    result = await db.execute(
        select(ClientActivity)
        .where(ClientActivity.client_id == client_id)
        .order_by(ClientActivity.created_at.desc())
        .limit(limit)
    )
    activities = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "activity_type": a.activity_type,
            "title": a.title,
            "description": a.description,
            "activity_date": str(a.activity_date) if a.activity_date else None,
            "created_at": str(a.created_at),
        }
        for a in activities
    ]


# ---------------------------------------------------------------------------
# get_engagement_score
# ---------------------------------------------------------------------------


@tool(
    name="get_engagement_score",
    description=(
        "Fetch the engagement score and engagement level for a client. "
        "Returns score, level, login frequency, campaign response rate, "
        "and days since last interaction."
    ),
)
async def get_engagement_score(client_id: str, db: AsyncSession) -> dict:
    """Return the latest engagement score for a client."""
    result = await db.execute(
        select(ClientEngagementScore)
        .where(ClientEngagementScore.client_id == client_id)
        .order_by(ClientEngagementScore.created_at.desc())
        .limit(1)
    )
    score = result.scalar_one_or_none()
    if not score:
        return {"client_id": client_id, "engagement_score": None, "message": "No score available"}

    return {
        "client_id": client_id,
        "engagement_score": score.engagement_score,
        "engagement_level": score.engagement_level,
        "login_frequency": score.login_frequency,
        "campaign_response_rate": score.campaign_response_rate,
        "days_since_last_interaction": score.days_since_last_interaction,
        "last_calculated_at": str(score.last_calculated_at) if score.last_calculated_at else None,
    }


# ---------------------------------------------------------------------------
# search_clients
# ---------------------------------------------------------------------------


@tool(
    name="search_clients",
    description=(
        "Search clients by name for a given advisor. Returns a list of "
        "matching clients with basic info and AUM."
    ),
)
async def search_clients(
    query: str, db: AsyncSession, advisor_id: str
) -> list[dict]:
    """Search clients by name within an advisor's book."""
    result = await db.execute(
        select(Client)
        .where(
            Client.advisor_id == advisor_id,
            Client.client_name.ilike(f"%{query}%"),
        )
        .order_by(Client.client_name)
        .limit(20)
    )
    clients = result.scalars().all()
    return [
        {
            "client_id": str(c.id),
            "client_name": c.client_name,
            "email": c.email,
            "phone": c.phone,
            "client_type": c.client_type,
            "risk_profile": c.risk_profile,
            "total_assets": c.total_assets,
            "is_active": c.is_active,
        }
        for c in clients
    ]


# ---------------------------------------------------------------------------
# get_client_summary
# ---------------------------------------------------------------------------


@tool(
    name="get_client_summary",
    description=(
        "Comprehensive client summary including profile, AUM, goals, "
        "recent activity, engagement score, and notes. Ideal for meeting prep."
    ),
)
async def get_client_summary(client_id: str, db: AsyncSession) -> dict:
    """Return a comprehensive summary for a client."""
    profile = await get_client_profile(client_id=client_id, db=db)
    if "error" in profile:
        return profile

    activities = await get_recent_activity(client_id=client_id, db=db, limit=5)
    engagement = await get_engagement_score(client_id=client_id, db=db)

    # Recent notes
    notes_result = await db.execute(
        select(ClientNote)
        .where(ClientNote.client_id == client_id)
        .order_by(ClientNote.created_at.desc())
        .limit(5)
    )
    notes = notes_result.scalars().all()

    return {
        "profile": profile,
        "recent_activities": activities,
        "engagement": engagement,
        "recent_notes": [
            {
                "title": n.title,
                "content": n.content,
                "is_pinned": n.is_pinned,
                "created_at": str(n.created_at),
            }
            for n in notes
        ],
    }


# ---------------------------------------------------------------------------
# get_pending_items
# ---------------------------------------------------------------------------


@tool(
    name="get_pending_items",
    description=(
        "Fetch pending orders, incomplete reminders, and open tasks for a client. "
        "Useful for meeting preparation."
    ),
)
async def get_pending_items(client_id: str, db: AsyncSession) -> dict:
    """Return pending orders and reminders for a client."""
    # Pending orders
    orders_result = await db.execute(
        select(Order)
        .where(Order.client_id == client_id, Order.status == "pending")
        .order_by(Order.created_at.desc())
        .limit(20)
    )
    orders = orders_result.scalars().all()

    # Incomplete reminders
    reminders_result = await db.execute(
        select(ClientReminder)
        .where(
            ClientReminder.client_id == client_id,
            ClientReminder.is_completed == False,  # noqa: E712
        )
        .order_by(ClientReminder.reminder_date.asc())
        .limit(20)
    )
    reminders = reminders_result.scalars().all()

    return {
        "client_id": client_id,
        "pending_orders": [
            {
                "id": str(o.id),
                "symbol": o.symbol,
                "order_type": o.order_type,
                "quantity": o.quantity,
                "price": o.price,
                "total_amount": o.total_amount,
                "status": o.status,
                "created_at": str(o.created_at),
            }
            for o in orders
        ],
        "pending_reminders": [
            {
                "id": str(r.id),
                "title": r.title,
                "description": r.description,
                "reminder_type": r.reminder_type,
                "reminder_date": str(r.reminder_date),
            }
            for r in reminders
        ],
    }


# ---------------------------------------------------------------------------
# get_recent_communications
# ---------------------------------------------------------------------------


@tool(
    name="get_recent_communications",
    description=(
        "Fetch recent communications (emails, calls, meetings, WhatsApp) "
        "for a client. Returns up to ``limit`` entries."
    ),
)
async def get_recent_communications(
    client_id: str, db: AsyncSession, limit: int = 5
) -> list[dict]:
    """Return recent communication logs for a client."""
    result = await db.execute(
        select(CommunicationLog)
        .where(CommunicationLog.client_id == client_id)
        .order_by(CommunicationLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "communication_type": log.communication_type,
            "direction": log.direction,
            "subject": log.subject,
            "content": (log.content[:200] + "...") if log.content and len(log.content) > 200 else log.content,
            "status": log.status,
            "created_at": str(log.created_at),
        }
        for log in logs
    ]


# ---------------------------------------------------------------------------
# score_clients
# ---------------------------------------------------------------------------


@tool(
    name="score_clients",
    description=(
        "Score all clients for an advisor by engagement level. Returns a "
        "ranked list of clients with their engagement scores and levels."
    ),
)
async def score_clients(advisor_id: str, db: AsyncSession) -> list[dict]:
    """Return engagement scores for all clients of an advisor, ranked by score."""
    result = await db.execute(
        select(
            ClientEngagementScore.client_id,
            ClientEngagementScore.engagement_score,
            ClientEngagementScore.engagement_level,
            ClientEngagementScore.days_since_last_interaction,
            Client.client_name,
            Client.total_assets,
        )
        .join(Client, Client.id == ClientEngagementScore.client_id)
        .where(ClientEngagementScore.advisor_id == advisor_id)
        .order_by(ClientEngagementScore.engagement_score.desc())
    )
    rows = result.all()
    return [
        {
            "client_id": str(row.client_id),
            "client_name": row.client_name,
            "engagement_score": row.engagement_score,
            "engagement_level": row.engagement_level,
            "days_since_last_interaction": row.days_since_last_interaction,
            "total_assets": row.total_assets,
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# predict_churn
# ---------------------------------------------------------------------------


@tool(
    name="predict_churn",
    description=(
        "Return churn risk predictions for all clients of an advisor. "
        "Includes risk percentage, risk level, and contributing factors."
    ),
)
async def predict_churn(advisor_id: str, db: AsyncSession) -> list[dict]:
    """Return churn predictions for an advisor's clients."""
    result = await db.execute(
        select(
            ChurnPrediction.client_id,
            ChurnPrediction.churn_risk_percentage,
            ChurnPrediction.risk_level,
            ChurnPrediction.risk_factors,
            ChurnPrediction.predicted_at,
            Client.client_name,
            Client.total_assets,
        )
        .join(Client, Client.id == ChurnPrediction.client_id)
        .where(ChurnPrediction.advisor_id == advisor_id)
        .order_by(ChurnPrediction.churn_risk_percentage.desc())
    )
    rows = result.all()
    return [
        {
            "client_id": str(row.client_id),
            "client_name": row.client_name,
            "churn_risk_percentage": row.churn_risk_percentage,
            "risk_level": row.risk_level,
            "risk_factors": row.risk_factors,
            "total_assets": row.total_assets,
            "predicted_at": str(row.predicted_at) if row.predicted_at else None,
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# get_silent_clients
# ---------------------------------------------------------------------------


@tool(
    name="get_silent_clients",
    description=(
        "Detect silent or dormant clients who have had no activity in the "
        "last ``days`` days (default 30). Returns client info and last activity date."
    ),
)
async def get_silent_clients(
    advisor_id: str, db: AsyncSession, days: int = 30
) -> list[dict]:
    """Return clients with no activity in the specified number of days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Subquery: clients who DO have recent activity
    active_subq = (
        select(ClientActivity.client_id)
        .where(ClientActivity.created_at >= cutoff)
        .distinct()
        .subquery()
    )

    result = await db.execute(
        select(Client)
        .where(
            Client.advisor_id == advisor_id,
            Client.is_active == True,  # noqa: E712
            ~Client.id.in_(select(active_subq.c.client_id)),
        )
        .order_by(Client.total_assets.desc())
    )
    clients = result.scalars().all()

    silent_list = []
    for c in clients:
        # Find last activity date
        last_activity_result = await db.execute(
            select(ClientActivity.created_at)
            .where(ClientActivity.client_id == c.id)
            .order_by(ClientActivity.created_at.desc())
            .limit(1)
        )
        last_date = last_activity_result.scalar_one_or_none()

        silent_list.append(
            {
                "client_id": str(c.id),
                "client_name": c.client_name,
                "total_assets": c.total_assets,
                "last_activity_date": str(last_date) if last_date else "Never",
                "days_silent": (
                    (datetime.now(timezone.utc) - last_date).days if last_date else None
                ),
            }
        )
    return silent_list


# ---------------------------------------------------------------------------
# check_kyc_status
# ---------------------------------------------------------------------------


@tool(
    name="check_kyc_status",
    description=(
        "Check KYC expiry status for all clients of an advisor. Returns "
        "clients with expiring or expired KYC within 90 days."
    ),
)
async def check_kyc_status(advisor_id: str, db: AsyncSession) -> list[dict]:
    """Return clients with KYC expiring within 90 days or already expired."""
    cutoff = datetime.now(timezone.utc).date() + timedelta(days=90)

    result = await db.execute(
        select(Client)
        .where(
            Client.advisor_id == advisor_id,
            Client.is_active == True,  # noqa: E712
            Client.kyc_expiry_date != None,  # noqa: E711
            Client.kyc_expiry_date <= cutoff,
        )
        .order_by(Client.kyc_expiry_date.asc())
    )
    clients = result.scalars().all()

    today = datetime.now(timezone.utc).date()
    return [
        {
            "client_id": str(c.id),
            "client_name": c.client_name,
            "kyc_expiry_date": str(c.kyc_expiry_date),
            "days_until_expiry": (c.kyc_expiry_date - today).days,
            "status": "expired" if c.kyc_expiry_date < today else "expiring_soon",
            "pan_number": c.pan_number,
        }
        for c in clients
    ]


# ---------------------------------------------------------------------------
# get_compliance_alerts
# ---------------------------------------------------------------------------


@tool(
    name="get_compliance_alerts",
    description=(
        "Fetch unresolved compliance alerts for an advisor. Includes alert type, "
        "severity, description, and affected client."
    ),
)
async def get_compliance_alerts(
    advisor_id: str, db: AsyncSession
) -> list[dict]:
    """Return unresolved compliance alerts for an advisor."""
    result = await db.execute(
        select(ComplianceAlert)
        .where(
            ComplianceAlert.advisor_id == advisor_id,
            ComplianceAlert.is_resolved == False,  # noqa: E712
        )
        .order_by(
            ComplianceAlert.severity.desc(),
            ComplianceAlert.created_at.desc(),
        )
    )
    alerts = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "alert_type": a.alert_type,
            "title": a.title,
            "description": a.description,
            "severity": a.severity,
            "client_id": str(a.client_id) if a.client_id else None,
            "created_at": str(a.created_at),
        }
        for a in alerts
    ]


# ---------------------------------------------------------------------------
# get_audit_trail
# ---------------------------------------------------------------------------


@tool(
    name="get_audit_trail",
    description=(
        "Fetch the audit trail for a specific client. Returns recent data "
        "change records including action, table, old/new data."
    ),
)
async def get_audit_trail(
    client_id: str, db: AsyncSession, limit: int = 20
) -> list[dict]:
    """Return audit log entries related to a client."""
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.record_id == client_id)
        .order_by(AuditLog.changed_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "table_name": log.table_name,
            "action": log.action,
            "changed_by": str(log.changed_by) if log.changed_by else None,
            "old_data": log.old_data,
            "new_data": log.new_data,
            "changed_at": str(log.changed_at),
        }
        for log in logs
    ]


# ---------------------------------------------------------------------------
# identify_opportunities
# ---------------------------------------------------------------------------


@tool(
    name="identify_opportunities",
    description=(
        "Identify cross-sell and up-sell opportunities across an advisor's "
        "client book. Analyzes AUM, goals, and product gaps."
    ),
)
async def identify_opportunities(
    advisor_id: str, db: AsyncSession
) -> list[dict]:
    """Identify cross-sell opportunities for an advisor's clients."""
    # Get clients with their AUM breakdown
    result = await db.execute(
        select(
            Client.id,
            Client.client_name,
            Client.total_assets,
            Client.risk_profile,
            Client.annual_income,
            ClientAUM.equity_aum,
            ClientAUM.debt_aum,
            ClientAUM.hybrid_aum,
        )
        .outerjoin(ClientAUM, ClientAUM.client_id == Client.id)
        .where(
            Client.advisor_id == advisor_id,
            Client.is_active == True,  # noqa: E712
        )
        .order_by(Client.total_assets.desc())
    )
    rows = result.all()

    opportunities = []
    for row in rows:
        opps: list[str] = []

        # Check for asset-class diversification gaps
        total = (row.equity_aum or 0) + (row.debt_aum or 0) + (row.hybrid_aum or 0)
        if total > 0:
            equity_pct = (row.equity_aum or 0) / total * 100
            debt_pct = (row.debt_aum or 0) / total * 100

            if equity_pct > 80:
                opps.append("Debt diversification needed - equity heavy portfolio")
            if debt_pct > 80:
                opps.append("Equity allocation opportunity - debt heavy portfolio")
            if (row.hybrid_aum or 0) == 0:
                opps.append("Hybrid/balanced fund opportunity")

        # Check for SIP potential based on income
        if row.annual_income and row.annual_income > 1000000 and (row.total_assets or 0) < row.annual_income * 2:
            opps.append("SIP step-up opportunity - high income, low AUM ratio")

        # Check for tax-saving opportunities
        if row.annual_income and row.annual_income > 500000:
            opps.append("Section 80C ELSS opportunity")

        if opps:
            opportunities.append(
                {
                    "client_id": str(row.id),
                    "client_name": row.client_name,
                    "total_assets": row.total_assets,
                    "risk_profile": row.risk_profile,
                    "opportunities": opps,
                }
            )

    return opportunities
