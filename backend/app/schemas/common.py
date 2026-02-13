"""Common Pydantic schemas used across the API."""
from pydantic import BaseModel
from typing import Any


class ErrorResponse(BaseModel):
    """Standardized error response shape."""
    error: str
    message: str
    details: Any | None = None


class PaginatedResponse(BaseModel):
    """Base for paginated list responses."""
    total: int
    skip: int = 0
    limit: int = 20
