"""Async SQLAlchemy database configuration.

Provides the async engine, session factory, and declarative base
for all ORM models in the application.
"""

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from app.config import settings

# Create the async engine with connection pool settings
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

# Session factory for creating new async sessions
async_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Declarative base for ORM models
Base = declarative_base()


def get_engine() -> AsyncEngine:
    """Return the async database engine."""
    return engine


async def get_session() -> AsyncSession:
    """Create and return a new async database session.

    Usage:
        async with await get_session() as session:
            ...
    """
    return async_session_factory()
