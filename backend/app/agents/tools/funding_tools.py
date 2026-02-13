"""Funding and cash flow analysis tools for AI agents.

Provides tool functions for analyzing cash flow forecasts, settlement risk,
withdrawal patterns, and funding alerts.
All functions use async SQLAlchemy sessions and return JSON-serializable dicts.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tools import tool
from app.models.client import Client
from app.models.funding import (
    CashBalance,
    FundingAlert,
    FundingRequest,
    FundingTransaction,
    PayoutRequest,
)


# ---------------------------------------------------------------------------
# get_cash_flow_forecast
# ---------------------------------------------------------------------------


@tool(
    name="get_cash_flow_forecast",
    description=(
        "Generate a cash flow forecast for an advisor's clients. Summarizes "
        "pending funding requests, payout requests, cash balances, and "
        "projected net flow over the next 30 days."
    ),
)
async def get_cash_flow_forecast(advisor_id: str, db: AsyncSession) -> dict:
    """Return cash flow forecast for an advisor's client book."""
    # Aggregate cash balances
    balance_result = await db.execute(
        select(
            func.sum(CashBalance.available_cash).label("total_available"),
            func.sum(CashBalance.pending_cash).label("total_pending"),
            func.count(CashBalance.id).label("account_count"),
        )
        .where(CashBalance.advisor_id == advisor_id)
    )
    balance_row = balance_result.one()

    # Pending funding requests (inflows)
    funding_result = await db.execute(
        select(
            func.sum(FundingRequest.amount).label("total_inflow"),
            func.count(FundingRequest.id).label("request_count"),
        )
        .where(
            FundingRequest.advisor_id == advisor_id,
            FundingRequest.workflow_stage.in_(["initiated", "processing", "approved"]),
        )
    )
    funding_row = funding_result.one()

    # Pending payout requests (outflows)
    payout_result = await db.execute(
        select(
            func.sum(PayoutRequest.amount).label("total_outflow"),
            func.count(PayoutRequest.id).label("request_count"),
        )
        .where(
            PayoutRequest.advisor_id == advisor_id,
            PayoutRequest.status.in_(["pending", "approved", "processing"]),
        )
    )
    payout_row = payout_result.one()

    total_available = balance_row.total_available or 0
    total_pending = balance_row.total_pending or 0
    pending_inflow = funding_row.total_inflow or 0
    pending_outflow = payout_row.total_outflow or 0

    return {
        "advisor_id": advisor_id,
        "forecast_date": str(datetime.now(timezone.utc).date()),
        "current_balances": {
            "total_available_cash": total_available,
            "total_pending_cash": total_pending,
            "total_cash": total_available + total_pending,
            "account_count": balance_row.account_count or 0,
        },
        "pending_flows": {
            "pending_inflow": pending_inflow,
            "pending_inflow_count": funding_row.request_count or 0,
            "pending_outflow": pending_outflow,
            "pending_outflow_count": payout_row.request_count or 0,
            "net_pending_flow": pending_inflow - pending_outflow,
        },
        "projected_balance": total_available + total_pending + pending_inflow - pending_outflow,
        "risk_flag": (
            "low_cash" if (total_available + pending_inflow - pending_outflow) < 0
            else "healthy"
        ),
    }


# ---------------------------------------------------------------------------
# analyze_settlement_risk
# ---------------------------------------------------------------------------


@tool(
    name="analyze_settlement_risk",
    description=(
        "Analyze settlement risk for an advisor's pending funding transactions. "
        "Identifies overdue settlements, delayed processing, and at-risk requests."
    ),
)
async def analyze_settlement_risk(advisor_id: str, db: AsyncSession) -> dict:
    """Return settlement risk analysis for an advisor's funding operations."""
    today = datetime.now(timezone.utc).date()

    # Overdue settlements (settlement_date in the past, still not completed)
    overdue_result = await db.execute(
        select(FundingRequest)
        .where(
            FundingRequest.advisor_id == advisor_id,
            FundingRequest.settlement_date != None,  # noqa: E711
            FundingRequest.settlement_date < today,
            FundingRequest.workflow_stage.notin_(["completed", "cancelled", "rejected"]),
        )
        .order_by(FundingRequest.settlement_date.asc())
    )
    overdue_requests = overdue_result.scalars().all()

    # Stuck in processing (stage updated more than 3 days ago)
    three_days_ago = datetime.now(timezone.utc) - timedelta(days=3)
    stuck_result = await db.execute(
        select(FundingRequest)
        .where(
            FundingRequest.advisor_id == advisor_id,
            FundingRequest.workflow_stage == "processing",
            FundingRequest.stage_updated_at != None,  # noqa: E711
            FundingRequest.stage_updated_at < three_days_ago,
        )
    )
    stuck_requests = stuck_result.scalars().all()

    # Pending transactions with no reference
    pending_txn_result = await db.execute(
        select(FundingTransaction)
        .where(
            FundingTransaction.advisor_id == advisor_id,
            FundingTransaction.status == "pending",
            FundingTransaction.reference_number == None,  # noqa: E711
        )
    )
    unreferenced_txns = pending_txn_result.scalars().all()

    return {
        "advisor_id": advisor_id,
        "analysis_date": str(today),
        "overdue_settlements": {
            "count": len(overdue_requests),
            "total_amount": sum(r.amount for r in overdue_requests),
            "details": [
                {
                    "id": str(r.id),
                    "amount": r.amount,
                    "funding_type": r.funding_type,
                    "settlement_date": str(r.settlement_date),
                    "days_overdue": (today - r.settlement_date).days,
                    "workflow_stage": r.workflow_stage,
                }
                for r in overdue_requests
            ],
        },
        "stuck_requests": {
            "count": len(stuck_requests),
            "total_amount": sum(r.amount for r in stuck_requests),
            "details": [
                {
                    "id": str(r.id),
                    "amount": r.amount,
                    "funding_type": r.funding_type,
                    "stage_updated_at": str(r.stage_updated_at),
                }
                for r in stuck_requests
            ],
        },
        "unreferenced_transactions": {
            "count": len(unreferenced_txns),
            "total_amount": sum(t.amount for t in unreferenced_txns),
        },
        "overall_risk": (
            "high" if len(overdue_requests) > 5 or sum(r.amount for r in overdue_requests) > 1000000
            else "medium" if len(overdue_requests) > 0
            else "low"
        ),
    }


