## ADDED Requirements

### Requirement: AidenAI Favicon
The application SHALL use the AidenAI logo as the browser tab icon (favicon). All references to Lovable branding (OG images, meta tags) SHALL be removed from `index.html`.

#### Scenario: Tab displays AidenAI icon
- **WHEN** the user opens the application in a browser
- **THEN** the browser tab shows the AidenAI logo as the favicon

### Requirement: 3D Loading Animation Component
The application SHALL provide a reusable `Loader3D` component (`src/components/ui/loader-3d.tsx`) with three visual variants (`spinner`, `cube`, `orbit`), three sizes (`sm`, `md`, `lg`), and gold-gradient theming. The animation SHALL be CSS-only (GPU-accelerated `@keyframes` using 3D transforms) with zero JavaScript animation overhead.

#### Scenario: Loader renders in spinner variant
- **WHEN** `<Loader3D variant="spinner" size="md" />` is rendered
- **THEN** a ring with perspective rotation animates smoothly using the platform's gold gradient
- **AND** the animation runs at 60fps without blocking the main thread

#### Scenario: Loader renders in cube variant
- **WHEN** `<Loader3D variant="cube" size="md" />` is rendered
- **THEN** a 3D cube rotates on both X and Y axes with gold-gradient faces

#### Scenario: Loader renders in orbit variant
- **WHEN** `<Loader3D variant="orbit" size="md" />` is rendered
- **THEN** dots orbit around a center point in a circular 3D path

#### Scenario: Loader respects dark mode
- **WHEN** the application is in dark theme
- **THEN** the loader colors adjust to use the dark theme gold gradient and background variables

### Requirement: Unified Loading States
All data-fetching loading states across the application SHALL use the `Loader3D` component instead of plain text ("Loading...") or basic `animate-pulse` placeholders. This includes: copilot message loading, conversation sidebar loading, landing page metric loading, and copilot agent streaming indicator.

#### Scenario: Copilot uses 3D loader for message loading
- **WHEN** the copilot is loading messages for a conversation
- **THEN** a `Loader3D` spinner is shown instead of "Loading messages..." text

#### Scenario: Agent thinking indicator uses 3D loader
- **WHEN** the agent is processing a message
- **THEN** a `Loader3D` orbit animation is shown alongside the agent status text

### Requirement: Agent Response Deep-Links
The `MessageRenderer` component SHALL render markdown links that match internal platform routes (e.g., `/clients/{id}`, `/portfolios/{id}`) as React Router `<Link>` components for client-side navigation, instead of full-page `<a>` reloads.

#### Scenario: Agent mentions a client with a link
- **WHEN** the agent response contains `[View Client Profile](/clients/abc-123)`
- **THEN** the link renders as a React Router `<Link>` that navigates without page reload

### Requirement: Graph-Powered Prompt Suggestions
The `usePromptSuggestions` hook SHALL optionally fetch dynamic suggestions from the knowledge graph via `GET /api/v1/chat/suggestions`. The graph-powered suggestions surface actionable items (overdue tasks, stale clients, active alerts) specific to the user. If the graph endpoint is unavailable, the hook SHALL fall back to static role-based suggestions.

#### Scenario: Graph suggestions available
- **WHEN** the landing page loads and the graph endpoint returns suggestions
- **THEN** the prompt suggestion chips reflect user-specific actionable items (e.g., "Review alert for Client X", "3 tasks overdue")

#### Scenario: Graph endpoint unavailable
- **WHEN** the graph endpoint returns an error or is unreachable
- **THEN** the hook returns static role-based suggestions as before

## MODIFIED Requirements

### Requirement: Landing Page Greeting
The AI landing page SHALL display "Wealthyx" as plain text without a Bot icon, followed by a dynamic greeting ("Good morning, {name}") and the integrated tagline "I'm Wealthyx, how can I help?". The static subtitle "I'm your AI wealth advisor. How can I help you today?" and the Bot icon badge SHALL be removed. Quick prompt suggestions SHALL be displayed below the input.

#### Scenario: Landing page renders clean greeting
- **WHEN** the user visits the home page
- **THEN** "Wealthyx" text is shown without a Bot icon badge
- **AND** the greeting says "{Greeting}, {firstName}" followed by "I'm Wealthyx, how can I help?"
- **AND** the dynamic rotating placeholder in the input changes every 3 seconds
- **AND** up to 6 role-based quick prompt chips appear below the input

### Requirement: Sidebar Collapse Toggle
The sidebar collapse/expand toggle SHALL be positioned inside the collapsed sidebar below the "A" logo, not as an overlapping absolute-positioned button outside the sidebar boundary.

#### Scenario: Collapsed sidebar toggle placement
- **WHEN** the sidebar is collapsed (64px width)
- **THEN** the expand toggle icon appears below the "A" logo inside the sidebar
- **AND** does not extend outside the sidebar boundaries

### Requirement: Copilot Empty State Quick Prompts
The copilot page empty state SHALL display quick prompt suggestion buttons sourced from the `usePromptSuggestions` hook. Clicking a suggestion fills the input textarea with that text (not navigate away).

#### Scenario: Quick prompts in empty copilot
- **WHEN** the user opens the copilot with no active conversation
- **THEN** the "Welcome to Wealthyx" empty state includes role-based quick prompt buttons
- **AND** clicking a prompt fills the input textarea with the suggestion text
