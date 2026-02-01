# Change: Add NLP-Powered Dynamic Data Querying to AI Copilot

## Why

Currently, the WealthOS Copilot loads **all** client data into the system prompt at startup, regardless of what the user asks. This approach has several problems:

1. **Dummy/stale data** - The AI generates responses based on a static snapshot, not real-time queries
2. **Context window waste** - Loading all clients, goals, and orders consumes tokens even when irrelevant
3. **No dynamic filtering** - Cannot answer questions like "Show clients with AUM > $5M" or "Find orders from last week"
4. **Scalability issues** - As client base grows, the static approach becomes impractical
5. **No aggregations** - Cannot compute sums, averages, or complex metrics on-demand

The solution is to implement **NLP-to-SQL** (or NLP-to-API) translation, where the AI:
1. Analyzes the user's natural language question
2. Determines what data is needed
3. Generates and executes appropriate database queries
4. Returns results based on actual, real-time data

## What Changes

### Backend (Edge Function)
- **Add function calling/tool use** - Enable AI to call data-fetching tools
- **Implement query tools** - Create functions for:
  - `query_clients` - Filter, sort, aggregate client data
  - `query_orders` - Search orders with date ranges, status filters
  - `query_goals` - Find goals by progress, target, client
  - `query_tasks` - Get tasks by status, priority, due date
  - `query_activities` - Search client interactions
  - `aggregate_portfolio` - Calculate AUM, distributions, performance
- **Query validation** - Sanitize and validate generated queries for security
- **Result formatting** - Transform query results into AI-readable context

### AI Model Configuration
- **Enable tool/function calling** - Configure Gemini or switch to a model with native tool support
- **Update system prompt** - Describe available data tools and when to use them
- **Multi-turn support** - Allow AI to make multiple queries per response

### Frontend (Optional Enhancements)
- **Query indicator** - Show when AI is fetching data
- **Data source badges** - Indicate which tables were queried
- **Refresh capability** - Allow manual data refresh

## Impact

### Affected Specs
- `ai-copilot` (new capability)

### Affected Code
- `supabase/functions/portfolio-copilot/index.ts` - Major rewrite
- `src/pages/Copilot.tsx` - Minor updates for loading states
- `src/components/ai/AICopilot.tsx` - Minor updates for loading states

### Breaking Changes
- None - Existing chat interface remains the same

### Database
- No schema changes required
- May need to add indexes for common query patterns

### Security Considerations
- All queries must be scoped to the authenticated user's data
- Query parameters must be sanitized to prevent injection
- Rate limiting for query operations
- Audit logging for sensitive data access

## Example User Interactions

**Before (static data):**
> User: "Show me clients with assets over $10 million"
> AI: *Searches through pre-loaded static list, may miss recent changes*

**After (dynamic querying):**
> User: "Show me clients with assets over $10 million"
> AI: *Calls `query_clients({ filter: { total_assets: { gte: 10000000 } }, orderBy: 'total_assets' })`*
> AI: *Returns real-time results from database*

**Complex query example:**
> User: "What's the total AUM for VIP clients who haven't been contacted in 30 days?"
> AI: *Calls `query_clients({ tags: ['vip'] })` + `query_activities({ within_days: 30 })`*
> AI: *Cross-references and calculates aggregate*
