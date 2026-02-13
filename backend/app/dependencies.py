"""FastAPI dependency injection functions.

Provides reusable dependencies for database sessions,
authentication, and other cross-cutting concerns.
"""

import uuid
from typing import AsyncGenerator, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.core.security import decode_token
from app.models.user import User

# OAuth2-compatible bearer scheme for Swagger UI
bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session and ensure it is closed after use.

    Usage in route handlers:
        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the Bearer token, then return the authenticated user.

    Raises ``HTTPException`` 401 if the token is missing, invalid,
    expired, or the user does not exist.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise credentials_exception

    # Only accept access tokens (not refresh tokens)
    if payload.get("type") != "access":
        raise credentials_exception

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    user: User = Depends(get_current_user),
) -> User:
    """Return the current user only if the account is active.

    Raises ``HTTPException`` 403 for deactivated accounts.
    """
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )
    return user


def require_role(role: str) -> Callable:
    """Dependency factory that enforces a specific user role.

    Usage::

        @router.get("/admin-only")
        async def admin_endpoint(
            user: User = Depends(require_role("admin")),
        ):
            ...
    """

    async def _role_checker(
        user: User = Depends(get_current_active_user),
    ) -> User:
        if user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' is required for this action.",
            )
        return user

    return _role_checker
