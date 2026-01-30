import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { BarChart3, Download, FileText, Calendar, PieChart, TrendingUp } from 'lucide-react';

const reports = [
  { id: 1, name: 'Monthly Performance Report', type: 'Performance', lastGenerated: 'Jan 28, 2025', frequency: 'Monthly', icon: TrendingUp },
  { id: 2, name: 'Client Portfolio Summary', type: 'Portfolio', lastGenerated: 'Jan 27, 2025', frequency: 'Weekly', icon: PieChart },
  { id: 3, name: 'Transaction History', type: 'Transactions', lastGenerated: 'Jan 28, 2025', frequency: 'Daily', icon: FileText },
  { id: 4, name: 'Risk Analytics Report', type: 'Risk', lastGenerated: 'Jan 25, 2025', frequency: 'Weekly', icon: BarChart3 },
  { id: 5, name: 'Compliance Audit Trail', type: 'Compliance', lastGenerated: 'Jan 20, 2025', frequency: 'Monthly', icon: FileText },
  { id: 6, name: 'Fee & Revenue Analysis', type: 'Financial', lastGenerated: 'Jan 15, 2025', frequency: 'Quarterly', icon: BarChart3 },
];

const scheduledReports = [
  { name: 'Q1 Client Statements', scheduled: 'Apr 1, 2025', recipients: 47 },
  { name: 'Monthly Performance Summary', scheduled: 'Feb 1, 2025', recipients: 12 },
  { name: 'Annual Tax Documents', scheduled: 'Mar 15, 2025', recipients: 47 },
];

const Reports = () => {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Generate, schedule, and manage client and firm reports
            </p>
          </div>
          <Button className="bg-gradient-gold hover:opacity-90 gap-2">
            <FileText className="h-4 w-4" />
            Create Report
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reports Generated</p>
                <p className="text-2xl font-semibold">156</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Reports</p>
                <p className="text-2xl font-semibold">8</p>
                <p className="text-xs text-muted-foreground">Active schedules</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
                <Download className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Downloads</p>
                <p className="text-2xl font-semibold">432</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Reports */}
          <div className="lg:col-span-2 glass rounded-xl p-6">
            <h2 className="font-semibold mb-4">Available Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((report) => {
                const Icon = report.icon;
                return (
                  <div 
                    key={report.id}
                    className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{report.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{report.type} • {report.frequency}</p>
                        <p className="text-xs text-muted-foreground">Last: {report.lastGenerated}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scheduled Reports */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold mb-4">Upcoming Scheduled</h2>
            <div className="space-y-4">
              {scheduledReports.map((report, i) => (
                <div key={i} className="p-4 rounded-lg bg-secondary/30">
                  <h3 className="font-medium text-sm">{report.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {report.scheduled}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{report.recipients} recipients</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Reports;
