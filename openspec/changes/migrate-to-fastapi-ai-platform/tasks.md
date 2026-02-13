# Tasks: migrate-to-fastapi-ai-platform

## Claude Multi-Agent Execution Strategy

Each task is tagged with a **`@agent:`** specifying which Claude Code subagent should execute it, and a **`@parallel:`** tag indicating which tasks can run concurrently. During `/openspec:apply`, Claude should launch multiple `Task` tool calls simultaneously for tasks in the same parallel group.

### Agent Registry

| Agent ID | Subagent Type | Specialty | Model |
|----------|--------------|-----------|-------|
| `backend-architect` | `general-purpose` | Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic, JWT auth | `opus` |
| `ai-orchestration` | `general-purpose` | OpenAI GPT, agent design, function calling, prompt engineering | `opus` |
| `nlp-pipeline` | `general-purpose` | NLP, intent classification, entity extraction, sentiment analysis | `sonnet` |
| `chat-system` | `general-purpose` | WebSocket, real-time messaging, conversation management | `sonnet` |
| `ui-redesign` | `general-purpose` | React, TypeScript, Tailwind, Radix UI, Framer Motion, frontend architecture | `opus` |
| `integration` | `general-purpose` | API contracts, type generation, error handling, e2e testing, Playwright | `sonnet` |

---

## Phase 1: Foundation (Backend + Auth + DB)

### Parallel Group 1A — Scaffold & Models (launch all simultaneously)

- [x] **1.1** Scaffold FastAPI project structure with `app/`, `api/`, `models/`, `schemas/`, `services/`, `repositories/`, `core/` directories; create `main.py`, `config.py`, `dependencies.py`, `requirements.txt`, `pyproject.toml`
  - `@agent: backend-architect`
  - `@parallel: 1A`

- [x] **1.2** Configure async SQLAlchemy engine with asyncpg, connection pooling (`pool_size=20, max_overflow=10`), and async session management in `app/core/database.py`
  - `@agent: backend-architect`
  - `@parallel: 1A` (can start after 1.1 scaffold exists)

- [x] **1.3** Define SQLAlchemy ORM models for all core client tables: `clients`, `client_aum`, `client_activities`, `client_life_goals`, `client_family_members`, `client_nominees`, `client_notes`, `client_reminders`, `client_tags`, `client_consents`, `client_documents`, `profiles` — reference `src/integrations/supabase/types.ts` for exact column types
  - `@agent: backend-architect`
  - `@parallel: 1A-models` (1.3–1.9 can all run in parallel once 1.1 scaffold exists)

- [x] **1.4** Define SQLAlchemy ORM models for portfolio tables: `portfolio_admin_portfolios`, `portfolio_admin_positions`, `portfolio_admin_accounts`, `portfolio_admin_transactions`
  - `@agent: backend-architect`
  - `@parallel: 1A-models`

- [x] **1.5** Define SQLAlchemy ORM models for order, funding, and payout tables: `orders`, `payments`, `invoices`, `funding_requests`, `funding_accounts`, `funding_status_history`, `funding_transactions`, `funding_alerts`, `funding_audit_log`, `cash_balances`, `payout_requests`, `payout_status_history`, `payout_transactions`, `payout_compliance_alerts`
  - `@agent: backend-architect`
  - `@parallel: 1A-models`

- [x] **1.6** Define SQLAlchemy ORM models for engagement, communication, and campaign tables: `communication_logs`, `communication_campaigns`, `campaign_segments`, `campaign_message_logs`, `campaign_recipients`, `message_templates`, `ai_meeting_summaries`, `sentiment_logs`
  - `@agent: backend-architect`
  - `@parallel: 1A-models`

- [x] **1.7** Define SQLAlchemy ORM models for analytics, compliance, leads, and admin tables: `churn_predictions`, `client_engagement_scores`, `compliance_alerts`, `risk_profiles`, `risk_answers`, `leads`, `lead_activities`, `lead_stage_history`, `commission_records`, `revenue_records`, `audit_logs`, `user_roles`, `voice_note_transcriptions`, `advice_records`, `withdrawal_limits`
  - `@agent: backend-architect`
  - `@parallel: 1A-models`

