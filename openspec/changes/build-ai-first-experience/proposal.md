# Change: Build AI-first experience with landing page, full-page copilot, and live market ticker

## Why
The current app opens directly to a metric-heavy dashboard that buries the AI capabilities. For a platform positioning itself as **AI wealth management**, the first experience should put the AI copilot front and center — like Gemini or ChatGPT — with a clean chat interface, dynamic prompt suggestions based on the user's role and context, and key metrics at a glance. The existing sidebar-embedded chat is too cramped for a production copilot experience that needs rich responses (charts, tables, agent selection, voice input). Additionally, wealth advisors need live market awareness without navigating away from their workflow.

## What Changes

### 1. AI Landing Page (new `/` route)
- A new **Gemini-style landing page** becomes the default route (`/`)
- The old dashboard moves to `/dashboard` and stays accessible via sidebar nav
- Landing page features:
  - Large AidenAI branding with greeting ("Good morning, {name}")
  - Central chat input with prominent "Ask AidenAI anything..." placeholder
  - **Dynamic prompt suggestions** — contextual chips based on user role:
    - Wealth Advisor: "Show clients needing rebalancing", "Draft a portfolio review for {top client}", "What are today's top tasks?"
    - Compliance Officer: "Show unresolved compliance alerts", "Audit trail for this week"
    - Client: "How is my portfolio performing?", "Show my goals progress"
  - **Metric cards** — 4 compact stat cards below the chat (Total AUM, Active Clients, Pending Tasks, Alerts) using the existing header stats query
  - Submitting a prompt navigates to `/copilot` with the message pre-sent
  - Recent conversations list (from chatService) for quick resume

### 2. Full-Page AI Copilot (`/copilot` route)
- A dedicated **full-page chat experience** replacing the sidebar chat
- Layout: conversation sidebar (left, 280px collapsible) + main chat area (center) + context panel (right, optional)
- Features:
  - **Conversation sidebar**: list of past conversations, search, pin/archive, new chat button
  - **Agent selector**: dropdown/tabs to pick agent type (General, Portfolio Analyst, Compliance, Research) — maps to backend `agent_type` field
  - **Rich message rendering**: markdown with syntax highlighting, embedded charts (Recharts), data tables, action cards
  - **Streaming responses** with animated typing indicator and agent status ("Analyzing portfolio...")
  - **Voice input**: Web Speech API (SpeechRecognition) for speech-to-text input with a microphone button
  - **Modern animations**: message appear animations (slide-up + fade), smooth streaming text, pulse loading dots
  - **Message actions**: copy, retry, thumbs up/down feedback
  - Full WebSocket integration (reuses existing `wsManager`)
- Remove AI copilot toggle from sidebar bottom (replaced by sidebar nav item linking to `/copilot`)
- Remove `SidebarChat` component usage from sidebar (chat mode no longer needed in sidebar)

### 3. Live Market Ticker (below header)
- A slim **scrolling ticker bar** below the header across all pages
- Displays live stock/index prices: NIFTY 50, SENSEX, S&P 500, NASDAQ, Gold, USD/INR (configurable)
- Data from Yahoo Finance free API (via backend proxy to avoid CORS)
- Auto-refreshes every 60 seconds
- Shows symbol, price, change %, and up/down color indicator
- Collapsible (user can hide the ticker bar, preference persisted in localStorage)

### 4. Sidebar Cleanup
- Remove sidebar chat mode (`mode: 'nav' | 'chat'` → always nav)
- Replace AI Copilot toggle button with a regular nav link to `/copilot`
- Simplify `useSidebarState` hook (remove `openChat`/`closeChat`/`mode`/`prevExpanded`)
- Remove `SidebarChat` component from sidebar

## Impact
- Affected specs: `app-shell` (from `redesign-sidebar-header`)
- Affected code:
  - `src/pages/Index.tsx` → becomes the AI landing page (full rewrite)
  - `src/pages/Dashboard.tsx` → new file, receives the old dashboard content
  - `src/components/ai/AICopilotPage.tsx` → new full-page copilot component
  - `src/components/ai/AILandingPage.tsx` → new landing page component
  - `src/components/ai/AgentSelector.tsx` → new agent selection component
  - `src/components/ai/VoiceInput.tsx` → new voice input component
  - `src/components/ai/MessageRenderer.tsx` → rich message rendering
  - `src/components/layout/MarketTicker.tsx` → new ticker bar component
  - `src/components/layout/Sidebar.tsx` → remove chat mode, add /copilot nav link
  - `src/components/layout/MainLayout.tsx` → add MarketTicker below header
  - `src/hooks/useSidebarState.ts` → simplify (remove chat mode)
  - `src/hooks/useMarketData.ts` → new hook for market data polling
  - `src/hooks/usePromptSuggestions.ts` → new hook for role-based suggestions
  - `src/services/marketService.ts` → new Yahoo Finance API service
  - `backend/app/api/v1/market.py` → new backend proxy for Yahoo Finance
  - `backend/app/api/v1/router.py` → register market router
  - `src/App.tsx` → update routes (/ → landing, /dashboard → old dashboard, /copilot → full copilot)
  - `src/components/chat/SidebarChat.tsx` → removed (no longer used)
