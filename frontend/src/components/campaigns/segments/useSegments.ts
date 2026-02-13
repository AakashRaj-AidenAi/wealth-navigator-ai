import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CampaignSegment, SegmentFilterCriteria } from './types';

export function useSegments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['campaign-segments'],
    queryFn: async () => {
      const data = extractItems<CampaignSegment>(await api.get('/campaign_segments'));
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (segment: {
      name: string;
      description?: string;
      filter_criteria: SegmentFilterCriteria;
      is_auto_updating: boolean;
      client_count: number;
    }) => {
      return await api.post<CampaignSegment>('/campaign_segments', {
        name: segment.name,
        description: segment.description,
        filter_criteria: segment.filter_criteria,
        is_auto_updating: segment.is_auto_updating,
        client_count: segment.client_count,
        created_by: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-segments'] });
      toast.success('Segment created successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampaignSegment> & { id: string }) => {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.is_auto_updating !== undefined) payload.is_auto_updating = updates.is_auto_updating;
      if (updates.client_count !== undefined) payload.client_count = updates.client_count;
      if (updates.filter_criteria) {
        payload.filter_criteria = updates.filter_criteria;
      }
      return await api.put<CampaignSegment>(`/campaign_segments/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-segments'] });
      toast.success('Segment updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/campaign_segments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-segments'] });
      toast.success('Segment deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePreviewSegmentClients(filters: SegmentFilterCriteria) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['segment-preview', filters],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (filters.aum_min != null) params.aum_min = filters.aum_min;
      if (filters.aum_max != null) params.aum_max = filters.aum_max;
      if (filters.risk_profiles?.length) params.risk_profiles = filters.risk_profiles.join(',');
      if (filters.status?.length) params.status = filters.status.join(',');
      if (filters.client_type?.length) params.client_type = filters.client_type.join(',');
      if (filters.location) params.location = filters.location;

      return extractItems(await api.get('/campaign_segments/preview', params));
    },
    enabled: !!user,
  });
}
