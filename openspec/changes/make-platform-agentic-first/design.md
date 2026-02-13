## Context

The platform has 8 specialized agents (advisor, portfolio, compliance, tax, meeting, growth, funding, CIO) communicating via WebSocket. The current architecture has no persistent user context beyond conversation history (short-term messages + summaries). The agent cannot correlate events across different platform domains (e.g., "a compliance alert fired for Client X who also has a portfolio drift of 15%").

## Goals / Non-Goals

### Goals
- Replace WebSocket chat with SSE for simpler, more reliable streaming
- Build a per-user knowledge graph in Neo4j that captures entity relationships across the platform
- Enable agents to query the knowledge graph as a tool for richer, context-aware responses
- Clean up UI inconsistencies from previous iterations

### Non-Goals
- No changes to agent orchestration logic or NLP pipeline
- No real-time push notifications from agent to user (future work — only enriched query-time context for now)
- No changes to authentication or role system
- No mobile-responsive changes
- No third-party animation libraries (Three.js, Lottie, etc.) — CSS-only for the 3D loader

## Decisions

### 1. SSE via POST instead of WebSocket for chat
- **Decision**: `POST /api/v1/chat/stream` returns `text/event-stream`. The frontend reads via `fetch()` + `ReadableStream` with event parsing.
- **Rationale**: WebSocket adds connection management complexity (reconnection, ping/pong, authentication via query params). SSE over POST is stateless per-request, uses standard HTTP auth headers, survives network changes better, and is simpler to debug. The chat pattern is request-response (user sends message → agent streams back) which doesn't need a persistent bidirectional channel.
- **Alternatives considered**: Keeping WebSocket (rejected — fragile, complex reconnection logic), WebTransport (rejected — limited browser support), long polling (rejected — high latency).

### 2. Neo4j for knowledge graph
- **Decision**: Use Neo4j as a dedicated graph database alongside PostgreSQL. Each user gets a subgraph. Entities are synced from PostgreSQL on create/update events.
- **Rationale**: User asked for a knowledge graph specifically. Neo4j excels at relationship traversal ("find all clients whose portfolios drifted > 10% AND have overdue tasks"). PostgreSQL can do graph-like queries with CTEs but gets unwieldy for multi-hop traversals.
- **Connection**: Use the official `neo4j` async Python driver with a connection pool. Neo4j Aura (cloud) or local Docker instance.
- **Alternatives considered**: PostgreSQL-only with JSON adjacency lists (rejected — user preference for Neo4j), in-memory graph (rejected — no persistence).

### 3. Knowledge graph schema
- **Decision**: Use labeled property graph with these node types and relationships:
  ```
  (User)-[:MANAGES]->(Client)
  (Client)-[:OWNS]->(Portfolio)
  (User)-[:ASSIGNED_TO]->(Task)
  (Task)-[:RELATED_TO]->(Client)
  (Alert)-[:TRIGGERED_FOR]->(Client)
  (Conversation)-[:ABOUT]->(Client)
  (Event)-[:INVOLVES]->(Client|Portfolio|Task)
  ```
  Each node stores minimal properties (id, name, key metrics, last_updated). Full data stays in PostgreSQL — the graph is for relationship traversal.
- **Rationale**: Keeps the graph lean. Agents query the graph for "what's connected to X?" and then fetch full details from PostgreSQL.

### 4. Agent knowledge graph tool
- **Decision**: Add a `query_knowledge_graph` tool to the agent tool registry. Agents can call it with natural language or structured queries to find related entities.
- **Tool interface**: `query_knowledge_graph(user_id, query_type, entity_type, entity_id, depth)` → returns connected nodes and relationships.
- **Rationale**: Keeps the agent loop consistent — the agent decides when to query the graph, just like it decides when to call `get_client_profile`.

### 5. Event sync to graph
- **Decision**: Sync events to Neo4j via async background tasks triggered by SQLAlchemy `after_insert`/`after_update` events on key models (Client, Portfolio, Task, Conversation, ComplianceAlert).
- **Rationale**: Minimal coupling. The graph stays eventually consistent with PostgreSQL. No changes to existing API endpoints.
- **Future**: Can evolve into a proper event bus (Redis Streams, etc.) when needed.

