# Proposal: Fix Copilot Data Fabrication

## Problem Statement

The AI Copilot is fabricating fake client data instead of querying the actual database. When asked "show my top client", it returns fictional data like "The Sterling Family Trust" with $18.42M instead of the real clients (Vikram Patel $50M, Rajesh Sharma $25M, Priya Mehta $15M, etc.).

### Root Cause Analysis

After investigating the edge function code, the issue has multiple potential causes:

1. **Tool Choice Setting**: The AI is using `tool_choice: "auto"` which allows the model to decide whether to use tools. For data queries, it should be `tool_choice: "required"` to force tool usage.

2. **Weak System Prompt Enforcement**: Despite instructions saying "MUST use tools", the model is still fabricating data, indicating the prompt isn't strong enough or the model is ignoring it.

3. **Authentication Flow**: If the user's session token isn't being passed correctly, `userId` will be null, tools won't be provided, and the AI will fabricate data without any indication to the user.

4. **No Tool Call Verification**: The system doesn't verify that tools were actually called before presenting data to the user.

## Proposed Solution

### 1. Force Tool Usage for Data Queries
- Change `tool_choice` from `"auto"` to `"required"` for the initial request when tools are available
- This ensures the AI MUST call a tool before responding

### 2. Add Data Source Verification
- Track whether tool calls were made during the conversation
- If a data query is answered without tool calls, inject a warning or re-prompt

### 3. Improve System Prompt Structure
- Use a two-phase approach: first call tools, then format results
- Add explicit "NEVER fabricate" examples with the exact fake data patterns to avoid

### 4. Add Authentication Feedback
- Return clear error when user isn't authenticated instead of silently failing
- Log authentication status for debugging

### 5. Add Response Validation
- Check if the response contains tool result data
- If response mentions client names not in tool results, flag as fabrication

## Scope

- **In Scope**:
  - Edge function `portfolio-copilot` modifications
  - System prompt improvements
  - Tool choice configuration
  - Authentication error handling

- **Out of Scope**:
  - Frontend UI changes (already has loading states)
  - New tools or database queries
  - Model selection changes

## Success Criteria

1. Query "show my top client" returns actual database clients (Vikram Patel, Rajesh Sharma, etc.)
2. No fabricated client names appear in responses
3. Clear error message if user not authenticated
4. Tool calls are logged and verifiable
