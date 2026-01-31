import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ClientSignal {
  client_id: string;
  client_name: string;
  total_assets: number | null;
  signals: string[];
  raw_data: {
    days_since_contact: number | null;
    kyc_days_until_expiry: number | null;
    goal_shortfall_percent: number | null;
    pending_orders: number;
    has_upcoming_birthday: boolean;
  };
}

interface PrioritizedClient {
  id: string;
  client_name: string;
  total_assets: number | null;
  priority_score: number;
  reason: string;
  suggested_action: string;
  urgency: 'critical' | 'high' | 'medium';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Get user from token
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
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // Fetch all clients for this advisor
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, client_name, total_assets, kyc_expiry_date, date_of_birth, email, phone')
      .eq('advisor_id', advisorId)
      .eq('status', 'active');

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      throw new Error('Failed to fetch clients');
    }

    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ prioritized_clients: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientIds = clients.map(c => c.id);

    // Fetch last activities for each client
    const { data: activities } = await supabase
      .from('client_activities')
      .select('client_id, created_at, activity_type')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false });

    // Fetch goals with shortfall
    const { data: goals } = await supabase
      .from('goals')
      .select('client_id, current_amount, target_amount, status')
      .in('client_id', clientIds)
      .neq('status', 'completed');

    // Fetch pending orders
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('client_id')
      .in('client_id', clientIds)
      .eq('status', 'pending');

    // Fetch recent communications
    const { data: communications } = await supabase
      .from('communication_logs')
      .select('client_id, sent_at')
      .in('client_id', clientIds)
      .order('sent_at', { ascending: false });

    // Build signals for each client
    const clientSignals: ClientSignal[] = clients.map(client => {
      const signals: string[] = [];
      const rawData = {
        days_since_contact: null as number | null,
        kyc_days_until_expiry: null as number | null,
        goal_shortfall_percent: null as number | null,
        pending_orders: 0,
        has_upcoming_birthday: false,
      };

      // Check last contact (activities or communications)
      const clientActivities = activities?.filter(a => a.client_id === client.id) || [];
      const clientComms = communications?.filter(c => c.client_id === client.id) || [];
      
      let lastContact: Date | null = null;
      if (clientActivities.length > 0) {
        lastContact = new Date(clientActivities[0].created_at);
      }
      if (clientComms.length > 0) {
        const commDate = new Date(clientComms[0].sent_at);
        if (!lastContact || commDate > lastContact) {
          lastContact = commDate;
        }
      }

      if (lastContact) {
        const daysSince = Math.floor((today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
        rawData.days_since_contact = daysSince;
        if (daysSince > 60) {
          signals.push(`No contact in ${daysSince} days`);
        } else if (daysSince > 30) {
          signals.push(`Last contact ${daysSince} days ago`);
        }
      } else {
        signals.push('Never contacted');
        rawData.days_since_contact = 999;
      }

      // Check KYC expiry
      if (client.kyc_expiry_date) {
        const kycDate = new Date(client.kyc_expiry_date);
        const daysUntil = Math.floor((kycDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        rawData.kyc_days_until_expiry = daysUntil;
        if (daysUntil < 0) {
          signals.push('KYC expired');
        } else if (daysUntil <= 7) {
          signals.push(`KYC expires in ${daysUntil} days`);
        } else if (daysUntil <= 30) {
          signals.push('KYC expiring soon');
        }
      }

      // Check goal shortfall
      const clientGoals = goals?.filter(g => g.client_id === client.id) || [];
      for (const goal of clientGoals) {
        const current = Number(goal.current_amount) || 0;
        const target = Number(goal.target_amount) || 1;
        const progress = (current / target) * 100;
        if (progress < 50) {
          rawData.goal_shortfall_percent = Math.round(100 - progress);
          signals.push(`Goal ${Math.round(100 - progress)}% behind target`);
          break;
        }
      }

      // Check pending orders
      const clientPendingOrders = pendingOrders?.filter(o => o.client_id === client.id) || [];
      rawData.pending_orders = clientPendingOrders.length;
      if (clientPendingOrders.length > 0) {
        signals.push(`${clientPendingOrders.length} pending order(s)`);
      }

      // Check upcoming birthday
      if (client.date_of_birth) {
        const dob = new Date(client.date_of_birth);
        const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        const daysUntilBirthday = Math.floor((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilBirthday >= 0 && daysUntilBirthday <= 7) {
          rawData.has_upcoming_birthday = true;
          if (daysUntilBirthday === 0) {
            signals.push('Birthday today!');
          } else {
            signals.push(`Birthday in ${daysUntilBirthday} days`);
          }
        }
      }

      return {
        client_id: client.id,
        client_name: client.client_name,
        total_assets: client.total_assets,
        signals,
        raw_data: rawData,
      };
    });

    // Filter clients with signals and calculate priority scores
    const clientsWithSignals = clientSignals.filter(c => c.signals.length > 0);

    if (clientsWithSignals.length === 0) {
      return new Response(JSON.stringify({ prioritized_clients: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to prioritize and generate recommendations
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let prioritizedClients: PrioritizedClient[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const prompt = `You are a wealth management AI assistant. Analyze these clients and prioritize them based on urgency.

Client data:
${JSON.stringify(clientsWithSignals.slice(0, 20), null, 2)}

For each client, provide:
1. priority_score (0-100, higher = more urgent)
2. reason (brief, 10 words max)
3. suggested_action (one of: "Schedule call", "Review portfolio", "Update KYC", "Send birthday wishes", "Process orders", "Goal review meeting")
4. urgency (critical/high/medium)

Return ONLY valid JSON array of top 10 clients sorted by priority_score descending:
[{"client_id": "...", "priority_score": 85, "reason": "...", "suggested_action": "...", "urgency": "high"}]`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a financial advisor AI. Return only valid JSON, no markdown.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Extract JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const aiPriorities = JSON.parse(jsonMatch[0]);
            
            prioritizedClients = aiPriorities.map((p: any) => {
              const clientData = clientsWithSignals.find(c => c.client_id === p.client_id);
              return {
                id: p.client_id,
                client_name: clientData?.client_name || 'Unknown',
                total_assets: clientData?.total_assets,
                priority_score: p.priority_score,
                reason: p.reason,
                suggested_action: p.suggested_action,
                urgency: p.urgency,
              };
            }).slice(0, 10);
          }
        }
      } catch (aiError) {
        console.error('AI prioritization error:', aiError);
      }
    }

    // Fallback to rule-based scoring if AI fails
    if (prioritizedClients.length === 0) {
      prioritizedClients = clientsWithSignals.map(client => {
        let score = 0;
        let primaryReason = client.signals[0];
        let action = 'Schedule call';
        let urgency: 'critical' | 'high' | 'medium' = 'medium';

        // Score based on signals
        if (client.raw_data.kyc_days_until_expiry !== null) {
          if (client.raw_data.kyc_days_until_expiry < 0) {
            score += 40;
            primaryReason = 'KYC expired';
            action = 'Update KYC';
            urgency = 'critical';
          } else if (client.raw_data.kyc_days_until_expiry <= 7) {
            score += 30;
            action = 'Update KYC';
            urgency = 'high';
          }
        }

        if (client.raw_data.days_since_contact !== null) {
          if (client.raw_data.days_since_contact > 90) {
            score += 35;
            if (urgency !== 'critical') urgency = 'high';
          } else if (client.raw_data.days_since_contact > 60) {
            score += 25;
          }
        }

        if (client.raw_data.pending_orders > 0) {
          score += 25;
          action = 'Process orders';
          if (urgency === 'medium') urgency = 'high';
        }

        if (client.raw_data.goal_shortfall_percent !== null && client.raw_data.goal_shortfall_percent > 50) {
          score += 20;
          action = 'Goal review meeting';
        }

        if (client.raw_data.has_upcoming_birthday) {
          score += 15;
          action = 'Send birthday wishes';
        }

        return {
          id: client.client_id,
          client_name: client.client_name,
          total_assets: client.total_assets,
          priority_score: Math.min(score, 100),
          reason: primaryReason,
          suggested_action: action,
          urgency,
        };
      })
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 10);
    }

    console.log(`Prioritized ${prioritizedClients.length} clients for advisor ${advisorId}`);

    return new Response(JSON.stringify({ prioritized_clients: prioritizedClients }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Smart prioritization error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
