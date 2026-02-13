## ADDED Requirements

### Requirement: Full-Page AI Copilot
The `/copilot` route SHALL display a full-page AI copilot interface with a conversation sidebar, main chat area, agent selector, voice input, and rich message rendering.

#### Scenario: User opens copilot page
- **WHEN** the user navigates to `/copilot`
- **THEN** they see a full-page layout with:
  - A collapsible conversation sidebar on the left (280px)
  - A main chat area in the center with message history and input
  - The agent selector in the copilot header
- **AND** the page uses the full available width (no sidebar nav competing for space — uses MainLayout with sidebar)

#### Scenario: User sends a message
- **WHEN** the user types a message and presses Enter
- **THEN** the message appears in the chat as a user bubble
- **AND** a streaming response begins with an animated typing indicator
- **AND** the response renders progressively as tokens arrive via WebSocket
- **AND** the agent status is shown (e.g., "Analyzing portfolio...")

### Requirement: Conversation Sidebar
The copilot page SHALL include a left sidebar listing all conversations with search, create, pin, and delete capabilities.

#### Scenario: User views conversation list
- **WHEN** the copilot page loads
- **THEN** the left sidebar shows all conversations sorted by last message time
- **AND** each entry shows the conversation title, message count, and time ago
- **AND** a "New Chat" button is prominently displayed at the top

#### Scenario: User searches conversations
- **WHEN** the user types in the conversation search input
- **THEN** the list filters to show only conversations with matching titles

#### Scenario: User creates a new conversation
- **WHEN** the user clicks "New Chat"
- **THEN** a new conversation is created via the chat API
- **AND** the main chat area clears and focuses on the input

#### Scenario: User deletes a conversation
- **WHEN** the user clicks the delete button on a conversation
- **THEN** the conversation is deleted via the API
- **AND** if it was the active conversation, the chat area clears

### Requirement: Agent Selector
The copilot SHALL allow users to select an AI agent type that determines the behavior and expertise of the AI response.

#### Scenario: User selects an agent
- **WHEN** the user opens the agent selector dropdown in the copilot header
- **THEN** they see options: General, Portfolio Analyst, Compliance, Research
- **AND** selecting an agent updates the `agent_type` sent with subsequent messages
- **AND** the selected agent is shown with an icon in the header

#### Scenario: Default agent
- **WHEN** the user opens the copilot without selecting an agent
- **THEN** the "General" agent is selected by default

### Requirement: Voice Input
The copilot SHALL support voice input via the browser's Speech Recognition API for hands-free prompt entry.

#### Scenario: User activates voice input
- **WHEN** the user clicks the microphone button next to the chat input
- **THEN** the browser's speech recognition activates
- **AND** the microphone button shows a recording/pulsing animation
- **AND** recognized text appears in the input field in real-time

#### Scenario: User completes voice input
- **WHEN** the user clicks the microphone button again (or speech recognition auto-stops)
- **THEN** recording stops
- **AND** the recognized text remains in the input field ready to send

#### Scenario: Browser does not support speech recognition
- **WHEN** the browser does not support the SpeechRecognition API
- **THEN** the microphone button is hidden
- **AND** text input remains the only input method

### Requirement: Rich Message Rendering
AI responses in the copilot SHALL render rich content including formatted markdown, code blocks with syntax highlighting, data tables, and action buttons.

#### Scenario: AI returns markdown content
- **WHEN** the AI response contains markdown (headers, bold, lists, links)
- **THEN** the content renders with proper formatting using the markdown renderer

#### Scenario: AI returns a code block
- **WHEN** the AI response contains a fenced code block
- **THEN** the code renders with syntax highlighting and a copy button

#### Scenario: AI returns tabular data
- **WHEN** the AI response contains a markdown table
- **THEN** the table renders using the shadcn/ui Table component with proper styling

### Requirement: Message Actions
Each AI response in the copilot SHALL have action buttons for copy, retry, and feedback.

#### Scenario: User copies a response
- **WHEN** the user clicks the copy button on an AI response
- **THEN** the response content is copied to the clipboard
- **AND** a brief "Copied" confirmation appears

#### Scenario: User retries a response
- **WHEN** the user clicks the retry button on an AI response
- **THEN** the last user message is re-sent to the AI
- **AND** a new streaming response replaces the previous one

### Requirement: Modern Animations
The copilot SHALL use smooth animations for message appearance, streaming text, and loading states.

#### Scenario: New message appears
- **WHEN** a new message (user or AI) is added to the chat
- **THEN** it slides up and fades in with a 200ms ease-out animation

#### Scenario: AI is streaming a response
- **WHEN** the AI is generating a response
- **THEN** a pulsing dot animation appears before content starts
- **AND** text appears progressively with a subtle typewriter effect

## MODIFIED Requirements

### Requirement: Sidebar AI Copilot Integration (from redesign-sidebar-header)
The sidebar SHALL NO LONGER include an AI Copilot toggle button that switches to chat mode. Instead, the sidebar SHALL include a nav link to `/copilot` in the Core navigation group.

#### Scenario: User accesses AI copilot from sidebar
- **WHEN** the user clicks "AI Copilot" in the sidebar navigation
- **THEN** the app navigates to `/copilot`
- **AND** the sidebar remains in navigation mode (no mode switching)
