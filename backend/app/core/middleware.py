"""Custom middleware for the WealthOS API.

This module contains:
- Request logging middleware
- Rate limiting middleware
- Request ID injection middleware
"""

import logging
import time
import uuid
from collections import defaultdict
from typing import Callable

from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request ID Middleware
# ---------------------------------------------------------------------------


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Inject a unique request ID into each request for tracing and logging."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ---------------------------------------------------------------------------
# Request Logging Middleware
# ---------------------------------------------------------------------------


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all incoming HTTP requests with method, path, status code, and duration."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = getattr(request.state, "request_id", "N/A")
        start_time = time.time()

        # Log incoming request
        logger.info(
            "Incoming request: %s %s [ID: %s]",
            request.method,
            request.url.path,
            request_id,
        )

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log response
        logger.info(
            "Request completed: %s %s -> %d [Duration: %.2fms, ID: %s]",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )

        return response


# ---------------------------------------------------------------------------
# Rate Limiting Middleware
# ---------------------------------------------------------------------------


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware.

    Limits requests per IP address within a time window.
    This is a basic implementation suitable for development/small deployments.
    For production, consider using Redis-based rate limiting.

    Args:
        requests_per_minute: Maximum number of requests allowed per IP per minute
        exempt_paths: List of paths that should not be rate limited (e.g., ["/health"])
    """

    def __init__(
        self,
        app: FastAPI,
        requests_per_minute: int = 60,
        exempt_paths: list[str] | None = None,
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.exempt_paths = exempt_paths or ["/health", "/docs", "/redoc", "/openapi.json"]
        # Store: {ip_address: [(timestamp1, timestamp2, ...)]}
        self.request_history: defaultdict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        # Check X-Forwarded-For header (if behind a proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        # Fall back to direct client IP
        client_host = request.client.host if request.client else "unknown"
        return client_host

    def _is_rate_limited(self, ip: str) -> bool:
        """Check if the IP address has exceeded the rate limit."""
        current_time = time.time()
        window_start = current_time - 60  # 1 minute window

        # Get request history for this IP
        requests = self.request_history[ip]

        # Remove requests outside the current window
        requests[:] = [req_time for req_time in requests if req_time > window_start]

        # Check if limit is exceeded
        if len(requests) >= self.requests_per_minute:
            return True

        # Add current request timestamp
        requests.append(current_time)
        return False

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for exempt paths
        if request.url.path in self.exempt_paths:
            return await call_next(request)

        # Get client IP
        client_ip = self._get_client_ip(request)

        # Check rate limit
        if self._is_rate_limited(client_ip):
            logger.warning(
                "Rate limit exceeded for IP: %s on %s %s",
                client_ip,
                request.method,
                request.url.path,
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": 60,
                },
                headers={"Retry-After": "60"},
            )

        return await call_next(request)


# ---------------------------------------------------------------------------
# Middleware Registration
# ---------------------------------------------------------------------------


def register_middleware(app: FastAPI, rate_limit_requests_per_minute: int = 60) -> None:
    """Register all custom middleware on the FastAPI app.

    Args:
        app: The FastAPI application instance
        rate_limit_requests_per_minute: Max requests per IP per minute (default: 60)
    """
    # Add middleware in reverse order (last added = first executed)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=rate_limit_requests_per_minute,
    )
    app.add_middleware(RequestIDMiddleware)

    logger.info("Custom middleware registered successfully")
