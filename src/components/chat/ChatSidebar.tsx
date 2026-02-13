/**
 * ChatSidebar - 380 px collapsible right panel that provides an AI Copilot
 * chat experience. Contains:
 *  1. Header with "AI Copilot" title and close button
 *  2. Conversation list (when no active conversation)
 *  3. Active conversation view with messages
 *  4. Message input with send button
 *
 * Connects to the backend via WebSocket for real-time streaming responses
 * and uses REST endpoints for conversation / message history.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  X,
  Plus,
  Send,
  ArrowLeft,
  MessageSquare,
  Trash2,
  Loader2,
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

// ---------- Props ----------

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------- Component ----------

export const ChatSidebar = ({ isOpen, onClose }: ChatSidebarProps) => {
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
    enabled: isOpen,
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
    if (!isOpen) return;

    // Connect the WebSocket when the sidebar opens
    wsManager.connect();

    const unsubConnected = wsManager.on('connected', () => {
      setWsConnected(true);
    });

    const unsubDisconnected = wsManager.on('disconnected', () => {
      setWsConnected(false);
    });

    // Handle incoming streamed tokens
    const unsubToken = wsManager.on('token', (event: WSEvent) => {
      setStreamingContent((prev) => prev + (event.content || ''));
    });

    // Agent status updates (e.g. "Analyzing portfolio...")
    const unsubStatus = wsManager.on('agent_status', (event: WSEvent) => {
      setAgentStatus(event.status || null);
      if (event.agent_name) {
        setStreamingAgentName(event.agent_name);
      }
    });

    // Stream start
    const unsubStart = wsManager.on('stream_start', (event: WSEvent) => {
      setIsStreaming(true);
      setStreamingContent('');
      setStreamingAgentName(event.agent_name || null);
      setAgentStatus(null);
    });

    // Stream end - the full message is complete
    const unsubEnd = wsManager.on('stream_end', (event: WSEvent) => {
      setIsStreaming(false);
      setAgentStatus(null);

      // If the backend sent back a conversation_id (e.g. for a new conversation),
      // set it as active
      if (event.conversation_id && !activeConversationId) {
        setActiveConversationId(event.conversation_id);
      }

      // Refresh messages & conversations from the server
      if (event.conversation_id || activeConversationId) {
        const convId = event.conversation_id || activeConversationId;
        queryClient.invalidateQueries({ queryKey: ['messages', convId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }

      setStreamingContent('');
      setStreamingAgentName(null);
    });

    // Error from backend
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
    // We intentionally only re-run when isOpen changes.
    // activeConversationId is captured via ref-like closure in stream_end.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ---- Scroll to bottom ----

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messagesData, streamingContent, scrollToBottom]);

  // ---- Focus input when switching to an active conversation ----

  useEffect(() => {
    if (activeConversationId) {
      // Small delay to let the DOM render the input
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

  // ---- New conversation ----

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
        className="w-full text-left p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
      >
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">
              {displayTitle}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
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
    <div
      className={cn(
        'fixed right-0 top-0 h-screen bg-card border-l border-border z-50 transition-all duration-300 flex flex-col shadow-lg',
        isOpen ? 'w-[380px]' : 'w-0 overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {activeConversationId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNewConversation}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-semibold">AI Copilot</span>
          {/* Connection indicator */}
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              wsConnected ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            )}
            title={wsConnected ? 'Connected' : 'Disconnected'}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => createConversation.mutate({})}
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            title="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!activeConversationId ? (
          /* ---------- Conversation list ---------- */
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-1">
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
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">
                      Start a new chat to get AI assistance
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => createConversation.mutate({})}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Chat
                    </Button>
                  </div>
                )}
            </div>
          </ScrollArea>
        ) : (
          /* ---------- Active conversation ---------- */
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
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
                    <div className="flex flex-col gap-1 max-w-[85%]">
                      {/* Agent identity label for assistant messages */}
                      {msg.role === 'assistant' && msg.agent_name && (
                        <AgentAvatar
                          agentName={msg.agent_name}
                          showLabel
                          size="sm"
                        />
                      )}
                      <TextMessage
                        content={msg.content}
                        isUser={msg.role === 'user'}
                      />
                    </div>
                  </div>
                ))}

                {/* Streaming message */}
                {isStreaming && streamingContent && (
                  <div className="flex justify-start">
                    <div className="flex flex-col gap-1 max-w-[85%]">
                      {streamingAgentName && (
                        <AgentAvatar
                          agentName={streamingAgentName}
                          showLabel
                          size="sm"
                        />
                      )}
                      <TextMessage content={streamingContent} isUser={false} />
                    </div>
                  </div>
                )}

                {/* Agent status indicator (e.g. "Analyzing risk profile...") */}
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

                {/* Streaming indicator when no content yet */}
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
            <div className="p-4 border-t border-border flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your AI copilot..."
                  disabled={isStreaming}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
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
