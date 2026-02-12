import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORTFOLIO_AI_PROMPT = `You are an AI portfolio intelligence analyst for wealth advisors managing HNI/UHNI clients.
Analyze portfolio data and generate insights across these categories:

1. **DRIFT_ALERT**: Identify portfolios needing rebalancing based on allocation drift from targets
2. **RISK_CONCENTRATION**: Flag dangerous concentration risks (single stock >20%, sector >40%)
3. **TAX_OPTIMIZATION**: Identify tax-loss harvesting opportunities, long-term vs short-term gain optimization
4. **PERFORMANCE_EXPLANATION**: Explain portfolio performance in plain language for client communication
5. **SECTOR_RISK**: Cluster sector risks across the client base, identify correlated exposures
6. **MARKET_SHOCK**: Simulate impact of market stress scenarios (e.g. 10% equity drop, rate hike)
7. **UNDERPERFORMANCE**: Flag clients whose portfolios underperform benchmarks or peers
8. **REBALANCE_TIMING**: Suggest optimal timing for rebalancing considering costs, taxes, and market conditions

Be specific with numbers. Reference actual securities and clients. Prioritize actionable insights.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    let portfolioData = "";
    
    if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const supabaseUser = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""), {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user } } = await supabaseUser.auth.getUser();
      
      if (user) {
        const [portfoliosRes, positionsRes, transactionsRes, clientsRes] = await Promise.all([
          supabaseAdmin.from('portfolio_admin_portfolios').select('*, clients(client_name, risk_profile, total_assets)').eq('advisor_id', user.id),
          supabaseAdmin.from('portfolio_admin_positions').select('*'),
          supabaseAdmin.from('portfolio_admin_transactions').select('*').order('trade_date', { ascending: false }).limit(100),
          supabaseAdmin.from('clients').select('id, client_name, risk_profile, total_assets').eq('advisor_id', user.id),
        ]);

        const portfolios = portfoliosRes.data || [];
        const positions = positionsRes.data || [];
        const transactions = transactionsRes.data || [];
        const clients = clientsRes.data || [];

        // Build portfolio summaries
        const portfolioSummaries = portfolios.map(p => {
          const pPositions = positions.filter(pos => pos.portfolio_id === p.id);
          const totalMV = pPositions.reduce((s, pos) => s + Number(pos.market_value || 0), 0);
          const totalCost = pPositions.reduce((s, pos) => s + (Number(pos.quantity) * Number(pos.average_cost)), 0);
          const pnl = totalMV - totalCost;
          const pnlPct = totalCost > 0 ? ((pnl / totalCost) * 100).toFixed(1) : "0";

          const holdingsDetail = pPositions.map(pos => {
            const weight = totalMV > 0 ? ((pos.market_value / totalMV) * 100).toFixed(1) : "0";
            const posGain = ((pos.current_price - pos.average_cost) / pos.average_cost * 100).toFixed(1);
            return `  - ${pos.security_id}: Qty ${pos.quantity}, Cost ₹${pos.average_cost}, Price ₹${pos.current_price}, Weight ${weight}%, Gain ${posGain}%`;
          }).join('\n');

          return `### ${p.portfolio_name} (Client: ${p.clients?.client_name || 'Unknown'}, Risk: ${p.clients?.risk_profile || 'moderate'})
Market Value: ₹${formatNum(totalMV)}, Cost: ₹${formatNum(totalCost)}, P&L: ${pnlPct}%
Holdings (${pPositions.length}):
${holdingsDetail || '  No positions'}`;
        }).join('\n\n');

        // Recent transactions summary
        const recentTxSummary = transactions.slice(0, 20).map(t => 
          `- ${t.trade_date}: ${t.transaction_type.toUpperCase()} ${t.quantity} ${t.security_id} @ ₹${t.price}`
        ).join('\n');

        // Aggregate stats
        const totalAUM = positions.reduce((s, p) => s + Number(p.market_value || 0), 0);
        const uniqueSecurities = new Set(positions.map(p => p.security_id)).size;

        portfolioData = `
## Portfolio Intelligence Data

### Aggregate Overview
- Total Portfolios: ${portfolios.length}
- Total AUM: ₹${formatNum(totalAUM)}
- Unique Securities: ${uniqueSecurities}
- Total Clients: ${clients.length}

### Portfolio Details
${portfolioSummaries || 'No portfolios found'}

### Recent Transactions (Last 20)
${recentTxSummary || 'No recent transactions'}

### Client Risk Profiles
${clients.map(c => `- ${c.client_name}: ${c.risk_profile || 'moderate'}, AUM ₹${formatNum(c.total_assets)}`).join('\n')}
`;
      }
    }

    const tools = [{
      type: "function",
      function: {
        name: "generate_portfolio_insights",
        description: "Generate AI portfolio intelligence insights",
        parameters: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string", enum: ["drift_alert", "risk_concentration", "tax_optimization", "performance_explanation", "sector_risk", "market_shock", "underperformance", "rebalance_timing"] },
                  title: { type: "string", description: "Concise title (under 12 words)" },
                  description: { type: "string", description: "Detailed insight (under 80 words)" },
                  severity: { type: "string", enum: ["critical", "warning", "info", "opportunity"] },
                  affected_portfolios: { type: "array", items: { type: "string" }, description: "Portfolio or client names affected" },
                  recommended_action: { type: "string", description: "Specific action to take (under 30 words)" },
                  estimated_impact: { type: "string", description: "Estimated financial impact if applicable" }
                },
                required: ["category", "title", "description", "severity", "recommended_action"]
              }
            },
            summary: {
              type: "object",
              properties: {
                portfolios_needing_rebalance: { type: "number" },
                risk_alerts_count: { type: "number" },
                tax_opportunities_count: { type: "number" },
                underperforming_count: { type: "number" },
                overall_health_score: { type: "number", description: "1-100 score of overall portfolio health" },
                market_risk_level: { type: "string", enum: ["low", "moderate", "elevated", "high"] }
              },
              required: ["portfolios_needing_rebalance", "risk_alerts_count", "tax_opportunities_count", "underperforming_count", "overall_health_score", "market_risk_level"]
            }
          },
          required: ["insights", "summary"]
        }
      }
    }];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: PORTFOLIO_AI_PROMPT },
          { role: "user", content: `Analyze the following portfolio data and generate 6-10 actionable insights across all categories:\n${portfolioData}` }
        ],
        tools,
        tool_choice: { type: "function", function: { name: "generate_portfolio_insights" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ insights: [], summary: { portfolios_needing_rebalance: 0, risk_alerts_count: 0, tax_opportunities_count: 0, underperforming_count: 0, overall_health_score: 0, market_risk_level: "low" } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Portfolio AI error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatNum(n: number | null): string {
  if (!n) return "0";
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toFixed(0);
}
