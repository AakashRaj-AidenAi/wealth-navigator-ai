# Design: migrate-to-fastapi-ai-platform

## 1. FastAPI Backend Architecture

### Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app entry point
│   ├── config.py                   # Settings (Pydantic BaseSettings)
│   ├── dependencies.py             # Dependency injection
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py           # Main v1 router
│   │   │   ├── auth.py             # Auth endpoints
│   │   │   ├── clients.py          # Client CRUD
│   │   │   ├── portfolios.py       # Portfolio management
│   │   │   ├── orders.py           # Order management
│   │   │   ├── goals.py            # Goals & planning
│   │   │   ├── funding.py          # Funding & payouts
│   │   │   ├── compliance.py       # Compliance
│   │   │   ├── leads.py            # Lead management
│   │   │   ├── campaigns.py        # Campaign management
│   │   │   ├── communications.py   # Communications
│   │   │   ├── corporate_actions.py
│   │   │   ├── reports.py          # Reports & analytics
│   │   │   ├── admin.py            # Admin endpoints
│   │   │   ├── chat.py             # Chat REST endpoints
│   │   │   └── insights.py         # AI insights
│   │   │
│   │   └── websocket/
│   │       ├── __init__.py
│   │       ├── chat.py             # Chat WebSocket handler
│   │       └── notifications.py    # Real-time notifications
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py                 # SQLAlchemy Base + mixins
│   │   ├── client.py               # Client models
│   │   ├── portfolio.py            # Portfolio models
│   │   ├── order.py                # Order models
│   │   ├── funding.py              # Funding models
│   │   ├── compliance.py           # Compliance models
│   │   ├── communication.py        # Communication models
│   │   ├── campaign.py             # Campaign models
│   │   ├── corporate_action.py     # Corporate action models
│   │   ├── lead.py                 # Lead models
│   │   ├── user.py                 # User & auth models
│   │   └── chat.py                 # Chat/conversation models
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── client.py               # Pydantic request/response
│   │   ├── portfolio.py
│   │   ├── order.py
│   │   ├── chat.py
│   │   ├── auth.py
│   │   └── ...                     # One per domain
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── client_service.py
│   │   ├── portfolio_service.py
│   │   ├── order_service.py
│   │   ├── funding_service.py
│   │   ├── chat_service.py
│   │   └── ...
│   │
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── base.py                 # Generic CRUD repository
│   │   ├── client_repo.py
│   │   ├── portfolio_repo.py
│   │   └── ...
│   │
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── orchestrator.py         # Agent supervisor/router
│   │   ├── registry.py             # Agent registry
│   │   ├── base_agent.py           # Base agent class
│   │   ├── memory.py               # Conversation memory manager
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   ├── client_tools.py     # Client data lookup tools
│   │   │   ├── portfolio_tools.py  # Portfolio analysis tools
│   │   │   ├── order_tools.py      # Order management tools
│   │   │   ├── funding_tools.py    # Funding analysis tools
│   │   │   └── market_tools.py     # Market data tools
│   │   ├── portfolio_agent.py
│   │   ├── cio_agent.py
│   │   ├── advisor_agent.py
│   │   ├── compliance_agent.py
│   │   ├── tax_agent.py
│   │   ├── meeting_agent.py
│   │   ├── growth_agent.py
│   │   └── funding_agent.py
│   │
│   ├── nlp/
│   │   ├── __init__.py
│   │   ├── intent_classifier.py    # Intent classification
│   │   ├── entity_extractor.py     # Named entity extraction
│   │   ├── sentiment_analyzer.py   # Sentiment analysis
│   │   ├── query_parser.py         # NL to structured query
│   │   └── prompts/
│   │       ├── intent_prompts.py
│   │       ├── entity_prompts.py
│   │       └── sentiment_prompts.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py             # JWT, password hashing
│   │   ├── database.py             # Async SQLAlchemy engine
│   │   ├── middleware.py            # CORS, logging, rate limiting
│   │   └── exceptions.py           # Custom exceptions
│   │
│   └── utils/
│       ├── __init__.py
│       ├── openai_client.py        # OpenAI API wrapper
│       └── currency.py             # Currency formatting
│
├── alembic/
│   ├── alembic.ini
│   ├── env.py
│   └── versions/                   # Migration files
│
├── tests/
│   ├── conftest.py
│   ├── test_api/
│   ├── test_agents/
│   ├── test_nlp/
│   └── test_services/
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── pyproject.toml
└── .env.example
```

### Key Design Decisions

**Database Connection**: Async SQLAlchemy with asyncpg driver
```python
# Async engine for non-blocking DB access
engine = create_async_engine(DATABASE_URL, pool_size=20, max_overflow=10)
async_session = async_sessionmaker(engine, class_=AsyncSession)
```

**Dependency Injection**:
```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    # Decode JWT, fetch user
    ...
