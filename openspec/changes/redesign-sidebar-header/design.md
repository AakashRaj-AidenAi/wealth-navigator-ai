## Context

The WealthOS platform currently uses a hover-expand sidebar (64px → 240px), a functional header with breadcrumbs/user menu, and a separate 380px right-panel for AI Copilot chat. The redesign consolidates the AI chat into the sidebar, enhances the header with global stats, and makes the sidebar toggle-collapsible instead of hover-based.

The platform uses React 18 + React Router v6, Tailwind CSS, shadcn/ui (Radix primitives), and lucide-react icons.

## Goals / Non-Goals

### Goals
- Improve navigation discoverability by grouping 20+ nav items into logical sections
- Provide a stable sidebar that doesn't collapse unexpectedly (toggle > hover)
- Surface key business metrics (AUM, clients, tasks, alerts) in the header for at-a-glance awareness
- Integrate AI Copilot into the sidebar to eliminate the content-width penalty of the right panel
- Persist sidebar collapsed/expanded state across sessions

### Non-Goals
- No changes to routing or page content
- No backend changes
- No mobile/responsive overhaul (keep desktop-first)
- No changes to the CommandPalette (Ctrl+K)
- No changes to AI chat backend/WebSocket logic

## Decisions

### 1. Toggle-collapsible over hover-expand
- **Decision**: Replace `onMouseEnter`/`onMouseLeave` with a toggle button. State persisted in `localStorage`.
- **Rationale**: Hover-expand is fragile on large screens (mouse accidentally leaves), prevents stable reading of nav labels, and conflicts with sidebar-embedded chat. Toggle gives user control.
- **Alternatives considered**: Click-to-expand (same as chosen), auto-collapse on navigation (rejected — too disruptive), always-expanded (rejected — wastes space for power users who know the icons).

### 2. AI chat as sidebar mode (not separate panel)
- **Decision**: The sidebar has two modes — "nav" (default) and "chat". A bottom button toggles between them. In chat mode, the sidebar shows the conversation list or active conversation, reusing existing `ChatSidebar` logic.
- **Rationale**: Eliminates the 380px right panel offset, keeps AI accessible without sacrificing content width, and consolidates the shell into a single left-side component.
- **Alternatives considered**: Floating modal (rejected — loses persistent-chat feel), overlay panel (rejected — still blocks content), keeping right panel (rejected — user wants integration).

### 3. Sidebar nav grouping
- **Decision**: Five groups: Core, Portfolio, Outreach, Operations, Settings. Each with a section header visible in expanded mode and a subtle divider in collapsed mode.
- **Rationale**: 20 flat items are hard to scan. Domain-based grouping matches the advisor's mental model.

### 4. Header global stats
- **Decision**: Compact stat chips in the header showing Total AUM, Active Clients, Pending Tasks, Active Alerts. Each is clickable for navigation. Data fetched via the existing `api.get` calls (shared with the dashboard).
- **Rationale**: Advisors frequently check these KPIs. Having them always visible reduces navigation to the dashboard just to check numbers.

### 5. User menu in sidebar bottom
- **Decision**: Move user avatar + name + sign-out from the header dropdown to the sidebar bottom section. Header retains breadcrumbs, search, theme toggle, notifications.
- **Rationale**: Standard SaaS pattern (Slack, Linear, Notion). Frees header space for stats and quick actions.

## Risks / Trade-offs

- **Sidebar chat panel width**: In collapsed mode (64px), the chat needs its own expanded width. We'll slide it out as a 320px overlay panel anchored to the sidebar edge, similar to how sub-menus work in some shells. This adds visual complexity.
  - **Mitigation**: Only show chat overlay when sidebar is collapsed. When expanded (256px), chat renders inline within the sidebar.

- **Data fetching for header stats**: Adding API calls in the header means every page load fetches stats.
  - **Mitigation**: Use React Query with `staleTime: 60_000` (1 minute cache) to avoid excessive requests. The dashboard already fetches the same data.

- **Component size**: The sidebar will become a larger component.
  - **Mitigation**: Extract sub-components: `SidebarNav`, `SidebarChat`, `SidebarUserMenu`, `SidebarToggle`.

## Open Questions
- None — all major decisions resolved via user input.
