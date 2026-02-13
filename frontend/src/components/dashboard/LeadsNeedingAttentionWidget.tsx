import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyShort } from '@/lib/currency';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, ChevronRight, Clock, Phone, 
  Calendar, TrendingDown, Users
} from 'lucide-react';
interface Lead {
  id: string;
  name: string;
  stage: string;
  expected_value: number | null;
  probability: number | null;
  last_activity_at: string | null;
  next_follow_up: string | null;
  assigned_to: string | null;
  [key: string]: any;
}

interface AttentionLead extends Lead {
  reason: 'overdue_followup' | 'no_activity' | 'stale' | 'high_value_idle';
  priority: 'high' | 'medium' | 'low';
}

export const LeadsNeedingAttentionWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<AttentionLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    overdueCount: 0,
    staleCount: 0,
    totalValue: 0
  });

  useEffect(() => {
    if (user) fetchLeadsNeedingAttention();
  }, [user]);

  const fetchLeadsNeedingAttention = async () => {
    if (!user) return;

    try {
    const dataRes = await api.get('/leads', {
      assigned_to: user.id,
      stage_not_in: 'closed_won,lost',
      _sort: 'last_activity_at',
      _order: 'asc'
    });

    const data = extractItems<Lead>(dataRes);

    const now = new Date();
    const attentionLeads: AttentionLead[] = [];
    let overdueCount = 0;
    let staleCount = 0;
    let totalValue = 0;

    data.forEach(lead => {
        const daysSinceActivity = lead.last_activity_at 
          ? differenceInDays(now, new Date(lead.last_activity_at))
          : 999;
        
        const isOverdueFollowUp = lead.next_follow_up && new Date(lead.next_follow_up) < now;
        const isStale = daysSinceActivity > 7;
        const isHighValueIdle = (lead.expected_value || 0) > 1000000 && daysSinceActivity > 3;
        const hasNoActivity = daysSinceActivity > 14;

        let reason: AttentionLead['reason'] | null = null;
        let priority: AttentionLead['priority'] = 'low';

        if (isOverdueFollowUp) {
          reason = 'overdue_followup';
          priority = 'high';
          overdueCount++;
        } else if (hasNoActivity) {
          reason = 'no_activity';
          priority = 'high';
          staleCount++;
        } else if (isHighValueIdle) {
          reason = 'high_value_idle';
          priority = 'medium';
        } else if (isStale) {
          reason = 'stale';
          priority = 'medium';
          staleCount++;
        }

        if (reason) {
          totalValue += (lead.expected_value || 0) * (lead.probability || 0) / 100;
          attentionLeads.push({ ...lead, reason, priority });
        }
      });

    // Sort by priority then by value
    attentionLeads.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (b.expected_value || 0) - (a.expected_value || 0);
    });

    setLeads(attentionLeads.slice(0, 5));
    setStats({ overdueCount, staleCount, totalValue });
    } catch (err) {
      console.error('Failed to load leads needing attention:', err);
    }

    setLoading(false);
  };

  const getReasonInfo = (reason: AttentionLead['reason']) => {
    switch (reason) {
      case 'overdue_followup':
        return { icon: Calendar, label: 'Overdue follow-up', color: 'text-destructive' };
      case 'no_activity':
        return { icon: Clock, label: 'No activity (14+ days)', color: 'text-destructive' };
      case 'high_value_idle':
        return { icon: TrendingDown, label: 'High-value idle', color: 'text-amber-500' };
      case 'stale':
        return { icon: Clock, label: 'Needs follow-up', color: 'text-amber-500' };
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="glass rounded-xl p-5 cursor-pointer hover:border-primary/50 transition-all group"
      onClick={() => navigate('/leads')}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Leads Needing Attention</h3>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded-lg bg-destructive/10 text-center">
          <p className="text-lg font-bold text-destructive">{stats.overdueCount}</p>
          <p className="text-[10px] text-muted-foreground">Overdue</p>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/10 text-center">
          <p className="text-lg font-bold text-amber-500">{stats.staleCount}</p>
          <p className="text-[10px] text-muted-foreground">Stale</p>
        </div>
        <div className="p-2 rounded-lg bg-primary/10 text-center">
          <p className="text-lg font-bold text-primary">{formatCurrencyShort(stats.totalValue)}</p>
          <p className="text-[10px] text-muted-foreground">At Risk</p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Users className="h-8 w-8 text-success mb-2" />
          <p className="text-sm text-muted-foreground">All leads are on track!</p>
          <p className="text-xs text-muted-foreground">Great job staying engaged</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const reasonInfo = getReasonInfo(lead.reason);
            const ReasonIcon = reasonInfo.icon;
            
            return (
              <div 
                key={lead.id} 
                className={cn(
                  'p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors',
                  lead.priority === 'high' && 'border-l-2 border-l-destructive'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/leads');
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lead.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <ReasonIcon className={cn('h-3 w-3', reasonInfo.color)} />
                      <span className={cn('text-xs', reasonInfo.color)}>{reasonInfo.label}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">{formatCurrencyShort(lead.expected_value)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {lead.last_activity_at 
                        ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true })
                        : 'Never contacted'
                      }
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {leads.length > 0 && (
        <Button variant="ghost" className="w-full mt-3 text-sm" size="sm">
          View All Leads
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
};
