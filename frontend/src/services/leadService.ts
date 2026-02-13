import { api } from './api';

export const leadService = {
  list: (params?: Record<string, string | number>) => api.get<any>('/leads/', params),
  get: (id: string) => api.get<any>(`/leads/${id}`),
  create: (data: any) => api.post<any>('/leads/', data),
  update: (id: string, data: any) => api.put<any>(`/leads/${id}`, data),
  delete: (id: string) => api.delete<void>(`/leads/${id}`),
};
