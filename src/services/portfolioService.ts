import { api } from './api';

export const portfolioService = {
  list: (params?: Record<string, string | number>) =>
    api.get<{ portfolios: any[]; total: number }>('/portfolios/', params),
  get: (id: string) => api.get<any>(`/portfolios/${id}`),
  getPositions: (portfolioId: string) => api.get<any[]>(`/portfolios/${portfolioId}/positions`),
  getTransactions: (portfolioId: string, params?: Record<string, string | number>) =>
    api.get<any>(`/portfolios/${portfolioId}/transactions`, params),
};
