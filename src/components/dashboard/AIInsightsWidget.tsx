import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Sparkles, 
  RefreshCw,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  PieChart,
  Mail,
  FileText,
  Lightbulb,
  ChevronRight
} from 'lucide-react';

interface Insight {
  type: 'next_action' | 'at_risk' | 'rebalance' | 'email_draft' | 'meeting_summary';
  title: string;
  description: string;
  client_name?: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

const insightIcons = {
  next_action: UserCheck,
  at_risk: AlertTriangle,
  rebalance: PieChart,
  email_draft: Mail,
  meeting_summary: FileText
};

const insightColors = {
  next_action: 'bg-primary/10 text-primary border-primary/20',
  at_risk: 'bg-destructive/10 text-destructive border-destructive/20',
  rebalance: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  email_draft: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  meeting_summary: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
};

const priorityColors = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-muted text-muted-foreground'
};

const insightLabels = {
  next_action: 'Next Action',
  at_risk: 'At-Risk Client',
  rebalance: 'Rebalance',
  email_draft: 'Email Draft',
  meeting_summary: 'Summary'
};

export const AIInsightsWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async () => {
    if (!user) return;

    try {
      const data = await api.post<{ insights: Insight[] }>('/insights/ai-insights', { type: 'dashboard' });
      setInsights(data.insights || []);
    } catch (error: any) {
      if (error?.status === 429) {
        toast.error("AI rate limit reached. Try again later.");
      } else if (error?.status === 402) {
        toast.error("AI usage limit reached. Please add credits.");
      } else {
        console.error("Failed to fetch insights:", error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInsights();
    }
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  const handleInsightClick = (insight: Insight) => {
    switch (insight.type) {
      case 'at_risk':
      case 'next_action':
      case 'rebalance':
        navigate('/clients');
        break;
      case 'email_draft':
        navigate('/communications');
        break;
      case 'meeting_summary':
        navigate('/tasks');
        break;
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Insights</h3>
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-8 w-8"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-8">
          <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No insights available yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add more clients and data to get AI recommendations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.slice(0, 6).map((insight, index) => {
            const Icon = insightIcons[insight.type] || Lightbulb;
            return (
              <div
                key={index}
                onClick={() => handleInsightClick(insight)}
                className={cn(
                  'p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] group',
                  insightColors[insight.type]
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{insightLabels[insight.type]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs py-0 h-5", priorityColors[insight.priority])}>
                      {insight.priority}
                    </Badge>
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <h4 className="font-medium text-sm mb-1 line-clamp-1">{insight.title}</h4>
                {insight.client_name && (
                  <p className="text-xs opacity-80 mb-1">{insight.client_name}</p>
                )}
                <p className="text-xs opacity-70 line-clamp-2">{insight.description}</p>
                {insight.action && (
                  <div className="mt-2 flex items-center gap-1 text-xs font-medium">
                    <ArrowRight className="h-3 w-3" />
                    {insight.action}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
