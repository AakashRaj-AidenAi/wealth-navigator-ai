# Design: NLP-Powered Dynamic Data Querying

## Context

The current WealthOS Copilot pre-loads all client data into the system prompt. This works for small datasets but doesn't scale and prevents real-time, filtered queries. We need to enable the AI to dynamically query the database based on user questions.

## Goals

- Enable real-time data queries from natural language questions
- Support filtering, sorting, aggregation, and complex queries
- Maintain security (user can only access their own data)
- Keep response latency reasonable (<3 seconds for most queries)

## Non-Goals

- Write operations (INSERT, UPDATE, DELETE) - read-only for now
- Cross-advisor data access (even for compliance, use dedicated reports)
- Raw SQL exposure to AI (use structured tool parameters instead)

## Decisions

### Decision 1: Use AI Tool/Function Calling

**What**: Use the AI model's native function calling capability to let the AI request data.

**Why**:
- Structured, type-safe interface between AI and database
- AI decides when and what to query based on user intent
- Easier to validate and sanitize than raw SQL generation
- Works with multiple AI providers (Claude, Gemini, OpenAI)

**Alternatives considered**:
- **Raw SQL generation** - Too risky for injection, hard to validate
- **Pre-defined query templates** - Not flexible enough for natural language
- **Vector search** - Good for semantic search but not for structured queries

### Decision 2: Tool Schema Design

**What**: Define a set of query tools with structured parameters.

**Tool definitions**:

```typescript
// Tool: query_clients
{
  name: "query_clients",
  description: "Query client data with filters, sorting, and aggregation",
  parameters: {
    filter: {
      client_name: { contains?: string, equals?: string },
      total_assets: { gte?: number, lte?: number, gt?: number, lt?: number },
      risk_profile: { in?: string[] },
      status: { in?: string[] },
      tags: { hasAny?: string[] },
      kyc_expiry_date: { before?: string, after?: string }
    },
    orderBy: "total_assets" | "client_name" | "created_at" | "updated_at",
    orderDirection: "asc" | "desc",
    limit: number, // max 50
    include: ("goals" | "orders" | "activities" | "family" | "tags")[]
  }
}

// Tool: query_orders
{
  name: "query_orders",
  description: "Query orders with date ranges and status filters",
  parameters: {
    filter: {
      client_id?: string,
      order_type?: "buy" | "sell",
      status?: "pending" | "executed" | "cancelled",
      symbol?: { contains?: string },
      created_after?: string, // ISO date
      created_before?: string,
      amount_gte?: number,
      amount_lte?: number
    },
    orderBy: "created_at" | "total_amount" | "quantity",
    limit: number // max 100
  }
}

// Tool: aggregate_portfolio
{
  name: "aggregate_portfolio",
  description: "Calculate portfolio aggregations and metrics",
  parameters: {
    metric: "total_aum" | "client_count" | "avg_assets" | "asset_distribution" | "risk_distribution" | "status_distribution",
    groupBy?: "risk_profile" | "status" | "tag",
    filter?: { /* same as query_clients filter */ }
  }
}

// Tool: query_tasks
{
  name: "query_tasks",
  description: "Query tasks by status, priority, and due date",
  parameters: {
    filter: {
      status?: ("todo" | "in_progress" | "done" | "cancelled")[],
      priority?: ("low" | "medium" | "high" | "urgent")[],
      due_before?: string,
      due_after?: string,
      client_id?: string,
      overdue?: boolean
    },
    orderBy: "due_date" | "priority" | "created_at",
    limit: number // max 50
  }
}
```

### Decision 3: Query Execution Architecture

**What**: Tool calls are executed server-side within the edge function.

**Flow**:
```
1. User sends message
2. Edge function sends to AI with tool definitions
3. AI responds with tool_calls (if needed)
4. Edge function executes each tool call against Supabase
5. Results injected as tool_results
6. AI generates final response with data
7. Stream response to user
```

**Why**:
- Server-side execution protects database credentials
- Can enforce user-scoped access (advisor_id)
- Centralized validation and rate limiting

### Decision 4: Use Claude for Tool Calling

**What**: Switch from Gemini to Claude (Anthropic API) for better tool calling support.

**Why**:
- Claude has excellent function calling with structured outputs
- Better reasoning about when to use tools
- Streaming works well with tool use
- Can fall back to Gemini if needed

**Alternative**: Use Gemini's function calling (available but less mature)

### Decision 5: Security Model

**What**: All queries are automatically scoped to the authenticated user.

**Implementation**:
```typescript
// Every query includes:
.eq('advisor_id', user.id)

// Or for related tables:
.in('client_id', userClientIds)
```

**Validation rules**:
- Max 50 results per query
- Max 5 tool calls per message
- Query timeout: 5 seconds
- No joins to tables outside user scope

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| AI generates invalid filter parameters | Validate against JSON schema before execution |
| Slow queries impact response time | Add query timeout, limit result size, add indexes |
| Token usage increases with tool definitions | Keep tool descriptions concise, consider caching |
| AI over-queries (unnecessary tool calls) | Add examples in system prompt for when to query |
| Injection via filter values | Use parameterized queries only (Supabase handles this) |

## Migration Plan

1. **Phase 1**: Implement tools alongside existing static data loading (feature flag)
2. **Phase 2**: Test with subset of users
3. **Phase 3**: Remove static data loading, use tools only
4. **Rollback**: Re-enable static loading if issues arise

## Open Questions

1. Should we cache frequent queries (e.g., "top 10 clients") to reduce database load?
2. Do we need a separate "explain query" tool for debugging?
3. Should compliance officers have access to cross-advisor queries via copilot?
