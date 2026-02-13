# Change: Make the Platform Agentic-First

## Why
The platform should feel like the AI agent is the primary interface — not a sidebar feature. Currently the chat uses WebSocket which is fragile (connection failures, reconnection complexity) and the agent has no persistent memory of user-specific context beyond the conversation window. To be truly agentic-first, the agent needs:
1. A knowledge graph per user so it can proactively surface insights and connect dots across clients, portfolios, tasks, and events.
2. Reliable HTTP-based streaming (SSE) instead of WebSocket for chat — simpler, stateless, and more reliable.
3. UI polish to remove redundancies and make the copilot the hero of the platform.

## What Changes

### 1. Replace WebSocket Chat with SSE Streaming
- New backend endpoint: `POST /api/v1/chat/stream` that accepts a message and returns `text/event-stream`
- Events: `agent_status`, `stream_token`, `stream_end`, `error`, `conversation_created`
- Frontend switches from `wsManager` to a fetch-based SSE reader
- Remove WebSocket dependency from the copilot page entirely
- Conversation CRUD stays on existing REST endpoints

### 2. User Knowledge Graph (Neo4j)
- New Neo4j service integration for per-user knowledge graphs
- Graph nodes: `User`, `Client`, `Portfolio`, `Task`, `Alert`, `Conversation`, `Event`
- Graph edges: `MANAGES`, `OWNS`, `ASSIGNED_TO`, `TRIGGERED_BY`, `DISCUSSED_IN`, `RELATED_TO`
- Backend service that syncs entity changes into the graph (event-driven, on create/update)
- Agent context enrichment: before processing a message, query the graph for relevant entities and inject into the agent's system prompt
- Enables: "What happened with Client X last week?", proactive alerts ("Client Y hasn't been contacted in 30 days")

### 3. Agentic Event Awareness
- Platform events (new task, compliance alert, portfolio drift, client interaction) are pushed to the knowledge graph
- Agents can query the graph via a new `query_knowledge_graph` tool
- Agent proactive notifications: backend can trigger agent-initiated messages based on graph patterns (e.g., stale client, overdue task)

### 4. UI Polish & Fixes
- **Tab icon**: Switch favicon from Lovable to AidenAI logo
- **Landing page**: Remove "I'm your AI wealth advisor" subtitle (Wealthyx greeting is enough), remove Bot icon next to Wealthyx name, add quick prompt suggestions
- **Copilot page**: Fix "new conversation coming twice" (dual creation from REST + WebSocket `conversation_created` event), suggest quick prompts in empty state
- **Sidebar**: Move expand toggle icon below the collapsed "A" logo instead of overlapping
- **Market ticker**: Fix live data not loading (ensure backend market endpoint is called correctly)

### 5. 3D Loading Animation (Reusable Component)
- A CSS-only 3D animated loader component (`Loader3D`) that can be used across the entire platform
- Renders a 3D rotating cube/orb with the AidenAI gold gradient theme
- Available in multiple sizes (`sm`, `md`, `lg`) and variants (`spinner`, `cube`, `orbit`)
- Replaces plain text "Loading..." and `animate-pulse` placeholders across: copilot messages loading, conversation sidebar loading, landing page metric loading, and any future data-fetching states
- Pure CSS `@keyframes` in `index.css` + a thin React component wrapper — zero JS animation overhead
- Integrated into existing `LoadingSkeleton` component and copilot streaming indicator

### 6. Dedicated Agent System (New Agents + Expanded Tools)
The existing 8 agents cover portfolio, compliance, tax, meeting, CIO, growth, funding, and general advisor. However, several platform domains have API endpoints and UI pages with no dedicated agent coverage. This change introduces **5 new specialized agents** and **3 new tool modules** to fill the gaps, plus expands the frontend `AgentSelector` to expose all agent capabilities:

- **TaskWorkflowAgent** (`task_workflow`) — Manages tasks and workflows: create/update/close tasks, assign to team members, track overdue items, suggest prioritization. Tools: `get_tasks`, `create_task`, `update_task`, `get_overdue_tasks`, `get_task_summary`
- **ReportAnalyticsAgent** (`report_analytics`) — Generates reports and analytics: portfolio performance summaries, AUM trends, commission reports, revenue breakdowns. Delegates to `cio_strategy` for macro context. Tools: `generate_report`, `get_report_templates`, `get_aum_summary`, `get_revenue_breakdown`
- **CommunicationsAgent** (`communications`) — Drafts client communications: email templates, meeting follow-ups, campaign messages, compliance notices. Tools: `draft_email`, `get_communication_history`, `send_notification`, `create_campaign_message`
- **GoalPlanningAgent** (`goal_planning`) — Financial goal management: create/track financial goals, project goal timelines, suggest investment strategies to meet targets. Tools: `get_goals`, `create_goal`, `update_goal_progress`, `project_goal_timeline`, `suggest_goal_strategy`
- **OnboardingAgent** (`onboarding`) — Client onboarding lifecycle: guide new client setup, KYC document collection, risk profiling, initial portfolio recommendations. Delegates to `compliance_sentinel` for KYC checks. Tools: `get_onboarding_status`, `start_onboarding`, `collect_documents`, `run_risk_profile`, `generate_initial_allocation`

