import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  segment_id: string | null;
  channel: string;
  subject: string | null;
  content: string;
  variables_used: string[];
  template_id: string | null;
  attachment_paths: string[];
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useCampaigns() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['campaigns-v2'],
    queryFn: async () => {
      const data = extractItems<Campaign>(await api.get('/campaigns_v2'));
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (campaign: {
      name: string;
      description?: string;
      segment_id?: string;
      channel: string;
      subject?: string;
      content: string;
      variables_used?: string[];
      template_id?: string;
      attachment_paths?: string[];
      status: string;
      scheduled_at?: string;
    }) => {
      return await api.post<Campaign>('/campaigns_v2', { ...campaign, created_by: user!.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns-v2'] });
      toast.success('Campaign saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      return await api.put<Campaign>(`/campaigns_v2/${id}`, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns-v2'] });
      toast.success('Campaign updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      // Use a dedicated send endpoint which handles segment resolution,
      // message log creation, and status update server-side
      const result = await api.post<{ sent: number }>(`/campaigns_v2/${campaignId}/send`, {
        sent_by: user!.id,
      });
      return result;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['campaigns-v2'] });
      toast.success(`Campaign sent to ${data.sent} clients`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
