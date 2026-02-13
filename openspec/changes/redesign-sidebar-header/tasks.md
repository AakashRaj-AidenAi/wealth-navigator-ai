## 1. Sidebar Foundation
- [x] 1.1 Create `useSidebarState` hook — manages expanded/collapsed toggle with localStorage persistence
- [x] 1.2 Rewrite `Sidebar.tsx` with toggle-collapsible behavior (replace hover-expand), 256px expanded / 64px collapsed, toggle button in sidebar header
- [x] 1.3 Update `MainLayout.tsx` — change `ml-16` to dynamic margin based on sidebar state, remove ChatSidebar right panel and `mr-[380px]` offset
- [x] 1.4 Verify sidebar expand/collapse transitions (200ms ease-in-out) and localStorage persistence across page reloads

## 2. Navigation Reorganization
- [x] 2.1 Reorganize `navGroups` into 5 domain groups (Core, Portfolio, Outreach, Operations, Settings) with updated items per group
- [x] 2.2 Style section headers (visible when expanded, divider lines when collapsed)
- [x] 2.3 Add sidebar search/filter input below the logo — filter nav items by label, hide empty groups
- [x] 2.4 Verify all 20 nav items remain accessible and route correctly after reorganization

## 3. User Profile in Sidebar
- [x] 3.1 Create `SidebarUserMenu` component — avatar (initials), name, role, dropdown with Profile Settings / Preferences / Sign Out
- [x] 3.2 Position user menu at sidebar bottom, visible in both expanded (full) and collapsed (avatar only) states
- [x] 3.3 Remove user menu dropdown from `Header.tsx`
- [x] 3.4 Verify sign-out flow works from the new sidebar location

## 4. AI Copilot Integration into Sidebar
- [x] 4.1 Create `SidebarChat` component — extract chat logic from `ChatSidebar.tsx` into a sidebar-embedded panel (conversation list, active chat, message input, WebSocket integration)
- [x] 4.2 Add AI Copilot toggle button above user profile in sidebar — switches sidebar between nav mode and chat mode
- [x] 4.3 When chat mode activates, auto-expand sidebar if collapsed; when chat mode deactivates, restore previous sidebar state
- [x] 4.4 Remove `ChatSidebar.tsx` usage from `MainLayout.tsx` and remove AI Copilot toggle button from `Header.tsx`
- [x] 4.5 Remove floating `AICopilot` component from `Index.tsx` (dashboard)
- [x] 4.6 Verify WebSocket connection, message streaming, conversation CRUD all work in the new sidebar chat

## 5. Enhanced Header
- [x] 5.1 Create `HeaderStats` component — fetches Total AUM, Active Clients, Pending Tasks, Active Alerts via `api.get` with React Query (staleTime: 60s); displays as compact clickable stat chips
- [x] 5.2 Create `HeaderQuickActions` component — New Client, New Order, New Task buttons that open respective modals
- [x] 5.3 Integrate `HeaderStats` and `HeaderQuickActions` into `Header.tsx`, keeping breadcrumbs, search, theme toggle, and notifications
- [x] 5.4 Remove user menu and AI Copilot button from header (moved to sidebar)
- [x] 5.5 Verify header stats display correctly, navigate on click, and cache properly

## 6. Polish & Cleanup
- [x] 6.1 Remove `src/components/chat/ChatSidebar.tsx` import from `MainLayout.tsx` (if fully replaced)
- [x] 6.2 Update `useChatSidebar.ts` hook to work with new sidebar-integrated chat model (or remove if no longer needed)
- [x] 6.3 Test complete navigation flow — all pages accessible, sidebar persists state, chat works, header stats load
- [x] 6.4 Verify no console errors, no TypeScript errors (`npx tsc --noEmit`)