```

**Row-Level Security Equivalent**:
Instead of PostgreSQL RLS policies, implement advisor-scoped queries in the repository layer:
```python
class ClientRepository:
    async def get_clients(self, db: AsyncSession, advisor_id: UUID) -> list[Client]:
        return await db.execute(
            select(Client).where(Client.advisor_id == advisor_id)
        )
```

---

## 2. Agent Orchestration Architecture

### Agent Lifecycle

```
User Message
    │
    ▼
┌──────────────┐
│ NLP Pipeline │ ──→ Intent + Entities + Sentiment
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Orchestrator │ ──→ Routes to appropriate agent(s)
│  (Supervisor) │     based on intent classification
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Agent(s)     │ ──→ Executes with tools, memory, context
│              │     May delegate to other agents
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Response     │ ──→ Formatted response with actions
│ Formatter    │     Streamed via WebSocket
└──────────────┘
```

### Agent Base Class

```python
class BaseAgent:
    name: str
    description: str
    system_prompt: str
    tools: list[Tool]
    model: str  # "gpt-4o" or "gpt-4o-mini"

    async def run(self, message: str, context: AgentContext) -> AgentResponse:
        """Execute agent with OpenAI function calling."""
        messages = self.build_messages(message, context)
        response = await openai.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=self.get_tool_definitions(),
            stream=True
        )
        # Handle tool calls, streaming, delegation
        ...
```

### Tool System

Each agent has access to specific tools that can query the database:

```python
@tool(name="get_client_portfolio", description="Get client portfolio holdings and performance")
async def get_client_portfolio(client_id: str, db: AsyncSession) -> dict:
    """Fetch portfolio data for a specific client."""
    positions = await portfolio_repo.get_positions(db, client_id)
    return {
        "holdings": [pos.to_dict() for pos in positions],
        "total_value": sum(pos.market_value for pos in positions),
        ...
    }
```

### Memory Architecture

```
┌─────────────────────────────────────────┐
│           Conversation Memory            │
│                                          │
│  ┌────────────────┐  ┌───────────────┐  │
│  │ Short-term     │  │ Long-term     │  │
│  │ (Session)      │  │ (PostgreSQL)  │  │
│  │                │  │               │  │
│  │ Last N messages│  │ Summaries     │  │
│  │ Current context│  │ Key facts     │  │
│  │ Active tools   │  │ Preferences   │  │
│  └────────────────┘  └───────────────┘  │
└─────────────────────────────────────────┘
```

**Conversation Storage Schema**:
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title TEXT,
    agent_type VARCHAR(50),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    role VARCHAR(20),  -- 'user', 'assistant', 'system', 'tool'
    content TEXT,
    metadata JSONB,    -- tool calls, agent info, entities
    created_at TIMESTAMPTZ
);

CREATE TABLE conversation_summaries (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    summary TEXT,
    key_entities JSONB,
    created_at TIMESTAMPTZ
);
```

---

## 3. NLP Pipeline Architecture

### Intent Classification

```python
INTENTS = [
    "portfolio_analysis",    # "How is my client's portfolio doing?"
    "client_lookup",         # "Show me details for Rajesh Kumar"
    "risk_assessment",       # "What's the risk profile for this portfolio?"
    "rebalance_request",     # "Rebalance the equity allocation"
    "order_management",      # "Place a buy order for HDFC Bank"
    "compliance_check",      # "Check KYC status for all clients"
    "tax_optimization",      # "Find tax-loss harvesting opportunities"
    "funding_analysis",      # "Show cash flow forecast"
    "meeting_prep",          # "Prepare for my meeting with Priya"
    "lead_management",       # "Score my leads"
    "campaign_creation",     # "Draft a market update email"
    "general_chat",          # Fallback for general queries
    "report_generation",     # "Generate monthly performance report"
    "churn_prediction",      # "Which clients are at risk of leaving?"
]
```

### Entity Extraction

