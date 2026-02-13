"""User and authentication ORM models.

Defines all user-related tables: users and user roles.

Every model inherits from both ``BaseMixin`` (id, created_at, updated_at)
and the declarative ``Base``.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


class User(BaseMixin, Base):
    """Application user with authentication credentials."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(
        String, default="wealth_advisor", server_default="wealth_advisor"
    )  # wealth_advisor | compliance_officer | client | admin
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    user_roles: Mapped[List["UserRole"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# User Role
# ---------------------------------------------------------------------------


class UserRole(BaseMixin, Base):
    """Additional roles and permissions assigned to a user."""

    __tablename__ = "user_roles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String, nullable=False)
    permissions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # -- relationships -------------------------------------------------------
    user: Mapped["User"] = relationship(back_populates="user_roles")
