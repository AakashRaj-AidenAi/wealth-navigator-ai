import { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Shield,
  Calculator,
  Calendar,
  Briefcase,
  Database,
  Loader2,
  MessageSquare,
  Trash2,
  ChevronRight,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const agents: Agent[] = [
  { id: 'portfolio', name: 'Portfolio Intelligence', description: 'Deep portfolio analysis & optimization', icon: Briefcase, color: 'text-primary', bgColor: 'bg-primary/10' },
  { id: 'cio', name: 'CIO Copilot', description: 'Investment strategy & market insights', icon: TrendingUp, color: 'text-success', bgColor: 'bg-success/10' },
  { id: 'advisor', name: 'Advisor Assistant', description: 'Client recommendations & prep', icon: Users, color: 'text-chart-3', bgColor: 'bg-chart-3/10' },
  { id: 'compliance', name: 'Compliance Sentinel', description: 'Regulatory monitoring & alerts', icon: Shield, color: 'text-warning', bgColor: 'bg-warning/10' },
  { id: 'tax', name: 'Tax Optimizer', description: 'Tax-loss harvesting & efficiency', icon: Calculator, color: 'text-chart-4', bgColor: 'bg-chart-4/10' },
  { id: 'meeting', name: 'Meeting Intelligence', description: 'Meeting prep & action items', icon: Calendar, color: 'text-chart-5', bgColor: 'bg-chart-5/10' },
];

const samplePrompts = [
  { text: "Show me my top 5 clients by AUM", icon: TrendingUp },
  { text: "What's my total AUM across all clients?", icon: Calculator },
  { text: "Find clients with assets over $5 million", icon: Users },
  { text: "Show me all pending orders from last week", icon: Briefcase },
  { text: "What are the overdue tasks I need to handle?", icon: Calendar },
  { text: "Show risk profile distribution of my clients", icon: Shield },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portfolio-copilot`;

const Copilot = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleSend = async (promptText?: string) => {
    const textToSend = promptText || input;
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
      // Get the authenticated user's session token for database access
      const { data: { session } } = await supabase.auth.getSession();

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          agentType: selectedAgent
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

      // Final flush
      if (textBuffer.trim()) {
        for (const raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m)
              );
            }
          } catch { /* ignore */ }
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
      inputRef.current?.focus();
    }
  };

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  return (
    <MainLayout>
      <div className="h-[calc(100vh-7rem)] flex gap-4 animate-fade-in">
        {/* Left Panel - Agents & Prompts */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4">
          {/* Agents */}
          <div className="glass rounded-xl p-4 flex-shrink-0">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Agents
            </h3>
            <div className="space-y-1.5">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all text-left group',
                    selectedAgent === agent.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-secondary/50 border border-transparent'
                  )}
                >
                  <div className={cn('h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0', agent.bgColor, agent.color)}>
                    <agent.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{agent.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{agent.description}</p>
                  </div>
                  {selectedAgent === agent.id && (
                    <ChevronRight className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="glass rounded-xl p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Quick Prompts
            </h3>
            <div className="space-y-1.5 overflow-y-auto flex-1">
              {samplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt.text)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2 text-left text-xs text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary/50 transition-colors disabled:opacity-50 group"
                >
                  <prompt.icon className="h-3 w-3 flex-shrink-0 group-hover:text-primary transition-colors" />
                  <span className="line-clamp-2">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 glass rounded-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-9 w-9 rounded-lg bg-gradient-gold flex items-center justify-center",
                isLoading && "animate-pulse"
              )}>
                <Bot className={cn("h-4 w-4 text-primary-foreground", isLoading && "animate-bounce")} />
              </div>
              <div>
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  WealthOS Copilot
                  {isLoading ? (
                    <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20 animate-pulse">
                      Processing...
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-5 bg-success/10 text-success border-success/20">
                      AI
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isLoading
                    ? <span className="text-primary">Querying your data...</span>
                    : selectedAgentData
                      ? <span className={selectedAgentData.color}>{selectedAgentData.name}</span>
                      : 'General Assistant'}
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-muted-foreground hover:text-destructive h-8 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-5 space-y-5">
              {messages.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-gold flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Welcome to WealthOS Copilot</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">
                    I can help you analyze portfolios, query client data, track tasks, and provide insights.
                    Select an agent or ask me anything.
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-w-lg">
                    {samplePrompts.slice(0, 4).map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt.text)}
                        className="flex items-center gap-2 text-left text-xs p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                      >
                        <prompt.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                        <span className="line-clamp-1">{prompt.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Messages
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="h-7 w-7 rounded-lg bg-gradient-gold flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-xl max-w-[85%]',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground px-4 py-2.5'
                          : 'bg-secondary/30 px-4 py-3'
                      )}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm">{message.content}</p>
                      ) : (
                        <div className="copilot-markdown text-sm">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-3 rounded-lg border border-border">
                                  <table className="w-full text-xs">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-secondary/50 border-b border-border">{children}</thead>
                              ),
                              th: ({ children }) => (
                                <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">{children}</th>
                              ),
                              td: ({ children }) => (
                                <td className="px-3 py-2 border-b border-border/50 whitespace-nowrap">{children}</td>
                              ),
                              tr: ({ children }) => (
                                <tr className="hover:bg-secondary/30 transition-colors">{children}</tr>
                              ),
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                              ),
                              li: ({ children }) => (
                                <li className="leading-relaxed">{children}</li>
                              ),
                              h1: ({ children }) => (
                                <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0">{children}</h3>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-foreground">{children}</strong>
                              ),
                              code: ({ children }) => (
                                <code className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">{children}</code>
                              ),
                              pre: ({ children }) => (
                                <pre className="p-3 rounded-lg bg-secondary overflow-x-auto my-2 text-xs">{children}</pre>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-[10px] font-medium">You</span>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Loading State */}
              {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role === 'user' || messages[messages.length - 1]?.content === '') && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-lg bg-gradient-gold flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <div className="bg-secondary/30 rounded-xl px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm font-medium">Processing your request...</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Database className="h-3 w-3 animate-pulse text-primary" />
                          <span>Querying database</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 animate-pulse text-chart-3" />
                          <span>Analyzing data</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border flex-shrink-0 bg-background/50">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={selectedAgentData
                  ? `Ask ${selectedAgentData.name}...`
                  : "Ask about portfolios, clients, orders, tasks..."}
                className="flex-1 bg-secondary/50 h-11 text-sm"
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-gold hover:opacity-90 h-11 px-5"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Copilot;
