import { api } from './api';

export const campaignService = {
  list: (params?: Record<string, string | number>) => api.get<any>('/campaigns/', params),
  get: (id: string) => api.get<any>(`/campaigns/${id}`),
  create: (data: any) => api.post<any>('/campaigns/', data),
  update: (id: string, data: any) => api.put<any>(`/campaigns/${id}`, data),
};
