"""Authentication API endpoints.

Provides user registration, login, token refresh, logout,
and current-user profile retrieval.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.auth import (
    TokenRefresh,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_token_response(user: User) -> TokenResponse:
    """Create a ``TokenResponse`` for the given user."""
    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserOut.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    """Create a new user account and return authentication tokens."""
    # Check for existing email
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    await db.flush()  # populate id and server defaults
    await db.refresh(user)

    return _build_token_response(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and obtain tokens",
)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Verify credentials and return access/refresh tokens."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    # Update last_login timestamp
    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    return _build_token_response(user)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh an access token",
)
async def refresh(payload: TokenRefresh, db: AsyncSession = Depends(get_db)):
    """Validate a refresh token and return a new token pair."""
    try:
        claims = decode_token(payload.refresh_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if claims.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is not a refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = claims.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _build_token_response(user)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout (stateless placeholder)",
)
async def logout(user: User = Depends(get_current_active_user)):
    """Logout endpoint.

    Since JWT is stateless, actual token invalidation would require a
    token blocklist (e.g. in Redis).  This endpoint serves as a
    placeholder so clients have a consistent API surface.
    """
    return {"detail": "Successfully logged out."}


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current user profile",
)
async def me(user: User = Depends(get_current_active_user)):
    """Return the profile of the currently authenticated user."""
    return UserOut.model_validate(user)
