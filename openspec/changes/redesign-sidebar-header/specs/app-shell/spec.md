## ADDED Requirements

### Requirement: Toggle-Collapsible Sidebar
The sidebar SHALL support two states: expanded (256px) and collapsed (64px icon-only). A toggle button in the sidebar header SHALL switch between states. The collapsed/expanded state SHALL be persisted in localStorage and restored on page load. When collapsed, nav items SHALL display only icons with tooltips on hover. When expanded, nav items SHALL display icons and labels with section group headers.

#### Scenario: User expands collapsed sidebar
- **WHEN** the sidebar is collapsed and the user clicks the toggle button
- **THEN** the sidebar expands to 256px with a smooth 200ms transition
- **AND** nav labels, section headers, and user profile become visible
- **AND** the state is persisted to localStorage

#### Scenario: User collapses expanded sidebar
- **WHEN** the sidebar is expanded and the user clicks the toggle button
- **THEN** the sidebar collapses to 64px with a smooth 200ms transition
- **AND** only icons are visible with tooltips on hover
- **AND** the state is persisted to localStorage

#### Scenario: Sidebar state restored on load
- **WHEN** the user loads the application
- **THEN** the sidebar state (collapsed or expanded) is restored from localStorage
- **AND** if no stored state exists, the sidebar defaults to expanded

### Requirement: Grouped Navigation
The sidebar navigation SHALL organize items into five labeled groups: Core (Dashboard, Tasks, Leads, Clients), Portfolio (Portfolios, Goals, CIO Desk, Corp Actions, Orders), Outreach (Communications, Campaigns), Operations (Compliance, Reports, Business, Funding, Portfolio Admin), and Settings (Firm Admin, Settings). Each group SHALL have a visible section header when the sidebar is expanded and a subtle divider line when collapsed.

#### Scenario: Navigation groups visible when expanded
- **WHEN** the sidebar is expanded
- **THEN** each nav group displays a section header label above its items
- **AND** items within each group are listed with icon and label

#### Scenario: Navigation groups indicated when collapsed
- **WHEN** the sidebar is collapsed
- **THEN** groups are separated by subtle horizontal dividers
- **AND** no section header text is shown

### Requirement: Sidebar User Profile Section
The sidebar SHALL display a user profile section at the bottom showing the user's avatar (initials), full name, and role. Clicking the profile section SHALL open a dropdown menu with Profile Settings, Preferences, and Sign Out options. The user menu SHALL be removed from the header.

#### Scenario: User profile visible when expanded
- **WHEN** the sidebar is expanded
- **THEN** the bottom of the sidebar shows the user avatar, name, role label, and a chevron indicating a menu
- **AND** clicking it opens a dropdown with Profile Settings, Preferences, and Sign Out

#### Scenario: User profile visible when collapsed
- **WHEN** the sidebar is collapsed
- **THEN** only the user avatar (initials circle) is visible at the sidebar bottom
- **AND** clicking it opens the same dropdown menu

### Requirement: Sidebar-Integrated AI Copilot
The sidebar SHALL include an AI Copilot toggle button above the user profile section. Clicking it SHALL switch the sidebar content from navigation mode to chat mode. In chat mode, the sidebar SHALL display the conversation list or active conversation with message input. A back/close button SHALL return to navigation mode. The separate right-side ChatSidebar panel SHALL be removed.

#### Scenario: User opens AI chat from sidebar
- **WHEN** the user clicks the AI Copilot button in the sidebar
- **THEN** the sidebar content transitions to show the chat interface
- **AND** the sidebar expands to its full width if it was collapsed
- **AND** no right-side panel appears

#### Scenario: User returns to navigation from chat
- **WHEN** the user clicks the back button in the sidebar chat view
- **THEN** the sidebar content transitions back to the navigation view
- **AND** the sidebar returns to its previous collapsed/expanded state

#### Scenario: Chat functions within sidebar
- **WHEN** the sidebar is in chat mode
- **THEN** the user can view conversations, send messages, and receive streaming responses
- **AND** all existing WebSocket chat functionality works identically to the previous ChatSidebar

### Requirement: Enhanced Header with Global Stats
The header SHALL display a compact row of global stats: Total AUM, Active Clients, Pending Tasks, and Active Alerts. Each stat SHALL be clickable, navigating to its respective page (Portfolios, Clients, Tasks, Compliance). Stats SHALL be fetched via the existing API with React Query caching (staleTime of 60 seconds).

#### Scenario: Global stats displayed in header
- **WHEN** the user is on any page
- **THEN** the header shows Total AUM, Active Clients, Pending Tasks, and Active Alerts as compact stat chips
- **AND** each stat shows a label and value

#### Scenario: User clicks a header stat
- **WHEN** the user clicks the "Active Clients" stat chip
- **THEN** the app navigates to the /clients page

#### Scenario: Stats are cached
- **WHEN** the user navigates between pages within 60 seconds
- **THEN** the header stats are served from React Query cache without additional API calls

### Requirement: Header Quick Actions
The header SHALL include quick action buttons for common operations: New Client, New Order, and New Task. Each button SHALL open the respective creation modal or navigate to the creation flow.

#### Scenario: User creates client from header
- **WHEN** the user clicks the "New Client" quick action button in the header
- **THEN** the Add Client modal opens

#### Scenario: User creates order from header
- **WHEN** the user clicks the "New Order" quick action button in the header
- **THEN** the New Order modal opens

#### Scenario: User creates task from header
- **WHEN** the user clicks the "New Task" quick action button in the header
- **THEN** the Quick Add Task component is triggered

### Requirement: Sidebar Nav Filter
The sidebar SHALL include a search/filter input at the top (below the logo) when expanded. Typing into it SHALL filter the visible nav items by label match. Clearing the input SHALL restore the full nav list.

#### Scenario: User filters nav items
- **WHEN** the sidebar is expanded and the user types "comp" in the filter input
- **THEN** only nav items matching "comp" (e.g., Compliance, Communications) are shown
- **AND** group headers with no matching items are hidden

#### Scenario: Filter cleared
- **WHEN** the user clears the filter input
- **THEN** all nav groups and items are visible again
