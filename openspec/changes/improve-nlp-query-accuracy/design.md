# Design: Improve NLP Query Accuracy

## Context

The current AI Copilot uses function calling to query the database, but the natural language understanding is basic. Users experience frustration when common phrases aren't understood correctly.

## Goals

- Achieve 95%+ accuracy for common wealth management queries
- Handle financial terminology and abbreviations
- Support conversational follow-ups
- Gracefully handle ambiguous queries

## Non-Goals

- Full SQL generation (keeping structured tool parameters)
- Multi-language support (English only)
- Voice input processing

## Decisions

### Decision 1: Enhanced System Prompt with Few-Shot Examples

**What**: Expand the system prompt with 50+ concrete examples showing natural language → tool parameters mapping.

**Why**:
- Few-shot prompting significantly improves accuracy
- Examples cover edge cases and variations
- No additional API calls needed

**Implementation**:
```typescript
const QUERY_EXAMPLES = `
## Query Examples (FOLLOW THESE PATTERNS EXACTLY)

### Client Queries
- "top 10 clients" → aggregate_portfolio(metric="top_clients", top_n=10)
- "clients over $5M" → query_clients(min_assets=5000000)
- "clients with more than 5 million" → query_clients(min_assets=5000000)
- "high risk clients" → query_clients(risk_profile="aggressive")
- "aggressive clients" → query_clients(risk_profile="aggressive")
- "conservative investors" → query_clients(risk_profile="conservative")
- "inactive clients" → query_clients(status="inactive")
- "find John Smith" → query_clients(name_contains="John Smith")
- "Smith family" → query_clients(name_contains="Smith")

### Order Queries
- "recent buys" → query_orders(order_type="buy", days_ago=7)
- "sells this month" → query_orders(order_type="sell", days_ago=30)
- "pending orders" → query_orders(status="pending")
- "AAPL trades" → query_orders(symbol_contains="AAPL")

### Task Queries
- "overdue tasks" → query_tasks(overdue=true)
- "urgent tasks" → query_tasks(priority="urgent")
- "tasks due this week" → query_tasks(due_within_days=7)

### Aggregation Queries
- "total AUM" → aggregate_portfolio(metric="total_aum")
- "how many clients" → aggregate_portfolio(metric="client_count")
- "risk distribution" → aggregate_portfolio(metric="risk_distribution")
- "average portfolio size" → aggregate_portfolio(metric="avg_assets")
`;
```

### Decision 2: Financial Terminology Glossary

**What**: Include a glossary mapping financial terms to database fields.

**Why**:
- Users use various terms for the same concept
- Reduces misinterpretation

**Implementation**:
```typescript
const TERMINOLOGY_GLOSSARY = `
## Financial Terminology Mapping

### Asset Terms (all map to total_assets field)
- AUM, Assets Under Management, portfolio size, holdings, wealth, net worth

### Risk Terms
- "high risk", "aggressive", "growth" → risk_profile="aggressive"
- "medium risk", "moderate", "balanced" → risk_profile="moderate"
- "low risk", "conservative", "safe" → risk_profile="conservative"

### Status Terms
- "active", "current" → status="active"
- "inactive", "dormant", "sleeping" → status="inactive"
- "prospect", "potential", "lead" → status="prospect"

### Time Expressions
- "today" → days_ago=0
- "yesterday" → days_ago=1
- "this week", "last 7 days" → days_ago=7
- "this month", "last 30 days" → days_ago=30
- "this quarter", "last 90 days" → days_ago=90
- "this year", "YTD" → days_ago=365
`;
```

### Decision 3: Smart Value Parser Functions

**What**: Add helper functions to parse common value formats in tool arguments.

**Why**:
- "$5M" needs to become 5000000
- "last week" needs to become days_ago=7
- Centralized parsing ensures consistency

**Implementation in tool descriptions**:
```typescript
// Enhanced tool parameter descriptions
{
  name: "min_assets",
  type: "number",
  description: `Minimum total assets in dollars. Parse these formats:
    - "$5M" or "5M" → 5000000
    - "$5 million" → 5000000
    - "5,000,000" → 5000000
    - "$500K" → 500000
    Example: For "clients over $5M", use min_assets=5000000`
}
```

### Decision 4: Query Intent Classification

**What**: Add explicit intent classification step in the system prompt.

