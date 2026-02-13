import { api } from './api';

export const orderService = {
  list: (params?: Record<string, string | number>) => api.get<any>('/orders/', params),
  get: (id: string) => api.get<any>(`/orders/${id}`),
  create: (data: any) => api.post<any>('/orders/', data),
  updateStatus: (id: string, status: string) => api.patch<any>(`/orders/${id}`, { status }),
};
