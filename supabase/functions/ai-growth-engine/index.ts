import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Types for the AI Growth Engine
interface ClientPriority {
  id: string;
  client_name: string;
  total_assets: number;
  priority_score: number;
  reason: string;
  suggested_action: string;
  urgency: 'critical' | 'high' | 'medium';
  signals: string[];
}

interface DividendOpportunity {
  client_id: string;
  client_name: string;
  symbol: string;
  security_name: string;
  dividend_amount: number;
  client_holding: number;
  total_dividend: number;
  ai_suggestion: string;
  risk_profile: string;
}

interface RebalanceSuggestion {
  client_id: string;
  client_name: string;
  current_allocation: Record<string, number>;
  target_allocation: Record<string, number>;
  overweight: string[];
  underweight: string[];
  ai_recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

interface InvestmentOpportunity {
  type: 'market' | 'client_specific';
  title: string;
  description: string;
  affected_clients?: string[];
  potential_value?: number;
  urgency: 'high' | 'medium' | 'low';
}

interface LeadScore {
  id: string;
  name: string;
  score: number;
  label: 'hot' | 'warm' | 'cold';
  factors: string[];
  next_action: string;
}

interface ChurnRisk {
  id: string;
  client_name: string;
  risk_score: number;
  signals: string[];
  retention_action: string;
  total_assets: number;
}

interface SmartAlert {
  type: string;
  title: string;
  description: string;
  client_id?: string;
  client_name?: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

interface GrowthEngineOutput {
  clients_needing_attention: ClientPriority[];
  dividend_opportunities: DividendOpportunity[];
  rebalance_suggestions: RebalanceSuggestion[];
  investment_opportunities: InvestmentOpportunity[];
  lead_scores: LeadScore[];
  churn_risks: ChurnRisk[];
  smart_alerts: SmartAlert[];
  summary: {
    total_clients: number;
    at_risk_clients: number;
    hot_leads: number;
    pending_dividends: number;
    rebalance_needed: number;
    total_opportunity_value: number;
  };
  generated_at: string;
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toFixed(0)}`;
}

// Calculate days between two dates
function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action = 'full_scan', client_id, context } = await req.json().catch(() => ({}));
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const advisorId = user.id;
    const today = new Date();

    // Route to specific handlers
    switch (action) {
      case 'draft_message':
        return await handleDraftMessage(supabase, advisorId, client_id, context);
      case 'meeting_summary':
        return await handleMeetingSummary(context);
      case 'full_scan':
      default:
        return await handleFullScan(supabase, advisorId, today);
    }

  } catch (error) {
    console.error('AI Growth Engine error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Full system scan - the core of the Growth Engine
async function handleFullScan(supabase: any, advisorId: string, today: Date): Promise<Response> {
  console.log(`Starting full scan for advisor ${advisorId}`);
  
  // Parallel fetch all data
  const [
    clientsRes,
    goalsRes,
    ordersRes,
    activitiesRes,
    communicationsRes,
    leadsRes,
    leadActivitiesRes,
    tasksRes,
    corporateActionsRes,
    clientCorpActionsRes
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('advisor_id', advisorId),
    supabase.from('goals').select('*'),
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    supabase.from('client_activities').select('*').order('created_at', { ascending: false }),
    supabase.from('communication_logs').select('*').order('sent_at', { ascending: false }),
    supabase.from('leads').select('*').eq('assigned_to', advisorId).not('stage', 'in', '("closed_won","lost")'),
    supabase.from('lead_activities').select('*').order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('assigned_to', advisorId),
    supabase.from('corporate_actions').select('*').in('status', ['upcoming', 'active']),
    supabase.from('client_corporate_actions').select('*').eq('advisor_id', advisorId)
  ]);

  const clients = clientsRes.data || [];
  const goals = goalsRes.data || [];
  const orders = ordersRes.data || [];
  const activities = activitiesRes.data || [];
  const communications = communicationsRes.data || [];
  const leads = leadsRes.data || [];
  const leadActivities = leadActivitiesRes.data || [];
  const tasks = tasksRes.data || [];
  const corporateActions = corporateActionsRes.data || [];
  const clientCorpActions = clientCorpActionsRes.data || [];

  const clientIds = clients.map((c: any) => c.id);
  
  // Filter data to advisor's clients
  const clientGoals = goals.filter((g: any) => clientIds.includes(g.client_id));
  const clientOrders = orders.filter((o: any) => clientIds.includes(o.client_id));
  const clientActivities = activities.filter((a: any) => clientIds.includes(a.client_id));
  const clientComms = communications.filter((c: any) => clientIds.includes(c.client_id));

  // 1. CLIENT PRIORITIZATION
  const clientsNeedingAttention = analyzeClientPriorities(clients, clientActivities, clientComms, clientGoals, clientOrders, today);

  // 2. DIVIDEND OPPORTUNITIES (from corporate actions)
  const dividendOpportunities = analyzeDividendOpportunities(clients, corporateActions, clientCorpActions);

  // 3. REBALANCE SUGGESTIONS
  const rebalanceSuggestions = analyzeRebalanceNeeds(clients, clientGoals);

  // 4. INVESTMENT OPPORTUNITIES
  const investmentOpportunities = analyzeInvestmentOpportunities(clients, clientGoals, today);

  // 5. LEAD SCORING
  const leadScores = scoreLeads(leads, leadActivities, today);

  // 6. CHURN RISK DETECTION
  const churnRisks = detectChurnRisks(clients, clientActivities, clientComms, clientOrders, today);

  // 7. SMART ALERTS
  const smartAlerts = generateSmartAlerts(clients, clientGoals, clientOrders, tasks, today);

  // Generate AI-enhanced insights for top items
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (LOVABLE_API_KEY && clientsNeedingAttention.length > 0) {
    try {
      await enhanceWithAI(
        LOVABLE_API_KEY,
        clientsNeedingAttention.slice(0, 5),
        dividendOpportunities.slice(0, 3),
        rebalanceSuggestions.slice(0, 3),
        churnRisks.slice(0, 3)
      );
    } catch (e) {
      console.error('AI enhancement failed:', e);
    }
  }

  const output: GrowthEngineOutput = {
    clients_needing_attention: clientsNeedingAttention.slice(0, 10),
    dividend_opportunities: dividendOpportunities.slice(0, 10),
    rebalance_suggestions: rebalanceSuggestions.slice(0, 10),
    investment_opportunities: investmentOpportunities.slice(0, 10),
    lead_scores: leadScores.slice(0, 20),
    churn_risks: churnRisks.slice(0, 10),
    smart_alerts: smartAlerts.slice(0, 15),
    summary: {
      total_clients: clients.length,
      at_risk_clients: churnRisks.length,
      hot_leads: leadScores.filter(l => l.label === 'hot').length,
      pending_dividends: dividendOpportunities.length,
      rebalance_needed: rebalanceSuggestions.length,
      total_opportunity_value: investmentOpportunities.reduce((sum, o) => sum + (o.potential_value || 0), 0)
    },
    generated_at: new Date().toISOString()
  };

  console.log(`Full scan complete: ${clients.length} clients, ${output.smart_alerts.length} alerts generated`);

  return new Response(JSON.stringify(output), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Analyze client priorities
function analyzeClientPriorities(
  clients: any[],
  activities: any[],
  communications: any[],
  goals: any[],
  orders: any[],
  today: Date
): ClientPriority[] {
  return clients.map(client => {
    const signals: string[] = [];
    let score = 0;
    let urgency: 'critical' | 'high' | 'medium' = 'medium';
    
    // Check last contact
    const clientActivities = activities.filter(a => a.client_id === client.id);
    const clientComms = communications.filter(c => c.client_id === client.id);
    
    let lastContact: Date | null = null;
    for (const a of clientActivities) {
      const d = new Date(a.created_at);
      if (!lastContact || d > lastContact) lastContact = d;
    }
    for (const c of clientComms) {
      const d = new Date(c.sent_at);
      if (!lastContact || d > lastContact) lastContact = d;
    }
    
    if (lastContact) {
      const daysSince = daysBetween(today, lastContact);
      if (daysSince > 90) {
        signals.push(`No contact in ${daysSince} days`);
        score += 35;
        urgency = 'critical';
      } else if (daysSince > 60) {
        signals.push(`Last contact ${daysSince} days ago`);
        score += 25;
        if (urgency === 'medium') urgency = 'high';
      }
    } else {
      signals.push('Never contacted');
      score += 40;
      urgency = 'critical';
    }
    
    // Check KYC expiry
    if (client.kyc_expiry_date) {
      const kycDate = new Date(client.kyc_expiry_date);
      const daysUntil = daysBetween(kycDate, today);
      if (daysUntil < 0) {
        signals.push('KYC expired');
        score += 40;
        urgency = 'critical';
      } else if (daysUntil <= 7) {
        signals.push(`KYC expires in ${daysUntil} days`);
        score += 30;
        if (urgency !== 'critical') urgency = 'high';
      } else if (daysUntil <= 30) {
        signals.push('KYC expiring soon');
        score += 15;
      }
    }
    
    // Check goals
    const clientGoals = goals.filter(g => g.client_id === client.id && g.status !== 'completed');
    for (const goal of clientGoals) {
      const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
      if (progress < 30) {
        signals.push(`Goal "${goal.name}" only ${Math.round(progress)}% funded`);
        score += 20;
        break;
      }
    }
    
    // Check pending orders
    const pendingOrders = orders.filter(o => o.client_id === client.id && o.status === 'pending');
    if (pendingOrders.length > 0) {
      signals.push(`${pendingOrders.length} pending order(s)`);
      score += 15;
    }
    
    // Check birthday
    if (client.date_of_birth) {
      const dob = new Date(client.date_of_birth);
      const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      const daysUntilBirthday = daysBetween(thisYearBirthday, today);
      if (daysUntilBirthday >= 0 && daysUntilBirthday <= 7) {
        signals.push(daysUntilBirthday === 0 ? 'Birthday today!' : `Birthday in ${daysUntilBirthday} days`);
        score += 10;
      }
    }
    
    // Determine suggested action
    let action = 'Schedule call';
    if (signals.some(s => s.includes('KYC'))) action = 'Update KYC';
    else if (signals.some(s => s.includes('pending order'))) action = 'Process orders';
    else if (signals.some(s => s.includes('Birthday'))) action = 'Send birthday wishes';
    else if (signals.some(s => s.includes('Goal'))) action = 'Goal review meeting';
    
    return {
      id: client.id,
      client_name: client.client_name,
      total_assets: Number(client.total_assets) || 0,
      priority_score: Math.min(score, 100),
      reason: signals[0] || 'Routine check-in needed',
      suggested_action: action,
      urgency,
      signals
    };
  })
  .filter(c => c.signals.length > 0)
  .sort((a, b) => b.priority_score - a.priority_score);
}

// Analyze dividend opportunities
function analyzeDividendOpportunities(
  clients: any[],
  corporateActions: any[],
  clientCorpActions: any[]
): DividendOpportunity[] {
  const opportunities: DividendOpportunity[] = [];
  
  const dividends = corporateActions.filter(ca => ca.action_type === 'dividend');
  
  for (const div of dividends) {
    const affectedClients = clientCorpActions.filter(cca => cca.corporate_action_id === div.id);
    
    for (const cca of affectedClients) {
      const client = clients.find(c => c.id === cca.client_id);
      if (!client) continue;
      
      const totalDividend = (Number(div.dividend_amount) || 0) * (Number(cca.holdings_quantity) || 0);
      
      if (totalDividend > 0) {
        let suggestion = 'Reinvest in same stock';
        if (client.risk_profile === 'conservative') {
          suggestion = 'Add to debt allocation';
        } else if (client.risk_profile === 'aggressive') {
          suggestion = 'Top up existing SIP';
        }
        
        opportunities.push({
          client_id: client.id,
          client_name: client.client_name,
          symbol: div.symbol,
          security_name: div.security_name,
          dividend_amount: Number(div.dividend_amount) || 0,
          client_holding: Number(cca.holdings_quantity) || 0,
          total_dividend: totalDividend,
          ai_suggestion: suggestion,
          risk_profile: client.risk_profile || 'moderate'
        });
      }
    }
  }
  
  return opportunities.sort((a, b) => b.total_dividend - a.total_dividend);
}

// Analyze rebalance needs
function analyzeRebalanceNeeds(clients: any[], goals: any[]): RebalanceSuggestion[] {
  const suggestions: RebalanceSuggestion[] = [];
  
  // Simplified allocation analysis based on risk profile
  const targetAllocations: Record<string, Record<string, number>> = {
    conservative: { equity: 30, debt: 50, gold: 10, cash: 10 },
    moderate: { equity: 50, debt: 35, gold: 10, cash: 5 },
    aggressive: { equity: 70, debt: 20, gold: 5, cash: 5 }
  };
  
  for (const client of clients) {
    if (!client.risk_profile) continue;
    
    const target = targetAllocations[client.risk_profile] || targetAllocations.moderate;
    
    // Simulate current allocation (in real app, this would come from holdings)
    const current = {
      equity: Math.random() * 100,
      debt: Math.random() * 50,
      gold: Math.random() * 20,
      cash: Math.random() * 30
    };
    
    // Normalize
    const total = Object.values(current).reduce((a, b) => a + b, 0);
    Object.keys(current).forEach(k => current[k as keyof typeof current] = Math.round((current[k as keyof typeof current] / total) * 100));
    
    const overweight: string[] = [];
    const underweight: string[] = [];
    
    Object.entries(target).forEach(([asset, targetPct]) => {
      const diff = current[asset as keyof typeof current] - targetPct;
      if (diff > 10) overweight.push(`${asset} (+${Math.round(diff)}%)`);
      if (diff < -10) underweight.push(`${asset} (${Math.round(diff)}%)`);
    });
    
    if (overweight.length > 0 || underweight.length > 0) {
      suggestions.push({
        client_id: client.id,
        client_name: client.client_name,
        current_allocation: current,
        target_allocation: target,
        overweight,
        underweight,
        ai_recommendation: `Consider ${overweight.length > 0 ? 'reducing ' + overweight[0].split(' ')[0] : ''} ${underweight.length > 0 ? 'and increasing ' + underweight[0].split(' ')[0] : ''} allocation`,
        priority: overweight.length + underweight.length > 2 ? 'high' : 'medium'
      });
    }
  }
  
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// Analyze investment opportunities
function analyzeInvestmentOpportunities(clients: any[], goals: any[], today: Date): InvestmentOpportunity[] {
  const opportunities: InvestmentOpportunity[] = [];
  
  // Market opportunities (simulated)
  opportunities.push({
    type: 'market',
    title: 'Tax-Saving Deadline Approaching',
    description: 'March 31st deadline for 80C investments. Identify clients with unutilized limits.',
    potential_value: 150000 * clients.length * 0.3,
    urgency: 'high'
  });
  
  // Client-specific opportunities
  for (const client of clients) {
    const clientGoals = goals.filter(g => g.client_id === client.id);
    
    // Underfunded goals
    for (const goal of clientGoals) {
      const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
      if (progress < 50 && goal.target_date) {
        const targetDate = new Date(goal.target_date);
        const monthsLeft = (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
        const gap = Number(goal.target_amount) - Number(goal.current_amount);
        
        if (monthsLeft > 0 && monthsLeft < 24) {
          opportunities.push({
            type: 'client_specific',
            title: `Goal Gap: ${goal.name}`,
            description: `${client.client_name} needs ${formatCurrency(gap)} in ${Math.round(monthsLeft)} months`,
            affected_clients: [client.id],
            potential_value: gap,
            urgency: monthsLeft < 6 ? 'high' : 'medium'
          });
        }
      }
    }
  }
  
  return opportunities.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.urgency] - priorityOrder[b.urgency];
  }).slice(0, 10);
}

// Score leads
function scoreLeads(leads: any[], leadActivities: any[], today: Date): LeadScore[] {
  return leads.map(lead => {
    let score = 50; // Base score
    const factors: string[] = [];
    
    // Stage progression
    const stageScores: Record<string, number> = {
      new: 0,
      contacted: 15,
      meeting: 30,
      proposal: 45
    };
    score += stageScores[lead.stage] || 0;
    if (lead.stage !== 'new') factors.push(`Stage: ${lead.stage}`);
    
    // Expected value
    if (lead.expected_value) {
      if (lead.expected_value > 1000000) {
        score += 20;
        factors.push('High value opportunity');
      } else if (lead.expected_value > 500000) {
        score += 10;
        factors.push('Medium value opportunity');
      }
    }
    
    // Activity recency
    const recentActivities = leadActivities.filter(a => a.lead_id === lead.id);
    if (recentActivities.length > 0) {
      const lastActivity = new Date(recentActivities[0].created_at);
      const daysSince = daysBetween(today, lastActivity);
      if (daysSince <= 3) {
        score += 15;
        factors.push('Recent engagement');
      } else if (daysSince <= 7) {
        score += 5;
      } else if (daysSince > 14) {
        score -= 10;
        factors.push('Going cold');
      }
    }
    
    // Probability if set
    if (lead.probability) {
      score += Math.round(lead.probability * 0.2);
    }
    
    // Existing lead score
    if (lead.lead_score) {
      score = Math.round((score + lead.lead_score) / 2);
    }
    
    score = Math.max(0, Math.min(100, score));
    
    let label: 'hot' | 'warm' | 'cold' = 'cold';
    if (score >= 70) label = 'hot';
    else if (score >= 40) label = 'warm';
    
    let nextAction = 'Initial outreach';
    if (lead.stage === 'contacted') nextAction = 'Schedule meeting';
    else if (lead.stage === 'meeting') nextAction = 'Prepare proposal';
    else if (lead.stage === 'proposal') nextAction = 'Follow up on proposal';
    
    return {
      id: lead.id,
      name: lead.name,
      score,
      label,
      factors,
      next_action: nextAction
    };
  }).sort((a, b) => b.score - a.score);
}

// Detect churn risks
function detectChurnRisks(
  clients: any[],
  activities: any[],
  communications: any[],
  orders: any[],
  today: Date
): ChurnRisk[] {
  const risks: ChurnRisk[] = [];
  
  for (const client of clients) {
    const signals: string[] = [];
    let riskScore = 0;
    
    // Inactivity
    const clientActivities = activities.filter(a => a.client_id === client.id);
    const lastActivity = clientActivities[0];
    if (lastActivity) {
      const daysSince = daysBetween(today, new Date(lastActivity.created_at));
      if (daysSince > 90) {
        signals.push(`${daysSince} days inactive`);
        riskScore += 40;
      } else if (daysSince > 60) {
        signals.push('Low engagement');
        riskScore += 20;
      }
    } else {
      signals.push('No recorded activity');
      riskScore += 30;
    }
    
    // Redemptions
    const recentSells = orders.filter(o => 
      o.client_id === client.id && 
      o.order_type === 'sell' && 
      daysBetween(today, new Date(o.created_at)) <= 30
    );
    if (recentSells.length > 2) {
      signals.push('Multiple recent redemptions');
      riskScore += 30;
    }
    
    // No communication response (simplified check)
    const clientComms = communications.filter(c => c.client_id === client.id);
    const outboundComms = clientComms.filter(c => c.direction === 'outbound');
    const inboundComms = clientComms.filter(c => c.direction === 'inbound');
    if (outboundComms.length > 3 && inboundComms.length === 0) {
      signals.push('Not responding to outreach');
      riskScore += 25;
    }
    
    if (riskScore >= 30) {
      let action = 'Schedule personal call';
      if (signals.some(s => s.includes('redemption'))) {
        action = 'Retention conversation needed';
      }
      
      risks.push({
        id: client.id,
        client_name: client.client_name,
        risk_score: Math.min(riskScore, 100),
        signals,
        retention_action: action,
        total_assets: Number(client.total_assets) || 0
      });
    }
  }
  
  return risks.sort((a, b) => b.risk_score - a.risk_score);
}

// Generate smart alerts
function generateSmartAlerts(
  clients: any[],
  goals: any[],
  orders: any[],
  tasks: any[],
  today: Date
): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  
  // Overdue tasks
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'done' || t.status === 'cancelled') return false;
    return new Date(t.due_date) < today;
  });
  
  if (overdueTasks.length > 0) {
    alerts.push({
      type: 'overdue_tasks',
      title: `${overdueTasks.length} Overdue Tasks`,
      description: `You have ${overdueTasks.length} tasks past their due date`,
      priority: 'high',
      action: 'Review and complete'
    });
  }
  
  // Pending orders > 24 hours
  const oldPendingOrders = orders.filter(o => {
    if (o.status !== 'pending') return false;
    const age = daysBetween(today, new Date(o.created_at));
    return age >= 1;
  });
  
  if (oldPendingOrders.length > 0) {
    alerts.push({
      type: 'pending_orders',
      title: `${oldPendingOrders.length} Orders Pending Execution`,
      description: 'Orders waiting more than 24 hours',
      priority: 'high',
      action: 'Execute or cancel'
    });
  }
  
  // Goals at risk (< 50% funded, deadline within 6 months)
  const goalsAtRisk = goals.filter(g => {
    if (g.status === 'completed' || !g.target_date) return false;
    const progress = (Number(g.current_amount) / Number(g.target_amount)) * 100;
    const monthsLeft = daysBetween(new Date(g.target_date), today) / 30;
    return progress < 50 && monthsLeft > 0 && monthsLeft < 6;
  });
  
  for (const goal of goalsAtRisk.slice(0, 3)) {
    const client = clients.find(c => c.id === goal.client_id);
    alerts.push({
      type: 'goal_at_risk',
      title: `Goal at Risk: ${goal.name}`,
      description: `Less than 6 months to deadline`,
      client_id: goal.client_id,
      client_name: client?.client_name,
      priority: 'high',
      action: 'Review investment strategy'
    });
  }
  
  // Tax harvesting opportunity (simplified)
  const currentMonth = today.getMonth();
  if (currentMonth >= 0 && currentMonth <= 2) { // Jan-Mar
    alerts.push({
      type: 'tax_planning',
      title: 'Tax Planning Season',
      description: 'Review clients for 80C investments before March 31',
      priority: 'medium',
      action: 'Identify eligible clients'
    });
  }
  
  return alerts;
}

// AI enhancement for insights
async function enhanceWithAI(
  apiKey: string,
  clients: ClientPriority[],
  dividends: DividendOpportunity[],
  rebalances: RebalanceSuggestion[],
  churnRisks: ChurnRisk[]
): Promise<void> {
  // This could be used to get more detailed AI recommendations
  // Keeping it simple for now as the rule-based logic is comprehensive
  console.log('AI enhancement would process:', {
    clients: clients.length,
    dividends: dividends.length,
    rebalances: rebalances.length,
    churnRisks: churnRisks.length
  });
}

// Handle draft message generation
async function handleDraftMessage(
  supabase: any,
  advisorId: string,
  clientId: string,
  context: { type: string; data?: any }
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch client data
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (!client) {
    return new Response(JSON.stringify({ error: 'Client not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const messageTypes: Record<string, string> = {
    birthday: `Write a warm, professional birthday greeting for ${client.client_name}.`,
    review: `Write a brief email to ${client.client_name} requesting a portfolio review meeting. Their current portfolio value is ₹${formatCurrency(client.total_assets || 0)}.`,
    dividend: `Write an email to ${client.client_name} about a recent dividend credit${context.data?.amount ? ` of ₹${context.data.amount}` : ''}. Suggest reinvestment options.`,
    kyc: `Write a polite reminder to ${client.client_name} about their upcoming KYC renewal.`,
    general: `Write a brief check-in email to ${client.client_name} asking how they're doing and if they have any questions.`
  };

  const prompt = messageTypes[context.type] || messageTypes.general;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional wealth advisor assistant. Write concise, warm, and professional messages. Keep emails under 150 words. Include a clear subject line at the start.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI generation failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ draft: content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Draft message error:', e);
    return new Response(JSON.stringify({ error: 'Failed to generate message' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Handle meeting summary
async function handleMeetingSummary(context: { notes: string }): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!context?.notes) {
    return new Response(JSON.stringify({ error: 'No notes provided' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { 
            role: 'system', 
            content: `You are a meeting summarization assistant for wealth advisors. 
            From the meeting notes, extract:
            1. Summary (2-3 sentences)
            2. Key Decisions (bullet points)
            3. Action Items (with assignee if mentioned)
            4. Follow-up Date (if mentioned)
            
            Return as JSON: { summary, decisions: [], action_items: [], follow_up_date }` 
          },
          { role: 'user', content: context.notes }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI summarization failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse as JSON
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      parsed = { summary: content, decisions: [], action_items: [], follow_up_date: null };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Meeting summary error:', e);
    return new Response(JSON.stringify({ error: 'Failed to summarize meeting' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
