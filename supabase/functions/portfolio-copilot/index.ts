import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool definitions for dynamic data querying
const TOOLS = [
  {
    type: "function",
    function: {
      name: "query_clients",
      description: "Search and filter clients by various criteria. Use this when the user asks about clients, portfolios, or needs client data.",
      parameters: {
        type: "object",
        properties: {
          name_contains: {
            type: "string",
            description: "Filter clients whose name contains this string (case-insensitive)"
          },
          min_assets: {
            type: "number",
            description: "Minimum total assets (e.g., 5000000 for $5M)"
          },
          max_assets: {
            type: "number",
            description: "Maximum total assets"
          },
          risk_profile: {
            type: "string",
            enum: ["conservative", "moderate", "aggressive"],
            description: "Filter by risk profile"
          },
          status: {
            type: "string",
            enum: ["active", "inactive", "prospect"],
            description: "Filter by client status"
          },
          order_by: {
            type: "string",
            enum: ["total_assets", "client_name", "created_at"],
            description: "Field to sort by (default: total_assets)"
          },
          order_direction: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Sort direction (default: desc)"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 20, max: 50)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_orders",
      description: "Search orders/trades by date range, type, status, or symbol. Use this when the user asks about trades, orders, or transaction history.",
      parameters: {
        type: "object",
        properties: {
          client_name: {
            type: "string",
            description: "Filter orders for a specific client by name"
          },
          order_type: {
            type: "string",
            enum: ["buy", "sell"],
            description: "Filter by order type"
          },
          status: {
            type: "string",
            enum: ["pending", "executed", "cancelled"],
            description: "Filter by order status"
          },
          symbol_contains: {
            type: "string",
            description: "Filter by stock/fund symbol (partial match)"
          },
          days_ago: {
            type: "number",
            description: "Filter orders from the last N days (e.g., 7 for last week)"
          },
          min_amount: {
            type: "number",
            description: "Minimum order amount"
          },
          order_by: {
            type: "string",
            enum: ["created_at", "total_amount", "quantity"],
            description: "Field to sort by"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 20, max: 100)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_goals",
      description: "Search financial goals by progress, target amount, or status. Use this when the user asks about goals, targets, or financial objectives.",
      parameters: {
        type: "object",
        properties: {
          client_name: {
            type: "string",
            description: "Filter goals for a specific client by name"
          },
          status: {
            type: "string",
            enum: ["active", "completed", "cancelled"],
            description: "Filter by goal status"
          },
          min_progress: {
            type: "number",
            description: "Minimum progress percentage (0-100)"
          },
          max_progress: {
            type: "number",
            description: "Maximum progress percentage (0-100)"
          },
          min_target: {
            type: "number",
            description: "Minimum target amount"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Filter by goal priority"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 20, max: 50)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_tasks",
      description: "Search tasks by status, priority, or due date. Use this when the user asks about tasks, to-dos, reminders, or action items.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["todo", "in_progress", "done", "cancelled"],
            description: "Filter by task status"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
            description: "Filter by task priority"
          },
          overdue: {
            type: "boolean",
            description: "If true, only return overdue tasks"
          },
          due_within_days: {
            type: "number",
            description: "Filter tasks due within N days"
          },
          client_name: {
            type: "string",
            description: "Filter tasks for a specific client"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 20, max: 50)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_activities",
      description: "Search client activities like calls, meetings, emails. Use this when the user asks about client interactions, communication history, or engagement.",
      parameters: {
        type: "object",
        properties: {
          client_name: {
            type: "string",
            description: "Filter activities for a specific client"
          },
          activity_type: {
            type: "string",
            enum: ["call", "email", "meeting", "note", "document", "reminder"],
            description: "Filter by activity type"
          },
          days_ago: {
            type: "number",
            description: "Filter activities from the last N days"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 20, max: 50)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "aggregate_portfolio",
      description: "Calculate portfolio metrics like total AUM, client count, distributions. Use this when the user asks for summaries, totals, averages, or distributions.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: ["total_aum", "client_count", "avg_assets", "risk_distribution", "status_distribution", "top_clients"],
            description: "The metric to calculate"
          },
          filter_status: {
            type: "string",
            enum: ["active", "inactive", "prospect"],
            description: "Optional: filter by client status before aggregating"
          },
          filter_risk_profile: {
            type: "string",
            enum: ["conservative", "moderate", "aggressive"],
            description: "Optional: filter by risk profile before aggregating"
          },
          top_n: {
            type: "number",
            description: "For top_clients metric: number of top clients to return (default: 10)"
          }
        },
        required: ["metric"]
      }
    }
  }
];

const SYSTEM_PROMPT = `You are WealthOS Copilot, an advanced AI assistant for wealth management professionals.

## Your Capabilities
You have access to real-time database tools to query actual client data. ALWAYS use these tools when the user asks about:
- Client information (names, assets, risk profiles, status)
- Orders and trades (buy/sell, pending/executed, history)
- Financial goals (targets, progress, priorities)
- Tasks and reminders (due dates, priorities, status)
- Client activities (calls, meetings, emails)
- Portfolio metrics (AUM, distributions, summaries)

## IMPORTANT: Tool Usage Rules
1. **ALWAYS use tools for data questions** - Never make up or guess client data
2. **Use appropriate filters** - Match user's criteria to tool parameters
3. **Combine tools when needed** - You can call multiple tools for complex questions
4. **Report actual results** - If no data found, say so honestly

## Response Guidelines
- Use professional financial terminology
- Format responses with markdown (headers, bullet points, tables)
- Include specific metrics and data from tool results
- Provide actionable recommendations when appropriate
- Flag compliance or risk concerns with appropriate urgency
- Be concise but thorough

## Examples of When to Use Tools
- "Show me top clients" → use aggregate_portfolio with metric="top_clients"
- "Clients with over $5M" → use query_clients with min_assets=5000000
- "Recent buy orders" → use query_orders with order_type="buy" and days_ago=7
- "Overdue tasks" → use query_tasks with overdue=true
- "Total AUM" → use aggregate_portfolio with metric="total_aum"`;

// Query execution functions
async function executeQueryClients(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>
): Promise<string> {
  let query = supabase
    .from('clients')
    .select('id, client_name, email, phone, total_assets, risk_profile, status, created_at')
    .eq('advisor_id', userId);

  if (params.name_contains) {
    query = query.ilike('client_name', `%${params.name_contains}%`);
  }
  if (params.min_assets !== undefined) {
    query = query.gte('total_assets', params.min_assets);
  }
  if (params.max_assets !== undefined) {
    query = query.lte('total_assets', params.max_assets);
  }
  if (params.risk_profile) {
    query = query.eq('risk_profile', params.risk_profile);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }

  const orderBy = (params.order_by as string) || 'total_assets';
  const orderDir = params.order_direction === 'asc' ? true : false;
  query = query.order(orderBy, { ascending: orderDir });

  const limit = Math.min(Number(params.limit) || 20, 50);
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return `Error querying clients: ${error.message}`;
  }

  if (!data || data.length === 0) {
    return "No clients found matching the criteria.";
  }

  const results = data.map((c, i) =>
    `${i + 1}. **${c.client_name}** - ${formatCurrency(Number(c.total_assets) || 0)}
   - Email: ${c.email || 'N/A'} | Phone: ${c.phone || 'N/A'}
   - Risk: ${c.risk_profile || 'moderate'} | Status: ${c.status || 'active'}`
  ).join('\n');

  return `Found ${data.length} client(s):\n\n${results}`;
}

async function executeQueryOrders(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>
): Promise<string> {
  // First get user's client IDs
  const { data: clients } = await supabase
    .from('clients')
    .select('id, client_name')
    .eq('advisor_id', userId);

  if (!clients || clients.length === 0) {
    return "No clients found. Add clients first to see orders.";
  }

  const clientIds = clients.map(c => c.id);
  const clientMap = new Map(clients.map(c => [c.id, c.client_name]));

  let query = supabase
    .from('orders')
    .select('*')
    .in('client_id', clientIds);

  if (params.client_name) {
    const matchingClient = clients.find(c =>
      c.client_name.toLowerCase().includes((params.client_name as string).toLowerCase())
    );
    if (matchingClient) {
      query = query.eq('client_id', matchingClient.id);
    }
  }
  if (params.order_type) {
    query = query.eq('order_type', params.order_type);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.symbol_contains) {
    query = query.ilike('symbol', `%${params.symbol_contains}%`);
  }
  if (params.days_ago) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(params.days_ago));
    query = query.gte('created_at', daysAgo.toISOString());
  }
  if (params.min_amount !== undefined) {
    query = query.gte('total_amount', params.min_amount);
  }

  const orderBy = (params.order_by as string) || 'created_at';
  query = query.order(orderBy, { ascending: false });

  const limit = Math.min(Number(params.limit) || 20, 100);
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return `Error querying orders: ${error.message}`;
  }

  if (!data || data.length === 0) {
    return "No orders found matching the criteria.";
  }

  const results = data.map(o =>
    `- **${o.order_type.toUpperCase()}** ${o.quantity} ${o.symbol} @ ${o.price ? `$${o.price}` : 'Market'} - ${o.status} (${clientMap.get(o.client_id) || 'Unknown'}) - ${new Date(o.created_at).toLocaleDateString()}`
  ).join('\n');

  return `Found ${data.length} order(s):\n\n${results}`;
}

async function executeQueryGoals(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>
): Promise<string> {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, client_name')
    .eq('advisor_id', userId);

  if (!clients || clients.length === 0) {
    return "No clients found. Add clients first to see goals.";
  }

  const clientIds = clients.map(c => c.id);
  const clientMap = new Map(clients.map(c => [c.id, c.client_name]));

  let query = supabase
    .from('goals')
    .select('*')
    .in('client_id', clientIds);

  if (params.client_name) {
    const matchingClient = clients.find(c =>
      c.client_name.toLowerCase().includes((params.client_name as string).toLowerCase())
    );
    if (matchingClient) {
      query = query.eq('client_id', matchingClient.id);
    }
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.priority) {
    query = query.eq('priority', params.priority);
  }
  if (params.min_target !== undefined) {
    query = query.gte('target_amount', params.min_target);
  }

  const limit = Math.min(Number(params.limit) || 20, 50);
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return `Error querying goals: ${error.message}`;
  }

  if (!data || data.length === 0) {
    return "No goals found matching the criteria.";
  }

  // Apply progress filters in memory
  let filteredData = data;
  if (params.min_progress !== undefined || params.max_progress !== undefined) {
    filteredData = data.filter(g => {
      const progress = g.target_amount > 0 ? ((g.current_amount || 0) / g.target_amount) * 100 : 0;
      if (params.min_progress !== undefined && progress < Number(params.min_progress)) return false;
      if (params.max_progress !== undefined && progress > Number(params.max_progress)) return false;
      return true;
    });
  }

  if (filteredData.length === 0) {
    return "No goals found matching the progress criteria.";
  }

  const results = filteredData.map(g => {
    const progress = g.target_amount > 0 ? Math.round(((g.current_amount || 0) / g.target_amount) * 100) : 0;
    return `- **${g.name}** (${clientMap.get(g.client_id) || 'Unknown'}): Target ${formatCurrency(g.target_amount)}, Current ${formatCurrency(g.current_amount || 0)} (${progress}% complete) - ${g.priority} priority`;
  }).join('\n');

  return `Found ${filteredData.length} goal(s):\n\n${results}`;
}

