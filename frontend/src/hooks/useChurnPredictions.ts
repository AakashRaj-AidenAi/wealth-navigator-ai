import { useState, useCallback } from 'react';
import { api, extractItems } from '@/services/api';
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
    try {
      const data = await api.get('/insights/churn-predictions');
      setPredictions(extractItems<ChurnPrediction>(data));
    } catch (error) {
      console.error('Error fetching churn predictions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getPredictionForClient = (clientId: string) =>
    predictions.find(p => p.client_id === clientId);

  const calculateAndUpsert = useCallback(async (clientId: string) => {
    if (!user) return;

    try {
      await api.post<ChurnPrediction>(`/insights/churn-predictions/${clientId}/calculate`);
      await fetchPredictions();
    } catch (err) {
      console.error('Error calculating churn risk:', err);
      toast({ title: 'Error', description: 'Failed to calculate churn risk', variant: 'destructive' });
    }
  }, [user, fetchPredictions, toast]);

  const calculateAll = useCallback(async (clientIds: string[]) => {
    try {
      await api.post('/insights/churn-predictions/calculate-batch', { client_ids: clientIds });
      await fetchPredictions();
    } catch (err) {
      console.error('Error calculating churn risk batch:', err);
      toast({ title: 'Error', description: 'Failed to calculate churn risk', variant: 'destructive' });
    }
  }, [fetchPredictions, toast]);

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
