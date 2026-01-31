import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  Gift,
  Split,
  ArrowRightLeft,
  RefreshCw,
  Calendar,
  Bell,
  CheckSquare,
  AlertCircle,
  Clock
} from 'lucide-react';

interface ClientCorporateAction {
  id: string;
  holdings_quantity: number;
  estimated_impact: number | null;
  ai_personalized_summary: string | null;
  is_notified: boolean;
  task_created: boolean;
  created_at: string;
  corporate_actions: {
    id: string;
    symbol: string;
    security_name: string;
    action_type: string;
    description: string;
    ex_date: string | null;
    record_date: string | null;
    payment_date: string | null;
    ratio: string | null;
    dividend_amount: number | null;
    status: string;
    ai_suggestion: string | null;
  };
}

interface ClientCorporateActionsTabProps {
  clientId: string;
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

export const ClientCorporateActionsTab = ({ clientId }: ClientCorporateActionsTabProps) => {
  const { toast } = useToast();
  const [actions, setActions] = useState<ClientCorporateAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState<string | null>(null);

  const fetchActions = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/corporate-actions?action=client&clientId=${clientId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActions(data.actions || []);
      }
    } catch (error) {
      console.error('Error fetching client corporate actions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, [clientId]);

  const handleNotify = async (actionId: string, createTask: boolean) => {
    setNotifying(actionId);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/corporate-actions?action=notify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientCorporateActionId: actionId,
            createTask
          })
        }
      );

      if (response.ok) {
        toast({
          title: 'Success',
          description: createTask ? 'Task created successfully' : 'Marked as notified'
        });
        fetchActions();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update action',
        variant: 'destructive'
      });
    } finally {
      setNotifying(null);
    }
  };

  const upcomingActions = actions.filter(a => 
    a.corporate_actions.status === 'upcoming' || a.corporate_actions.status === 'active'
  );
  const pastActions = actions.filter(a => 
    a.corporate_actions.status === 'completed'
  );

  if (loading) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Corporate Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Corporate Actions
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchActions}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming" className="gap-2">
              <Clock className="h-4 w-4" />
              Upcoming ({upcomingActions.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Past ({pastActions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcomingActions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No upcoming corporate actions for this client</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingActions.map((action) => {
                  const corpAction = action.corporate_actions;
                  const Icon = actionIcons[corpAction.action_type] || TrendingUp;
                  const colorClass = actionColors[corpAction.action_type] || actionColors.dividend;

                  return (
                    <div
                      key={action.id}
                      className="p-4 rounded-lg bg-secondary/30 border border-border/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${colorClass}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{corpAction.symbol}</span>
                            <Badge variant="outline" className={`capitalize ${colorClass}`}>
                              {corpAction.action_type.replace('_', ' ')}
                            </Badge>
                            {action.is_notified && (
                              <Badge variant="outline" className="bg-success/10 text-success">
                                Notified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {corpAction.security_name}
                          </p>
                          <p className="text-sm mb-3">
                            {action.ai_personalized_summary || corpAction.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Quantity:</span>
                              <span className="font-medium">{action.holdings_quantity}</span>
                            </div>
                            {action.estimated_impact && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Impact:</span>
                                <span className="font-medium text-success">
                                  {formatCurrency(action.estimated_impact)}
                                </span>
                              </div>
                            )}
                            {corpAction.ex_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Ex-Date:</span>
                                <span>
                                  {new Date(corpAction.ex_date).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                          {corpAction.ai_suggestion && (
                            <div className="mt-3 p-2 rounded bg-warning/10 text-sm">
                              <span className="font-medium">AI Suggestion: </span>
                              {corpAction.ai_suggestion}
                            </div>
                          )}
                          {!action.is_notified && (
                            <div className="flex items-center gap-2 mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleNotify(action.id, false)}
                                disabled={notifying === action.id}
                              >
                                <Bell className="h-4 w-4 mr-1" />
                                Mark Notified
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleNotify(action.id, true)}
                                disabled={notifying === action.id}
                              >
                                <CheckSquare className="h-4 w-4 mr-1" />
                                Create Task
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastActions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No past corporate actions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastActions.map((action) => {
                  const corpAction = action.corporate_actions;
                  const Icon = actionIcons[corpAction.action_type] || TrendingUp;
                  const colorClass = actionColors[corpAction.action_type] || actionColors.dividend;

                  return (
                    <div
                      key={action.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/20"
                    >
                      <div className={`p-2 rounded-lg ${colorClass} opacity-60`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{corpAction.symbol}</span>
                          <Badge variant="outline" className="text-xs opacity-60">
                            {corpAction.action_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {corpAction.description}
                        </p>
                      </div>
                      {action.estimated_impact && (
                        <span className="text-sm font-medium text-success">
                          {formatCurrency(action.estimated_impact)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
