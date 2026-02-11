import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('campaigns_v2')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
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
      const { data, error } = await supabase
        .from('campaigns_v2')
        .insert([{ ...campaign, created_by: user!.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from('campaigns_v2')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      // Get campaign
      const { data: campaign, error: cErr } = await supabase
        .from('campaigns_v2')
        .select('*, campaign_segments!campaigns_v2_segment_id_fkey(filter_criteria)')
        .eq('id', campaignId)
        .single();
      if (cErr) throw cErr;

      // Get segment clients
      let clientQuery = supabase.from('clients').select('id, client_name, email, phone, total_assets');
      const filters = (campaign as any).campaign_segments?.filter_criteria;
      if (filters) {
        if (filters.aum_min != null) clientQuery = clientQuery.gte('total_assets', filters.aum_min);
        if (filters.aum_max != null) clientQuery = clientQuery.lte('total_assets', filters.aum_max);
        if (filters.risk_profiles?.length) clientQuery = clientQuery.in('risk_profile', filters.risk_profiles);
        if (filters.status?.length) clientQuery = clientQuery.in('status', filters.status);
        if (filters.location) clientQuery = clientQuery.ilike('address', `%${filters.location}%`);
      }
      const { data: clients, error: clErr } = await clientQuery;
      if (clErr) throw clErr;
      if (!clients?.length) throw new Error('No clients in segment');

      // Create message logs
      const logs = clients.map(client => {
        let processedContent = campaign.content || '';
        processedContent = processedContent.replace(/\{\{client_name\}\}/g, client.client_name);
        processedContent = processedContent.replace(/\{\{portfolio_value\}\}/g, 
          client.total_assets?.toLocaleString('en-IN') ?? '0');
        
        return {
          campaign_id: campaignId,
          client_id: client.id,
          channel: campaign.channel,
          subject: campaign.subject,
          content: processedContent,
          status: 'sent',
          sent_at: new Date().toISOString(),
        };
      });

      const { error: logErr } = await supabase.from('campaign_message_logs').insert(logs);
      if (logErr) throw logErr;

      // Also log in communication_logs for client timeline
      const commLogs = clients.map(client => ({
        client_id: client.id,
        communication_type: campaign.channel,
        direction: 'outbound',
        subject: campaign.subject,
        content: campaign.content,
        sent_by: user!.id,
        sent_at: new Date().toISOString(),
        status: 'sent',
      }));
      await supabase.from('communication_logs').insert(commLogs);

      // Update campaign status
      await supabase.from('campaigns_v2').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        total_recipients: clients.length,
        sent_count: clients.length,
      }).eq('id', campaignId);

      return { sent: clients.length };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['campaigns-v2'] });
      toast.success(`Campaign sent to ${data.sent} clients`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
