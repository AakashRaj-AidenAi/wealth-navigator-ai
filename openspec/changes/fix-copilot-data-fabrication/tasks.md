# Implementation Tasks

## 1. Force Tool Usage
- [ ] 1.1 Change `tool_choice` from `"auto"` to `"required"` for initial API call when tools are available
- [ ] 1.2 Keep `tool_choice: "auto"` for follow-up calls after tool results are received
- [ ] 1.3 Add logging to confirm tool_choice setting

## 2. Improve System Prompt
- [ ] 2.1 Restructure prompt with explicit "PHASE 1: Call tools" and "PHASE 2: Format results" sections
- [ ] 2.2 Add examples of FORBIDDEN fabricated names (Sterling Family Trust, Montgomery, Dr. Elena Rodriguez)
- [ ] 2.3 Add instruction: "If you don't have tool results, respond ONLY with: 'Let me query your data...'"
- [ ] 2.4 Remove any language that might imply the AI has prior knowledge of clients

## 3. Authentication Error Handling
- [ ] 3.1 Return explicit error response when userId is null instead of proceeding without tools
- [ ] 3.2 Add `X-Auth-Status` header to response for debugging
- [ ] 3.3 Log detailed auth failure reasons (missing header, invalid token, etc.)

## 4. Tool Call Verification
- [ ] 4.1 Track `toolCallsMade` counter during request processing
- [ ] 4.2 If data question answered with `toolCallsMade === 0`, log warning
- [ ] 4.3 Add `X-Tools-Called` header to response for debugging

## 5. Response Validation (Optional Enhancement)
- [ ] 5.1 Extract client names from tool results
- [ ] 5.2 Check if response mentions names not in tool results
- [ ] 5.3 Log potential fabrication attempts

## 6. Testing & Deployment
- [ ] 6.1 Test with authenticated user: "show my top client"
- [ ] 6.2 Test with unauthenticated user: verify error message
- [ ] 6.3 Verify real client names appear (Vikram Patel, Rajesh Sharma, Priya Mehta)
- [ ] 6.4 Deploy edge function: `supabase functions deploy portfolio-copilot`
