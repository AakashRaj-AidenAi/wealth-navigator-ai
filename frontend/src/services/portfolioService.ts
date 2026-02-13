import { api, extractItems } from './api';

export const portfolioService = {
  list: (params?: Record<string, string | number>) =>
    api.get<{ portfolios: any[]; total: number }>('/portfolios/', params),
  get: (id: string) => api.get<any>(`/portfolios/${id}`),
  getPositions: async (portfolioId: string) => extractItems(await api.get(`/portfolios/${portfolioId}/positions`)),
  getTransactions: (portfolioId: string, params?: Record<string, string | number>) =>
    api.get<any>(`/portfolios/${portfolioId}/transactions`, params),
};
