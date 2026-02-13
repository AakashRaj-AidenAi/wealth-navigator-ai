import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';

export function useCampaignInsights() {
  return useQuery({
    queryKey: ['campaign-insights'],
    queryFn: async () => {
      return await api.post<any>('/insights/campaign-ai', { action: 'campaign_insights' });
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePredictiveTargeting() {
  return useQuery({
    queryKey: ['predictive-targeting'],
    queryFn: async () => {
      return await api.post<any>('/insights/campaign-ai', { action: 'predictive_targeting' });
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useEngagementScoring() {
  return useQuery({
    queryKey: ['engagement-scoring'],
    queryFn: async () => {
      return await api.post<any>('/insights/campaign-ai', { action: 'engagement_scoring' });
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useSmartSendTime() {
  return useQuery({
    queryKey: ['smart-send-time'],
    queryFn: async () => {
      return await api.post<any>('/insights/campaign-ai', { action: 'smart_send_time' });
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useGenerateContent() {
  return useMutation({
    mutationFn: async (context: { content_type: string; tone?: string; audience_context?: string }) => {
      return await api.post<any>('/insights/campaign-ai', { action: 'generate_content', context });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePersonalizeDraft() {
  return useMutation({
    mutationFn: async (context: { client_id: string; purpose?: string }) => {
      return await api.post<any>('/insights/campaign-ai', { action: 'personalize_draft', context });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
