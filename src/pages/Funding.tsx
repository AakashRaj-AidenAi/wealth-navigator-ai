import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import {
  Wallet, Plus, RefreshCw, Building2, ArrowUpRight, Clock, CheckCircle2,
  XCircle, AlertCircle, History, IndianRupee, Trash2, ChevronDown, ChevronRight,
  AlertTriangle, ArrowRight, Zap, FileText, Eye, Bell, Brain, TrendingDown,
  TrendingUp, Shield, Activity, Sparkles, BarChart3, Target, ArrowDownRight,
  ClipboardList, BookOpen, ThumbsUp, ThumbsDown, Send,
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  notifyFundingInitiated,
  notifyFundingCompleted,
  notifyFundingFailed,
  checkFundingHealthAlerts,
} from '@/hooks/useFundingNotifications';

// ─── Workflow Definitions ───
const WORKFLOW_STAGES: Record<string, { stages: string[]; labels: Record<string, string>; settlement: string }> = {
  ACH: {
    stages: ['initiated', 'bank_verification', 'processing', 'completed', 'failed'],
    labels: { initiated: 'Initiated', bank_verification: 'Bank Verification', processing: 'Processing (T+1/T+2)', completed: 'Completed', failed: 'Failed' },
    settlement: 'T+1 to T+2 business days',
  },
  Wire: {
    stages: ['initiated', 'manual_confirmation', 'processing', 'completed', 'failed'],
    labels: { initiated: 'Initiated', manual_confirmation: 'Manual Confirmation', processing: 'Processing', completed: 'Completed', failed: 'Failed' },
    settlement: 'Same day / T+1',
  },
  TOA: {
    stages: ['initiated', 'transfer_requested', 'broker_review', 'in_transit', 'completed', 'failed'],
    labels: { initiated: 'Initiated', transfer_requested: 'Transfer Requested', broker_review: 'Broker Review', in_transit: 'In Transit', completed: 'Completed', failed: 'Failed' },
    settlement: '3–10 business days',
  },
};

const getNextStages = (fundingType: string, currentStage: string): string[] => {
  const wf = WORKFLOW_STAGES[fundingType] || WORKFLOW_STAGES.ACH;
  const idx = wf.stages.indexOf(currentStage);
  if (idx === -1 || currentStage === 'completed' || currentStage === 'failed') return [];
  const next: string[] = [];
  if (idx + 1 < wf.stages.length) {
    const nextStage = wf.stages[idx + 1];
    if (nextStage !== 'failed') next.push(nextStage);
  }
  next.push('failed');
  return next;
};

// ─── Types ───
interface FundingAccount {
  id: string; client_id: string; bank_name: string; account_number: string;
  account_type: string; verification_status: string; default_account: boolean; created_at: string;
  clients?: { client_name: string };
}
interface FundingRequest {
  id: string; client_id: string; funding_account_id: string | null; funding_type: string;
  amount: number; status: string; workflow_stage: string; stage_updated_at: string;
  settlement_date: string | null; trade_reference: string | null; notes: string | null;
  initiated_by: string; created_at: string;
  clients?: { client_name: string };
  funding_accounts?: { bank_name: string; account_number: string } | null;
}
interface StatusHistoryEntry {
  id: string; funding_request_id: string; from_status: string | null; to_status: string;
  changed_by: string; note: string | null; created_at: string;
}
interface FundingAlert {
  id: string; funding_request_id: string; alert_type: string; message: string;
  is_resolved: boolean; created_at: string;
}
interface CashBalance {
  id: string; client_id: string; available_cash: number; pending_cash: number;
  last_updated: string; clients?: { client_name: string };
}
interface ClientOption { id: string; client_name: string; }
interface PayoutRequest {
  id: string; client_id: string; advisor_id: string; payout_type: string;
  amount: number; status: string; linked_trade_id: string | null;
  requested_date: string; approved_by: string | null; settlement_date: string | null;
  notes: string | null; created_at: string;
  clients?: { client_name: string };
}
interface PayoutTransaction {
  id: string; payout_id: string; external_reference: string | null;
  transfer_date: string | null; confirmation_status: string; created_at: string;
}
interface WithdrawalLimit {
  id: string; client_id: string; advisor_id: string; daily_limit: number;
  monthly_limit: number; created_at: string;
  clients?: { client_name: string };
}

// ─── Status Visuals ───
const stageIconMap: Record<string, React.ElementType> = {
  initiated: Zap, bank_verification: Building2, manual_confirmation: FileText,
  processing: Clock, transfer_requested: ArrowUpRight, broker_review: Eye,
  in_transit: ArrowRight, completed: CheckCircle2, failed: XCircle,
};

const stageColorMap: Record<string, string> = {
  initiated: 'border-blue-500 bg-blue-500/10 text-blue-500',
  bank_verification: 'border-amber-500 bg-amber-500/10 text-amber-500',
  manual_confirmation: 'border-amber-500 bg-amber-500/10 text-amber-500',
  processing: 'border-indigo-500 bg-indigo-500/10 text-indigo-500',
  transfer_requested: 'border-violet-500 bg-violet-500/10 text-violet-500',
  broker_review: 'border-orange-500 bg-orange-500/10 text-orange-500',
  in_transit: 'border-cyan-500 bg-cyan-500/10 text-cyan-500',
  completed: 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
  failed: 'border-destructive bg-destructive/10 text-destructive',
};

const StageBadge = ({ stage, fundingType }: { stage: string; fundingType: string }) => {
  const Icon = stageIconMap[stage] || Clock;
  const color = stageColorMap[stage] || 'border-muted bg-muted/50 text-muted-foreground';
  const wf = WORKFLOW_STAGES[fundingType] || WORKFLOW_STAGES.ACH;
  return (
    <Badge variant="outline" className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {wf.labels[stage] || stage}
    </Badge>
  );
};

