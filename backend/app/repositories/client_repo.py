"""Client repository with advanced query support.

Extends the generic BaseRepository with client-specific filtering,
search, and paginated listing capabilities.
"""

import uuid
from typing import Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.repositories.base import BaseRepository
from app.schemas.client import ClientCreate, ClientUpdate


class ClientRepository(BaseRepository[Client]):
    """Repository for Client CRUD operations with filtering and search."""

    model = Client

    async def get_clients(
        self,
        *,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        risk_profile: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> tuple[Sequence[Client], int]:
        """Return a paginated, filtered list of clients for the current advisor.

        Parameters
        ----------
        page : int
            1-based page number.
        limit : int
            Maximum number of results per page.
        search : str, optional
            Case-insensitive substring match against client_name.
        risk_profile : str, optional
            Exact match filter on the risk_profile column.
        is_active : bool, optional
            Filter by active/inactive status.

        Returns
        -------
        tuple[Sequence[Client], int]
            A tuple of (items, total_count).
        """
        # Base filter: always scope to current advisor
        base_filter = self.model.advisor_id == self.advisor_id

        # Build optional filters
        conditions = [base_filter]
        if search:
            conditions.append(self.model.client_name.ilike(f"%{search}%"))
        if risk_profile is not None:
            conditions.append(self.model.risk_profile == risk_profile)
        if is_active is not None:
            conditions.append(self.model.is_active == is_active)

        # Count query
        count_stmt = select(func.count()).select_from(self.model).where(*conditions)
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar_one()

        # Data query with pagination
        offset = (page - 1) * limit
        data_stmt = (
            select(self.model)
            .where(*conditions)
            .order_by(self.model.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        data_result = await self.session.execute(data_stmt)
        items = data_result.scalars().all()

        return items, total

    async def get_client(self, client_id: uuid.UUID) -> Optional[Client]:
        """Fetch a single client by ID, scoped to the current advisor."""
        return await self.get_by_id(client_id)

    async def create_client(self, data: ClientCreate) -> Client:
        """Create a new client record for the current advisor."""
        return await self.create(**data.model_dump(exclude_unset=True))

    async def update_client(
        self, client_id: uuid.UUID, data: ClientUpdate
    ) -> Optional[Client]:
        """Update an existing client. Returns None if not found."""
        return await self.update(
            client_id, **data.model_dump(exclude_unset=True)
        )

    async def delete_client(self, client_id: uuid.UUID) -> bool:
        """Delete a client by ID. Returns True if deleted."""
        return await self.delete(client_id)
