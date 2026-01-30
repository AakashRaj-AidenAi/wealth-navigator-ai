import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ClientsTable } from '@/components/dashboard/ClientsTable';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { PortfolioChart } from '@/components/dashboard/PortfolioChart';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AICopilot } from '@/components/ai/AICopilot';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Users, TrendingUp, Shield, Briefcase, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  totalAUM: number;
  totalClients: number;
  avgClientAUM: number;
  pendingOrders: number;
}

const formatCurrency = (amount: number, short = false): string => {
  if (short) {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalAUM: 0,
    totalClients: 0,
    avgClientAUM: 0,
    pendingOrders: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      // Fetch clients
      const { data: clients } = await supabase
        .from('clients')
        .select('total_assets')
        .eq('advisor_id', user.id);
      
      // Fetch pending orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'pending');
      
      if (clients) {
        const totalAUM = clients.reduce((sum, c) => sum + (Number(c.total_assets) || 0), 0);
        setStats({
          totalAUM,
          totalClients: clients.length,
          avgClientAUM: clients.length > 0 ? totalAUM / clients.length : 0,
          pendingOrders: orders?.length || 0
        });
      }
    };

    fetchStats();
  }, [user]);

  const userName = user?.user_metadata?.full_name || 'Advisor';

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Advisor Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {userName.split(' ')[0]}. Here's your portfolio overview for today.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Last updated</p>
            <p className="text-sm font-medium">
              {new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total AUM"
            value={formatCurrency(stats.totalAUM, true)}
            changeLabel="your portfolio"
            icon={<DollarSign className="h-5 w-5" />}
            variant="highlight"
          />
          <MetricCard
            title="Active Clients"
            value={stats.totalClients.toString()}
            changeLabel="total clients"
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Avg Client AUM"
            value={formatCurrency(stats.avgClientAUM, true)}
            icon={<Briefcase className="h-5 w-5" />}
          />
          <MetricCard
            title="Pending Orders"
            value={stats.pendingOrders.toString()}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PortfolioChart />
              <PerformanceChart />
            </div>
            <ClientsTable />
          </div>

          {/* Right Column - AI & Activity */}
          <div className="space-y-6">
            <AICopilot />
            <AlertsPanel />
          </div>
        </div>

        {/* Activity Feed - Full Width */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityFeed />
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold mb-4">Upcoming Tasks</h3>
            <div className="space-y-3">
              {[
                { task: 'Q1 Portfolio Review - Victoria Sterling', due: 'Feb 5, 2025', priority: 'high' },
                { task: 'IPS Annual Update - Harrison Trust', due: 'Feb 10, 2025', priority: 'medium' },
                { task: 'New Client Onboarding - Quantum Ventures', due: 'Feb 15, 2025', priority: 'high' },
                { task: 'Rebalance Execution - Meridian Capital', due: 'Feb 8, 2025', priority: 'medium' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      item.priority === 'high' ? 'bg-destructive' : 'bg-warning'
                    )} />
                    <span className="text-sm">{item.task}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.due}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// Helper for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

export default Dashboard;
