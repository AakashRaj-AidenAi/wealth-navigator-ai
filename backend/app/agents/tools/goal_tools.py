"""Goal management tools for AI agents.

Provides tool functions for managing client financial goals -- creation,
progress tracking, timeline projections, and strategy suggestions.
All functions use async SQLAlchemy sessions and return JSON-serializable dicts.
"""

from __future__ import annotations

import math
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tools import tool
from app.models.client import Client, ClientAUM, ClientLifeGoal


# ---------------------------------------------------------------------------
# get_goals
# ---------------------------------------------------------------------------


@tool(
    name="get_goals",
    description=(
        "List all financial goals for a client including name, type, "
        "target amount, current progress, target date, SIP, and status."
    ),
)
async def get_goals(
    client_id: str,
    db: AsyncSession = None,
) -> list[dict]:
    """Return all life goals for a client."""
    result = await db.execute(
        select(ClientLifeGoal)
        .where(ClientLifeGoal.client_id == client_id)
        .order_by(ClientLifeGoal.target_date.asc().nullslast())
    )
    goals = result.scalars().all()

    return [
        {
            "goal_id": str(g.id),
            "name": g.name,
            "goal_type": g.goal_type,
            "target_amount": g.target_amount,
            "current_amount": g.current_amount,
            "progress_pct": round(
                (g.current_amount / g.target_amount) * 100, 1
            ) if g.target_amount > 0 else 0,
            "target_date": str(g.target_date) if g.target_date else None,
            "monthly_sip": g.monthly_sip,
            "priority": g.priority,
            "status": g.status,
            "notes": g.notes,
        }
        for g in goals
    ]


# ---------------------------------------------------------------------------
# create_goal
# ---------------------------------------------------------------------------


@tool(
    name="create_goal",
    description=(
        "Create a new financial goal for a client. Requires name, "
        "target_amount, and target_date. Optional type (retirement, "
        "education, home, emergency, custom)."
    ),
)
async def create_goal(
    client_id: str,
    name: str,
    target_amount: float,
    target_date: str,
    type: str = "retirement",
    db: AsyncSession = None,
) -> dict:
    """Create a new life goal for a client."""
    # Verify client exists
    client_result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        return {"error": f"Client {client_id} not found"}

    parsed_date = None
    if target_date:
        try:
            parsed_date = date.fromisoformat(target_date)
        except ValueError:
            return {"error": f"Invalid date format: {target_date}. Use YYYY-MM-DD."}

    import uuid

    new_goal = ClientLifeGoal(
        id=uuid.uuid4(),
        client_id=client_id,
        advisor_id=client.advisor_id,
        name=name,
        goal_type=type,
        target_amount=target_amount,
        current_amount=0,
        target_date=parsed_date,
        monthly_sip=0,
        priority="medium",
        status="active",
    )
    db.add(new_goal)
    await db.flush()

    return {
        "goal_id": str(new_goal.id),
        "name": name,
        "goal_type": type,
        "target_amount": target_amount,
        "target_date": str(parsed_date) if parsed_date else None,
        "status": "active",
        "message": "Goal created successfully.",
    }


# ---------------------------------------------------------------------------
# update_goal_progress
# ---------------------------------------------------------------------------


