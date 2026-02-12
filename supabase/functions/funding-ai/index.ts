import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FundingRiskAlert {
  type: 'delay_prediction' | 'failed_risk' | 'large_movement' | 'reconciliation_anomaly' | 'settlement_risk' | 'withdrawal_risk' | 'behavior_alert';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  client_id?: string;
  client_name?: string;
  request_id?: string;
  amount?: number;
  score?: number;
  suggested_action: string;
}

interface CashFlowForecast {
  client_id: string;
  client_name: string;
  current_available: number;
  current_pending: number;
  projected_inflow: number;
  projected_outflow: number;
  projected_payout_outflow: number;
  projected_balance: number;
  shortfall: boolean;
  shortfall_amount: number;
  days_until_shortfall: number | null;
  recommendation: string;
}

interface SettlementRisk {
  request_id: string;
  client_name: string;
  funding_type: string;
  amount: number;
  settlement_date: string;
  days_remaining: number;
  current_stage: string;
  completion_probability: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

interface SmartFundingSuggestion {
  client_id: string;
  client_name: string;
  recommended_method: string;
  reason: string;
  estimated_settlement: string;
  cost_indicator: 'low' | 'medium' | 'high';
  urgency: string;
}

interface WithdrawalRiskProfile {
  client_id: string;
  client_name: string;
  risk_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  total_withdrawals_30d: number;
  total_amount_30d: number;
  avg_withdrawal: number;
  withdrawal_frequency: string;
  flags: string[];
  recommendation: string;
}

interface ClientBehavior {
  client_id: string;
  client_name: string;
  pattern: 'frequent_withdrawer' | 'early_redeemer' | 'exit_risk' | 'stable' | 'growing';
  withdrawal_count_90d: number;
  total_withdrawn_90d: number;
  avg_days_between_withdrawals: number | null;
  payout_to_aum_ratio: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  signals: string[];
}

interface UpcomingLargePayout {
  payout_id: string;
  client_id: string;
  client_name: string;
  amount: number;
  payout_type: string;
  status: string;
  requested_date: string;
  estimated_completion: string | null;
  cash_available: number;
  coverage_ratio: number;
}

interface CashFlowHeatmapEntry {
  date: string;
  inflows: number;
  outflows: number;
  net: number;
  payout_count: number;
  funding_count: number;
}

interface FundingAIOutput {
  risk_alerts: FundingRiskAlert[];
  cash_flow_forecasts: CashFlowForecast[];
  settlement_risks: SettlementRisk[];
  smart_suggestions: SmartFundingSuggestion[];
  withdrawal_risk_profiles: WithdrawalRiskProfile[];
  client_behaviors: ClientBehavior[];
  upcoming_large_payouts: UpcomingLargePayout[];
  cash_flow_heatmap: CashFlowHeatmapEntry[];
  summary: {
    total_active_requests: number;
    high_risk_count: number;
    shortfall_clients: number;
    total_pending_amount: number;
    avg_completion_probability: number;
    large_movements_flagged: number;
    high_risk_withdrawals: number;
    exit_risk_clients: number;
    upcoming_large_payout_total: number;
  };
  generated_at: string;
}

function daysBetween(d1: Date, d2: Date): number {
  return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toFixed(0)}`;
}

const STAGE_PROGRESS: Record<string, Record<string, number>> = {
  ACH: { initiated: 0.1, bank_verification: 0.3, processing: 0.7, completed: 1.0, failed: 0 },
  Wire: { initiated: 0.15, manual_confirmation: 0.4, processing: 0.75, completed: 1.0, failed: 0 },
  TOA: { initiated: 0.05, transfer_requested: 0.2, broker_review: 0.4, in_transit: 0.7, completed: 1.0, failed: 0 },
};

const EXPECTED_DAYS: Record<string, number> = { ACH: 2, Wire: 1, TOA: 7 };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await authClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const advisorId = claimsData.claims.sub as string;
    const today = new Date();

    // Fetch all data
    const [requestsRes, balancesRes, historyRes, alertsRes, ordersRes, clientsRes, payoutsRes] = await Promise.all([
      supabase.from('funding_requests').select('*, clients(client_name)').eq('initiated_by', advisorId).order('created_at', { ascending: false }),
      supabase.from('cash_balances').select('*, clients(client_name)').eq('advisor_id', advisorId),
      supabase.from('funding_status_history').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('funding_alerts').select('*').eq('advisor_id', advisorId).eq('is_resolved', false),
      supabase.from('orders').select('*').in('status', ['pending', 'partially_filled']),
      supabase.from('clients').select('id, client_name, total_assets').eq('advisor_id', advisorId),
      supabase.from('payout_requests').select('*, clients(client_name)').eq('advisor_id', advisorId).order('created_at', { ascending: false }),
    ]);

    const requests = requestsRes.data || [];
    const balances = balancesRes.data || [];
    const history = historyRes.data || [];
    const pendingOrders = ordersRes.data || [];
    const clients = clientsRes.data || [];
    const payouts = payoutsRes.data || [];

    const activeRequests = requests.filter((r: any) => r.workflow_stage !== 'completed' && r.workflow_stage !== 'failed');
    const activePayouts = payouts.filter((p: any) => p.status !== 'Completed' && p.status !== 'Failed');

    // ═══════════════════════════════════════════
    // 1. FUNDING DELAY PREDICTION & FAILED RISK
    // ═══════════════════════════════════════════
    const riskAlerts: FundingRiskAlert[] = [];

    for (const req of activeRequests) {
      const clientName = req.clients?.client_name || 'Client';
      const amount = Number(req.amount);
      const daysSinceCreated = daysBetween(today, new Date(req.created_at));
      const daysSinceStageUpdate = daysBetween(today, new Date(req.stage_updated_at));
      const expectedDays = EXPECTED_DAYS[req.funding_type] || 3;
      const progress = STAGE_PROGRESS[req.funding_type]?.[req.workflow_stage] ?? 0.1;

      const expectedProgressByNow = Math.min(daysSinceCreated / expectedDays, 1);
      const delayScore = Math.max(0, Math.round((expectedProgressByNow - progress) * 100));

      if (delayScore > 30) {
        riskAlerts.push({
          type: 'delay_prediction',
          severity: delayScore > 70 ? 'critical' : delayScore > 50 ? 'high' : 'medium',
          title: `${req.funding_type} likely delayed — ${clientName}`,
          description: `${formatCurrency(amount)} request at "${req.workflow_stage}" for ${daysSinceCreated}d (expected ${expectedDays}d). Delay: ${delayScore}%.`,
          client_id: req.client_id, client_name: clientName, request_id: req.id, amount, score: delayScore,
          suggested_action: daysSinceStageUpdate > 2 ? 'Contact bank/broker for status update' : 'Monitor — stage update may be pending',
        });
      }

      const requestHistory = history.filter((h: any) => h.funding_request_id === req.id);
      const stageChanges = requestHistory.length;
      const failedRiskScore = Math.min(100, Math.round(
        (daysSinceStageUpdate > 3 ? 40 : daysSinceStageUpdate > 1 ? 15 : 0) +
        (stageChanges === 0 ? 20 : 0) +
        (req.funding_type === 'TOA' ? 15 : 0) +
        (amount > 1000000 ? 10 : 0) +
        (delayScore > 50 ? 15 : 0)
      ));

      if (failedRiskScore > 35) {
        riskAlerts.push({
          type: 'failed_risk',
          severity: failedRiskScore > 70 ? 'critical' : failedRiskScore > 50 ? 'high' : 'medium',
          title: `Failure risk — ${clientName}`,
          description: `${formatCurrency(amount)} ${req.funding_type} has ${failedRiskScore}% failure risk. Stage "${req.workflow_stage}" unchanged for ${daysSinceStageUpdate}d.`,
          client_id: req.client_id, client_name: clientName, request_id: req.id, amount, score: failedRiskScore,
          suggested_action: failedRiskScore > 60 ? 'Escalate immediately — consider alternate funding method' : 'Follow up with processing team',
        });
      }

      if (amount >= 2500000) {
        riskAlerts.push({
          type: 'large_movement',
          severity: amount >= 10000000 ? 'critical' : amount >= 5000000 ? 'high' : 'medium',
          title: `Large cash movement — ${clientName}`,
          description: `${formatCurrency(amount)} ${req.funding_type} flagged. Ensure compliance verification.`,
          client_id: req.client_id, client_name: clientName, request_id: req.id, amount,
          score: Math.min(100, Math.round((amount / 10000000) * 100)),
          suggested_action: 'Verify source of funds and ensure AML compliance',
        });
      }
    }

    // Reconciliation anomaly
    const completedRecent = requests.filter((r: any) => r.workflow_stage === 'completed' && daysBetween(today, new Date(r.stage_updated_at)) <= 3);
    for (const req of completedRecent) {
      const clientBalance = balances.find((b: any) => b.client_id === req.client_id);
      if (clientBalance && Number(clientBalance.pending_cash) > Number(req.amount) * 0.5) {
        riskAlerts.push({
          type: 'reconciliation_anomaly', severity: 'high',
          title: `Reconciliation mismatch — ${req.clients?.client_name || 'Client'}`,
          description: `${formatCurrency(Number(req.amount))} completed but pending cash (${formatCurrency(Number(clientBalance.pending_cash))}) still high.`,
          client_id: req.client_id, client_name: req.clients?.client_name || 'Client', request_id: req.id, amount: Number(req.amount),
          suggested_action: 'Reconcile cash balances and verify bank confirmation',
        });
      }
    }

    // ═══════════════════════════════════════════
    // 2. CASH FLOW FORECASTS (enhanced with payouts)
    // ═══════════════════════════════════════════
    const cashFlowForecasts: CashFlowForecast[] = [];
    for (const bal of balances) {
      const clientName = bal.clients?.client_name || 'Client';
      const available = Number(bal.available_cash);
      const pending = Number(bal.pending_cash);

      const clientActiveReqs = activeRequests.filter((r: any) => r.client_id === bal.client_id);
      const projectedInflow = clientActiveReqs.reduce((s: number, r: any) => s + Number(r.amount), 0);

      const clientPendingOrders = pendingOrders.filter((o: any) => o.client_id === bal.client_id);
      const projectedOutflow = clientPendingOrders.reduce((s: number, o: any) => s + (Number(o.total_amount) || 0), 0);

      // Payout outflows
      const clientActivePayouts = activePayouts.filter((p: any) => p.client_id === bal.client_id);
      const projectedPayoutOutflow = clientActivePayouts.reduce((s: number, p: any) => s + Number(p.amount), 0);

      const totalOutflow = projectedOutflow + projectedPayoutOutflow;
      const projectedBalance = available + projectedInflow - totalOutflow;
      const shortfall = projectedBalance < 0;
      const shortfallAmount = shortfall ? Math.abs(projectedBalance) : 0;

      let daysUntilShortfall: number | null = null;
      if (totalOutflow > 0 && available > 0) {
        const dailyBurn = totalOutflow / 5;
        if (dailyBurn > 0 && available / dailyBurn < 30) {
          daysUntilShortfall = Math.round(available / dailyBurn);
        }
      }

      let recommendation = 'Cash position healthy';
      if (shortfall) {
        recommendation = `Shortfall of ${formatCurrency(shortfallAmount)} projected. Initiate ${shortfallAmount > 1000000 ? 'Wire' : 'ACH'} funding immediately.`;
      } else if (daysUntilShortfall !== null && daysUntilShortfall < 7) {
        recommendation = `Cash may deplete in ~${daysUntilShortfall} days. Plan funding ahead.`;
      } else if (available > 5000000 && totalOutflow === 0) {
        recommendation = 'Large idle cash — consider deploying into investments.';
      }

      cashFlowForecasts.push({
        client_id: bal.client_id, client_name: clientName,
        current_available: available, current_pending: pending,
        projected_inflow: projectedInflow, projected_outflow: projectedOutflow,
        projected_payout_outflow: projectedPayoutOutflow,
        projected_balance: projectedBalance, shortfall, shortfall_amount: shortfallAmount,
        days_until_shortfall: daysUntilShortfall, recommendation,
      });
    }

    // ═══════════════════════════════════════════
    // 3. SETTLEMENT RISKS
    // ═══════════════════════════════════════════
    const settlementRisks: SettlementRisk[] = [];
    for (const req of activeRequests) {
      if (!req.settlement_date) continue;
      const clientName = req.clients?.client_name || 'Client';
      const amount = Number(req.amount);
      const settlementDate = new Date(req.settlement_date);
      const daysRemaining = daysBetween(settlementDate, today);
      const progress = STAGE_PROGRESS[req.funding_type]?.[req.workflow_stage] ?? 0.1;

      let completionProb = Math.round(progress * 100);
      if (daysRemaining < 0) completionProb = Math.max(5, completionProb - 30);
      else if (daysRemaining === 0) completionProb = Math.max(10, completionProb - 15);
      else if (daysRemaining <= 1 && progress < 0.7) completionProb = Math.max(15, completionProb - 10);

      let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (daysRemaining < 0) riskLevel = 'critical';
      else if (daysRemaining === 0 && progress < 0.7) riskLevel = 'critical';
      else if (daysRemaining <= 1 && progress < 0.5) riskLevel = 'high';
      else if (daysRemaining <= 2 && progress < 0.3) riskLevel = 'high';
      else if (progress < 0.3) riskLevel = 'medium';

      let recommendation = 'On track for settlement';
      if (riskLevel === 'critical') recommendation = 'URGENT: Switch to Wire transfer or expedite';
      else if (riskLevel === 'high') recommendation = 'Follow up with processing team immediately';
      else if (riskLevel === 'medium') recommendation = 'Monitor closely — may need escalation';

      settlementRisks.push({
        request_id: req.id, client_name: clientName, funding_type: req.funding_type,
        amount, settlement_date: req.settlement_date, days_remaining: daysRemaining,
        current_stage: req.workflow_stage, completion_probability: completionProb,
        risk_level: riskLevel, recommendation,
      });
    }
    settlementRisks.sort((a, b) => a.days_remaining - b.days_remaining);

    // ═══════════════════════════════════════════
    // 4. SMART FUNDING SUGGESTIONS
    // ═══════════════════════════════════════════
    const smartSuggestions: SmartFundingSuggestion[] = [];
    for (const order of pendingOrders) {
      const clientId = order.client_id;
      const clientBalance = balances.find((b: any) => b.client_id === clientId);
      const available = clientBalance ? Number(clientBalance.available_cash) : 0;
      const orderAmount = Number(order.total_amount) || 0;
      const hasActiveFunding = activeRequests.some((r: any) => r.client_id === clientId);
      const client = clients.find((c: any) => c.id === clientId);

      if (orderAmount > available && !hasActiveFunding && client) {
        const shortfall = orderAmount - available;
        let method = 'ACH', reason = 'Cost-effective for standard transfers', settlement = '2 business days';
        let cost: 'low' | 'medium' | 'high' = 'low', urgency = 'Standard';

        if (order.expires_at && daysBetween(new Date(order.expires_at), today) <= 1) {
          method = 'Wire'; reason = 'Order expires soon — Wire ensures same-day settlement';
          settlement = 'Same day'; cost = 'high'; urgency = 'Urgent';
        } else if (shortfall > 5000000) {
          method = 'Wire'; reason = 'Large amount — Wire provides faster confirmation';
          settlement = 'Same day / T+1'; cost = 'medium'; urgency = 'High';
        }

        smartSuggestions.push({
          client_id: clientId, client_name: client.client_name,
          recommended_method: method, reason: `${formatCurrency(shortfall)} shortfall. ${reason}`,
          estimated_settlement: settlement, cost_indicator: cost, urgency,
        });
      }
    }

    // ═══════════════════════════════════════════
    // 5. WITHDRAWAL RISK SCORING (NEW)
    // ═══════════════════════════════════════════
    const withdrawalRiskProfiles: WithdrawalRiskProfile[] = [];
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    const clientPayoutMap = new Map<string, any[]>();
    for (const p of payouts) {
      const list = clientPayoutMap.get(p.client_id) || [];
      list.push(p);
      clientPayoutMap.set(p.client_id, list);
    }

    for (const client of clients) {
      const clientPayouts = clientPayoutMap.get(client.id) || [];
      if (clientPayouts.length === 0) continue;

      const recent30d = clientPayouts.filter((p: any) => new Date(p.requested_date) > thirtyDaysAgo && p.status !== 'Failed');
      const totalAmount30d = recent30d.reduce((s: number, p: any) => s + Number(p.amount), 0);
      const avgWithdrawal = recent30d.length > 0 ? totalAmount30d / recent30d.length : 0;
      const totalAssets = Number(client.total_assets || 0);
      const withdrawalRatio = totalAssets > 0 ? totalAmount30d / totalAssets : 0;
      const bal = balances.find((b: any) => b.client_id === client.id);
      const availCash = Number(bal?.available_cash || 0);

      const flags: string[] = [];
      let riskScore = 0;

      // Frequency-based scoring
      if (recent30d.length >= 5) { riskScore += 30; flags.push('Very frequent withdrawals (5+ in 30d)'); }
      else if (recent30d.length >= 3) { riskScore += 15; flags.push('Frequent withdrawals (3+ in 30d)'); }

      // Amount-based scoring
      if (totalAmount30d >= 2500000) { riskScore += 25; flags.push(`High volume: ${formatCurrency(totalAmount30d)} in 30d`); }
      else if (totalAmount30d >= 1000000) { riskScore += 10; flags.push(`Notable volume: ${formatCurrency(totalAmount30d)} in 30d`); }

      // Ratio to AUM
      if (withdrawalRatio > 0.3) { riskScore += 25; flags.push(`${Math.round(withdrawalRatio * 100)}% of AUM withdrawn in 30d`); }
      else if (withdrawalRatio > 0.1) { riskScore += 10; flags.push(`${Math.round(withdrawalRatio * 100)}% of AUM withdrawn in 30d`); }

      // Cash depletion risk
      if (availCash > 0 && totalAmount30d > availCash * 0.8) { riskScore += 15; flags.push('Withdrawals depleting available cash'); }

      // Increasing trend
      const fifteenDaysAgo = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
      const recentHalf = recent30d.filter((p: any) => new Date(p.requested_date) > fifteenDaysAgo);
      const olderHalf = recent30d.filter((p: any) => new Date(p.requested_date) <= fifteenDaysAgo);
      if (recentHalf.length > olderHalf.length + 1) { riskScore += 10; flags.push('Accelerating withdrawal frequency'); }

      riskScore = Math.min(100, riskScore);

      if (riskScore > 20) {
        let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (riskScore >= 70) riskLevel = 'critical';
        else if (riskScore >= 50) riskLevel = 'high';
        else if (riskScore >= 30) riskLevel = 'medium';

        const frequency = recent30d.length >= 5 ? 'Very High' : recent30d.length >= 3 ? 'High' : recent30d.length >= 2 ? 'Moderate' : 'Low';

        let recommendation = 'Monitor withdrawal pattern';
        if (riskLevel === 'critical') recommendation = 'Immediate advisor intervention — potential client exit';
        else if (riskLevel === 'high') recommendation = 'Schedule client review to understand withdrawal needs';
        else if (riskLevel === 'medium') recommendation = 'Keep an eye on upcoming requests';

        withdrawalRiskProfiles.push({
          client_id: client.id, client_name: client.client_name,
          risk_score: riskScore, risk_level: riskLevel,
          total_withdrawals_30d: recent30d.length, total_amount_30d: totalAmount30d,
          avg_withdrawal: avgWithdrawal, withdrawal_frequency: frequency,
          flags, recommendation,
        });

        // Also add as risk alert if high
        if (riskLevel === 'critical' || riskLevel === 'high') {
          riskAlerts.push({
            type: 'withdrawal_risk', severity: riskLevel,
            title: `Suspicious withdrawal pattern — ${client.client_name}`,
            description: `Risk score: ${riskScore}%. ${flags[0]}.`,
            client_id: client.id, client_name: client.client_name, score: riskScore,
            suggested_action: recommendation,
          });
        }
      }
    }
    withdrawalRiskProfiles.sort((a, b) => b.risk_score - a.risk_score);

    // ═══════════════════════════════════════════
    // 6. CLIENT BEHAVIOR ANALYSIS (NEW)
    // ═══════════════════════════════════════════
    const clientBehaviors: ClientBehavior[] = [];

    for (const client of clients) {
      const clientPayouts = clientPayoutMap.get(client.id) || [];
      const recent90d = clientPayouts.filter((p: any) => new Date(p.requested_date) > ninetyDaysAgo && p.status !== 'Failed');
      if (recent90d.length === 0) continue;

      const totalWithdrawn = recent90d.reduce((s: number, p: any) => s + Number(p.amount), 0);
      const totalAssets = Number(client.total_assets || 0);
      const payoutToAumRatio = totalAssets > 0 ? totalWithdrawn / totalAssets : 0;

      // Calculate avg days between withdrawals
      const sortedDates = recent90d.map((p: any) => new Date(p.requested_date).getTime()).sort((a: number, b: number) => a - b);
      let avgDaysBetween: number | null = null;
      if (sortedDates.length >= 2) {
        const gaps = [];
        for (let i = 1; i < sortedDates.length; i++) {
          gaps.push((sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24));
        }
        avgDaysBetween = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
      }

      // Determine trend
      const first45d = recent90d.filter((p: any) => {
        const d = new Date(p.requested_date);
        return d > ninetyDaysAgo && d <= new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000);
      });
      const last45d = recent90d.filter((p: any) => {
        const d = new Date(p.requested_date);
        return d > new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000);
      });
      const firstAmt = first45d.reduce((s: number, p: any) => s + Number(p.amount), 0);
      const lastAmt = last45d.reduce((s: number, p: any) => s + Number(p.amount), 0);
      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (lastAmt > firstAmt * 1.3) trend = 'increasing';
      else if (lastAmt < firstAmt * 0.7) trend = 'decreasing';

      // Classify pattern
      const signals: string[] = [];
      let pattern: ClientBehavior['pattern'] = 'stable';

      if (recent90d.length >= 6 || (avgDaysBetween !== null && avgDaysBetween < 7)) {
        pattern = 'frequent_withdrawer';
        signals.push(`${recent90d.length} withdrawals in 90d`);
        if (avgDaysBetween !== null) signals.push(`Avg ${avgDaysBetween}d between withdrawals`);
      }

      if (payoutToAumRatio > 0.25) {
        pattern = 'exit_risk';
        signals.push(`${Math.round(payoutToAumRatio * 100)}% of AUM withdrawn`);
      }

      // Early redemption: withdrawals within days of funding completion
      const completedFunding = requests.filter((r: any) => r.client_id === client.id && r.workflow_stage === 'completed');
      const earlyRedemptions = recent90d.filter((p: any) => {
        const payoutDate = new Date(p.requested_date).getTime();
        return completedFunding.some((f: any) => {
          const completedDate = new Date(f.stage_updated_at).getTime();
          return payoutDate - completedDate >= 0 && payoutDate - completedDate < 7 * 24 * 60 * 60 * 1000;
        });
      });
      if (earlyRedemptions.length >= 2) {
        if (pattern === 'stable') pattern = 'early_redeemer';
        signals.push(`${earlyRedemptions.length} withdrawals within 7d of funding`);
      }

      if (trend === 'increasing') signals.push('Withdrawal amounts increasing');
      if (trend === 'decreasing' && pattern === 'stable') { pattern = 'growing'; signals.push('Withdrawals decreasing — positive signal'); }

      clientBehaviors.push({
        client_id: client.id, client_name: client.client_name,
        pattern, withdrawal_count_90d: recent90d.length, total_withdrawn_90d: totalWithdrawn,
        avg_days_between_withdrawals: avgDaysBetween, payout_to_aum_ratio: payoutToAumRatio,
        trend, signals,
      });

      // Behavior alerts
      if (pattern === 'exit_risk') {
        riskAlerts.push({
          type: 'behavior_alert', severity: 'critical',
          title: `Exit risk — ${client.client_name}`,
          description: `${Math.round(payoutToAumRatio * 100)}% of AUM withdrawn in 90d. ${signals.join('. ')}.`,
          client_id: client.id, client_name: client.client_name, score: Math.round(payoutToAumRatio * 100),
          suggested_action: 'Proactive client engagement — schedule review meeting immediately',
        });
      }
    }
    clientBehaviors.sort((a, b) => {
      const order = { exit_risk: 0, frequent_withdrawer: 1, early_redeemer: 2, stable: 3, growing: 4 };
      return (order[a.pattern] ?? 3) - (order[b.pattern] ?? 3);
    });

    // ═══════════════════════════════════════════
    // 7. UPCOMING LARGE PAYOUTS (NEW)
    // ═══════════════════════════════════════════
    const upcomingLargePayouts: UpcomingLargePayout[] = [];
    const largeThreshold = 500000;

    for (const p of activePayouts) {
      const amount = Number(p.amount);
      if (amount < largeThreshold) continue;
      const bal = balances.find((b: any) => b.client_id === p.client_id);
      const cashAvailable = Number(bal?.available_cash || 0);

      upcomingLargePayouts.push({
        payout_id: p.id, client_id: p.client_id,
        client_name: p.clients?.client_name || 'Client',
        amount, payout_type: p.payout_type, status: p.status,
        requested_date: p.requested_date,
        estimated_completion: p.estimated_completion,
        cash_available: cashAvailable,
        coverage_ratio: cashAvailable > 0 ? Math.min(1, cashAvailable / amount) : 0,
      });
    }
    upcomingLargePayouts.sort((a, b) => b.amount - a.amount);

    // ═══════════════════════════════════════════
    // 8. CASH FLOW HEATMAP (NEW)
    // ═══════════════════════════════════════════
    const cashFlowHeatmap: CashFlowHeatmapEntry[] = [];
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (let d = new Date(thirtyDaysAgo); d <= thirtyDaysFromNow; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
      const dateStr = d.toISOString().split('T')[0];

      // Inflows: funding requests completed on this date
      const dayCompletedFunding = requests.filter((r: any) => {
        if (r.workflow_stage !== 'completed') return false;
        const completedDate = new Date(r.stage_updated_at).toISOString().split('T')[0];
        return completedDate === dateStr;
      });
      const inflows = dayCompletedFunding.reduce((s: number, r: any) => s + Number(r.amount), 0);

      // For future dates, use settlement dates as expected inflows
      const dayExpectedFunding = d > today ? activeRequests.filter((r: any) => {
        if (!r.settlement_date) return false;
        return new Date(r.settlement_date).toISOString().split('T')[0] === dateStr;
      }).reduce((s: number, r: any) => s + Number(r.amount), 0) : 0;

      // Outflows: payouts on this date
      const dayPayouts = payouts.filter((p: any) => {
        const pDate = new Date(p.requested_date).toISOString().split('T')[0];
        const completedDate = p.completed_at ? new Date(p.completed_at).toISOString().split('T')[0] : null;
        return pDate === dateStr || completedDate === dateStr;
      });
      const outflows = dayPayouts.reduce((s: number, p: any) => s + Number(p.amount), 0);

      // For future: estimated payouts
      const dayExpectedPayouts = d > today ? activePayouts.filter((p: any) => {
        if (!p.estimated_completion) return false;
        return new Date(p.estimated_completion).toISOString().split('T')[0] === dateStr;
      }).reduce((s: number, p: any) => s + Number(p.amount), 0) : 0;

      const totalInflows = inflows + dayExpectedFunding;
      const totalOutflows = outflows + dayExpectedPayouts;

      const payoutCount = dayPayouts.length + (d > today ? activePayouts.filter((p: any) => p.estimated_completion && new Date(p.estimated_completion).toISOString().split('T')[0] === dateStr).length : 0);
      const fundingCount = dayCompletedFunding.length + (d > today ? activeRequests.filter((r: any) => r.settlement_date && new Date(r.settlement_date).toISOString().split('T')[0] === dateStr).length : 0);

      if (totalInflows > 0 || totalOutflows > 0) {
        cashFlowHeatmap.push({
          date: dateStr, inflows: totalInflows, outflows: totalOutflows,
          net: totalInflows - totalOutflows, payout_count: payoutCount, funding_count: fundingCount,
        });
      }
    }

    // ═══════════════════════════════════════════
    // AI ENHANCEMENT
    // ═══════════════════════════════════════════
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY && (riskAlerts.length > 0 || cashFlowForecasts.some(f => f.shortfall) || withdrawalRiskProfiles.length > 0)) {
      try {
        const topAlerts = riskAlerts.slice(0, 5).map(a => `${a.type}: ${a.title} (${a.severity})`).join('\n');
        const shortfallClients = cashFlowForecasts.filter(f => f.shortfall).map(f => `${f.client_name}: shortfall ${formatCurrency(f.shortfall_amount)}`).join('\n');
        const topRiskyClients = withdrawalRiskProfiles.slice(0, 3).map(w => `${w.client_name}: score ${w.risk_score}, ${w.flags[0]}`).join('\n');
        const exitRisks = clientBehaviors.filter(b => b.pattern === 'exit_risk').map(b => `${b.client_name}: ${Math.round(b.payout_to_aum_ratio * 100)}% AUM withdrawn`).join('\n');

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'system', content: 'You are a financial operations AI advisor. Provide brief, actionable insights. Respond in JSON: { alerts_summary: string, priority_action: string, risk_mitigation: string, behavior_insight: string }' },
              { role: 'user', content: `Analyze funding & payout risks:\n\nRisk Alerts:\n${topAlerts || 'None'}\n\nShortfall Clients:\n${shortfallClients || 'None'}\n\nHigh-Risk Withdrawals:\n${topRiskyClients || 'None'}\n\nExit Risk Clients:\n${exitRisks || 'None'}\n\nActive requests: ${activeRequests.length}, Pending payouts: ${activePayouts.length}` },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.priority_action) {
                  riskAlerts.unshift({
                    type: 'delay_prediction', severity: 'high',
                    title: 'AI Priority Recommendation',
                    description: parsed.priority_action,
                    suggested_action: parsed.risk_mitigation || 'Review all active requests',
                  });
                }
                if (parsed.behavior_insight) {
                  riskAlerts.push({
                    type: 'behavior_alert', severity: 'medium',
                    title: 'AI Behavior Insight',
                    description: parsed.behavior_insight,
                    suggested_action: 'Review client engagement strategy',
                  });
                }
              }
            } catch { /* JSON parse failed */ }
          }
        }
      } catch (e) {
        console.error('AI enhancement failed:', e);
      }
    }

    const highRiskCount = riskAlerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

    const output: FundingAIOutput = {
      risk_alerts: riskAlerts,
      cash_flow_forecasts: cashFlowForecasts.sort((a, b) => (b.shortfall ? 1 : 0) - (a.shortfall ? 1 : 0)),
      settlement_risks: settlementRisks,
      smart_suggestions: smartSuggestions,
      withdrawal_risk_profiles: withdrawalRiskProfiles,
      client_behaviors: clientBehaviors,
      upcoming_large_payouts: upcomingLargePayouts,
      cash_flow_heatmap: cashFlowHeatmap,
      summary: {
        total_active_requests: activeRequests.length,
        high_risk_count: highRiskCount,
        shortfall_clients: cashFlowForecasts.filter(f => f.shortfall).length,
        total_pending_amount: activeRequests.reduce((s: number, r: any) => s + Number(r.amount), 0),
        avg_completion_probability: settlementRisks.length > 0 ? Math.round(settlementRisks.reduce((s, r) => s + r.completion_probability, 0) / settlementRisks.length) : 100,
        large_movements_flagged: riskAlerts.filter(a => a.type === 'large_movement').length,
        high_risk_withdrawals: withdrawalRiskProfiles.filter(w => w.risk_level === 'critical' || w.risk_level === 'high').length,
        exit_risk_clients: clientBehaviors.filter(b => b.pattern === 'exit_risk').length,
        upcoming_large_payout_total: upcomingLargePayouts.reduce((s, p) => s + p.amount, 0),
      },
      generated_at: new Date().toISOString(),
    };

    console.log(`Funding AI complete: ${riskAlerts.length} alerts, ${withdrawalRiskProfiles.length} risk profiles, ${clientBehaviors.length} behaviors`);

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Funding AI error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
