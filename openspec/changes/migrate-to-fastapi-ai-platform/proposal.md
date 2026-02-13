# Proposal: migrate-to-fastapi-ai-platform

## Summary

Migrate Wealth Navigator AI from a Supabase-centric architecture (Edge Functions + Lovable AI Gateway + Gemini) to a production-grade **Python/FastAPI backend** with **PostgreSQL**, **OpenAI GPT-powered multi-agent system**, **end-to-end agentic chat**, **NLP pipeline**, and a **redesigned UI/UX**.

## Motivation

The current architecture relies heavily on:
- **Supabase Edge Functions** (Deno) for all business logic and AI orchestration
- **Lovable AI Gateway** proxying to Google Gemini models
- **No dedicated backend** — the frontend calls Supabase directly for data and edge functions for AI
- **Limited agent architecture** — AI features are siloed per edge function with no inter-agent coordination
- **Basic chat** — portfolio-copilot streams responses but lacks memory, tool use, and agentic workflows

### Why Migrate?

1. **OpenAI GPT integration** — User has an OpenAI API key; GPT-4o/GPT-4o-mini provide superior function calling, structured outputs, and conversation management
2. **Production backend** — FastAPI provides proper API versioning, middleware, background tasks, WebSocket support, dependency injection, and testability
3. **Agent orchestration** — A proper agent framework enables multi-step reasoning, tool use, memory, and inter-agent delegation
4. **NLP pipeline** — Structured entity extraction, intent classification, and sentiment analysis for chat and client communications
5. **PostgreSQL ownership** — Direct PostgreSQL gives full control over schema, migrations, stored procedures, and eliminates Supabase vendor lock-in
6. **UI modernization** — Current layout is functional but dense; needs a cleaner, more modern wealth management experience
7. **Seamless backend-frontend integration** — The backend and UI must be tightly integrated with a shared API contract, consistent type definitions, and end-to-end validation so there are zero integration gaps at runtime

## Agent Team

This migration requires expertise across multiple domains. The following **agent team** is proposed, each responsible for exploring and executing a specific vertical:

---

### Agent 1: Backend Architect Agent
**Role**: Design and build the FastAPI backend, PostgreSQL database, and API layer
**Responsibilities**:
- FastAPI project structure with proper layering (routers, services, repositories, models)
- SQLAlchemy ORM models mirroring the existing 55+ table Supabase schema
- Alembic migration system for PostgreSQL
- Authentication/authorization (JWT-based, replacing Supabase Auth)
- Row-Level Security equivalent via middleware/query filters
- WebSocket endpoints for real-time updates
- API versioning (`/api/v1/`)
- Background task queue (Celery or FastAPI BackgroundTasks)
- Health checks, logging, error handling
- Docker containerization

**Key Decisions**:
- Replace all 8 Supabase Edge Functions with FastAPI route handlers
- Migrate from Supabase Auth to custom JWT auth (or integrate with an auth provider)
- Use SQLAlchemy async for non-blocking database access

---

### Agent 2: AI & Agent Orchestration Agent
**Role**: Build the end-to-end agentic AI system using OpenAI GPT
**Responsibilities**:
- Multi-agent orchestration framework with agent registry
- Replace Gemini calls with OpenAI GPT-4o / GPT-4o-mini
- Agent definitions with specialized system prompts:
  1. **Portfolio Intelligence Agent** — portfolio analysis, drift detection, rebalancing
  2. **CIO Strategy Agent** — macro analysis, investment strategy, sector allocation
  3. **Advisor Assistant Agent** — client recommendations, engagement, relationship intelligence
  4. **Compliance Sentinel Agent** — regulatory monitoring, KYC alerts, audit trail
  5. **Tax Optimizer Agent** — tax-loss harvesting, capital gains optimization
  6. **Meeting Intelligence Agent** — meeting prep, summary generation, action items
  7. **Growth Engine Agent** — client prioritization, churn prediction, lead scoring
  8. **Funding Risk Agent** — cash flow analysis, settlement risk, withdrawal patterns
