import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Shield, TrendingUp, Users, ChevronRight, Clock, AlertTriangle } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  description: string;
  type: 'compliance' | 'market' | 'client' | 'rebalance';
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}

const typeIcons = {
  compliance: Shield,
  market: TrendingUp,
  client: Users,
  rebalance: AlertTriangle
};

const severityColors = {
  high: 'border-l-destructive bg-destructive/5',
  medium: 'border-l-warning bg-warning/5',
  low: 'border-l-primary bg-primary/5'
};

const severityDots = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-primary'
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export const AlertsPanel = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateAlerts = async () => {
      // Fetch real data to generate contextual alerts
      const { data: clients } = await supabase
        .from('clients')
        .select('client_name, risk_profile, total_assets');

      const { data: orders } = await supabase
        .from('orders')
        .select('symbol, status, client_id, created_at')
        .eq('status', 'pending')
        .limit(5);

      const { data: goals } = await supabase
        .from('goals')
        .select('name, current_amount, target_amount, client_id');

      const generatedAlerts: Alert[] = [];

      // Generate alerts based on real data
      if (clients && clients.length > 0) {
        // High concentration alert
        const highValueClients = clients.filter(c => Number(c.total_assets) > 20000000);
        if (highValueClients.length > 0) {
          generatedAlerts.push({
            id: '1',
            title: 'High Value Client Review',
            description: `${highValueClients[0].client_name} portfolio requires quarterly review`,
            type: 'compliance',
            severity: 'medium',
            timestamp: new Date().toISOString()
          });
        }

        // Risk profile distribution alert
        const aggressiveClients = clients.filter(c => c.risk_profile === 'aggressive');
        if (aggressiveClients.length > 0) {
          generatedAlerts.push({
            id: '2',
            title: 'Aggressive Portfolio Monitoring',
            description: `${aggressiveClients.length} client(s) with aggressive risk profile need monitoring`,
            type: 'market',
            severity: 'low',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          });
        }
      }

      // Pending orders alert
      if (orders && orders.length > 0) {
        generatedAlerts.push({
          id: '3',
          title: 'Pending Orders',
          description: `${orders.length} order(s) awaiting execution`,
          type: 'rebalance',
          severity: 'high',
          timestamp: orders[0].created_at
        });
      }

      // Goals progress alert
      if (goals && goals.length > 0) {
        const behindGoals = goals.filter(g => 
          (Number(g.current_amount) / Number(g.target_amount)) < 0.5
        );
        if (behindGoals.length > 0) {
          generatedAlerts.push({
            id: '4',
            title: 'Goals Behind Schedule',
            description: `${behindGoals.length} goal(s) are less than 50% complete`,
            type: 'client',
            severity: 'medium',
            timestamp: new Date(Date.now() - 7200000).toISOString()
          });
        }
      }

      // If no real alerts, show placeholder
      if (generatedAlerts.length === 0) {
        generatedAlerts.push({
          id: '0',
          title: 'All Clear',
          description: 'No pending alerts or issues to address',
          type: 'compliance',
          severity: 'low',
          timestamp: new Date().toISOString()
        });
      }

      setAlerts(generatedAlerts);
      setLoading(false);
    };

    generateAlerts();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-xl overflow-hidden h-full flex flex-col">
        <div className="p-5 border-b border-border">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Active Alerts</h3>
            <p className="text-sm text-muted-foreground">Requiring attention</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {alerts.map((alert) => {
          const Icon = typeIcons[alert.type];
          return (
            <div
              key={alert.id}
              className={cn(
                'p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:translate-x-1',
                severityColors[alert.severity]
              )}
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-background/50 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('h-2 w-2 rounded-full', severityDots[alert.severity])} />
                    <h4 className="font-medium text-sm truncate">{alert.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {alert.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(alert.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
