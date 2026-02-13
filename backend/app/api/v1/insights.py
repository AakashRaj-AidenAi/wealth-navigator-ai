"""AI Insights API endpoints (placeholder).

Provides placeholder endpoints for AI-powered analysis features
that will be connected to ML/AI services in future iterations.
"""

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.dependencies import get_current_user

router = APIRouter()


@router.post("/growth-scan")
async def growth_scan(
    current_user: dict = Depends(get_current_user),
) -> JSONResponse:
    """Trigger an AI-powered growth opportunity scan.

    Returns 202 Accepted with a task_id that can be used to poll
    for results once the async processing pipeline is implemented.
    """
    task_id = str(uuid.uuid4())
    return JSONResponse(
        status_code=202,
        content={
            "task_id": task_id,
            "status": "accepted",
            "message": "Growth scan queued for processing.",
        },
    )
