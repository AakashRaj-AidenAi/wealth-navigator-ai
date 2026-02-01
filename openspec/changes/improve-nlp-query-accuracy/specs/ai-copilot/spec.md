# AI Copilot NLP Accuracy Spec

## ADDED Requirements

### Requirement: Currency Value Parsing

The AI Copilot SHALL correctly interpret various currency formats in user queries.

#### Scenario: Dollar amount with M suffix
- **GIVEN** a user asks "Show clients with over $5M"
- **WHEN** the AI interprets the query
- **THEN** the AI SHALL convert "$5M" to 5000000
- **AND** the AI SHALL call query_clients with min_assets=5000000

#### Scenario: Dollar amount with K suffix
- **GIVEN** a user asks "Clients under $500K"
- **WHEN** the AI interprets the query
- **THEN** the AI SHALL convert "$500K" to 500000
- **AND** the AI SHALL call query_clients with max_assets=500000

#### Scenario: Written number
- **GIVEN** a user asks "Clients with more than 5 million in assets"
- **WHEN** the AI interprets the query
- **THEN** the AI SHALL convert "5 million" to 5000000

### Requirement: Risk Profile Synonyms

The AI Copilot SHALL map risk-related terms to the correct risk_profile values.

#### Scenario: High risk synonym
- **GIVEN** a user asks for "aggressive clients" OR "high risk clients" OR "growth clients"
- **WHEN** the AI interprets the query
- **THEN** the AI SHALL use risk_profile="aggressive"

#### Scenario: Low risk synonym
- **GIVEN** a user asks for "conservative clients" OR "low risk clients" OR "safe clients"
- **WHEN** the AI interprets the query
- **THEN** the AI SHALL use risk_profile="conservative"

#### Scenario: Medium risk synonym
- **GIVEN** a user asks for "moderate clients" OR "balanced clients"
- **WHEN** the AI interprets the query
- **THEN** the AI SHALL use risk_profile="moderate"

### Requirement: Date Expression Parsing

The AI Copilot SHALL correctly interpret relative date expressions.

#### Scenario: Last week
- **GIVEN** a user asks "Orders from last week"
- **WHEN** the AI interprets the query
- **THEN** the AI SHALL use days_ago=7

#### Scenario: This month
- **GIVEN** a user asks "Activity this month"
- **WHEN** the AI interprets the query
- **THEN** the AI SHALL use days_ago=30

#### Scenario: Yesterday
- **GIVEN** a user asks "Tasks due yesterday"
- **WHEN** the AI interprets the query
- **THEN** the AI SHALL interpret as tasks with due_date = yesterday

### Requirement: Fuzzy Client Name Matching

The AI Copilot SHALL use fuzzy matching for client name queries.

#### Scenario: Partial name match
- **GIVEN** a user asks "Show me Smith's portfolio"
- **AND** clients "John Smith" and "Smith Family Trust" exist
- **WHEN** the AI executes the query
- **THEN** the AI SHALL find clients matching "Smith"
- **AND** the AI SHALL present options if multiple matches

#### Scenario: Case insensitivity
- **GIVEN** a user asks for "JOHNSON" or "johnson"
- **AND** client "Robert Johnson" exists
- **WHEN** the AI executes the query
- **THEN** the AI SHALL find "Robert Johnson" regardless of case

### Requirement: Ambiguity Handling

The AI Copilot SHALL ask for clarification when queries are ambiguous.

#### Scenario: Multiple client matches
- **GIVEN** a user asks "Show me Smith's account"
- **AND** multiple clients with "Smith" in name exist
- **WHEN** the AI finds multiple matches
- **THEN** the AI SHALL present the options and ask which one
- **AND** the AI SHALL NOT randomly choose one

#### Scenario: Ambiguous time reference
- **GIVEN** a user asks for "recent orders" without specifying timeframe
- **WHEN** the AI interprets the query
- **THEN** the AI SHALL use a default (e.g., 7 days)
- **AND** the AI SHALL mention the timeframe used in the response

### Requirement: Follow-up Query Context

The AI Copilot SHALL understand follow-up queries that reference previous results.

#### Scenario: Filtering previous results
- **GIVEN** the user previously asked "Show all clients"
- **AND** the user now asks "Only show active ones"
- **WHEN** the AI interprets the follow-up
- **THEN** the AI SHALL add status="active" filter to the client query

#### Scenario: Sorting previous results
- **GIVEN** the user previously asked "Show top clients"
- **AND** the user now asks "Sort by name"
- **WHEN** the AI interprets the follow-up
- **THEN** the AI SHALL re-query with order_by="client_name"

### Requirement: Query Interpretation Transparency

The AI Copilot SHALL show how it interpreted the query when helpful.

#### Scenario: Fuzzy match explanation
- **GIVEN** a fuzzy name match was used
- **WHEN** the AI returns results
- **THEN** the AI SHALL indicate what was matched
- **Example**: "Showing results for clients matching 'Smith':"

#### Scenario: Default values used
- **GIVEN** the user's query had missing parameters
- **AND** defaults were applied
- **WHEN** the AI returns results
- **THEN** the AI SHALL mention what defaults were used
- **Example**: "Showing last 7 days of orders:"

### Requirement: Empty Result Suggestions

The AI Copilot SHALL provide helpful suggestions when no results are found.

#### Scenario: No matching clients
- **GIVEN** a client query returns zero results
- **WHEN** the AI responds
- **THEN** the AI SHALL suggest broader search criteria
- **OR** the AI SHALL suggest checking the spelling

#### Scenario: No orders in date range
- **GIVEN** an order query returns zero results
- **WHEN** the AI responds
- **THEN** the AI SHALL suggest trying a different date range
- **AND** the AI SHALL mention when the last order was (if accessible)
