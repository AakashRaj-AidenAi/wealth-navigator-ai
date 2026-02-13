"""Generic CRUD repository with advisor-scoped data access.

Provides a reusable base class that domain repositories can extend.
All queries are automatically scoped to the current advisor's data
via the ``advisor_id`` column.
"""

import uuid
from typing import Generic, List, Optional, Sequence, Type, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic async CRUD repository scoped by advisor_id.

    Subclasses must set ``model`` to the SQLAlchemy ORM class they manage.

    Example:
        class ClientRepository(BaseRepository[Client]):
            model = Client
    """

    model: Type[ModelType]

    def __init__(self, session: AsyncSession, advisor_id: uuid.UUID):
        self.session = session
        self.advisor_id = advisor_id

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, record_id: uuid.UUID) -> Optional[ModelType]:
        """Fetch a single record by primary key, scoped to the advisor."""
        stmt = select(self.model).where(
            self.model.id == record_id,  # type: ignore[attr-defined]
            self.model.advisor_id == self.advisor_id,  # type: ignore[attr-defined]
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[ModelType]:
        """Return a paginated list of records for the current advisor."""
        stmt = (
            select(self.model)
            .where(self.model.advisor_id == self.advisor_id)  # type: ignore[attr-defined]
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    async def create(self, **kwargs) -> ModelType:
        """Create a new record, automatically setting the advisor_id."""
        instance = self.model(**kwargs, advisor_id=self.advisor_id)  # type: ignore[call-arg]
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    async def update(self, record_id: uuid.UUID, **kwargs) -> Optional[ModelType]:
        """Update an existing record by primary key."""
        instance = await self.get_by_id(record_id)
        if instance is None:
            return None
        for key, value in kwargs.items():
            setattr(instance, key, value)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    async def delete(self, record_id: uuid.UUID) -> bool:
        """Delete a record by primary key. Returns True if deleted."""
        instance = await self.get_by_id(record_id)
        if instance is None:
            return False
        await self.session.delete(instance)
        await self.session.flush()
        return True
