## 1. SSE Chat Streaming (Backend)
- [x] 1.1 Create `POST /api/v1/chat/stream` endpoint in `backend/app/api/v1/chat.py` that returns `text/event-stream` — accepts `{content, conversation_id?, agent_type?}`, creates conversation if needed, runs agent pipeline, streams SSE events (`agent_status`, `stream_token`, `stream_end`, `error`, `conversation_created`)
- [x] 1.2 Wire the SSE endpoint into the existing orchestrator's `process_stream()` generator
- [x] 1.3 Ensure conversation/message persistence (save user message before streaming, save assistant message on stream end)

## 2. SSE Chat Streaming (Frontend)
- [x] 2.1 Create `src/services/chatStream.ts` — SSE client using `fetch()` + `ReadableStream` event parser, returns an async iterator of typed events matching existing `WSEvent` types
- [x] 2.2 Rewrite `AICopilotPage.tsx` to use `chatStream.sendMessage()` instead of `wsManager`, remove all WebSocket setup/teardown
- [x] 2.3 Fix duplicate "new conversation" issue — only create conversation via the SSE endpoint (remove separate `createConversationMutation` + WebSocket `conversation_created` dual path)
- [x] 2.4 Verify streaming, error handling, and conversation creation work end-to-end

## 3. Knowledge Graph Infrastructure (Backend)
- [x] 3.1 Add `neo4j` async driver to `backend/requirements.txt`
- [x] 3.2 Create `backend/app/core/neo4j.py` — connection pool, startup/shutdown lifecycle, `get_neo4j_session()` dependency
- [x] 3.3 Create `backend/app/services/knowledge_graph.py` — `KnowledgeGraphService` with methods: `upsert_node()`, `upsert_edge()`, `query_neighbors()`, `query_path()`, `get_user_context()`
- [x] 3.4 Define graph schema constraints/indexes in Neo4j (unique node IDs, indexes on user_id)

## 4. Knowledge Graph Sync
- [x] 4.1 Create `backend/app/services/graph_sync.py` — async functions to sync entities from PostgreSQL to Neo4j: `sync_client()`, `sync_portfolio()`, `sync_task()`, `sync_alert()`, `sync_conversation()`
- [x] 4.2 Wire sync functions to SQLAlchemy `after_insert`/`after_update` events on Client, Portfolio (position changes), Task, Conversation models via background tasks
- [x] 4.3 Add a one-time `POST /api/v1/admin/sync-graph` endpoint to backfill existing data into Neo4j

## 5. Agent Knowledge Graph Tool
- [x] 5.1 Create `backend/app/agents/tools/graph_tools.py` — register `query_knowledge_graph` tool: accepts `(user_id, entity_type, entity_id?, query?, depth?)`, returns related entities from Neo4j
- [x] 5.2 Add `query_knowledge_graph` to relevant agent `tool_names` lists (advisor_agent, portfolio_agent, compliance_agent, growth_agent, and all new agents)
- [x] 5.3 Enrich agent context in orchestrator: before routing, query the graph for user's recent activity and inject a brief context summary into agent's system prompt

## 6. New Agent Tool Modules
- [x] 6.1 Create `backend/app/agents/tools/task_tools.py` — register tools: `get_tasks(user_id, status?, client_id?)`, `create_task(user_id, title, description, client_id?, due_date?, priority?)`, `update_task(task_id, status?, assignee?)`, `get_overdue_tasks(user_id)`, `get_task_summary(user_id)` — all query/mutate the existing Task model via SQLAlchemy
- [x] 6.2 Create `backend/app/agents/tools/report_tools.py` — register tools: `generate_report(user_id, report_type, date_range?, client_id?)`, `get_report_templates()`, `get_aum_summary(user_id)`, `get_revenue_breakdown(user_id, period?)` — query existing portfolio/funding models for aggregations
- [x] 6.3 Create `backend/app/agents/tools/communication_tools.py` — register tools: `draft_email(recipient_name, subject, context, tone?)`, `get_communication_history(client_id, limit?)`, `send_notification(user_id, message, channel?)`, `create_campaign_message(campaign_id, template, variables?)` — leverage existing Communication/Campaign models
- [x] 6.4 Create `backend/app/agents/tools/goal_tools.py` — register tools: `get_goals(client_id)`, `create_goal(client_id, name, target_amount, target_date, type?)`, `update_goal_progress(goal_id, current_amount?)`, `project_goal_timeline(goal_id)`, `suggest_goal_strategy(goal_id)` — use existing Goal model
- [x] 6.5 Create `backend/app/agents/tools/onboarding_tools.py` — register tools: `get_onboarding_status(client_id)`, `start_onboarding(client_name, email, phone?)`, `collect_documents(client_id, doc_type)`, `run_risk_profile(client_id)`, `generate_initial_allocation(client_id, risk_score)` — orchestrate across Client + Compliance models
- [x] 6.6 Import all 5 new tool modules in `backend/app/agents/__init__.py` so `@tool` decorators register at startup