### 6. SSE event format
- **Decision**: Use standard SSE format with named events:
  ```
  event: agent_status
  data: {"status": "thinking", "agent": "portfolio_intelligence"}

  event: stream_token
  data: {"token": "The"}

  event: stream_end
  data: {"content": "full response...", "metadata": {...}}
  ```
- **Rationale**: Named events allow the frontend to dispatch to different handlers cleanly. Standard SSE libraries can parse this natively.

### 7. 3D Loading Animation — CSS-only
- **Decision**: Build a reusable `Loader3D` React component using pure CSS 3D transforms and keyframe animations. No JavaScript animation libraries. Three variants: `spinner` (rotating ring with perspective), `cube` (3D rotating cube), `orbit` (dots orbiting a center point). Three sizes: `sm` (24px), `md` (40px), `lg` (64px). Uses the platform's gold gradient (`--gradient-gold`) and border colors for visual consistency.
- **Rationale**: CSS 3D transforms are GPU-accelerated, zero-dependency, and composable. The animation runs on the compositor thread so it never jank the main thread even during heavy data fetching. A JS library like Three.js or Lottie would be overkill for a loading indicator.
- **Implementation**: CSS `@keyframes` in `index.css` (3 new keyframes: `rotate-3d`, `cube-spin`, `orbit-dot`). Thin React wrapper in `src/components/ui/loader-3d.tsx` that picks variant + size via props. Integrates into `LoadingSkeleton` as a new `variant: '3d'` option and replaces hardcoded "Loading..." text across the app.
- **Alternatives considered**: Lottie (rejected — adds ~60KB, requires JSON animation files), Three.js (rejected — massively overkill), GIF (rejected — not theme-aware, not scalable).

### 8. Cross-feature integration strategy
- **Decision**: The new features (SSE, knowledge graph, 3D loader) integrate with existing features at these touchpoints:
  - **Agent responses → Navigation**: Agent markdown responses can include deep-links (`[View Portfolio](/portfolios/{id})`) that the `MessageRenderer` renders as React Router `<Link>` components. No new protocol — just markdown link convention.
  - **Knowledge graph → Prompt suggestions**: `usePromptSuggestions` hook gains an optional `useGraph: boolean` parameter. When enabled, it calls a new `/api/v1/chat/suggestions` endpoint that queries the graph for the user's actionable items (overdue tasks, stale clients, active alerts) and returns dynamic suggestions. Falls back to static role-based suggestions if the endpoint fails or graph is unavailable.
  - **Platform CRUD → Graph sync**: All existing API endpoints (create client, create task, etc.) continue unchanged. Graph sync happens via SQLAlchemy model events in the background — zero changes to existing frontend services or API endpoints.
  - **3D Loader → Existing components**: Replace `animate-pulse` placeholders in copilot (`Loading messages...`), conversation sidebar (`Loading...`), landing page metric cards, and streaming agent status with the `Loader3D` component. The `LoadingSkeleton` component gains `variant: '3d'` alongside existing card/table/list/detail variants.
- **Rationale**: Each integration is additive and backwards-compatible. If Neo4j is down, suggestions fall back to static. If SSE fails, the error is shown inline. If the 3D loader has a rendering issue, it degrades to a simple spinner via CSS fallback.

### 9. Dedicated agent system — 5 new agents with domain-specific tools
- **Decision**: Create 5 new agents (`task_workflow`, `report_analytics`, `communications`, `goal_planning`, `onboarding`) each with their own tool module, plus expand the orchestrator intent map and frontend AgentSelector to cover all 13 agents.
- **Rationale**: The platform has API endpoints and UI pages for tasks, reports, communications, goals, and client onboarding — but no agents to handle these domains. Users asking "create a task for Client X follow-up" get routed to the generic `advisor_assistant` which lacks task CRUD tools. Each new agent gets a focused system prompt, dedicated tools, and the ability to delegate to existing agents (e.g., `onboarding` delegates to `compliance_sentinel` for KYC).
- **Agent design pattern**: Each new agent follows the existing `BaseAgent` pattern — subclass with `name`, `description`, `system_prompt`, `tool_names`, `model`. New tool modules are separate files in `backend/app/agents/tools/` and auto-registered via `@tool` decorator imports in `__init__.py`.
- **Model selection**: Task and communications agents use `gpt-4o-mini` (simpler operations), report/goal/onboarding agents use `gpt-4o` (need deeper reasoning).
- **Alternatives considered**: Single super-agent with all tools (rejected — too many tools degrades function-calling accuracy), micro-agents per tool (rejected — too granular, adds orchestration overhead).

