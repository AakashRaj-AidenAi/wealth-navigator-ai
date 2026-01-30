import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  FileText,
  Users,
  Target,
  Shield,
  Calculator,
  Calendar,
  Briefcase,
  BarChart3
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'insight' | 'alert' | 'recommendation' | 'analysis';
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const agents: Agent[] = [
  { id: 'portfolio', name: 'Portfolio Intelligence', description: 'Deep portfolio analysis & optimization', icon: Briefcase, color: 'text-primary' },
  { id: 'cio', name: 'CIO Copilot', description: 'Investment strategy & market insights', icon: TrendingUp, color: 'text-success' },
  { id: 'advisor', name: 'Advisor Assistant', description: 'Client recommendations & prep', icon: Users, color: 'text-chart-3' },
  { id: 'compliance', name: 'Compliance Sentinel', description: 'Regulatory monitoring & alerts', icon: Shield, color: 'text-warning' },
  { id: 'tax', name: 'Tax Optimizer', description: 'Tax-loss harvesting & efficiency', icon: Calculator, color: 'text-chart-4' },
  { id: 'meeting', name: 'Meeting Intelligence', description: 'Meeting prep & action items', icon: Calendar, color: 'text-chart-5' },
];

const samplePrompts = [
  "Analyze concentration risk across all family office portfolios",
  "Identify tax-loss harvesting opportunities for Q1",
  "Prepare talking points for Victoria Sterling's review meeting",
  "What's the impact of recent Fed rate decisions on our bond allocations?",
  "Flag any clients approaching suitability guideline limits",
  "Generate a market outlook summary for next week's CIO meeting",
];

