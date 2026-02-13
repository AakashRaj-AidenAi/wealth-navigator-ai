"""Task management tools for AI agents.

Provides tool functions for querying, creating, and updating advisor tasks.
Since there is no dedicated Task ORM model, these tools use the
ClientReminder model as a task proxy and supplement with stub logic
where a full task table would be needed.

All functions use async SQLAlchemy sessions and return JSON-serializable dicts.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tools import tool
from app.models.client import ClientReminder


# ---------------------------------------------------------------------------
# get_tasks
# ---------------------------------------------------------------------------


@tool(
    name="get_tasks",
    description=(
        "Query tasks for an advisor. Optionally filter by status "
        "(pending, completed) or client_id. Returns a list of tasks "
        "with title, description, due date, and priority."
    ),
)
async def get_tasks(
    user_id: str,
    status: str = "",
    client_id: str = "",
    db: AsyncSession = None,
) -> list[dict]:
    """Query tasks (backed by client_reminders) for an advisor."""
    query = select(ClientReminder).where(ClientReminder.advisor_id == user_id)

    if status:
        if status == "completed":
            query = query.where(ClientReminder.is_completed == True)  # noqa: E712
        elif status == "pending":
            query = query.where(ClientReminder.is_completed == False)  # noqa: E712

    if client_id:
        query = query.where(ClientReminder.client_id == client_id)

    query = query.order_by(ClientReminder.reminder_date.asc()).limit(50)

    result = await db.execute(query)
    reminders = result.scalars().all()

    return [
        {
            "task_id": str(r.id),
            "title": r.title,
            "description": r.description,
            "client_id": str(r.client_id),
            "due_date": str(r.reminder_date) if r.reminder_date else None,
            "status": "completed" if r.is_completed else "pending",
            "priority": "medium",  # reminders don't have priority; default
            "type": r.reminder_type or "task",
            "created_at": str(r.created_at),
        }
        for r in reminders
    ]


# ---------------------------------------------------------------------------
# create_task
# ---------------------------------------------------------------------------


@tool(
    name="create_task",
    description=(
        "Create a new task for an advisor. Accepts title, description, "
        "optional client_id, due_date (ISO format), and priority."
    ),
)
async def create_task(
    user_id: str,
    title: str,
    description: str = "",
    client_id: str = "",
    due_date: str = "",
    priority: str = "medium",
    db: AsyncSession = None,
) -> dict:
    """Create a new task backed by a ClientReminder record."""
    reminder_date = datetime.now(timezone.utc)
    if due_date:
        try:
            reminder_date = datetime.fromisoformat(due_date)
        except ValueError:
            pass

    # client_id is required by the model; if not provided we cannot create
    if not client_id:
        return {
            "error": "client_id is required to create a task.",
            "hint": "Please specify which client this task relates to.",
        }

    new_reminder = ClientReminder(
        id=uuid.uuid4(),
        client_id=client_id,
        advisor_id=user_id,
        reminder_type="task",
        title=title,
        description=description or None,
        reminder_date=reminder_date,
        is_completed=False,
        is_recurring=False,
    )
    db.add(new_reminder)
    await db.flush()

    return {
        "task_id": str(new_reminder.id),
        "title": title,
        "description": description,
        "client_id": client_id,
        "due_date": str(reminder_date),
        "priority": priority,
        "status": "pending",
        "message": "Task created successfully.",
    }


# ---------------------------------------------------------------------------
# update_task
# ---------------------------------------------------------------------------


@tool(
    name="update_task",
    description=(
        "Update an existing task. Can change status (pending/completed) "
        "or reassign to a different advisor."
    ),
)
async def update_task(
    task_id: str,
    status: str = "",
    assignee: str = "",
    db: AsyncSession = None,
) -> dict:
    """Update a task's status or assignee."""
    result = await db.execute(
        select(ClientReminder).where(ClientReminder.id == task_id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        return {"error": f"Task {task_id} not found"}

    if status:
        reminder.is_completed = status.lower() in ("completed", "done", "closed")

    if assignee:
        reminder.advisor_id = assignee

    await db.flush()

    return {
        "task_id": str(reminder.id),
        "title": reminder.title,
        "status": "completed" if reminder.is_completed else "pending",
        "assignee": str(reminder.advisor_id),
        "message": "Task updated successfully.",
    }


# ---------------------------------------------------------------------------
# get_overdue_tasks
# ---------------------------------------------------------------------------


@tool(
    name="get_overdue_tasks",
    description=(
        "Get all overdue tasks for an advisor -- tasks whose due date "
        "has passed and are still incomplete."
    ),
)
async def get_overdue_tasks(
    user_id: str,
    db: AsyncSession = None,
) -> list[dict]:
    """Return incomplete tasks whose due date has passed."""
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(ClientReminder)
        .where(
            ClientReminder.advisor_id == user_id,
            ClientReminder.is_completed == False,  # noqa: E712
            ClientReminder.reminder_date < now,
        )
        .order_by(ClientReminder.reminder_date.asc())
        .limit(50)
    )
    reminders = result.scalars().all()

    return [
        {
            "task_id": str(r.id),
            "title": r.title,
            "description": r.description,
            "client_id": str(r.client_id),
            "due_date": str(r.reminder_date) if r.reminder_date else None,
            "days_overdue": (now - r.reminder_date).days if r.reminder_date else 0,
            "type": r.reminder_type or "task",
        }
        for r in reminders
    ]


# ---------------------------------------------------------------------------
# get_task_summary
# ---------------------------------------------------------------------------


@tool(
    name="get_task_summary",
    description=(
        "Get a summary of task counts grouped by status for an advisor. "
        "Returns total, pending, completed, and overdue counts."
    ),
)
async def get_task_summary(
    user_id: str,
    db: AsyncSession = None,
) -> dict:
    """Return summary counts of tasks by status for an advisor."""
    now = datetime.now(timezone.utc)

    # Total
    total_result = await db.execute(
        select(func.count(ClientReminder.id)).where(
            ClientReminder.advisor_id == user_id
        )
    )
    total = total_result.scalar() or 0

    # Completed
    completed_result = await db.execute(
        select(func.count(ClientReminder.id)).where(
            ClientReminder.advisor_id == user_id,
            ClientReminder.is_completed == True,  # noqa: E712
        )
    )
    completed = completed_result.scalar() or 0

    # Pending
    pending = total - completed

    # Overdue (incomplete and past due)
    overdue_result = await db.execute(
        select(func.count(ClientReminder.id)).where(
            ClientReminder.advisor_id == user_id,
            ClientReminder.is_completed == False,  # noqa: E712
            ClientReminder.reminder_date < now,
        )
    )
    overdue = overdue_result.scalar() or 0

    return {
        "user_id": user_id,
        "total": total,
        "pending": pending,
        "completed": completed,
        "overdue": overdue,
    }
