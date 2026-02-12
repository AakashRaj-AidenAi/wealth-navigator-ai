import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FundingRiskAlert {
  type: 'delay_prediction' | 'failed_risk' | 'large_movement' | 'reconciliation_anomaly' | 'settlement_risk';
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

interface FundingAIOutput {
  risk_alerts: FundingRiskAlert[];
  cash_flow_forecasts: CashFlowForecast[];
  settlement_risks: SettlementRisk[];
  smart_suggestions: SmartFundingSuggestion[];
  summary: {
    total_active_requests: number;
    high_risk_count: number;
    shortfall_clients: number;
    total_pending_amount: number;
    avg_completion_probability: number;
    large_movements_flagged: number;
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

// Stage progression weights for completion probability
const STAGE_PROGRESS: Record<string, Record<string, number>> = {
  ACH: { initiated: 0.1, bank_verification: 0.3, processing: 0.7, completed: 1.0, failed: 0 },
  Wire: { initiated: 0.15, manual_confirmation: 0.4, processing: 0.75, completed: 1.0, failed: 0 },
  TOA: { initiated: 0.05, transfer_requested: 0.2, broker_review: 0.4, in_transit: 0.7, completed: 1.0, failed: 0 },
};

// Expected days per type
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

    // Fetch all funding data
    const [requestsRes, balancesRes, historyRes, alertsRes, ordersRes, clientsRes] = await Promise.all([
      supabase.from('funding_requests').select('*, clients(client_name)').eq('initiated_by', advisorId).order('created_at', { ascending: false }),
      supabase.from('cash_balances').select('*, clients(client_name)').eq('advisor_id', advisorId),
      supabase.from('funding_status_history').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('funding_alerts').select('*').eq('advisor_id', advisorId).eq('is_resolved', false),
      supabase.from('orders').select('*').in('status', ['pending', 'partially_filled']),
      supabase.from('clients').select('id, client_name, total_assets').eq('advisor_id', advisorId),
    ]);

    const requests = requestsRes.data || [];
    const balances = balancesRes.data || [];
    const history = historyRes.data || [];
    const existingAlerts = alertsRes.data || [];
    const pendingOrders = ordersRes.data || [];
    const clients = clientsRes.data || [];

    const activeRequests = requests.filter((r: any) => r.workflow_stage !== 'completed' && r.workflow_stage !== 'failed');

    // 1. FUNDING DELAY PREDICTION & FAILED RISK
    const riskAlerts: FundingRiskAlert[] = [];

    for (const req of activeRequests) {
      const clientName = req.clients?.client_name || 'Client';
      const amount = Number(req.amount);
      const daysSinceCreated = daysBetween(today, new Date(req.created_at));
      const daysSinceStageUpdate = daysBetween(today, new Date(req.stage_updated_at));
      const expectedDays = EXPECTED_DAYS[req.funding_type] || 3;
      const progress = STAGE_PROGRESS[req.funding_type]?.[req.workflow_stage] ?? 0.1;

      // Delay prediction: if taking longer than expected given stage
      const expectedProgressByNow = Math.min(daysSinceCreated / expectedDays, 1);
      const delayScore = Math.max(0, Math.round((expectedProgressByNow - progress) * 100));

      if (delayScore > 30) {
        riskAlerts.push({
          type: 'delay_prediction',
          severity: delayScore > 70 ? 'critical' : delayScore > 50 ? 'high' : 'medium',
          title: `${req.funding_type} likely delayed — ${clientName}`,
          description: `${formatCurrency(amount)} request at "${req.workflow_stage}" stage for ${daysSinceCreated} days (expected ${expectedDays} days). Delay likelihood: ${delayScore}%.`,
          client_id: req.client_id,
          client_name: clientName,
          request_id: req.id,
          amount,
          score: delayScore,
          suggested_action: daysSinceStageUpdate > 2 ? 'Contact bank/broker for status update' : 'Monitor — stage update may be pending',
        });
      }

      // Failed risk: stagnant stage + historical failure patterns
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
          title: `Failure risk detected — ${clientName}`,
          description: `${formatCurrency(amount)} ${req.funding_type} has ${failedRiskScore}% failure risk. Stage "${req.workflow_stage}" unchanged for ${daysSinceStageUpdate} days.`,
          client_id: req.client_id,
          client_name: clientName,
          request_id: req.id,
          amount,
          score: failedRiskScore,
          suggested_action: failedRiskScore > 60 ? 'Escalate immediately — consider alternate funding method' : 'Follow up with processing team',
        });
      }

      // Large movement detection
      if (amount >= 2500000) {
        riskAlerts.push({
          type: 'large_movement',
          severity: amount >= 10000000 ? 'critical' : amount >= 5000000 ? 'high' : 'medium',
          title: `Large cash movement — ${clientName}`,
          description: `${formatCurrency(amount)} ${req.funding_type} transfer flagged as large movement. Ensure compliance verification.`,
          client_id: req.client_id,
          client_name: clientName,
          request_id: req.id,
          amount,
          score: Math.min(100, Math.round((amount / 10000000) * 100)),
          suggested_action: 'Verify source of funds and ensure AML compliance',
        });
      }
    }

    // Reconciliation anomaly: completed requests where cash balance doesn't reflect
    const completedRecent = requests.filter((r: any) => r.workflow_stage === 'completed' && daysBetween(today, new Date(r.stage_updated_at)) <= 3);
    for (const req of completedRecent) {
      const clientBalance = balances.find((b: any) => b.client_id === req.client_id);
      if (clientBalance && Number(clientBalance.pending_cash) > Number(req.amount) * 0.5) {
        riskAlerts.push({
          type: 'reconciliation_anomaly',
          severity: 'high',
          title: `Reconciliation mismatch — ${req.clients?.client_name || 'Client'}`,
          description: `${formatCurrency(Number(req.amount))} completed but pending cash (${formatCurrency(Number(clientBalance.pending_cash))}) still high. Possible double-booking or delayed settlement.`,
          client_id: req.client_id,
          client_name: req.clients?.client_name || 'Client',
          request_id: req.id,
          amount: Number(req.amount),
          suggested_action: 'Reconcile cash balances and verify bank confirmation',
        });
      }
    }

    // 2. CASH FLOW FORECASTS
    const cashFlowForecasts: CashFlowForecast[] = [];
    for (const bal of balances) {
      const clientName = bal.clients?.client_name || 'Client';
      const available = Number(bal.available_cash);
      const pending = Number(bal.pending_cash);

      // Project inflows from active funding requests
      const clientActiveReqs = activeRequests.filter((r: any) => r.client_id === bal.client_id);
      const projectedInflow = clientActiveReqs.reduce((s: number, r: any) => s + Number(r.amount), 0);

      // Project outflows from pending orders
      const clientPendingOrders = pendingOrders.filter((o: any) => o.client_id === bal.client_id);
      const projectedOutflow = clientPendingOrders.reduce((s: number, o: any) => s + (Number(o.total_amount) || 0), 0);

      const projectedBalance = available + projectedInflow - projectedOutflow;
      const shortfall = projectedBalance < 0;
      const shortfallAmount = shortfall ? Math.abs(projectedBalance) : 0;

      // Estimate days until shortfall based on burn rate
      let daysUntilShortfall: number | null = null;
      if (projectedOutflow > 0 && available > 0) {
        const dailyBurn = projectedOutflow / 5; // assume 5-day window
        if (dailyBurn > 0 && available / dailyBurn < 30) {
          daysUntilShortfall = Math.round(available / dailyBurn);
        }
      }

      let recommendation = 'Cash position healthy';
      if (shortfall) {
        recommendation = `Shortfall of ${formatCurrency(shortfallAmount)} projected. Initiate ${shortfallAmount > 1000000 ? 'Wire' : 'ACH'} funding immediately.`;
      } else if (daysUntilShortfall !== null && daysUntilShortfall < 7) {
        recommendation = `Cash may deplete in ~${daysUntilShortfall} days. Plan funding ahead.`;
      } else if (available > 5000000 && projectedOutflow === 0) {
        recommendation = 'Large idle cash — consider deploying into investments.';
      }

      cashFlowForecasts.push({
        client_id: bal.client_id,
        client_name: clientName,
        current_available: available,
        current_pending: pending,
        projected_inflow: projectedInflow,
        projected_outflow: projectedOutflow,
        projected_balance: projectedBalance,
        shortfall,
        shortfall_amount: shortfallAmount,
        days_until_shortfall: daysUntilShortfall,
        recommendation,
      });
    }

    // 3. SETTLEMENT RISKS
    const settlementRisks: SettlementRisk[] = [];
    for (const req of activeRequests) {
      if (!req.settlement_date) continue;
      const clientName = req.clients?.client_name || 'Client';
      const amount = Number(req.amount);
      const settlementDate = new Date(req.settlement_date);
      const daysRemaining = daysBetween(settlementDate, today);
      const progress = STAGE_PROGRESS[req.funding_type]?.[req.workflow_stage] ?? 0.1;

      // Completion probability based on stage progress vs time remaining
      let completionProb = Math.round(progress * 100);
      if (daysRemaining < 0) {
        completionProb = Math.max(5, completionProb - 30); // overdue penalty
      } else if (daysRemaining === 0) {
        completionProb = Math.max(10, completionProb - 15);
      } else if (daysRemaining <= 1 && progress < 0.7) {
        completionProb = Math.max(15, completionProb - 10);
      }

      let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (daysRemaining < 0) riskLevel = 'critical';
      else if (daysRemaining === 0 && progress < 0.7) riskLevel = 'critical';
      else if (daysRemaining <= 1 && progress < 0.5) riskLevel = 'high';
      else if (daysRemaining <= 2 && progress < 0.3) riskLevel = 'high';
      else if (progress < 0.3) riskLevel = 'medium';

      let recommendation = 'On track for settlement';
      if (riskLevel === 'critical') recommendation = 'URGENT: Switch to Wire transfer or expedite current process';
      else if (riskLevel === 'high') recommendation = 'Follow up with processing team immediately';
      else if (riskLevel === 'medium') recommendation = 'Monitor closely — may need escalation';

      settlementRisks.push({
        request_id: req.id,
        client_name: clientName,
        funding_type: req.funding_type,
        amount,
        settlement_date: req.settlement_date,
        days_remaining: daysRemaining,
        current_stage: req.workflow_stage,
        completion_probability: completionProb,
        risk_level: riskLevel,
        recommendation,
      });
    }
    settlementRisks.sort((a, b) => a.days_remaining - b.days_remaining);

    // 4. SMART FUNDING SUGGESTIONS — for clients with pending orders but no active funding
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
        let method = 'ACH';
        let reason = 'Cost-effective for standard transfers';
        let settlement = '2 business days';
        let cost: 'low' | 'medium' | 'high' = 'low';
        let urgency = 'Standard';

        if (order.expires_at && daysBetween(new Date(order.expires_at), today) <= 1) {
          method = 'Wire';
          reason = 'Order expires soon — Wire ensures same-day settlement';
          settlement = 'Same day';
          cost = 'high';
          urgency = 'Urgent';
        } else if (shortfall > 5000000) {
          method = 'Wire';
          reason = 'Large amount — Wire provides faster confirmation and tracking';
          settlement = 'Same day / T+1';
          cost = 'medium';
          urgency = 'High';
        }

        smartSuggestions.push({
          client_id: clientId,
          client_name: client.client_name,
          recommended_method: method,
          reason: `${formatCurrency(shortfall)} shortfall for pending order. ${reason}`,
          estimated_settlement: settlement,
          cost_indicator: cost,
          urgency,
        });
      }
    }

    // AI enhancement with Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY && (riskAlerts.length > 0 || cashFlowForecasts.some(f => f.shortfall))) {
      try {
        const topAlerts = riskAlerts.slice(0, 5).map(a => `${a.type}: ${a.title} (${a.severity})`).join('\n');
        const shortfallClients = cashFlowForecasts.filter(f => f.shortfall).map(f => `${f.client_name}: shortfall ${formatCurrency(f.shortfall_amount)}`).join('\n');

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'system', content: 'You are a financial operations AI advisor. Provide brief, actionable insights for a wealth management advisor. Respond in JSON with fields: { alerts_summary: string, priority_action: string, risk_mitigation: string }' },
              { role: 'user', content: `Analyze these funding risks and provide recommendations:\n\nRisk Alerts:\n${topAlerts || 'None'}\n\nCash Shortfall Clients:\n${shortfallClients || 'None'}\n\nActive requests: ${activeRequests.length}, Total pending: ${formatCurrency(activeRequests.reduce((s: number, r: any) => s + Number(r.amount), 0))}` },
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
                // Inject AI summary as a top-level alert
                if (parsed.priority_action) {
                  riskAlerts.unshift({
                    type: 'delay_prediction',
                    severity: 'high',
                    title: 'AI Priority Recommendation',
                    description: parsed.priority_action,
                    suggested_action: parsed.risk_mitigation || 'Review all active funding requests',
                  });
                }
              }
            } catch { /* JSON parse failed — skip */ }
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
      summary: {
        total_active_requests: activeRequests.length,
        high_risk_count: highRiskCount,
        shortfall_clients: cashFlowForecasts.filter(f => f.shortfall).length,
        total_pending_amount: activeRequests.reduce((s: number, r: any) => s + Number(r.amount), 0),
        avg_completion_probability: settlementRisks.length > 0 ? Math.round(settlementRisks.reduce((s, r) => s + r.completion_probability, 0) / settlementRisks.length) : 100,
        large_movements_flagged: riskAlerts.filter(a => a.type === 'large_movement').length,
      },
      generated_at: new Date().toISOString(),
    };

    console.log(`Funding AI scan complete: ${riskAlerts.length} alerts, ${cashFlowForecasts.length} forecasts, ${settlementRisks.length} settlement risks`);

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Funding AI error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
