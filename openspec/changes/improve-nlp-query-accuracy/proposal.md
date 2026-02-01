# Change: Improve NLP Query Accuracy for AI Copilot

## Why

The current NLP-to-query implementation has accuracy issues:

1. **Ambiguous query interpretation** - The AI sometimes misinterprets user intent (e.g., "top clients" could mean by AUM, by activity, or by growth)
2. **Missing context awareness** - No understanding of financial terminology synonyms (e.g., "AUM" = "assets under management" = "total assets")
3. **Poor number parsing** - "$5M", "5 million", "5,000,000" may not be correctly interpreted
4. **Date/time ambiguity** - "Last week", "this month", "Q1" need proper parsing
5. **No query validation** - AI can generate invalid filter combinations
6. **Limited entity recognition** - Client names, stock symbols need smarter matching
7. **No conversation context** - Follow-up questions don't reference previous results

The goal is to make the copilot understand natural language queries with **95%+ accuracy** for common wealth management questions.

## What Changes

### 1. Enhanced System Prompt with Query Examples
- Add 50+ detailed query examples with expected tool parameters
- Include financial terminology glossary
- Add explicit disambiguation rules

### 2. Query Intent Classification
- Pre-classify query intent before tool selection
- Categories: client_lookup, portfolio_analysis, order_history, task_management, activity_log, aggregation
- Use chain-of-thought reasoning for complex queries

### 3. Smart Value Parsing
- Currency parsing: "$5M" → 5000000, "five million" → 5000000
- Date parsing: "last week" → days_ago=7, "Q1 2024" → date range
- Percentage parsing: "over 50%" → min_progress=50
- Entity extraction: client names, stock symbols, status values

### 4. Query Validation Layer
- Validate tool parameters before execution
- Auto-correct common mistakes
- Suggest alternatives for invalid queries

### 5. Conversation Context
- Track previous query results
- Enable follow-up refinements ("Show me only the active ones")
- Reference entities from previous responses

### 6. Fuzzy Matching
- Levenshtein distance for client name matching
- Synonym expansion for risk profiles, statuses
- Partial symbol matching for stocks/funds

### 7. Query Confidence Scoring
- Assign confidence score to each query interpretation
- Ask for clarification when confidence < 80%
- Show interpretation to user for complex queries

## Impact

### Affected Specs
- `ai-copilot` (enhanced query capabilities)

### Affected Code
- `supabase/functions/portfolio-copilot/index.ts` - Major enhancements to system prompt and tool handling

### Breaking Changes
- None - Backwards compatible improvements

### Performance Considerations
- Slightly longer initial response time due to intent classification
- May use more tokens for chain-of-thought reasoning
- Consider caching for common queries

## Example Improvements

### Before:
```
User: "Show me Smith's portfolio"
AI: Error - no client named "Smith's portfolio" found
```

### After:
```
User: "Show me Smith's portfolio"
AI: [Uses fuzzy matching to find "John Smith" or "Smith Family Trust"]
AI: Found 2 clients matching "Smith": John Smith ($5.2M) and Smith Family Trust ($12.8M). Which would you like to see?
```

### Before:
```
User: "Clients with over 5 mil"
AI: [Doesn't parse "5 mil" correctly]
```

### After:
```
User: "Clients with over 5 mil"
AI: [Parses "5 mil" as 5,000,000]
AI: Found 8 clients with assets over $5M: ...
```

### Before:
```
User: "High risk clients"
AI: [May use wrong field or miss some]
```

### After:
```
User: "High risk clients"
AI: [Maps "high risk" → risk_profile="aggressive"]
AI: Found 12 clients with aggressive risk profile: ...
```
