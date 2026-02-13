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
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import {
  Wallet, Plus, RefreshCw, Building2, ArrowUpRight, Clock, CheckCircle2,
  XCircle, AlertCircle, History, IndianRupee, Trash2, ChevronDown, ChevronRight,
  AlertTriangle, ArrowRight, Zap, FileText, Eye, Bell, Brain, TrendingDown,
  TrendingUp, Shield, Activity, Sparkles, BarChart3, Target, ArrowDownRight,
  ClipboardList, BookOpen, ThumbsUp, ThumbsDown, Send, Ban, Undo2, ShieldAlert,
  Lock, Fingerprint, Scale,
} from 'lucide-react';
import { PayoutSettlementTracker, SettlementTimeline } from '@/components/funding/PayoutSettlementTracker';
import { FundingAIDashboard } from '@/components/funding/FundingAIDashboard';
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
  amount: number; status: string; workflow_stage: string; stage_updated_at: string;
  linked_trade_id: string | null;
  requested_date: string; approved_by: string | null; settlement_date: string | null;
  completed_at: string | null; reversed_at: string | null; reversal_reason: string | null;
  estimated_completion: string | null;
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
interface AuditLogEntry {
  id: string; entity_type: string; entity_id: string; action: string;
  actor_id: string; details: any; created_at: string;
}
interface ComplianceAlert {
  id: string; payout_id: string; alert_type: string; severity: string;
  title: string; description: string | null; is_resolved: boolean; created_at: string;
}

