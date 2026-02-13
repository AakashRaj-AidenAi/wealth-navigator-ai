"""WealthOS API - FastAPI application entry point.

Creates and configures the FastAPI application with middleware,
routers, exception handlers, and lifespan management.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import v1_router
from app.api.websocket.chat import router as ws_router
from app.config import settings
from app.core.database import async_session_factory, engine
from app.core.exceptions import register_exception_handlers
from app.core.middleware import register_middleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown lifecycle.

    Startup:
      - Verify database connectivity
      - Log application readiness

    Shutdown:
      - Dispose of the database engine connection pool
    """
    # Startup
    logger.info("Starting %s ...", settings.APP_NAME)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified.")
    except Exception:
        logger.warning("Database is not reachable at startup. The app will start anyway.")

    # Initialize AI agents
    from app.agents import initialize_agents
    initialize_agents()
    logger.info("AI agents initialized.")

    # Initialize Neo4j knowledge graph (graceful fallback if unavailable)
    from app.core.neo4j import init_neo4j
    await init_neo4j()

    yield

    # Shutdown
    logger.info("Shutting down %s ...", settings.APP_NAME)

    from app.core.neo4j import close_neo4j
    await close_neo4j()

    await engine.dispose()
    logger.info("Database engine disposed.")


def create_app() -> FastAPI:
    """Build and return the fully configured FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ---- CORS middleware ----
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ---- Custom middleware ----
    register_middleware(app, rate_limit_requests_per_minute=60)

    # ---- Exception handlers ----
    register_exception_handlers(app)

    # ---- Routers ----
    app.include_router(v1_router, prefix="/api/v1")
    app.include_router(ws_router)

    # ---- Health check ----
    @app.get("/health", tags=["health"])
    async def health_check() -> dict:
        """Return application health status including database connectivity."""
        db_status = "healthy"
        try:
            async with async_session_factory() as session:
                await session.execute(text("SELECT 1"))
        except Exception:
            db_status = "unhealthy"

        from app.core.neo4j import is_neo4j_available
        neo4j_status = "healthy" if is_neo4j_available() else "unavailable"

        return {
            "status": "ok" if db_status == "healthy" else "degraded",
            "app": settings.APP_NAME,
            "database": db_status,
            "neo4j": neo4j_status,
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
