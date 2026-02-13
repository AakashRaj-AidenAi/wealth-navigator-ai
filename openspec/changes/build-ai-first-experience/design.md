## Context

WealthOS (AidenAI) is an AI-powered wealth management platform. The current landing page is a traditional metric dashboard. The redesign positions AI as the primary interface — a Gemini-like landing page with a full-page copilot experience, agent selection, voice input, rich rendering, and live market data.

The platform uses React 18, React Router v6, Tailwind CSS, shadcn/ui, TanStack Query v5, and a FastAPI backend with WebSocket chat.

## Goals / Non-Goals

### Goals
- Position AidenAI as an AI-first wealth management platform from the moment users log in
- Provide a full-page copilot experience with rich responses (charts, tables, action cards)
- Allow users to select AI agents specialized for different tasks (portfolio analysis, compliance, research)
- Enable voice input for hands-free interaction
- Surface live market data across all pages for real-time awareness
- Maintain full access to the existing dashboard via navigation

### Non-Goals
- No changes to the backend AI/LLM pipeline or agent orchestration logic
- No changes to WebSocket protocol or chat API schema
- No mobile-responsive overhaul (desktop-first)
- No paid market data APIs (use free Yahoo Finance for now)
- No changes to authentication or role system
- No backend changes to conversation/message models (reuse existing schema)

## Decisions

### 1. New landing page at `/`, dashboard moves to `/dashboard`
- **Decision**: The AI landing page becomes the root route. The current dashboard content moves to a new `/dashboard` route with a sidebar nav entry.
- **Rationale**: First impression matters. An AI-first product should greet users with the AI interface. The dashboard remains one click away for advisors who want the traditional metric view.
- **Alternatives considered**: Replacing the dashboard entirely (rejected — advisors depend on metric cards), conditional display based on preference (rejected — adds complexity, mixed messaging).

### 2. Full-page copilot at `/copilot` (not sidebar-embedded)
- **Decision**: The copilot is a dedicated full-page experience with its own route, conversation sidebar, agent selector, and rich rendering. The sidebar chat mode is removed.
- **Rationale**: A 256px sidebar is too narrow for rich AI responses (charts, tables, code). Full-page gives space for conversation management, agent selection, and detailed output. This matches industry standards (Gemini, ChatGPT, Claude).
- **Alternatives considered**: Wider slide-out panel (rejected — still constrains content, creates layout shifts), keeping sidebar chat alongside full page (rejected — duplicate UX, confusing).

### 3. Agent selector as dropdown in copilot header
- **Decision**: A dropdown in the copilot header lets users switch between agent types: General, Portfolio Analyst, Compliance, Research. The selection is passed as `agent_type` in the WebSocket message.
- **Rationale**: Different advisor tasks benefit from specialized agent behavior. The backend already supports `agent_type` on conversations. A simple dropdown is sufficient without adding tab complexity.
- **Alternatives considered**: Tab bar (rejected — takes too much vertical space), auto-detection (rejected — users want explicit control).

### 4. Yahoo Finance via backend proxy
- **Decision**: Market data is fetched via a FastAPI endpoint (`/api/v1/market/quotes`) that proxies Yahoo Finance using the `yfinance` Python library. Frontend polls every 60 seconds via React Query.
- **Rationale**: Direct browser calls to Yahoo Finance hit CORS issues. A backend proxy also allows caching, rate-limit control, and future API swaps without frontend changes.
- **Alternatives considered**: Client-side CORS proxy (rejected — unreliable), Alpha Vantage (rejected — requires API key for free tier), mock data only (rejected — user wants real data).

### 5. Voice input via Web Speech API
- **Decision**: Use the browser's native `SpeechRecognition` API (available in Chrome, Edge, Safari) with a fallback message for unsupported browsers. A microphone button in the chat input toggles recording.
- **Rationale**: Zero dependency cost, native browser support covers 90%+ of desktop users. No need for external speech-to-text APIs for an MVP.
- **Alternatives considered**: Whisper API (rejected — adds latency, cost, complexity), third-party JS libraries (rejected — unnecessary abstraction over native API).

### 6. Rich message rendering with embedded Recharts
- **Decision**: AI responses are rendered as markdown with custom renderers for: code blocks (syntax highlighted), data tables (shadcn Table), charts (Recharts), and action cards (clickable buttons). The backend returns structured metadata alongside content to trigger rich rendering.
- **Rationale**: A wealth copilot must show data visually. Recharts is already in the stack. Markdown rendering with custom blocks keeps the message format flexible.

### 7. Dynamic prompt suggestions based on role and context
- **Decision**: The landing page shows 4-6 prompt suggestion chips that change based on the user's role and current data (e.g., if there are overdue tasks, suggest "Show my overdue tasks"). Suggestions are generated client-side from existing API data.
- **Rationale**: Role-aware suggestions guide users to discover AI capabilities without reading documentation. Client-side generation avoids an extra API call and is fast.

## Risks / Trade-offs

- **Yahoo Finance reliability**: Free Yahoo Finance API may have rate limits or downtime.
  - **Mitigation**: Backend caches responses for 60s. Frontend shows "Market data unavailable" gracefully. The ticker bar is collapsible so it doesn't block core functionality.

- **Web Speech API browser support**: Not available in Firefox or older browsers.
  - **Mitigation**: Feature-detect `SpeechRecognition`. Show/hide the microphone button accordingly. Text input always works as fallback.

- **Rich message rendering complexity**: Backend must return structured metadata for charts/tables.
  - **Mitigation**: Start with markdown-only rendering. Incrementally add chart/table blocks as backend agent responses evolve. The renderer gracefully falls back to plain text.

- **Route change from `/` to `/dashboard`**: Existing bookmarks/links to `/` will now show the AI landing page instead of the dashboard.
  - **Mitigation**: The sidebar clearly shows "Dashboard" as a nav item. The landing page has a quick-access link to the dashboard.

## Open Questions
- None — all major decisions resolved via user input.
