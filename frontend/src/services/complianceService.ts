import { api } from './api';

export const complianceService = {
  getAlerts: (params?: Record<string, string | number>) => api.get<any>('/compliance/alerts', params),
  getRiskProfiles: () => api.get<any>('/compliance/risk-profiles'),
  getAuditLog: (params?: Record<string, string | number>) => api.get<any>('/compliance/audit-log', params),
};
