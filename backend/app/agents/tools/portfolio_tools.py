"""Portfolio analysis tools for AI agents.

Provides tool functions for querying portfolio positions, calculating drift,
analyzing concentration risk, performance history, sector allocation,
tax harvesting opportunities, and market overview.
All functions use async SQLAlchemy sessions and return JSON-serializable dicts.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tools import tool
from app.models.client import Client, ClientAUM, ClientLifeGoal
from app.models.portfolio import (
    PortfolioAdminPortfolio,
    PortfolioAdminPosition,
    PortfolioAdminTransaction,
)


# ---------------------------------------------------------------------------
# get_client_portfolio
# ---------------------------------------------------------------------------


@tool(
    name="get_client_portfolio",
    description=(
        "Fetch a client's full portfolio including all positions, total "
        "market value, unrealized P&L, and asset-class breakdown."
    ),
)
async def get_client_portfolio(client_id: str, db: AsyncSession) -> dict:
    """Return portfolio positions and total value for a client."""
    # Get portfolios for this client
    portfolio_result = await db.execute(
        select(PortfolioAdminPortfolio)
        .where(
            PortfolioAdminPortfolio.client_id == client_id,
            PortfolioAdminPortfolio.status == "active",
        )
    )
    portfolios = portfolio_result.scalars().all()

    if not portfolios:
        return {"client_id": client_id, "portfolios": [], "total_value": 0}

    portfolio_data = []
    total_value = 0.0
    total_unrealized_pnl = 0.0

    for p in portfolios:
        positions_result = await db.execute(
            select(PortfolioAdminPosition)
            .where(PortfolioAdminPosition.portfolio_id == p.id)
            .order_by(PortfolioAdminPosition.market_value.desc().nullslast())
        )
        positions = positions_result.scalars().all()

        portfolio_value = sum(pos.market_value or 0 for pos in positions)
        portfolio_pnl = sum(pos.unrealized_pnl or 0 for pos in positions)
        total_value += portfolio_value
        total_unrealized_pnl += portfolio_pnl

        portfolio_data.append(
            {
                "portfolio_id": str(p.id),
                "portfolio_name": p.portfolio_name,
                "portfolio_type": p.portfolio_type,
                "benchmark": p.benchmark,
                "status": p.status,
                "total_value": portfolio_value,
                "unrealized_pnl": portfolio_pnl,
                "positions": [
                    {
                        "security_name": pos.security_name,
                        "security_id": pos.security_id,
                        "security_type": pos.security_type,
                        "exchange": pos.exchange,
                        "quantity": pos.quantity,
                        "average_cost": pos.average_cost,
                        "current_price": pos.current_price,
                        "market_value": pos.market_value,
                        "unrealized_pnl": pos.unrealized_pnl,
                        "weight": pos.weight,
                        "sector": pos.sector,
                    }
                    for pos in positions
                ],
            }
        )

    return {
        "client_id": client_id,
        "total_value": total_value,
        "total_unrealized_pnl": total_unrealized_pnl,
        "portfolio_count": len(portfolio_data),
        "portfolios": portfolio_data,
    }


# ---------------------------------------------------------------------------
# calculate_drift
# ---------------------------------------------------------------------------


@tool(
    name="calculate_drift",
    description=(
        "Calculate portfolio drift by comparing current allocation against "
        "target allocation. Returns drift per asset class and overall drift score."
    ),
)
async def calculate_drift(portfolio_id: str, db: AsyncSession) -> dict:
    """Compare current vs target allocation and return drift metrics."""
    # Get portfolio with targets
    portfolio_result = await db.execute(
        select(PortfolioAdminPortfolio)
        .where(PortfolioAdminPortfolio.id == portfolio_id)
    )
    portfolio = portfolio_result.scalar_one_or_none()
    if not portfolio:
        return {"error": f"Portfolio {portfolio_id} not found"}

    # Get positions grouped by security_type
    positions_result = await db.execute(
        select(PortfolioAdminPosition)
        .where(PortfolioAdminPosition.portfolio_id == portfolio_id)
    )
    positions = positions_result.scalars().all()

    total_value = sum(pos.market_value or 0 for pos in positions)
    if total_value == 0:
        return {"portfolio_id": portfolio_id, "drift": {}, "message": "Empty portfolio"}

    # Calculate current allocation by type
    allocation: dict[str, float] = {}
    for pos in positions:
        sec_type = (pos.security_type or "other").lower()
        allocation[sec_type] = allocation.get(sec_type, 0) + (pos.market_value or 0)

    current_pct = {k: (v / total_value) * 100 for k, v in allocation.items()}

    # Target allocation from portfolio
    target_pct = {
        "equity": portfolio.target_equity or 0,
        "debt": portfolio.target_debt or 0,
        "other": portfolio.target_other or 0,
    }

    # Calculate drift
    drift = {}
    all_keys = set(list(current_pct.keys()) + list(target_pct.keys()))
    total_drift = 0.0
    for key in all_keys:
        current = current_pct.get(key, 0)
        target = target_pct.get(key, 0)
        d = current - target
        drift[key] = {
            "current_pct": round(current, 2),
            "target_pct": round(target, 2),
            "drift_pct": round(d, 2),
        }
        total_drift += abs(d)

    return {
        "portfolio_id": portfolio_id,
        "portfolio_name": portfolio.portfolio_name,
        "total_value": total_value,
        "drift": drift,
        "total_drift_score": round(total_drift / 2, 2),  # Average absolute drift
        "needs_rebalance": total_drift > 10,  # Flag if drift exceeds 5% average
    }


# ---------------------------------------------------------------------------
# get_target_allocation
# ---------------------------------------------------------------------------


@tool(
    name="get_target_allocation",
    description=(
        "Fetch the target asset allocation for a portfolio (equity, debt, other percentages)."
    ),
)
async def get_target_allocation(portfolio_id: str, db: AsyncSession) -> dict:
    """Return the target allocation for a portfolio."""
    result = await db.execute(
        select(PortfolioAdminPortfolio)
        .where(PortfolioAdminPortfolio.id == portfolio_id)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        return {"error": f"Portfolio {portfolio_id} not found"}

    return {
        "portfolio_id": portfolio_id,
        "portfolio_name": portfolio.portfolio_name,
        "target_equity": portfolio.target_equity,
        "target_debt": portfolio.target_debt,
        "target_other": portfolio.target_other,
        "benchmark": portfolio.benchmark,
        "portfolio_type": portfolio.portfolio_type,
    }


# ---------------------------------------------------------------------------
# analyze_concentration
# ---------------------------------------------------------------------------


@tool(
    name="analyze_concentration",
    description=(
        "Analyze concentration risk in a portfolio. Returns top holdings "
        "by weight, sector concentration, and risk flags."
    ),
)
async def analyze_concentration(portfolio_id: str, db: AsyncSession) -> dict:
    """Analyze concentration risk for a portfolio."""
    positions_result = await db.execute(
        select(PortfolioAdminPosition)
        .where(PortfolioAdminPosition.portfolio_id == portfolio_id)
        .order_by(PortfolioAdminPosition.market_value.desc().nullslast())
    )
    positions = positions_result.scalars().all()

    if not positions:
        return {"portfolio_id": portfolio_id, "message": "No positions found"}

    total_value = sum(pos.market_value or 0 for pos in positions)
    if total_value == 0:
        return {"portfolio_id": portfolio_id, "message": "Portfolio has zero value"}

    # Top holdings by weight
    top_holdings = []
    for pos in positions[:10]:
        weight = ((pos.market_value or 0) / total_value) * 100
        top_holdings.append(
            {
                "security_name": pos.security_name,
                "security_type": pos.security_type,
                "market_value": pos.market_value,
                "weight_pct": round(weight, 2),
                "sector": pos.sector,
            }
        )

    # Sector concentration
    sector_map: dict[str, float] = {}
    for pos in positions:
        sector = pos.sector or "Unknown"
        sector_map[sector] = sector_map.get(sector, 0) + (pos.market_value or 0)

    sector_concentration = [
        {
            "sector": sector,
            "value": value,
            "weight_pct": round((value / total_value) * 100, 2),
        }
        for sector, value in sorted(sector_map.items(), key=lambda x: x[1], reverse=True)
    ]

    # Risk flags
    risk_flags = []
    if top_holdings and top_holdings[0]["weight_pct"] > 20:
        risk_flags.append(
            f"Single-stock concentration: {top_holdings[0]['security_name']} "
            f"at {top_holdings[0]['weight_pct']}%"
        )
    top3_weight = sum(h["weight_pct"] for h in top_holdings[:3])
    if top3_weight > 50:
        risk_flags.append(f"Top 3 holdings represent {round(top3_weight, 1)}% of portfolio")
    if sector_concentration and sector_concentration[0]["weight_pct"] > 40:
        risk_flags.append(
            f"Sector concentration: {sector_concentration[0]['sector']} "
            f"at {sector_concentration[0]['weight_pct']}%"
        )

    return {
        "portfolio_id": portfolio_id,
        "total_value": total_value,
        "total_positions": len(positions),
        "top_holdings": top_holdings,
        "sector_concentration": sector_concentration,
        "risk_flags": risk_flags,
    }


# ---------------------------------------------------------------------------
# get_performance_history
# ---------------------------------------------------------------------------


@tool(
    name="get_performance_history",
    description=(
        "Fetch performance history for a portfolio including recent "
        "transactions, realized gains, and time-weighted metrics."
    ),
)
async def get_performance_history(portfolio_id: str, db: AsyncSession) -> dict:
    """Return performance-related data for a portfolio."""
    # Get portfolio info
    portfolio_result = await db.execute(
        select(PortfolioAdminPortfolio)
        .where(PortfolioAdminPortfolio.id == portfolio_id)
    )
    portfolio = portfolio_result.scalar_one_or_none()
    if not portfolio:
        return {"error": f"Portfolio {portfolio_id} not found"}

    # Current positions summary
    positions_result = await db.execute(
        select(PortfolioAdminPosition)
        .where(PortfolioAdminPosition.portfolio_id == portfolio_id)
    )
    positions = positions_result.scalars().all()

    total_market_value = sum(pos.market_value or 0 for pos in positions)
    total_cost = sum(pos.quantity * pos.average_cost for pos in positions)
    total_unrealized = sum(pos.unrealized_pnl or 0 for pos in positions)

    # Recent transactions
    txn_result = await db.execute(
        select(PortfolioAdminTransaction)
        .where(PortfolioAdminTransaction.portfolio_id == portfolio_id)
        .order_by(PortfolioAdminTransaction.trade_date.desc())
        .limit(20)
    )
    transactions = txn_result.scalars().all()

    # Realized gains from sell transactions
    sell_txns = [t for t in transactions if t.transaction_type == "sell"]
    realized_gains = sum(t.total_amount or 0 for t in sell_txns)

    return {
        "portfolio_id": portfolio_id,
        "portfolio_name": portfolio.portfolio_name,
        "inception_date": str(portfolio.inception_date) if portfolio.inception_date else None,
        "benchmark": portfolio.benchmark,
        "current_value": total_market_value,
        "total_cost_basis": total_cost,
        "total_unrealized_pnl": total_unrealized,
        "unrealized_return_pct": round(
            (total_unrealized / total_cost) * 100, 2
        ) if total_cost > 0 else 0,
        "realized_gains_recent": realized_gains,
        "recent_transactions": [
            {
                "security_name": t.security_name,
                "transaction_type": t.transaction_type,
                "quantity": t.quantity,
                "price": t.price,
                "total_amount": t.total_amount,
                "trade_date": str(t.trade_date),
                "status": t.status,
            }
            for t in transactions[:10]
        ],
    }


# ---------------------------------------------------------------------------
# get_sector_allocation
# ---------------------------------------------------------------------------


@tool(
    name="get_sector_allocation",
    description=(
        "Get the sector-wise allocation breakdown for a portfolio. "
        "Returns sector names, values, and percentage weights."
    ),
)
async def get_sector_allocation(portfolio_id: str, db: AsyncSession) -> dict:
    """Return sector allocation breakdown for a portfolio."""
    positions_result = await db.execute(
        select(PortfolioAdminPosition)
        .where(PortfolioAdminPosition.portfolio_id == portfolio_id)
    )
    positions = positions_result.scalars().all()

    total_value = sum(pos.market_value or 0 for pos in positions)
    if total_value == 0:
        return {"portfolio_id": portfolio_id, "sectors": [], "message": "Empty portfolio"}

    sector_map: dict[str, float] = {}
    for pos in positions:
        sector = pos.sector or "Unknown"
        sector_map[sector] = sector_map.get(sector, 0) + (pos.market_value or 0)

    sectors = [
        {
            "sector": sector,
            "value": value,
            "weight_pct": round((value / total_value) * 100, 2),
        }
        for sector, value in sorted(sector_map.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "portfolio_id": portfolio_id,
        "total_value": total_value,
        "sector_count": len(sectors),
        "sectors": sectors,
    }


# ---------------------------------------------------------------------------
# get_market_overview
# ---------------------------------------------------------------------------


@tool(
    name="get_market_overview",
    description=(
        "Get a high-level market overview for Indian markets including "
        "major indices (NIFTY 50, SENSEX), market breadth, and key metrics. "
        "This is a placeholder that returns a structured template."
    ),
)
async def get_market_overview(db: AsyncSession) -> dict:
    """Return a market overview structure for Indian markets (placeholder data)."""
    # This is a placeholder - in production, this would fetch live market data
    # from an external API (e.g., NSE/BSE data feeds).
    return {
        "timestamp": str(datetime.now(timezone.utc)),
        "indices": {
            "nifty_50": {
                "name": "NIFTY 50",
                "exchange": "NSE",
                "value": None,
                "change_pct": None,
                "status": "data_feed_required",
            },
            "sensex": {
                "name": "BSE SENSEX",
                "exchange": "BSE",
                "value": None,
                "change_pct": None,
                "status": "data_feed_required",
            },
            "nifty_bank": {
                "name": "NIFTY Bank",
                "exchange": "NSE",
                "value": None,
                "change_pct": None,
                "status": "data_feed_required",
            },
            "nifty_midcap": {
                "name": "NIFTY Midcap 100",
                "exchange": "NSE",
                "value": None,
                "change_pct": None,
                "status": "data_feed_required",
            },
        },
        "market_breadth": {
            "advances": None,
            "declines": None,
            "unchanged": None,
            "status": "data_feed_required",
        },
        "fii_dii_data": {
            "fii_net_buy": None,
            "dii_net_buy": None,
            "status": "data_feed_required",
        },
        "note": (
            "Live market data integration pending. Connect NSE/BSE data feed "
            "for real-time values."
        ),
    }


# ---------------------------------------------------------------------------
# get_unrealized_gains_losses
# ---------------------------------------------------------------------------


@tool(
    name="get_unrealized_gains_losses",
    description=(
        "Fetch unrealized gains and losses for a client across all portfolios. "
        "Categorizes into LTCG and STCG based on holding period (1 year for equity)."
    ),
)
async def get_unrealized_gains_losses(client_id: str, db: AsyncSession) -> dict:
    """Return unrealized gains/losses with LTCG/STCG categorization."""
    # Get all portfolios for the client
    portfolios_result = await db.execute(
        select(PortfolioAdminPortfolio)
        .where(
            PortfolioAdminPortfolio.client_id == client_id,
            PortfolioAdminPortfolio.status == "active",
        )
    )
    portfolios = portfolios_result.scalars().all()

    total_gains = 0.0
    total_losses = 0.0
    positions_detail = []

    one_year_ago = datetime.now(timezone.utc) - timedelta(days=365)

    for portfolio in portfolios:
        positions_result = await db.execute(
            select(PortfolioAdminPosition)
            .where(PortfolioAdminPosition.portfolio_id == portfolio.id)
        )
        positions = positions_result.scalars().all()

        for pos in positions:
            pnl = pos.unrealized_pnl or 0
            cost_basis = pos.quantity * pos.average_cost
            market_val = pos.market_value or 0

            # Determine if LTCG or STCG based on last price update as proxy
            # In production, use actual purchase date
            is_long_term = (
                pos.last_price_update is not None
                and pos.created_at < one_year_ago
            )

            if pnl >= 0:
                total_gains += pnl
            else:
                total_losses += abs(pnl)

            positions_detail.append(
                {
                    "security_name": pos.security_name,
                    "security_type": pos.security_type,
                    "quantity": pos.quantity,
                    "average_cost": pos.average_cost,
                    "current_price": pos.current_price,
                    "cost_basis": cost_basis,
                    "market_value": market_val,
                    "unrealized_pnl": pnl,
                    "pnl_pct": round((pnl / cost_basis) * 100, 2) if cost_basis > 0 else 0,
                    "holding_type": "LTCG" if is_long_term else "STCG",
                    "portfolio_name": portfolio.portfolio_name,
                }
            )

    # Sort by P&L (biggest losses first for harvesting view)
    positions_detail.sort(key=lambda x: x["unrealized_pnl"])

    return {
        "client_id": client_id,
        "total_unrealized_gains": total_gains,
        "total_unrealized_losses": total_losses,
        "net_unrealized": total_gains - total_losses,
        "position_count": len(positions_detail),
        "positions": positions_detail,
    }


# ---------------------------------------------------------------------------
# find_harvesting_opportunities
# ---------------------------------------------------------------------------


@tool(
    name="find_harvesting_opportunities",
    description=(
        "Identify tax-loss harvesting opportunities for a client. "
        "Finds positions with unrealized losses that can be sold to offset gains."
    ),
)
async def find_harvesting_opportunities(client_id: str, db: AsyncSession) -> list[dict]:
    """Find positions with unrealized losses suitable for tax-loss harvesting."""
    gains_data = await get_unrealized_gains_losses(client_id=client_id, db=db)

    if "error" in gains_data:
        return [gains_data]

    # Filter positions with losses
    loss_positions = [
        pos for pos in gains_data.get("positions", [])
        if pos["unrealized_pnl"] < 0
    ]

    opportunities = []
    for pos in loss_positions:
        tax_saving_estimate = abs(pos["unrealized_pnl"]) * (
            0.10 if pos["holding_type"] == "LTCG" else 0.15
        )  # 10% LTCG / 15% STCG Indian tax rates

        opportunities.append(
            {
                "security_name": pos["security_name"],
                "security_type": pos["security_type"],
                "quantity": pos["quantity"],
                "current_price": pos["current_price"],
                "unrealized_loss": pos["unrealized_pnl"],
                "loss_pct": pos["pnl_pct"],
                "holding_type": pos["holding_type"],
                "estimated_tax_saving": round(tax_saving_estimate, 2),
                "portfolio_name": pos["portfolio_name"],
                "recommendation": (
                    "Consider selling to harvest loss and reinvest after 30-day "
                    "wash-sale equivalent period."
                ),
            }
        )

    return opportunities


# ---------------------------------------------------------------------------
# estimate_tax_impact
# ---------------------------------------------------------------------------


@tool(
    name="estimate_tax_impact",
    description=(
        "Estimate the tax impact for a client's portfolio including LTCG, "
        "STCG, and potential Section 80C benefits. Uses Indian tax rates."
    ),
)
async def estimate_tax_impact(client_id: str, db: AsyncSession) -> dict:
    """Estimate tax impact on a client's unrealized gains/losses."""
    gains_data = await get_unrealized_gains_losses(client_id=client_id, db=db)

    if "error" in gains_data:
        return gains_data

    ltcg_gains = 0.0
    stcg_gains = 0.0
    ltcg_losses = 0.0
    stcg_losses = 0.0

    for pos in gains_data.get("positions", []):
        pnl = pos["unrealized_pnl"]
        if pos["holding_type"] == "LTCG":
            if pnl >= 0:
                ltcg_gains += pnl
            else:
                ltcg_losses += abs(pnl)
        else:
            if pnl >= 0:
                stcg_gains += pnl
            else:
                stcg_losses += abs(pnl)

    # Indian tax computation
    # LTCG: 10% above 1 lakh exemption (equity)
    ltcg_taxable = max(0, ltcg_gains - ltcg_losses - 100000)  # 1 lakh exemption
    ltcg_tax = ltcg_taxable * 0.10

    # STCG: 15% flat (equity, Section 111A)
    stcg_taxable = max(0, stcg_gains - stcg_losses)
    stcg_tax = stcg_taxable * 0.15

    return {
        "client_id": client_id,
        "ltcg": {
            "gains": ltcg_gains,
            "losses": ltcg_losses,
            "net": ltcg_gains - ltcg_losses,
            "exemption": 100000,
            "taxable": ltcg_taxable,
            "tax_rate": "10%",
            "estimated_tax": round(ltcg_tax, 2),
        },
        "stcg": {
            "gains": stcg_gains,
            "losses": stcg_losses,
            "net": stcg_gains - stcg_losses,
            "taxable": stcg_taxable,
            "tax_rate": "15%",
            "estimated_tax": round(stcg_tax, 2),
        },
        "total_estimated_tax": round(ltcg_tax + stcg_tax, 2),
        "harvesting_potential": round(
            (ltcg_losses * 0.10) + (stcg_losses * 0.15), 2
        ),
        "note": (
            "Estimates based on Indian equity taxation: LTCG 10% above 1L exemption, "
            "STCG 15% under Section 111A. Actual tax may vary based on total income "
            "and applicable surcharge/cess."
        ),
    }


