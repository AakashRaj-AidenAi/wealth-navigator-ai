import { useState, useCallback } from 'react';
import { api, extractItems } from '@/services/api';
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
    try {
      const data = await api.get('/insights/engagement-scores');
      setScores(extractItems<EngagementScore>(data));
    } catch (error) {
      console.error('Error fetching engagement scores:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getScoreForClient = (clientId: string) => scores.find(s => s.client_id === clientId);

  const calculateAndUpsert = useCallback(async (clientId: string) => {
    if (!user) return;

    try {
      await api.post<EngagementScore>(`/insights/engagement-scores/${clientId}/calculate`);
      await fetchScores();
    } catch (err) {
      console.error('Error calculating engagement score:', err);
      toast({ title: 'Error', description: 'Failed to calculate engagement score', variant: 'destructive' });
    }
  }, [user, fetchScores, toast]);

  const calculateAll = useCallback(async (clientIds: string[]) => {
    try {
      await api.post('/insights/engagement-scores/calculate-batch', { client_ids: clientIds });
      await fetchScores();
    } catch (err) {
      console.error('Error calculating engagement scores batch:', err);
      toast({ title: 'Error', description: 'Failed to calculate engagement scores', variant: 'destructive' });
    }
  }, [fetchScores, toast]);

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