# ---------------------------------------------------------------------------
# get_withdrawal_patterns
# ---------------------------------------------------------------------------


@tool(
    name="get_withdrawal_patterns",
    description=(
        "Analyze withdrawal patterns for a specific client. Shows payout "
        "history, frequency, average amounts, and trend indicators."
    ),
)
async def get_withdrawal_patterns(client_id: str, db: AsyncSession) -> dict:
    """Return withdrawal pattern analysis for a client."""
    # Get all payout requests for this client
    result = await db.execute(
        select(PayoutRequest)
        .where(PayoutRequest.client_id == client_id)
        .order_by(PayoutRequest.created_at.desc())
    )
    payouts = result.scalars().all()

    if not payouts:
        return {
            "client_id": client_id,
            "total_payouts": 0,
            "message": "No withdrawal history found",
        }

    total_amount = sum(p.amount for p in payouts)
    avg_amount = total_amount / len(payouts) if payouts else 0

    # Group by month
    monthly: dict[str, dict] = {}
    for p in payouts:
        if p.requested_date:
            month_key = p.requested_date.strftime("%Y-%m")
        else:
            month_key = p.created_at.strftime("%Y-%m")
        if month_key not in monthly:
            monthly[month_key] = {"count": 0, "total": 0}
        monthly[month_key]["count"] += 1
        monthly[month_key]["total"] += p.amount

    # Recent 6 months trend
    sorted_months = sorted(monthly.keys(), reverse=True)[:6]
    trend = [
        {
            "month": m,
            "count": monthly[m]["count"],
            "total": monthly[m]["total"],
        }
        for m in sorted_months
    ]

    # Recent payouts (last 10)
    recent = [
        {
            "id": str(p.id),
            "amount": p.amount,
            "payout_type": p.payout_type,
            "status": p.status,
            "requested_date": str(p.requested_date) if p.requested_date else None,
            "created_at": str(p.created_at),
        }
        for p in payouts[:10]
    ]

    # Determine withdrawal trend
    if len(sorted_months) >= 3:
        recent_avg = sum(monthly[m]["total"] for m in sorted_months[:3]) / 3
        older_avg = (
            sum(monthly[m]["total"] for m in sorted_months[3:6]) / max(len(sorted_months[3:6]), 1)
            if len(sorted_months) > 3
            else recent_avg
        )
        trend_direction = (
            "increasing" if recent_avg > older_avg * 1.2
            else "decreasing" if recent_avg < older_avg * 0.8
            else "stable"
        )
    else:
        trend_direction = "insufficient_data"

    return {
        "client_id": client_id,
        "total_payouts": len(payouts),
        "total_withdrawn": total_amount,
        "average_withdrawal": round(avg_amount, 2),
        "trend_direction": trend_direction,
        "monthly_trend": trend,
        "recent_withdrawals": recent,
    }


# ---------------------------------------------------------------------------
# get_funding_alerts
# ---------------------------------------------------------------------------


@tool(
    name="get_funding_alerts",
    description=(
        "Fetch unresolved funding alerts for an advisor including settlement "
        "delays, compliance issues, and operational warnings."
    ),
)
async def get_funding_alerts(advisor_id: str, db: AsyncSession) -> list[dict]:
    """Return unresolved funding alerts for an advisor."""
    result = await db.execute(
        select(FundingAlert)
        .where(
            FundingAlert.advisor_id == advisor_id,
            FundingAlert.is_resolved == False,  # noqa: E712
        )
        .order_by(
            FundingAlert.severity.desc(),
            FundingAlert.created_at.desc(),
        )
    )
    alerts = result.scalars().all()

    return [
        {
            "id": str(a.id),
            "alert_type": a.alert_type,
            "title": a.title,
            "message": a.message,
            "severity": a.severity,
            "client_id": str(a.client_id) if a.client_id else None,
            "funding_request_id": str(a.funding_request_id) if a.funding_request_id else None,
            "created_at": str(a.created_at),
        }
        for a in alerts
    ]
