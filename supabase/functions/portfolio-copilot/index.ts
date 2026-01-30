import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

## Context
You are assisting wealth advisors managing approximately $2.86B in AUM across 147 client relationships. Focus on providing institutional-quality analysis and recommendations.

When asked about specific clients or data you don't have, provide helpful general guidance and ask clarifying questions to better assist.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, agentType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
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

    console.log("Sending request to Lovable AI Gateway");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + agentContext },
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
