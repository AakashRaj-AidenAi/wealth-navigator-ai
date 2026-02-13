import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronRight, ArrowDownRight, Clock, Wallet, Send,
  CheckCircle2, XCircle, Undo2, Zap, Building2, ArrowRight, FileText,
} from 'lucide-react';
import { PayoutSettlementTracker, SettlementTimeline } from '@/components/funding/PayoutSettlementTracker';

// Payout workflow stages per type
const PAYOUT_WORKFLOW: Record<string, { stages: string[]; labels: Record<string, string>; est: string }> = {
  ACH: {
    stages: ['requested', 'approved', 'processing', 'settled', 'completed'],
    labels: { requested: 'Requested', approved: 'Approved', processing: 'Processing', settled: 'Settled (T+1)', completed: 'Completed' },
    est: 'T+1 settlement',
  },
  Wire: {
    stages: ['requested', 'approved', 'processing', 'completed'],
    labels: { requested: 'Requested', approved: 'Approved', processing: 'Processing', completed: 'Same-day' },
    est: 'Same day (if approved)',
  },
  TOA: {
    stages: ['requested', 'approved', 'transfer_initiated', 'in_transit', 'completed'],
    labels: { requested: 'Requested', approved: 'Approved', transfer_initiated: 'Transfer Initiated', in_transit: 'In Transit', completed: 'Completed' },
    est: '3–10 business days',
  },
};

const stageIcon: Record<string, React.ElementType> = {
  requested: Send, approved: CheckCircle2, processing: Clock,
  settled: Wallet, completed: CheckCircle2, transfer_initiated: ArrowRight,
  in_transit: ArrowDownRight, failed: XCircle, reversed: Undo2,
};

const stageColor: Record<string, string> = {
  requested: 'border-blue-500 bg-blue-500/10 text-blue-500',
  approved: 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
  processing: 'border-indigo-500 bg-indigo-500/10 text-indigo-500',
  settled: 'border-cyan-500 bg-cyan-500/10 text-cyan-500',
  completed: 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
  transfer_initiated: 'border-violet-500 bg-violet-500/10 text-violet-500',
  in_transit: 'border-amber-500 bg-amber-500/10 text-amber-500',
  failed: 'border-destructive bg-destructive/10 text-destructive',
  reversed: 'border-orange-500 bg-orange-500/10 text-orange-500',
};

interface PayoutRecord {
  id: string;
  payout_type: string;
  amount: number;
  status: string;
  workflow_stage: string;
  stage_updated_at: string;
  requested_date: string;
  settlement_date: string | null;
  completed_at: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  estimated_completion: string | null;
  linked_trade_id: string | null;
  notes: string | null;
  created_at: string;
}

interface PayoutHistoryEntry {
  id: string;
  payout_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string;
  note: string | null;
  created_at: string;
}

