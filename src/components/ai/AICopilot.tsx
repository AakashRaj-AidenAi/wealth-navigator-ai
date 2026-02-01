import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Maximize2,
  Minimize2,
  Database,
  Loader2
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickActions = [
  { label: 'Top Clients', icon: TrendingUp, prompt: 'Show me my top clients by assets under management' },
  { label: 'Risk Assessment', icon: AlertTriangle, prompt: 'Analyze the risk profile distribution of my clients' },
  { label: 'Investment Ideas', icon: Lightbulb, prompt: 'Suggest investment strategies for my high-net-worth clients' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portfolio-copilot`;

interface AICopilotProps {
  defaultMinimized?: boolean;
}

export const AICopilot = ({ defaultMinimized = false }: AICopilotProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your WealthOS AI Copilot. I can help you with portfolio analysis, risk assessment, client insights, and investment recommendations. What would you like to explore today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = "";

    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => 
                prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m)
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI response",
        variant: "destructive"
      });
      setMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      setIsLoading(false);
    }
  };

  // Minimized state - just show a floating button
  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="h-14 w-14 rounded-full bg-gradient-gold hover:opacity-90 shadow-lg"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        'glass rounded-xl flex flex-col transition-all duration-300 w-[380px] shadow-xl',
        isExpanded ? 'h-[600px]' : 'h-[400px]'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-gold flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              AI Copilot
              <Sparkles className="h-3 w-3 text-primary" />
            </h3>
            <p className="text-xs text-muted-foreground">Powered by WealthOS AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(true)}
            className="h-8 w-8"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-4 py-2.5',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                )}
              >
                {message.role === 'user' ? (
                  <p className="text-sm">{message.content}</p>
                ) : (
                  <div className="text-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-2 rounded border border-border">
                            <table className="w-full text-xs">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-secondary/50 border-b border-border">{children}</thead>
                        ),
                        th: ({ children }) => (
                          <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">{children}</th>
                        ),
                        td: ({ children }) => (
                          <td className="px-2 py-1.5 border-b border-border/50 whitespace-nowrap">{children}</td>
                        ),
                        p: ({ children }) => (
                          <p className="mb-1.5 last:mb-0">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        code: ({ children }) => (
                          <code className="px-1 py-0.5 rounded bg-background text-xs">{children}</code>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.content === '' && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-secondary rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3 text-primary animate-pulse" />
                  <span className="text-xs text-muted-foreground">Querying data...</span>
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5"
              onClick={() => handleSend(action.prompt)}
              disabled={isLoading}
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about portfolios, clients, or market insights..."
            className="flex-1 bg-secondary/50"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-gold hover:opacity-90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