// ─── Visual Status Tracker ───
const WorkflowTracker = ({ fundingType, currentStage }: { fundingType: string; currentStage: string }) => {
  const wf = WORKFLOW_STAGES[fundingType] || WORKFLOW_STAGES.ACH;
  const activeStages = wf.stages.filter(s => s !== 'failed');
  const currentIdx = activeStages.indexOf(currentStage);
  const isFailed = currentStage === 'failed';

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto py-2">
      {activeStages.map((stage, idx) => {
        const Icon = stageIconMap[stage] || Clock;
        const isPast = !isFailed && currentIdx > idx;
        const isCurrent = !isFailed && currentIdx === idx;
        const isFuture = !isFailed && currentIdx < idx;

        return (
          <div key={stage} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all',
                isPast && 'border-emerald-500 bg-emerald-500 text-white',
                isCurrent && 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/30',
                isFuture && 'border-muted-foreground/30 bg-muted text-muted-foreground',
                isFailed && idx === 0 && 'border-destructive bg-destructive/20 text-destructive',
              )}>
                {isPast ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn(
                'text-[10px] text-center max-w-[70px] leading-tight',
                isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}>
                {wf.labels[stage]}
              </span>
            </div>
            {idx < activeStages.length - 1 && (
              <div className={cn(
                'h-0.5 w-6 mx-1 mt-[-16px]',
                isPast ? 'bg-emerald-500' : 'bg-muted-foreground/20',
              )} />
            )}
          </div>
        );
      })}
      {isFailed && (
        <div className="flex items-center ml-2 flex-shrink-0">
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full flex items-center justify-center border-2 border-destructive bg-destructive text-white">
              <XCircle className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-semibold text-destructive">Failed</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Timeline Component ───
const StatusTimeline = ({ history }: { history: StatusHistoryEntry[] }) => {
  if (history.length === 0) return <p className="text-sm text-muted-foreground py-2">No status history yet.</p>;
  return (
    <div className="space-y-0 pl-4 border-l-2 border-muted ml-3">
      {history.map((h, i) => {
        const Icon = stageIconMap[h.to_status] || Clock;
        const color = stageColorMap[h.to_status] || '';
        return (
          <div key={h.id} className="relative pb-4 last:pb-0">
            <div className={cn('absolute -left-[21px] top-0 h-6 w-6 rounded-full flex items-center justify-center border-2 bg-background', color || 'border-muted')}>
              <Icon className="h-3 w-3" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium">
                {h.from_status ? <><span className="text-muted-foreground">{h.from_status}</span> → </> : null}
                <span>{h.to_status}</span>
              </p>
              {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
              <p className="text-xs text-muted-foreground">{format(new Date(h.created_at), 'dd MMM yyyy, HH:mm')}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ───
const Funding = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [accounts, setAccounts] = useState<FundingAccount[]>([]);
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [balances, setBalances] = useState<CashBalance[]>([]);
  const [alerts, setAlerts] = useState<FundingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [requestHistory, setRequestHistory] = useState<Record<string, StatusHistoryEntry[]>>({});
  const [orders, setOrders] = useState<{ id: string; symbol: string; order_type: string; total_amount: number }[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [payoutTransactions, setPayoutTransactions] = useState<PayoutTransaction[]>([]);
  const [withdrawalLimits, setWithdrawalLimits] = useState<WithdrawalLimit[]>([]);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ client_id: '', payout_type: 'ACH', amount: '', linked_trade_id: '', settlement_date: '', notes: '' });
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');

  // Form states
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [accountForm, setAccountForm] = useState({ client_id: '', bank_name: '', account_number: '', account_type: 'savings', default_account: false });
  const [requestForm, setRequestForm] = useState({ client_id: '', funding_account_id: '', funding_type: 'ACH', amount: '', trade_reference: '', settlement_date: '', notes: '' });
  const [balanceForm, setBalanceForm] = useState({ client_id: '', available_cash: '', pending_cash: '' });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [clientsRes, accountsRes, requestsRes, balancesRes, alertsRes, ordersRes, payoutsRes, payoutTxRes, limitsRes] = await Promise.all([
      supabase.from('clients').select('id, client_name').eq('advisor_id', user.id).order('client_name'),
      supabase.from('funding_accounts').select('*, clients(client_name)').eq('advisor_id', user.id).order('created_at', { ascending: false }),
      supabase.from('funding_requests').select('*, clients(client_name), funding_accounts(bank_name, account_number)').eq('initiated_by', user.id).order('created_at', { ascending: false }),
      supabase.from('cash_balances').select('*, clients(client_name)').eq('advisor_id', user.id).order('last_updated', { ascending: false }),
      supabase.from('funding_alerts').select('*').eq('advisor_id', user.id).eq('is_resolved', false).order('created_at', { ascending: false }),
      supabase.from('orders').select('id, symbol, order_type, total_amount').limit(50).order('created_at', { ascending: false }),
      supabase.from('payout_requests').select('*, clients(client_name)').eq('advisor_id', user.id).order('created_at', { ascending: false }),
      supabase.from('payout_transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('withdrawal_limits').select('*, clients(client_name)').eq('advisor_id', user.id),
    ]);
    setClients(clientsRes.data || []);
    setAccounts((accountsRes.data as any) || []);
    setRequests((requestsRes.data as any) || []);
    setBalances((balancesRes.data as any) || []);
    setAlerts((alertsRes.data as any) || []);
    setOrders((ordersRes.data as any) || []);
    setPayoutRequests((payoutsRes.data as any) || []);
    setPayoutTransactions((payoutTxRes.data as any) || []);
    setWithdrawalLimits((limitsRes.data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchAIInsights = useCallback(async () => {
    if (!user) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('funding-ai', {});
      if (error) throw error;
      setAiInsights(data);
    } catch (e: any) {
      console.error('AI insights error:', e);
      toast({ title: 'AI Analysis', description: 'Could not load AI insights', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  }, [user]);

  // Check for settlement alerts, stale requests, and mismatch on requests
  useEffect(() => {
    if (!user || requests.length === 0) return;
    // Run health checks (stale > 3 days, settlement mismatch)
    checkFundingHealthAlerts(requests as any, user.id, 3);
    // Also check approaching settlements
    requests.forEach(async (r) => {
      if (r.settlement_date && r.workflow_stage !== 'completed' && r.workflow_stage !== 'failed') {
        const daysLeft = differenceInDays(new Date(r.settlement_date), new Date());
        if (daysLeft <= 1 && daysLeft >= 0) {
          const existing = alerts.find(a => a.funding_request_id === r.id && a.alert_type === 'settlement_approaching');
          if (!existing) {
            await supabase.from('funding_alerts').insert({
              funding_request_id: r.id,
              advisor_id: user.id,
              alert_type: 'settlement_approaching',
              message: `Funding for ${(r as any).clients?.client_name || 'client'} (${formatCurrency(Number(r.amount))}) not completed — settlement ${daysLeft === 0 ? 'is today' : 'is tomorrow'}!`,
            });
            fetchAll();
          }
        }
      }
    });
  }, [requests]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = async (requestId: string) => {
    const { data } = await supabase.from('funding_status_history').select('*').eq('funding_request_id', requestId).order('created_at', { ascending: true });
    setRequestHistory(prev => ({ ...prev, [requestId]: (data as any) || [] }));
  };

  const handleExpandRequest = (id: string) => {
    if (expandedRequest === id) { setExpandedRequest(null); return; }
    setExpandedRequest(id);
    if (!requestHistory[id]) fetchHistory(id);
  };

  const handleAddAccount = async () => {
    if (!user || !accountForm.client_id || !accountForm.bank_name || !accountForm.account_number) return;
    const { error } = await supabase.from('funding_accounts').insert({
      client_id: accountForm.client_id, bank_name: accountForm.bank_name,
      account_number: accountForm.account_number, account_type: accountForm.account_type,
      default_account: accountForm.default_account, advisor_id: user.id,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Account added' });
    setShowAccountDialog(false);
    setAccountForm({ client_id: '', bank_name: '', account_number: '', account_type: 'savings', default_account: false });
    fetchAll();
  };

  const handleInitiateRequest = async () => {
    if (!user || !requestForm.client_id || !requestForm.amount) return;
    const { data, error } = await supabase.from('funding_requests').insert({
      client_id: requestForm.client_id,
      funding_account_id: requestForm.funding_account_id || null,
      funding_type: requestForm.funding_type,
      amount: parseFloat(requestForm.amount),
      trade_reference: requestForm.trade_reference || null,
      settlement_date: requestForm.settlement_date || null,
      notes: requestForm.notes || null,
      initiated_by: user.id,
      workflow_stage: 'initiated',
    }).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    // Log initial history
    if (data) {
      await supabase.from('funding_status_history').insert({
        funding_request_id: data.id, from_status: null, to_status: 'initiated',
        changed_by: user.id, note: `${requestForm.funding_type} funding request created for ${formatCurrency(parseFloat(requestForm.amount))}`,
      });
      // Notify: funding initiated
      const clientName = clients.find(c => c.id === requestForm.client_id)?.client_name || 'Client';
      await notifyFundingInitiated({
        requestId: data.id, clientId: requestForm.client_id, clientName,
        userId: user.id, fundingType: requestForm.funding_type, amount: parseFloat(requestForm.amount),
      });
    }
    toast({ title: 'Funding request initiated' });
    setRequestForm({ client_id: '', funding_account_id: '', funding_type: 'ACH', amount: '', trade_reference: '', settlement_date: '', notes: '' });
    setActiveTab('history');
    fetchAll();
  };

  const handleAdvanceStage = async (request: FundingRequest, nextStage: string) => {
    if (!user) return;
    const prevStage = request.workflow_stage;
    const wf = WORKFLOW_STAGES[request.funding_type] || WORKFLOW_STAGES.ACH;
    const { error } = await supabase.from('funding_requests').update({
      workflow_stage: nextStage,
      status: nextStage === 'completed' ? 'Completed' : nextStage === 'failed' ? 'Failed' : 'Pending',
      stage_updated_at: new Date().toISOString(),
    }).eq('id', request.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    // Log history
    await supabase.from('funding_status_history').insert({
      funding_request_id: request.id, from_status: prevStage, to_status: nextStage,
      changed_by: user.id, note: `Stage advanced: ${wf.labels[prevStage] || prevStage} → ${wf.labels[nextStage] || nextStage}`,
    });
    // Auto-update cash balance on completion + notify
    const clientName = (request as any).clients?.client_name || 'Client';
    if (nextStage === 'completed') {
      await updateCashBalanceOnCompletion(request);
      await supabase.from('funding_alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('funding_request_id', request.id);
      await notifyFundingCompleted({
        requestId: request.id, clientId: request.client_id, clientName,
        userId: user.id, fundingType: request.funding_type, amount: Number(request.amount),
      });
    }
    if (nextStage === 'failed') {
      await notifyFundingFailed({
        requestId: request.id, clientId: request.client_id, clientName,
        userId: user.id, fundingType: request.funding_type, amount: Number(request.amount),
      });
    }
    toast({ title: `Advanced to ${wf.labels[nextStage] || nextStage}` });
    fetchAll();
    if (expandedRequest === request.id) fetchHistory(request.id);
  };

  const updateCashBalanceOnCompletion = async (request: FundingRequest) => {
    if (!user) return;
    const amount = Number(request.amount);
    const existing = balances.find(b => b.client_id === request.client_id);
    if (existing) {
      await supabase.from('cash_balances').update({
        available_cash: Number(existing.available_cash) + amount,
        last_updated: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('cash_balances').insert({
        client_id: request.client_id, available_cash: amount,
        pending_cash: 0, advisor_id: user.id,
      });
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const { error } = await supabase.from('funding_accounts').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Account removed' });
    fetchAll();
  };

  const handleResolveAlert = async (id: string) => {
    await supabase.from('funding_alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
    fetchAll();
  };

  const handleUpsertBalance = async () => {
    if (!user || !balanceForm.client_id) return;
    const existing = balances.find(b => b.client_id === balanceForm.client_id);
    if (existing) {
      await supabase.from('cash_balances').update({
        available_cash: parseFloat(balanceForm.available_cash) || 0,
        pending_cash: parseFloat(balanceForm.pending_cash) || 0,
        last_updated: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('cash_balances').insert({
        client_id: balanceForm.client_id,
        available_cash: parseFloat(balanceForm.available_cash) || 0,
        pending_cash: parseFloat(balanceForm.pending_cash) || 0,
        advisor_id: user.id,
      });
    }
    toast({ title: 'Cash balance saved' });
    setShowBalanceDialog(false);
    setBalanceForm({ client_id: '', available_cash: '', pending_cash: '' });
    fetchAll();
  };

  // ─── Payout Handlers ───
  const handleRequestPayout = async () => {
    if (!user || !payoutForm.client_id || !payoutForm.amount) return;
    const { error } = await supabase.from('payout_requests').insert({
      client_id: payoutForm.client_id,
      advisor_id: user.id,
      payout_type: payoutForm.payout_type,
      amount: parseFloat(payoutForm.amount),
      linked_trade_id: payoutForm.linked_trade_id || null,
      settlement_date: payoutForm.settlement_date || null,
      notes: payoutForm.notes || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payout request created' });
    setShowPayoutDialog(false);
    setPayoutForm({ client_id: '', payout_type: 'ACH', amount: '', linked_trade_id: '', settlement_date: '', notes: '' });
    fetchAll();
  };

  const handleApprovePayout = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('payout_requests').update({ status: 'Approved', approved_by: user.id }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payout approved' });
    fetchAll();
  };

  const handleRejectPayout = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('payout_requests').update({ status: 'Failed' }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payout rejected' });
    fetchAll();
  };

  const handleAdvancePayoutStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('payout_requests').update({ status: newStatus }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    if (newStatus === 'Completed') {
      // Deduct from cash balance
      const payout = payoutRequests.find(p => p.id === id);
      if (payout) {
        const existing = balances.find(b => b.client_id === payout.client_id);
        if (existing) {
          await supabase.from('cash_balances').update({
            available_cash: Math.max(0, Number(existing.available_cash) - Number(payout.amount)),
            last_updated: new Date().toISOString(),
          }).eq('id', existing.id);
        }
      }
    }
    toast({ title: `Payout status updated to ${newStatus}` });
    fetchAll();
  };

  const handleDeletePayout = async (id: string) => {
    const { error } = await supabase.from('payout_requests').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payout deleted' });
    fetchAll();
  };

  const maskAccount = (num: string) => num.length <= 4 ? num : '••••' + num.slice(-4);

  const totalAvailableCash = balances.reduce((s, b) => s + Number(b.available_cash), 0);
  const totalPendingCash = balances.reduce((s, b) => s + Number(b.pending_cash), 0);
  const pendingRequests = requests.filter(r => r.workflow_stage !== 'completed' && r.workflow_stage !== 'failed').length;
  const pendingPayouts = payoutRequests.filter(p => p.status === 'Requested').length;
  const clientAccounts = accounts.filter(a => a.client_id === requestForm.client_id);
  const filteredPayoutHistory = payoutStatusFilter === 'all' ? payoutRequests : payoutRequests.filter(p => p.status === payoutStatusFilter);

  // Default settlement date based on funding type
  const getDefaultSettlement = (type: string) => {
    const today = new Date();
    if (type === 'Wire') return format(addDays(today, 1), 'yyyy-MM-dd');
    if (type === 'ACH') return format(addDays(today, 2), 'yyyy-MM-dd');
    return format(addDays(today, 7), 'yyyy-MM-dd');
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Funding & Cash Management
            </h1>
            <p className="text-muted-foreground">Workflow-driven funding with status tracking, alerts, and auto cash updates.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>

        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="font-semibold text-sm text-destructive">{alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-background/80 rounded-md px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5 text-destructive" />
                      <span>{a.message}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleResolveAlert(a.id)} className="text-xs h-7">Dismiss</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Available Cash</p><p className="text-2xl font-bold">{formatCurrency(totalAvailableCash)}</p></div><div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-emerald-500" /></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending Cash</p><p className="text-2xl font-bold">{formatCurrency(totalPendingCash)}</p></div><div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-500" /></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">In-Progress Requests</p><p className="text-2xl font-bold">{pendingRequests}</p></div><div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center"><Zap className="h-5 w-5 text-blue-500" /></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Linked Accounts</p><p className="text-2xl font-bold">{accounts.length}</p></div><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div></div></CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="dashboard"><Wallet className="h-4 w-4 mr-1.5" /> Accounts</TabsTrigger>
            <TabsTrigger value="initiate"><ArrowUpRight className="h-4 w-4 mr-1.5" /> Initiate Funding</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" /> Workflow & History</TabsTrigger>
            <TabsTrigger value="ledger"><IndianRupee className="h-4 w-4 mr-1.5" /> Cash Ledger</TabsTrigger>
            <TabsTrigger value="request-payout"><ArrowDownRight className="h-4 w-4 mr-1.5" /> Request Payout</TabsTrigger>
            <TabsTrigger value="payout-approval"><ClipboardList className="h-4 w-4 mr-1.5" /> Approval Queue{pendingPayouts > 0 && <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{pendingPayouts}</Badge>}</TabsTrigger>
            <TabsTrigger value="payout-history"><BookOpen className="h-4 w-4 mr-1.5" /> Payout History</TabsTrigger>
            <TabsTrigger value="ai-intelligence" onClick={() => { if (!aiInsights && !aiLoading) fetchAIInsights(); }}><Brain className="h-4 w-4 mr-1.5" /> AI Intelligence</TabsTrigger>
          </TabsList>

          {/* ─── Accounts Tab ─── */}
          <TabsContent value="dashboard">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Linked Funding Accounts</CardTitle><CardDescription>Manage bank accounts linked to your clients</CardDescription></div>
                <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add Account</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Funding Account</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Client</Label><Select value={accountForm.client_id} onValueChange={v => setAccountForm(p => ({ ...p, client_id: v }))}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>Bank Name</Label><Input value={accountForm.bank_name} onChange={e => setAccountForm(p => ({ ...p, bank_name: e.target.value }))} placeholder="e.g. HDFC Bank" /></div>
                      <div><Label>Account Number</Label><Input value={accountForm.account_number} onChange={e => setAccountForm(p => ({ ...p, account_number: e.target.value }))} placeholder="Account number" /></div>
                      <div><Label>Account Type</Label><Select value={accountForm.account_type} onValueChange={v => setAccountForm(p => ({ ...p, account_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="savings">Savings</SelectItem><SelectItem value="current">Current</SelectItem><SelectItem value="demat">Demat</SelectItem></SelectContent></Select></div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleAddAccount}>Add Account</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No funding accounts linked yet.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Bank</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Default</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {accounts.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{(a as any).clients?.client_name || '—'}</TableCell>
                          <TableCell>{a.bank_name}</TableCell>
                          <TableCell className="font-mono text-sm">{maskAccount(a.account_number)}</TableCell>
                          <TableCell className="capitalize">{a.account_type}</TableCell>
                          <TableCell><StageBadge stage={a.verification_status === 'verified' ? 'completed' : a.verification_status === 'rejected' ? 'failed' : 'initiated'} fundingType="ACH" /></TableCell>
                          <TableCell>{a.default_account ? <Badge variant="secondary">Default</Badge> : '—'}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => handleDeleteAccount(a.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Initiate Funding Tab ─── */}
          <TabsContent value="initiate">
            <Card>
              <CardHeader><CardTitle>Initiate Funding Request</CardTitle><CardDescription>Create a workflow-driven funding transfer</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                  <div><Label>Client</Label><Select value={requestForm.client_id} onValueChange={v => setRequestForm(p => ({ ...p, client_id: v, funding_account_id: '' }))}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Funding Account</Label><Select value={requestForm.funding_account_id} onValueChange={v => setRequestForm(p => ({ ...p, funding_account_id: v }))}><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent>{clientAccounts.length === 0 ? <SelectItem value="none" disabled>No accounts linked</SelectItem> : clientAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.bank_name} — {maskAccount(a.account_number)}</SelectItem>)}</SelectContent></Select></div>
                  <div>
                    <Label>Funding Type</Label>
                    <Select value={requestForm.funding_type} onValueChange={v => setRequestForm(p => ({ ...p, funding_type: v, settlement_date: getDefaultSettlement(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACH">ACH — {WORKFLOW_STAGES.ACH.settlement}</SelectItem>
                        <SelectItem value="Wire">Wire — {WORKFLOW_STAGES.Wire.settlement}</SelectItem>
                        <SelectItem value="TOA">TOA — {WORKFLOW_STAGES.TOA.settlement}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount (₹)</Label><Input type="number" value={requestForm.amount} onChange={e => setRequestForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></div>
                  <div><Label>Settlement Date</Label><Input type="date" value={requestForm.settlement_date} onChange={e => setRequestForm(p => ({ ...p, settlement_date: e.target.value }))} /></div>
                  <div><Label>Link to Trade Order (Optional)</Label>
                    <Select value={requestForm.trade_reference} onValueChange={v => setRequestForm(p => ({ ...p, trade_reference: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select order or type ref" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {orders.map(o => <SelectItem key={o.id} value={o.id}>{o.symbol} — {o.order_type} — {formatCurrency(Number(o.total_amount) || 0)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2"><Label>Notes</Label><Textarea value={requestForm.notes} onChange={e => setRequestForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." rows={2} /></div>

                  {/* Preview workflow */}
                  {requestForm.funding_type && (
                    <div className="md:col-span-2">
                      <Label className="mb-2 block">Workflow Preview — {requestForm.funding_type}</Label>
                      <WorkflowTracker fundingType={requestForm.funding_type} currentStage="initiated" />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <Button onClick={handleInitiateRequest} disabled={!requestForm.client_id || !requestForm.amount}>
                      <ArrowUpRight className="h-4 w-4 mr-1.5" /> Initiate {requestForm.funding_type} Request
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Workflow & History Tab ─── */}
          <TabsContent value="history">
            <Card>
              <CardHeader><CardTitle>Funding Workflow & History</CardTitle><CardDescription>Track each request through its workflow stages with timeline view</CardDescription></CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No funding requests yet.</p>
                ) : (
                  <div className="space-y-3">
                    {requests.map(r => {
                      const isExpanded = expandedRequest === r.id;
                      const nextStages = getNextStages(r.funding_type, r.workflow_stage);
                      const wf = WORKFLOW_STAGES[r.funding_type] || WORKFLOW_STAGES.ACH;
                      const settlementWarning = r.settlement_date && r.workflow_stage !== 'completed' && r.workflow_stage !== 'failed'
                        ? differenceInDays(new Date(r.settlement_date), new Date()) : null;

                      return (
                        <Collapsible key={r.id} open={isExpanded} onOpenChange={() => handleExpandRequest(r.id)}>
                          <div className={cn('border rounded-lg overflow-hidden', settlementWarning !== null && settlementWarning <= 1 && 'border-destructive/50')}>
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-sm">{(r as any).clients?.client_name || '—'}</span>
                                      <Badge variant="outline" className="text-xs">{r.funding_type}</Badge>
                                      <span className="font-semibold text-sm">{formatCurrency(Number(r.amount))}</span>
                                      {r.trade_reference && <Badge variant="secondary" className="text-xs">Linked to Order</Badge>}
                                      {settlementWarning !== null && settlementWarning <= 1 && (
                                        <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Settlement {settlementWarning <= 0 ? 'overdue' : 'tomorrow'}</Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}{r.settlement_date ? ` • Settlement: ${format(new Date(r.settlement_date), 'dd MMM yyyy')}` : ''}</p>
                                  </div>
                                </div>
                                <StageBadge stage={r.workflow_stage} fundingType={r.funding_type} />
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="px-4 pb-4 space-y-4 border-t bg-muted/20 pt-4">
                                {/* Workflow Tracker */}
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Workflow Progress</p>
                                  <WorkflowTracker fundingType={r.funding_type} currentStage={r.workflow_stage} />
                                </div>

                                {/* Actions */}
                                {nextStages.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Advance Stage</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {nextStages.map(ns => (
                                        <Button key={ns} size="sm" variant={ns === 'failed' ? 'destructive' : 'default'} onClick={() => handleAdvanceStage(r, ns)}>
                                          {ns === 'failed' ? <XCircle className="h-3.5 w-3.5 mr-1" /> : <ArrowRight className="h-3.5 w-3.5 mr-1" />}
                                          {wf.labels[ns] || ns}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div><p className="text-muted-foreground text-xs">Account</p><p className="font-medium">{(r as any).funding_accounts ? `${(r as any).funding_accounts.bank_name} ${maskAccount((r as any).funding_accounts.account_number)}` : '—'}</p></div>
                                  <div><p className="text-muted-foreground text-xs">Settlement</p><p className="font-medium">{r.settlement_date ? format(new Date(r.settlement_date), 'dd MMM yyyy') : '—'}</p></div>
                                  <div><p className="text-muted-foreground text-xs">Trade Ref</p><p className="font-mono">{r.trade_reference || '—'}</p></div>
                                  <div><p className="text-muted-foreground text-xs">Expected Timeline</p><p className="font-medium">{wf.settlement}</p></div>
                                </div>

                                {r.notes && <div className="text-sm"><p className="text-muted-foreground text-xs">Notes</p><p>{r.notes}</p></div>}

                                {/* Timeline */}
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Status Timeline</p>
                                  <StatusTimeline history={requestHistory[r.id] || []} />
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
          </TabsContent>

          {/* ─── Cash Ledger Tab ─── */}
          <TabsContent value="ledger">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Cash Ledger</CardTitle><CardDescription>Auto-updated upon funding completion</CardDescription></div>
                <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add / Update Balance</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Set Cash Balance</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Client</Label><Select value={balanceForm.client_id} onValueChange={v => { const existing = balances.find(b => b.client_id === v); setBalanceForm({ client_id: v, available_cash: existing ? String(existing.available_cash) : '', pending_cash: existing ? String(existing.pending_cash) : '' }); }}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>Available Cash (₹)</Label><Input type="number" value={balanceForm.available_cash} onChange={e => setBalanceForm(p => ({ ...p, available_cash: e.target.value }))} placeholder="0.00" /></div>
                      <div><Label>Pending Cash (₹)</Label><Input type="number" value={balanceForm.pending_cash} onChange={e => setBalanceForm(p => ({ ...p, pending_cash: e.target.value }))} placeholder="0.00" /></div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleUpsertBalance}>Save Balance</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {balances.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No cash balances recorded yet. Balances auto-update when funding completes.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Available Cash</TableHead><TableHead>Pending Cash</TableHead><TableHead>Total</TableHead><TableHead>Last Updated</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {balances.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{(b as any).clients?.client_name || '—'}</TableCell>
                          <TableCell className="font-semibold text-emerald-600">{formatCurrency(Number(b.available_cash))}</TableCell>
                          <TableCell className="text-amber-600">{formatCurrency(Number(b.pending_cash))}</TableCell>
                          <TableCell className="font-bold">{formatCurrency(Number(b.available_cash) + Number(b.pending_cash))}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(b.last_updated), 'dd MMM yyyy, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Request Payout Tab ─── */}
          <TabsContent value="request-payout">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Request Payout</CardTitle><CardDescription>Withdraw funds after selling securities</CardDescription></div>
                <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Payout Request</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Request Payout</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Client</Label><Select value={payoutForm.client_id} onValueChange={v => setPayoutForm(p => ({ ...p, client_id: v }))}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}</SelectContent></Select></div>
                      <div>
                        <Label>Payout Type</Label>
                        <Select value={payoutForm.payout_type} onValueChange={v => setPayoutForm(p => ({ ...p, payout_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACH">ACH</SelectItem>
                            <SelectItem value="Wire">Wire</SelectItem>
                            <SelectItem value="TOA">TOA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Amount (₹)</Label><Input type="number" value={payoutForm.amount} onChange={e => setPayoutForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></div>
                      {payoutForm.client_id && (() => {
                        const limit = withdrawalLimits.find(l => l.client_id === payoutForm.client_id);
                        const bal = balances.find(b => b.client_id === payoutForm.client_id);
                        return (
                          <div className="rounded-lg border p-3 space-y-1 text-sm">
                            <p className="text-muted-foreground text-xs font-medium uppercase">Limits & Balance</p>
                            <div className="flex justify-between"><span className="text-muted-foreground">Available Cash:</span><span className="font-medium">{formatCurrency(Number(bal?.available_cash || 0))}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Daily Limit:</span><span className="font-medium">{formatCurrency(Number(limit?.daily_limit || 500000))}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Monthly Limit:</span><span className="font-medium">{formatCurrency(Number(limit?.monthly_limit || 5000000))}</span></div>
                          </div>
                        );
                      })()}
                      <div><Label>Linked Trade ID (Optional)</Label><Input value={payoutForm.linked_trade_id} onChange={e => setPayoutForm(p => ({ ...p, linked_trade_id: e.target.value }))} placeholder="Trade reference" /></div>
                      <div><Label>Settlement Date</Label><Input type="date" value={payoutForm.settlement_date} onChange={e => setPayoutForm(p => ({ ...p, settlement_date: e.target.value }))} /></div>
                      <div><Label>Notes</Label><Textarea value={payoutForm.notes} onChange={e => setPayoutForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional notes..." /></div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleRequestPayout} disabled={!payoutForm.client_id || !payoutForm.amount}><Send className="h-4 w-4 mr-1.5" /> Submit Request</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {payoutRequests.filter(p => p.status === 'Requested').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending payout requests. Click "New Payout Request" to create one.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Requested</TableHead><TableHead>Trade Ref</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {payoutRequests.filter(p => p.status === 'Requested').map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{(p as any).clients?.client_name || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{p.payout_type}</Badge></TableCell>
                          <TableCell className="font-semibold">{formatCurrency(Number(p.amount))}</TableCell>
                          <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(p.requested_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="font-mono text-sm">{p.linked_trade_id || '—'}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => handleDeletePayout(p.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Payout Approval Queue Tab ─── */}
          <TabsContent value="payout-approval">
            <Card>
              <CardHeader><CardTitle>Payout Approval Queue</CardTitle><CardDescription>Review and approve or reject payout requests</CardDescription></CardHeader>
              <CardContent>
                {payoutRequests.filter(p => p.status === 'Requested' || p.status === 'Approved').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No payouts pending approval.</p>
                ) : (
                  <div className="space-y-3">
                    {payoutRequests.filter(p => p.status === 'Requested' || p.status === 'Approved').map(p => (
                      <div key={p.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{(p as any).clients?.client_name || '—'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{p.payout_type}</Badge>
                              <span className="font-semibold">{formatCurrency(Number(p.amount))}</span>
                              {p.linked_trade_id && <Badge variant="secondary" className="text-xs">Trade: {p.linked_trade_id.slice(0, 8)}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Requested {format(new Date(p.requested_date), 'dd MMM yyyy, HH:mm')}</p>
                            {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
                          </div>
                          <Badge variant={p.status === 'Requested' ? 'secondary' : 'default'}>{p.status}</Badge>
                        </div>
                        <div className="flex gap-2">
                          {p.status === 'Requested' && (
                            <>
                              <Button size="sm" onClick={() => handleApprovePayout(p.id)}><ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRejectPayout(p.id)}><ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                            </>
                          )}
                          {p.status === 'Approved' && (
                            <>
                              <Button size="sm" onClick={() => handleAdvancePayoutStatus(p.id, 'Processing')}><ArrowRight className="h-3.5 w-3.5 mr-1" /> Start Processing</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleAdvancePayoutStatus(p.id, 'Failed')}><XCircle className="h-3.5 w-3.5 mr-1" /> Fail</Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Payout History Tab ─── */}
          <TabsContent value="payout-history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Payout History</CardTitle><CardDescription>All payout requests and their statuses</CardDescription></div>
                <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Requested">Requested</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {filteredPayoutHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No payout records found.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Requested</TableHead><TableHead>Settlement</TableHead><TableHead>Trade Ref</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredPayoutHistory.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{(p as any).clients?.client_name || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{p.payout_type}</Badge></TableCell>
                          <TableCell className="font-semibold">{formatCurrency(Number(p.amount))}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === 'Completed' ? 'default' : p.status === 'Failed' ? 'destructive' : p.status === 'Processing' ? 'outline' : 'secondary'}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(p.requested_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.settlement_date ? format(new Date(p.settlement_date), 'dd MMM yyyy') : '—'}</TableCell>
                          <TableCell className="font-mono text-sm">{p.linked_trade_id || '—'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {p.status === 'Processing' && (
                                <Button size="sm" variant="ghost" onClick={() => handleAdvancePayoutStatus(p.id, 'Completed')}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                              )}
                              {(p.status === 'Requested' || p.status === 'Approved') && (
                                <Button size="sm" variant="ghost" onClick={() => handleDeletePayout(p.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── AI Intelligence Tab ─── */}
          <TabsContent value="ai-intelligence">
            <div className="space-y-6">
              {aiLoading ? (
                <Card><CardContent className="py-16 text-center"><RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" /><p className="text-muted-foreground">Running AI analysis on funding operations...</p></CardContent></Card>
              ) : !aiInsights ? (
                <Card><CardContent className="py-16 text-center"><Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground mb-4">Click to analyze your funding operations with AI</p><Button onClick={fetchAIInsights}><Sparkles className="h-4 w-4 mr-1.5" /> Run AI Analysis</Button></CardContent></Card>
              ) : (
                <>
                  {/* AI Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Card><CardContent className="pt-4 pb-3 text-center"><Activity className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-xl font-bold">{aiInsights.summary?.total_active_requests || 0}</p><p className="text-xs text-muted-foreground">Active Requests</p></CardContent></Card>
                    <Card className={cn(aiInsights.summary?.high_risk_count > 0 && 'border-destructive/50')}><CardContent className="pt-4 pb-3 text-center"><AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" /><p className="text-xl font-bold">{aiInsights.summary?.high_risk_count || 0}</p><p className="text-xs text-muted-foreground">High Risk</p></CardContent></Card>
                    <Card className={cn(aiInsights.summary?.shortfall_clients > 0 && 'border-amber-500/50')}><CardContent className="pt-4 pb-3 text-center"><TrendingDown className="h-5 w-5 mx-auto text-amber-500 mb-1" /><p className="text-xl font-bold">{aiInsights.summary?.shortfall_clients || 0}</p><p className="text-xs text-muted-foreground">Shortfall Clients</p></CardContent></Card>
                    <Card><CardContent className="pt-4 pb-3 text-center"><IndianRupee className="h-5 w-5 mx-auto text-emerald-500 mb-1" /><p className="text-xl font-bold">{formatCurrency(aiInsights.summary?.total_pending_amount || 0)}</p><p className="text-xs text-muted-foreground">Pending Amount</p></CardContent></Card>
                    <Card><CardContent className="pt-4 pb-3 text-center"><Target className="h-5 w-5 mx-auto text-blue-500 mb-1" /><p className="text-xl font-bold">{aiInsights.summary?.avg_completion_probability || 0}%</p><p className="text-xs text-muted-foreground">Avg Completion</p></CardContent></Card>
                    <Card><CardContent className="pt-4 pb-3 text-center"><Shield className="h-5 w-5 mx-auto text-violet-500 mb-1" /><p className="text-xl font-bold">{aiInsights.summary?.large_movements_flagged || 0}</p><p className="text-xs text-muted-foreground">Large Movements</p></CardContent></Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Funding Risk Alerts */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Funding Risk Alerts</CardTitle>
                          <Badge variant="outline">{aiInsights.risk_alerts?.length || 0}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {(!aiInsights.risk_alerts || aiInsights.risk_alerts.length === 0) ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No risk alerts — all clear ✅</p>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {aiInsights.risk_alerts.map((alert: any, i: number) => (
                              <div key={i} className={cn('border rounded-lg p-3', alert.severity === 'critical' ? 'border-destructive/50 bg-destructive/5' : alert.severity === 'high' ? 'border-amber-500/50 bg-amber-500/5' : 'border-muted')}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">{alert.severity}</Badge>
                                      <Badge variant="secondary" className="text-[10px]">{alert.type?.replace(/_/g, ' ')}</Badge>
                                    </div>
                                    <p className="font-medium text-sm mt-1">{alert.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                                    {alert.suggested_action && (
                                      <p className="text-xs mt-1.5 flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /><span className="font-medium">Action:</span> {alert.suggested_action}</p>
                                    )}
                                  </div>
                                  {alert.score != null && (
                                    <div className="text-right flex-shrink-0">
                                      <p className={cn('text-lg font-bold', alert.score > 70 ? 'text-destructive' : alert.score > 50 ? 'text-amber-500' : 'text-muted-foreground')}>{alert.score}%</p>
                                      <p className="text-[10px] text-muted-foreground">risk</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Settlement Risk Monitor */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Settlement Risk Monitor</CardTitle>
                          <Badge variant="outline">{aiInsights.settlement_risks?.length || 0}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {(!aiInsights.settlement_risks || aiInsights.settlement_risks.length === 0) ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No active settlement risks</p>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {aiInsights.settlement_risks.map((sr: any, i: number) => (
                              <div key={i} className={cn('border rounded-lg p-3', sr.risk_level === 'critical' ? 'border-destructive/50 bg-destructive/5' : sr.risk_level === 'high' ? 'border-amber-500/50 bg-amber-500/5' : 'border-muted')}>
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-medium text-sm">{sr.client_name}</p>
                                    <p className="text-xs text-muted-foreground">{sr.funding_type} • {formatCurrency(sr.amount)}</p>
                                  </div>
                                  <Badge variant={sr.risk_level === 'critical' ? 'destructive' : sr.risk_level === 'high' ? 'outline' : 'secondary'} className="text-[10px]">
                                    {sr.days_remaining < 0 ? `${Math.abs(sr.days_remaining)}d overdue` : sr.days_remaining === 0 ? 'Due today' : `${sr.days_remaining}d left`}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs"><span>Completion probability</span><span className="font-medium">{sr.completion_probability}%</span></div>
                                  <Progress value={sr.completion_probability} className="h-1.5" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> {sr.recommendation}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Cash Flow Forecast */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Cash Flow Forecast</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(!aiInsights.cash_flow_forecasts || aiInsights.cash_flow_forecasts.length === 0) ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No cash balance data to forecast</p>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {aiInsights.cash_flow_forecasts.map((cf: any, i: number) => (
                              <div key={i} className={cn('border rounded-lg p-3', cf.shortfall ? 'border-destructive/50 bg-destructive/5' : 'border-muted')}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-medium text-sm">{cf.client_name}</p>
                                  {cf.shortfall && <Badge variant="destructive" className="text-[10px]">Shortfall</Badge>}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                  <div><span className="text-muted-foreground">Available:</span> <span className="font-medium text-emerald-600">{formatCurrency(cf.current_available)}</span></div>
                                  <div><span className="text-muted-foreground">Pending:</span> <span className="font-medium text-amber-600">{formatCurrency(cf.current_pending)}</span></div>
                                  <div><span className="text-muted-foreground">Inflow:</span> <span className="font-medium">{formatCurrency(cf.projected_inflow)}</span></div>
                                  <div><span className="text-muted-foreground">Outflow:</span> <span className="font-medium">{formatCurrency(cf.projected_outflow)}</span></div>
                                </div>
                                <div className="flex items-center justify-between text-xs border-t pt-1.5 mt-1.5">
                                  <span className="text-muted-foreground">Projected Balance:</span>
                                  <span className={cn('font-bold', cf.projected_balance < 0 ? 'text-destructive' : 'text-emerald-600')}>{formatCurrency(cf.projected_balance)}</span>
                                </div>
                                {cf.days_until_shortfall != null && (
                                  <p className="text-xs text-amber-600 mt-1">⚠️ Cash may deplete in ~{cf.days_until_shortfall} days</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> {cf.recommendation}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Smart Funding Suggestions */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Smart Funding Suggestions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(!aiInsights.smart_suggestions || aiInsights.smart_suggestions.length === 0) ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No funding suggestions — all trades are funded ✅</p>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {aiInsights.smart_suggestions.map((sg: any, i: number) => (
                              <div key={i} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium text-sm">{sg.client_name}</p>
                                  <Badge variant={sg.urgency === 'Urgent' ? 'destructive' : sg.urgency === 'High' ? 'outline' : 'secondary'} className="text-[10px]">{sg.urgency}</Badge>
                                </div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Badge className="text-xs">{sg.recommended_method}</Badge>
                                  <span className="text-xs text-muted-foreground">Settlement: {sg.estimated_settlement}</span>
                                  <Badge variant="outline" className="text-[10px]">Cost: {sg.cost_indicator}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{sg.reason}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Refresh */}
                  <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={fetchAIInsights} disabled={aiLoading}>
                      <RefreshCw className={cn('h-4 w-4 mr-1.5', aiLoading && 'animate-spin')} /> Re-run AI Analysis
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Funding;