```python
ENTITY_TYPES = {
    "CLIENT_NAME": "Client name reference",
    "TICKER_SYMBOL": "Stock/fund ticker (e.g., HDFC, RELIANCE)",
    "AMOUNT": "Monetary amount (e.g., 50 lakhs, 1 crore)",
    "DATE": "Date reference (e.g., next week, March 15)",
    "PERCENTAGE": "Percentage value (e.g., 60%, 5.5%)",
    "ACCOUNT_ID": "Account or portfolio identifier",
    "RISK_LEVEL": "Risk classification (conservative, moderate, aggressive)",
    "ASSET_CLASS": "Asset class (equity, debt, gold, real estate)",
    "ORDER_TYPE": "Order type (buy, sell, SIP, SWP)",
}
```

### Pipeline Flow

```python
class NLPPipeline:
    async def process(self, message: str) -> NLPResult:
        # Run intent classification and entity extraction in parallel
        intent, entities, sentiment = await asyncio.gather(
            self.classify_intent(message),
            self.extract_entities(message),
            self.analyze_sentiment(message)
        )
        return NLPResult(
            intent=intent,
            entities=entities,
            sentiment=sentiment,
            structured_query=self.build_query(intent, entities)
        )
```

---

## 4. Chat System Architecture

### WebSocket Protocol

```json
// Client → Server
{
    "type": "message",
    "conversation_id": "uuid",
    "content": "How is Rajesh Kumar's portfolio performing?",
    "metadata": {}
}

// Server → Client (streaming)
{
    "type": "stream_start",
    "conversation_id": "uuid",
    "message_id": "uuid",
    "agent": "portfolio_intelligence"
}

{
    "type": "stream_token",
    "token": "Rajesh",
    "message_id": "uuid"
}

{
    "type": "stream_end",
    "message_id": "uuid",
    "full_content": "...",
    "actions": [
        {"type": "view_portfolio", "label": "View Portfolio", "client_id": "..."},
        {"type": "rebalance", "label": "Suggest Rebalance", "client_id": "..."}
    ],
    "metadata": {
        "agent": "portfolio_intelligence",
        "intent": "portfolio_analysis",
        "entities": [{"type": "CLIENT_NAME", "value": "Rajesh Kumar"}],
        "tools_used": ["get_client_portfolio", "calculate_drift"]
    }
}

// Server → Client (typing indicator)
{
    "type": "agent_status",
    "status": "thinking",
    "agent": "portfolio_intelligence",
    "message": "Analyzing portfolio holdings..."
}
```

### Message Types

The chat system supports rich message types:

1. **Text** — Standard markdown text response
2. **Table** — Structured data (holdings, orders, client lists)
3. **Chart** — Chart configuration for frontend rendering
4. **Action Card** — Clickable action buttons (place order, draft email, schedule meeting)
5. **Confirmation** — Agent asks for confirmation before taking action
6. **Error** — Error messages with retry suggestions
7. **System** — Agent switching notifications, status updates

---

## 5. UI Redesign Architecture

### Layout Changes

**Current Layout**:
```
┌──────────────────────────────────────────┐
│ Header (market ticker, search, user)     │
├────────┬─────────────────────────────────┤
│        │                                 │
│ Side   │        Main Content             │
│ bar    │                                 │
│ (256px)│                                 │
│        │                                 │
└────────┴─────────────────────────────────┘
```

**New Layout**:
```
┌──────────────────────────────────────────────────────┐
│ Header (smart search, notifications, user)           │
├──────┬───────────────────────────────────┬───────────┤
│      │                                   │           │
│ Nav  │        Main Content               │  Chat     │
│ Rail │                                   │  Sidebar  │
│(64px)│                                   │  (380px)  │
│      │                                   │           │
│ Icons│                                   │  Copilot  │
│ Only │                                   │  Panel    │
│      │                                   │           │
└──────┴───────────────────────────────────┴───────────┘
```

Key changes:
- **Nav Rail**: Slim icon-only sidebar (64px) that expands on hover
- **Chat Sidebar**: Persistent right panel for AI copilot (collapsible)
- **Smart Header**: Simplified with command palette trigger, notification bell, user avatar
- **No market ticker in header**: Move to dashboard widget instead

### Component Hierarchy (New)

```
App
├── AuthProvider (JWT)
├── QueryClientProvider
├── ThemeProvider
├── MainLayout
│   ├── NavRail (left, 64px)
│   │   ├── Logo
│   │   ├── NavItems (icons)
│   │   ├── ExpandedDrawer (on hover/click)
│   │   └── UserAvatar (bottom)
│   ├── Header (top)
│   │   ├── BreadcrumbNav
│   │   ├── CommandPaletteButton (Cmd+K)
│   │   ├── NotificationBell
│   │   └── UserMenu
│   ├── MainContent (center)
│   │   └── <Page Routes />
│   └── ChatSidebar (right, 380px, collapsible)
│       ├── ConversationList
│       ├── ChatMessages
│       ├── MessageInput
│       └── QuickActions
├── CommandPalette (overlay)
└── NotificationCenter (dropdown)
```