- Tool/function calling with OpenAI's function calling API
- Agent memory (conversation history + long-term context)
- Inter-agent delegation (Agent A can ask Agent B for analysis)
- Streaming responses via WebSocket
- Agent supervisor/router that classifies user intent and routes to the right agent

**Key Decisions**:
- Use OpenAI's native function calling (not LangChain) for transparency and control
- Implement agent memory with PostgreSQL-backed conversation store
- Support both synchronous API responses and streaming WebSocket chat

---

### Agent 3: NLP Pipeline Agent
**Role**: Build natural language processing capabilities for chat and communications
**Responsibilities**:
- **Intent classification** — Classify user messages into intents (portfolio_query, client_lookup, risk_analysis, general_chat, compliance_check, etc.)
- **Entity extraction** — Extract entities from messages (client names, ticker symbols, amounts, dates, account numbers)
- **Sentiment analysis** — Analyze client communications for sentiment scoring (replacing current basic sentiment_logs)
- **Conversation context management** — Track multi-turn conversations with context windows
- **Query understanding** — Parse natural language into structured queries (e.g., "Show me clients with AUM over 50 lakhs" → SQL filter)
- **Response formatting** — Structure agent responses with rich formatting (tables, charts data, action buttons)
- **Language detection** — Support for multilingual inputs
- Use OpenAI embeddings for semantic search across client notes, communications, and documents

**Key Decisions**:
- Use GPT-4o-mini for lightweight NLP tasks (intent, entities) to minimize cost
- Use GPT-4o for complex reasoning and multi-step analysis
- Implement a prompt template system for consistent NLP outputs

---

### Agent 4: Chat & Conversation Agent
**Role**: Build the end-to-end agentic chat experience
**Responsibilities**:
- WebSocket-based real-time chat system
- Conversation session management (create, resume, archive)
- Message threading and history
- Rich message types (text, tables, charts, action cards, confirmations)
- Typing indicators and streaming token display
- Chat command system (slash commands like `/analyze`, `/rebalance`, `/draft-email`)
- Proactive agent suggestions (agent notices patterns and suggests actions)
- Multi-modal inputs (text + file upload for document analysis)
- Chat-to-action pipeline (agent recommendation → one-click execution)
- Conversation search and export

**Key Decisions**:
- WebSocket for streaming, REST for history/management
- Store conversations in PostgreSQL with full-text search
- Support both embedded chat widget and full-page copilot view

---

### Agent 5: UI/UX Redesign Agent
**Role**: Redesign the frontend layout, styling, and user experience
**Responsibilities**:
- **Layout redesign**:
  - Modernize sidebar navigation (collapsible icon rail + expanded drawer)
  - Redesign header (remove market ticker clutter, add smart search)
  - Implement dashboard grid with drag-and-drop widget customization
  - Add command palette (Cmd+K) for quick navigation
- **Styling overhaul**:
  - Refine the gold/dark theme for a more premium, modern feel
  - Improve typography hierarchy and spacing
  - Add subtle animations and transitions (Framer Motion)
  - Improve data density — better tables, compact views, expandable rows
- **Chat UI redesign**:
  - Persistent chat sidebar (like Copilot) instead of separate page
  - Rich message rendering (markdown, tables, charts inline)
  - Agent avatar and identity in chat
  - Quick action chips below messages
  - Conversation list with search
- **Dashboard modernization**:
  - KPI cards with sparklines
  - Unified notification center
  - Client quick-view panels
  - Portfolio heat maps
- **Component library updates**:
  - Keep Radix UI + Tailwind foundation
  - Add Framer Motion for animations
  - Improve responsive design for tablets
- **Connect frontend to new FastAPI backend**:
  - Replace all Supabase client calls with API calls
  - Replace Supabase Auth with JWT token management
  - Update React Query hooks to point to FastAPI endpoints

**Key Decisions**:
- Keep React + Vite + Tailwind + Radix UI stack (no framework change)
- Add Framer Motion for polish
- Implement API service layer to abstract backend communication

