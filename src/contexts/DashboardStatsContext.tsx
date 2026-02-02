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
        complianceAlertsResult,
      ] = await Promise.all([
        // Fetch ALL clients for accurate count (no advisor filter)
        supabase.from('clients').select('id, total_assets, kyc_expiry_date'),
        supabase.from('orders').select('id').eq('status', 'pending'),
        supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', user.id)
          .in('status', ['todo', 'in_progress']),
        supabase
          .from('leads')
          .select('id')
          .eq('assigned_to', user.id)
          .not('stage', 'in', '("closed_won","lost")'),
        // Fetch from compliance_alerts table
        supabase.from('compliance_alerts').select('id').eq('is_resolved', false),
      ]);

      const clients = clientsResult.data || [];
      const orders = ordersResult.data || [];
      const tasks = tasksResult.data || [];
      const leads = leadsResult.data || [];
      const complianceAlerts = complianceAlertsResult.data || [];

      // Calculate dynamic compliance alerts from KYC expiry dates
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      let dynamicAlertsCount = 0;
      clients.forEach(client => {
        if (client.kyc_expiry_date) {
          const expiryDate = new Date(client.kyc_expiry_date);
          if (expiryDate <= thirtyDaysFromNow) {
            dynamicAlertsCount++;
          }
        }
      });

      // Use the higher count between table alerts and dynamic alerts
      const alertsCount = Math.max(complianceAlerts.length, dynamicAlertsCount);

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
