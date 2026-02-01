# Implementation Tasks

## 1. Backend - Tool Definitions
- [x] 1.1 Define tool schemas for all query operations
- [x] 1.2 Create `query_clients` tool with filter, sort, limit, and aggregation options
- [x] 1.3 Create `query_orders` tool with date range and status filters
- [x] 1.4 Create `query_goals` tool with progress and target filters
- [x] 1.5 Create `query_tasks` tool with status and priority filters
- [x] 1.6 Create `query_activities` tool with type and date filters
- [x] 1.7 Create `aggregate_portfolio` tool for AUM and distribution calculations
- [x] 1.8 Create `search_clients_by_name` tool for fuzzy name matching (integrated into query_clients)

## 2. Backend - Query Execution Engine
- [x] 2.1 Implement secure query builder with parameterized queries
- [x] 2.2 Add query validation and sanitization layer
- [x] 2.3 Implement user-scoped data access (advisor_id filtering)
- [x] 2.4 Add result pagination for large datasets (limit parameter)
- [x] 2.5 Implement query timeout handling (max 5 tool calls)
- [x] 2.6 Add error handling for invalid queries

## 3. Backend - AI Integration
- [x] 3.1 Update system prompt with tool descriptions and usage examples
- [x] 3.2 Configure AI model for function calling (using Claude Sonnet 4)
- [x] 3.3 Implement tool call parsing from AI response
- [x] 3.4 Execute tool calls and inject results back into conversation
- [x] 3.5 Handle multi-turn tool calling (up to 5 iterations)
- [x] 3.6 Format query results as markdown for AI consumption

## 4. Backend - Security & Performance
- [x] 4.1 Add rate limiting for query operations (max 5 queries per request)
- [x] 4.2 Implement query complexity scoring (result limits: 50 for clients/goals/tasks, 100 for orders)
- [x] 4.3 All queries scoped to authenticated user's advisor_id
- [ ] 4.4 Create database indexes for common query patterns (optional optimization)
- [ ] 4.5 Implement query result caching for repeated queries (optional optimization)

## 5. Frontend - UX Enhancements
- [x] 5.1 Add "Querying data..." indicator when AI is fetching
- [x] 5.2 Updated loading states with Database icon and Loader
- [x] 5.3 Add error handling for failed queries (existing toast system)
- [x] 5.4 Updated sample prompts to be data-centric

## 6. Testing & Validation
- [ ] 6.1 Write unit tests for query builder
- [ ] 6.2 Test security: ensure users cannot access other advisors' data
- [ ] 6.3 Test edge cases: empty results, invalid filters
- [ ] 6.4 Performance test with large datasets
- [ ] 6.5 End-to-end test common user queries