---

### Agent 6: Integration & Contract Agent
**Role**: Ensure the FastAPI backend and React frontend are seamlessly integrated with zero runtime gaps
**Responsibilities**:
- **Shared API contract**: Generate TypeScript types from FastAPI Pydantic schemas (via `openapi-typescript` from the auto-generated OpenAPI spec) so frontend types always match backend responses exactly
- **API service layer validation**: Verify every frontend service call maps to a real backend endpoint with correct HTTP method, path, request body, and response shape
- **Auth flow integration**: Validate JWT token lifecycle end-to-end — login → store → attach to requests → auto-refresh → logout — with proper error handling for 401/403 across all pages
- **WebSocket contract**: Ensure the frontend WebSocket manager sends/receives messages matching the exact protocol defined in the backend (event types, payload shapes, error codes)
- **Error handling consistency**: Backend error responses (validation errors, 404s, 500s) are properly caught and displayed in the UI with user-friendly messages — no raw error objects or silent failures
- **Loading/empty/error states**: Every page and component that fetches data handles loading skeletons, empty states, and error states correctly against the real API
- **CORS and environment config**: Verify CORS allows all frontend origins, environment variables are correctly wired (API base URL, WebSocket URL), and dev/prod configs work
- **End-to-end smoke tests**: Automated test suite that boots both backend and frontend, runs through critical user flows (login → view clients → open chat → send message → receive stream → create order), and catches integration regressions
- **Data shape alignment**: Ensure that every React Query hook's return type matches the actual API response — no `any` types, no manual casting, no mismatched field names (e.g., backend returns `client_name` but frontend expects `clientName`)
- **Real-time sync**: Validate that WebSocket events (chat messages, notifications) correctly update the React Query cache and UI state without requiring manual page refresh

**Key Decisions**:
- Auto-generate frontend types from OpenAPI spec — never manually duplicate type definitions
- Run integration tests as part of CI to catch contract drift immediately
- Use a shared `.env` configuration for API URLs across frontend and backend dev environments

---

## Scope & Capabilities

| # | Capability | Agent | Priority |
|---|-----------|-------|----------|
| 1 | FastAPI Backend Core | Backend Architect | P0 |
| 2 | PostgreSQL Schema Migration | Backend Architect | P0 |
| 3 | Authentication & Authorization | Backend Architect | P0 |
| 4 | OpenAI GPT Agent System | AI & Agent Orchestration | P0 |
| 5 | Agent Router & Supervisor | AI & Agent Orchestration | P0 |
| 6 | NLP Intent & Entity Pipeline | NLP Pipeline | P1 |
| 7 | Agentic Chat System | Chat & Conversation | P0 |
| 8 | Chat WebSocket Streaming | Chat & Conversation | P0 |
| 9 | UI Layout Redesign | UI/UX Redesign | P1 |
| 10 | Chat UI Redesign | UI/UX Redesign | P0 |
| 11 | Dashboard Modernization | UI/UX Redesign | P1 |
| 12 | Frontend API Migration | UI/UX Redesign | P0 |
| 13 | Sentiment & NLP Analysis | NLP Pipeline | P1 |
| 14 | Agent Memory & Context | AI & Agent Orchestration | P1 |
| 15 | Conversation Management | Chat & Conversation | P1 |
| 16 | Backend-Frontend Integration Contract | Integration & Contract | P0 |
| 17 | End-to-End Integration Testing | Integration & Contract | P0 |
| 18 | Type Generation & Data Shape Alignment | Integration & Contract | P0 |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  (Vite + Tailwind + Radix UI + Framer Motion)           │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │ Dashboard │  │  Pages   │  │   Chat UI (Sidebar)    │ │
│  │ Widgets   │  │  Views   │  │   WebSocket + REST     │ │
│  └──────────┘  └──────────┘  └────────────────────────┘ │
└────────────────────┬────────────────┬───────────────────┘
                     │ REST API       │ WebSocket
                     ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                 FastAPI Backend                           │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ API Routers │  │ Auth/Authz   │  │ WebSocket Mgr  │  │
