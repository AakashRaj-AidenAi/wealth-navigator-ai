import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface DashboardStats {
  totalAUM: number;
  totalClients: number;
  pendingOrders: number;
  pendingTasks: number;
  activeLeads: number;
  alertsCount: number;
  unreadMessages: number;
}

interface DashboardStatsContextType {
  stats: DashboardStats;
  loading: boolean;
  refreshStats: () => Promise<void>;
}

const defaultStats: DashboardStats = {
  totalAUM: 0,
  totalClients: 0,
  pendingOrders: 0,
  pendingTasks: 0,
  activeLeads: 0,
  alertsCount: 0,
  unreadMessages: 0,
};

const DashboardStatsContext = createContext<DashboardStatsContextType | undefined>(undefined);

export const DashboardStatsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user) {
      setStats(defaultStats);
      setLoading(false);
      return;
    }

    try {
      // Parallel fetch all counts
      const [
        clientsResult,
        ordersResult,
        tasksResult,
        leadsResult,
        documentsResult,
        pendingConsentsResult,
      ] = await Promise.all([
        // Fetch ALL clients for accurate count (no advisor filter)
        supabase.from('clients').select('id, total_assets, kyc_expiry_date'),
        supabase.from('orders').select('id').eq('status', 'pending'),
        supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', user.id)
          .in('status', ['todo', 'in_progress']),
        // Fetch ALL leads (not filtered by assigned_to) to match Leads page
        supabase
          .from('leads')
          .select('id')
          .not('stage', 'in', '("closed_won","lost")'),
        // Fetch client documents for missing docs alerts
        supabase
          .from('client_documents')
          .select('client_id, document_type'),
        // Fetch pending consents
        supabase
          .from('client_consents')
          .select('id')
          .eq('status', 'pending'),
      ]);

      const clients = clientsResult.data || [];
      const orders = ordersResult.data || [];
      const tasks = tasksResult.data || [];
      const leads = leadsResult.data || [];
      const documents = documentsResult.data || [];
      const pendingConsents = pendingConsentsResult.data || [];

      // Calculate alerts count matching ComplianceAlerts.tsx logic
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // 1. KYC expiry alerts
      const kycAlerts = clients.filter(client => {
        if (!client.kyc_expiry_date) return false;
        const expiryDate = new Date(client.kyc_expiry_date);
        return expiryDate <= thirtyDaysFromNow;
      }).length;

      // 2. Missing documents alerts
      const requiredDocTypes = ['kyc', 'id_proof', 'address_proof'];
      const clientDocMap = new Map<string, Set<string>>();
      documents.forEach(doc => {
        if (!clientDocMap.has(doc.client_id)) {
          clientDocMap.set(doc.client_id, new Set());
        }
        clientDocMap.get(doc.client_id)!.add(doc.document_type);
      });
      const missingDocsAlerts = clients.filter(client => {
        const clientDocs = clientDocMap.get(client.id) || new Set();
        return requiredDocTypes.some(type => !clientDocs.has(type));
      }).length;

      // 3. Pending consents
      const pendingConsentsCount = pendingConsents.length;

      // Total alerts
      const alertsCount = kycAlerts + missingDocsAlerts + pendingConsentsCount;

      const totalAUM = clients.reduce((sum, c) => sum + (Number(c.total_assets) || 0), 0);

      setStats({
        totalAUM,
        totalClients: clients.length,
        pendingOrders: orders.length,
        pendingTasks: tasks.length,
        activeLeads: leads.length,
        alertsCount,
        unreadMessages: 0, // Placeholder - messages feature not fully implemented
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <DashboardStatsContext.Provider value={{ stats, loading, refreshStats: fetchStats }}>
      {children}
    </DashboardStatsContext.Provider>
  );
};

export const useDashboardStats = () => {
  const context = useContext(DashboardStatsContext);
  if (context === undefined) {
    throw new Error('useDashboardStats must be used within a DashboardStatsProvider');
  }
  return context;
};
