import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCampaignInsights() {
  return useQuery({
    queryKey: ['campaign-insights'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('campaign-ai', {
        body: { action: 'campaign_insights' },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePredictiveTargeting() {
  return useQuery({
    queryKey: ['predictive-targeting'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('campaign-ai', {
        body: { action: 'predictive_targeting' },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useEngagementScoring() {
  return useQuery({
    queryKey: ['engagement-scoring'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('campaign-ai', {
        body: { action: 'engagement_scoring' },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useSmartSendTime() {
  return useQuery({
    queryKey: ['smart-send-time'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('campaign-ai', {
        body: { action: 'smart_send_time' },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useGenerateContent() {
  return useMutation({
    mutationFn: async (context: { content_type: string; tone?: string; audience_context?: string }) => {
      const { data, error } = await supabase.functions.invoke('campaign-ai', {
        body: { action: 'generate_content', context },
      });
      if (error) throw error;
      return data;
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePersonalizeDraft() {
  return useMutation({
    mutationFn: async (context: { client_id: string; purpose?: string }) => {
      const { data, error } = await supabase.functions.invoke('campaign-ai', {
        body: { action: 'personalize_draft', context },
      });
      if (error) throw error;
      return data;
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