@tool(
    name="update_goal_progress",
    description=(
        "Update the current progress amount for a financial goal. "
        "Returns the updated goal with new progress percentage."
    ),
)
async def update_goal_progress(
    goal_id: str,
    current_amount: float,
    db: AsyncSession = None,
) -> dict:
    """Update the current_amount for a goal."""
    result = await db.execute(
        select(ClientLifeGoal).where(ClientLifeGoal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        return {"error": f"Goal {goal_id} not found"}

    goal.current_amount = current_amount
    await db.flush()

    progress = round(
        (current_amount / goal.target_amount) * 100, 1
    ) if goal.target_amount > 0 else 0

    return {
        "goal_id": str(goal.id),
        "name": goal.name,
        "target_amount": goal.target_amount,
        "current_amount": current_amount,
        "progress_pct": progress,
        "remaining": goal.target_amount - current_amount,
        "message": "Goal progress updated.",
    }


# ---------------------------------------------------------------------------
# project_goal_timeline
# ---------------------------------------------------------------------------


@tool(
    name="project_goal_timeline",
    description=(
        "Project when a financial goal will be met based on current SIP, "
        "amount, and assumed return rate. Returns projected completion date "
        "and monthly SIP needed."
    ),
)
async def project_goal_timeline(
    goal_id: str,
    db: AsyncSession = None,
) -> dict:
    """Project the timeline for achieving a goal."""
    result = await db.execute(
        select(ClientLifeGoal).where(ClientLifeGoal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        return {"error": f"Goal {goal_id} not found"}

    remaining = goal.target_amount - goal.current_amount
    if remaining <= 0:
        return {
            "goal_id": str(goal.id),
            "name": goal.name,
            "status": "achieved",
            "message": "Goal has already been achieved!",
        }

    # Assume 12% annual return for equity-heavy, 8% for balanced
    assumed_annual_return = 0.12
    monthly_return = assumed_annual_return / 12

    # If SIP is active, project months to goal
    if goal.monthly_sip and goal.monthly_sip > 0:
        # Future value of annuity formula: FV = PMT * [((1+r)^n - 1) / r]
        # Plus future value of current amount: PV * (1+r)^n
        # We need to solve for n, which requires numerical approach
        months = 0
        projected = goal.current_amount
        while projected < goal.target_amount and months < 600:  # Max 50 years
            projected = projected * (1 + monthly_return) + goal.monthly_sip
            months += 1

        projected_date = None
        if goal.target_date:
            from datetime import timedelta
            projected_date = str(date.today() + timedelta(days=months * 30))

        on_track = (
            goal.target_date is not None
            and date.today() + timedelta(days=months * 30) <= goal.target_date
        ) if goal.target_date else None

        return {
            "goal_id": str(goal.id),
            "name": goal.name,
            "current_amount": goal.current_amount,
            "target_amount": goal.target_amount,
            "monthly_sip": goal.monthly_sip,
            "projected_months": months,
            "projected_completion_date": projected_date,
            "target_date": str(goal.target_date) if goal.target_date else None,
            "on_track": on_track,
            "assumed_annual_return": f"{assumed_annual_return * 100}%",
        }

    # If no SIP, calculate required monthly SIP
    if goal.target_date:
        months_remaining = max(
            1,
            (goal.target_date.year - date.today().year) * 12
            + (goal.target_date.month - date.today().month),
        )
        # PMT = (FV - PV*(1+r)^n) * r / ((1+r)^n - 1)
        fv_pv = goal.current_amount * ((1 + monthly_return) ** months_remaining)
        gap = goal.target_amount - fv_pv
        if gap <= 0:
            required_sip = 0
        else:
            factor = ((1 + monthly_return) ** months_remaining - 1) / monthly_return
            required_sip = gap / factor if factor > 0 else gap / months_remaining

        return {
            "goal_id": str(goal.id),
            "name": goal.name,
            "current_amount": goal.current_amount,
            "target_amount": goal.target_amount,
            "months_remaining": months_remaining,
            "target_date": str(goal.target_date),
            "required_monthly_sip": round(required_sip, 2),
            "assumed_annual_return": f"{assumed_annual_return * 100}%",
            "message": "No active SIP. Required SIP calculated to meet target date.",
        }

    return {
        "goal_id": str(goal.id),
        "name": goal.name,
        "current_amount": goal.current_amount,
        "target_amount": goal.target_amount,
        "remaining": remaining,
        "message": "No SIP or target date set. Set a SIP or target date for projection.",
    }


# ---------------------------------------------------------------------------
# suggest_goal_strategy
# ---------------------------------------------------------------------------


@tool(
    name="suggest_goal_strategy",
    description=(
        "Suggest an investment strategy for achieving a financial goal "
        "based on the goal type, timeline, risk profile, and current progress."
    ),
)
async def suggest_goal_strategy(
    goal_id: str,
    db: AsyncSession = None,
) -> dict:
    """Suggest an investment strategy for a goal."""
    result = await db.execute(
        select(ClientLifeGoal).where(ClientLifeGoal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        return {"error": f"Goal {goal_id} not found"}

    # Get client risk profile
    client_result = await db.execute(
        select(Client).where(Client.id == goal.client_id)
    )
    client = client_result.scalar_one_or_none()
    risk_profile = client.risk_profile if client else "moderate"

    # Calculate years to goal
    years_to_goal = None
    if goal.target_date:
        days = (goal.target_date - date.today()).days
        years_to_goal = max(0, days / 365.25)

    # Strategy based on goal type and timeline
    strategies = {
        "retirement": {
            "long": {
                "allocation": "70% Equity (Large+Mid Cap), 20% Debt, 10% Gold/REITs",
                "products": ["NIFTY 50 Index Fund", "Flexi Cap Fund", "NPS Tier 1", "PPF"],
                "sip_approach": "Aggressive SIP with annual step-up of 10%",
            },
            "medium": {
                "allocation": "50% Equity (Large Cap), 40% Debt, 10% Gold",
                "products": ["Large Cap Fund", "Corporate Bond Fund", "NPS", "Sovereign Gold Bond"],
                "sip_approach": "Balanced SIP with annual step-up of 7%",
            },
            "short": {
                "allocation": "30% Equity (Large Cap), 60% Debt, 10% Liquid",
                "products": ["Large Cap Fund", "Short Duration Fund", "FD", "Liquid Fund"],
                "sip_approach": "Conservative SIP with systematic transfer",
            },
        },
        "education": {
            "long": {
                "allocation": "65% Equity, 25% Debt, 10% Gold",
                "products": ["Children's Fund", "Flexi Cap Fund", "SSY (if daughter)", "PPF"],
                "sip_approach": "Aggressive SIP with step-up aligned to fee inflation (8-10%)",
            },
            "medium": {
                "allocation": "45% Equity, 45% Debt, 10% Gold",
                "products": ["Balanced Advantage Fund", "Medium Duration Fund", "RD"],
                "sip_approach": "Balanced SIP moving to debt as target date approaches",
            },
            "short": {
                "allocation": "20% Equity, 70% Debt, 10% Liquid",
                "products": ["Ultra Short Duration Fund", "FD", "Liquid Fund"],
                "sip_approach": "Capital preservation focus",
            },
        },
    }

    # Determine timeline bucket
    if years_to_goal is not None:
        if years_to_goal > 10:
            timeline = "long"
        elif years_to_goal > 3:
            timeline = "medium"
        else:
            timeline = "short"
    else:
        timeline = "medium"

    goal_type = goal.goal_type or "retirement"
    strategy_set = strategies.get(goal_type, strategies["retirement"])
    strategy = strategy_set.get(timeline, strategy_set["medium"])

    progress_pct = round(
        (goal.current_amount / goal.target_amount) * 100, 1
    ) if goal.target_amount > 0 else 0

    return {
        "goal_id": str(goal.id),
        "name": goal.name,
        "goal_type": goal_type,
        "target_amount": goal.target_amount,
        "current_amount": goal.current_amount,
        "progress_pct": progress_pct,
        "years_to_goal": round(years_to_goal, 1) if years_to_goal is not None else None,
        "timeline_category": timeline,
        "client_risk_profile": risk_profile,
        "suggested_allocation": strategy["allocation"],
        "recommended_products": strategy["products"],
        "sip_approach": strategy["sip_approach"],
        "notes": (
            f"Strategy tailored for {goal_type} goal with {timeline}-term horizon. "
            f"Adjust based on client's risk appetite ({risk_profile}) and tax situation."
        ),
    }
