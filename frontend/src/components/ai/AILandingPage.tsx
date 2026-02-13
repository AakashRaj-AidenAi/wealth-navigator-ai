import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { usePromptSuggestions } from '@/hooks/usePromptSuggestions';
import { chatService } from '@/services/chatService';
import { api, extractItems } from '@/services/api';
import { formatCurrency } from '@/lib/currency';
import {
  Send,
  DollarSign,
  Users,
  ListTodo,
  AlertTriangle,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader3D } from '@/components/ui/loader-3d';
import { format, formatDistanceToNow } from 'date-fns';

interface QuickMetric {
  title: string;
  value: string;
  icon: React.ReactNode;
  href?: string;
  loading?: boolean;
}

export const AILandingPage = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { suggestions, loading: suggestionsLoading } = usePromptSuggestions();
  const [prompt, setPrompt] = useState('');
  const [metrics, setMetrics] = useState<QuickMetric[]>([]);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderFade, setPlaceholderFade] = useState(true);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  // Dynamic placeholders based on role
  const placeholders = {
    wealth_advisor: [
      "Analyze my top 5 clients by AUM...",
      "Show portfolio concentration risks...",
      "Prepare talking points for client review...",
      "What are the tax-loss harvesting opportunities?",
      "Which clients need attention this week?",
      "Generate a market outlook summary...",
    ],
    compliance_officer: [
      "Show all unresolved compliance alerts...",
      "Run a suitability check across portfolios...",
      "Generate audit trail for last quarter...",
      "Review recent risk flag escalations...",
      "Check communication logs for irregularities...",
    ],
    client: [
      "How is my portfolio performing?",
      "What are my current financial goals?",
      "Show me the market outlook...",
      "Am I on track to meet my retirement goals?",
      "Schedule a meeting with my advisor...",
    ],
  };

  const currentPlaceholders = placeholders[role as keyof typeof placeholders] || placeholders.wealth_advisor;
  const currentPlaceholder = currentPlaceholders[placeholderIndex];

  // Rotate placeholder every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderFade(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % currentPlaceholders.length);
        setPlaceholderFade(true);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentPlaceholders.length]);

  // Fetch quick metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;

      const metricsData: QuickMetric[] = [
        { title: 'Total AUM', value: '$0', icon: <DollarSign className="h-4 w-4" />, href: '/portfolios', loading: true },
        { title: 'Active Clients', value: '0', icon: <Users className="h-4 w-4" />, href: '/clients', loading: true },
        { title: 'Pending Tasks', value: '0', icon: <ListTodo className="h-4 w-4" />, href: '/tasks', loading: true },
        { title: 'Active Alerts', value: '0', icon: <AlertTriangle className="h-4 w-4" />, href: '/compliance', loading: true },
      ];

      setMetrics(metricsData);

      try {
        const [clientsRes, tasksRes, alertsRes] = await Promise.all([
          api.get('/clients', { advisor_id: user.id, fields: 'total_assets' }).catch(() => ({ items: [] })),
          api.get('/tasks', { assigned_to: user.id, status: 'todo,in_progress' }).catch(() => ({ items: [] })),
          api.get('/compliance/alerts', { is_resolved: false }).catch(() => ({ items: [] })),
        ]);

        const clients = extractItems(clientsRes);
        const tasks = extractItems(tasksRes);
        const alerts = extractItems(alertsRes);

        const totalAUM = clients.reduce((sum: number, c: any) => sum + (Number(c.total_assets) || 0), 0);

        setMetrics([
          { title: 'Total AUM', value: formatCurrency(totalAUM, true), icon: <DollarSign className="h-4 w-4" />, href: '/portfolios' },
          { title: 'Active Clients', value: clients.length.toString(), icon: <Users className="h-4 w-4" />, href: '/clients' },
          { title: 'Pending Tasks', value: tasks.length.toString(), icon: <ListTodo className="h-4 w-4" />, href: '/tasks' },
          { title: 'Active Alerts', value: alerts.length.toString(), icon: <AlertTriangle className="h-4 w-4" />, href: '/compliance' },
        ]);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
        // Keep loading states if fetch fails
      }
    };

    fetchMetrics();
  }, [user]);

  // Fetch recent conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { conversations } = await chatService.listConversations({ limit: 5, archived: false });
        setRecentConversations(conversations);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
        // Silently fail - not critical
      }
    };

    fetchConversations();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    navigate(`/copilot?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    navigate(`/copilot?prompt=${encodeURIComponent(suggestionText)}`);
  };

  const handleMetricClick = (href?: string) => {
    if (href) navigate(href);
  };

  const handleConversationClick = (conversationId: string) => {
    navigate(`/copilot?conversation=${conversationId}`);
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center animate-fade-in">
        <div className="w-full max-w-4xl space-y-8 px-4">
          {/* Greeting Section */}
          <div className="text-center space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {getGreeting()}, <span className="text-gradient-gold">{firstName}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              I'm <span className="font-semibold">Wealthyx</span>, how can I help?
            </p>
          </div>

          {/* Central Chat Input */}
          <form
            onSubmit={handleSubmit}
            className="animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="relative group">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={currentPlaceholder}
                className={cn(
                  "h-14 pr-14 text-base glass glass-hover focus:ring-2 focus:ring-primary/50 transition-all",
                  "placeholder:transition-opacity placeholder:duration-300",
                  placeholderFade ? "placeholder:opacity-100" : "placeholder:opacity-0"
                )}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1.5 top-1.5 h-11 w-11"
                disabled={!prompt.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Prompt Suggestions */}
          {!suggestionsLoading && suggestions.length > 0 && (
            <div
              className="flex flex-wrap gap-2 justify-center animate-slide-up"
              style={{ animationDelay: '0.3s' }}
            >
              {suggestions.slice(0, 6).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className={cn(
                    "px-4 py-2.5 rounded-lg glass glass-hover",
                    "flex items-center gap-2 text-sm font-medium",
                    "transition-all duration-200",
                    "hover:scale-105 hover:shadow-lg",
                    "border border-transparent hover:border-primary/20",
                    "hover:bg-gradient-to-br hover:from-primary/5 hover:to-secondary/5"
                  )}
                  style={{ animationDelay: `${0.4 + idx * 0.05}s` }}
                >
                  <span className="text-base">{suggestion.icon}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Metrics Row */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up"
            style={{ animationDelay: '0.5s' }}
          >
            {metrics.map((metric, idx) => (
              <Card
                key={idx}
                className={cn(
                  "p-4 glass glass-hover cursor-pointer transition-all duration-200",
                  "hover:scale-105 hover:shadow-lg"
                )}
                onClick={() => handleMetricClick(metric.href)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    {metric.icon}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{metric.title}</p>
                  {metric.loading ? (
                    <Loader3D size="sm" variant="spinner" />
                  ) : (
                    <p className="text-xl font-semibold tabular-nums">{metric.value}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Recent Conversations */}
          {recentConversations.length > 0 && (
            <div
              className="space-y-3 animate-slide-up"
              style={{ animationDelay: '0.6s' }}
            >
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Recent Conversations
              </h3>
              <div className="space-y-2">
                {recentConversations.slice(0, 3).map((conv, idx) => (
                  <Card
                    key={conv.id}
                    className="p-3 glass glass-hover cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                    onClick={() => handleConversationClick(conv.id)}
                    style={{ animationDelay: `${0.65 + idx * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {conv.title || 'Untitled Conversation'}
                        </p>
                        {conv.agent_type && (
                          <p className="text-xs text-muted-foreground">
                            {conv.agent_type}
                          </p>
                        )}
                      </div>
                      {conv.last_message_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
