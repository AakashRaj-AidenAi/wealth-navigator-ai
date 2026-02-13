# Deployment Guide

## Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Node.js 18+
- OpenAI API key

## Backend Setup

### 1. Environment Configuration
```bash
cd backend
cp .env.example .env
# Edit .env with your actual values:
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/wealthos
# OPENAI_API_KEY=sk-...
# JWT_SECRET=your-secret-key
# CORS_ORIGINS=["http://localhost:5173"]
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Database Setup
```bash
# Run Alembic migrations
alembic upgrade head
```

### 4. Start the Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Verify
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Frontend Setup

### 1. Environment Configuration
```bash
# In the project root
cp .env.development .env.local
# Ensure VITE_API_URL=http://localhost:8000/api/v1
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

## Docker Deployment

```bash
cd backend
docker-compose up -d
```

This starts:
- FastAPI backend on port 8000
- PostgreSQL on port 5432

## Data Migration (from Supabase)

```bash
python scripts/migrate_data.py \
  --source-url postgresql://user:pass@supabase-host:5432/postgres \
  --target-url postgresql://user:pass@localhost:5432/wealthos
```

## API Documentation
FastAPI auto-generates Swagger UI at `/docs` and ReDoc at `/redoc`.