const Copilot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Welcome to WealthOS AI Copilot. I'm your intelligent assistant for portfolio analysis, client insights, compliance monitoring, and strategic recommendations. Select an agent below or ask me anything about your wealth management operations.",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

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
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateDetailedResponse(input, selectedAgent),
        timestamp: new Date(),
        type: getResponseType(input),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getResponseType = (query: string): 'insight' | 'alert' | 'recommendation' | 'analysis' => {
    const lower = query.toLowerCase();
    if (lower.includes('risk') || lower.includes('alert') || lower.includes('flag')) return 'alert';
    if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('opportunity')) return 'recommendation';
    if (lower.includes('analyze') || lower.includes('report') || lower.includes('summary')) return 'analysis';
    return 'insight';
  };

  const generateDetailedResponse = (query: string, agentId: string | null): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('concentration') || lowerQuery.includes('risk')) {
      return `## Portfolio Concentration Analysis

I've analyzed all 8 family office portfolios for concentration risk. Here are my findings:

### 🔴 High Priority Alerts
| Client | Sector | Concentration | Limit | Action Required |
|--------|--------|--------------|-------|-----------------|
| Nakamura Estate | Technology | 27.3% | 25% | Immediate rebalance |
| Quantum Ventures | Healthcare | 24.8% | 25% | Monitor closely |

### 📊 Sector Exposure Summary
- **Technology**: Firm-wide 22.4% (Target: 18-20%)
- **Healthcare**: Firm-wide 15.2% (Within range)
- **Financials**: Firm-wide 12.8% (Within range)

### 💡 Recommendations
1. Initiate conversation with Nakamura Estate about reducing NVDA and MSFT positions
2. Review Quantum Ventures' biotech positions before earnings
3. Consider rotating tech gains into underweight sectors (Energy, Materials)

Would you like me to draft a client communication or generate a detailed rebalance proposal?`;
    }

    if (lowerQuery.includes('tax') || lowerQuery.includes('harvesting')) {
      return `## Tax-Loss Harvesting Opportunities

Analyzing unrealized positions across all portfolios for Q1 tax optimization...

### 💰 Top Opportunities (Ranked by Tax Savings)

| Client | Security | Unrealized Loss | Tax Savings Est. | Wash Sale Risk |
|--------|----------|-----------------|------------------|----------------|
| Victoria Sterling | AMZN | -$2.4M | $912K | Low |
| Raghavan Family | TSLA | -$1.8M | $684K | Medium |
| Harrison Trust | VZ | -$890K | $338K | Low |

### ⏰ Time-Sensitive
- Q1 window closes **March 15, 2025**
- Victoria Sterling's gains of $8.2M would benefit most from harvesting
- Recommend action within 2 weeks to allow settlement

### 🔄 Replacement Securities
For wash sale compliance, I recommend:
- AMZN → GOOG or META (similar growth profile)
- TSLA → RIVN or broad EV ETF (DRIV)
- VZ → T or VOX (telecom exposure maintained)

Shall I generate trade tickets for these recommendations?`;
    }

    if (lowerQuery.includes('victoria') || lowerQuery.includes('meeting') || lowerQuery.includes('prep')) {
      return `## Client Meeting Brief: Victoria Sterling

**Meeting:** Q1 Portfolio Review
**Date:** February 5, 2025 at 2:00 PM
**Location:** Main Conference Room

---

### 📊 Portfolio Performance
| Metric | Value | vs Benchmark |
|--------|-------|--------------|
| YTD Return | +18.2% | +4.7% |
| Since Inception | +142% | +38% |
| Sharpe Ratio | 1.42 | Strong |

### 🎯 Key Talking Points

1. **Outstanding Performance**
   - Outperforming benchmark by 470bps YTD
   - Technology allocation (+45% of alpha generation)
   
2. **Tax Planning**
   - $2.4M harvesting opportunity in AMZN
   - Estimated tax savings: $912K
   - Recommend discussing before March deadline

3. **Upcoming Changes**
   - Annual IPS review due
   - Charitable giving discussion (foundation interest)
   
### ⚠️ Sensitive Topics
- Recent divorce settlement may affect risk tolerance
- Mentioned interest in ESG investments last call

### 📎 Materials Prepared
- Performance attribution report
- Market outlook deck
- Tax optimization proposal
- ESG portfolio comparison

Would you like me to email these materials to Victoria's assistant?`;
    }

    return `I understand you're asking about "${query}". Let me analyze this across your client portfolios and market data.

### Analysis Summary

Based on current portfolio positions and market conditions:

1. **Portfolio Impact**: Evaluated across 147 client relationships with $2.86B AUM
2. **Risk Assessment**: No immediate concerns flagged
3. **Opportunity Identified**: 3 potential action items for advisor review

### Recommended Next Steps
- Schedule detailed review meeting
- Generate comprehensive report
- Set up monitoring alerts

Would you like me to elaborate on any specific aspect or generate a formal report?`;
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-7rem)] flex gap-6 animate-fade-in">
        {/* Left Panel - Agents */}
        <div className="w-80 flex-shrink-0 space-y-4">
          <div className="glass rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Agents
            </h3>
            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left',
                    selectedAgent === agent.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-secondary/50 border border-transparent'
                  )}
                >
                  <div className={cn('h-8 w-8 rounded-lg bg-secondary flex items-center justify-center', agent.color)}>
                    <agent.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <h3 className="font-semibold mb-3">Quick Prompts</h3>
            <div className="space-y-2">
              {samplePrompts.slice(0, 4).map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 glass rounded-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-gold flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  WealthOS Copilot
                  <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                    Online
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedAgent 
                    ? `Active: ${agents.find(a => a.id === selectedAgent)?.name}`
                    : 'All agents available'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-4',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-5 py-4',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/50'
                    )}
                  >
                    <div className="prose prose-sm prose-invert max-w-none">
                      {message.content.split('\n').map((line, i) => {
                        if (line.startsWith('##')) {
                          return <h3 key={i} className="text-base font-semibold mt-2 mb-2">{line.replace('## ', '')}</h3>;
                        }
                        if (line.startsWith('###')) {
                          return <h4 key={i} className="text-sm font-semibold mt-3 mb-1">{line.replace('### ', '')}</h4>;
                        }
                        if (line.startsWith('|')) {
                          return null; // Tables handled separately
                        }
                        if (line.startsWith('- ') || line.startsWith('1.')) {
                          return <p key={i} className="text-sm my-1 ml-2">{line}</p>;
                        }
                        return line ? <p key={i} className="text-sm my-1">{line}</p> : <br key={i} />;
                      })}
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium">PS</span>
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-secondary/50 rounded-xl px-5 py-4">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="max-w-4xl mx-auto flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about portfolios, clients, compliance, or market insights..."
                className="flex-1 bg-secondary/50 h-12"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-gradient-gold hover:opacity-90 h-12 px-6"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Copilot;
