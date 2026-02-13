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
import { LeadsNeedingAttentionWidget } from '@/components/dashboard/LeadsNeedingAttentionWidget';
import { CorporateActionsWidget } from '@/components/dashboard/CorporateActionsWidget';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import {
  DollarSign,
  Users,
  TrendingUp,
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

      try {
        const [
          clientsRes,
          ordersRes,
          tasksRes,
          leadsRes,
          alertsRes,
          todayOrdersRes
        ] = await Promise.all([
          api.get('/clients', { advisor_id: user.id, fields: 'total_assets' }),
          api.get('/orders', { status: 'pending' }),
          api.get('/tasks', { assigned_to: user.id, status: 'todo,in_progress' }),
          api.get('/leads', { assigned_to: user.id, exclude_stages: 'closed_won,lost' }),
          api.get('/compliance/alerts', { is_resolved: false }),
          api.get('/orders', { created_after: `${todayStr}T00:00:00`, created_before: `${todayStr}T23:59:59` })
        ]);

        const clients = extractItems<any>(clientsRes);
        const orders = extractItems<any>(ordersRes);
        const tasks = extractItems<any>(tasksRes);
        const leads = extractItems<any>(leadsRes);
        const alerts = extractItems<any>(alertsRes);
        const todayOrders = extractItems<any>(todayOrdersRes);

        const totalAUM = clients.reduce((sum: number, c: any) => sum + (Number(c.total_assets) || 0), 0);

        const dailyInflow = todayOrders
          .filter((o: any) => o.order_type === 'buy')
          .reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
        const dailyOutflow = todayOrders
          .filter((o: any) => o.order_type === 'sell')
          .reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);

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
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      }
    };

    fetchStats();
  }, [user]);

  const userName = user?.user_metadata?.full_name || 'Advisor';
  const netFlow = stats.dailyInflow - stats.dailyOutflow;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
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

        <AIInsightsPanel />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PortfolioChart />
              <PerformanceChart />
            </div>
            <ClientsTable />
          </div>
          <div className="space-y-6">
            <AlertsPanel />
            <CorporateActionsWidget />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <LeadsPipelineWidget />
          <LeadsNeedingAttentionWidget />
          <TodaysPlanWidget />
          <ActivityFeed />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
