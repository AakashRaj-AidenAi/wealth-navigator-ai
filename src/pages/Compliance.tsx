import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle2, Clock, FileCheck, Eye } from 'lucide-react';
import { GenerateReportModal } from '@/components/modals/GenerateReportModal';
import { useAuth } from '@/contexts/AuthContext';

const complianceItems = [
  { id: 1, title: 'KYC Document Expiry - Harrison Trust', type: 'Document', priority: 'high', dueDate: 'Feb 5, 2025', status: 'pending' },
  { id: 2, title: 'Quarterly AML Review - All Clients', type: 'Review', priority: 'medium', dueDate: 'Feb 15, 2025', status: 'in-progress' },
  { id: 3, title: 'Trade Surveillance Alert - Large Transaction', type: 'Alert', priority: 'high', dueDate: 'Today', status: 'pending' },
  { id: 4, title: 'Suitability Assessment - New Account', type: 'Assessment', priority: 'medium', dueDate: 'Feb 10, 2025', status: 'pending' },
  { id: 5, title: 'Annual Compliance Training', type: 'Training', priority: 'low', dueDate: 'Mar 1, 2025', status: 'scheduled' },
];

const Compliance = () => {
  const { role } = useAuth();
  const [generateReportOpen, setGenerateReportOpen] = useState(false);

  const canGenerateReport = role === 'compliance_officer' || role === 'wealth_advisor';

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Compliance Center</h1>
            <p className="text-muted-foreground">
              Monitor regulatory compliance, alerts, and audit requirements
            </p>
          </div>
          {canGenerateReport && (
            <Button 
              className="bg-gradient-gold hover:opacity-90 gap-2"
              onClick={() => setGenerateReportOpen(true)}
            >
              <FileCheck className="h-4 w-4" />
              Generate Report
            </Button>
          )}
        </div>

        {/* Compliance Score */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Overall Compliance Score</h2>
                <p className="text-sm text-muted-foreground">Based on 24 compliance factors</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-success">94%</p>
              <p className="text-sm text-muted-foreground">+2% from last month</p>
            </div>
          </div>
          <Progress value={94} className="h-3" />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
                <p className="text-2xl font-semibold text-destructive">2</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-semibold text-warning">5</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Completed This Month</p>
                <p className="text-2xl font-semibold">18</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Audit Trail Items</p>
                <p className="text-2xl font-semibold">1,247</p>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Items */}
        <div className="glass rounded-xl p-6">
          <h2 className="font-semibold mb-4">Action Items</h2>
          <div className="space-y-3">
            {complianceItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`h-2 w-2 rounded-full ${
                    item.priority === 'high' ? 'bg-destructive' :
                    item.priority === 'medium' ? 'bg-warning' : 'bg-muted-foreground'
                  }`} />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.type} • Due: {item.dueDate}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.status === 'pending' ? 'bg-warning/20 text-warning' :
                  item.status === 'in-progress' ? 'bg-primary/20 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {item.status === 'in-progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <GenerateReportModal 
        open={generateReportOpen} 
        onOpenChange={setGenerateReportOpen}
        defaultType="compliance"
      />
    </MainLayout>
  );
};

export default Compliance;