# ---------------------------------------------------------------------------
# generate_talking_points
# ---------------------------------------------------------------------------


@tool(
    name="generate_talking_points",
    description=(
        "Generate meeting talking points for a client based on portfolio "
        "performance, recent activity, goals progress, and pending items."
    ),
)
async def generate_talking_points(client_id: str, db: AsyncSession) -> dict:
    """Generate structured talking points for a client meeting."""
    # Gather client data
    client_result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        return {"error": f"Client {client_id} not found"}

    # AUM
    aum_result = await db.execute(
        select(ClientAUM)
        .where(ClientAUM.client_id == client_id)
        .order_by(ClientAUM.created_at.desc())
        .limit(1)
    )
    aum = aum_result.scalar_one_or_none()

    # Goals
    goals_result = await db.execute(
        select(ClientLifeGoal)
        .where(ClientLifeGoal.client_id == client_id, ClientLifeGoal.status == "active")
    )
    goals = goals_result.scalars().all()

    # Portfolio overview
    portfolio_data = await get_client_portfolio(client_id=client_id, db=db)

    # KYC status
    kyc_points = []
    if client.kyc_expiry_date:
        from datetime import date as dt_date
        today = dt_date.today()
        days_to_expiry = (client.kyc_expiry_date - today).days
        if days_to_expiry <= 90:
            kyc_points.append(
                f"KYC expires in {days_to_expiry} days ({client.kyc_expiry_date}). "
                "Initiate renewal process."
            )

    # Build talking points
    talking_points = {
        "client_id": str(client.id),
        "client_name": client.client_name,
        "greeting": f"Meeting with {client.client_name}",
        "portfolio_overview": {
            "total_value": portfolio_data.get("total_value", 0),
            "unrealized_pnl": portfolio_data.get("total_unrealized_pnl", 0),
            "portfolio_count": portfolio_data.get("portfolio_count", 0),
        },
        "aum_summary": {
            "current_aum": aum.current_aum if aum else 0,
            "equity_aum": aum.equity_aum if aum else 0,
            "debt_aum": aum.debt_aum if aum else 0,
        },
        "goals_review": [
            {
                "name": g.name,
                "target": g.target_amount,
                "current": g.current_amount,
                "progress_pct": round(
                    (g.current_amount / g.target_amount) * 100, 1
                ) if g.target_amount > 0 else 0,
                "target_date": str(g.target_date) if g.target_date else None,
            }
            for g in goals
        ],
        "compliance_items": kyc_points,
        "suggested_topics": [
            "Portfolio performance review and rebalancing needs",
            "Goal progress assessment and SIP adjustments",
            "Market outlook and allocation strategy",
            "Tax planning opportunities for current financial year",
        ],
    }

    return talking_points
