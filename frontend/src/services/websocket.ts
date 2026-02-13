/**
 * WebSocket connection manager for real-time chat with the AI backend.
 * Handles connection lifecycle, reconnection with exponential backoff,
 * ping/pong keep-alive, and event-based message dispatching.
 */

import { api } from './api';

const WS_BASE_URL = import.meta.env.VITE_API_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

// Type-safe WebSocket event definitions
export type WSEvent =
  | { type: 'stream_start'; conversation_id: string; message_id: string }
  | { type: 'stream_token'; token: string }
  | { type: 'stream_end'; conversation_id: string; message_id: string; content: string }
  | { type: 'agent_status'; status: string; details?: string }
  | { type: 'error'; error: string; code?: string }
  | { type: 'pong' }
  | { type: 'conversation_created'; conversation_id: string; title: string }
  | { type: 'connected' }
  | { type: 'disconnected'; code: number; reason: string };

type EventHandler = (event: WSEvent) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers: Map<string, EventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: number | null = null;
  private intentionallyClosed = false;

  /**
   * Open a WebSocket connection to the chat backend.
   * The access token is passed as a query parameter for authentication.
   */
  connect(): void {
    const token = api.getAccessToken();
    if (!token) {
      console.error('No access token for WebSocket connection');
      return;
    }

    // Avoid duplicate connections
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.intentionallyClosed = false;

    try {
      this.ws = new WebSocket(`${WS_BASE_URL}/ws/chat?token=${token}`);
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      return;
    }

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startPingPong();
      this.emit({ type: 'connected' });
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WSEvent = JSON.parse(event.data);
        this.emit(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.stopPingPong();
      this.emit({ type: 'disconnected', code: event.code, reason: event.reason });

      // Only reconnect if the close was not intentional
      if (!this.intentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, delay);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit({ type: 'error', error: 'WebSocket connection error' });
    };
  }

  /**
   * Intentionally close the WebSocket connection.
   * Will not trigger automatic reconnection.
   */
  disconnect(): void {
    this.intentionallyClosed = true;
    this.stopPingPong();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Send a JSON payload over the WebSocket.
   */
  send(data: Record<string, any>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Subscribe to a specific event type (or '*' for all events).
   * Returns an unsubscribe function.
   */
  on(eventType: string, handler: EventHandler): () => void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);

    // Return unsubscribe function
    return () => {
      const current = this.handlers.get(eventType) || [];
      this.handlers.set(eventType, current.filter((h) => h !== handler));
    };
  }

  /**
   * Remove all handlers for a specific event type, or all handlers if no type given.
   */
  off(eventType?: string): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }

  private emit(event: WSEvent): void {
    // Call type-specific handlers
    const typeHandlers = this.handlers.get(event.type) || [];
    typeHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error(`Error in handler for event type "${event.type}":`, err);
      }
    });

    // Call wildcard handlers
    const wildcardHandlers = this.handlers.get('*') || [];
    wildcardHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error('Error in wildcard handler:', err);
      }
    });
  }

  private startPingPong(): void {
    this.stopPingPong();
    this.pingInterval = window.setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  private stopPingPong(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get readyState(): number | undefined {
    return this.ws?.readyState;
  }
}

// Singleton instance for application-wide WebSocket usage
export const wsManager = new WebSocketManager();