## 7. New Specialized Agents
- [x] 7.1 Create `backend/app/agents/task_agent.py` — `TaskWorkflowAgent(name="task_workflow")` with system prompt for task management, prioritization, and workflow optimization. Tools: `[get_tasks, create_task, update_task, get_overdue_tasks, get_task_summary, query_knowledge_graph]`. Model: `gpt-4o-mini`
- [x] 7.2 Create `backend/app/agents/report_agent.py` — `ReportAnalyticsAgent(name="report_analytics")` with system prompt for generating reports, summarizing AUM/revenue, and trend analysis. Tools: `[generate_report, get_report_templates, get_aum_summary, get_revenue_breakdown, get_sector_allocation, query_knowledge_graph]`. Model: `gpt-4o`. Can delegate to `cio_strategy` for macro context
- [x] 7.3 Create `backend/app/agents/communications_agent.py` — `CommunicationsAgent(name="communications")` with system prompt for drafting professional client communications, follow-ups, and campaign messages. Tools: `[draft_email, get_communication_history, send_notification, create_campaign_message, get_client_profile, query_knowledge_graph]`. Model: `gpt-4o-mini`
- [x] 7.4 Create `backend/app/agents/goal_agent.py` — `GoalPlanningAgent(name="goal_planning")` with system prompt for financial goal management, projection, and strategy. Tools: `[get_goals, create_goal, update_goal_progress, project_goal_timeline, suggest_goal_strategy, get_client_portfolio, query_knowledge_graph]`. Model: `gpt-4o`
- [x] 7.5 Create `backend/app/agents/onboarding_agent.py` — `OnboardingAgent(name="onboarding")` with system prompt for guiding new client onboarding end-to-end. Tools: `[get_onboarding_status, start_onboarding, collect_documents, run_risk_profile, generate_initial_allocation, check_kyc_status, query_knowledge_graph]`. Model: `gpt-4o`. Can delegate to `compliance_sentinel` for KYC
- [x] 7.6 Update `backend/app/agents/__init__.py` — import and register all 5 new agents in `initialize_agents()`
- [x] 7.7 Update `backend/app/agents/orchestrator.py` — add new intents to `INTENT_AGENT_MAP`: `task_management→task_workflow`, `task_creation→task_workflow`, `report_generation→report_analytics` (remap from cio_strategy), `analytics_query→report_analytics`, `communication_draft→communications`, `email_request→communications`, `goal_tracking→goal_planning`, `financial_planning→goal_planning`, `client_onboarding→onboarding`, `document_collection→onboarding`

## 8. Frontend Agent Selector Expansion
- [x] 8.1 Create `GET /api/v1/agents` backend endpoint in `backend/app/api/v1/chat.py` — returns all registered agents with `{name, description, category}` from orchestrator's `get_agent_info()`, add `category` field to agent metadata
- [x] 8.2 Add `category` property to `BaseAgent` class — values: `advisory`, `analysis`, `operations`, `growth`. Set appropriate category on all 13 agents
- [x] 8.3 Update `AgentSelector.tsx` — fetch agents from `/api/v1/agents` instead of hardcoded list, group by category (Advisory, Analysis, Operations, Growth), show icon + description for each agent
- [x] 8.4 Map frontend agent type selection to backend agent name in the SSE chat request (e.g., `agent_type: "task_workflow"` instead of `agent_type: "general"`)