async function executeQueryTasks(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>
): Promise<string> {
  let query = supabase
    .from('tasks')
    .select('*, clients(client_name)')
    .eq('assigned_to', userId);

  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.priority) {
    query = query.eq('priority', params.priority);
  }
  if (params.overdue) {
    const today = new Date().toISOString().split('T')[0];
    query = query.lt('due_date', today).neq('status', 'done').neq('status', 'cancelled');
  }
  if (params.due_within_days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(params.due_within_days));
    query = query.lte('due_date', futureDate.toISOString().split('T')[0]);
  }

  query = query.order('due_date', { ascending: true });

  const limit = Math.min(Number(params.limit) || 20, 50);
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return `Error querying tasks: ${error.message}`;
  }

  if (!data || data.length === 0) {
    return "No tasks found matching the criteria.";
  }

  // Filter by client name if provided
  let filteredData = data;
  if (params.client_name) {
    filteredData = data.filter(t =>
      t.clients?.client_name?.toLowerCase().includes((params.client_name as string).toLowerCase())
    );
  }

  if (filteredData.length === 0) {
    return "No tasks found for the specified client.";
  }

  const results = filteredData.map(t => {
    const dueInfo = t.due_date ? `Due: ${t.due_date}` : 'No due date';
    const clientInfo = t.clients?.client_name ? ` (${t.clients.client_name})` : '';
    return `- [${t.status.toUpperCase()}] **${t.title}**${clientInfo} - ${t.priority} priority - ${dueInfo}`;
  }).join('\n');

  return `Found ${filteredData.length} task(s):\n\n${results}`;
}

