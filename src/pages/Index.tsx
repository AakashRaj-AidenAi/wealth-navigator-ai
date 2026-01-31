import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClickableMetricCard } from '@/components/dashboard/ClickableMetricCard';
import { ClientsTable } from '@/components/dashboard/ClientsTable';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { PortfolioChart } from '@/components/dashboard/PortfolioChart';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { TodaysPlanWidget } from '@/components/dashboard/TodaysPlanWidget';
import { LeadsPipelineWidget } from '@/components/dashboard/LeadsPipelineWidget';
import { CorporateActionsWidget } from '@/components/dashboard/CorporateActionsWidget';
import { AIInsightsCenter } from '@/components/ai-growth-engine';
import { AICopilot } from '@/components/ai/AICopilot';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Briefcase, 
  Target,
  ListTodo,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface DashboardStats {
  totalAUM: number;
  totalClients: number;
  avgClientAUM: number;
  pendingOrders: number;
  pendingTasks: number;
  activeLeads: number;
  alertsCount: number;
  dailyInflow: number;
  dailyOutflow: number;
  revenue: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalAUM: 0,
    totalClients: 0,
    avgClientAUM: 0,
    pendingOrders: 0,
    pendingTasks: 0,
    activeLeads: 0,
    alertsCount: 0,
    dailyInflow: 0,
    dailyOutflow: 0,
    revenue: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Parallel fetch all data
      const [
        clientsResult,
        ordersResult,
        tasksResult,
        leadsResult,
        alertsResult,
        todayOrdersResult
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('total_assets')
          .eq('advisor_id', user.id),
        supabase
          .from('orders')
          .select('id')
          .eq('status', 'pending'),
        supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', user.id)
          .in('status', ['todo', 'in_progress']),
        supabase
          .from('leads')
          .select('id, expected_value')
          .eq('assigned_to', user.id)
          .not('stage', 'in', '("closed_won","lost")'),
        supabase
          .from('compliance_alerts')
          .select('id')
          .eq('is_resolved', false),
        supabase
          .from('orders')
          .select('order_type, total_amount, created_at')
          .gte('created_at', `${todayStr}T00:00:00`)
          .lte('created_at', `${todayStr}T23:59:59`)
      ]);

      const clients = clientsResult.data || [];
      const orders = ordersResult.data || [];
      const tasks = tasksResult.data || [];
      const leads = leadsResult.data || [];
      const alerts = alertsResult.data || [];
      const todayOrders = todayOrdersResult.data || [];

      const totalAUM = clients.reduce((sum, c) => sum + (Number(c.total_assets) || 0), 0);
      
      // Calculate daily inflow/outflow from today's orders
      const dailyInflow = todayOrders
        .filter(o => o.order_type === 'buy')
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const dailyOutflow = todayOrders
        .filter(o => o.order_type === 'sell')
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      // Estimate revenue (simplified: 1% of AUM annually / 365)
      const estimatedDailyRevenue = (totalAUM * 0.01) / 365;

      setStats({
        totalAUM,
        totalClients: clients.length,
        avgClientAUM: clients.length > 0 ? totalAUM / clients.length : 0,
        pendingOrders: orders.length,
        pendingTasks: tasks.length,
        activeLeads: leads.length,
        alertsCount: alerts.length,
        dailyInflow,
        dailyOutflow,
        revenue: estimatedDailyRevenue
      });
    };

    fetchStats();
  }, [user]);

  const userName = user?.user_metadata?.full_name || 'Advisor';
  const netFlow = stats.dailyInflow - stats.dailyOutflow;

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

        {/* Key Metrics Row 1 - Primary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ClickableMetricCard
            title="Total AUM"
            value={formatCurrency(stats.totalAUM, true)}
            changeLabel="your portfolio"
            icon={<DollarSign className="h-5 w-5" />}
            variant="highlight"
            href="/portfolios"
            subtitle="Click to view portfolios"
          />
          <ClickableMetricCard
            title="Daily Net Flow"
            value={formatCurrency(Math.abs(netFlow), true)}
            icon={netFlow >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
            href="/orders"
            subtitle={`${formatCurrency(stats.dailyInflow, true)} in • ${formatCurrency(stats.dailyOutflow, true)} out`}
          />
          <ClickableMetricCard
            title="Est. Revenue"
            value={formatCurrency(stats.revenue * 30, true)}
            icon={<TrendingUp className="h-5 w-5" />}
            subtitle="Monthly estimate (1% fee)"
          />
          <ClickableMetricCard
            title="Active Clients"
            value={stats.totalClients.toString()}
            changeLabel="total clients"
            icon={<Users className="h-5 w-5" />}
            href="/clients"
            subtitle="Click to manage clients"
          />
        </div>

        {/* Key Metrics Row 2 - Action Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ClickableMetricCard
            title="Leads in Pipeline"
            value={stats.activeLeads.toString()}
            icon={<Target className="h-5 w-5" />}
            href="/leads"
            subtitle="Active opportunities"
          />
          <ClickableMetricCard
            title="Tasks Pending"
            value={stats.pendingTasks.toString()}
            icon={<ListTodo className="h-5 w-5" />}
            href="/tasks"
            subtitle="Click to view tasks"
          />
          <ClickableMetricCard
            title="Pending Orders"
            value={stats.pendingOrders.toString()}
            icon={<Briefcase className="h-5 w-5" />}
            href="/orders"
            subtitle="Awaiting execution"
          />
          <ClickableMetricCard
            title="Active Alerts"
            value={stats.alertsCount.toString()}
            icon={<AlertTriangle className="h-5 w-5" />}
            href="/compliance"
            subtitle={stats.alertsCount > 0 ? 'Requires attention' : 'All clear'}
          />
        </div>

        {/* AI Growth Engine - Insights Center */}
        <AIInsightsCenter />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts & Tables */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PortfolioChart />
              <PerformanceChart />
            </div>
            <ClientsTable />
          </div>

          {/* Right Column - Widgets */}
          <div className="space-y-6">
            <AlertsPanel />
            <CorporateActionsWidget />
          </div>
        </div>

        {/* Bottom Row - Activity & Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LeadsPipelineWidget />
          <TodaysPlanWidget />
          <ActivityFeed />
        </div>

        {/* AI Copilot - Floating Minimized */}
        <div className="fixed bottom-6 right-6 z-50">
          <AICopilot defaultMinimized={true} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
