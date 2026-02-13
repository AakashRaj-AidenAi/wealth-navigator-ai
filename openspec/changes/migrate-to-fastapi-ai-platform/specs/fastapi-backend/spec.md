# Capability: FastAPI Backend

Replaces Supabase Edge Functions and direct Supabase client calls with a Python FastAPI backend connected to PostgreSQL, providing REST APIs, WebSocket support, JWT authentication, and a proper service/repository architecture.

## ADDED Requirements

### Requirement: FastAPI Application Setup
The system MUST provide a FastAPI application with CORS middleware, API versioning, health checks, structured logging, and async PostgreSQL connectivity.

#### Scenario: Application starts and health check returns OK
- **Given** the backend is configured with DATABASE_URL and OPENAI_API_KEY
- **When** a GET request is made to `/health`
- **Then** the response is 200 with `{"status": "healthy", "database": "connected"}`

#### Scenario: CORS allows frontend origin
- **Given** the frontend runs on `http://localhost:5173`
- **When** a preflight OPTIONS request is made from that origin
- **Then** the response includes appropriate CORS headers allowing the request

#### Scenario: All API routes are versioned
- **Given** the API is deployed
- **When** any business endpoint is called
- **Then** all routes are prefixed with `/api/v1/`

---

### Requirement: JWT Authentication and Authorization
The system MUST provide JWT-based authentication replacing Supabase Auth, with role-based access control (wealth_advisor, compliance_officer, client, admin).

#### Scenario: User signs in with email and password
- **Given** a registered user with email "advisor@example.com"
- **When** a POST request is made to `/api/v1/auth/login` with valid credentials
- **Then** the response includes an access token and refresh token with user role

#### Scenario: Protected endpoint rejects unauthenticated request
- **Given** no Authorization header is provided
- **When** a GET request is made to `/api/v1/clients`
- **Then** the response is 401 Unauthorized

#### Scenario: Advisor can only access their own clients
- **Given** an authenticated advisor with `advisor_id = "abc-123"`
- **When** the advisor requests `/api/v1/clients`
- **Then** only clients where `advisor_id = "abc-123"` are returned

---

### Requirement: PostgreSQL Schema with SQLAlchemy Models
The system MUST define SQLAlchemy ORM models for all 55+ existing tables plus new chat tables, managed by Alembic migrations.

#### Scenario: Alembic migration creates all tables
- **Given** a fresh PostgreSQL database
- **When** `alembic upgrade head` is executed
- **Then** all tables from the existing Supabase schema are created with correct columns, types, and constraints

#### Scenario: New conversation tables are created
- **Given** the migration runs
- **When** the chat tables migration executes
- **Then** `conversations`, `messages`, and `conversation_summaries` tables exist with proper foreign keys

---

### Requirement: CRUD API Endpoints for All Domains
The system MUST provide RESTful CRUD endpoints for clients, portfolios, orders, goals, funding, compliance, leads, campaigns, communications, corporate actions, and admin functions.

#### Scenario: List clients with pagination and filtering
- **Given** an authenticated advisor with 50 clients
- **When** GET `/api/v1/clients?page=1&limit=20&risk_profile=aggressive`
- **Then** the response includes paginated results with total count and filtered clients

#### Scenario: Create a new order
- **Given** an authenticated advisor with a valid client
- **When** POST `/api/v1/orders` with order details (client_id, symbol, quantity, order_type)
- **Then** the order is created and returned with status "pending"

#### Scenario: Update client profile
- **Given** an authenticated advisor and an existing client
- **When** PUT `/api/v1/clients/{id}` with updated fields
- **Then** the client record is updated and the response includes the full updated client

---

### Requirement: WebSocket Support for Real-time Communication
The system MUST provide WebSocket endpoints for chat streaming and real-time notifications.

#### Scenario: WebSocket connection established with valid token
- **Given** an authenticated user with a valid JWT
- **When** a WebSocket connection is opened to `/ws/chat?token={jwt}`
- **Then** the connection is established and authenticated

#### Scenario: WebSocket rejects invalid token
- **Given** an expired or invalid JWT
- **When** a WebSocket connection is attempted
- **Then** the connection is rejected with a 4001 close code

---

### Requirement: Background Task Processing
The system MUST support background task execution for long-running operations like AI analysis, batch emails, and report generation.

#### Scenario: Growth scan runs as background task
- **Given** an advisor requests a full growth scan
- **When** POST `/api/v1/insights/growth-scan`
- **Then** the response is 202 Accepted with a task ID, and the scan executes asynchronously
