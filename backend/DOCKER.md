# Docker Setup for WealthOS API

This guide explains how to run the WealthOS FastAPI backend using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

1. **Create a `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. **Update environment variables** in `.env`:
   - Set your `OPENAI_API_KEY`
   - Optionally update `JWT_SECRET` for production

3. **Start the services**:
   ```bash
   docker-compose up -d
   ```

   This will:
   - Start PostgreSQL 16 on port 5432
   - Start the FastAPI application on port 8000
   - Enable hot reload for development

4. **Check the logs**:
   ```bash
   docker-compose logs -f api
   ```

5. **Access the application**:
   - API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc
   - Health Check: http://localhost:8000/health

## Database Setup

### Run Migrations

After starting the containers for the first time, run database migrations:

```bash
docker-compose exec api alembic upgrade head
```

### Create a New Migration

```bash
docker-compose exec api alembic revision --autogenerate -m "Description of changes"
```

### Reset Database

```bash
docker-compose down -v
docker-compose up -d
docker-compose exec api alembic upgrade head
```

## Development Workflow

### Hot Reload

The API service is configured with `--reload` flag, so code changes will automatically restart the server.

### Install New Dependencies

1. Add package to `requirements.txt`
2. Rebuild the container:
   ```bash
   docker-compose up -d --build api
   ```

### Access Database Directly

```bash
docker-compose exec db psql -U wealthos -d wealthos
```

## Stopping the Services

```bash
# Stop containers (preserves data)
docker-compose stop

# Stop and remove containers (preserves data volumes)
docker-compose down

# Stop, remove containers, and delete data volumes
docker-compose down -v
```

## Troubleshooting

### Port Already in Use

If port 5432 or 8000 is already in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`:
   ```yaml
   ports:
     - "5433:5432"  # Use 5433 locally instead of 5432
   ```

### Database Connection Issues

Ensure the database is healthy:
```bash
docker-compose ps
docker-compose logs db
```

### API Not Starting

Check API logs for errors:
```bash
docker-compose logs api
```

## Production Considerations

For production deployments:

1. **Use multi-stage builds** in Dockerfile to reduce image size
2. **Set proper environment variables**:
   - Strong `JWT_SECRET`
   - `DEBUG=False`
   - Restricted `CORS_ORIGINS`
3. **Use external database** (managed PostgreSQL service)
4. **Implement Redis-based rate limiting** instead of in-memory
5. **Add health check endpoints** for orchestration
6. **Use Docker secrets** for sensitive data
7. **Set resource limits** in docker-compose or orchestration platform

## Middleware Features

The application includes the following middleware:

### Request ID Middleware
- Injects unique request ID for tracing
- Adds `X-Request-ID` header to all responses

### Request Logging Middleware
- Logs all HTTP requests with:
  - Method and path
  - Status code
  - Response time in milliseconds
  - Request ID for correlation

### Rate Limiting Middleware
- Default: 60 requests per minute per IP
- Exempt paths: `/health`, `/docs`, `/redoc`, `/openapi.json`
- Returns 429 status code when limit exceeded
- **Note**: Uses in-memory storage (not suitable for multi-instance production)

To adjust rate limiting:
```python
# In app/main.py
register_middleware(app, rate_limit_requests_per_minute=100)
```