## 9. 3D Loading Animation
- [x] 9.1 Add 3D CSS keyframes to `src/index.css`: `rotate-3d` (ring perspective spin), `cube-spin` (3D cube rotation on X+Y axes), `orbit-dot` (circular orbit path)
- [x] 9.2 Register corresponding Tailwind animation utilities in `tailwind.config.ts`: `animate-rotate-3d`, `animate-cube-spin`, `animate-orbit-dot`
- [x] 9.3 Create `src/components/ui/loader-3d.tsx` — `Loader3D` component with props `{ size?: 'sm'|'md'|'lg', variant?: 'spinner'|'cube'|'orbit', className? }`, uses gold gradient theme
- [x] 9.4 Add `variant: '3d'` to `LoadingSkeleton` component in `src/components/ui/loading-skeleton.tsx`
- [x] 9.5 Replace "Loading messages..." text in `AICopilotPage.tsx` with `<Loader3D size="sm" />`
- [x] 9.6 Replace "Loading..." text in `ConversationSidebar.tsx` with `<Loader3D size="sm" />`
- [x] 9.7 Replace `animate-pulse` metric placeholders in `AILandingPage.tsx` with `<Loader3D size="sm" variant="orbit" />`
- [x] 9.8 Use `Loader3D` as the copilot streaming/thinking indicator (replace `animate-pulse` agent status in `AICopilotPage.tsx`)

## 10. UI Polish & Fixes
- [x] 10.1 Update `index.html` — change favicon to AidenAI logo (add `<link rel="icon">` pointing to SVG), remove Lovable OG image references
- [x] 10.2 Update `AILandingPage.tsx` — remove "I'm your AI wealth advisor. How can I help you today?" subtitle, remove Bot icon next to Wealthyx name, make greeting say "I'm Wealthyx, how can I help?", add quick prompt suggestion chips below the input
- [x] 10.3 Update `AICopilotPage.tsx` — add quick prompt suggestions in empty state (reuse `usePromptSuggestions` hook), make clicking a suggestion fill the textarea input
- [x] 10.4 Update `Sidebar.tsx` — move the collapsed-state expand toggle icon to below the "A" logo square instead of absolute `-right-3` overlap position
- [x] 10.5 Fix market ticker live data — verify `/api/v1/market/quotes` is being called and fallback quotes display correctly, check network/CORS

## 11. Cross-Feature Integration
- [x] 11.1 Update `MessageRenderer.tsx` — render markdown links matching internal routes (e.g., `/clients/{id}`) as React Router `<Link>` components instead of `<a>` tags
- [x] 11.2 Create `GET /api/v1/chat/suggestions` backend endpoint — queries the knowledge graph for user-specific actionable items (overdue tasks, stale clients, active alerts) and returns dynamic prompt suggestions
- [x] 11.3 Update `usePromptSuggestions.ts` — add optional graph-powered suggestions from the new endpoint, falling back to static role-based suggestions if unavailable
- [x] 11.4 Verify end-to-end: create a client via UI → graph sync → ask copilot about the client → agent uses graph context → response includes deep-link back to client page

## 12. Verification
- [x] 12.1 TypeScript type-check passes (`npx tsc --noEmit`)
- [x] 12.2 Production build succeeds (`npm run build`)
- [x] 12.3 Backend starts with Neo4j connection (graceful fallback if unavailable)
- [x] 12.4 SSE chat streaming works end-to-end (send message → stream response → message persisted)
- [x] 12.5 Knowledge graph sync populates nodes when entities are created/updated
- [x] 12.6 All 13 agents registered and routable via orchestrator
- [x] 12.7 New agent tools execute correctly (task CRUD, report generation, email drafting, goal management, onboarding workflow)
- [x] 12.8 Cross-agent delegation works (onboarding → compliance, report → CIO)
- [x] 12.9 Frontend AgentSelector displays all 13 agents grouped by category
- [x] 12.10 Agent uses knowledge graph tool in responses when relevant
- [x] 12.11 3D loader renders correctly in light and dark themes at all three sizes
- [x] 12.12 Cross-feature integration: deep-links in agent responses navigate correctly, graph-powered suggestions appear on landing page