**Why**:
- Forces the AI to think about query type first
- Reduces tool selection errors
- Enables better error messages

**Implementation**:
```typescript
const INTENT_CLASSIFICATION = `
## Query Processing Steps

BEFORE selecting a tool, classify the user's intent:

1. **IDENTIFY INTENT**: Is this about clients, orders, tasks, goals, activities, or metrics?
2. **EXTRACT ENTITIES**: What specific names, amounts, dates are mentioned?
3. **DETERMINE FILTERS**: What criteria should narrow the results?
4. **SELECT TOOL**: Choose the most appropriate tool
5. **SET PARAMETERS**: Map extracted values to tool parameters

Example thought process:
User: "Show me high-value aggressive clients"
- Intent: client lookup
- Entities: none specific
- Filters: high-value (high assets), aggressive (risk profile)
- Tool: query_clients
- Parameters: min_assets=5000000, risk_profile="aggressive"
`;
```

### Decision 5: Fuzzy Name Matching

**What**: Implement fuzzy matching for client names in query execution.

**Why**:
- Users may not remember exact client names
- Partial matches are often intended
- Handles typos gracefully

**Implementation** (in executeQueryClients):
```typescript
// If exact match fails, try fuzzy matching
if (params.name_contains && data.length === 0) {
  // Try variations
  const variations = [
    params.name_contains,
    params.name_contains.split(' ')[0], // First name only
    params.name_contains.split(' ').pop(), // Last name only
  ];

  for (const variation of variations) {
    const fuzzyQuery = await supabase
      .from('clients')
      .select('*')
      .eq('advisor_id', userId)
      .ilike('client_name', `%${variation}%`);

    if (fuzzyQuery.data?.length) {
      return formatClientResults(fuzzyQuery.data, `Fuzzy match for "${params.name_contains}"`);
    }
  }
}
```

### Decision 6: Clarification for Ambiguous Queries

**What**: Add explicit guidance for when to ask clarifying questions.

**Why**:
- Better to ask than to return wrong results
- Improves user experience
- Builds trust in the system

**Implementation**:
```typescript
const CLARIFICATION_RULES = `
## When to Ask for Clarification

Ask the user to clarify when:

1. **Multiple matching clients**: "I found 3 clients named 'Smith'. Did you mean John Smith, Mary Smith, or Smith Family Trust?"

2. **Ambiguous time range**: "When you say 'recent', do you mean the last week, month, or something else?"

3. **Missing required context**: "To show orders for a client, I need to know which client. Who are you asking about?"

4. **Conflicting criteria**: "You asked for 'conservative high-growth' clients, but these are typically opposite risk profiles. Would you like conservative clients or high-growth focused clients?"

DO NOT guess when uncertain. It's better to ask than return wrong data.
`;
```

### Decision 7: Conversation Context Tracking

**What**: Include previous query results context in follow-up requests.

**Why**:
- Enables natural follow-up questions
- "Show me only active ones" should reference previous results
- Better conversational experience

**Implementation**:
The frontend already sends message history. Enhance the system prompt to leverage it:

```typescript
const CONVERSATION_CONTEXT = `
## Follow-up Query Handling

When the user's query references previous results:

1. **"Only the active ones"** → Add status="active" filter to previous query
2. **"Sort by name"** → Re-run previous query with order_by="client_name"
3. **"More details on the first one"** → Query specific client from previous results
4. **"What about their orders?"** → Query orders for clients from previous results

The conversation history is provided. Use it to understand follow-up context.
`;
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Longer system prompt increases latency | Use concise examples, test performance |
| More complex prompt may confuse AI | Test thoroughly, iterate on wording |
| Fuzzy matching may return wrong client | Always show what was matched, allow correction |
| Token usage increases | Monitor costs, consider caching |

## Testing Strategy

1. Create a test suite of 100+ queries covering:
   - Simple queries (exact terms)
   - Variations (synonyms, abbreviations)
   - Compound queries (multiple filters)
   - Follow-up queries
   - Edge cases (typos, ambiguity)

2. Measure accuracy before and after changes

3. A/B test with real users if possible

## Migration Plan

1. Update system prompt with new examples and glossary
2. Deploy and monitor accuracy metrics
3. Iterate based on user feedback
4. Consider query logging for continuous improvement
