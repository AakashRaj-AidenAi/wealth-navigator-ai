/**
 * Chat service for REST-based conversation and message management.
 * Uses the typed API client for authenticated requests to the FastAPI backend.
 */

import { api } from './api';

// ---------- Types ----------

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  agent_type: string | null;
  is_archived: boolean;
  is_pinned: boolean;
  last_message_at: string | null;
  message_count: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_name: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface MessageListResponse {
  messages: ChatMessage[];
  total: number;
}

// ---------- Service ----------

export const chatService = {
  listConversations: (params?: { skip?: number; limit?: number; archived?: boolean }) =>
    api.get<ConversationListResponse>('/chat/conversations', params),

  createConversation: (data?: { title?: string; agent_type?: string }) =>
    api.post<Conversation>('/chat/conversations', data),

  getConversation: (id: string) =>
    api.get<Conversation>(`/chat/conversations/${id}`),

  getMessages: (conversationId: string, params?: { skip?: number; limit?: number }) =>
    api.get<MessageListResponse>(`/chat/conversations/${conversationId}/messages`, params),

  deleteConversation: (id: string) =>
    api.delete<void>(`/chat/conversations/${id}`),

  toggleArchive: (id: string) =>
    api.patch<{ archived: boolean }>(`/chat/conversations/${id}/archive`),

  searchMessages: (conversationId: string, query: string) =>
    api.post<MessageListResponse>(`/chat/conversations/${conversationId}/search?q=${encodeURIComponent(query)}`),
};