### API Service Layer

Replace direct Supabase calls with an API service:

```typescript
// src/services/api.ts
class ApiClient {
    private baseUrl: string;
    private token: string;

    async get<T>(path: string, params?: Record<string, string>): Promise<T>;
    async post<T>(path: string, body: unknown): Promise<T>;
    async put<T>(path: string, body: unknown): Promise<T>;
    async delete(path: string): Promise<void>;
}

// src/services/clientService.ts
export const clientService = {
    getClients: (params) => api.get('/api/v1/clients', params),
    getClient: (id) => api.get(`/api/v1/clients/${id}`),
    updateClient: (id, data) => api.put(`/api/v1/clients/${id}`, data),
    ...
};

// src/hooks/useClients.ts
export function useClients(params) {
    return useQuery({
        queryKey: ['clients', params],
        queryFn: () => clientService.getClients(params),
    });
}
```

---

## 6. Backend-Frontend Integration Architecture

### Type Generation Pipeline

The frontend MUST never manually define types that duplicate backend schemas. Instead, types are auto-generated:

```
FastAPI Pydantic Models → /openapi.json → openapi-typescript → src/types/api.generated.ts
```

**Pipeline**:
```bash
# In package.json scripts:
"generate-types": "curl http://localhost:8000/openapi.json -o openapi.json && npx openapi-typescript openapi.json -o src/types/api.generated.ts"
```

**Usage in frontend**:
```typescript
// src/types/api.generated.ts (auto-generated, never edit manually)
export interface ClientResponse {
    id: string;
    client_name: string;
    email: string | null;
    total_assets: number;
    risk_profile: string;
    kyc_expiry_date: string | null;
    // ... exactly matches Pydantic model
}

// src/services/clientService.ts
import type { ClientResponse, ClientCreateRequest } from '@/types/api.generated';

export const clientService = {
    getClients: (params) => api.get<ClientResponse[]>('/api/v1/clients', params),
    createClient: (data: ClientCreateRequest) => api.post<ClientResponse>('/api/v1/clients', data),
};
```

### Error Handling Contract

Backend errors follow a consistent structure:

```python
# Backend: standardized error responses
class ErrorResponse(BaseModel):
    error: str          # Machine-readable error code
    message: str        # Human-readable message
    details: list | None  # Field-level validation errors
```

Frontend API client maps these to UI states:

```typescript
// src/services/api.ts
class ApiClient {
    private async handleResponse<T>(response: Response): Promise<T> {
        if (response.status === 401) {
            // Attempt token refresh, redirect to login if expired
            await this.refreshToken();
            // Retry original request
        }
        if (response.status === 422) {
            // Parse validation errors, throw FormValidationError
            const body = await response.json();
            throw new ValidationError(body.details);
        }
        if (response.status >= 500) {
            // Show toast, log error
            throw new ServerError('Something went wrong. Please try again.');
        }
        if (!response.ok) {
            const body = await response.json();
            throw new ApiError(body.message);
        }
        return response.json();
    }
}
```

### WebSocket Contract Validation

Both frontend and backend share the same event type definitions:

```typescript
// Shared WebSocket event types (generated from backend Pydantic models)
type WSEvent =
    | { type: 'message'; conversation_id: string; content: string; metadata: Record<string, unknown> }
    | { type: 'stream_start'; conversation_id: string; message_id: string; agent: string }
    | { type: 'stream_token'; token: string; message_id: string }
    | { type: 'stream_end'; message_id: string; full_content: string; actions: ActionCard[]; metadata: AgentMetadata }
    | { type: 'agent_status'; status: 'thinking' | 'tool_call' | 'delegating'; agent: string; message: string }
    | { type: 'error'; code: string; message: string };

// Frontend WebSocket manager validates every incoming message
function handleWSMessage(raw: unknown): void {
    const parsed = wsEventSchema.safeParse(raw);  // zod validation
    if (!parsed.success) {
        console.error('Malformed WS message', parsed.error);
        return;
    }
    switch (parsed.data.type) {
        case 'stream_token': onStreamToken(parsed.data); break;
        case 'stream_end': onStreamEnd(parsed.data); break;
        // ... exhaustive switch
    }
}
```

