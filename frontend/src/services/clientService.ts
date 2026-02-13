import { api } from './api';

export interface Client {
  id: string;
  advisor_id: string;
  first_name: string;
  last_name: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  risk_profile: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientListResponse {
  clients: Client[];
  total: number;
}

export const clientService = {
  list: (params?: { skip?: number; limit?: number; search?: string; risk_profile?: string }) =>
    api.get<ClientListResponse>('/clients/', params),

  get: (id: string) => api.get<Client>(`/clients/${id}`),

  create: (data: Partial<Client>) => api.post<Client>('/clients/', data),

  update: (id: string, data: Partial<Client>) => api.put<Client>(`/clients/${id}`, data),

  delete: (id: string) => api.delete<void>(`/clients/${id}`),
};
