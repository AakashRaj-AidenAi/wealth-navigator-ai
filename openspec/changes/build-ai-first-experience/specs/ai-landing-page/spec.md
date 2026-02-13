## ADDED Requirements

### Requirement: AI-First Landing Page
The root route (`/`) SHALL display an AI-first landing page that greets the user by name, provides a central chat input, shows dynamic prompt suggestions based on the user's role, and displays key metric cards. The current dashboard content SHALL move to `/dashboard`.

#### Scenario: Authenticated user lands on root route
- **WHEN** an authenticated user navigates to `/`
- **THEN** they see the AidenAI branded landing page with a greeting ("Good morning, {first_name}")
- **AND** a large chat input field with placeholder "Ask AidenAI anything..."
- **AND** 4-6 prompt suggestion chips below the input
- **AND** 4 compact metric cards (Total AUM, Active Clients, Pending Tasks, Active Alerts)

#### Scenario: User submits a prompt from the landing page
- **WHEN** the user types a message and presses Enter (or clicks send)
- **THEN** the app navigates to `/copilot` with the message pre-sent to the AI
- **AND** the copilot page shows the conversation with the streaming response

#### Scenario: User clicks a prompt suggestion chip
- **WHEN** the user clicks a suggestion chip (e.g., "Show clients needing rebalancing")
- **THEN** the app navigates to `/copilot` with that prompt pre-sent
- **AND** the copilot page shows the conversation with the streaming response

### Requirement: Role-Based Prompt Suggestions
The landing page SHALL display context-aware prompt suggestions that vary based on the authenticated user's role and current data state.

#### Scenario: Wealth advisor sees relevant suggestions
- **WHEN** a user with role `wealth_advisor` views the landing page
- **THEN** suggestions include prompts like "Show my top clients by AUM", "What are today's tasks?", "Draft a portfolio review", "Analyze risk distribution"
- **AND** if the user has overdue tasks, a suggestion like "Show my overdue tasks" appears

#### Scenario: Compliance officer sees compliance-focused suggestions
- **WHEN** a user with role `compliance_officer` views the landing page
- **THEN** suggestions include prompts like "Show unresolved compliance alerts", "Audit trail for this week", "Communication logs needing review"

### Requirement: Recent Conversations on Landing Page
The landing page SHALL display a compact list of recent conversations (up to 5) below the metric cards, allowing users to quickly resume previous AI interactions.

#### Scenario: User has previous conversations
- **WHEN** the user has existing conversations
- **THEN** the landing page shows up to 5 recent conversations with title, time ago, and message count
- **AND** clicking a conversation navigates to `/copilot` with that conversation active

#### Scenario: User has no conversations
- **WHEN** the user has no previous conversations
- **THEN** the recent conversations section is hidden
- **AND** the landing page focuses on the chat input and suggestions

### Requirement: Dashboard Route Migration
The existing dashboard content SHALL be accessible at `/dashboard` via sidebar navigation.

#### Scenario: User navigates to dashboard
- **WHEN** the user clicks "Dashboard" in the sidebar navigation
- **THEN** the app navigates to `/dashboard`
- **AND** displays the full existing dashboard with all metric cards, charts, widgets, and activity feeds
