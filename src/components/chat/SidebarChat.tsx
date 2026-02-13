/**
 * SidebarChat - AI Copilot chat panel embedded within the sidebar.
 * Extracted from ChatSidebar.tsx, adapted to render inline within the sidebar
 * instead of as a fixed right-side panel.
 *
 * Contains:
 *  1. Conversation list (when no active conversation)
 *  2. Active conversation view with messages
 *  3. Message input with send button
 *
 * Connects to the backend via WebSocket for real-time streaming responses
 * and uses REST endpoints for conversation / message history.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  Send,
  ArrowLeft,
  MessageSquare,
  Trash2,
  Loader2,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  chatService,
  type Conversation,
} from '@/services/chatService';
import { wsManager, type WSEvent } from '@/services/websocket';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentAvatar } from './AgentAvatar';
import { TextMessage } from './messages/TextMessage';

export const SidebarChat = () => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingAgentName, setStreamingAgentName] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // ---- Data fetching ----

  const { data: conversationsData, isLoading: convLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.listConversations(),
  });

  const { data: messagesData, isLoading: msgsLoading } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => chatService.getMessages(activeConversationId!),
    enabled: !!activeConversationId,
  });

  // ---- Mutations ----

  const createConversation = useMutation({
    mutationFn: (data?: { title?: string }) => chatService.createConversation(data),
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConversationId(newConv.id);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: (id: string) => chatService.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (activeConversationId) {
        setActiveConversationId(null);
      }
    },
  });

  // ---- WebSocket lifecycle ----

  useEffect(() => {
    wsManager.connect();

    const unsubConnected = wsManager.on('connected', () => setWsConnected(true));
    const unsubDisconnected = wsManager.on('disconnected', () => setWsConnected(false));

    const unsubToken = wsManager.on('token', (event: WSEvent) => {
      setStreamingContent((prev) => prev + (event.content || ''));
    });

    const unsubStatus = wsManager.on('agent_status', (event: WSEvent) => {
      setAgentStatus(event.status || null);
      if (event.agent_name) setStreamingAgentName(event.agent_name);
    });

    const unsubStart = wsManager.on('stream_start', (event: WSEvent) => {
      setIsStreaming(true);
      setStreamingContent('');
      setStreamingAgentName(event.agent_name || null);
      setAgentStatus(null);
    });

    const unsubEnd = wsManager.on('stream_end', (event: WSEvent) => {
      setIsStreaming(false);
      setAgentStatus(null);
      if (event.conversation_id && !activeConversationId) {
        setActiveConversationId(event.conversation_id);
      }
      if (event.conversation_id || activeConversationId) {
        const convId = event.conversation_id || activeConversationId;
        queryClient.invalidateQueries({ queryKey: ['messages', convId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
      setStreamingContent('');
      setStreamingAgentName(null);
    });

    const unsubError = wsManager.on('error', (event: WSEvent) => {
      setIsStreaming(false);
      setAgentStatus(null);
      setStreamingContent('');
      console.error('Chat error from backend:', event.message || event.error);
    });

    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubToken();
      unsubStatus();
      unsubStart();
      unsubEnd();
      unsubError();
      wsManager.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Scroll to bottom ----

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messagesData, streamingContent, scrollToBottom]);

  // ---- Focus input ----

  useEffect(() => {
    if (activeConversationId) {
      const timeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timeout);
    }
  }, [activeConversationId]);

  // ---- Send message ----

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const message = input.trim();
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');
    wsManager.send({
      type: 'message',
      conversation_id: activeConversationId,
      content: message,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setStreamingContent('');
    setIsStreaming(false);
    setAgentStatus(null);
  };

  // ---- Conversation list item ----

  const ConversationItem = ({ conv }: { conv: Conversation }) => {
    const displayTitle = conv.title || 'New Chat';
    const timeAgo = conv.last_message_at
      ? formatTimeAgo(conv.last_message_at)
      : formatTimeAgo(conv.created_at);

    return (
      <button
        onClick={() => setActiveConversationId(conv.id)}
        className="w-full text-left p-2.5 rounded-lg hover:bg-secondary/50 transition-colors group"
      >
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">{displayTitle}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-muted-foreground">&middot;</span>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              deleteConversation.mutate(conv.id);
            }}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      </button>
    );
  };

  // ---- Render ----

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-header: new chat + connection status */}
      <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {activeConversationId && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewConversation}>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          )}
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              wsConnected ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            )}
            title={wsConnected ? 'Connected' : 'Disconnected'}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => createConversation.mutate({})}
          title="New conversation"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      {!activeConversationId ? (
        /* Conversation list */
        <ScrollArea className="flex-1">
          <div className="px-2 pb-2 space-y-0.5">
            {convLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {conversationsData?.conversations.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} />
            ))}

            {!convLoading &&
              (!conversationsData?.conversations ||
                conversationsData.conversations.length === 0) && (
                <div className="text-center py-8 text-muted-foreground px-4">
                  <Bot className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Start a chat for AI assistance</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => createConversation.mutate({})}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    New Chat
                  </Button>
                </div>
              )}
          </div>
        </ScrollArea>
      ) : (
        /* Active conversation */
        <>
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-3 py-2">
              {msgsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {messagesData?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className="flex flex-col gap-1 max-w-[90%]">
                    {msg.role === 'assistant' && msg.agent_name && (
                      <AgentAvatar agentName={msg.agent_name} showLabel size="sm" />
                    )}
                    <TextMessage content={msg.content} isUser={msg.role === 'user'} />
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <div className="flex justify-start">
                  <div className="flex flex-col gap-1 max-w-[90%]">
                    {streamingAgentName && (
                      <AgentAvatar agentName={streamingAgentName} showLabel size="sm" />
                    )}
                    <TextMessage content={streamingContent} isUser={false} />
                  </div>
                </div>
              )}

              {/* Agent status */}
              {agentStatus && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>{agentStatus}</span>
                </div>
              )}

              {/* Thinking indicator */}
              {isStreaming && !streamingContent && !agentStatus && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>Thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-2.5 border-t border-sidebar-border flex-shrink-0">
            <div className="flex gap-1.5">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI copilot..."
                disabled={isStreaming}
                className="flex-1 h-8 text-sm"
              />
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ---------- Utility ----------

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
