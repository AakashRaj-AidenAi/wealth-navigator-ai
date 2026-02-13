import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, extractItems } from '@/services/api';
import { toast } from '@/hooks/use-toast';

// ── Client AUM ──
export const useClientAUM = () => {
  return useQuery({
    queryKey: ['client-aum'],
    queryFn: async () => {
      const data = await api.get('/clients/aum');
      return extractItems<any>(data);
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
      if (record.id) {
        return api.put<any>(`/clients/aum/${record.id}`, record);
      }
      return api.post<any>('/clients/aum', record);
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
      const data = await api.get('/reports/revenue');
      return extractItems<any>(data);
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
      if (record.id) {
        return api.put<any>(`/reports/revenue/${record.id}`, record);
      }
      return api.post<any>('/reports/revenue', record);
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
    mutationFn: (id: string) => api.delete<void>(`/reports/revenue/${id}`),
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
      const data = await api.get('/reports/commissions');
      return extractItems<any>(data);
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
      if (record.id) {
        return api.put<any>(`/reports/commissions/${record.id}`, record);
      }
      return api.post<any>('/reports/commissions', record);
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
    mutationFn: (id: string) => api.delete<void>(`/reports/commissions/${id}`),
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
      const data = await api.get('/reports/invoices');
      return extractItems<any>(data);
    },
  });
};

export const useUpsertInvoice = () => {
  const qc = useQueryClient();
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
      if (record.id) {
        return api.put<any>(`/reports/invoices/${record.id}`, record);
      }
      return api.post<any>('/reports/invoices', record);
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
    mutationFn: (id: string) => api.delete<void>(`/reports/invoices/${id}`),
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
      const params: Record<string, string> = {};
      if (invoiceId) params.invoice_id = invoiceId;
      const data = await api.get('/reports/payments', params);
      return extractItems<any>(data);
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
      if (record.id) {
        return api.put<any>(`/reports/payments/${record.id}`, record);
      }
      return api.post<any>('/reports/payments', record);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Payment recorded' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};
