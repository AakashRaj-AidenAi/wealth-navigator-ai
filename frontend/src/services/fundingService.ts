import { api } from './api';

export const fundingService = {
  listRequests: (params?: Record<string, string | number>) => api.get<any>('/funding/requests', params),
  getRequest: (id: string) => api.get<any>(`/funding/requests/${id}`),
  createRequest: (data: any) => api.post<any>('/funding/requests', data),
  listAccounts: () => api.get<any>('/funding/accounts'),
  getCashBalances: () => api.get<any>('/funding/cash-balances'),
};
