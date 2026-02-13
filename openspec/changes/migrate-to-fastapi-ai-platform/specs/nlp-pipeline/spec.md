# Capability: NLP Pipeline

Natural language processing pipeline that classifies user intent, extracts entities, analyzes sentiment, and converts natural language queries into structured database queries — all powered by OpenAI GPT models.

## ADDED Requirements

### Requirement: Intent Classification
The system MUST classify every user message into a specific intent category to guide agent routing and response generation.

#### Scenario: Portfolio analysis intent detected
- **Given** a user sends "How is my client's portfolio doing?"
- **When** the NLP pipeline processes the message
- **Then** the intent is classified as `portfolio_analysis` with high confidence

#### Scenario: Order management intent detected
- **Given** a user sends "Place a buy order for 100 shares of HDFC Bank for Rajesh"
- **When** the NLP pipeline processes the message
- **Then** the intent is classified as `order_management`

#### Scenario: Multi-intent message handled
- **Given** a user sends "Check Rajesh's portfolio and also his KYC status"
- **When** the NLP pipeline processes the message
- **Then** both `portfolio_analysis` and `compliance_check` intents are identified

---

### Requirement: Named Entity Extraction
The system MUST extract structured entities from user messages including client names, ticker symbols, monetary amounts, dates, percentages, and asset classes.

#### Scenario: Client name and ticker extracted
- **Given** a user sends "Buy 50 shares of RELIANCE for Priya Sharma"
- **When** entity extraction runs
- **Then** entities extracted: `CLIENT_NAME: "Priya Sharma"`, `TICKER_SYMBOL: "RELIANCE"`, `AMOUNT: "50 shares"`, `ORDER_TYPE: "buy"`

#### Scenario: Date and amount extracted
- **Given** a user sends "Show clients with AUM above 50 lakhs who haven't been contacted since January"
- **When** entity extraction runs
- **Then** entities extracted: `AMOUNT: "50 lakhs"`, `DATE: "January"`

---

### Requirement: Sentiment Analysis for Communications
The system MUST analyze sentiment of client communications and chat messages, producing a score and classification.

#### Scenario: Negative sentiment detected in client email
- **Given** a client communication says "I'm very unhappy with the recent portfolio losses and considering moving my investments"
- **When** sentiment analysis runs
- **Then** sentiment is classified as `negative` with score below -0.5, and a churn risk flag is raised

#### Scenario: Positive sentiment detected
- **Given** a client communication says "Thank you for the great advice, my portfolio is performing wonderfully"
- **When** sentiment analysis runs
- **Then** sentiment is classified as `positive` with score above 0.5

---

### Requirement: Natural Language to Structured Query
The system MUST parse natural language filter/search requests into structured database queries.

#### Scenario: Natural language filter converted to query parameters
- **Given** a user says "Show me aggressive risk profile clients with AUM over 1 crore"
- **When** the query parser processes this
- **Then** it produces structured filters: `{"risk_profile": "aggressive", "total_assets_min": 10000000}`

#### Scenario: Temporal query parsed correctly
- **Given** a user says "Clients I haven't contacted in the last 30 days"
- **When** the query parser processes this
- **Then** it produces a filter: `{"last_contact_before": "2026-01-14"}` (30 days ago from current date)

---

### Requirement: NLP Pipeline Runs Efficiently
The pipeline MUST use GPT-4o-mini for lightweight NLP tasks (intent, entities) to minimize cost and latency, while using GPT-4o only for complex reasoning.

#### Scenario: Intent classification uses lightweight model
- **Given** a user message needs intent classification
- **When** the NLP pipeline processes it
- **Then** GPT-4o-mini is used for intent and entity extraction (not GPT-4o)

#### Scenario: Pipeline runs intent and entity extraction in parallel
- **Given** a user message arrives
- **When** the NLP pipeline processes it
- **Then** intent classification, entity extraction, and sentiment analysis run concurrently for minimum latency