- [x] **1.8** Define SQLAlchemy ORM models for corporate actions: `corporate_actions`, `client_corporate_actions`, `corporate_action_alerts`
  - `@agent: backend-architect`
  - `@parallel: 1A-models`

- [x] **1.9** Define new SQLAlchemy ORM models for chat system: `conversations`, `messages`, `conversation_summaries`
  - `@agent: backend-architect`
  - `@parallel: 1A-models`

- [x] **1.10** Set up Alembic with initial migration that creates all tables from models 1.3–1.9
  - `@agent: backend-architect`
  - `@parallel: none` (depends on all models)

### Parallel Group 1B — Auth (sequential, after models)

- [x] **1.11** Implement JWT authentication in `app/core/security.py`: password hashing (bcrypt via passlib), token generation (python-jose), token validation, refresh token flow
  - `@agent: backend-architect`
  - `@parallel: 1B` (sequential)

- [x] **1.12** Implement auth endpoints in `app/api/v1/auth.py`: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`
  - `@agent: backend-architect`
  - `@parallel: 1B` (after 1.11)

- [x] **1.13** Implement role-based authorization middleware and `get_current_user` dependency in `app/dependencies.py`
  - `@agent: backend-architect`
  - `@parallel: 1B` (after 1.12)

- [x] **1.14** Implement advisor-scoped data access in `app/repositories/base.py` (Row-Level Security equivalent — all queries filter by `advisor_id`)
  - `@agent: backend-architect`
  - `@parallel: 1B` (after 1.13)

### Parallel Group 1C — CRUD Endpoints (launch all simultaneously after auth)

- [x] **1.15** Implement CRUD API endpoints for clients in `app/api/v1/clients.py`: list (paginated, filterable by risk_profile, search by name), get, create, update, delete — with Pydantic schemas in `app/schemas/client.py`
  - `@agent: backend-architect`
  - `@parallel: 1C`

- [x] **1.16** Implement CRUD API endpoints for portfolios, positions, and transactions in `app/api/v1/portfolios.py`
  - `@agent: backend-architect`
  - `@parallel: 1C`

- [x] **1.17** Implement CRUD API endpoints for orders in `app/api/v1/orders.py`: list, get, create, update status
  - `@agent: backend-architect`
  - `@parallel: 1C`

- [x] **1.18** Implement CRUD API endpoints for goals, funding, payouts, and cash balances in `app/api/v1/goals.py` and `app/api/v1/funding.py`
  - `@agent: backend-architect`
  - `@parallel: 1C`

- [x] **1.19** Implement CRUD API endpoints for leads, campaigns, communications, and compliance in respective router files
  - `@agent: backend-architect`
  - `@parallel: 1C`

- [x] **1.20** Implement CRUD API endpoints for corporate actions, tasks, reports, and admin in respective router files
  - `@agent: backend-architect`
  - `@parallel: 1C`

- [x] **1.21** Set up CORS middleware, request logging, global exception handling, and rate limiting in `app/core/middleware.py` and `app/main.py`
  - `@agent: backend-architect`
  - `@parallel: 1C`

- [x] **1.22** Create `Dockerfile` and `docker-compose.yml` with FastAPI + PostgreSQL services
  - `@agent: backend-architect`
  - `@parallel: 1C`

### Parallel Group 1D — Backend Tests (after CRUD endpoints)

- [x] **1.23** Write API tests for auth endpoints (register, login, refresh, protected route access) in `tests/test_api/test_auth.py`
  - `@agent: backend-architect`
  - `@parallel: 1D`

- [x] **1.24** Write API tests for client CRUD with advisor scoping validation in `tests/test_api/test_clients.py`
  - `@agent: backend-architect`
  - `@parallel: 1D`
  - **Validates**: Auth works end-to-end, advisor isolation enforced, CRUD operates correctly

---

## Phase 2: Agent System (AI + NLP)

### Parallel Group 2A — Agent Foundation (sequential)

- [x] **2.1** Create `BaseAgent` class in `app/agents/base_agent.py` with system prompt, tools list, model selection, and async `run()` method using OpenAI chat completions API with streaming
  - `@agent: ai-orchestration`
  - `@parallel: 2A` (sequential)

- [x] **2.2** Implement OpenAI client wrapper in `app/utils/openai_client.py` with streaming support, function calling, retry logic (exponential backoff), token counting, and error handling
  - `@agent: ai-orchestration`
  - `@parallel: 2A` (after 2.1)

- [x] **2.3** Create tool system in `app/agents/tools/`: `@tool` decorator, tool registry, tool execution engine that receives SQLAlchemy `AsyncSession` and executes DB queries
  - `@agent: ai-orchestration`
  - `@parallel: 2A` (after 2.2)

### Parallel Group 2B — Individual Agents (launch ALL 8 simultaneously)

- [x] **2.4** Implement **Portfolio Intelligence Agent** in `app/agents/portfolio_agent.py` with tools: `get_client_portfolio`, `calculate_drift`, `get_target_allocation`, `analyze_concentration`, `get_performance_history`
  - `@agent: ai-orchestration`
  - `@parallel: 2B`

- [x] **2.5** Implement **CIO Strategy Agent** in `app/agents/cio_agent.py` with tools: `get_sector_allocation`, `get_market_overview`, `analyze_macro_trends`
  - `@agent: ai-orchestration`
  - `@parallel: 2B`

- [x] **2.6** Implement **Advisor Assistant Agent** in `app/agents/advisor_agent.py` with tools: `get_client_profile`, `get_recent_activity`, `get_engagement_score`, `search_clients`
  - `@agent: ai-orchestration`
  - `@parallel: 2B`

- [x] **2.7** Implement **Compliance Sentinel Agent** in `app/agents/compliance_agent.py` with tools: `check_kyc_status`, `get_compliance_alerts`, `get_audit_trail`
  - `@agent: ai-orchestration`
  - `@parallel: 2B`

- [x] **2.8** Implement **Tax Optimizer Agent** in `app/agents/tax_agent.py` with tools: `get_unrealized_gains_losses`, `find_harvesting_opportunities`, `estimate_tax_impact`
  - `@agent: ai-orchestration`
  - `@parallel: 2B`

- [x] **2.9** Implement **Meeting Intelligence Agent** in `app/agents/meeting_agent.py` with tools: `get_client_summary`, `get_pending_items`, `get_recent_communications`, `generate_talking_points`
  - `@agent: ai-orchestration`
  - `@parallel: 2B`

- [x] **2.10** Implement **Growth Engine Agent** in `app/agents/growth_agent.py` with tools: `score_clients`, `predict_churn`, `identify_opportunities`, `get_silent_clients`
  - `@agent: ai-orchestration`
  - `@parallel: 2B`

- [x] **2.11** Implement **Funding Risk Agent** in `app/agents/funding_agent.py` with tools: `get_cash_flow_forecast`, `analyze_settlement_risk`, `get_withdrawal_patterns`, `get_funding_alerts`
  - `@agent: ai-orchestration`
  - `@parallel: 2B`

### Parallel Group 2C — Orchestration (sequential, after agents)

- [x] **2.12** Implement agent registry in `app/agents/registry.py` and orchestrator/supervisor in `app/agents/orchestrator.py` that routes messages to agents based on NLP intent classification
  - `@agent: ai-orchestration`
  - `@parallel: 2C` (sequential)

- [x] **2.13** Implement agent memory manager in `app/agents/memory.py`: short-term (last N messages in session), long-term (PostgreSQL `conversation_summaries`), context window management with automatic summarization when exceeding token limit
  - `@agent: ai-orchestration`
  - `@parallel: 2C` (after 2.12)

- [x] **2.14** Implement inter-agent delegation in `BaseAgent`: agent A can invoke agent B via `self.delegate(agent_name, sub_query)` for specialized sub-tasks, results incorporated into response
  - `@agent: ai-orchestration`
  - `@parallel: 2C` (after 2.13)

### Parallel Group 2D — NLP Pipeline (launch ALL simultaneously, independent of 2B/2C)

- [x] **2.15** Implement NLP intent classifier in `app/nlp/intent_classifier.py` using GPT-4o-mini with 14 intent categories; return intent + confidence score
  - `@agent: nlp-pipeline`
  - `@parallel: 2D`

- [x] **2.16** Implement NLP entity extractor in `app/nlp/entity_extractor.py` using GPT-4o-mini for 9 entity types (CLIENT_NAME, TICKER_SYMBOL, AMOUNT, DATE, PERCENTAGE, ACCOUNT_ID, RISK_LEVEL, ASSET_CLASS, ORDER_TYPE)
  - `@agent: nlp-pipeline`
  - `@parallel: 2D`

- [x] **2.17** Implement NLP sentiment analyzer in `app/nlp/sentiment_analyzer.py` for client communications; return score (-1.0 to 1.0) + classification (positive/neutral/negative)
  - `@agent: nlp-pipeline`
  - `@parallel: 2D`

- [x] **2.18** Implement natural language to structured query parser in `app/nlp/query_parser.py` for filter/search requests; output JSON filter objects compatible with repository query methods
  - `@agent: nlp-pipeline`
  - `@parallel: 2D`

- [x] **2.19** Create NLP pipeline in `app/nlp/__init__.py` that runs intent, entity, and sentiment analysis concurrently via `asyncio.gather()`
  - `@agent: nlp-pipeline`
  - `@parallel: none` (after 2.15–2.18)

- [x] **2.20** Write tests for agent tool execution, intent classification accuracy, and entity extraction in `tests/test_agents/` and `tests/test_nlp/`
  - `@agent: nlp-pipeline`
  - `@parallel: none` (after 2.19)
  - **Validates**: Agents call correct tools, NLP correctly classifies intents, entities are extracted accurately

---

## Phase 3: Chat System

### Sequential (each depends on previous)

- [x] **3.1** Implement WebSocket endpoint `/ws/chat` in `app/api/websocket/chat.py` with JWT authentication via query param, connection manager (track active connections), and heartbeat/ping-pong
  - `@agent: chat-system`
  - `@parallel: 3A` (sequential)

- [x] **3.2** Implement WebSocket protocol: define Pydantic models for all event types (`message`, `stream_start`, `stream_token`, `stream_end`, `agent_status`, `error`) in `app/schemas/chat.py`
  - `@agent: chat-system`
  - `@parallel: 3A` (after 3.1)

### Parallel Group 3B (after WebSocket setup)

- [x] **3.3** Implement conversation CRUD REST endpoints in `app/api/v1/chat.py`: `POST /api/v1/chat/conversations`, `GET /api/v1/chat/conversations`, `GET /api/v1/chat/conversations/{id}/messages`, `DELETE /api/v1/chat/conversations/{id}`
  - `@agent: chat-system`
  - `@parallel: 3B`

- [x] **3.4** Implement chat message flow: receive WS message → NLP pipeline → orchestrator routes to agent → agent streams response → persist message + response to `messages` table
  - `@agent: chat-system`
  - `@parallel: 3B`

- [x] **3.5** Implement rich message types in response metadata: text, table data (column definitions + rows), chart configurations (type + data for Recharts), action cards (label + action type + params), confirmations
  - `@agent: chat-system`
  - `@parallel: 3B`

### Sequential (features build on core)

- [x] **3.6** Implement chat command system: parse `/analyze {client}`, `/rebalance {client}`, `/draft-email {client}`, `/meeting-prep {client}` — route directly to appropriate agent with pre-filled context
  - `@agent: chat-system`
  - `@parallel: 3C` (sequential)

- [x] **3.7** Implement proactive agent suggestions: after each response, agent evaluates context and optionally appends suggested follow-up actions in `actions` metadata
  - `@agent: chat-system`
  - `@parallel: 3C` (after 3.6)

- [x] **3.8** Implement conversation search in `app/services/chat_service.py` with PostgreSQL full-text search on `messages.content` using `tsvector`/`tsquery`
  - `@agent: chat-system`
  - `@parallel: 3C` (after 3.7)

- [x] **3.9** Write integration tests for WebSocket chat flow end-to-end in `tests/integration/test_chat_e2e.py`
  - `@agent: chat-system`
  - `@parallel: none` (after 3.8)
  - **Validates**: Messages flow through the full pipeline, responses stream correctly, conversations persist

---

## Phase 4: Frontend Migration & UI Redesign

### Parallel Group 4A — API Layer (sequential, `ui-redesign` agent)

- [x] **4.1** Create API service layer in `src/services/api.ts`: typed HTTP client class with base URL from `VITE_API_URL`, JWT token management (attach to headers, auto-refresh on 401), request/response interceptors, error handling
  - `@agent: ui-redesign`
  - `@parallel: 4A` (sequential)

- [x] **4.2** Create domain service modules: `src/services/clientService.ts`, `portfolioService.ts`, `orderService.ts`, `fundingService.ts`, `leadService.ts`, `campaignService.ts`, `complianceService.ts`, `chatService.ts` — each wrapping typed API calls using generated types
  - `@agent: ui-redesign`
  - `@parallel: 4A` (after 4.1)

- [x] **4.3** Migrate all React Query hooks from Supabase client calls to API service calls — update every `useQuery`/`useMutation` query function across all hooks in `src/hooks/`
  - `@agent: ui-redesign`
  - `@parallel: 4A` (after 4.2)

- [x] **4.4** Replace Supabase Auth with JWT auth flow: rewrite `src/contexts/AuthContext.tsx` to use FastAPI `/api/v1/auth/login`, `/register`, `/refresh` endpoints; store JWT in localStorage; auto-refresh before expiry
  - `@agent: ui-redesign`
  - `@parallel: 4A` (after 4.3)

### Parallel Group 4B — Layout Components (launch ALL simultaneously)

- [x] **4.5** Replace `MainLayout` sidebar (256px) with `NavRail` component (64px icon-only, expand to 240px on hover with Framer Motion `animate` + `whileHover`); update `src/components/layout/`
  - `@agent: ui-redesign`
  - `@parallel: 4B`

- [x] **4.6** Redesign `Header` component in `src/components/layout/Header.tsx`: remove market ticker, add breadcrumb navigation (from React Router location), command palette trigger button (Cmd+K), notification bell with badge count
  - `@agent: ui-redesign`
  - `@parallel: 4B`

- [x] **4.7** Implement `CommandPalette` component in `src/components/CommandPalette.tsx` using existing `cmdk` library: search pages, clients (from API), agent commands, and navigation actions
  - `@agent: ui-redesign`
  - `@parallel: 4B`

- [x] **4.8** Implement `NotificationCenter` dropdown in `src/components/NotificationCenter.tsx` in header with categorized notifications (tasks, compliance, funding, chat) fetched from API
  - `@agent: ui-redesign`
  - `@parallel: 4B`

### Parallel Group 4C — Chat UI (sequential, depends on WebSocket backend)

- [x] **4.9** Build `ChatSidebar` component in `src/components/chat/ChatSidebar.tsx` (380px, right side of layout, collapsible): conversation list panel, active message thread, text input with send button, agent identity header
  - `@agent: ui-redesign`
  - `@parallel: 4C` (sequential)

- [x] **4.10** Implement WebSocket connection manager in `src/services/websocket.ts`: connect with JWT, auto-reconnect with exponential backoff, heartbeat ping/pong, typed message send/receive using Zod-validated event types
  - `@agent: ui-redesign`
  - `@parallel: 4C` (after 4.9)

- [x] **4.11** Build rich chat message components in `src/components/chat/messages/`: `TextMessage.tsx` (markdown), `TableMessage.tsx` (sortable table), `ActionCardMessage.tsx` (clickable buttons), `ConfirmationMessage.tsx` — all with Framer Motion slide-in animations
  - `@agent: ui-redesign`
  - `@parallel: 4C` (after 4.10)

- [x] **4.12** Implement agent avatar/identity display (icon + name per agent type) and typing indicators (animated dots during `agent_status` events) in `src/components/chat/`
  - `@agent: ui-redesign`
  - `@parallel: 4C` (after 4.11)

### Parallel Group 4D — Polish (launch ALL simultaneously)

- [x] **4.13** Modernize dashboard in `src/pages/Index.tsx`: update KPI cards with inline sparklines (Recharts `<Sparklines>`), improve widget grid layout, add card hover lift effects
  - `@agent: ui-redesign`
  - `@parallel: 4D`

- [x] **4.14** Add Framer Motion animations: page transitions (`AnimatePresence` + `motion.div` fade-slide on route change), card hover effects (`whileHover={{ y: -2, boxShadow }}`), chat message slide-in
  - `@agent: ui-redesign`
  - `@parallel: 4D`

- [x] **4.15** Refine gold/dark theme in `src/index.css`: improve color contrast ratios (WCAG AA), tighten typography hierarchy (consistent heading/body sizes), improve spacing consistency
  - `@agent: ui-redesign`
  - `@parallel: 4D`

- [x] **4.16** Remove all direct Supabase client imports from pages and components (final cleanup): delete `src/integrations/supabase/client.ts` usage, keep only as reference; verify no `supabase.from()` calls remain
  - `@agent: ui-redesign`
  - `@parallel: 4D`

- [x] **4.17** Frontend smoke testing: verify all pages load data from FastAPI, chat works via WebSocket, auth flow complete, no console errors
  - `@agent: ui-redesign`
  - `@parallel: none` (after 4D)
  - **Validates**: Frontend fully operates against FastAPI backend, no Supabase dependencies remain, UI is modernized

---

## Phase 4B: Backend-Frontend Integration

### Parallel Group 4B-I — Type Generation (sequential)

- [x] **4B.1** Set up OpenAPI type generation pipeline: add `npm run generate-types` script that fetches `/openapi.json` from running FastAPI and generates `src/types/api.generated.ts` using `openapi-typescript`; document in README
  - `@agent: integration`
  - `@parallel: 4B-I` (sequential)

- [x] **4B.2** Replace all manually-written API response types in frontend with imports from `api.generated.ts` — audit every file in `src/services/` and `src/hooks/` to ensure no manual type duplication exists
  - `@agent: integration`
  - `@parallel: 4B-I` (after 4B.1)

### Parallel Group 4B-II — Error & Contract Alignment (launch simultaneously)

- [x] **4B.3** Implement standardized `ErrorResponse` Pydantic model in `app/schemas/common.py`; update all FastAPI exception handlers in `app/core/exceptions.py` to return consistent `{error, message, details}` JSON shape for 400/401/403/404/422/500
  - `@agent: integration`
  - `@parallel: 4B-II`

- [x] **4B.4** Implement frontend API client error interceptors in `src/services/api.ts`: 401 → attempt token refresh, redirect to `/auth` if expired; 422 → parse `details` into `ValidationError` with field mapping; 500 → toast "Something went wrong"; network error → "Connection lost" with auto-retry (3 attempts, exponential backoff)
  - `@agent: integration`
  - `@parallel: 4B-II`

- [x] **4B.5** Configure data shape alignment: add `model_config = ConfigDict(from_attributes=True)` to all Pydantic schemas; decide on `alias_generator=to_camel` vs consistent `snake_case`; apply across all response schemas; regenerate types and verify frontend compiles
  - `@agent: integration`
  - `@parallel: 4B-II`

- [x] **4B.6** Implement reusable `<ErrorState>`, `<EmptyState>`, and `<LoadingSkeleton>` components in `src/components/ui/`; audit all 20+ pages and data-fetching widgets to ensure every one uses loading skeleton, empty state, and error state with retry button
  - `@agent: integration`
  - `@parallel: 4B-II`

- [x] **4B.7** Create WebSocket event type validation on frontend in `src/services/websocket.ts` using Zod schemas that mirror backend Pydantic WS event models; ensure exhaustive `switch` handling of all event types in chat manager — TypeScript compiler error on unhandled case
  - `@agent: integration`
  - `@parallel: 4B-II`

- [x] **4B.8** Configure environment variables: create `.env.development` and `.env.production` for frontend (`VITE_API_URL`, `VITE_API_WS_URL`); create `.env.example` for backend (`DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`, `CORS_ORIGINS`); verify CORS works in dev (localhost:5173 → localhost:8000)
  - `@agent: integration`
  - `@parallel: 4B-II`

### Parallel Group 4B-III — Integration Tests (sequential)

- [x] **4B.9** Write backend integration tests in `tests/integration/`: auth flow (register → login → access protected route → refresh expired token → get 401), client CRUD with advisor scoping (advisor A cannot see advisor B's clients), chat WebSocket message round-trip (connect → send → receive stream events → verify persisted)
  - `@agent: integration`
  - `@parallel: 4B-III` (sequential)

- [x] **4B.10** Write Playwright end-to-end tests in `tests/e2e/`: `login.spec.ts` (login → dashboard loads with KPI data), `clients.spec.ts` (navigate → list renders → click detail → data loads), `chat.spec.ts` (open sidebar → send message → streaming response appears → action card clickable), `error-states.spec.ts` (mock API failure → error state renders → click retry → data loads)
  - `@agent: integration`
  - `@parallel: 4B-III` (after 4B.9)

- [x] **4B.11** Set up CI pipeline step (GitHub Actions or similar): run `npm run generate-types`, check if `api.generated.ts` has uncommitted changes (contract drift), run Playwright e2e tests — fail build if types drifted or e2e tests fail
  - `@agent: integration`
  - `@parallel: 4B-III` (after 4B.10)
  - **Validates**: Frontend and backend are fully aligned — types match, errors are handled, WebSocket protocol is validated, all states render correctly, no integration gaps at runtime

---

## Phase 5: Polish & Cutover

### Parallel Group 5A (launch simultaneously)

- [x] **5.1** Create data migration script in `scripts/migrate_data.py`: connect to Supabase PostgreSQL (source), export all table data, import to new PostgreSQL instance (target); validate row counts per table
  - `@agent: backend-architect`
  - `@parallel: 5A`

- [x] **5.2** Performance testing: measure API response times (p50/p95/p99), WebSocket throughput (messages/sec), agent response latency (time-to-first-token, total response time); document in `docs/performance.md`
  - `@agent: integration`
  - `@parallel: 5A`

- [x] **5.3** Security audit: verify JWT tokens use HS256/RS256 with strong secret, all SQL queries use parameterized inputs (SQLAlchemy), rate limiting active on auth endpoints, all user inputs validated by Pydantic schemas
  - `@agent: backend-architect`
  - `@parallel: 5A`

- [x] **5.4** Documentation: verify FastAPI auto-generates Swagger docs at `/docs`; create agent capability reference in `docs/agents.md`; create deployment guide in `docs/deploy.md`
  - `@agent: integration`
  - `@parallel: 5A`
  - **Validates**: System is production-ready, data migrated, performance acceptable

---

## Dependencies & Parallelization Summary

```
Phase 1 (Backend Foundation) — backend-architect agent
    ├── 1A: 1.1 scaffold → then 1.3-1.9 models in PARALLEL (7 agents)
    ├── 1.10 Alembic (waits for all models)
    ├── 1B: 1.11→1.12→1.13→1.14 auth (sequential)
    ├── 1C: 1.15-1.22 CRUD endpoints in PARALLEL (8 agents)
    └── 1D: 1.23-1.24 tests in PARALLEL (2 agents)

