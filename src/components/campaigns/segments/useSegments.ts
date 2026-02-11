import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CampaignSegment, SegmentFilterCriteria } from './types';

export function useSegments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['campaign-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_segments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CampaignSegment[];
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
      const { data, error } = await supabase
        .from('campaign_segments')
        .insert([{
          name: segment.name,
          description: segment.description,
          filter_criteria: JSON.parse(JSON.stringify(segment.filter_criteria)),
          is_auto_updating: segment.is_auto_updating,
          client_count: segment.client_count,
          created_by: user!.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
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
        payload.filter_criteria = JSON.parse(JSON.stringify(updates.filter_criteria));
      }
      const { data, error } = await supabase
        .from('campaign_segments')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('campaign_segments')
        .delete()
        .eq('id', id);
      if (error) throw error;
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
      let query = supabase
        .from('clients')
        .select('id, client_name, email, phone, total_assets, risk_profile, status, address, client_type');

      if (filters.aum_min != null) {
        query = query.gte('total_assets', filters.aum_min);
      }
      if (filters.aum_max != null) {
        query = query.lte('total_assets', filters.aum_max);
      }
      if (filters.risk_profiles?.length) {
        query = query.in('risk_profile', filters.risk_profiles);
      }
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters.client_type?.length) {
        query = query.in('client_type', filters.client_type as ('individual' | 'entity')[]);
      }
      if (filters.location) {
        query = query.ilike('address', `%${filters.location}%`);
      }

      const { data, error } = await query.order('client_name').limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
