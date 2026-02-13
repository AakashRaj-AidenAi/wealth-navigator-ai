import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ConversationSidebar } from './ConversationSidebar';
import { AgentSelector } from './AgentSelector';
import { VoiceInput } from './VoiceInput';
import { ChatMessage } from './ChatMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { chatService, ChatMessage as ChatMessageType } from '@/services/chatService';
import { sendStreamMessage, SSEEvent } from '@/services/chatStream';
import { usePromptSuggestions } from '@/hooks/usePromptSuggestions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader3D } from '@/components/ui/loader-3d';
import {
  Send,
  Bot,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { CopilotSettings } from './CopilotSettings';

interface LocalMessage extends ChatMessageType {
  isStreaming?: boolean;
}

export const AICopilotPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { suggestions } = usePromptSuggestions();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [agentType, setAgentType] = useState('advisor_assistant');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get user initials
  const userInitials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'U';

  // Load conversation from URL parameter
  const conversationIdFromUrl = searchParams.get('conversation');
  const promptFromUrl = searchParams.get('prompt');

  // Fetch messages for active conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () =>
      activeConversationId
        ? chatService.getMessages(activeConversationId, { limit: 100 })
        : Promise.resolve({ messages: [], total: 0 }),
    enabled: !!activeConversationId,
  });

  // Load messages when conversation changes
  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(messagesData.messages);
    } else {
      setMessages([]);
    }
  }, [messagesData]);

  // Handle URL parameters
  useEffect(() => {
    if (conversationIdFromUrl && conversationIdFromUrl !== activeConversationId) {
      setActiveConversationId(conversationIdFromUrl);
    }
  }, [conversationIdFromUrl]);

  useEffect(() => {
    if (promptFromUrl && !activeConversationId) {
      const decodedPrompt = decodeURIComponent(promptFromUrl);
      setInput(decodedPrompt);
      setTimeout(() => {
        handleSend(decodedPrompt);
      }, 500);
      searchParams.delete('prompt');
      setSearchParams(searchParams);
    }
  }, [promptFromUrl]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentStatus]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleSend = async (messageContent?: string) => {
    const content = messageContent || input.trim();
    if (!content || isStreaming) return;

    // Add user message to local state immediately
    const userMessage: LocalMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId || '',
      role: 'user',
      content,
      agent_name: null,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // Create a placeholder streaming message
    const streamingMsgId = `stream-${Date.now()}`;
    const streamingMessage: LocalMessage = {
      id: streamingMsgId,
      conversation_id: activeConversationId || '',
      role: 'assistant',
      content: '',
      agent_name: null,
      metadata: null,
      created_at: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, streamingMessage]);
    streamingMessageIdRef.current = streamingMsgId;

    // Abort controller for cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let currentConversationId = activeConversationId;

    const handleEvent = (event: SSEEvent) => {
      switch (event.type) {
        case 'conversation_created':
          // SSE endpoint creates the conversation — single path, no duplicate
          currentConversationId = event.conversation_id;
          setActiveConversationId(event.conversation_id);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          setSearchParams({ conversation: event.conversation_id });
          break;

        case 'agent_status':
          setAgentStatus(event.message || event.status);
          break;

        case 'stream_token':
          if (streamingMessageIdRef.current) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === streamingMessageIdRef.current
                  ? { ...msg, content: msg.content + event.token }
                  : msg
              )
            );
          }
          break;

        case 'stream_end':
          if (streamingMessageIdRef.current) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === streamingMessageIdRef.current
                  ? {
                      ...msg,
                      id: event.message_id || msg.id,
                      content: event.content,
                      conversation_id: event.conversation_id,
                      isStreaming: false,
                    }
                  : msg
              )
            );
          }
          streamingMessageIdRef.current = null;
          setIsStreaming(false);
          setAgentStatus(null);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          if (currentConversationId) {
            queryClient.invalidateQueries({
              queryKey: ['messages', currentConversationId],
            });
          }
          break;

        case 'error':
          toast({
            title: 'Error',
            description: event.message,
            variant: 'destructive',
          });
          if (streamingMessageIdRef.current) {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== streamingMessageIdRef.current)
            );
            streamingMessageIdRef.current = null;
          }
          setIsStreaming(false);
          setAgentStatus(null);
          break;
      }
    };

    try {
      // Send via SSE — conversation creation happens server-side if needed
      await sendStreamMessage({
        content,
        conversation_id: activeConversationId,
        agent_type: agentType,
        onEvent: handleEvent,
        signal: abortController.signal,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast({
          title: 'Error',
          description: 'Failed to send message. Please try again.',
          variant: 'destructive',
        });
      }
      if (streamingMessageIdRef.current) {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== streamingMessageIdRef.current)
        );
        streamingMessageIdRef.current = null;
      }
      setIsStreaming(false);
      setAgentStatus(null);
    }

    abortControllerRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    abortControllerRef.current?.abort();
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
    setIsStreaming(false);
    setAgentStatus(null);
    searchParams.delete('conversation');
    setSearchParams(searchParams);
  };

  const handleVoiceTranscript = (text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === 'user');
    if (lastUserMessage) {
      handleSend(lastUserMessage.content);
    }
  };

  const isEmpty = !activeConversationId && messages.length === 0;

  return (
    <MainLayout>
      <div className="h-[calc(100vh-7rem)] flex gap-0 animate-fade-in -m-6">
        {/* Sidebar */}
        <ConversationSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewChat={handleNewChat}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Header */}
          <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50">
            <div className="flex items-center gap-4">
              <AgentSelector value={agentType} onChange={setAgentType} />
              {activeConversationId && (
                <Badge variant="outline" className="text-xs">
                  <Bot className="h-3 w-3 mr-1" />
                  Active conversation
                </Badge>
              )}
            </div>
            <CopilotSettings onAgentChange={setAgentType} />
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="max-w-4xl mx-auto space-y-6">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
                  <div className="h-20 w-20 rounded-full bg-gradient-gold flex items-center justify-center mb-6">
                    <Sparkles className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to Wealthyx</h2>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    Your intelligent wealth management assistant. Ask me anything
                    about portfolios, clients, compliance, or market insights.
                  </p>
                  {suggestions.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(suggestion.text)}
                          className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all text-left group"
                        >
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors text-base">
                            {suggestion.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {suggestion.text}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader3D size="md" variant="orbit" />
                    </div>
                  ) : (
                    messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isStreaming={message.isStreaming}
                        userInitials={userInitials}
                        onRetry={
                          message.role === 'assistant' ? handleRetry : undefined
                        }
                      />
                    ))
                  )}
                  {agentStatus && (
                    <div className="flex gap-4 items-center text-sm text-muted-foreground">
                      <Loader3D size="sm" variant="orbit" />
                      <span>{agentStatus}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Input Bar */}
          <div className="border-t border-border p-4 bg-card/50">
            <div className="max-w-4xl mx-auto flex gap-3 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Wealthyx anything..."
                  className={cn(
                    'min-h-[48px] max-h-[120px] resize-none pr-12',
                    'bg-secondary/50 border-border'
                  )}
                  disabled={isStreaming}
                  rows={1}
                />
                <div className="absolute right-2 bottom-2">
                  <VoiceInput
                    onTranscript={handleVoiceTranscript}
                    disabled={isStreaming}
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                className="bg-gradient-gold hover:opacity-90 h-12 px-6"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
