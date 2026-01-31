import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { 
  TrendingUp, 
  Gift, 
  Split, 
  ArrowRightLeft,
  RefreshCw,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface CorporateAction {
  id: string;
  symbol: string;
  security_name: string;
  action_type: string;
  description: string;
  ex_date: string | null;
  record_date: string | null;
  ai_summary: string | null;
  ai_suggestion: string | null;
  affected_clients: number;
  total_impact: number;
}

const actionIcons: Record<string, React.ElementType> = {
  dividend: Gift,
  bonus: TrendingUp,
  split: Split,
  buyback: ArrowRightLeft,
  rights_issue: TrendingUp,
  merger: ArrowRightLeft,
  demerger: ArrowRightLeft
};

const actionColors: Record<string, string> = {
  dividend: 'bg-success/10 text-success border-success/20',
  bonus: 'bg-primary/10 text-primary border-primary/20',
  split: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  buyback: 'bg-warning/10 text-warning border-warning/20',
  rights_issue: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  merger: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
  demerger: 'bg-muted text-muted-foreground border-muted'
};

export const CorporateActionsWidget = () => {
  const navigate = useNavigate();
  const [actions, setActions] = useState<CorporateAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActions = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      // Trigger data fetch from edge function
      const { data: session } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/corporate-actions?action=fetch`, {
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/corporate-actions?action=list`,
        {
          headers: {
            'Authorization': `Bearer ${session.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActions(data.actions?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error('Error fetching corporate actions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActions(true); // Initial fetch with data sync
  }, []);

  if (loading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Corporate Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Corporate Actions Today
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fetchActions(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => navigate('/corporate-actions')}
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No upcoming corporate actions</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => fetchActions(true)}
            >
              Refresh Data
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => {
              const Icon = actionIcons[action.action_type] || TrendingUp;
              const colorClass = actionColors[action.action_type] || actionColors.dividend;

              return (
                <div
                  key={action.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/corporate-actions')}
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{action.symbol}</span>
                      <Badge variant="outline" className={`text-xs capitalize ${colorClass}`}>
                        {action.action_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {action.ai_summary || action.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-muted-foreground">
                        {action.affected_clients} client{action.affected_clients !== 1 ? 's' : ''}
                      </span>
                      {action.total_impact > 0 && (
                        <span className="font-medium text-success">
                          {formatCurrency(action.total_impact, true)} impact
                        </span>
                      )}
                      {action.ex_date && (
                        <span className="text-muted-foreground">
                          Ex: {new Date(action.ex_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
