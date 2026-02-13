## ADDED Requirements

### Requirement: Neo4j Knowledge Graph Service
The backend SHALL maintain a per-user knowledge graph in Neo4j. The graph stores entity nodes (`User`, `Client`, `Portfolio`, `Task`, `Alert`, `Conversation`, `Event`) and relationship edges (`MANAGES`, `OWNS`, `ASSIGNED_TO`, `TRIGGERED_FOR`, `DISCUSSED_IN`, `RELATED_TO`). Each node stores minimal properties (id, name, key metrics, last_updated); full data remains in PostgreSQL.

#### Scenario: Graph connection lifecycle
- **WHEN** the FastAPI application starts
- **THEN** a Neo4j connection pool is initialized
- **AND** graph constraints and indexes are created if they don't exist

#### Scenario: Graph is unavailable
- **WHEN** Neo4j is unreachable
- **THEN** the application continues to function without graph context
- **AND** agents process messages using only conversation history

### Requirement: Entity Sync to Knowledge Graph
The backend SHALL sync entity changes from PostgreSQL to Neo4j via async background tasks triggered on model create/update events. Synced models: `Client`, `Portfolio`, `Task`, `Conversation`, `ComplianceAlert`.

#### Scenario: New client synced to graph
- **WHEN** a new Client record is created in PostgreSQL
- **THEN** a `Client` node is upserted in Neo4j with properties (id, name, total_assets, risk_profile)
- **AND** a `MANAGES` edge is created from the advisor's `User` node to the `Client` node

#### Scenario: Backfill existing data
- **WHEN** an admin calls `POST /api/v1/admin/sync-graph`
- **THEN** all existing entities from PostgreSQL are synced into Neo4j

### Requirement: Agent Knowledge Graph Tool
Agents SHALL have access to a `query_knowledge_graph` tool that queries the user's subgraph for related entities. The tool accepts parameters `(entity_type, entity_id?, query?, depth?)` and returns connected nodes and relationships.

#### Scenario: Agent queries graph for client context
- **WHEN** the user asks "What's happening with Client X?"
- **THEN** the agent calls `query_knowledge_graph(entity_type="Client", entity_id="<uuid>", depth=2)`
- **AND** receives connected portfolios, tasks, alerts, and recent conversations for that client

#### Scenario: Agent enriched with graph context
- **WHEN** any message is processed by the orchestrator
- **THEN** the orchestrator queries the knowledge graph for the user's recent activity
- **AND** injects a brief context summary into the agent's system prompt (e.g., "You have 3 overdue tasks, Client X has a portfolio drift alert")

### Requirement: Graph-Powered Suggestions Endpoint
The backend SHALL provide a `GET /api/v1/chat/suggestions` endpoint that queries the knowledge graph for user-specific actionable items and returns up to 8 dynamic prompt suggestions. Actionable items include: overdue tasks, stale clients (no interaction in 30+ days), active compliance alerts, portfolios with drift above threshold.

#### Scenario: Suggestions returned based on graph state
- **WHEN** the frontend calls `GET /api/v1/chat/suggestions`
- **THEN** the backend queries the user's graph subgraph for actionable items
- **AND** returns suggestions like `[{text: "Review compliance alert for Client X", icon: "shield"}, ...]`

#### Scenario: Graph unavailable for suggestions
- **WHEN** Neo4j is unreachable during a suggestions request
- **THEN** the endpoint returns an empty array (frontend falls back to static suggestions)
