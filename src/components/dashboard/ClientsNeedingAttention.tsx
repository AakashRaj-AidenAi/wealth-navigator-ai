import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { 
  ChevronRight, 
  Calendar, 
  FileWarning,
  Gift,
  Clock,
  Phone,
  TrendingDown,
  Target,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface PrioritizedClient {
  id: string;
  client_name: string;
  total_assets: number | null;
  priority_score: number;
  reason: string;
  suggested_action: string;
  urgency: 'critical' | 'high' | 'medium';
}

const actionIcons: Record<string, React.ElementType> = {
  'Schedule call': Phone,
  'Review portfolio': TrendingDown,
  'Update KYC': FileWarning,
  'Send birthday wishes': Gift,
  'Process orders': Clock,
  'Goal review meeting': Target,
};

const urgencyColors = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  medium: 'bg-primary/20 text-primary'
};

const urgencyBorderColors = {
  critical: 'border-l-destructive',
  high: 'border-l-warning',
  medium: 'border-l-primary'
};

export const ClientsNeedingAttention = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<PrioritizedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchPrioritizedClients();
  }, [user]);

  const fetchPrioritizedClients = async (showToast = false) => {
    if (!user) return;

    try {
      if (showToast) setRefreshing(true);

      const data = await api.post<{ prioritized_clients: PrioritizedClient[] }>('/insights/smart-prioritization');
      setClients(data.prioritized_clients || []);

      if (showToast) {
        toast.success('Client priorities refreshed');
      }
    } catch (error) {
      console.error('Error fetching prioritized clients:', error);
      if (showToast) {
        toast.error('Failed to refresh priorities');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchPrioritizedClients(true);
  };

  if (loading) {
    return (
      <div className="glass rounded-xl overflow-hidden h-full flex flex-col">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Smart Client Priorities</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered • {clients.length} client{clients.length !== 1 ? 's' : ''} need attention
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="text-primary">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {clients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All clients are in good standing</p>
            <p className="text-xs mt-1">No urgent attention needed today</p>
          </div>
        ) : (
          clients.map((client, index) => {
            const Icon = actionIcons[client.suggested_action] || Phone;
            return (
              <div
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`)}
                className={cn(
                  "p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all cursor-pointer group border-l-4",
                  urgencyBorderColors[client.urgency]
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-8 w-8 rounded-lg bg-background/50 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{client.client_name}</h4>
                      <Badge className={cn('text-xs px-1.5 py-0', urgencyColors[client.urgency])}>
                        {client.urgency}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1.5">{client.reason}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-normal">
                        {client.suggested_action}
                      </Badge>
                      {client.total_assets && (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(client.total_assets, true)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs font-semibold text-primary">
                      {client.priority_score}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
