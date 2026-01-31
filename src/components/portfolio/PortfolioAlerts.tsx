import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  TrendingDown, 
  PieChart, 
  Target, 
  Calendar,
  Bell,
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

export interface PortfolioAlert {
  id: string;
  type: 'allocation_drift' | 'price_drop' | 'sip_missed' | 'goal_shortfall';
  severity: 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  value?: string;
  action?: string;
  timestamp: Date;
}

interface PortfolioAlertsProps {
  alerts: PortfolioAlert[];
  onDismiss?: (alertId: string) => void;
  onAction?: (alert: PortfolioAlert) => void;
}

const alertConfig = {
  allocation_drift: {
    icon: PieChart,
    colors: {
      warning: 'bg-warning/10 border-warning/30 text-warning',
      critical: 'bg-destructive/10 border-destructive/30 text-destructive',
      info: 'bg-primary/10 border-primary/30 text-primary',
    }
  },
  price_drop: {
    icon: TrendingDown,
    colors: {
      warning: 'bg-warning/10 border-warning/30 text-warning',
      critical: 'bg-destructive/10 border-destructive/30 text-destructive',
      info: 'bg-muted/10 border-muted/30 text-muted-foreground',
    }
  },
  sip_missed: {
    icon: Calendar,
    colors: {
      warning: 'bg-warning/10 border-warning/30 text-warning',
      critical: 'bg-destructive/10 border-destructive/30 text-destructive',
      info: 'bg-primary/10 border-primary/30 text-primary',
    }
  },
  goal_shortfall: {
    icon: Target,
    colors: {
      warning: 'bg-warning/10 border-warning/30 text-warning',
      critical: 'bg-destructive/10 border-destructive/30 text-destructive',
      info: 'bg-primary/10 border-primary/30 text-primary',
    }
  },
};

export const PortfolioAlerts = ({ alerts, onDismiss, onAction }: PortfolioAlertsProps) => {
  if (alerts.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Portfolio Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center">
            <div className="h-10 w-10 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
              <Bell className="h-5 w-5 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">All clear! No alerts at this time.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Portfolio Alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 5).map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;
          const colorClass = config.colors[alert.severity];
          
          return (
            <div 
              key={alert.id} 
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                colorClass
              )}
            >
              <div className="p-1.5 rounded-md bg-background/50">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-foreground">{alert.title}</p>
                  {onDismiss && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => onDismiss(alert.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                {alert.value && (
                  <p className="text-sm font-medium mt-1">{alert.value}</p>
                )}
                {alert.action && onAction && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 mt-1.5 text-xs"
                    onClick={() => onAction(alert)}
                  >
                    {alert.action}
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {alerts.length > 5 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            +{alerts.length - 5} more alerts
          </p>
        )}
      </CardContent>
    </Card>
  );
};
