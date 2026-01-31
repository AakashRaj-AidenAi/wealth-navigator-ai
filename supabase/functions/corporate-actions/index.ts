// Corporate Actions Intelligence Edge Function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CorporateAction {
  symbol: string
  security_name: string
  action_type: string
  description: string
  announcement_date: string | null
  ex_date: string | null
  record_date: string | null
  payment_date: string | null
  ratio: string | null
  dividend_amount: number | null
}

interface ClientHolding {
  client_id: string
  client_name: string
  advisor_id: string
  symbol: string
  quantity: number
}

// Simulated market data - in production this would come from real data feeds
function generateMockCorporateActions(): CorporateAction[] {
  const today = new Date()
  const actions: CorporateAction[] = [
    {
      symbol: 'TCS',
      security_name: 'Tata Consultancy Services',
      action_type: 'dividend',
      description: 'Final dividend of ₹28 per share for FY 2024-25',
      announcement_date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ex_date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      record_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ratio: null,
      dividend_amount: 28
    },
    {
      symbol: 'INFY',
      security_name: 'Infosys Limited',
      action_type: 'dividend',
      description: 'Interim dividend of ₹20 per share for Q3 FY25',
      announcement_date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ex_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      record_date: new Date(today.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_date: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ratio: null,
      dividend_amount: 20
    },
    {
      symbol: 'RELIANCE',
      security_name: 'Reliance Industries',
      action_type: 'bonus',
      description: 'Bonus issue in ratio 1:1 (1 share for every 1 held)',
      announcement_date: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ex_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      record_date: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ratio: '1:1',
      dividend_amount: null
    },
    {
      symbol: 'HDFC',
      security_name: 'HDFC Bank',
      action_type: 'split',
      description: 'Stock split from face value ₹10 to ₹2 (5:1 split)',
      announcement_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ex_date: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      record_date: new Date(today.getTime() + 17 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_date: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ratio: '5:1',
      dividend_amount: null
    },
    {
      symbol: 'WIPRO',
      security_name: 'Wipro Limited',
      action_type: 'buyback',
      description: 'Buyback of shares at ₹500 per share (premium to market)',
      announcement_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ex_date: null,
      record_date: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_date: null,
      ratio: null,
      dividend_amount: 500
    },
    {
      symbol: 'ICICIBANK',
      security_name: 'ICICI Bank',
      action_type: 'dividend',
      description: 'Final dividend of ₹10 per share',
      announcement_date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ex_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      record_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_date: new Date(today.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ratio: null,
      dividend_amount: 10
    }
  ]
  return actions
}

// Generate AI summary for a corporate action
async function generateAISummary(
  action: CorporateAction,
  affectedClients: { client_name: string; quantity: number; estimated_impact: number }[]
): Promise<{ summary: string; suggestion: string }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  
  if (!apiKey) {
    // Fallback to rule-based summary
    return generateRuleBasedSummary(action, affectedClients)
  }

  try {
    const clientContext = affectedClients.slice(0, 5).map(c => 
      `${c.client_name}: ${c.quantity} shares, ₹${c.estimated_impact.toLocaleString()} impact`
    ).join('\n')

    const prompt = `You are a wealth advisor assistant. Summarize this corporate action and suggest next steps.

Corporate Action:
- Security: ${action.security_name} (${action.symbol})
- Type: ${action.action_type}
- Description: ${action.description}
- Ex-Date: ${action.ex_date || 'TBD'}
- Record Date: ${action.record_date || 'TBD'}
- Payment Date: ${action.payment_date || 'TBD'}
${action.dividend_amount ? `- Amount: ₹${action.dividend_amount}` : ''}
${action.ratio ? `- Ratio: ${action.ratio}` : ''}

Affected Clients (top 5):
${clientContext || 'No client holdings found'}

Provide a JSON response with:
1. "summary": A clear 1-2 sentence explanation for advisors (mention total impact if relevant)
2. "suggestion": One specific action to take (e.g., "Inform clients", "Review allocation", "Reinvest dividend")

Response format: {"summary": "...", "suggestion": "..."}`

    const response = await fetch('https://api.lovable.dev/ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      throw new Error('AI API request failed')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || generateRuleBasedSummary(action, affectedClients).summary,
        suggestion: parsed.suggestion || 'Review and inform clients'
      }
    }
  } catch (error) {
    console.error('AI summary error:', error)
  }

  return generateRuleBasedSummary(action, affectedClients)
}

function generateRuleBasedSummary(
  action: CorporateAction,
  affectedClients: { client_name: string; quantity: number; estimated_impact: number }[]
): { summary: string; suggestion: string } {
  const totalImpact = affectedClients.reduce((sum, c) => sum + c.estimated_impact, 0)
  const clientCount = affectedClients.length

  let summary = ''
  let suggestion = ''

  switch (action.action_type) {
    case 'dividend':
      summary = `${action.security_name} declared ₹${action.dividend_amount} dividend. ${clientCount} client${clientCount !== 1 ? 's' : ''} will receive approx ₹${totalImpact.toLocaleString()} total.`
      suggestion = totalImpact > 100000 ? 'Discuss reinvestment options' : 'Inform clients about dividend'
      break
    case 'bonus':
      summary = `${action.security_name} bonus issue ${action.ratio}. ${clientCount} client${clientCount !== 1 ? 's' : ''} will receive additional shares.`
      suggestion = 'Review portfolio allocation post-bonus'
      break
    case 'split':
      summary = `${action.security_name} stock split ${action.ratio}. Share quantity will increase for ${clientCount} client${clientCount !== 1 ? 's' : ''}.`
      suggestion = 'Update records after split execution'
      break
    case 'buyback':
      summary = `${action.security_name} buyback at ₹${action.dividend_amount}. ${clientCount} client${clientCount !== 1 ? 's' : ''} eligible to participate.`
      suggestion = 'Evaluate participation based on current price'
      break
    case 'rights_issue':
      summary = `${action.security_name} rights issue. ${clientCount} client${clientCount !== 1 ? 's' : ''} can subscribe.`
      suggestion = 'Analyze rights pricing and recommend action'
      break
    case 'merger':
    case 'demerger':
      summary = `${action.security_name} ${action.action_type} announced. ${clientCount} client${clientCount !== 1 ? 's' : ''} affected.`
      suggestion = 'Review merger terms and client impact'
      break
    default:
      summary = `${action.security_name}: ${action.description}`
      suggestion = 'Review and inform affected clients'
  }

  return { summary, suggestion }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    let advisorId: string | null = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      advisorId = user?.id || null
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'fetch'
    const clientId = url.searchParams.get('clientId')

    if (action === 'fetch') {
      // Fetch and process corporate actions
      const mockActions = generateMockCorporateActions()
      
      // Get all clients with their simulated holdings
      const { data: clients } = await supabase
        .from('clients')
        .select('id, client_name, advisor_id, total_assets')

      if (!clients || clients.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'No clients found',
          actions: [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Simulate holdings based on client assets (in production, this would come from actual holdings data)
      const simulatedHoldings: ClientHolding[] = []
      const symbols = ['TCS', 'INFY', 'RELIANCE', 'HDFC', 'WIPRO', 'ICICIBANK']
      
      clients.forEach(client => {
        // Each client randomly holds 2-4 securities
        const heldSymbols = symbols.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3) + 2)
        heldSymbols.forEach(symbol => {
          simulatedHoldings.push({
            client_id: client.id,
            client_name: client.client_name,
            advisor_id: client.advisor_id,
            symbol,
            quantity: Math.floor(Math.random() * 500) + 50
          })
        })
      })

      const results = []

      for (const corpAction of mockActions) {
        // Find clients holding this security
        const affectedHoldings = simulatedHoldings.filter(h => h.symbol === corpAction.symbol)
        
        if (affectedHoldings.length === 0) continue

        // Check if action already exists
        const { data: existing } = await supabase
          .from('corporate_actions')
          .select('id')
          .eq('symbol', corpAction.symbol)
          .eq('action_type', corpAction.action_type)
          .eq('record_date', corpAction.record_date)
          .single()

        let actionId: string

        if (existing) {
          actionId = existing.id
        } else {
          // Calculate impacts for AI summary
          const clientImpacts = affectedHoldings.map(h => ({
            client_name: h.client_name,
            quantity: h.quantity,
            estimated_impact: corpAction.dividend_amount 
              ? h.quantity * corpAction.dividend_amount 
              : h.quantity * 100 // Estimated value for non-dividend actions
          }))

          // Generate AI summary
          const { summary, suggestion } = await generateAISummary(corpAction, clientImpacts)

          // Insert corporate action
          const { data: newAction, error } = await supabase
            .from('corporate_actions')
            .insert({
              symbol: corpAction.symbol,
              security_name: corpAction.security_name,
              action_type: corpAction.action_type,
              description: corpAction.description,
              announcement_date: corpAction.announcement_date,
              ex_date: corpAction.ex_date,
              record_date: corpAction.record_date,
              payment_date: corpAction.payment_date,
              ratio: corpAction.ratio,
              dividend_amount: corpAction.dividend_amount,
              ai_summary: summary,
              ai_suggestion: suggestion,
              source: 'mock_data',
              status: 'upcoming'
            })
            .select('id')
            .single()

          if (error) {
            console.error('Error inserting corporate action:', error)
            continue
          }

          actionId = newAction.id
        }

        // Create client-specific records
        for (const holding of affectedHoldings) {
          const estimatedImpact = corpAction.dividend_amount 
            ? holding.quantity * corpAction.dividend_amount 
            : null

          // Generate personalized summary
          const personalizedSummary = corpAction.dividend_amount
            ? `${holding.client_name} holds ${holding.quantity} shares of ${corpAction.symbol}. Expected ${corpAction.action_type}: ₹${estimatedImpact?.toLocaleString()}`
            : `${holding.client_name} holds ${holding.quantity} shares of ${corpAction.symbol}. ${corpAction.action_type} with ratio ${corpAction.ratio || 'TBD'}`

          // Upsert client corporate action
          await supabase
            .from('client_corporate_actions')
            .upsert({
              corporate_action_id: actionId,
              client_id: holding.client_id,
              advisor_id: holding.advisor_id,
              holdings_quantity: holding.quantity,
              estimated_impact: estimatedImpact,
              ai_personalized_summary: personalizedSummary
            }, {
              onConflict: 'corporate_action_id,client_id'
            })
        }

        results.push({
          symbol: corpAction.symbol,
          action_type: corpAction.action_type,
          affected_clients: affectedHoldings.length
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'list') {
      // List corporate actions for dashboard
      let query = supabase
        .from('corporate_actions')
        .select(`
          *,
          client_corporate_actions!inner(
            client_id,
            advisor_id,
            holdings_quantity,
            estimated_impact,
            is_notified
          )
        `)
        .order('ex_date', { ascending: true })

      if (advisorId) {
        query = query.eq('client_corporate_actions.advisor_id', advisorId)
      }

      const { data: actions, error } = await query

      if (error) {
        throw error
      }

      // Aggregate data
      const aggregated = actions?.map(action => {
        const clientActions = action.client_corporate_actions || []
        return {
          id: action.id,
          symbol: action.symbol,
          security_name: action.security_name,
          action_type: action.action_type,
          description: action.description,
          ex_date: action.ex_date,
          record_date: action.record_date,
          payment_date: action.payment_date,
          ratio: action.ratio,
          dividend_amount: action.dividend_amount,
          status: action.status,
          ai_summary: action.ai_summary,
          ai_suggestion: action.ai_suggestion,
          affected_clients: clientActions.length,
          total_impact: clientActions.reduce((sum: number, ca: any) => sum + (ca.estimated_impact || 0), 0)
        }
      }) || []

      return new Response(JSON.stringify({ 
        success: true, 
        actions: aggregated 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'client' && clientId) {
      // Get corporate actions for a specific client
      const { data, error } = await supabase
        .from('client_corporate_actions')
        .select(`
          *,
          corporate_actions(*)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(JSON.stringify({ 
        success: true, 
        actions: data || [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'notify') {
      // Mark action as notified and optionally create task
      const body = await req.json()
      const { clientCorporateActionId, createTask } = body

      const { data: cca, error: fetchError } = await supabase
        .from('client_corporate_actions')
        .select('*, corporate_actions(*), clients(client_name)')
        .eq('id', clientCorporateActionId)
        .single()

      if (fetchError) throw fetchError

      // Update notification status
      await supabase
        .from('client_corporate_actions')
        .update({ 
          is_notified: true, 
          notified_at: new Date().toISOString() 
        })
        .eq('id', clientCorporateActionId)

      if (createTask && cca) {
        const corpAction = cca.corporate_actions
        const clientName = (cca.clients as any)?.client_name || 'Client'

        // Create task
        const { data: task } = await supabase
          .from('tasks')
          .insert({
            title: `${corpAction.action_type} action for ${clientName} - ${corpAction.symbol}`,
            description: cca.ai_personalized_summary || corpAction.ai_summary,
            priority: 'high',
            status: 'todo',
            due_date: corpAction.record_date || corpAction.ex_date,
            client_id: cca.client_id,
            assigned_to: cca.advisor_id,
            created_by: cca.advisor_id,
            trigger_type: 'manual'
          })
          .select('id')
          .single()

        if (task) {
          await supabase
            .from('client_corporate_actions')
            .update({ task_created: true, task_id: task.id })
            .eq('id', clientCorporateActionId)
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Corporate actions error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
