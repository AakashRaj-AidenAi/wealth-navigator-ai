"""Neo4j async driver connection pool and lifecycle management.

Provides graceful fallback when Neo4j is unavailable — the platform
continues to function, agents just lose graph context.
"""

import logging
from contextlib import asynccontextmanager

from neo4j import AsyncGraphDatabase, AsyncDriver

from app.config import settings

logger = logging.getLogger(__name__)

_driver: AsyncDriver | None = None
_available: bool = False


async def init_neo4j() -> None:
    """Initialize the Neo4j async driver at application startup."""
    global _driver, _available
    try:
        _driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            max_connection_pool_size=20,
        )
        # Verify connectivity
        await _driver.verify_connectivity()
        _available = True
        logger.info("Neo4j connection established")

        # Create schema constraints/indexes
        await _ensure_schema()
    except Exception as e:
        logger.warning(f"Neo4j unavailable (graceful fallback): {e}")
        _available = False
        _driver = None


async def close_neo4j() -> None:
    """Close the Neo4j driver at application shutdown."""
    global _driver, _available
    if _driver:
        await _driver.close()
        _driver = None
        _available = False
        logger.info("Neo4j connection closed")


def is_neo4j_available() -> bool:
    """Check if Neo4j is available."""
    return _available


@asynccontextmanager
async def get_neo4j_session():
    """Dependency-style context manager for Neo4j sessions.

    Usage:
        async with get_neo4j_session() as session:
            result = await session.run("MATCH (n) RETURN n LIMIT 10")
    """
    if not _driver or not _available:
        yield None
        return

    session = _driver.session()
    try:
        yield session
    finally:
        await session.close()


async def _ensure_schema() -> None:
    """Create uniqueness constraints and indexes on first startup."""
    if not _driver:
        return

    constraints = [
        "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Client) REQUIRE c.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Portfolio) REQUIRE p.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (a:Alert) REQUIRE a.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (cv:Conversation) REQUIRE cv.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (g:Goal) REQUIRE g.id IS UNIQUE",
    ]
    indexes = [
        "CREATE INDEX IF NOT EXISTS FOR (c:Client) ON (c.user_id)",
        "CREATE INDEX IF NOT EXISTS FOR (t:Task) ON (t.user_id)",
        "CREATE INDEX IF NOT EXISTS FOR (a:Alert) ON (a.user_id)",
        "CREATE INDEX IF NOT EXISTS FOR (p:Portfolio) ON (p.client_id)",
    ]

    async with _driver.session() as session:
        for stmt in constraints + indexes:
            try:
                await session.run(stmt)
            except Exception as e:
                logger.warning(f"Schema statement skipped: {e}")