async function executeQueryActivities(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>
): Promise<string> {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, client_name')
    .eq('advisor_id', userId);

  if (!clients || clients.length === 0) {
    return "No clients found. Add clients first to see activities.";
  }

  const clientIds = clients.map(c => c.id);
  const clientMap = new Map(clients.map(c => [c.id, c.client_name]));

  let query = supabase
    .from('client_activities')
    .select('*')
    .in('client_id', clientIds);

  if (params.client_name) {
    const matchingClient = clients.find(c =>
      c.client_name.toLowerCase().includes((params.client_name as string).toLowerCase())
    );
    if (matchingClient) {
      query = query.eq('client_id', matchingClient.id);
    }
  }
  if (params.activity_type) {
    query = query.eq('activity_type', params.activity_type);
  }
  if (params.days_ago) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(params.days_ago));
    query = query.gte('created_at', daysAgo.toISOString());
  }

  query = query.order('created_at', { ascending: false });

  const limit = Math.min(Number(params.limit) || 20, 50);
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return `Error querying activities: ${error.message}`;
  }

  if (!data || data.length === 0) {
    return "No activities found matching the criteria.";
  }

  const results = data.map(a =>
    `- [${a.activity_type.toUpperCase()}] **${a.title}** (${clientMap.get(a.client_id) || 'Unknown'}) - ${new Date(a.created_at).toLocaleDateString()}${a.description ? `\n  ${a.description.substring(0, 100)}...` : ''}`
  ).join('\n');

  return `Found ${data.length} activity/activities:\n\n${results}`;
}

