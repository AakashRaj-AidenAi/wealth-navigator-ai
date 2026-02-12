import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChurnPrediction {
  id: string;
  client_id: string;
  churn_risk_percentage: number;
  risk_level: string;
  days_since_interaction: number;
  sip_stopped: boolean;
  engagement_score: number;
  campaign_responses: number;
  total_campaigns: number;
  risk_factors: string[];
  calculated_at: string;
}

export const useChurnPredictions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPredictions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('churn_predictions')
      .select('*');
    if (data) setPredictions(data as unknown as ChurnPrediction[]);
    if (error) console.error('Error fetching churn predictions:', error);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

  const getPredictionForClient = (clientId: string) =>
    predictions.find(p => p.client_id === clientId);

  const calculateAndUpsert = useCallback(async (clientId: string) => {
    if (!user) return;

    try {
      const riskFactors: string[] = [];
      let riskScore = 0;

      // 1. Days since last interaction (max 30 pts)
      const { data: lastActivity } = await supabase
        .from('client_activities')
        .select('created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);

      const daysSince = lastActivity?.[0]
        ? Math.floor((Date.now() - new Date(lastActivity[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 365;

      if (daysSince >= 90) {
        riskScore += 30;
        riskFactors.push('No interaction in 90+ days');
      } else if (daysSince >= 45) {
        riskScore += 20;
        riskFactors.push('No interaction in 45+ days');
      } else if (daysSince >= 30) {
        riskScore += 10;
        riskFactors.push('No interaction in 30+ days');
      }

      // 2. SIP stopped — check if orders have declined (max 20 pts)
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

      const { count: recentOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('order_type', 'buy')
        .gte('created_at', threeMonthsAgo);

      const { count: olderOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('order_type', 'buy')
        .gte('created_at', sixMonthsAgo)
        .lt('created_at', threeMonthsAgo);

      const sipStopped = (olderOrders ?? 0) > 0 && (recentOrders ?? 0) === 0;
      if (sipStopped) {
        riskScore += 20;
        riskFactors.push('Investment activity stopped (SIP likely halted)');
      } else if ((recentOrders ?? 0) < (olderOrders ?? 0) / 2 && (olderOrders ?? 0) > 0) {
        riskScore += 10;
        riskFactors.push('Investment frequency declining');
      }

      // 3. Engagement score below 40 (max 25 pts)
      const { data: engData } = await supabase
        .from('client_engagement_scores')
        .select('engagement_score')
        .eq('client_id', clientId)
        .maybeSingle();

      const engScore = engData?.engagement_score ?? 50;
      if (engScore < 20) {
        riskScore += 25;
        riskFactors.push('Very low engagement score (' + engScore + ')');
      } else if (engScore < 40) {
        riskScore += 15;
        riskFactors.push('Low engagement score (' + engScore + ')');
      }

      // 4. No campaign responses (max 15 pts)
      const { count: totalCampaigns } = await supabase
        .from('communication_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      const { count: openedCampaigns } = await supabase
        .from('communication_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .not('opened_at', 'is', null);

      if ((totalCampaigns ?? 0) > 2 && (openedCampaigns ?? 0) === 0) {
        riskScore += 15;
        riskFactors.push('Zero campaign responses');
      } else if ((totalCampaigns ?? 0) > 0 && ((openedCampaigns ?? 0) / (totalCampaigns ?? 1)) < 0.2) {
        riskScore += 8;
        riskFactors.push('Very low campaign response rate');
      }

      // 5. Revenue decline (max 10 pts)
      const { data: revenueRecent } = await supabase
        .from('revenue_records')
        .select('amount')
        .eq('client_id', clientId)
        .gte('date', threeMonthsAgo);

      const { data: revenueOlder } = await supabase
        .from('revenue_records')
        .select('amount')
        .eq('client_id', clientId)
        .gte('date', sixMonthsAgo)
        .lt('date', threeMonthsAgo);

      const recentRev = (revenueRecent ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const olderRev = (revenueOlder ?? []).reduce((s, r) => s + Number(r.amount), 0);

      if (olderRev > 0 && recentRev === 0) {
        riskScore += 10;
        riskFactors.push('Revenue contribution dropped to zero');
      } else if (olderRev > 0 && recentRev < olderRev * 0.5) {
        riskScore += 5;
        riskFactors.push('Revenue contribution declining');
      }

      const finalRisk = Math.min(100, riskScore);

      if (riskFactors.length === 0) {
        riskFactors.push('No significant risk factors detected');
      }

      const { error } = await supabase
        .from('churn_predictions')
        .upsert({
          client_id: clientId,
          advisor_id: user.id,
          churn_risk_percentage: finalRisk,
          days_since_interaction: daysSince,
          sip_stopped: sipStopped,
          engagement_score: engScore,
          campaign_responses: openedCampaigns ?? 0,
          total_campaigns: totalCampaigns ?? 0,
          risk_factors: riskFactors,
          calculated_at: new Date().toISOString(),
        } as any, { onConflict: 'client_id' });

      if (error) throw error;
      await fetchPredictions();
    } catch (err) {
      console.error('Error calculating churn risk:', err);
      toast({ title: 'Error', description: 'Failed to calculate churn risk', variant: 'destructive' });
    }
  }, [user, fetchPredictions, toast]);

  const calculateAll = useCallback(async (clientIds: string[]) => {
    for (const id of clientIds) {
      await calculateAndUpsert(id);
    }
  }, [calculateAndUpsert]);

  return { predictions, loading, getPredictionForClient, calculateAndUpsert, calculateAll, refetch: fetchPredictions };
};

export const churnRiskConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  high: { label: 'High Risk', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20' },
  medium: { label: 'Medium Risk', color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20' },
  low: { label: 'Low Risk', color: 'text-success', bgColor: 'bg-success/10 border-success/20' },
};

export const getChurnRiskLevel = (percentage: number): string => {
  if (percentage >= 70) return 'high';
  if (percentage >= 40) return 'medium';
  return 'low';
};
