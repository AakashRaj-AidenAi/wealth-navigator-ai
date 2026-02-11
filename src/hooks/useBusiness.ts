import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// ── Client AUM ──
export const useClientAUM = () => {
  return useQuery({
    queryKey: ['client-aum'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_aum')
        .select('*, clients(client_name)')
        .order('last_updated', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useUpsertClientAUM = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      id?: string;
      client_id: string;
      current_aum?: number;
      equity_aum?: number;
      debt_aum?: number;
      other_assets?: number;
    }) => {
      const { data, error } = record.id
        ? await supabase.from('client_aum').update(record).eq('id', record.id).select().single()
        : await supabase.from('client_aum').insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-aum'] });
      toast({ title: 'AUM record saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

// ── Revenue Records ──
export const useRevenueRecords = () => {
  return useQuery({
    queryKey: ['revenue-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_records')
        .select('*, clients(client_name)')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useUpsertRevenue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      id?: string;
      client_id: string;
      product_type: string;
      revenue_type?: string;
      amount: number;
      date?: string;
      recurring?: boolean;
    }) => {
      const { data, error } = record.id
        ? await supabase.from('revenue_records').update(record).eq('id', record.id).select().single()
        : await supabase.from('revenue_records').insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenue-records'] });
      toast({ title: 'Revenue record saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

export const useDeleteRevenue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('revenue_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenue-records'] });
      toast({ title: 'Revenue record deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

// ── Commission Records ──
export const useCommissionRecords = () => {
  return useQuery({
    queryKey: ['commission-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_records')
        .select('*, clients(client_name)')
        .order('payout_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useUpsertCommission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      id?: string;
      client_id: string;
      product_name: string;
      upfront_commission?: number;
      trail_commission?: number;
      payout_date?: string;
    }) => {
      const { data, error } = record.id
        ? await supabase.from('commission_records').update(record).eq('id', record.id).select().single()
        : await supabase.from('commission_records').insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-records'] });
      toast({ title: 'Commission record saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

export const useDeleteCommission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('commission_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-records'] });
      toast({ title: 'Commission record deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

// ── Invoices ──
export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(client_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useUpsertInvoice = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (record: {
      id?: string;
      client_id: string;
      invoice_number?: string;
      amount: number;
      gst?: number;
      total_amount: number;
      status?: string;
      due_date?: string;
    }) => {
      const payload = { ...record, advisor_id: user?.id };
      const { data, error } = record.id
        ? await supabase.from('invoices').update(payload).eq('id', record.id).select().single()
        : await supabase.from('invoices').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Invoice saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

export const useDeleteInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Invoice deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

// ── Payments ──
export const usePayments = (invoiceId?: string) => {
  return useQuery({
    queryKey: ['payments', invoiceId],
    queryFn: async () => {
      let q = supabase.from('payments').select('*').order('payment_date', { ascending: false });
      if (invoiceId) q = q.eq('invoice_id', invoiceId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
};

export const useUpsertPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      id?: string;
      invoice_id: string;
      payment_date?: string;
      payment_mode?: string;
      amount_received: number;
    }) => {
      const { data, error } = record.id
        ? await supabase.from('payments').update(record).eq('id', record.id).select().single()
        : await supabase.from('payments').insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Payment recorded' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};