Phase 2 (Agent System) — ai-orchestration + nlp-pipeline agents
    ├── 2A: 2.1→2.2→2.3 foundation (sequential, ai-orchestration)
    ├── 2B: 2.4-2.11 agents in PARALLEL (8 agents, ai-orchestration)
    ├── 2C: 2.12→2.13→2.14 orchestration (sequential, ai-orchestration)
    └── 2D: 2.15-2.18 NLP in PARALLEL (4 agents, nlp-pipeline)
         └── 2.19→2.20 pipeline + tests (sequential, nlp-pipeline)
    NOTE: 2B and 2D can run SIMULTANEOUSLY (different agents)

Phase 3 (Chat System) — chat-system agent
    ├── 3A: 3.1→3.2 WebSocket setup (sequential)
    ├── 3B: 3.3-3.5 in PARALLEL (3 agents)
    └── 3C: 3.6→3.7→3.8→3.9 features + tests (sequential)

Phase 4 (Frontend UI) — ui-redesign agent
    ├── 4A: 4.1→4.2→4.3→4.4 API layer (sequential)
    ├── 4B: 4.5-4.8 layout in PARALLEL (4 agents)
    ├── 4C: 4.9→4.10→4.11→4.12 chat UI (sequential)
    └── 4D: 4.13-4.16 polish in PARALLEL (4 agents) → 4.17 smoke test

