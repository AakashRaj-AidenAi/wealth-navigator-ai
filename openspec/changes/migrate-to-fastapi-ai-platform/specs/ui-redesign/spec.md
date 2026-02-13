# Capability: UI Redesign

Redesign the frontend layout, styling, and chat experience — replacing the current dense sidebar/header with a modern nav rail + persistent chat sidebar, connecting all data flows to the new FastAPI backend, and improving the overall visual polish.

## MODIFIED Requirements

### Requirement: Navigation Layout
The system MUST replace the current 256px sidebar with a slim 64px icon-only navigation rail that expands on hover, freeing main content space.

#### Scenario: Nav rail displays icon-only navigation
- **Given** the user is on any page
- **When** the layout renders
- **Then** a 64px nav rail is visible on the left with icon-only navigation items

#### Scenario: Nav rail expands on hover
- **Given** the nav rail is in collapsed state
- **When** the user hovers over the nav rail
- **Then** it expands to show labels alongside icons with a smooth animation

#### Scenario: Active page is highlighted in nav rail
- **Given** the user is on the Clients page
- **When** the nav rail renders
- **Then** the Clients icon is highlighted with an active indicator

---

### Requirement: Header Redesign
The system MUST simplify the header by removing the market ticker, adding a command palette trigger (Cmd+K), breadcrumb navigation, and a notification center.

#### Scenario: Command palette opens with Cmd+K
- **Given** the user is on any page
- **When** the user presses Cmd+K (or Ctrl+K)
- **Then** a command palette overlay opens with search across pages, clients, actions, and commands

#### Scenario: Notification bell shows unread count
- **Given** the user has 5 unread notifications
- **When** the header renders
- **Then** the notification bell shows a badge with "5"

#### Scenario: Breadcrumb shows navigation path
- **Given** the user navigates to a client profile
- **When** the header renders
- **Then** breadcrumbs show "Dashboard > Clients > Rajesh Kumar"

---

## ADDED Requirements

### Requirement: Persistent Chat Sidebar
The system MUST provide a persistent AI copilot chat sidebar on the right side of the layout (380px, collapsible).

#### Scenario: Chat sidebar is visible by default
- **Given** the user is authenticated
- **When** any page loads
- **Then** a chat sidebar is visible on the right side of the layout

#### Scenario: Chat sidebar can be collapsed
- **Given** the chat sidebar is open
- **When** the user clicks the collapse button
- **Then** the sidebar collapses to a floating chat icon button

#### Scenario: Chat sidebar shows conversation history
- **Given** the user has previous conversations
- **When** the chat sidebar opens
- **Then** a list of recent conversations is shown with titles and timestamps

#### Scenario: Chat messages stream in real-time
- **Given** the user sends a message in the chat sidebar
- **When** the agent processes and responds
- **Then** response tokens appear in real-time with a typing indicator

#### Scenario: Chat messages include action buttons
- **Given** the agent recommends an action (e.g., "Rebalance portfolio")
- **When** the response renders
- **Then** clickable action buttons appear below the message that trigger the recommended action

---

### Requirement: Rich Chat Message Rendering
The chat MUST support rich message types beyond plain text.

#### Scenario: Table data renders in chat
- **Given** the agent returns portfolio holdings data
- **When** the message renders
- **Then** a formatted table is displayed inline in the chat with sortable columns

#### Scenario: Markdown renders correctly
- **Given** the agent returns a response with markdown formatting
- **When** the message renders
- **Then** headings, bold, lists, and code blocks render correctly

#### Scenario: Agent identity is shown per message
- **Given** a message is from the Portfolio Intelligence Agent
- **When** the message renders
- **Then** the agent name and avatar/icon are displayed above the message

---

### Requirement: Frontend API Migration
All frontend data calls MUST migrate from Supabase client SDK to the new FastAPI REST API.

#### Scenario: Client list loads from FastAPI
- **Given** the user navigates to the Clients page
- **When** the page loads
- **Then** client data is fetched from `GET /api/v1/clients` (not Supabase)

#### Scenario: Authentication uses JWT from FastAPI
- **Given** the user logs in
- **When** credentials are submitted
- **Then** authentication flows through `POST /api/v1/auth/login` and JWT is stored for subsequent requests

#### Scenario: React Query hooks use API service layer
- **Given** a component needs client data
- **When** the hook is called
- **Then** it uses the API service layer (not the Supabase client directly)

---

### Requirement: Dashboard Modernization
The system MUST update the dashboard with improved KPI cards, better data visualization, and customizable widgets.

#### Scenario: KPI cards show sparkline trends
- **Given** the dashboard loads
- **When** KPI cards render (Total AUM, Active Clients, etc.)
- **Then** each card includes a small sparkline showing the 7-day trend

#### Scenario: Dashboard widgets can be rearranged
- **Given** the user is on the dashboard
- **When** the user enters edit mode
- **Then** widgets can be dragged and rearranged, and the layout persists

---

### Requirement: Visual Polish and Animations
The system MUST add subtle animations and transitions using Framer Motion for a premium feel.

#### Scenario: Page transitions animate smoothly
- **Given** the user navigates between pages
- **When** the page changes
- **Then** content fades in with a subtle slide animation

#### Scenario: Cards have hover effects
- **Given** the user hovers over a dashboard card
- **When** the hover occurs
- **Then** the card subtly lifts with a shadow transition

#### Scenario: Chat messages animate in
- **Given** a new message appears in the chat
- **When** the message renders
- **Then** it slides in from the bottom with a fade-in animation
