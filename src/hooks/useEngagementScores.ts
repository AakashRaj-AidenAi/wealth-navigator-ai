import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EngagementScore {
  id: string;
  client_id: string;
  engagement_score: number;
  engagement_level: string;
  days_since_last_interaction: number | null;
  meetings_last_90_days: number | null;
  campaign_response_rate: number | null;
  portfolio_activity_frequency: number | null;
  revenue_contribution: number | null;
  task_completion_rate: number | null;
  calculated_at: string;
}

export const useEngagementScores = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scores, setScores] = useState<EngagementScore[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchScores = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('client_engagement_scores')
      .select('*');
    if (data) setScores(data as unknown as EngagementScore[]);
    if (error) console.error('Error fetching engagement scores:', error);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchScores(); }, [fetchScores]);

  const getScoreForClient = (clientId: string) => scores.find(s => s.client_id === clientId);

  const calculateAndUpsert = useCallback(async (clientId: string) => {
    if (!user) return;

    try {
      // 1. Days since last interaction (activities)
      const { data: lastActivity } = await supabase
        .from('client_activities')
        .select('created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);

      const daysSinceLast = lastActivity?.[0]
        ? Math.floor((Date.now() - new Date(lastActivity[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 365;

      // 2. Meetings in last 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { count: meetingsCount } = await supabase
        .from('client_activities')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('activity_type', 'meeting')
        .gte('created_at', ninetyDaysAgo);

      // 3. Campaign response rate (communications received vs total)
      const { count: totalComms } = await supabase
        .from('communication_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
      const { count: deliveredComms } = await supabase
        .from('communication_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .not('opened_at', 'is', null);
      const campaignRate = (totalComms ?? 0) > 0 ? ((deliveredComms ?? 0) / (totalComms ?? 1)) * 100 : 50;

      // 4. Portfolio activity (orders count)
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      // 5. Revenue contribution
      const { data: revenueData } = await supabase
        .from('revenue_records')
        .select('amount')
        .eq('client_id', clientId);
      const totalRevenue = (revenueData ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

      // 6. Task completion rate
      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
      const { count: completedTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'done');
      const taskRate = (totalTasks ?? 0) > 0 ? ((completedTasks ?? 0) / (totalTasks ?? 1)) * 100 : 50;

      // --- SCORING LOGIC (rule-based, 0-100) ---
      // Recency (25 pts): 0 days = 25, 365+ days = 0
      const recencyScore = Math.max(0, 25 - Math.floor((daysSinceLast / 365) * 25));

      // Meetings (20 pts): 5+ = 20
      const meetingsScore = Math.min(20, (meetingsCount ?? 0) * 4);

      // Campaign response (15 pts)
      const campaignScore = Math.round((campaignRate / 100) * 15);

      // Portfolio activity (15 pts): 10+ orders = 15
      const portfolioScore = Math.min(15, (ordersCount ?? 0) * 1.5);

      // Revenue (15 pts): normalize to 15 (assume 500k+ = max)
      const revenueScore = Math.min(15, Math.round((totalRevenue / 500000) * 15));

      // Task completion (10 pts)
      const taskScore = Math.round((taskRate / 100) * 10);

      const totalScore = Math.min(100, Math.round(
        recencyScore + meetingsScore + campaignScore + portfolioScore + revenueScore + taskScore
      ));

      // Upsert
      const { error } = await supabase
        .from('client_engagement_scores')
        .upsert({
          client_id: clientId,
          advisor_id: user.id,
          engagement_score: totalScore,
          days_since_last_interaction: daysSinceLast,
          meetings_last_90_days: meetingsCount ?? 0,
          campaign_response_rate: Math.round(campaignRate * 100) / 100,
          portfolio_activity_frequency: ordersCount ?? 0,
          revenue_contribution: totalRevenue,
          task_completion_rate: Math.round(taskRate * 100) / 100,
          calculated_at: new Date().toISOString(),
        } as any, { onConflict: 'client_id' });

      if (error) throw error;
      await fetchScores();
    } catch (err) {
      console.error('Error calculating engagement score:', err);
      toast({ title: 'Error', description: 'Failed to calculate engagement score', variant: 'destructive' });
    }
  }, [user, fetchScores, toast]);

  const calculateAll = useCallback(async (clientIds: string[]) => {
    for (const id of clientIds) {
      await calculateAndUpsert(id);
    }
  }, [calculateAndUpsert]);

  return { scores, loading, getScoreForClient, calculateAndUpsert, calculateAll, refetch: fetchScores };
};

export const engagementLevelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  high: { label: 'High', color: 'text-success', bgColor: 'bg-success/10 border-success/20' },
  medium: { label: 'Medium', color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20' },
  low: { label: 'Low', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20' },
};

export const getEngagementLevel = (score: number): string => {
  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};
