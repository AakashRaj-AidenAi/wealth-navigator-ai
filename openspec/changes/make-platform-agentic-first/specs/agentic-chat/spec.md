## ADDED Requirements

### Requirement: SSE Chat Streaming Endpoint
The backend SHALL provide a `POST /api/v1/chat/stream` endpoint that accepts a JSON body `{content, conversation_id?, agent_type?}` with JWT Bearer auth and returns a `text/event-stream` response. The endpoint SHALL create a conversation if `conversation_id` is null, persist the user message, run the agent pipeline, and stream the response as named SSE events.

#### Scenario: New conversation with streaming response
- **WHEN** a POST is sent to `/api/v1/chat/stream` with `{content: "Hello", agent_type: "general"}` and no `conversation_id`
- **THEN** the server creates a new conversation
- **AND** emits an SSE event `event: conversation_created\ndata: {"conversation_id": "<uuid>", "title": "Hello"}`
- **AND** emits `event: agent_status\ndata: {"status": "thinking", "agent": "advisor_assistant"}`
- **AND** streams `event: stream_token\ndata: {"token": "..."}` events for each response token
- **AND** emits `event: stream_end\ndata: {"content": "<full>", "metadata": {...}}` when done

#### Scenario: Existing conversation
- **WHEN** a POST is sent with a valid `conversation_id`
- **THEN** the server appends the message to the existing conversation without creating a new one

#### Scenario: Authentication failure
- **WHEN** the request has no valid JWT token
- **THEN** the server returns HTTP 401

### Requirement: Frontend SSE Chat Client
The frontend SHALL use a fetch-based SSE reader (`src/services/chatStream.ts`) to send messages and consume streaming events from the SSE endpoint. The `AICopilotPage` SHALL NOT use WebSocket for chat.

#### Scenario: Message send and receive
- **WHEN** the user sends a message in the copilot
- **THEN** the frontend POSTs to `/api/v1/chat/stream` and reads the SSE response
- **AND** displays streaming tokens progressively in the chat area
- **AND** shows agent status messages during processing

#### Scenario: Single conversation creation path
- **WHEN** a new conversation is needed
- **THEN** only the SSE endpoint creates it (no separate REST `createConversation` call + duplicate `conversation_created` event)
