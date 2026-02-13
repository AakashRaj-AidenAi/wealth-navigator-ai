"""Report generation and analytics tools for AI agents.

Provides tool functions for generating reports, listing templates,
summarizing AUM, and breaking down revenue.
All functions use async SQLAlchemy sessions and return JSON-serializable dicts.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tools import tool
from app.models.client import Client, ClientAUM
from app.models.lead import CommissionRecord, RevenueRecord


# ---------------------------------------------------------------------------
# generate_report
# ---------------------------------------------------------------------------


@tool(
    name="generate_report",
    description=(
        "Generate a report for an advisor. Supported report_type values: "
        "aum_summary, client_performance, revenue, portfolio_drift, "
        "compliance_status. Returns structured report data."
    ),
)
async def generate_report(
    user_id: str,
    report_type: str,
    date_range: str = "",
    client_id: str = "",
    db: AsyncSession = None,
) -> dict:
    """Generate a report based on the requested type.

    Args:
        user_id: Advisor user ID.
        report_type: Type of report to generate.
        date_range: Optional date range string (e.g. '30d', '90d', '1y').
        client_id: Optional client ID to scope the report.
        db: Database session.
    """
    report: dict = {
        "report_type": report_type,
        "generated_at": str(datetime.now(timezone.utc)),
        "user_id": user_id,
    }

    if report_type == "aum_summary":
        data = await get_aum_summary(user_id=user_id, db=db)
        report["data"] = data

    elif report_type == "revenue":
        data = await get_revenue_breakdown(user_id=user_id, period="monthly", db=db)
        report["data"] = data

    elif report_type == "client_performance":
        # Aggregate client-level performance snapshot
        query = select(
            Client.id,
            Client.client_name,
            Client.total_assets,
            Client.risk_profile,
        ).where(Client.advisor_id == user_id, Client.is_active == True)  # noqa: E712

        if client_id:
            query = query.where(Client.id == client_id)

        result = await db.execute(query.order_by(Client.total_assets.desc()).limit(50))
        rows = result.all()

        report["data"] = {
            "clients": [
                {
                    "client_id": str(row.id),
                    "client_name": row.client_name,
                    "total_assets": row.total_assets,
                    "risk_profile": row.risk_profile,
                }
                for row in rows
            ],
            "total_clients": len(rows),
        }

    elif report_type == "portfolio_drift":
        report["data"] = {
            "message": (
                "Portfolio drift report requires per-portfolio analysis. "
                "Use the portfolio_intelligence agent for detailed drift calculation."
            ),
        }

    elif report_type == "compliance_status":
        report["data"] = {
            "message": (
                "Compliance status report aggregates KYC expiry and alert data. "
                "Use the compliance_sentinel agent for detailed compliance analysis."
            ),
        }

    else:
        report["data"] = {
            "message": f"Report type '{report_type}' is not yet supported.",
            "supported_types": [
                "aum_summary",
                "client_performance",
                "revenue",
                "portfolio_drift",
                "compliance_status",
            ],
        }

    return report


# ---------------------------------------------------------------------------
# get_report_templates
# ---------------------------------------------------------------------------


@tool(
    name="get_report_templates",
    description=(
        "Return a list of available report templates with their names, "
        "descriptions, and required parameters."
    ),
)
async def get_report_templates(db: AsyncSession = None) -> list[dict]:
    """Return available report templates."""
    return [
        {
            "template_id": "aum_summary",
            "name": "AUM Summary Report",
            "description": "Total assets under management with equity/debt/hybrid breakdown.",
            "parameters": ["user_id"],
        },
        {
            "template_id": "client_performance",
            "name": "Client Performance Report",
            "description": "Performance snapshot across all clients or a specific client.",
            "parameters": ["user_id", "client_id (optional)"],
        },
        {
            "template_id": "revenue",
            "name": "Revenue Breakdown Report",
            "description": "Revenue and commission breakdown by type and period.",
            "parameters": ["user_id", "period"],
        },
        {
            "template_id": "portfolio_drift",
            "name": "Portfolio Drift Report",
            "description": "Asset allocation drift analysis for client portfolios.",
            "parameters": ["user_id", "client_id (optional)"],
        },
        {
            "template_id": "compliance_status",
            "name": "Compliance Status Report",
            "description": "KYC expiry, compliance alerts, and regulatory status overview.",
            "parameters": ["user_id"],
        },
    ]


# ---------------------------------------------------------------------------
# get_aum_summary
# ---------------------------------------------------------------------------


@tool(
    name="get_aum_summary",
    description=(
        "Get total AUM summary for an advisor across all clients. "
        "Returns aggregate equity, debt, hybrid, and other asset breakdowns."
    ),
)
async def get_aum_summary(
    user_id: str,
    db: AsyncSession = None,
) -> dict:
    """Return aggregate AUM summary for an advisor."""
    result = await db.execute(
        select(
            func.sum(ClientAUM.current_aum).label("total_aum"),
            func.sum(ClientAUM.equity_aum).label("total_equity"),
            func.sum(ClientAUM.debt_aum).label("total_debt"),
            func.sum(ClientAUM.hybrid_aum).label("total_hybrid"),
            func.sum(ClientAUM.other_assets).label("total_other"),
            func.count(ClientAUM.client_id.distinct()).label("client_count"),
        ).where(ClientAUM.advisor_id == user_id)
    )
    row = result.one()

    total_aum = row.total_aum or 0
    total_equity = row.total_equity or 0
    total_debt = row.total_debt or 0
    total_hybrid = row.total_hybrid or 0
    total_other = row.total_other or 0

    return {
        "user_id": user_id,
        "total_aum": total_aum,
        "equity_aum": total_equity,
        "debt_aum": total_debt,
        "hybrid_aum": total_hybrid,
        "other_assets": total_other,
        "client_count": row.client_count or 0,
        "allocation_pct": {
            "equity": round((total_equity / total_aum) * 100, 2) if total_aum > 0 else 0,
            "debt": round((total_debt / total_aum) * 100, 2) if total_aum > 0 else 0,
            "hybrid": round((total_hybrid / total_aum) * 100, 2) if total_aum > 0 else 0,
            "other": round((total_other / total_aum) * 100, 2) if total_aum > 0 else 0,
        },
    }


# ---------------------------------------------------------------------------
# get_revenue_breakdown
# ---------------------------------------------------------------------------


@tool(
    name="get_revenue_breakdown",
    description=(
        "Get revenue breakdown for an advisor by type and period. "
        "Period can be 'monthly', 'quarterly', or 'yearly'. "
        "Returns total revenue, commission, and breakdown by revenue type."
    ),
)
async def get_revenue_breakdown(
    user_id: str,
    period: str = "monthly",
    db: AsyncSession = None,
) -> dict:
    """Return revenue breakdown for an advisor."""
    # Determine date cutoff based on period
    now = datetime.now(timezone.utc).date()
    if period == "yearly":
        cutoff = now - timedelta(days=365)
    elif period == "quarterly":
        cutoff = now - timedelta(days=90)
    else:  # monthly
        cutoff = now - timedelta(days=30)

    # Revenue records
    revenue_result = await db.execute(
        select(
            RevenueRecord.revenue_type,
            func.sum(RevenueRecord.amount).label("total"),
            func.count(RevenueRecord.id).label("count"),
        )
        .where(
            RevenueRecord.advisor_id == user_id,
            RevenueRecord.revenue_date >= cutoff,
        )
        .group_by(RevenueRecord.revenue_type)
    )
    revenue_rows = revenue_result.all()

    revenue_by_type = [
        {
            "type": row.revenue_type or "other",
            "total": row.total or 0,
            "count": row.count or 0,
        }
        for row in revenue_rows
    ]
    total_revenue = sum(r["total"] for r in revenue_by_type)

    # Commission records
    commission_result = await db.execute(
        select(
            func.sum(CommissionRecord.total_commission).label("total_commission"),
            func.sum(CommissionRecord.upfront_commission).label("upfront"),
            func.sum(CommissionRecord.trail_commission).label("trail"),
            func.count(CommissionRecord.id).label("count"),
        )
        .where(
            CommissionRecord.advisor_id == user_id,
            CommissionRecord.commission_date >= cutoff,
        )
    )
    comm_row = commission_result.one()

    return {
        "user_id": user_id,
        "period": period,
        "date_from": str(cutoff),
        "date_to": str(now),
        "total_revenue": total_revenue,
        "revenue_by_type": revenue_by_type,
        "commissions": {
            "total": comm_row.total_commission or 0,
            "upfront": comm_row.upfront or 0,
            "trail": comm_row.trail or 0,
            "transaction_count": comm_row.count or 0,
        },
        "grand_total": total_revenue + (comm_row.total_commission or 0),
    }
