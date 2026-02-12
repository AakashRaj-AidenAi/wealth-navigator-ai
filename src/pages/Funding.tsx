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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import {
  Wallet, Plus, RefreshCw, Building2, ArrowUpRight, Clock, CheckCircle2,
  XCircle, AlertCircle, History, IndianRupee, Trash2, ChevronDown, ChevronRight,
  AlertTriangle, ArrowRight, Zap, FileText, Eye, Bell,
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

  // Form states
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [accountForm, setAccountForm] = useState({ client_id: '', bank_name: '', account_number: '', account_type: 'savings', default_account: false });
  const [requestForm, setRequestForm] = useState({ client_id: '', funding_account_id: '', funding_type: 'ACH', amount: '', trade_reference: '', settlement_date: '', notes: '' });
  const [balanceForm, setBalanceForm] = useState({ client_id: '', available_cash: '', pending_cash: '' });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [clientsRes, accountsRes, requestsRes, balancesRes, alertsRes, ordersRes] = await Promise.all([
      supabase.from('clients').select('id, client_name').eq('advisor_id', user.id).order('client_name'),
      supabase.from('funding_accounts').select('*, clients(client_name)').eq('advisor_id', user.id).order('created_at', { ascending: false }),
      supabase.from('funding_requests').select('*, clients(client_name), funding_accounts(bank_name, account_number)').eq('initiated_by', user.id).order('created_at', { ascending: false }),
      supabase.from('cash_balances').select('*, clients(client_name)').eq('advisor_id', user.id).order('last_updated', { ascending: false }),
      supabase.from('funding_alerts').select('*').eq('advisor_id', user.id).eq('is_resolved', false).order('created_at', { ascending: false }),
      supabase.from('orders').select('id, symbol, order_type, total_amount').limit(50).order('created_at', { ascending: false }),
    ]);
    setClients(clientsRes.data || []);
    setAccounts((accountsRes.data as any) || []);
    setRequests((requestsRes.data as any) || []);
    setBalances((balancesRes.data as any) || []);
    setAlerts((alertsRes.data as any) || []);
    setOrders((ordersRes.data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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

  const maskAccount = (num: string) => num.length <= 4 ? num : '••••' + num.slice(-4);

  const totalAvailableCash = balances.reduce((s, b) => s + Number(b.available_cash), 0);
  const totalPendingCash = balances.reduce((s, b) => s + Number(b.pending_cash), 0);
  const pendingRequests = requests.filter(r => r.workflow_stage !== 'completed' && r.workflow_stage !== 'failed').length;
  const clientAccounts = accounts.filter(a => a.client_id === requestForm.client_id);

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
          <TabsList className="bg-muted">
            <TabsTrigger value="dashboard"><Wallet className="h-4 w-4 mr-1.5" /> Accounts</TabsTrigger>
            <TabsTrigger value="initiate"><ArrowUpRight className="h-4 w-4 mr-1.5" /> Initiate Funding</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" /> Workflow & History</TabsTrigger>
            <TabsTrigger value="ledger"><IndianRupee className="h-4 w-4 mr-1.5" /> Cash Ledger</TabsTrigger>
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
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Funding;
