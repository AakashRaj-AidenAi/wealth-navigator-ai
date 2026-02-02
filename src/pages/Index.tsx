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

      // Parallel fetch all data
      const [
        clientsResult,
        ordersResult,
        tasksResult,
        leadsResult,
        allOrdersResult,
        documentsResult,
        pendingConsentsResult
      ] = await Promise.all([
        // Fetch ALL clients for accurate AUM calculation (no advisor filter)
        supabase
          .from('clients')
          .select('id, total_assets, kyc_expiry_date'),
        supabase
          .from('orders')
          .select('id')
          .eq('status', 'pending'),
        supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', user.id)
          .in('status', ['todo', 'in_progress']),
        // Fetch ALL leads (not filtered by assigned_to) to match Leads page
        supabase
          .from('leads')
          .select('id, expected_value, stage')
          .not('stage', 'in', '("closed_won","lost")'),
        // Fetch ALL executed orders for net flow calculation
        supabase
          .from('orders')
          .select('order_type, total_amount, quantity, price, created_at, status'),
        // Fetch client documents for missing docs alerts
        supabase
          .from('client_documents')
          .select('client_id, document_type'),
        // Fetch pending consents
        supabase
          .from('client_consents')
          .select('id')
          .eq('status', 'pending')
      ]);

      const clients = clientsResult.data || [];
      const orders = ordersResult.data || [];
      const tasks = tasksResult.data || [];
      const leads = leadsResult.data || [];
      const allOrders = allOrdersResult.data || [];
      const documents = documentsResult.data || [];
      const pendingConsents = pendingConsentsResult.data || [];

      const totalAUM = clients.reduce((sum, c) => sum + (Number(c.total_assets) || 0), 0);

      // Calculate alerts count matching ComplianceAlerts.tsx logic
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // 1. KYC expiry alerts
      const kycAlerts = clients.filter(c => {
        if (!c.kyc_expiry_date) return false;
        const expiryDate = new Date(c.kyc_expiry_date);
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

      // Calculate net flow from ALL orders (total_amount or quantity * price)
      const calculateOrderValue = (o: typeof allOrders[0]) => {
        if (o.total_amount) return Number(o.total_amount);
        if (o.quantity && o.price) return o.quantity * o.price;
        return 0;
      };

      const dailyInflow = allOrders
        .filter(o => o.order_type === 'buy')
        .reduce((sum, o) => sum + calculateOrderValue(o), 0);
      const dailyOutflow = allOrders
        .filter(o => o.order_type === 'sell')
        .reduce((sum, o) => sum + calculateOrderValue(o), 0);

      // Estimate revenue (simplified: 1% of AUM annually / 365)
      const estimatedDailyRevenue = (totalAUM * 0.01) / 365;

      setStats({
        totalAUM,
        totalClients: clients.length,
        avgClientAUM: clients.length > 0 ? totalAUM / clients.length : 0,
        pendingOrders: orders.length,
        pendingTasks: tasks.length,
        activeLeads: leads.length,
        alertsCount,
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
            title="Net Flow"
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
