# AI Copilot Data Integrity Spec

## MODIFIED Requirements

### Requirement: Tool Usage Enforcement

The AI Copilot SHALL always use database tools when answering data-related queries.

#### Scenario: Top clients query
- **GIVEN** an authenticated user asks "show my top client"
- **WHEN** the AI processes the query
- **THEN** the AI SHALL call `aggregate_portfolio` with `metric="top_clients"`
- **AND** the AI SHALL return ONLY data from the tool results
- **AND** the response SHALL contain actual client names from the database (e.g., "Vikram Patel", "Rajesh Sharma")

#### Scenario: Client list query
- **GIVEN** an authenticated user asks "list all my clients"
- **WHEN** the AI processes the query
- **THEN** the AI SHALL call `query_clients`
- **AND** the response SHALL match the clients visible in the Clients tab

#### Scenario: No tool call without auth
- **GIVEN** a user is NOT authenticated (no valid session token)
- **WHEN** the user asks any data question
- **THEN** the system SHALL return an error message: "Please log in to access your data"
- **AND** the system SHALL NOT provide tools to the AI
- **AND** the AI SHALL NOT fabricate any data

### Requirement: Data Fabrication Prevention

The AI Copilot SHALL NEVER fabricate or invent client data.

#### Scenario: Fabrication prevention
- **GIVEN** any user query about clients, orders, or portfolio data
- **WHEN** the AI generates a response
- **THEN** the response SHALL NOT contain fictional client names such as:
  - "Sterling Family Trust"
  - "Montgomery Family Trust"
  - "Dr. Elena Rodriguez"
  - "Sterling Tech Holdings"
  - "Marcus Chen Estate"
- **AND** all monetary values SHALL come from tool results
- **AND** all client details SHALL match database records

#### Scenario: Empty results handling
- **GIVEN** a query that returns zero results from tools
- **WHEN** the AI responds
- **THEN** the AI SHALL say "No clients/orders/etc. found matching your criteria"
- **AND** the AI SHALL NOT invent placeholder data

### Requirement: Response Transparency

The AI Copilot SHALL be transparent about data sources.

#### Scenario: Tool usage indication
- **GIVEN** the AI uses a database tool
- **WHEN** the AI presents results
- **THEN** the response MAY include a brief indication like "Based on your database:"
- **AND** the response SHALL format tool results clearly (tables, lists)

#### Scenario: Auth failure transparency
- **GIVEN** authentication fails
- **WHEN** the AI cannot access tools
- **THEN** the AI SHALL explicitly state it cannot access data
- **AND** the AI SHALL NOT pretend to have data access
