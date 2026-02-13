"""Tasks domain API endpoints (stub).

Provides stub endpoints for task management functionality.
Returns empty data structures to prevent frontend 404 errors.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Task Stubs
# ---------------------------------------------------------------------------


@router.get("")
async def list_tasks(
    assigned_to: Optional[uuid.UUID] = Query(
        None, description="Filter by assigned user ID"
    ),
    status: Optional[str] = Query(
        None, description="Filter by status (comma-separated)"
    ),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """List tasks for the current user (stub endpoint).

    Returns empty list until task management is fully implemented.
    """
    return {
        "items": [],
        "total": 0,
        "page": skip // limit + 1 if limit > 0 else 1,
        "limit": limit,
    }


@router.post("")
async def create_task(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Create a new task (stub endpoint).

    Returns a placeholder task object.
    """
    return {
        "id": str(uuid.uuid4()),
        "title": "New Task",
        "description": "",
        "status": "todo",
        "assigned_to": str(current_user.id),
        "created_at": "2025-01-01T00:00:00Z",
    }


@router.get("/{task_id}")
async def get_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Get a single task by ID (stub endpoint).

    Returns a placeholder task object.
    """
    return {
        "id": str(task_id),
        "title": "Task",
        "description": "",
        "status": "todo",
        "assigned_to": str(current_user.id),
        "created_at": "2025-01-01T00:00:00Z",
    }


@router.put("/{task_id}")
async def update_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Update a task (stub endpoint).

    Returns the task with updated timestamp.
    """
    return {
        "id": str(task_id),
        "title": "Updated Task",
        "description": "",
        "status": "in_progress",
        "assigned_to": str(current_user.id),
        "updated_at": "2025-01-01T00:00:00Z",
    }


@router.delete("/{task_id}")
async def delete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Delete a task (stub endpoint).

    Returns success confirmation.
    """
    return {"message": "Task deleted successfully", "id": str(task_id)}
