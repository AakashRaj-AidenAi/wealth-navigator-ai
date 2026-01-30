import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'insight' | 'alert' | 'recommendation';
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Good morning, Priya. I've analyzed your client portfolios overnight. Here are today's key insights:",
    timestamp: new Date(),
  },
  {
    id: '2',
    role: 'assistant',
    content: "🔴 **Priority Alert**: Nakamura Estate's technology sector concentration has reached 27.3%, exceeding the 25% IPS limit. Recommend initiating rebalance discussion.",
    timestamp: new Date(),
    type: 'alert'
  },
  {
    id: '3',
    role: 'assistant',
    content: "💡 **Tax Opportunity**: Victoria Sterling has $2.4M in unrealized losses that could offset Q1 gains. Tax-loss harvesting window closes Feb 15.",
    timestamp: new Date(),
    type: 'insight'
  },
  {
    id: '4',
    role: 'assistant',
    content: "📈 **Recommendation**: Based on Fed's dovish pivot signals, consider increasing duration in Harrison Trust's fixed income allocation from 4.2 to 5.5 years.",
    timestamp: new Date(),
    type: 'recommendation'
  }
];

const quickActions = [
  { label: 'Portfolio Analysis', icon: TrendingUp },
  { label: 'Risk Assessment', icon: AlertTriangle },
  { label: 'Investment Ideas', icon: Lightbulb },
];

export const AICopilot = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const generateResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('raghavan') || lowerQuery.includes('portfolio')) {
      return "The Raghavan Family Office portfolio is performing well with YTD returns of +12.4%. Current allocation: 45% Equities, 30% Fixed Income, 15% Alternatives, 10% Cash. No immediate rebalancing required, though I'd recommend reviewing the private equity commitments scheduled for Q2.";
    }
    if (lowerQuery.includes('risk') || lowerQuery.includes('exposure')) {
      return "Analyzing firm-wide risk exposure: Overall VaR (95%, 1-day) is $4.2M. Key concentrations: 1) Technology sector at 22% vs 18% target, 2) USD exposure at 78%. Recommend hedging EUR exposure for European clients given ECB policy uncertainty.";
    }
    if (lowerQuery.includes('meeting') || lowerQuery.includes('prepare')) {
      return "I'll prepare a comprehensive briefing. Key talking points for client meetings: 1) Market outlook and positioning rationale, 2) Performance attribution vs benchmarks, 3) Upcoming rebalancing needs, 4) Tax planning opportunities. Shall I generate the full presentation deck?";
    }
    return "I understand you're asking about \"" + query + "\". Let me analyze the relevant data across your client portfolios. Based on current market conditions and portfolio positions, I recommend we schedule a detailed review. Would you like me to prepare a comprehensive analysis report?";
  };

  return (
    <div
      className={cn(
        'glass rounded-xl flex flex-col transition-all duration-300',
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
            <p className="text-xs text-muted-foreground">Powered by WealthOS Intelligence</p>
          </div>
        </div>
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
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
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
                    : message.type === 'alert'
                    ? 'bg-destructive/10 border border-destructive/20'
                    : message.type === 'insight'
                    ? 'bg-success/10 border border-success/20'
                    : message.type === 'recommendation'
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-secondary'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
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
              onClick={() => setInput(`Provide ${action.label.toLowerCase()} for my top clients`)}
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
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-gradient-gold hover:opacity-90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