const DUAL_APPROVAL_THRESHOLD = 1000000; // ₹10L

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
  const [payoutForm, setPayoutForm] = useState({ client_id: '', payout_type: 'ACH', amount: '', linked_trade_id: '', settlement_date: '', notes: '', funding_account_id: '' });
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');

  // Compliance state
  const [payoutAuditLogs, setPayoutAuditLogs] = useState<AuditLogEntry[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);

  // Form states
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [accountForm, setAccountForm] = useState({ client_id: '', bank_name: '', account_number: '', account_type: 'savings', default_account: false });
  const [requestForm, setRequestForm] = useState({ client_id: '', funding_account_id: '', funding_type: 'ACH', amount: '', trade_reference: '', settlement_date: '', notes: '' });
  const [balanceForm, setBalanceForm] = useState({ client_id: '', available_cash: '', pending_cash: '' });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [clientsResp, accountsResp, requestsResp, balancesResp, alertsResp, ordersResp, payoutsResp, payoutTxResp, limitsResp, auditResp, compAlertResp] = await Promise.all([
        api.get('/clients', { advisor_id: user.id, fields: 'id,client_name', order: 'client_name' }),
        api.get('/funding/accounts', { advisor_id: user.id, include: 'clients', order: 'created_at.desc' }),
        api.get('/funding/requests', { initiated_by: user.id, include: 'clients,funding_accounts', order: 'created_at.desc' }),
        api.get('/funding/cash-balances', { advisor_id: user.id, include: 'clients', order: 'last_updated.desc' }),
        api.get('/funding/alerts', { advisor_id: user.id, is_resolved: false, order: 'created_at.desc' }),
        api.get('/orders', { limit: 50, fields: 'id,symbol,order_type,total_amount', order: 'created_at.desc' }),
        api.get('/payout-requests', { advisor_id: user.id, include: 'clients', order: 'created_at.desc' }),
        api.get('/payout-transactions', { order: 'created_at.desc' }),
        api.get('/withdrawal-limits', { advisor_id: user.id, include: 'clients' }),
        api.get('/funding/audit-log', { actor_id: user.id, order: 'created_at.desc', limit: 200 }),
        api.get('/payout-compliance-alerts', { is_resolved: false, order: 'created_at.desc' }),
      ]);
      setClients(extractItems<any>(clientsResp));
      setAccounts(extractItems<any>(accountsResp));
      setRequests(extractItems<any>(requestsResp));
      setBalances(extractItems<any>(balancesResp));
      setAlerts(extractItems<any>(alertsResp));
      setOrders(extractItems<any>(ordersResp));
      setPayoutRequests(extractItems<any>(payoutsResp));
      setPayoutTransactions(extractItems<any>(payoutTxResp));
      setWithdrawalLimits(extractItems<any>(limitsResp));
      setPayoutAuditLogs(extractItems<any>(auditResp));
      setComplianceAlerts(extractItems<any>(compAlertResp));
    } catch (err) {
      console.error('Failed to load funding data:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Audit Trail Helper ───
  const logAudit = async (entityType: string, entityId: string, action: string, details: any) => {
    if (!user) return;
    try {
      await api.post('/funding/audit-log', {
        entity_type: entityType,
        entity_id: entityId,
        action,
        actor_id: user.id,
        details,
      });
    } catch (err) {
      console.error('Failed to log audit:', err);
    }
  };

  // ─── Compliance Detection ───
  const detectComplianceFlags = (clientId: string, amount: number, payoutType: string) => {
    const flags: { type: string; severity: string; title: string; description: string }[] = [];

    // 1. Large withdrawal (>= ₹10L)
    if (amount >= DUAL_APPROVAL_THRESHOLD) {
      flags.push({ type: 'large_withdrawal', severity: 'high', title: 'Large Withdrawal Alert', description: `Payout of ${formatCurrency(amount)} exceeds dual-approval threshold of ${formatCurrency(DUAL_APPROVAL_THRESHOLD)}. Requires second approval.` });
    }

    // 2. Multiple withdrawals in 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentPayouts = payoutRequests.filter(p => p.client_id === clientId && new Date(p.requested_date) > last24h && p.status !== 'Failed');
    if (recentPayouts.length >= 2) {
      flags.push({ type: 'multiple_withdrawals', severity: 'medium', title: 'Multiple Withdrawal Alert', description: `${recentPayouts.length + 1} withdrawal requests in 24 hours for this client. Manual review recommended.` });
    }

    // 3. Unusual pattern: payout > 50% of available cash
    const bal = balances.find(b => b.client_id === clientId);
    const availCash = Number(bal?.available_cash || 0);
    if (availCash > 0 && amount > availCash * 0.5) {
      flags.push({ type: 'unusual_pattern', severity: 'medium', title: 'Unusual Pattern Detected', description: `Withdrawal of ${formatCurrency(amount)} is ${Math.round((amount / availCash) * 100)}% of available cash (${formatCurrency(availCash)}).` });
    }

    // 4. Wire transfer > ₹5L (same-day priority needs extra scrutiny)
    if (payoutType === 'Wire' && amount >= 500000) {
      flags.push({ type: 'high_value_wire', severity: 'medium', title: 'High-Value Wire Transfer', description: `Same-day wire of ${formatCurrency(amount)} flagged for expedited review.` });
    }

    return flags;
  };

  const createComplianceAlerts = async (payoutId: string, flags: { type: string; severity: string; title: string; description: string }[]) => {
    for (const flag of flags) {
      try {
        await api.post('/payout-compliance-alerts', {
          payout_id: payoutId,
          alert_type: flag.type,
          severity: flag.severity,
          title: flag.title,
          description: flag.description,
        });
      } catch (err) {
        console.error('Failed to create compliance alert:', err);
      }
    }
  };

  const resolveComplianceAlert = async (alertId: string) => {
    if (!user) return;
    try {
      await api.put('/payout-compliance-alerts/' + alertId, {
        is_resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      });
      await logAudit('compliance_alert', alertId, 'resolve_alert', { resolved_by: user.id });
      fetchAll();
    } catch (err) {
      console.error('Failed to resolve compliance alert:', err);
    }
  };

  const fetchAIInsights = useCallback(async () => {
    if (!user) return;
    setAiLoading(true);
    try {
      const data = await api.post<any>('/insights/funding-ai', {});
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
            api.post('/funding/alerts', {
              funding_request_id: r.id,
              advisor_id: user.id,
              alert_type: 'settlement_approaching',
              message: `Funding for ${(r as any).clients?.client_name || 'client'} (${formatCurrency(Number(r.amount))}) not completed — settlement ${daysLeft === 0 ? 'is today' : 'is tomorrow'}!`,
            }).then(() => fetchAll()).catch(err => console.error('Failed to create alert:', err));
          }
        }
      }
    });
  }, [requests]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = async (requestId: string) => {
    try {
      const response = await api.get('/funding/status-history', { funding_request_id: requestId, order: 'created_at.asc' });
      const data = extractItems<any>(response);
      setRequestHistory(prev => ({ ...prev, [requestId]: data }));
    } catch (err) {
      console.error('Failed to load funding history:', err);
    }
  };

  const handleExpandRequest = (id: string) => {
    if (expandedRequest === id) { setExpandedRequest(null); return; }
    setExpandedRequest(id);
    if (!requestHistory[id]) fetchHistory(id);
  };

  const handleAddAccount = async () => {
    if (!user || !accountForm.client_id || !accountForm.bank_name || !accountForm.account_number) return;
    try {
      await api.post('/funding/accounts', {
        client_id: accountForm.client_id, bank_name: accountForm.bank_name,
        account_number: accountForm.account_number, account_type: accountForm.account_type,
        default_account: accountForm.default_account, advisor_id: user.id,
      });
      toast({ title: 'Account added' });
      setShowAccountDialog(false);
      setAccountForm({ client_id: '', bank_name: '', account_number: '', account_type: 'savings', default_account: false });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add account', variant: 'destructive' });
    }
  };

  const handleInitiateRequest = async () => {
    if (!user || !requestForm.client_id || !requestForm.amount) return;
    try {
      const data = await api.post<any>('/funding/requests', {
        client_id: requestForm.client_id,
        funding_account_id: requestForm.funding_account_id || null,
        funding_type: requestForm.funding_type,
        amount: parseFloat(requestForm.amount),
        trade_reference: requestForm.trade_reference || null,
        settlement_date: requestForm.settlement_date || null,
        notes: requestForm.notes || null,
        initiated_by: user.id,
        workflow_stage: 'initiated',
      });
      // Log initial history
      if (data) {
        await api.post('/funding/status-history', {
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to initiate funding request', variant: 'destructive' });
    }
  };

  const handleAdvanceStage = async (request: FundingRequest, nextStage: string) => {
    if (!user) return;
    const prevStage = request.workflow_stage;
    const wf = WORKFLOW_STAGES[request.funding_type] || WORKFLOW_STAGES.ACH;
    try {
      await api.put('/funding/requests/' + request.id, {
        workflow_stage: nextStage,
        status: nextStage === 'completed' ? 'Completed' : nextStage === 'failed' ? 'Failed' : 'Pending',
        stage_updated_at: new Date().toISOString(),
      });
      // Log history
      await api.post('/funding/status-history', {
        funding_request_id: request.id, from_status: prevStage, to_status: nextStage,
        changed_by: user.id, note: `Stage advanced: ${wf.labels[prevStage] || prevStage} → ${wf.labels[nextStage] || nextStage}`,
      });
      // Auto-update cash balance on completion + notify
      const clientName = (request as any).clients?.client_name || 'Client';
      if (nextStage === 'completed') {
        await updateCashBalanceOnCompletion(request);
        await api.put('/funding/alerts/resolve-by-request/' + request.id, { is_resolved: true, resolved_at: new Date().toISOString() });
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to advance stage', variant: 'destructive' });
    }
  };

  const updateCashBalanceOnCompletion = async (request: FundingRequest) => {
    if (!user) return;
    const amount = Number(request.amount);
    const existing = balances.find(b => b.client_id === request.client_id);
    try {
      if (existing) {
        await api.put('/funding/cash-balances/' + existing.id, {
          available_cash: Number(existing.available_cash) + amount,
          last_updated: new Date().toISOString(),
        });
      } else {
        await api.post('/funding/cash-balances', {
          client_id: request.client_id, available_cash: amount,
          pending_cash: 0, advisor_id: user.id,
        });
      }
    } catch (err) {
      console.error('Failed to update cash balance:', err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await api.delete('/funding/accounts/' + id);
      toast({ title: 'Account removed' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete account', variant: 'destructive' });
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await api.put('/funding/alerts/' + id, { is_resolved: true, resolved_at: new Date().toISOString() });
      fetchAll();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const handleUpsertBalance = async () => {
    if (!user || !balanceForm.client_id) return;
    const existing = balances.find(b => b.client_id === balanceForm.client_id);
    try {
      if (existing) {
        await api.put('/funding/cash-balances/' + existing.id, {
          available_cash: parseFloat(balanceForm.available_cash) || 0,
          pending_cash: parseFloat(balanceForm.pending_cash) || 0,
          last_updated: new Date().toISOString(),
        });
      } else {
        await api.post('/funding/cash-balances', {
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save cash balance', variant: 'destructive' });
    }
  };

  // ─── Payout Handlers ───
  const handleRequestPayout = async () => {
    if (!user || !payoutForm.client_id || !payoutForm.amount) return;
    const amount = parseFloat(payoutForm.amount);
    const clientBalance = balances.find(b => b.client_id === payoutForm.client_id);
    const availableCash = Number(clientBalance?.available_cash || 0);
    const pendingCash = Number(clientBalance?.pending_cash || 0);
    const limit = withdrawalLimits.find(l => l.client_id === payoutForm.client_id);
    const dailyLimit = Number(limit?.daily_limit || 500000);
    const monthlyLimit = Number(limit?.monthly_limit || 5000000);

    // Compliance: Bank account verification required
    if (payoutForm.funding_account_id) {
      const acct = accounts.find(a => a.id === payoutForm.funding_account_id);
      if (acct && acct.verification_status !== 'verified') {
        toast({ title: 'Bank Not Verified', description: 'The selected bank account must be verified before processing a payout.', variant: 'destructive' });
        return;
      }
    }

    // Validation 1: Funds still pending settlement
    if (pendingCash > 0 && availableCash < amount) {
      toast({ title: 'Settlement Pending', description: `${formatCurrency(pendingCash)} is still pending settlement. Wait for funds to clear before requesting a payout.`, variant: 'destructive' });
      return;
    }
    // Validation 2: Insufficient available cash
    if (amount > availableCash) {
      toast({ title: 'Insufficient Funds', description: `Available cash is ${formatCurrency(availableCash)}. Cannot process payout of ${formatCurrency(amount)}.`, variant: 'destructive' });
      return;
    }
    // Validation 3: Daily limit check
    if (amount > dailyLimit) {
      toast({ title: 'Daily Limit Exceeded', description: `Payout amount exceeds daily limit of ${formatCurrency(dailyLimit)}.`, variant: 'destructive' });
      return;
    }
    // Validation 4: Monthly limit check
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString();
    const monthPayouts = payoutRequests
      .filter(p => p.client_id === payoutForm.client_id && p.status !== 'Failed' && new Date(p.requested_date) >= new Date(monthStart))
      .reduce((s, p) => s + Number(p.amount), 0);
    if (monthPayouts + amount > monthlyLimit) {
      toast({ title: 'Monthly Limit Exceeded', description: `Total monthly payouts would be ${formatCurrency(monthPayouts + amount)}, exceeding limit of ${formatCurrency(monthlyLimit)}.`, variant: 'destructive' });
      return;
    }

    // Compliance: Detect flags
    const complianceFlags = detectComplianceFlags(payoutForm.client_id, amount, payoutForm.payout_type);
    const requiresDualApproval = amount >= DUAL_APPROVAL_THRESHOLD;

    const tradeRef = payoutForm.linked_trade_id || null;
    const estDays = payoutForm.payout_type === 'Wire' ? 1 : payoutForm.payout_type === 'ACH' ? 2 : 7;
    const estimatedCompletion = addDays(new Date(), estDays).toISOString();

    let newPayout: any;
    try {
      newPayout = await api.post<any>('/payout-requests', {
        client_id: payoutForm.client_id,
        advisor_id: user.id,
        payout_type: payoutForm.payout_type,
        amount,
        linked_trade_id: tradeRef,
        settlement_date: payoutForm.settlement_date || null,
        notes: payoutForm.notes || null,
        workflow_stage: 'requested',
        estimated_completion: estimatedCompletion,
        requires_dual_approval: requiresDualApproval,
        compliance_flags: complianceFlags,
        review_status: complianceFlags.length > 0 ? 'flagged' : 'none',
        funding_account_id: payoutForm.funding_account_id || null,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create payout request', variant: 'destructive' });
      return;
    }

    if (newPayout && user) {
      // Log payout history
      await api.post('/payout-status-history', {
        payout_id: newPayout.id, from_stage: null, to_stage: 'requested',
        changed_by: user.id, note: `${payoutForm.payout_type} payout requested for ${formatCurrency(amount)}${requiresDualApproval ? ' [DUAL APPROVAL REQUIRED]' : ''}`,
      });

      // Create compliance alerts
      if (complianceFlags.length > 0) {
        await createComplianceAlerts(newPayout.id, complianceFlags);
      }

      // Audit trail
      await logAudit('payout', newPayout.id, 'payout_requested', {
        client_id: payoutForm.client_id, amount, payout_type: payoutForm.payout_type,
        requires_dual_approval: requiresDualApproval, compliance_flags: complianceFlags.length,
        funding_account_id: payoutForm.funding_account_id || null,
      });
    }

    toast({
      title: requiresDualApproval ? 'Payout Requires Dual Approval' : 'Payout request created',
      description: requiresDualApproval ? `Amount ≥ ${formatCurrency(DUAL_APPROVAL_THRESHOLD)} requires a second approver.` : undefined,
      variant: requiresDualApproval ? 'default' : undefined,
    });
    setShowPayoutDialog(false);
    setPayoutForm({ client_id: '', payout_type: 'ACH', amount: '', linked_trade_id: '', settlement_date: '', notes: '', funding_account_id: '' });
    fetchAll();
  };

  const handleApprovePayout = async (id: string) => {
    const payout = payoutRequests.find(p => p.id === id);
    // Dual approval check: if requires_dual_approval and approved_by is the same user, block
    if (payout && (payout as any).requires_dual_approval && payout.approved_by === user?.id) {
      toast({ title: 'Dual Approval Required', description: 'A different approver must provide the second approval for this payout.', variant: 'destructive' });
      return;
    }
    await handleAdvancePayoutStage(id, 'approved');
  };

  const handleRejectPayout = async (id: string) => {
    await handleAdvancePayoutStage(id, 'failed');
  };

  // Payout workflow stages per type
  const PAYOUT_WORKFLOWS: Record<string, { stages: string[]; labels: Record<string, string>; estDays: number }> = {
    ACH: { stages: ['requested', 'approved', 'processing', 'settled', 'completed'], labels: { requested: 'Requested', approved: 'Approved', processing: 'Processing', settled: 'Settled (T+1)', completed: 'Completed' }, estDays: 2 },
    Wire: { stages: ['requested', 'approved', 'processing', 'completed'], labels: { requested: 'Requested', approved: 'Approved', processing: 'Processing', completed: 'Same-day' }, estDays: 1 },
    TOA: { stages: ['requested', 'approved', 'transfer_initiated', 'in_transit', 'completed'], labels: { requested: 'Requested', approved: 'Approved', transfer_initiated: 'Transfer Initiated', in_transit: 'In Transit', completed: 'Completed' }, estDays: 7 },
  };

  const getPayoutNextStages = (payoutType: string, currentStage: string): string[] => {
    const wf = PAYOUT_WORKFLOWS[payoutType] || PAYOUT_WORKFLOWS.ACH;
    const idx = wf.stages.indexOf(currentStage);
    if (idx === -1 || currentStage === 'completed' || currentStage === 'failed' || currentStage === 'reversed') return [];
    const next: string[] = [];
    if (idx + 1 < wf.stages.length) next.push(wf.stages[idx + 1]);
    next.push('failed');
    return next;
  };

  const handleAdvancePayoutStage = async (id: string, nextStage: string) => {
    if (!user) return;
    const payout = payoutRequests.find(p => p.id === id);
    if (!payout) return;
    const prevStage = payout.workflow_stage;
    const wf = PAYOUT_WORKFLOWS[payout.payout_type] || PAYOUT_WORKFLOWS.ACH;

    const newStatus = nextStage === 'completed' ? 'Completed' : nextStage === 'failed' ? 'Failed' : nextStage === 'approved' ? 'Approved' : 'Processing';
    const updates: any = {
      status: newStatus,
      workflow_stage: nextStage,
      stage_updated_at: new Date().toISOString(),
    };
    if (nextStage === 'completed') updates.completed_at = new Date().toISOString();
    if (nextStage === 'approved') updates.approved_by = user.id;

    try {
      await api.put('/payout-requests/' + id, updates);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to advance payout', variant: 'destructive' });
      return;
    }

    // Log history
    await api.post('/payout-status-history', {
      payout_id: id, from_stage: prevStage, to_stage: nextStage,
      changed_by: user.id, note: `${wf.labels[prevStage] || prevStage} → ${wf.labels[nextStage] || nextStage}`,
    });

    // Audit trail
    await logAudit('payout', id, `payout_${nextStage}`, {
      from_stage: prevStage, to_stage: nextStage, amount: Number(payout.amount),
      client_id: payout.client_id, payout_type: payout.payout_type,
    });

    // Auto-deduct cash on completion
    if (nextStage === 'completed') {
      const existing = balances.find(b => b.client_id === payout.client_id);
      if (existing) {
        try {
          await api.put('/funding/cash-balances/' + existing.id, {
            available_cash: Math.max(0, Number(existing.available_cash) - Number(payout.amount)),
            last_updated: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Failed to deduct cash balance:', err);
        }
      }
      await logAudit('cash_balance', payout.client_id, 'cash_deducted', { amount: Number(payout.amount), payout_id: id });
    }

    toast({ title: `Payout advanced to ${wf.labels[nextStage] || nextStage}` });
    fetchAll();
  };

  const handleReversePayout = async (id: string, reason: string) => {
    if (!user) return;
    const payout = payoutRequests.find(p => p.id === id);
    if (!payout || payout.status !== 'Completed') return;

    try {
      await api.put('/payout-requests/' + id, {
        reversed_at: new Date().toISOString(),
        reversal_reason: reason,
        workflow_stage: 'reversed',
        status: 'Failed',
        stage_updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to reverse payout', variant: 'destructive' });
      return;
    }

    // Restore cash balance
    const existing = balances.find(b => b.client_id === payout.client_id);
    if (existing) {
      try {
        await api.put('/funding/cash-balances/' + existing.id, {
          available_cash: Number(existing.available_cash) + Number(payout.amount),
          last_updated: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to restore cash balance:', err);
      }
    }

    // Log history
    await api.post('/payout-status-history', {
      payout_id: id, from_stage: 'completed', to_stage: 'reversed',
      changed_by: user.id, note: `Reversed: ${reason}`,
    });

    // Audit trail
    await logAudit('payout', id, 'payout_reversed', {
      reason, amount: Number(payout.amount), client_id: payout.client_id,
    });
    await logAudit('cash_balance', payout.client_id, 'cash_restored', { amount: Number(payout.amount), payout_id: id });

    toast({ title: 'Payout reversed, cash restored' });
    fetchAll();
  };

  const handleDeletePayout = async (id: string) => {
    if (!user) return;
    await logAudit('payout', id, 'payout_deleted', {});
    try {
      await api.delete('/payout-requests/' + id);
      toast({ title: 'Payout deleted' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete payout', variant: 'destructive' });
    }
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
            <TabsTrigger value="compliance-audit"><ShieldAlert className="h-4 w-4 mr-1.5" /> Compliance & Audit{complianceAlerts.length > 0 && <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{complianceAlerts.length}</Badge>}</TabsTrigger>
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
                  <DialogContent className="max-w-lg">
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
                      {/* Bank Account Selection (Compliance: must be verified) */}
                      {payoutForm.client_id && (
                        <div>
                          <Label>Payout Bank Account</Label>
                          <Select value={payoutForm.funding_account_id} onValueChange={v => setPayoutForm(p => ({ ...p, funding_account_id: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select verified account" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {accounts.filter(a => a.client_id === payoutForm.client_id).map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.bank_name} — {maskAccount(a.account_number)} {a.verification_status !== 'verified' ? '⚠️ Unverified' : '✅'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {payoutForm.funding_account_id && (() => {
                            const acct = accounts.find(a => a.id === payoutForm.funding_account_id);
                            if (acct && acct.verification_status !== 'verified') {
                              return (
                                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-2 text-xs text-destructive mt-2">
                                  <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>This account is not verified. Payout will be blocked.</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                      {payoutForm.client_id && (() => {
                        const limit = withdrawalLimits.find(l => l.client_id === payoutForm.client_id);
                        const bal = balances.find(b => b.client_id === payoutForm.client_id);
                        const availCash = Number(bal?.available_cash || 0);
                        const pendCash = Number(bal?.pending_cash || 0);
                        const requestedAmt = parseFloat(payoutForm.amount) || 0;
                        const hasPendingFunds = pendCash > 0 && availCash < requestedAmt;
                        const insufficientCash = requestedAmt > availCash;
                        const needsDualApproval = requestedAmt >= DUAL_APPROVAL_THRESHOLD;
                        return (
                          <div className="space-y-3">
                            <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                              <p className="text-muted-foreground text-xs font-medium uppercase">Limits & Balance</p>
                              <div className="flex justify-between"><span className="text-muted-foreground">Available Cash:</span><span className="font-medium text-emerald-600">{formatCurrency(availCash)}</span></div>
                              {pendCash > 0 && (
                                <div className="flex justify-between"><span className="text-muted-foreground">Pending Settlement:</span><span className="font-medium text-amber-600">{formatCurrency(pendCash)}</span></div>
                              )}
                              <div className="flex justify-between"><span className="text-muted-foreground">Daily Limit:</span><span className="font-medium">{formatCurrency(Number(limit?.daily_limit || 500000))}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Monthly Limit:</span><span className="font-medium">{formatCurrency(Number(limit?.monthly_limit || 5000000))}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Dual Approval Threshold:</span><span className="font-medium">{formatCurrency(DUAL_APPROVAL_THRESHOLD)}</span></div>
                            </div>
                            {needsDualApproval && (
                              <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/5 p-3 text-sm">
                                <ShieldAlert className="h-4 w-4 flex-shrink-0 text-primary" />
                                <span className="font-medium">Dual approval required — a second approver must confirm this payout.</span>
                              </div>
                            )}
                            {hasPendingFunds && (
                              <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
                                <Clock className="h-4 w-4 flex-shrink-0" />
                                <span>Funds of {formatCurrency(pendCash)} are still pending settlement. Payout will be blocked until settlement clears.</span>
                              </div>
                            )}
                            {insufficientCash && !hasPendingFunds && requestedAmt > 0 && (
                              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                                <Ban className="h-4 w-4 flex-shrink-0" />
                                <span>Insufficient available cash. Need {formatCurrency(requestedAmt - availCash)} more.</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div>
                        <Label>Link to Sell Trade (Optional)</Label>
                        <Select value={payoutForm.linked_trade_id} onValueChange={v => setPayoutForm(p => ({ ...p, linked_trade_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select a sell trade..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {orders.filter(o => o.order_type === 'sell').map(o => (
                              <SelectItem key={o.id} value={o.id}>{o.symbol} — {formatCurrency(Number(o.total_amount))}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
                  <div className="space-y-4">
                    {payoutRequests.filter(p => p.status === 'Requested' || p.status === 'Approved').map(p => {
                      const bal = balances.find(b => b.client_id === p.client_id);
                      const settlementCleared = !bal || Number(bal.pending_cash) === 0;
                      return (
                        <div key={p.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{(p as any).clients?.client_name || '—'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{p.payout_type}</Badge>
                                <span className="font-semibold">{formatCurrency(Number(p.amount))}</span>
                                {p.linked_trade_id && <Badge variant="secondary" className="text-xs">Trade: {p.linked_trade_id.slice(0, 8)}</Badge>}
                                {(p as any).requires_dual_approval && <Badge variant="outline" className="text-xs border-primary text-primary gap-1"><Scale className="h-3 w-3" /> Dual Approval</Badge>}
                                {(p as any).review_status === 'flagged' && <Badge variant="outline" className="text-xs border-amber-500 text-amber-500 gap-1"><AlertTriangle className="h-3 w-3" /> Flagged</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Requested {format(new Date(p.requested_date), 'dd MMM yyyy, HH:mm')}</p>
                              {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
                            </div>
                            <Badge variant={p.status === 'Requested' ? 'secondary' : 'default'}>{p.status}</Badge>
                          </div>

                          {/* Payout Lifecycle Tracker */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Payout Lifecycle</p>
                            <PayoutSettlementTracker status={p.status} settlementCleared={settlementCleared} isFailed={p.status === 'Failed'} />
                          </div>

                          {/* Settlement Timeline */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Settlement Timeline</p>
                            <SettlementTimeline
                              tradeDate={p.linked_trade_id ? p.created_at : null}
                              settlementDate={p.settlement_date}
                              cashAvailableDate={settlementCleared && p.settlement_date ? p.settlement_date : null}
                              payoutRequestedDate={p.requested_date}
                              completedDate={p.status === 'Completed' ? p.created_at : null}
                              status={p.status}
                            />
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            {p.status === 'Requested' && (
                              <>
                                <Button size="sm" onClick={() => handleApprovePayout(p.id)}><ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectPayout(p.id)}><ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                              </>
                            )}
                            {p.status !== 'Requested' && p.status !== 'Completed' && p.status !== 'Failed' && (() => {
                              const nextStages = getPayoutNextStages(p.payout_type, p.workflow_stage);
                              const wf = PAYOUT_WORKFLOWS[p.payout_type] || PAYOUT_WORKFLOWS.ACH;
                              return nextStages.map(ns => (
                                <Button key={ns} size="sm" variant={ns === 'failed' ? 'destructive' : 'default'} onClick={() => handleAdvancePayoutStage(p.id, ns)}>
                                  {ns === 'failed' ? <XCircle className="h-3.5 w-3.5 mr-1" /> : <ArrowRight className="h-3.5 w-3.5 mr-1" />}
                                  {wf.labels[ns] || ns}
                                </Button>
                              ));
                            })()}
                            {p.status === 'Completed' && !p.reversed_at && (
                              <Button size="sm" variant="outline" className="border-orange-500/50 text-orange-600" onClick={() => {
                                const reason = prompt('Reversal reason:');
                                if (reason) handleReversePayout(p.id, reason);
                              }}>
                                <Undo2 className="h-3.5 w-3.5 mr-1" /> Reverse
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                  <div className="space-y-3">
                    {filteredPayoutHistory.map(p => {
                      const bal = balances.find(b => b.client_id === p.client_id);
                      const settlementCleared = !bal || Number(bal.pending_cash) === 0;
                      return (
                        <Collapsible key={p.id}>
                          <div className="border rounded-lg overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-sm">{(p as any).clients?.client_name || '—'}</span>
                                      <Badge variant="outline">{p.payout_type}</Badge>
                                      <span className="font-semibold text-sm">{formatCurrency(Number(p.amount))}</span>
                                      {p.linked_trade_id && <Badge variant="secondary" className="text-xs">Trade linked</Badge>}
                                      {p.reversed_at && <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">Reversed</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {format(new Date(p.requested_date), 'dd MMM yyyy')}
                                      {p.settlement_date ? ` • Settlement: ${format(new Date(p.settlement_date), 'dd MMM yyyy')}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={p.reversed_at ? 'outline' : p.status === 'Completed' ? 'default' : p.status === 'Failed' ? 'destructive' : p.status === 'Processing' ? 'outline' : 'secondary'} className={p.reversed_at ? 'border-orange-500 text-orange-500' : ''}>
                                    {p.reversed_at ? 'Reversed' : p.status}
                                  </Badge>
                                  <div className="flex gap-1">
                                    {p.workflow_stage !== 'completed' && p.workflow_stage !== 'failed' && p.workflow_stage !== 'reversed' && (() => {
                                      const nextStages = getPayoutNextStages(p.payout_type, p.workflow_stage);
                                      const wf = PAYOUT_WORKFLOWS[p.payout_type] || PAYOUT_WORKFLOWS.ACH;
                                      return nextStages.filter(ns => ns !== 'failed').map(ns => (
                                        <Button key={ns} size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleAdvancePayoutStage(p.id, ns); }} title={wf.labels[ns] || ns}>
                                          <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                      ));
                                    })()}
                                    {p.status === 'Completed' && !p.reversed_at && (
                                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); const reason = prompt('Reversal reason:'); if (reason) handleReversePayout(p.id, reason); }} title="Reverse">
                                        <Undo2 className="h-3.5 w-3.5 text-orange-500" />
                                      </Button>
                                    )}
                                    {(p.status === 'Requested' || p.status === 'Approved') && (
                                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeletePayout(p.id); }}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="px-4 pb-4 space-y-4 border-t bg-muted/20 pt-4">
                                {/* Payout Lifecycle Tracker */}
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Payout Lifecycle</p>
                                  <PayoutSettlementTracker status={p.reversed_at ? 'Reversed' : p.status} settlementCleared={settlementCleared} isFailed={p.status === 'Failed' && !p.reversed_at} />
                                </div>
                                {/* Settlement Timeline */}
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Settlement Timeline</p>
                                  <SettlementTimeline
                                    tradeDate={p.linked_trade_id ? p.created_at : null}
                                    settlementDate={p.settlement_date}
                                    cashAvailableDate={settlementCleared && p.settlement_date ? p.settlement_date : null}
                                    payoutRequestedDate={p.requested_date}
                                    completedDate={p.completed_at || (p.status === 'Completed' ? p.created_at : null)}
                                    status={p.reversed_at ? 'Reversed' : p.status}
                                  />
                                </div>
                                {/* Reversal info */}
                                {p.reversed_at && (
                                  <div className="rounded-lg border border-orange-500/50 bg-orange-500/5 p-3 text-sm">
                                    <p className="font-medium text-orange-600 dark:text-orange-400">Reversed on {format(new Date(p.reversed_at), 'dd MMM yyyy, HH:mm')}</p>
                                    {p.reversal_reason && <p className="text-muted-foreground mt-1">{p.reversal_reason}</p>}
                                  </div>
                                )}
                                {/* Details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div><p className="text-muted-foreground text-xs">Trade Reference</p><p className="font-mono">{p.linked_trade_id ? p.linked_trade_id.slice(0, 12) + '...' : '—'}</p></div>
                                  <div><p className="text-muted-foreground text-xs">Settlement Date</p><p className="font-medium">{p.settlement_date ? format(new Date(p.settlement_date), 'dd MMM yyyy') : '—'}</p></div>
                                  <div><p className="text-muted-foreground text-xs">Est. Completion</p><p className="font-medium">{p.estimated_completion ? format(new Date(p.estimated_completion), 'dd MMM yyyy') : '—'}</p></div>
                                  <div><p className="text-muted-foreground text-xs">Notes</p><p>{p.notes || '—'}</p></div>
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

          {/* ─── AI Intelligence Tab ─── */}
          <TabsContent value="ai-intelligence">
            <FundingAIDashboard aiInsights={aiInsights} aiLoading={aiLoading} onFetchAI={fetchAIInsights} />
          </TabsContent>

          {/* ─── Compliance & Audit Trail Tab ─── */}
          <TabsContent value="compliance-audit">
            <div className="space-y-6">
              {/* Compliance Alerts */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /> Active Compliance Alerts</CardTitle>
                      <CardDescription>Flagged payouts requiring review or manual intervention</CardDescription>
                    </div>
                    <Badge variant={complianceAlerts.length > 0 ? 'destructive' : 'secondary'}>{complianceAlerts.length} Active</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {complianceAlerts.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
                      <p className="text-muted-foreground">No active compliance alerts — all clear</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {complianceAlerts.map(ca => {
                        const payout = payoutRequests.find(p => p.id === ca.payout_id);
                        return (
                          <div key={ca.id} className={cn('border rounded-lg p-4', ca.severity === 'high' ? 'border-destructive/50 bg-destructive/5' : 'border-amber-500/50 bg-amber-500/5')}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge variant={ca.severity === 'high' ? 'destructive' : 'outline'} className="text-[10px]">{ca.severity.toUpperCase()}</Badge>
                                  <Badge variant="secondary" className="text-[10px]">{ca.alert_type.replace(/_/g, ' ')}</Badge>
                                  {payout && <span className="text-xs text-muted-foreground">{(payout as any).clients?.client_name} • {formatCurrency(Number(payout.amount))}</span>}
                                </div>
                                <p className="font-medium text-sm">{ca.title}</p>
                                {ca.description && <p className="text-xs text-muted-foreground mt-1">{ca.description}</p>}
                                <p className="text-xs text-muted-foreground mt-1">{format(new Date(ca.created_at), 'dd MMM yyyy, HH:mm')}</p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => resolveComplianceAlert(ca.id)}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Compliance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Dual Approval Required</p><p className="text-2xl font-bold">{payoutRequests.filter(p => (p as any).requires_dual_approval && p.status === 'Requested').length}</p></div><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Scale className="h-5 w-5 text-primary" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Flagged Payouts</p><p className="text-2xl font-bold">{payoutRequests.filter(p => (p as any).review_status === 'flagged').length}</p></div><div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-amber-500" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Verified Accounts</p><p className="text-2xl font-bold">{accounts.filter(a => a.verification_status === 'verified').length}/{accounts.length}</p></div><div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><Fingerprint className="h-5 w-5 text-emerald-500" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Audit Events (Today)</p><p className="text-2xl font-bold">{payoutAuditLogs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}</p></div><div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center"><FileText className="h-5 w-5 text-blue-500" /></div></div></CardContent></Card>
              </div>

              {/* Full Audit Trail */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Payout Audit Trail</CardTitle>
                  <CardDescription>Complete audit log of every payout action</CardDescription>
                </CardHeader>
                <CardContent>
                  {payoutAuditLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No audit events recorded yet.</p>
                  ) : (
                    <div className="space-y-0 max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payoutAuditLogs.map(log => (
                            <TableRow key={log.id}>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{log.action.replace(/_/g, ' ').toUpperCase()}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                <span className="font-medium">{log.entity_type}</span>
                                <span className="text-muted-foreground ml-1 font-mono">{log.entity_id.slice(0, 8)}...</span>
                              </TableCell>
                              <TableCell className="text-xs max-w-[300px] truncate">
                                {log.details?.amount ? `${formatCurrency(log.details.amount)}` : ''}
                                {log.details?.payout_type ? ` • ${log.details.payout_type}` : ''}
                                {log.details?.from_stage ? ` • ${log.details.from_stage} → ${log.details.to_stage}` : ''}
                                {log.details?.reason ? ` • ${log.details.reason}` : ''}
                                {log.details?.compliance_flags ? ` • ${log.details.compliance_flags} flag(s)` : ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Funding;
