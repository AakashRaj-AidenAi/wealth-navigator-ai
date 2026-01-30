import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are WealthOS Copilot, an advanced AI assistant for wealth management professionals. You help wealth advisors, compliance officers, and portfolio managers with:

## Core Capabilities
- **Portfolio Analysis**: Analyze asset allocations, concentration risks, sector exposures, and performance metrics
- **Client Insights**: Provide personalized insights for high-net-worth clients, family offices, and trusts
- **Risk Assessment**: Identify potential risks, compliance issues, and regulatory concerns
- **Investment Recommendations**: Suggest rebalancing strategies, tax optimization, and investment opportunities
- **Meeting Preparation**: Generate client meeting briefs and talking points

## Response Guidelines
- Use professional financial terminology
- Format responses with markdown for clarity (headers, bullet points, tables when appropriate)
- Include specific metrics and data points when discussing portfolios
- Provide actionable recommendations
- Flag any compliance or risk concerns with appropriate urgency
- Be concise but thorough
- When asked about specific clients or data, ALWAYS reference the actual client data provided below`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, agentType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Extract auth token from request
    const authHeader = req.headers.get("Authorization");
    let userContext = "";
    
    if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        // Create Supabase client with service role for admin access
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Create user client to get the authenticated user
        const supabaseUser = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""), {
          global: { headers: { Authorization: authHeader } }
        });
        
        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        
        if (user && !userError) {
          console.log("Fetching data for user:", user.id);
          
          // Fetch clients for this advisor using service role
          const { data: clients, error: clientsError } = await supabaseAdmin
            .from('clients')
            .select('*')
            .eq('advisor_id', user.id)
            .order('total_assets', { ascending: false });
          
          if (clients && clients.length > 0 && !clientsError) {
            console.log(`Found ${clients.length} clients for user`);
            
            // Calculate summary stats
            const totalAUM = clients.reduce((sum, c) => sum + (Number(c.total_assets) || 0), 0);
            const activeClients = clients.filter(c => c.status === 'active').length;
            
            // Fetch goals for these clients
            const clientIds = clients.map(c => c.id);
            const { data: goals } = await supabaseAdmin
              .from('goals')
              .select('*')
              .in('client_id', clientIds);
            
            // Fetch orders for these clients
            const { data: orders } = await supabaseAdmin
              .from('orders')
              .select('*')
              .in('client_id', clientIds)
              .order('created_at', { ascending: false })
              .limit(20);
            
            userContext = `

## YOUR CLIENT DATA (REAL DATA FROM DATABASE)

### Portfolio Summary
- **Total AUM**: ₹${(totalAUM / 10000000).toFixed(2)} Cr (${formatCurrency(totalAUM)})
- **Total Clients**: ${clients.length}
- **Active Clients**: ${activeClients}

### Client List (ordered by assets)
${clients.map((c, i) => `${i + 1}. **${c.client_name}** - ₹${(Number(c.total_assets) / 10000000).toFixed(2)} Cr
   - Email: ${c.email || 'N/A'}
   - Phone: ${c.phone || 'N/A'}
   - Risk Profile: ${c.risk_profile || 'moderate'}
   - Status: ${c.status || 'active'}`).join('\n')}

${goals && goals.length > 0 ? `
### Financial Goals
${goals.map(g => `- **${g.name}** (${clients.find(c => c.id === g.client_id)?.client_name || 'Unknown'}): Target ₹${formatCurrency(g.target_amount)}, Current ₹${formatCurrency(g.current_amount || 0)} (${Math.round(((g.current_amount || 0) / g.target_amount) * 100)}% complete)`).join('\n')}
` : ''}

${orders && orders.length > 0 ? `
### Recent Orders
${orders.slice(0, 10).map(o => `- ${o.order_type.toUpperCase()} ${o.quantity} ${o.symbol} @ ₹${o.price || 'Market'} - ${o.status} (${clients.find(c => c.id === o.client_id)?.client_name || 'Unknown'})`).join('\n')}
` : ''}

When answering questions about "top clients", "best clients", "highest value clients" etc., ALWAYS refer to this actual data above. Sort by total_assets for "top" or "largest" queries.`;
          } else {
            console.log("No clients found for user or error:", clientsError);
            userContext = "\n\n## NOTE: No client data found in database. The user should add clients first.";
          }
        }
      } catch (dbError) {
        console.error("Error fetching user data:", dbError);
      }
    }

    // Customize system prompt based on agent type
    let agentContext = "";
    if (agentType) {
      switch (agentType) {
        case "portfolio":
          agentContext = "\n\nYou are currently operating as the Portfolio Intelligence agent. Focus on deep portfolio analysis, asset allocation optimization, and performance attribution.";
          break;
        case "cio":
          agentContext = "\n\nYou are currently operating as the CIO Copilot. Focus on investment strategy, market insights, macroeconomic analysis, and strategic asset allocation decisions.";
          break;
        case "advisor":
          agentContext = "\n\nYou are currently operating as the Advisor Assistant. Focus on client relationship management, meeting preparation, and personalized recommendations.";
          break;
        case "compliance":
          agentContext = "\n\nYou are currently operating as the Compliance Sentinel. Focus on regulatory compliance, risk monitoring, suitability assessments, and audit requirements.";
          break;
        case "tax":
          agentContext = "\n\nYou are currently operating as the Tax Optimizer. Focus on tax-loss harvesting, tax-efficient investing, and tax planning strategies.";
          break;
        case "meeting":
          agentContext = "\n\nYou are currently operating as Meeting Intelligence. Focus on preparing client meeting briefs, generating talking points, and creating action items.";
          break;
      }
    }

    const fullSystemPrompt = SYSTEM_PROMPT + userContext + agentContext;
    console.log("Sending request to Lovable AI Gateway with user context");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      const errorText = await response.text();
      console.error("AI gateway error:", statusCode, errorText);
      
      if (statusCode === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (statusCode === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Streaming response from AI gateway");
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Portfolio copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `${(amount / 100000).toFixed(2)} L`;
  }
  return amount.toLocaleString('en-IN');
}
