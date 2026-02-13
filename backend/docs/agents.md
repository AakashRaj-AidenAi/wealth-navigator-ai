# AI Agent System Reference

## Architecture
The platform uses a multi-agent architecture powered by OpenAI GPT-4o with native function calling.

### Agent Pipeline
```
User Message → NLP Pipeline → Orchestrator → Agent → Streaming Response
```

### NLP Pipeline
Runs concurrently via `asyncio.gather()`:
1. **Intent Classifier** — Categorizes into 14 intent types
2. **Entity Extractor** — Extracts 9 entity types (CLIENT_NAME, TICKER_SYMBOL, etc.)
3. **Sentiment Analyzer** — Score (-1.0 to 1.0) + classification + urgency
4. **Query Parser** — Converts natural language to structured filters

## Agents

### Portfolio Intelligence Agent
- **Name**: `portfolio_intelligence`
- **Model**: GPT-4o
- **Tools**: `get_client_portfolio`, `calculate_drift`, `get_target_allocation`, `analyze_concentration`, `get_performance_history`
- **Intents**: portfolio_analysis, risk_assessment, rebalance_request

### CIO Strategy Agent
- **Name**: `cio_strategy`
- **Model**: GPT-4o
- **Tools**: `get_sector_allocation`, `get_market_overview`, `analyze_macro_trends`
- **Intents**: report_generation

### Advisor Assistant Agent
- **Name**: `advisor_assistant`
- **Model**: GPT-4o
- **Tools**: `get_client_profile`, `get_recent_activity`, `get_engagement_score`, `search_clients`
- **Intents**: client_lookup, general_chat, order_management

### Compliance Sentinel Agent
- **Name**: `compliance_sentinel`
- **Model**: GPT-4o
- **Tools**: `check_kyc_status`, `get_compliance_alerts`, `get_audit_trail`
- **Intents**: compliance_check

### Tax Optimizer Agent
- **Name**: `tax_optimizer`
- **Model**: GPT-4o-mini
- **Tools**: `get_unrealized_gains_losses`, `find_harvesting_opportunities`, `estimate_tax_impact`
- **Intents**: tax_optimization

### Meeting Intelligence Agent
- **Name**: `meeting_intelligence`
- **Model**: GPT-4o
- **Tools**: `get_client_summary`, `get_pending_items`, `get_recent_communications`, `generate_talking_points`
- **Intents**: meeting_prep

### Growth Engine Agent
- **Name**: `growth_engine`
- **Model**: GPT-4o-mini
- **Tools**: `score_clients`, `predict_churn`, `identify_opportunities`, `get_silent_clients`
- **Intents**: lead_management, campaign_creation, churn_prediction

### Funding Risk Agent
- **Name**: `funding_risk`
- **Model**: GPT-4o-mini
- **Tools**: `get_cash_flow_forecast`, `analyze_settlement_risk`, `get_withdrawal_patterns`, `get_funding_alerts`
- **Intents**: funding_analysis

## Inter-Agent Delegation
Any agent can delegate to another via `self.delegate(agent_name, sub_query)`.

## Memory System
- **Short-term**: Last 20 messages in session
- **Long-term**: PostgreSQL `conversation_summaries` table
- **Auto-summarization**: Triggers when conversation exceeds 40 messages

## Chat Commands
- `/analyze {client}` → Portfolio Intelligence Agent
- `/rebalance {client}` → Portfolio Intelligence Agent
- `/draft-email {client}` → Growth Engine Agent
- `/meeting-prep {client}` → Meeting Intelligence Agent