### 10. Frontend AgentSelector — categorized agent picker
- **Decision**: Replace the hardcoded 4-agent dropdown in `AgentSelector.tsx` with a categorized picker that groups all 13 agents into 4 categories: **Advisory** (General Assistant, Client Advisor, Meeting Prep), **Analysis** (Portfolio Analyst, CIO Strategy, Tax Optimizer, Report & Analytics), **Operations** (Task Manager, Compliance, Funding Risk, Goal Planner, Onboarding), **Growth** (Growth Engine, Communications).
- **Rationale**: The current frontend only exposes 4 agents (general, portfolio, compliance, research) out of 8 backend agents, and will grow to 13. A flat list of 13 agents is overwhelming — categories help users find the right agent. The `research` frontend type doesn't even map to a real backend agent.
- **Implementation**: Fetch available agents from `GET /api/v1/agents` (new endpoint from orchestrator's `get_agent_info()`) rather than hardcoding. Frontend groups by a `category` field added to agent metadata.

### 11. Cross-agent delegation pattern
- **Decision**: New agents can delegate to existing agents using `BaseAgent.delegate(agent_name, sub_query, context, db)`. Delegation is explicit — the parent agent decides when to call another agent's capabilities. Max delegation depth is 1 (no recursive delegation chains).
- **Rationale**: Keeps agents composable. The `onboarding` agent doesn't need to duplicate compliance logic — it delegates to `compliance_sentinel` for KYC checks. The `report_analytics` agent delegates to `cio_strategy` for macro context rather than duplicating market tools.
- **Safety**: Delegation depth is capped at 1 to prevent runaway agent loops. The base agent checks `context.metadata.get("delegation_depth", 0)` before allowing a delegate call.

## Risks / Trade-offs

- **Neo4j operational overhead**: Adds another database to manage.
  - **Mitigation**: Start with Neo4j Aura free tier or a Docker container. The graph is a secondary index — if Neo4j is down, agents still work, just without graph context.

- **Graph sync lag**: Events may arrive at the graph slightly after PostgreSQL commits.
  - **Mitigation**: For the agent use case, eventual consistency is fine. The graph enriches context, it's not the source of truth.

- **SSE browser limits**: Browsers limit concurrent SSE connections per domain (~6).
  - **Mitigation**: Only one SSE connection per chat message (request-scoped). Not a long-lived connection.

- **Agent routing accuracy with 13 agents**: More agents means more potential for mis-routing.
  - **Mitigation**: NLP intent classification is improved by having clear, non-overlapping intent categories. Each new agent has distinct keywords. Confidence threshold (0.4) falls back to `advisor_assistant` which can handle general queries. Users can also manually select an agent via the AgentSelector.

- **Tool proliferation**: 5 new tool modules add ~25 new tools to the registry.
  - **Mitigation**: Tools are only loaded into agents that need them (via `tool_names` list). The global registry is just for lookup — agents only see their declared tools in the OpenAI function-calling payload.

## Migration Plan

1. Build SSE endpoint alongside existing WebSocket (both work simultaneously)
2. Switch frontend to SSE
3. Deprecate WebSocket chat endpoint (keep for potential future real-time features)
4. Build Neo4j service and graph schema
5. Add sync hooks to models
6. Add `query_knowledge_graph` agent tool
7. Create new tool modules (task, report, communication, goal, onboarding)
8. Create 5 new agents with tools and system prompts
9. Expand orchestrator intent map for new agents
10. Update frontend AgentSelector with all 13 agents
11. Verify agents can use graph context in responses
12. Verify cross-agent delegation works correctly

## Open Questions
- None — all decisions resolved via user input.
