# Change: Redesign sidebar and header UX/UI

## Why
The current sidebar is a narrow icon-only rail (64px) that expands on hover to 240px. This creates a fragile interaction — accidental mouse-out collapses nav mid-click, labels are hidden by default reducing discoverability, and 20 nav items in a flat list make it hard to scan. The header is functional but underutilizes its space. The AI Copilot lives in a separate 380px right-side panel that competes with content width. Advisors need a polished, information-dense shell that surfaces key stats, integrates AI chat, and organizes navigation clearly.

## What Changes

### Sidebar
- Replace hover-expand with a **toggle-collapsible sidebar** (button to pin open/collapse, persisted in localStorage)
- Expanded width: 256px. Collapsed width: 64px (icon-only with tooltips)
- Reorganize nav groups with clear visual separators and section headers: **Core** (Dashboard, Tasks, Leads, Clients), **Portfolio** (Portfolios, Goals, CIO Desk, Corp Actions, Orders), **Outreach** (Communications, Campaigns), **Operations** (Compliance, Reports, Business, Funding, Portfolio Admin), **Settings** (Firm Admin, Settings)
- Add **user profile section** at sidebar bottom with avatar, name, role, and sign-out
- Add **AI Copilot tab** at sidebar bottom — clicking opens an inline chat panel that slides over the nav content (within the sidebar width when expanded, or as a 320px panel when collapsed)
- Add **sidebar search/filter** input at top to quickly filter nav items
- Polished transitions: 200ms ease-in-out for expand/collapse, smooth opacity for labels

### Header
- Add **global stats bar**: compact row showing Total AUM, Active Clients, Pending Tasks, Active Alerts — clickable to navigate
- Add **quick actions**: New Client, New Order, New Task buttons in header
- Keep breadcrumbs, search (Ctrl+K), theme toggle, and notification center
- Move user menu from header to sidebar bottom (removes duplication)
- Remove AI Copilot toggle from header (moved to sidebar)

### AI Copilot Integration
- Remove the right-side `ChatSidebar` panel
- Integrate chat as a **sidebar mode** — a tab/button at the sidebar bottom toggles between navigation view and AI chat view within the same sidebar
- When chat is active, the sidebar shows the conversation list or active chat, with a back button to return to nav
- Content area no longer needs `mr-[380px]` offset

## Impact
- Affected specs: none (no existing specs in `openspec/specs/`)
- Affected code:
  - `src/components/layout/Sidebar.tsx` — full rewrite
  - `src/components/layout/Header.tsx` — significant modification
  - `src/components/layout/MainLayout.tsx` — remove ChatSidebar integration, update margin logic
  - `src/components/chat/ChatSidebar.tsx` — refactor into sidebar-embedded chat panel
  - `src/hooks/useChatSidebar.ts` — adapt to sidebar-integrated model
  - `src/pages/Index.tsx` — remove floating AICopilot, header stats may share data
  - `src/components/ai/AICopilot.tsx` — potentially removed (functionality moved to sidebar chat)
