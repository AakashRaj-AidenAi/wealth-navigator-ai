"""Client CRUD API endpoints.

All endpoints are scoped to the authenticated advisor's data.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.client import (
    ClientCreate,
    ClientListResponse,
    ClientResponse,
    ClientUpdate,
)
from app.services.client_service import ClientService

router = APIRouter()


def _get_service(
    db: AsyncSession,
    current_user: User,
) -> ClientService:
    """Construct a ClientService scoped to the current advisor."""
    return ClientService(session=db, advisor_id=current_user.id)


# ---------------------------------------------------------------------------
# GET /clients - list with pagination and filters
# ---------------------------------------------------------------------------


@router.get("", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by client name"),
    risk_profile: Optional[str] = Query(None, description="Filter by risk profile"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ClientListResponse:
    """Return a paginated list of clients for the authenticated advisor."""
    service = _get_service(db, current_user)
    items, total = await service.list_clients(
        page=page,
        limit=limit,
        search=search,
        risk_profile=risk_profile,
        is_active=is_active,
    )
    return ClientListResponse(
        items=[ClientResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# GET /clients/{client_id} - get single client
# ---------------------------------------------------------------------------


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ClientResponse:
    """Retrieve a single client by ID. Returns 404 if not found."""
    service = _get_service(db, current_user)
    client = await service.get_client(client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return ClientResponse.model_validate(client)


# ---------------------------------------------------------------------------
# POST /clients - create client
# ---------------------------------------------------------------------------


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ClientResponse:
    """Create a new client for the authenticated advisor."""
    service = _get_service(db, current_user)
    client = await service.create_client(data)
    return ClientResponse.model_validate(client)


# ---------------------------------------------------------------------------
# PUT /clients/{client_id} - update client
# ---------------------------------------------------------------------------


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ClientResponse:
    """Update an existing client. Returns 404 if not found."""
    service = _get_service(db, current_user)
    client = await service.update_client(client_id, data)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return ClientResponse.model_validate(client)


# ---------------------------------------------------------------------------
# DELETE /clients/{client_id} - delete client
# ---------------------------------------------------------------------------


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a client. Returns 404 if not found."""
    service = _get_service(db, current_user)
    deleted = await service.delete_client(client_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