### Loading/Empty/Error State Pattern

Every data-fetching component follows a consistent pattern:

```typescript
function ClientsPage() {
    const { data, isLoading, isError, error, refetch } = useClients(filters);

    if (isLoading) return <ClientsTableSkeleton />;    // Shimmer rows
    if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
    if (!data?.length) return <EmptyState icon={Users} message="No clients yet." action="Add Client" />;

    return <ClientsTable data={data} />;
}
```

### Environment Configuration

```bash
# .env.development (frontend)
VITE_API_URL=http://localhost:8000
VITE_API_WS_URL=ws://localhost:8000

# .env.production (frontend)
VITE_API_URL=https://api.wealthos.com
VITE_API_WS_URL=wss://api.wealthos.com

# .env (backend)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/wealthos
OPENAI_API_KEY=sk-...
CORS_ORIGINS=["http://localhost:5173"]
JWT_SECRET=...
```

### Integration Test Architecture

```
tests/
├── integration/
│   ├── conftest.py              # Boot FastAPI test server + test DB
│   ├── test_auth_flow.py        # Login → token → protected route
│   ├── test_client_crud.py      # Create → Read → Update → Delete
│   ├── test_chat_e2e.py         # Send message → receive stream → persist
│   ├── test_websocket.py        # Connect → send → receive events
│   └── test_error_handling.py   # 401, 422, 404, 500 responses
│
├── e2e/                         # Playwright (frontend + backend together)
│   ├── login.spec.ts            # Login → dashboard loads
│   ├── clients.spec.ts          # Navigate → list → detail → edit
│   ├── chat.spec.ts             # Open → send → stream → action
│   └── error-states.spec.ts     # Network failure → retry
```

---

## 7. Migration Path (Existing Supabase → FastAPI)

### Edge Function → FastAPI Mapping

| Supabase Edge Function | FastAPI Equivalent | Agent |
|----------------------|-------------------|-------|
| `portfolio-copilot` | `POST /api/v1/chat/message` + WebSocket `/ws/chat` | Chat & AI Agent |
| `ai-growth-engine` | `GET /api/v1/insights/growth-scan` | Growth Agent |
| `ai-insights` | `GET /api/v1/insights/real-time` | Multiple Agents |
| `campaign-ai` | `POST /api/v1/campaigns/ai/*` | Advisor Agent |
| `corporate-actions` | `GET/POST /api/v1/corporate-actions/*` | Portfolio Agent |
| `funding-ai` | `GET /api/v1/funding/analytics/*` | Funding Agent |
| `portfolio-ai` | `GET /api/v1/portfolios/ai-analysis` | Portfolio Agent |
| `smart-prioritization` | `GET /api/v1/clients/prioritize` | Growth Agent |

### Database Migration Strategy

1. Export current Supabase schema (already have 36 migration files)
2. Convert Supabase migrations to Alembic format
3. Map Supabase types to SQLAlchemy models
4. Preserve all table structures, relationships, and constraints
5. Add new tables for chat (conversations, messages, conversation_summaries)
6. Run parallel environments during transition

---

## 7. Trade-offs & Alternatives Considered

### Agent Framework: Custom vs LangChain vs CrewAI

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Custom (chosen)** | Full control, no abstraction overhead, transparent prompts | More code to write | ✅ Selected |
| LangChain | Rich ecosystem, many integrations | Heavy abstraction, hard to debug, version churn | ❌ |
| CrewAI | Multi-agent patterns built-in | Less flexible, opinionated structure | ❌ |

**Reasoning**: For a financial application, transparency and control over AI interactions is critical. Custom agent implementation with OpenAI's native API provides the best debugging, auditing, and customization capabilities.

### Auth: Custom JWT vs Auth0 vs Supabase Auth (kept)

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Custom JWT (chosen)** | Full control, no external dependency | Must implement password reset, MFA, etc. | ✅ Selected |
| Auth0 | Full-featured, MFA built-in | External dependency, cost | Consider later |
| Keep Supabase Auth | No migration needed | Vendor lock-in, splits auth from backend | ❌ |

### Database: Raw SQL vs SQLAlchemy vs Tortoise ORM

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **SQLAlchemy Async (chosen)** | Industry standard, excellent async support, Alembic migrations | Learning curve | ✅ Selected |
| Raw SQL / asyncpg | Maximum performance | No ORM benefits, manual schema management | ❌ |
| Tortoise ORM | Django-like simplicity | Less mature ecosystem | ❌ |