│  │ /api/v1/*   │  │ JWT + RBAC   │  │ Chat Streams   │  │
│  └──────┬──────┘  └──────────────┘  └───────┬────────┘  │
│         │                                     │          │
│  ┌──────▼──────────────────────────────────────▼───────┐ │
│  │              Service Layer                           │ │
│  │  Clients│Portfolios│Orders│Funding│Compliance│...   │ │
│  └──────┬──────────────────────────────────────────────┘ │
│         │                                                │
│  ┌──────▼──────────────────────────────────────────────┐ │
│  │           Agent Orchestration Engine                  │ │
│  │                                                      │ │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │ │
│  │  │ Router/ │  │  Agent   │  │    NLP Pipeline    │   │ │
│  │  │Supervisor│  │ Registry │  │ Intent│Entity│Sent│   │ │
│  │  └────┬────┘  └────┬─────┘  └───────────────────┘   │ │
│  │       │             │                                 │ │
│  │  ┌────▼─────────────▼────────────────────────────┐   │ │
│  │  │              Agent Pool                        │   │ │
│  │  │ Portfolio│CIO│Advisor│Compliance│Tax│Meeting   │   │ │
│  │  │ Growth Engine│Funding Risk│Campaign            │   │ │
│  │  └────┬───────────────────────────────────────────┘   │ │
│  │       │                                               │ │
│  │  ┌────▼────┐  ┌──────────┐  ┌──────────────────┐    │ │
│  │  │ OpenAI  │  │  Tools/  │  │  Agent Memory     │    │ │
│  │  │ GPT API │  │ Functions│  │  (PostgreSQL)     │    │ │
│  │  └─────────┘  └──────────┘  └──────────────────┘    │ │
│  └──────────────────────────────────────────────────────┘ │
│         │                                                │
│  ┌──────▼──────────────────────────────────────────────┐ │
│  │           Repository Layer (SQLAlchemy)              │ │
│  └──────┬──────────────────────────────────────────────┘ │
└─────────┼────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐
│    PostgreSQL DB     │
│  (Migrated Schema)   │
│  55+ Tables          │
│  Alembic Migrations  │
└─────────────────────┘
```

## Migration Strategy

### Phase 1: Foundation (Backend + Auth + DB)
Set up FastAPI project, migrate PostgreSQL schema, implement JWT auth, create core CRUD APIs.

### Phase 2: Agent System (AI + NLP + Chat)
Build agent orchestration engine, integrate OpenAI GPT, implement NLP pipeline, create WebSocket chat.

### Phase 3: Frontend Migration (API + UI)
Connect frontend to FastAPI, replace Supabase calls, redesign UI layout, build new chat sidebar.

### Phase 4: Polish & Cutover
End-to-end testing, data migration scripts, performance tuning, deprecate Supabase functions.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema migration data loss | High | Run parallel systems during migration; validate row counts |
| OpenAI API costs | Medium | Use GPT-4o-mini for lightweight tasks; implement rate limiting and caching |
| Auth migration breaks sessions | High | Implement token bridge; gradual migration with feature flags |
| Agent hallucination with financial data | High | Ground agents with real data tools; add validation layer |
| WebSocket scalability | Medium | Use connection pooling; implement heartbeat/reconnect |
| UI redesign scope creep | Medium | Iterative redesign; start with layout, then polish |
| Backend-frontend contract drift | High | Auto-generate TS types from OpenAPI spec; run integration tests in CI; never manually duplicate types |
| Data shape mismatch (snake_case vs camelCase) | Medium | Configure FastAPI response model aliases or middleware for consistent casing; validate with generated types |
| WebSocket protocol mismatch | High | Define protocol as shared JSON schema; validate both ends against same spec; integration test every event type |

## Out of Scope

- Mobile app development
- Third-party broker API integrations
- Real-time market data feeds
- Regulatory reporting automation
- Multi-tenancy (firm-level isolation)