async function executeAggregatePortfolio(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>
): Promise<string> {
  let query = supabase
    .from('clients')
    .select('id, client_name, total_assets, risk_profile, status')
    .eq('advisor_id', userId);

  if (params.filter_status) {
    query = query.eq('status', params.filter_status);
  }
  if (params.filter_risk_profile) {
    query = query.eq('risk_profile', params.filter_risk_profile);
  }

  const { data: clients, error } = await query;

  if (error) {
    return `Error fetching portfolio data: ${error.message}`;
  }

  if (!clients || clients.length === 0) {
    return "No clients found. Add clients to see portfolio metrics.";
  }

  const metric = params.metric as string;

  switch (metric) {
    case 'total_aum': {
      const totalAUM = clients.reduce((sum, c) => sum + (Number(c.total_assets) || 0), 0);
      return `**Total AUM**: ${formatCurrency(totalAUM)} across ${clients.length} client(s)`;
    }
    case 'client_count': {
      return `**Total Clients**: ${clients.length}`;
    }
    case 'avg_assets': {
      const totalAUM = clients.reduce((sum, c) => sum + (Number(c.total_assets) || 0), 0);
      const avg = clients.length > 0 ? totalAUM / clients.length : 0;
      return `**Average Assets per Client**: ${formatCurrency(avg)}`;
    }
    case 'risk_distribution': {
      const distribution: Record<string, number> = {};
      clients.forEach(c => {
        const risk = c.risk_profile || 'moderate';
        distribution[risk] = (distribution[risk] || 0) + 1;
      });
      const results = Object.entries(distribution)
        .map(([risk, count]) => `- ${risk}: ${count} client(s) (${Math.round(count / clients.length * 100)}%)`)
        .join('\n');
      return `**Risk Profile Distribution**:\n${results}`;
    }
    case 'status_distribution': {
      const distribution: Record<string, number> = {};
      clients.forEach(c => {
        const status = c.status || 'active';
        distribution[status] = (distribution[status] || 0) + 1;
      });
      const results = Object.entries(distribution)
        .map(([status, count]) => `- ${status}: ${count} client(s) (${Math.round(count / clients.length * 100)}%)`)
        .join('\n');
      return `**Status Distribution**:\n${results}`;
    }
    case 'top_clients': {
      const topN = Math.min(Number(params.top_n) || 10, 20);
      const sorted = [...clients].sort((a, b) => (Number(b.total_assets) || 0) - (Number(a.total_assets) || 0));
      const top = sorted.slice(0, topN);
      const results = top.map((c, i) =>
        `${i + 1}. **${c.client_name}** - ${formatCurrency(Number(c.total_assets) || 0)} (${c.risk_profile || 'moderate'} risk)`
      ).join('\n');
      return `**Top ${top.length} Clients by AUM**:\n${results}`;
    }
    default:
      return `Unknown metric: ${metric}`;
  }
}