// Mini workflow tracker for payouts
const PayoutWorkflowTracker = ({ payoutType, currentStage }: { payoutType: string; currentStage: string }) => {
  const wf = PAYOUT_WORKFLOW[payoutType] || PAYOUT_WORKFLOW.ACH;
  const activeStages = wf.stages;
  const currentIdx = activeStages.indexOf(currentStage);
  const isFailed = currentStage === 'failed';
  const isReversed = currentStage === 'reversed';

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto py-2">
      {activeStages.map((stage, idx) => {
        const Icon = stageIcon[stage] || Clock;
        const isPast = !isFailed && !isReversed && currentIdx > idx;
        const isCurrent = !isFailed && !isReversed && currentIdx === idx;
        const isFuture = !isFailed && !isReversed && currentIdx < idx;

        return (
          <div key={stage} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all',
                isPast && 'border-emerald-500 bg-emerald-500 text-white',
                isCurrent && 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/30',
                isFuture && 'border-muted-foreground/30 bg-muted text-muted-foreground',
                (isFailed || isReversed) && idx <= Math.max(0, currentIdx) && 'border-destructive bg-destructive/20 text-destructive',
              )}>
                {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={cn(
                'text-[9px] text-center max-w-[64px] leading-tight',
                isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}>
                {wf.labels[stage]}
              </span>
            </div>
            {idx < activeStages.length - 1 && (
              <div className={cn(
                'h-0.5 w-5 mx-0.5 mt-[-14px]',
                isPast ? 'bg-emerald-500' : 'bg-muted-foreground/20',
              )} />
            )}
          </div>
        );
      })}
      {(isFailed || isReversed) && (
        <div className="flex items-center ml-2 flex-shrink-0">
          <div className="flex flex-col items-center gap-1">
            <div className={cn('h-7 w-7 rounded-full flex items-center justify-center border-2',
              isFailed ? 'border-destructive bg-destructive text-white' : 'border-orange-500 bg-orange-500 text-white')}>
              {isFailed ? <XCircle className="h-3.5 w-3.5" /> : <Undo2 className="h-3.5 w-3.5" />}
            </div>
            <span className={cn('text-[9px] font-semibold', isFailed ? 'text-destructive' : 'text-orange-500')}>
              {isFailed ? 'Failed' : 'Reversed'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Status history timeline
const PayoutTimeline = ({ history }: { history: PayoutHistoryEntry[] }) => {
  if (history.length === 0) return <p className="text-xs text-muted-foreground py-1">No timeline data yet.</p>;
  return (
    <div className="space-y-0 pl-3 border-l-2 border-muted ml-2">
      {history.map((h) => {
        const Icon = stageIcon[h.to_stage] || Clock;
        const color = stageColor[h.to_stage] || '';
        return (
          <div key={h.id} className="relative pb-3 last:pb-0">
            <div className={cn('absolute -left-[17px] top-0 h-5 w-5 rounded-full flex items-center justify-center border-2 bg-background', color || 'border-muted')}>
              <Icon className="h-2.5 w-2.5" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium">
                {h.from_stage ? <><span className="text-muted-foreground">{h.from_stage}</span> → </> : null}
                <span>{h.to_stage}</span>
              </p>
              {h.note && <p className="text-[10px] text-muted-foreground">{h.note}</p>}
              <p className="text-[10px] text-muted-foreground">{format(new Date(h.created_at), 'dd MMM yyyy, HH:mm')}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface ClientPayoutsTabProps {
  clientId: string;
}

export const ClientPayoutsTab = ({ clientId }: ClientPayoutsTabProps) => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [history, setHistory] = useState<Record<string, PayoutHistoryEntry[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPayouts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.get<PayoutRecord[]>('/payout_requests', { client_id: clientId, advisor_id: user.id });
      setPayouts(data || []);
    } catch (err) {
      console.error('Failed to load payouts:', err);
      setPayouts([]);
    }
    setLoading(false);
  }, [clientId, user]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const fetchHistory = async (payoutId: string) => {
    try {
      const data = await api.get<PayoutHistoryEntry[]>('/payout_status_history', { payout_id: payoutId });
      setHistory(prev => ({ ...prev, [payoutId]: data || [] }));
    } catch (err) {
      console.error('Failed to load payout history:', err);
    }
  };

  const handleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!history[id]) fetchHistory(id);
  };

  const statusBadgeVariant = (status: string) => {
    if (status === 'Completed') return 'default';
    if (status === 'Failed') return 'destructive';
    if (status === 'Processing') return 'outline';
    return 'secondary';
  };

  if (loading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading payouts...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Payout Timeline
          </CardTitle>
          <CardDescription>
            {payouts.length} payout request{payouts.length !== 1 ? 's' : ''} for this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No payout requests for this client.</p>
          ) : (
            <div className="space-y-3">
              {payouts.map(p => {
                const isExpanded = expanded === p.id;
                const wf = PAYOUT_WORKFLOW[p.payout_type] || PAYOUT_WORKFLOW.ACH;
                return (
                  <Collapsible key={p.id} open={isExpanded} onOpenChange={() => handleExpand(p.id)}>
                    <div className={cn('border rounded-lg overflow-hidden',
                      p.workflow_stage === 'failed' && 'border-destructive/50',
                      p.reversed_at && 'border-orange-500/50')}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline">{p.payout_type}</Badge>
                                <span className="font-semibold text-sm">{formatCurrency(Number(p.amount))}</span>
                                {p.linked_trade_id && <Badge variant="secondary" className="text-xs">Trade linked</Badge>}
                                {p.reversed_at && <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">Reversed</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(p.requested_date), 'dd MMM yyyy')}
                                {p.estimated_completion && ` • Est. completion: ${format(new Date(p.estimated_completion), 'dd MMM yyyy')}`}
                              </p>
                            </div>
                          </div>
                          <Badge variant={statusBadgeVariant(p.status) as any}>
                            {p.reversed_at ? 'Reversed' : p.status}
                          </Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-4 border-t bg-muted/20 pt-4">
                          {/* Workflow Tracker */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Workflow Progress</p>
                            <PayoutWorkflowTracker payoutType={p.payout_type} currentStage={p.reversed_at ? 'reversed' : p.workflow_stage} />
                          </div>

                          {/* Settlement Lifecycle */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Settlement Lifecycle</p>
                            <PayoutSettlementTracker
                              status={p.reversed_at ? 'Reversed' : p.status}
                              settlementCleared={p.workflow_stage === 'completed' || p.workflow_stage === 'settled'}
                              isFailed={p.workflow_stage === 'failed'}
                            />
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div><p className="text-muted-foreground text-xs">Type</p><p className="font-medium">{p.payout_type} — {wf.est}</p></div>
                            <div><p className="text-muted-foreground text-xs">Settlement Date</p><p className="font-medium">{p.settlement_date ? format(new Date(p.settlement_date), 'dd MMM yyyy') : '—'}</p></div>
                            <div><p className="text-muted-foreground text-xs">Est. Completion</p><p className="font-medium">{p.estimated_completion ? format(new Date(p.estimated_completion), 'dd MMM yyyy') : '—'}</p></div>
                            <div><p className="text-muted-foreground text-xs">Trade Ref</p><p className="font-mono text-xs">{p.linked_trade_id ? p.linked_trade_id.slice(0, 12) + '...' : '—'}</p></div>
                          </div>

                          {p.reversed_at && (
                            <div className="rounded-lg border border-orange-500/50 bg-orange-500/5 p-3 text-sm">
                              <p className="font-medium text-orange-600 dark:text-orange-400">Reversed on {format(new Date(p.reversed_at), 'dd MMM yyyy, HH:mm')}</p>
                              {p.reversal_reason && <p className="text-muted-foreground mt-1">{p.reversal_reason}</p>}
                            </div>
                          )}

                          {p.notes && <div className="text-sm"><p className="text-muted-foreground text-xs">Notes</p><p>{p.notes}</p></div>}

                          {/* Timeline */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Status Timeline</p>
                            <PayoutTimeline history={history[p.id] || []} />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
