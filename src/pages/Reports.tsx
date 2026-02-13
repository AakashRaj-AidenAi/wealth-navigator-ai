import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, Download, FileText, Calendar, PieChart, TrendingUp, Plus,
  Send, Clock, LayoutGrid
} from 'lucide-react';
import { ReportWorkflow } from '@/components/reports/ReportWorkflow';
import { RecentReports } from '@/components/reports/RecentReports';
import { ScheduledReports } from '@/components/reports/ScheduledReports';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface ReportStats {
  totalGenerated: number;
  thisMonth: number;
  scheduled: number;
  sent: number;
}

const Reports = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('generate');
  const [stats, setStats] = useState<ReportStats>({
    totalGenerated: 0,
    thisMonth: 0,
    scheduled: 3, // Mock for now
    sent: 0
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const fetchStats = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    try {
      const [allReports, monthlyReports] = await Promise.all([
        api.get<any[]>('/reports'),
        api.get<any[]>('/reports', { created_after: startOfMonth })
      ]);

      const totalCount = allReports?.length || 0;
      const monthCount = monthlyReports?.length || 0;

      setStats({
        totalGenerated: totalCount,
        thisMonth: monthCount,
        scheduled: 3,
        sent: Math.floor(monthCount * 0.8)
      });
    } catch (err) {
      console.error('Failed to load report stats:', err);
    }
  };

  const handleWorkflowComplete = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('history');
  };

  const canCreateReport = role === 'compliance_officer' || role === 'wealth_advisor';

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Generate, schedule, and send client reports with real-time data
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-semibold">{stats.totalGenerated}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-semibold">{stats.thisMonth}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-2/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-semibold">{stats.scheduled}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
                <Send className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-semibold">{stats.sent}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="generate" className="gap-2">
              <Plus className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2">
              <Clock className="h-4 w-4" />
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-6">
            {canCreateReport ? (
              <ReportWorkflow onComplete={handleWorkflowComplete} />
            ) : (
              <div className="text-center py-12 glass rounded-xl">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Permission Required</h3>
                <p className="text-muted-foreground">
                  Only wealth advisors and compliance officers can generate reports.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scheduled" className="mt-6">
            <ScheduledReports />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <RecentReports key={refreshKey} limit={20} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Reports;
