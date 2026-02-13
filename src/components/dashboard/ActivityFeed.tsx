import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, extractItems } from '@/services/api';
import {
  ArrowRightLeft,
  Calendar,
  FileText,
  UserPlus,
  Target,
  ChevronRight
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'trade' | 'client' | 'goal' | 'report';
  title: string;
  description: string;
  client?: string;
  timestamp: string;
}

const typeIcons = {
  trade: ArrowRightLeft,
  client: UserPlus,
  goal: Target,
  report: FileText
};

const typeColors = {
  trade: 'bg-success/10 text-success',
  client: 'bg-primary/10 text-primary',
  goal: 'bg-chart-3/10 text-chart-3',
  report: 'bg-chart-5/10 text-chart-5'
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours > 24) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const allActivities: Activity[] = [];

      try {
        // Fetch recent orders
        const ordersRes = await api.get('/orders', { _sort: 'created_at', _order: 'desc', _limit: '5' });
        const orders = extractItems<any>(ordersRes);

        orders.forEach(order => {
          allActivities.push({
            id: `order-${order.id}`,
            type: 'trade',
            title: `${order.order_type.toUpperCase()} ${order.symbol}`,
            description: `${order.quantity} shares - ${order.status}`,
            client: order.clients?.client_name || order.client_name,
            timestamp: order.created_at
          });
        });

        // Fetch recent clients
        const clientsRes = await api.get('/clients', { _sort: 'created_at', _order: 'desc', _limit: '3' });
        const clients = extractItems<any>(clientsRes);

        clients.forEach(client => {
          allActivities.push({
            id: `client-${client.id}`,
            type: 'client',
            title: 'New Client Added',
            description: client.client_name,
            timestamp: client.created_at
          });
        });

        // Fetch recent goals
        const goalsRes = await api.get('/goals', { _sort: 'created_at', _order: 'desc', _limit: '3' });
        const goals = extractItems<any>(goalsRes);

        goals.forEach(goal => {
          allActivities.push({
            id: `goal-${goal.id}`,
            type: 'goal',
            title: 'Goal Created',
            description: goal.name,
            client: goal.clients?.client_name || goal.client_name,
            timestamp: goal.created_at
          });
        });

        // Fetch recent reports
        const reportsRes = await api.get('/reports', { _sort: 'created_at', _order: 'desc', _limit: '3' });
        const reports = extractItems<any>(reportsRes);

        reports.forEach(report => {
          allActivities.push({
            id: `report-${report.id}`,
            type: 'report',
            title: 'Report Generated',
            description: report.title,
            timestamp: report.created_at
          });
        });
      } catch (err) {
        console.error('Failed to load activities:', err);
      }

      // Sort by timestamp
      allActivities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, 8));
      setLoading(false);
    };

    fetchActivities();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-xl overflow-hidden h-full flex flex-col">
        <div className="p-5 border-b border-border">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-40 mt-1" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
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
            <h3 className="font-semibold">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">Latest actions & updates</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">Start by adding clients or creating orders</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = typeIcons[activity.type];
                return (
                  <div key={activity.id} className="relative flex gap-4 pl-10">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute left-1.5 h-6 w-6 rounded-full flex items-center justify-center',
                        typeColors[activity.type]
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activity.description}
                          </p>
                          {activity.client && (
                            <p className="text-xs text-primary mt-1">{activity.client}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
