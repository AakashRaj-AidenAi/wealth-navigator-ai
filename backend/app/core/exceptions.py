"""Custom exception classes and FastAPI exception handlers.

Provides domain-specific exceptions and registers handlers
that convert them to proper HTTP error responses.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


# ---------------------------------------------------------------------------
# Custom exception classes
# ---------------------------------------------------------------------------


class AppException(Exception):
    """Base exception for all application-level errors."""

    def __init__(self, detail: str = "An unexpected error occurred", status_code: int = 500):
        self.detail = detail
        self.status_code = status_code
        super().__init__(self.detail)


class NotFoundError(AppException):
    """Raised when a requested resource does not exist."""

    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, status_code=404)


class UnauthorizedError(AppException):
    """Raised when authentication credentials are missing or invalid."""

    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(detail=detail, status_code=401)


class ForbiddenError(AppException):
    """Raised when the user lacks permission for the requested action."""

    def __init__(self, detail: str = "Permission denied"):
        super().__init__(detail=detail, status_code=403)


class ValidationError(AppException):
    """Raised when request data fails domain-level validation."""

    def __init__(self, detail: str = "Validation error"):
        super().__init__(detail=detail, status_code=422)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
    """Handle all AppException subclasses and return a JSON error response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": type(exc).__name__,
            "message": exc.detail,
            "details": None,
        },
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle Starlette HTTPException and return a standardized error response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": type(exc).__name__,
            "message": str(exc.detail),
            "details": None,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic validation errors and return a standardized error response."""
    return JSONResponse(
        status_code=422,
        content={
            "error": "ValidationError",
            "message": "Request validation failed",
            "details": exc.errors(),
        },
    )


async def generic_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An internal error occurred",
            "details": None,
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI app."""
    app.add_exception_handler(AppException, app_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, generic_exception_handler)  # type: ignore[arg-type]
