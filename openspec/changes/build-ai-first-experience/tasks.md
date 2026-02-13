## 1. Route & Layout Foundation
- [x] 1.1 Move current dashboard content from `Index.tsx` to new `src/pages/Dashboard.tsx`, update route in `App.tsx` from `/` to `/dashboard`
- [x] 1.2 Add `/copilot` route in `App.tsx` pointing to new `AICopilotPage` component
- [x] 1.3 Update sidebar nav: add "Dashboard" link to `/dashboard` in Core group, change "AI Copilot" from toggle button to nav link to `/copilot`
- [x] 1.4 Simplify `useSidebarState` — remove `mode`, `openChat`, `closeChat`, `prevExpanded` (sidebar is always nav mode now)
- [x] 1.5 Update `Sidebar.tsx` — remove chat mode rendering, remove `SidebarChat` import, remove `onOpenChat`/`onCloseChat` props
- [x] 1.6 Update `MainLayout.tsx` — remove chat mode props from Sidebar, add `MarketTicker` slot below Header
- [x] 1.7 Verify all existing pages still render correctly after route changes

## 2. AI Landing Page (parallelizable with 3, 4)
- [x] 2.1 Create `src/hooks/usePromptSuggestions.ts` — returns role-based prompt suggestions using user role from AuthContext and current stats (overdue tasks, alerts count)
- [x] 2.2 Create `src/components/ai/AILandingPage.tsx` — Gemini-style landing page with AidenAI branding, greeting, central chat input, prompt suggestion chips, metric cards, recent conversations
- [x] 2.3 Wire landing page as the new `/` route in `App.tsx` (Index.tsx imports AILandingPage)
- [x] 2.4 Implement prompt submission → navigate to `/copilot?prompt={encodedPrompt}` with the message pre-sent
- [x] 2.5 Verify landing page renders for all three roles (wealth_advisor, compliance_officer, client)

## 3. Full-Page AI Copilot (parallelizable with 2, 4)
- [x] 3.1 Create `src/components/ai/ConversationSidebar.tsx` — left panel with conversation list, search, new chat, delete, pin
- [x] 3.2 Create `src/components/ai/AgentSelector.tsx` — dropdown with agent types (General, Portfolio Analyst, Compliance, Research) with icons
- [x] 3.3 Create `src/components/ai/VoiceInput.tsx` — microphone button using Web Speech API with feature detection, recording animation, real-time transcript
- [x] 3.4 Create `src/components/ai/MessageRenderer.tsx` — rich markdown rendering with react-markdown, syntax highlighting (code blocks), shadcn Table for markdown tables, copy button
- [x] 3.5 Create `src/components/ai/MessageActions.tsx` — copy, retry, thumbs up/down buttons per message
- [x] 3.6 Create `src/components/ai/ChatMessage.tsx` — single message component with user/assistant styling, agent avatar, animations (slide-up + fade-in)
- [x] 3.7 Create `src/components/ai/AICopilotPage.tsx` — full-page layout composing ConversationSidebar + main chat area + input bar with voice + agent selector; handles WebSocket streaming, conversation CRUD, URL prompt parameter
- [x] 3.8 Add streaming animations: pulse loading dots, progressive text appearance
- [x] 3.9 Verify WebSocket connection, message streaming, conversation CRUD all work in the full-page copilot
- [x] 3.10 Verify URL prompt parameter (`?prompt=...`) triggers auto-send on page load

## 4. Live Market Ticker (parallelizable with 2, 3)
- [x] 4.1 Install `yfinance` in backend (`pip install yfinance`, add to requirements.txt)
- [x] 4.2 Create `backend/app/api/v1/market.py` — GET `/quotes` endpoint that fetches prices from Yahoo Finance via yfinance, caches for 60s, returns `{quotes: [{symbol, name, price, change, changePercent, currency}]}`
- [x] 4.3 Register market router in `backend/app/api/v1/router.py`
- [x] 4.4 Market data fetched inline via React Query in Header.tsx (no separate service needed)
- [x] 4.5 React Query hook in Header.tsx polls every 60s with staleTime: 60_000
- [x] 4.6 Market ticker integrated directly into Header.tsx as collapsible second row (merged from standalone MarketTicker)
- [x] 4.7 Ticker integrated into Header — no standalone component in MainLayout
- [x] 4.8 Verify ticker displays, auto-refreshes, handles errors gracefully, and persists collapse state via localStorage

## 5. Cleanup & Polish
- [x] 5.1 Remove `src/components/chat/SidebarChat.tsx` (no longer used)
- [x] 5.2 Remove `src/components/ai/AICopilot.tsx` (floating copilot replaced by full-page)
- [x] 5.3 Remove unused `useChatSidebar.ts` hook
- [x] 5.4 Verify no console errors, no TypeScript errors (`npx tsc --noEmit`)
- [x] 5.5 Test complete flow: login → landing page → click suggestion → copilot with response → navigate to dashboard → back to landing → voice input → agent switch

## 6. Fix Existing Issues
- [x] 6.1 Scan all pages and components for remaining `api.get` calls that need `extractItems` wrapping (systemic paginated response issue) — 43+ calls fixed across 23+ files
- [x] 6.2 Add any missing backend stub endpoints causing 404 errors — added /client-tags and legacy endpoint stubs
- [x] 6.3 Verify all 20 sidebar nav items route correctly after reorganization
- [x] 6.4 Final TypeScript check and runtime error verification — `npx tsc --noEmit` and `npm run build` pass clean
