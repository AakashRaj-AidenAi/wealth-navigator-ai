# AI Copilot Capability Spec

## ADDED Requirements

### Requirement: Dynamic Data Querying

The AI Copilot SHALL use tool/function calling to query real-time data from the database when answering user questions about clients, portfolios, orders, tasks, and activities.

#### Scenario: Simple client filter query
- **GIVEN** a user asks "Show me clients with more than $5 million in assets"
- **WHEN** the AI processes this request
- **THEN** the AI SHALL call the `query_clients` tool with `filter.total_assets.gte = 5000000`
- **AND** the AI SHALL return results from the actual database, not static pre-loaded data

#### Scenario: Complex multi-filter query
- **GIVEN** a user asks "Find high-risk VIP clients who haven't had a meeting in 60 days"
- **WHEN** the AI processes this request
- **THEN** the AI SHALL call `query_clients` with `filter.risk_profile = 'aggressive'` and `filter.tags.hasAny = ['vip']`
- **AND** the AI SHALL call `query_activities` to check for recent meetings
- **AND** the AI SHALL cross-reference results to answer the question

#### Scenario: Aggregation query
- **GIVEN** a user asks "What's my total AUM?"
- **WHEN** the AI processes this request
- **THEN** the AI SHALL call `aggregate_portfolio` with `metric = 'total_aum'`
- **AND** the AI SHALL return the calculated sum from the database

#### Scenario: Order history query
- **GIVEN** a user asks "Show me all buy orders from last week"
- **WHEN** the AI processes this request
- **THEN** the AI SHALL call `query_orders` with `filter.order_type = 'buy'` and appropriate date range
- **AND** results SHALL be sorted by date descending

### Requirement: Query Security

All database queries initiated by the AI Copilot SHALL be scoped to the authenticated user's data only.

#### Scenario: Advisor data isolation
- **GIVEN** Advisor A asks "Show me all clients"
- **WHEN** the query executes
- **THEN** only clients where `advisor_id = Advisor A's user ID` SHALL be returned
- **AND** clients belonging to other advisors SHALL NOT be visible

#### Scenario: Invalid filter rejection
- **GIVEN** the AI attempts to use an unsupported filter parameter
- **WHEN** the query builder receives the request
- **THEN** the invalid parameter SHALL be ignored or rejected
- **AND** a safe fallback query SHALL execute

#### Scenario: Query injection prevention
- **GIVEN** a malicious user attempts SQL injection via natural language
- **WHEN** the AI translates to tool parameters
- **THEN** only predefined, validated parameters SHALL be used
- **AND** raw SQL SHALL never be executed

### Requirement: Query Result Handling

The AI Copilot SHALL format query results into readable, actionable responses.

#### Scenario: Empty results
- **GIVEN** a query returns no matching records
- **WHEN** the AI processes the empty result
- **THEN** the AI SHALL inform the user no matching data was found
- **AND** the AI MAY suggest alternative queries or filters

#### Scenario: Large result set
- **GIVEN** a query matches more than 50 records
- **WHEN** results are returned
- **THEN** only the first 50 records SHALL be returned
- **AND** the AI SHALL indicate that more results exist

#### Scenario: Result formatting
- **GIVEN** query results are returned
- **WHEN** the AI generates a response
- **THEN** results SHALL be formatted as markdown tables or lists
- **AND** currency values SHALL be formatted appropriately (e.g., $1.2M)

### Requirement: Tool Definitions

The AI Copilot SHALL have access to the following data query tools:

#### Scenario: Available query tools
- **WHEN** the AI receives a data-related question
- **THEN** the AI SHALL have access to these tools:
  - `query_clients` - Search and filter clients
  - `query_orders` - Search order history
  - `query_goals` - Search financial goals
  - `query_tasks` - Search tasks and reminders
  - `query_activities` - Search client interactions
  - `aggregate_portfolio` - Calculate portfolio metrics

#### Scenario: Tool parameter validation
- **GIVEN** the AI calls a tool with parameters
- **WHEN** parameters are received by the backend
- **THEN** parameters SHALL be validated against the tool schema
- **AND** invalid parameters SHALL be rejected with an error message

### Requirement: Performance

Dynamic queries SHALL complete within acceptable time limits.

#### Scenario: Query timeout
- **GIVEN** a query is executing
- **WHEN** execution time exceeds 5 seconds
- **THEN** the query SHALL be cancelled
- **AND** a timeout error SHALL be returned to the AI

#### Scenario: Query limit
- **GIVEN** the AI makes tool calls for a single user message
- **WHEN** more than 5 tool calls are attempted
- **THEN** additional calls SHALL be rejected
- **AND** the AI SHALL work with available data

### Requirement: Fallback Behavior

The AI Copilot SHALL gracefully handle query failures.

#### Scenario: Database connection error
- **GIVEN** the database is temporarily unavailable
- **WHEN** a query fails
- **THEN** the AI SHALL inform the user of temporary issues
- **AND** the AI SHALL NOT hallucinate data

#### Scenario: Tool call parsing error
- **GIVEN** the AI generates malformed tool call syntax
- **WHEN** parsing fails
- **THEN** the system SHALL attempt to recover
- **AND** the AI SHALL be informed of the error to retry
