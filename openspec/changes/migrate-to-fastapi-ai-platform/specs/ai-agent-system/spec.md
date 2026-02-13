# Capability: AI Agent System

End-to-end multi-agent orchestration framework powered by OpenAI GPT, with specialized agents for wealth management domains, tool/function calling, agent memory, inter-agent delegation, and streaming responses.

## ADDED Requirements

### Requirement: Agent Orchestrator with Intent-Based Routing
The system MUST provide a supervisor/orchestrator that classifies user intent and routes messages to the appropriate specialized agent.

#### Scenario: Portfolio question routed to Portfolio Intelligence Agent
- **Given** a user sends "How is Rajesh Kumar's portfolio performing?"
- **When** the orchestrator processes the message
- **Then** the message is routed to the Portfolio Intelligence Agent with extracted entity `CLIENT_NAME: "Rajesh Kumar"`

#### Scenario: Compliance question routed to Compliance Sentinel Agent
- **Given** a user sends "Which clients have expiring KYC?"
- **When** the orchestrator processes the message
- **Then** the message is routed to the Compliance Sentinel Agent

#### Scenario: Ambiguous query gets clarification
- **Given** a user sends a vague message like "help me"
- **When** the orchestrator cannot determine a clear intent
- **Then** the Advisor Assistant Agent handles it and asks a clarifying question

---

### Requirement: Specialized Agent Pool
The system MUST provide 8 specialized agents, each with domain-specific system prompts, tools, and capabilities.

#### Scenario: Portfolio Intelligence Agent analyzes drift
- **Given** a client has a portfolio with target allocation 60% equity / 40% debt
- **When** the Portfolio Intelligence Agent is asked to analyze drift
- **Then** it uses the `get_client_portfolio` and `calculate_drift` tools to return current vs target allocation with drift percentage

#### Scenario: Growth Engine Agent prioritizes clients
- **Given** an advisor has 50 clients with varying engagement levels
- **When** the Growth Engine Agent runs prioritization
- **Then** it returns a scored list of clients ranked by urgency with recommended next actions

#### Scenario: Meeting Intelligence Agent prepares for a meeting
- **Given** an advisor has a meeting with client "Priya Sharma" tomorrow
- **When** the Meeting Intelligence Agent is asked to prepare
- **Then** it compiles client profile, recent activity, portfolio performance, pending items, and talking points

#### Scenario: Tax Optimizer Agent finds opportunities
- **Given** a client has unrealized losses in specific holdings
- **When** the Tax Optimizer Agent analyzes the portfolio
- **Then** it identifies tax-loss harvesting opportunities with estimated tax savings

---

### Requirement: OpenAI GPT Integration with Function Calling
The system MUST use OpenAI GPT models (GPT-4o for complex reasoning, GPT-4o-mini for lightweight tasks) with native function calling for tool execution.

#### Scenario: Agent calls a database tool during conversation
- **Given** the Portfolio Agent receives "Show holdings for client ABC"
- **When** GPT generates a tool call for `get_client_portfolio(client_id="ABC")`
- **Then** the tool executes against PostgreSQL, returns data, and GPT formulates a response using the data

#### Scenario: Agent uses multiple tools in sequence
- **Given** a user asks "Rebalance suggestions for Rajesh Kumar"
- **When** the agent processes this request
- **Then** it calls `get_client_portfolio`, then `get_target_allocation`, then `calculate_drift` to produce a rebalancing recommendation

---

### Requirement: Agent Memory and Conversation Context
The system MUST maintain both short-term (session) and long-term (persistent) memory for agent conversations.

#### Scenario: Agent remembers earlier context in same conversation
- **Given** a user previously asked about "Rajesh Kumar's portfolio" in the same conversation
- **When** the user follows up with "What about his goals?"
- **Then** the agent understands "his" refers to Rajesh Kumar and fetches goal data

#### Scenario: Long conversations are summarized for context
- **Given** a conversation has more than 20 messages
- **When** the next message is processed
- **Then** older messages are summarized into a context summary to maintain relevant context within token limits

---

### Requirement: Inter-Agent Delegation
The system MUST allow agents to delegate sub-tasks to other specialized agents when their expertise is needed.

#### Scenario: Advisor Agent delegates tax question to Tax Optimizer
- **Given** a user asks the Advisor Agent about a client's tax situation
- **When** the Advisor Agent recognizes this is a tax-specialized question
- **Then** it delegates to the Tax Optimizer Agent and incorporates the response into its answer

---

### Requirement: Streaming Agent Responses
All agent responses MUST support streaming via WebSocket, providing real-time token delivery and status updates.

#### Scenario: Agent response streams token by token
- **Given** a user sends a message via WebSocket
- **When** the agent generates a response
- **Then** tokens are streamed as `stream_token` events in real-time

#### Scenario: Agent status updates during tool execution
- **Given** an agent needs to call a tool that takes time
- **When** the tool is executing
- **Then** an `agent_status` event is sent with message like "Analyzing portfolio holdings..."