// Execute a tool call
async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  console.log(`Executing tool: ${toolName} with params:`, JSON.stringify(params));

  try {
    switch (toolName) {
      case 'query_clients':
        return await executeQueryClients(supabase, userId, params);
      case 'query_orders':
        return await executeQueryOrders(supabase, userId, params);
      case 'query_goals':
        return await executeQueryGoals(supabase, userId, params);
      case 'query_tasks':
        return await executeQueryTasks(supabase, userId, params);
      case 'query_activities':
        return await executeQueryActivities(supabase, userId, params);
      case 'aggregate_portfolio':
        return await executeAggregatePortfolio(supabase, userId, params);
      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error) {
    console.error(`Tool execution error:`, error);
    return `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(2)}B`;
  } else if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString('en-US')}`;
}

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

    // Extract auth and setup Supabase clients
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let supabaseAdmin: SupabaseClient | null = null;

    if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const supabaseUser = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""), {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

      if (user && !userError) {
        userId = user.id;
        console.log("Authenticated user:", userId);
      }
    }

    // Build agent-specific context
    let agentContext = "";
    if (agentType) {
      const agentContextMap: Record<string, string> = {
        portfolio: "You are the Portfolio Intelligence agent. Focus on portfolio analysis, asset allocation, and performance.",
        cio: "You are the CIO Copilot. Focus on investment strategy and macroeconomic analysis.",
        advisor: "You are the Advisor Assistant. Focus on client relationships and meeting preparation.",
        compliance: "You are the Compliance Sentinel. Focus on regulatory compliance and risk monitoring.",
        tax: "You are the Tax Optimizer. Focus on tax-loss harvesting and tax-efficient investing.",
        meeting: "You are Meeting Intelligence. Focus on client meeting briefs and action items."
      };
      agentContext = agentContextMap[agentType] || "";
    }

    const fullSystemPrompt = SYSTEM_PROMPT + (agentContext ? `\n\n${agentContext}` : "");

    // Initial API call with tools
    console.log("Sending request to AI with tools enabled");

    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4",
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messages,
        ],
        tools: TOOLS,
        tool_choice: "auto",
        stream: false, // Non-streaming for tool calls
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

    let result = await response.json();
    let assistantMessage = result.choices?.[0]?.message;
    let toolCallCount = 0;
    const maxToolCalls = 5;

    // Process tool calls (up to 5 iterations)
    while (assistantMessage?.tool_calls && toolCallCount < maxToolCalls && userId && supabaseAdmin) {
      console.log(`Processing ${assistantMessage.tool_calls.length} tool call(s), iteration ${toolCallCount + 1}`);

      const toolResults: Array<{ role: string; tool_call_id: string; content: string }> = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let params = {};

        try {
          params = JSON.parse(toolCall.function.arguments || "{}");
        } catch (e) {
          console.error("Failed to parse tool arguments:", e);
        }

        const result = await executeTool(toolName, params, supabaseAdmin, userId);

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Continue conversation with tool results
      const updatedMessages = [
        { role: "system", content: fullSystemPrompt },
        ...messages,
        assistantMessage,
        ...toolResults,
      ];

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4",
          messages: updatedMessages,
          tools: TOOLS,
          tool_choice: "auto",
          stream: false,
        }),
      });

      if (!response.ok) {
        break;
      }

      result = await response.json();
      assistantMessage = result.choices?.[0]?.message;
      toolCallCount++;
    }

    // Final response - stream it back
    const finalContent = assistantMessage?.content || "I apologize, but I couldn't generate a response. Please try again.";

    // Create a streaming response that mimics SSE format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Split content into chunks for streaming effect
        const words = finalContent.split(' ');
        let index = 0;

        const sendChunk = () => {
          if (index < words.length) {
            const chunk = words.slice(index, index + 3).join(' ') + (index + 3 < words.length ? ' ' : '');
            const data = JSON.stringify({
              choices: [{ delta: { content: chunk } }]
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            index += 3;
            setTimeout(sendChunk, 10);
          } else {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        };

        sendChunk();
      }
    });

    return new Response(stream, {
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
