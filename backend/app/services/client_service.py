"""Client service layer.

Thin orchestration layer between the API endpoints and the client
repository. Business logic and cross-cutting concerns (e.g. event
publishing, notifications) should be added here rather than in the
repository or router.
"""

import uuid
from typing import Optional, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.repositories.client_repo import ClientRepository
from app.schemas.client import ClientCreate, ClientUpdate


class ClientService:
    """Service for managing client lifecycle operations."""

    def __init__(self, session: AsyncSession, advisor_id: uuid.UUID):
        self._repo = ClientRepository(session=session, advisor_id=advisor_id)

    async def list_clients(
        self,
        *,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        risk_profile: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> tuple[Sequence[Client], int]:
        """Return a paginated, filtered list of clients."""
        return await self._repo.get_clients(
            page=page,
            limit=limit,
            search=search,
            risk_profile=risk_profile,
            is_active=is_active,
        )

    async def get_client(self, client_id: uuid.UUID) -> Optional[Client]:
        """Retrieve a single client by ID."""
        return await self._repo.get_client(client_id)

    async def create_client(self, data: ClientCreate) -> Client:
        """Create a new client record."""
        return await self._repo.create_client(data)

    async def update_client(
        self, client_id: uuid.UUID, data: ClientUpdate
    ) -> Optional[Client]:
        """Update an existing client. Returns None if not found."""
        return await self._repo.update_client(client_id, data)

    async def delete_client(self, client_id: uuid.UUID) -> bool:
        """Delete a client. Returns True if the record was removed."""
        return await self._repo.delete_client(client_id)