Phase 4B (Integration) — integration agent
    ├── 4B-I: 4B.1→4B.2 type generation (sequential)
    ├── 4B-II: 4B.3-4B.8 in PARALLEL (6 agents)
    └── 4B-III: 4B.9→4B.10→4B.11 tests + CI (sequential)

Phase 5 (Polish) — mixed agents
    └── 5A: 5.1-5.4 in PARALLEL (4 agents, mixed)
```

## Agent Assignment Summary

| Agent ID | Subagent | Tasks | Count | Focus |
|----------|----------|-------|-------|-------|
| `backend-architect` | `general-purpose` (opus) | 1.1–1.24, 5.1, 5.3 | 26 | FastAPI, PostgreSQL, SQLAlchemy, Auth, CRUD APIs, data migration, security |
| `ai-orchestration` | `general-purpose` (opus) | 2.1–2.14 | 14 | OpenAI GPT, 8 specialized agents, orchestrator, memory, delegation |
| `nlp-pipeline` | `general-purpose` (sonnet) | 2.15–2.20 | 6 | Intent classification, entity extraction, sentiment, query parsing |
| `chat-system` | `general-purpose` (sonnet) | 3.1–3.9 | 9 | WebSocket, real-time chat, conversation management, rich messages |
| `ui-redesign` | `general-purpose` (opus) | 4.1–4.17 | 17 | Nav rail, chat sidebar, API migration, dashboard, animations, theme |
| `integration` | `general-purpose` (sonnet) | 4B.1–4B.11, 5.2, 5.4 | 13 | Type generation, error contracts, e2e tests, CI, perf testing, docs |
| **Total** | | | **85** | |

### Maximum Parallelism Per Phase

| Phase | Max Concurrent Agents | Tasks in Parallel |
|-------|----------------------|-------------------|
| 1A-models | 7 | 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9 |
| 1C | 8 | 1.15, 1.16, 1.17, 1.18, 1.19, 1.20, 1.21, 1.22 |
| 2B + 2D | 12 | 2.4–2.11 (ai-orchestration) + 2.15–2.18 (nlp-pipeline) |
| 4B + 4D | 10 | 4.5–4.8 (ui-redesign) + 4B.3–4B.8 (integration) |
| 5A | 4 | 5.1–5.4 (mixed agents) |