Additionally:
- **Expanded orchestrator intent map** — 10 new intents mapped to new agents (`task_management`, `task_creation`, `report_generation` (remapped), `analytics_query`, `communication_draft`, `email_request`, `goal_tracking`, `financial_planning`, `client_onboarding`, `document_collection`)
- **Updated frontend AgentSelector** — Expose all 13 agents organized into categories (Advisory, Analysis, Operations, Growth) instead of the current 4 hardcoded options
- **New tool modules**: `task_tools.py`, `report_tools.py`, `communication_tools.py`, `goal_tools.py`, `onboarding_tools.py`
- **Cross-agent delegation**: New agents can delegate to existing agents (e.g., `onboarding` → `compliance_sentinel` for KYC, `report_analytics` → `cio_strategy` for macro data)

### 7. Cross-Feature Integration
- **Agent-aware navigation**: When the agent discusses a client, portfolio, or task, the response includes clickable deep-links (e.g., "View Client X's portfolio" → `/clients/{id}`) using existing React Router navigation
- **Knowledge graph feeds suggestions**: The landing page prompt suggestions pull from the knowledge graph (e.g., if a client has a pending alert, suggest "Review alert for Client X") instead of static role-based lists
- **SSE streaming uses graph context**: Every SSE chat request enriches the agent with the user's graph context before processing, so the agent always knows what's happening across the platform
- **Copilot ↔ Platform events**: When the user creates a task, adds a client, or triggers compliance from any page, those entities sync to the graph and the copilot's context stays fresh
- **Unified loading states**: The 3D loader is the single loading pattern across copilot streaming, data fetching, page transitions — giving a cohesive "agentic" feel

## Impact
- Affected specs: `agentic-chat` (new), `knowledge-graph` (new), `ui-polish` (new), `agent-system` (new)
- Affected code:
  - **Backend**:
    - `backend/app/api/v1/chat.py` — new `POST /chat/stream` SSE endpoint
    - `backend/app/agents/orchestrator.py` — add graph context enrichment
    - `backend/app/agents/base_agent.py` — add knowledge graph tool
    - `backend/app/agents/tools/` — new `graph_tools.py` for knowledge graph queries
    - `backend/app/services/knowledge_graph.py` — new Neo4j service
    - `backend/app/core/neo4j.py` — Neo4j connection pool
    - `backend/requirements.txt` — add `neo4j` driver
    - `backend/app/agents/task_agent.py` — new TaskWorkflowAgent
    - `backend/app/agents/report_agent.py` — new ReportAnalyticsAgent
    - `backend/app/agents/communications_agent.py` — new CommunicationsAgent
    - `backend/app/agents/goal_agent.py` — new GoalPlanningAgent
    - `backend/app/agents/onboarding_agent.py` — new OnboardingAgent
    - `backend/app/agents/tools/task_tools.py` — task CRUD and query tools
    - `backend/app/agents/tools/report_tools.py` — report generation and analytics tools
    - `backend/app/agents/tools/communication_tools.py` — email/communication tools
    - `backend/app/agents/tools/goal_tools.py` — goal management tools
    - `backend/app/agents/tools/onboarding_tools.py` — onboarding workflow tools
    - `backend/app/agents/__init__.py` — register new agents and import new tool modules
    - `backend/app/agents/orchestrator.py` — add new intent→agent mappings
  - **Frontend**:
    - `src/services/chatStream.ts` — new SSE-based chat streaming service
    - `src/components/ai/AICopilotPage.tsx` — replace WebSocket with SSE, fix duplicate conversation, use 3D loader
    - `src/components/ai/AILandingPage.tsx` — remove subtitle, remove Bot icon, graph-powered suggestions, 3D loader for metrics
    - `src/components/ui/loader-3d.tsx` — new 3D animated loader component (sm/md/lg, spinner/cube/orbit)
    - `src/components/ui/loading-skeleton.tsx` — integrate 3D loader variant
    - `src/components/layout/Sidebar.tsx` — move expand toggle below logo
    - `src/index.css` — 3D keyframe animations (rotate-3d, orbit, cube-spin)
    - `tailwind.config.ts` — register 3D animation utilities
    - `src/services/websocket.ts` — no longer used by chat (kept for other real-time features if any)
    - `index.html` — update favicon
    - `public/favicon.ico` — regenerate from AidenAI logo
    - `src/hooks/usePromptSuggestions.ts` — optionally pull graph-powered suggestions
    - `src/components/ai/AgentSelector.tsx` — expand from 4 hardcoded agents to all 13, grouped by category
