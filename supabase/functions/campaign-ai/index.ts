import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, context } = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const advisorId = user.id;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    switch (action) {
      case 'generate_content':
        return await handleGenerateContent(LOVABLE_API_KEY, context);
      case 'personalize_draft':
        return await handlePersonalizeDraft(supabase, LOVABLE_API_KEY, advisorId, context);
      case 'predictive_targeting':
        return await handlePredictiveTargeting(supabase, advisorId);
      case 'engagement_scoring':
        return await handleEngagementScoring(supabase, advisorId);
      case 'smart_send_time':
        return await handleSmartSendTime(supabase, advisorId, context);
      case 'campaign_insights':
        return await handleCampaignInsights(supabase, advisorId);
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('Campaign AI error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// AI Content Generator
async function handleGenerateContent(apiKey: string | undefined, context: any): Promise<Response> {
  const { content_type, tone = 'professional', audience_context } = context || {};

  const prompts: Record<string, string> = {
    market_update: `Write a concise market update for wealth management clients. Tone: ${tone}. Include key market movements, sector highlights, and actionable takeaways. Keep under 200 words. ${audience_context ? `Audience context: ${audience_context}` : ''}`,
    portfolio_summary: `Write a portfolio performance summary template for a wealth advisor to send to clients. Include placeholders like {{client_name}}, {{portfolio_value}}, {{last_return}}. Tone: ${tone}. Keep under 150 words.`,
    tax_tips: `Write 3-5 practical tax-saving tips relevant to Indian investors and wealth management clients. Tone: ${tone}. Be specific with sections like ELSS, NPS, HRA. Keep under 200 words.`,
    newsletter: `Write a monthly wealth management newsletter. Include: market outlook, investment tip of the month, and a motivational note. Tone: ${tone}. Keep under 300 words. Use {{client_name}} for personalization.`,
    birthday_wish: `Write a warm, professional birthday message from a wealth advisor to a client. Use {{client_name}}. Keep under 80 words. Tone: ${tone}.`,
    festival_greeting: `Write a festive greeting from a wealth advisor. Use {{client_name}}. Reference prosperity and financial well-being. Keep under 80 words. Tone: ${tone}.`,
  };

  const prompt = prompts[content_type] || `Write professional campaign content for wealth management clients about: ${content_type}. Tone: ${tone}. Keep concise.`;

  if (!apiKey) {
    // Fallback templates without AI
    const fallbacks: Record<string, string> = {
      market_update: "Dear {{client_name}},\n\nHere's your weekly market update:\n\n📈 Markets showed mixed signals this week. Large-cap indices remained resilient while mid-caps saw profit booking.\n\n💡 Key Takeaway: Diversification remains crucial. Consider reviewing your asset allocation.\n\nBest regards,\nYour Wealth Advisor",
      portfolio_summary: "Dear {{client_name}},\n\nYour portfolio snapshot:\n• Current Value: {{portfolio_value}}\n• Returns: {{last_return}}\n\nYour portfolio continues to perform in line with your risk profile. Let's schedule a review to ensure we're on track.\n\nBest regards,\nYour Wealth Advisor",
      tax_tips: "Dear {{client_name}},\n\n💰 Tax-Saving Tips:\n\n1. ELSS funds offer tax deduction under 80C with just 3-year lock-in\n2. NPS provides additional ₹50,000 deduction under 80CCD(1B)\n3. Health insurance premiums qualify under 80D\n4. Long-term capital gains up to ₹1.25L are tax-free\n\nLet's optimize your tax strategy!\n\nBest regards",
      newsletter: "Dear {{client_name}},\n\n📊 Monthly Wealth Update\n\nMarket Outlook: Cautiously optimistic. Quality stocks at reasonable valuations present opportunities.\n\n💡 Tip of the Month: SIP in volatile markets helps average out costs. Stay invested!\n\n🎯 Remember: Wealth building is a marathon, not a sprint. Your financial goals are well within reach.\n\nWarm regards,\nYour Wealth Advisor",
      birthday_wish: "Dear {{client_name}},\n\nWishing you a wonderful birthday! 🎂 May this year bring you prosperity, good health, and the fulfillment of all your financial goals.\n\nWarm regards,\nYour Wealth Advisor",
      festival_greeting: "Dear {{client_name}},\n\nWishing you and your family a joyous and prosperous festive season! 🎉 May this occasion bring happiness and financial well-being.\n\nWarm regards,\nYour Wealth Advisor",
    };
    return new Response(JSON.stringify({ content: fallbacks[content_type] || fallbacks.newsletter, source: 'template' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a wealth management content specialist. Write clear, professional content for financial advisors to send to their clients. Always use proper formatting.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI gateway error: ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ content, source: 'ai' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('AI content gen failed:', e);
    return new Response(JSON.stringify({ error: 'AI generation failed', fallback: true }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// AI Personalized Draft
async function handlePersonalizeDraft(supabase: any, apiKey: string | undefined, advisorId: string, context: any): Promise<Response> {
  const { client_id, purpose = 'general' } = context || {};
  if (!client_id) return new Response(JSON.stringify({ error: 'client_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const [clientRes, goalsRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', client_id).single(),
    supabase.from('goals').select('*').eq('client_id', client_id).limit(5),
  ]);

  const client = clientRes.data;
  const goals = goalsRes.data || [];
  if (!client) return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const clientContext = `Client: ${client.client_name}, AUM: ₹${(client.total_assets || 0).toLocaleString()}, Risk: ${client.risk_profile || 'moderate'}, Goals: ${goals.map((g: any) => g.name).join(', ') || 'None set'}`;

  if (!apiKey) {
    const draft = `Dear ${client.client_name},\n\nI hope this message finds you well. I wanted to reach out regarding your portfolio and investment goals.\n\nYour current portfolio value stands at ₹${(client.total_assets || 0).toLocaleString()}, and I'd like to discuss some opportunities aligned with your ${client.risk_profile || 'moderate'} risk profile.\n\nShall we schedule a call this week?\n\nBest regards,\nYour Wealth Advisor`;
    return new Response(JSON.stringify({ draft, source: 'template' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a wealth advisor drafting a personalized message to a client. Be professional, warm, and reference their specific financial situation. Keep under 150 words.' },
          { role: 'user', content: `Draft a ${purpose} message for this client. ${clientContext}` },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    const data = await response.json();
    return new Response(JSON.stringify({ draft: data.choices?.[0]?.message?.content || '', source: 'ai' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Personalize draft failed:', e);
    const draft = `Dear ${client.client_name},\n\nI hope you're doing well. I'd like to discuss your portfolio and upcoming opportunities.\n\nBest regards`;
    return new Response(JSON.stringify({ draft, source: 'fallback' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// Predictive Targeting
async function handlePredictiveTargeting(supabase: any, advisorId: string): Promise<Response> {
  const { data: clients } = await supabase.from('clients').select('*').eq('advisor_id', advisorId);
  const { data: comms } = await supabase.from('communication_logs').select('client_id, sent_at, status').order('sent_at', { ascending: false });
  const { data: orders } = await supabase.from('orders').select('client_id, order_type, total_amount, created_at').order('created_at', { ascending: false });

  const now = new Date();
  const predictions = (clients || []).map((client: any) => {
    const clientComms = (comms || []).filter((c: any) => c.client_id === client.id);
    const clientOrders = (orders || []).filter((o: any) => o.client_id === client.id);

    // Invest more likelihood
    const recentBuys = clientOrders.filter((o: any) => o.order_type === 'buy' && daysBetween(now, new Date(o.created_at)) < 90).length;
    const investScore = Math.min(100, (recentBuys * 20) + (client.total_assets > 1000000 ? 30 : 10) + (client.risk_profile === 'aggressive' ? 20 : 5));

    // Churn likelihood
    const daysSinceComm = clientComms.length > 0 ? daysBetween(now, new Date(clientComms[0].sent_at)) : 999;
    const daysSinceOrder = clientOrders.length > 0 ? daysBetween(now, new Date(clientOrders[0].created_at)) : 999;
    const churnScore = Math.min(100, (daysSinceComm > 90 ? 40 : daysSinceComm > 60 ? 20 : 0) + (daysSinceOrder > 180 ? 30 : daysSinceOrder > 90 ? 15 : 0) + (client.status === 'inactive' ? 30 : 0));

    // Campaign response likelihood
    const responseRate = clientComms.length > 0 ? clientComms.filter((c: any) => c.status === 'delivered' || c.status === 'opened').length / clientComms.length : 0.5;
    const responseScore = Math.round(responseRate * 70 + (client.total_assets > 500000 ? 20 : 10) + (recentBuys > 0 ? 10 : 0));

    return {
      client_id: client.id,
      client_name: client.client_name,
      total_assets: client.total_assets || 0,
      invest_more_score: investScore,
      churn_score: churnScore,
      response_score: Math.min(100, responseScore),
      segment_suggestion: churnScore > 60 ? 'retention' : investScore > 60 ? 'upsell' : 'nurture',
    };
  });

  return new Response(JSON.stringify({
    predictions: predictions.sort((a: any, b: any) => b.invest_more_score - a.invest_more_score),
    summary: {
      high_invest: predictions.filter((p: any) => p.invest_more_score > 60).length,
      high_churn: predictions.filter((p: any) => p.churn_score > 60).length,
      high_response: predictions.filter((p: any) => p.response_score > 60).length,
    }
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Engagement Scoring
async function handleEngagementScoring(supabase: any, advisorId: string): Promise<Response> {
  const { data: clients } = await supabase.from('clients').select('id, client_name, total_assets, email, phone').eq('advisor_id', advisorId);
  const { data: msgLogs } = await (supabase as any).from('campaign_message_logs').select('client_id, status, created_at').order('created_at', { ascending: false });
  const { data: comms } = await supabase.from('communication_logs').select('client_id, direction, status, created_at').order('created_at', { ascending: false });

  const scores = (clients || []).map((client: any) => {
    const clientMsgs = (msgLogs || []).filter((m: any) => m.client_id === client.id);
    const clientComms = (comms || []).filter((c: any) => c.client_id === client.id);
    const inbound = clientComms.filter((c: any) => c.direction === 'inbound').length;
    const delivered = clientMsgs.filter((m: any) => m.status === 'delivered').length;
    const total = clientMsgs.length || 1;

    const engagementScore = Math.min(100, Math.round((delivered / total) * 40 + (inbound * 15) + (client.total_assets > 1000000 ? 20 : 5)));
    const label = engagementScore >= 70 ? 'hot' : engagementScore >= 40 ? 'warm' : 'cold';

    return {
      client_id: client.id,
      client_name: client.client_name,
      total_assets: client.total_assets || 0,
      engagement_score: engagementScore,
      label,
      messages_received: clientMsgs.length,
      replies: inbound,
    };
  });

  return new Response(JSON.stringify({
    scores: scores.sort((a: any, b: any) => b.engagement_score - a.engagement_score),
    summary: {
      hot: scores.filter((s: any) => s.label === 'hot').length,
      warm: scores.filter((s: any) => s.label === 'warm').length,
      cold: scores.filter((s: any) => s.label === 'cold').length,
    },
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Smart Send Time
async function handleSmartSendTime(supabase: any, advisorId: string, context: any): Promise<Response> {
  const { data: comms } = await supabase.from('communication_logs').select('client_id, sent_at, opened_at, status').order('sent_at', { ascending: false }).limit(500);

  // Analyze optimal send times from historical data
  const hourBuckets: Record<number, { sent: number; opened: number }> = {};
  for (let h = 0; h < 24; h++) hourBuckets[h] = { sent: 0, opened: 0 };

  for (const c of (comms || [])) {
    const hour = new Date(c.sent_at).getHours();
    hourBuckets[hour].sent++;
    if (c.opened_at) hourBuckets[hour].opened++;
  }

  const bestHours = Object.entries(hourBuckets)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      open_rate: data.sent > 0 ? Math.round((data.opened / data.sent) * 100) : 0,
      volume: data.sent,
    }))
    .sort((a, b) => b.open_rate - a.open_rate);

  const bestDays = ['Tuesday', 'Wednesday', 'Thursday']; // Rule-based best days

  return new Response(JSON.stringify({
    best_hours: bestHours.slice(0, 5),
    best_days: bestDays,
    recommendation: `Best send time: ${bestHours[0]?.hour || 10}:00 on ${bestDays[0]}`,
    hourly_distribution: bestHours,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Campaign Dashboard Insights
async function handleCampaignInsights(supabase: any, advisorId: string): Promise<Response> {
  const [campaignsRes, segmentsRes, msgLogsRes, workflowsRes] = await Promise.all([
    (supabase as any).from('campaigns_v2').select('*').eq('created_by', advisorId),
    (supabase as any).from('campaign_segments').select('*').eq('created_by', advisorId),
    (supabase as any).from('campaign_message_logs').select('status, channel, created_at').limit(1000),
    (supabase as any).from('automation_workflows').select('id, is_enabled').eq('created_by', advisorId),
  ]);

  const campaigns = campaignsRes.data || [];
  const segments = segmentsRes.data || [];
  const msgLogs = msgLogsRes.data || [];
  const workflows = workflowsRes.data || [];

  const totalSent = msgLogs.filter((m: any) => m.status === 'sent' || m.status === 'delivered').length;
  const totalDelivered = msgLogs.filter((m: any) => m.status === 'delivered').length;
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  const channelBreakdown: Record<string, number> = {};
  for (const m of msgLogs) {
    channelBreakdown[m.channel] = (channelBreakdown[m.channel] || 0) + 1;
  }

  return new Response(JSON.stringify({
    overview: {
      total_campaigns: campaigns.length,
      active_campaigns: campaigns.filter((c: any) => c.status === 'sending' || c.status === 'scheduled').length,
      draft_campaigns: campaigns.filter((c: any) => c.status === 'draft').length,
      completed_campaigns: campaigns.filter((c: any) => c.status === 'sent' || c.status === 'completed').length,
      total_segments: segments.length,
      total_messages_sent: totalSent,
      delivery_rate: deliveryRate,
      active_workflows: workflows.filter((w: any) => w.is_enabled).length,
      total_workflows: workflows.length,
    },
    channel_breakdown: channelBreakdown,
    recent_campaigns: campaigns.slice(0, 5).map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      channel: c.channel,
      sent_count: c.sent_count || 0,
      created_at: c.created_at,
    })),
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function daysBetween(d1: Date, d2: Date): number {
  return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}
