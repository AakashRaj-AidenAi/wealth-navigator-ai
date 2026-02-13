# Capability: Backend-Frontend Integration

Ensures the FastAPI backend and React frontend are seamlessly integrated with a shared API contract, auto-generated types, consistent error handling, and end-to-end validation — so there are zero integration gaps at runtime.

## ADDED Requirements

### Requirement: Shared API Contract via OpenAPI Type Generation
The system MUST auto-generate TypeScript types from the FastAPI OpenAPI specification so frontend types always match backend response shapes exactly, with no manual type duplication.

#### Scenario: TypeScript types are generated from OpenAPI spec
- **Given** the FastAPI backend exposes an OpenAPI schema at `/openapi.json`
- **When** the type generation script runs (e.g., `npm run generate-types`)
- **Then** TypeScript interfaces are created in `src/types/api.generated.ts` matching every Pydantic response model

#### Scenario: Frontend service uses generated types
- **Given** the backend returns a `ClientResponse` with fields `id`, `client_name`, `email`, `total_assets`
- **When** the frontend `clientService.getClients()` is called
- **Then** the return type is the auto-generated `ClientResponse` interface — not a manually written type

#### Scenario: Type generation catches backend changes
- **Given** a backend developer adds a new required field `pan_status` to `ClientResponse`
- **When** types are regenerated
- **Then** the frontend build fails with a type error wherever `ClientResponse` is used without the new field, catching the drift before runtime

---

### Requirement: Consistent Error Handling Across Stack
The system MUST ensure that every backend error response (validation errors, 404s, 401s, 403s, 500s) is properly caught by the frontend API layer and displayed as user-friendly messages — with no raw error objects, silent failures, or unhandled promise rejections.

#### Scenario: Validation error displays field-level messages
- **Given** the user submits a client form with an invalid email
- **When** the backend returns 422 with `{"detail": [{"loc": ["body", "email"], "msg": "invalid email format"}]}`
- **Then** the frontend displays "Invalid email format" inline next to the email field

#### Scenario: 401 triggers re-authentication
- **Given** the user's JWT token has expired
- **When** any API call returns 401
- **Then** the frontend automatically attempts a token refresh; if refresh fails, the user is redirected to the login page with a session-expired message

#### Scenario: 500 error shows graceful fallback
- **Given** the backend encounters an unexpected error
- **When** the API returns 500
- **Then** the frontend displays a toast notification with "Something went wrong. Please try again." — not the raw error stack

#### Scenario: Network failure is handled
- **Given** the backend is unreachable (network down or server offline)
- **When** an API call fails with a network error
- **Then** the frontend shows a "Connection lost. Retrying..." message with automatic retry logic

---

### Requirement: Data Shape Alignment (No Casing Mismatches)
The system MUST ensure consistent field naming between backend responses and frontend consumption — either via backend camelCase aliases or a frontend transformation layer — so there are no `snake_case` vs `camelCase` mismatches.

#### Scenario: Backend response fields match frontend expectations
- **Given** the SQLAlchemy model has a column `client_name`
- **When** the API returns client data
- **Then** the JSON field is `client_name` (or aliased to `clientName`) and the frontend type reflects the exact same key

#### Scenario: No manual field remapping in frontend
- **Given** the frontend receives a client object from the API
- **When** the component renders the client name
- **Then** it accesses `client.client_name` (or `client.clientName`) directly from the response — no manual `.map()` or field renaming in the service layer

---

### Requirement: WebSocket Protocol Contract
The system MUST ensure the frontend WebSocket manager sends and receives messages matching the exact protocol defined in the backend — with typed event payloads and error handling for malformed messages.

#### Scenario: Frontend sends correctly typed chat message
- **Given** the user types a message in the chat sidebar
- **When** the frontend sends a WebSocket frame
- **Then** the payload matches `{"type": "message", "conversation_id": "uuid", "content": "...", "metadata": {}}` exactly as the backend expects

#### Scenario: Frontend handles all stream event types
- **Given** the backend streams a response
- **When** the frontend receives `stream_start`, `stream_token`, `stream_end`, and `agent_status` events
- **Then** each event type is handled by a typed handler — no unhandled event types or ignored payloads

#### Scenario: Malformed WebSocket message is handled gracefully
- **Given** the frontend receives a WebSocket message with an unexpected format
- **When** the message fails validation
- **Then** the error is logged and the chat displays "Failed to process response" — not a JavaScript crash

---

### Requirement: Loading, Empty, and Error States for All Data Views
The system MUST ensure every page and component that fetches data from the FastAPI backend properly handles loading (skeleton/spinner), empty (zero results), and error (API failure) states.

#### Scenario: Client list shows loading skeleton
- **Given** the user navigates to the Clients page
- **When** the API call is in-flight
- **Then** a loading skeleton (shimmer rows) is displayed — not a blank page or flash of empty state

#### Scenario: Empty state shows helpful message
- **Given** a new advisor with zero clients
- **When** the Clients page loads with an empty array response
- **Then** the page shows "No clients yet. Add your first client to get started." with an action button

#### Scenario: Error state allows retry
- **Given** the API call for dashboard data fails
- **When** the error state renders
- **Then** the widget shows an error message with a "Retry" button that re-fetches the data

---

### Requirement: End-to-End Integration Test Suite
The system MUST include an automated integration test suite that boots both backend and frontend, runs through critical user flows, and catches integration regressions.

#### Scenario: Login-to-dashboard flow passes
- **Given** the test suite boots the FastAPI backend and React frontend
- **When** the test logs in with valid credentials, navigates to the dashboard
- **Then** the dashboard loads with real data from the API — KPI cards, client table, and activity feed are populated

#### Scenario: Chat send-and-receive flow passes
- **Given** the test suite has an authenticated session
- **When** the test opens the chat sidebar, sends "Show my top clients", and waits for a streamed response
- **Then** a response from the Advisor Agent appears with client data, and the conversation is persisted

#### Scenario: Integration test catches missing endpoint
- **Given** the frontend calls `GET /api/v1/portfolios/{id}/performance` but the backend hasn't implemented it yet
- **When** the integration test runs
- **Then** the test fails with a clear error: "404 Not Found for GET /api/v1/portfolios/{id}/performance"

---

### Requirement: Environment and CORS Configuration
The system MUST ensure environment variables (API base URL, WebSocket URL) and CORS settings are correctly configured so the frontend connects to the backend without issues in both development and production.

#### Scenario: Frontend connects to backend in development
- **Given** the frontend runs on `localhost:5173` and the backend on `localhost:8000`
- **When** the frontend makes an API call
- **Then** CORS headers allow the request, and the response is received without browser errors

#### Scenario: WebSocket connects with correct URL
- **Given** the environment variable `VITE_API_WS_URL` is set to `ws://localhost:8000`
- **When** the chat sidebar opens
- **Then** the WebSocket connects to `ws://localhost:8000/ws/chat?token={jwt}` successfully

#### Scenario: Production environment uses HTTPS
- **Given** environment variables are configured for production (`VITE_API_URL=https://api.example.com`)
- **When** the frontend is built and deployed
- **Then** all API calls and WebSocket connections use the production URLs with HTTPS/WSS
