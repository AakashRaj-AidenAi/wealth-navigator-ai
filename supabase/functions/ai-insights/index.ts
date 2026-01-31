import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INSIGHTS_PROMPT = `You are an AI assistant for wealth advisors. Analyze the provided client data and generate actionable insights.

Your task is to identify:
1. **Next Best Actions**: Specific actions the advisor should take for each client requiring attention
2. **At-Risk Clients**: Clients who may be inactive, dissatisfied, or at risk of leaving
3. **Rebalance Suggestions**: Portfolios that need rebalancing based on risk profiles and goals
4. **Email Drafts**: Brief email templates for client outreach (keep under 100 words each)
5. **Meeting Summaries**: If meeting notes are provided, summarize key points

Be concise and actionable. Focus on the most important insights.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, clientId, meetingNotes } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    let clientData = "";
    let userId = "";
    
    if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const supabaseUser = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""), {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user } } = await supabaseUser.auth.getUser();
      
      if (user) {
        userId = user.id;
        
        // Fetch clients
        const { data: clients } = await supabaseAdmin
          .from('clients')
          .select('*')
          .eq('advisor_id', user.id);
        
        if (clients && clients.length > 0) {
          const clientIds = clients.map(c => c.id);
          
          // Fetch related data in parallel
          const [goalsRes, ordersRes, tasksRes, activitiesRes, communicationsRes] = await Promise.all([
            supabaseAdmin.from('goals').select('*').in('client_id', clientIds),
            supabaseAdmin.from('orders').select('*').in('client_id', clientIds).order('created_at', { ascending: false }).limit(50),
            supabaseAdmin.from('tasks').select('*').eq('assigned_to', user.id).in('status', ['todo', 'in_progress']),
            supabaseAdmin.from('client_activities').select('*').in('client_id', clientIds).order('created_at', { ascending: false }).limit(30),
            supabaseAdmin.from('communication_logs').select('*').in('client_id', clientIds).order('sent_at', { ascending: false }).limit(20)
          ]);
          
          const goals = goalsRes.data || [];
          const orders = ordersRes.data || [];
          const tasks = tasksRes.data || [];
          const activities = activitiesRes.data || [];
          const communications = communicationsRes.data || [];
          
          // Identify inactive clients (no activity in 30+ days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const clientActivityMap = new Map<string, Date>();
          activities.forEach(a => {
            const existing = clientActivityMap.get(a.client_id);
            const actDate = new Date(a.created_at);
            if (!existing || actDate > existing) {
              clientActivityMap.set(a.client_id, actDate);
            }
          });
          
          const inactiveClients = clients.filter(c => {
            const lastActivity = clientActivityMap.get(c.id);
            return !lastActivity || lastActivity < thirtyDaysAgo;
          });
          
          // Goals behind schedule
          const behindGoals = goals.filter(g => {
            const progress = (Number(g.current_amount) / Number(g.target_amount)) * 100;
            return progress < 50 && g.status !== 'completed';
          });
          
          // Pending orders
          const pendingOrders = orders.filter(o => o.status === 'pending');
          
          clientData = `
## Client Data Summary

### All Clients (${clients.length} total)
${clients.map(c => `- ${c.client_name}: $${formatNumber(c.total_assets)}, Risk: ${c.risk_profile || 'moderate'}, Email: ${c.email || 'N/A'}, KYC Expiry: ${c.kyc_expiry_date || 'N/A'}`).join('\n')}

### Inactive Clients (No activity in 30+ days) - ${inactiveClients.length}
${inactiveClients.map(c => `- ${c.client_name}: Last contact unknown, AUM: $${formatNumber(c.total_assets)}`).join('\n') || 'None'}

### Goals Behind Schedule (< 50% progress) - ${behindGoals.length}
${behindGoals.map(g => {
  const client = clients.find(c => c.id === g.client_id);
  return `- ${client?.client_name}: ${g.name} - ${Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)}% complete`;
}).join('\n') || 'None'}

### Pending Orders - ${pendingOrders.length}
${pendingOrders.map(o => {
  const client = clients.find(c => c.id === o.client_id);
  return `- ${client?.client_name}: ${o.order_type} ${o.quantity} ${o.symbol}`;
}).join('\n') || 'None'}

### Pending Tasks - ${tasks.length}
${tasks.slice(0, 10).map(t => `- ${t.title} (${t.priority} priority)`).join('\n') || 'None'}

### Recent Communications - ${communications.length}
${communications.slice(0, 5).map(c => {
  const client = clients.find(cl => cl.id === c.client_id);
  return `- ${client?.client_name}: ${c.communication_type} on ${new Date(c.sent_at).toLocaleDateString()}`;
}).join('\n') || 'None'}

${meetingNotes ? `\n### Meeting Notes to Summarize\n${meetingNotes}` : ''}
`;
        }
      }
    }

    // Build the tool for structured output
    const tools = [
      {
        type: "function",
        function: {
          name: "generate_insights",
          description: "Generate actionable insights for the wealth advisor",
          parameters: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { 
                      type: "string", 
                      enum: ["next_action", "at_risk", "rebalance", "email_draft", "meeting_summary"],
                      description: "Type of insight"
                    },
                    title: { type: "string", description: "Short title (under 10 words)" },
                    description: { type: "string", description: "Detailed description (under 50 words)" },
                    client_name: { type: "string", description: "Client name if applicable" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    action: { type: "string", description: "Recommended action (under 20 words)" }
                  },
                  required: ["type", "title", "description", "priority"]
                }
              }
            },
            required: ["insights"]
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: INSIGHTS_PROMPT },
          { role: "user", content: `Analyze this data and generate 4-6 key insights:\n${clientData}` }
        ],
        tools,
        tool_choice: { type: "function", function: { name: "generate_insights" } }
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      if (statusCode === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (statusCode === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${statusCode}`);
    }

    const result = await response.json();
    
    // Extract the tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      const insights = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(insights), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback if no tool call
    return new Response(JSON.stringify({ insights: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("AI insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatNumber(num: number | null): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}
