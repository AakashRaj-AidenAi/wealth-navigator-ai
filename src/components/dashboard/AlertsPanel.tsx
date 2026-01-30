import { alerts } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Shield, TrendingUp, Users, RefreshCw, ChevronRight, Clock } from 'lucide-react';

const typeIcons = {
  compliance: Shield,
  market: TrendingUp,
  client: Users,
  rebalance: RefreshCw
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

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export const AlertsPanel = () => {
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
