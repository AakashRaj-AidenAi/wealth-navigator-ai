"""Pydantic schemas for chat system - REST and WebSocket events."""
import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field

# --- REST Schemas ---

class ConversationCreate(BaseModel):
    title: str | None = None
    agent_type: str | None = None

class ConversationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str | None
    agent_type: str | None
    is_archived: bool
    is_pinned: bool
    last_message_at: datetime | None
    message_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class MessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    agent_name: str | None
    extra_data: dict | None = Field(None, alias="metadata")
    token_count: int | None
    model_used: str | None
    response_time_ms: int | None
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}

class ConversationListResponse(BaseModel):
    conversations: list[ConversationResponse]
    total: int

class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    total: int

# --- WebSocket Event Schemas ---

class WSMessageEvent(BaseModel):
    """Client → Server: send a message."""
    type: str = "message"
    conversation_id: str | None = None
    content: str
    extra_data: dict = Field(default_factory=dict, alias="metadata")

class WSStreamStartEvent(BaseModel):
    """Server → Client: stream starting."""
    type: str = "stream_start"
    conversation_id: str
    message_id: str
    agent: str

class WSStreamTokenEvent(BaseModel):
    """Server → Client: single token."""
    type: str = "stream_token"
    token: str
    message_id: str

class WSStreamEndEvent(BaseModel):
    """Server → Client: stream complete."""
    type: str = "stream_end"
    message_id: str
    conversation_id: str
    full_content: str
    actions: list[dict] = Field(default_factory=list)
    extra_data: dict = Field(default_factory=dict, alias="metadata")

class WSAgentStatusEvent(BaseModel):
    """Server → Client: agent thinking/tool status."""
    type: str = "agent_status"
    status: str
    agent: str
    message: str = ""

class WSErrorEvent(BaseModel):
    """Server → Client: error."""
    type: str = "error"
    message: str
    code: str | None = None

class WSPingEvent(BaseModel):
    type: str = "ping"

class WSPongEvent(BaseModel):
    type: str = "pong"
    timestamp: str
