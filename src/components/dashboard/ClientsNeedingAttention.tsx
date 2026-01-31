import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { 
  ChevronRight, 
  AlertTriangle, 
  Calendar, 
  FileWarning,
  Gift,
  Clock
} from 'lucide-react';

interface AttentionClient {
  id: string;
  client_name: string;
  total_assets: number | null;
  reason: string;
  reasonType: 'kyc' | 'birthday' | 'review' | 'goal' | 'order';
  priority: 'high' | 'medium' | 'low';
}

const reasonIcons = {
  kyc: FileWarning,
  birthday: Gift,
  review: Calendar,
  goal: AlertTriangle,
  order: Clock
};

const priorityColors = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-primary'
};

export const ClientsNeedingAttention = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<AttentionClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchClientsNeedingAttention();
  }, [user]);

  const fetchClientsNeedingAttention = async () => {
    if (!user) return;

    const today = new Date();
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    // Fetch clients with various attention needs
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, client_name, total_assets, kyc_expiry_date, date_of_birth, anniversary_date')
      .eq('advisor_id', user.id);

    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('client_id, clients(id, client_name, total_assets)')
      .eq('status', 'pending');

    const { data: behindGoals } = await supabase
      .from('goals')
      .select('client_id, clients(id, client_name, total_assets), current_amount, target_amount')
      .lt('status', 'completed');

    const attentionClients: AttentionClient[] = [];

    if (clientsData) {
      clientsData.forEach(client => {
        // KYC expiring soon
        if (client.kyc_expiry_date) {
          const kycDate = new Date(client.kyc_expiry_date);
          if (kycDate <= in7Days) {
            const isExpired = kycDate < today;
            attentionClients.push({
              id: client.id,
              client_name: client.client_name,
              total_assets: client.total_assets,
              reason: isExpired ? 'KYC expired' : 'KYC expiring soon',
              reasonType: 'kyc',
              priority: isExpired ? 'high' : 'medium'
            });
          }
        }

        // Birthday today or this week
        if (client.date_of_birth) {
          const dob = new Date(client.date_of_birth);
          const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          if (thisYearBirthday.toISOString().split('T')[0] === todayStr) {
            attentionClients.push({
              id: client.id,
              client_name: client.client_name,
              total_assets: client.total_assets,
              reason: 'Birthday today! 🎂',
              reasonType: 'birthday',
              priority: 'medium'
            });
          } else if (thisYearBirthday >= today && thisYearBirthday <= in7Days) {
            attentionClients.push({
              id: client.id,
              client_name: client.client_name,
              total_assets: client.total_assets,
              reason: `Birthday on ${thisYearBirthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
              reasonType: 'birthday',
              priority: 'low'
            });
          }
        }
      });
    }

    // Pending orders
    if (pendingOrders) {
      const clientsWithOrders = new Set<string>();
      pendingOrders.forEach(order => {
        if (order.clients && !clientsWithOrders.has(order.clients.id)) {
          clientsWithOrders.add(order.clients.id);
          attentionClients.push({
            id: order.clients.id,
            client_name: order.clients.client_name,
            total_assets: order.clients.total_assets,
            reason: 'Has pending orders',
            reasonType: 'order',
            priority: 'high'
          });
        }
      });
    }

    // Goals behind schedule
    if (behindGoals) {
      const clientsWithGoalIssues = new Set<string>();
      behindGoals.forEach(goal => {
        if (goal.clients && !clientsWithGoalIssues.has(goal.clients.id)) {
          const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
          if (progress < 40) {
            clientsWithGoalIssues.add(goal.clients.id);
            attentionClients.push({
              id: goal.clients.id,
              client_name: goal.clients.client_name,
              total_assets: goal.clients.total_assets,
              reason: 'Goal behind schedule',
              reasonType: 'goal',
              priority: 'medium'
            });
          }
        }
      });
    }

    // Sort by priority and deduplicate
    const uniqueClients = attentionClients.reduce((acc, client) => {
      const existing = acc.find(c => c.id === client.id);
      if (!existing || priorityOrder[client.priority] < priorityOrder[existing.priority]) {
        return [...acc.filter(c => c.id !== client.id), client];
      }
      return acc;
    }, [] as AttentionClient[]);

    const sorted = uniqueClients.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    ).slice(0, 5);

    setClients(sorted);
    setLoading(false);
  };

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  if (loading) {
    return (
      <div className="glass rounded-xl overflow-hidden h-full flex flex-col">
        <div className="p-5 border-b border-border">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
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
            <h3 className="font-semibold">Clients Needing Attention</h3>
            <p className="text-sm text-muted-foreground">
              {clients.length} client{clients.length !== 1 ? 's' : ''} today
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="text-primary">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {clients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All clients are in good standing</p>
          </div>
        ) : (
          clients.map((client) => {
            const Icon = reasonIcons[client.reasonType];
            return (
              <div
                key={`${client.id}-${client.reasonType}`}
                onClick={() => navigate(`/clients/${client.id}`)}
                className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-background/50 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('h-2 w-2 rounded-full', priorityColors[client.priority])} />
                      <h4 className="font-medium text-sm truncate">{client.client_name}</h4>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{client.reason}</p>
                      {client.total_assets && (
                        <Badge variant="secondary" className="text-xs">
                          {formatCurrency(client.total_assets, true)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
