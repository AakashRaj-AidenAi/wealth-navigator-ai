/**
 * SSE-based chat streaming client.
 * Replaces WebSocket for chat by using POST /api/v1/chat/stream
 * with a ReadableStream event parser.
 */

import { api } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// SSE event types matching the backend SSE event names
export type SSEEvent =
  | { type: 'stream_token'; token: string; message_id: string }
  | { type: 'stream_end'; conversation_id: string; message_id: string; content: string; metadata?: Record<string, any> }
  | { type: 'agent_status'; status: string; agent: string; message: string }
  | { type: 'error'; message: string }
  | { type: 'conversation_created'; conversation_id: string; title: string };

interface SendMessageOptions {
  content: string;
  conversation_id?: string | null;
  agent_type?: string;
  onEvent: (event: SSEEvent) => void;
  signal?: AbortSignal;
}

/**
 * Parse raw SSE text into typed events.
 * SSE format:
 *   event: <name>\n
 *   data: <json>\n\n
 */
function parseSSEChunk(raw: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const blocks = raw.split('\n\n').filter(Boolean);

  for (const block of blocks) {
    let eventName = '';
    let dataStr = '';

    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) {
        eventName = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        dataStr = line.slice(6);
      }
    }

    if (eventName && dataStr) {
      try {
        const data = JSON.parse(dataStr);
        events.push({ type: eventName, ...data } as SSEEvent);
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return events;
}

/**
 * Send a message via SSE streaming.
 * Returns a promise that resolves when the stream completes.
 */
export async function sendStreamMessage(options: SendMessageOptions): Promise<void> {
  const { content, conversation_id, agent_type, onEvent, signal } = options;

  const token = api.getAccessToken();
  if (!token) {
    onEvent({ type: 'error', message: 'Not authenticated' });
    return;
  }

  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content,
      conversation_id: conversation_id || undefined,
      agent_type: agent_type || undefined,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    onEvent({ type: 'error', message: `HTTP ${response.status}: ${text}` });
    return;
  }

  if (!response.body) {
    onEvent({ type: 'error', message: 'No response body' });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE blocks (terminated by \n\n)
      while (buffer.includes('\n\n')) {
        const idx = buffer.indexOf('\n\n');
        const chunk = buffer.slice(0, idx + 2);
        buffer = buffer.slice(idx + 2);

        const events = parseSSEChunk(chunk);
        for (const event of events) {
          onEvent(event);
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const events = parseSSEChunk(buffer);
      for (const event of events) {
        onEvent(event);
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      onEvent({ type: 'error', message: err.message || 'Stream error' });
    }
  }
}
