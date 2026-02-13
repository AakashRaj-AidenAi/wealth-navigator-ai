## ADDED Requirements

### Requirement: Task Workflow Agent
The backend SHALL provide a `task_workflow` agent that handles task management operations including creating, updating, querying, and prioritizing tasks. The agent SHALL use tools that operate on the existing Task model via SQLAlchemy.

#### Scenario: Create a task via copilot
- **WHEN** the user says "Create a follow-up task for Client X by Friday"
- **THEN** the orchestrator routes to `task_workflow` agent
- **AND** the agent calls `create_task` with extracted parameters (title, client_id, due_date, priority)
- **AND** the agent confirms the task was created with a summary and deep-link

#### Scenario: Query overdue tasks
- **WHEN** the user says "What tasks are overdue?"
- **THEN** the agent calls `get_overdue_tasks` and returns a formatted list with client names and due dates

### Requirement: Report & Analytics Agent
The backend SHALL provide a `report_analytics` agent that generates reports and analytics summaries. The agent SHALL be able to delegate to the `cio_strategy` agent for macro/sector context.

#### Scenario: Generate a portfolio performance report
- **WHEN** the user says "Generate a performance report for Q4"
- **THEN** the orchestrator routes to `report_analytics` agent
- **AND** the agent calls `generate_report(report_type="portfolio_performance", date_range="Q4")`
- **AND** returns a formatted report with key metrics

#### Scenario: Revenue breakdown
- **WHEN** the user says "Show me revenue breakdown this month"
- **THEN** the agent calls `get_revenue_breakdown` and formats the data with charts/tables context

### Requirement: Communications Agent
The backend SHALL provide a `communications` agent that drafts professional client communications, follow-up emails, and campaign messages.

#### Scenario: Draft a client email
- **WHEN** the user says "Draft a follow-up email to John after our meeting"
- **THEN** the orchestrator routes to `communications` agent
- **AND** the agent calls `get_communication_history(client_id)` for context
- **AND** calls `draft_email(recipient_name, subject, context, tone="professional")`
- **AND** returns the drafted email for review

#### Scenario: Campaign message creation
- **WHEN** the user says "Create a message for the year-end review campaign"
- **THEN** the agent calls `create_campaign_message` with appropriate template and variables

### Requirement: Goal Planning Agent
The backend SHALL provide a `goal_planning` agent that manages financial goals, projects timelines, and suggests investment strategies to meet targets.

#### Scenario: Create a financial goal
- **WHEN** the user says "Set a retirement goal of 5cr for Client X by 2040"
- **THEN** the orchestrator routes to `goal_planning` agent
- **AND** the agent calls `create_goal(client_id, name="Retirement", target_amount=50000000, target_date="2040-01-01")`
- **AND** calls `suggest_goal_strategy(goal_id)` to recommend an allocation

#### Scenario: Track goal progress
- **WHEN** the user says "How is Client X's retirement goal tracking?"
- **THEN** the agent calls `get_goals(client_id)` and `project_goal_timeline(goal_id)` to show progress vs target

### Requirement: Onboarding Agent
The backend SHALL provide an `onboarding` agent that guides the new client onboarding lifecycle. The agent SHALL delegate to `compliance_sentinel` for KYC verification.

#### Scenario: Start client onboarding
- **WHEN** the user says "Onboard a new client Rajesh, email raj@example.com"
- **THEN** the orchestrator routes to `onboarding` agent
- **AND** the agent calls `start_onboarding(client_name="Rajesh", email="raj@example.com")`
- **AND** outlines next steps: document collection, KYC, risk profiling, initial allocation

#### Scenario: Complete onboarding with delegation
- **WHEN** the user says "Run KYC check for the new client"
- **THEN** the agent delegates to `compliance_sentinel` for KYC verification via `check_kyc_status`
- **AND** returns the compliance status and next steps

### Requirement: Expanded Orchestrator Intent Map
The orchestrator SHALL route new intents to the appropriate new agents. The intent map SHALL include at minimum: `task_management`, `task_creation`, `report_generation`, `analytics_query`, `communication_draft`, `email_request`, `goal_tracking`, `financial_planning`, `client_onboarding`, `document_collection`.

#### Scenario: Correct routing for task intent
- **WHEN** a message is classified with intent `task_management` or `task_creation`
- **THEN** the orchestrator routes to `task_workflow` agent

#### Scenario: Report routing remap
- **WHEN** a message is classified with intent `report_generation`
- **THEN** the orchestrator routes to `report_analytics` agent (not `cio_strategy`)

### Requirement: Frontend Agent Selector
The frontend `AgentSelector` component SHALL display all registered agents grouped by category instead of a hardcoded list. The component SHALL fetch available agents from `GET /api/v1/agents`.

#### Scenario: Agent list display
- **WHEN** the user opens the agent selector dropdown
- **THEN** all 13 agents are displayed grouped under 4 categories: Advisory, Analysis, Operations, Growth
- **AND** each agent shows its name, description, and a category-colored icon

#### Scenario: Agent selection sends correct type
- **WHEN** the user selects "Task Manager" from the Operations category
- **THEN** the chat request includes `agent_type: "task_workflow"`
- **AND** the backend routes directly to the `task_workflow` agent

### Requirement: Agent Category Metadata
Each agent SHALL declare a `category` property (one of: `advisory`, `analysis`, `operations`, `growth`) used by the frontend for grouping. The `GET /api/v1/agents` endpoint SHALL include the category in the response.

#### Scenario: Agent info endpoint
- **WHEN** `GET /api/v1/agents` is called
- **THEN** the response includes all 13 agents with `{name, description, category}` for each

### Requirement: Cross-Agent Delegation Safety
Agents SHALL be able to delegate to other agents via `BaseAgent.delegate()`. Delegation depth SHALL be capped at 1 (no recursive chains). The base agent SHALL check `context.metadata.get("delegation_depth", 0)` before allowing delegation.

#### Scenario: Delegation depth enforcement
- **WHEN** agent A delegates to agent B
- **AND** agent B attempts to delegate to agent C
- **THEN** the delegation is blocked and agent B returns its own response instead
