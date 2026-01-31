import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, FileCheck } from 'lucide-react';
import { GenerateReportModal } from '@/components/modals/GenerateReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComplianceAlerts } from '@/components/compliance/ComplianceAlerts';
import { AuditTrailViewer } from '@/components/compliance/AuditTrailViewer';
import { ConsentManager } from '@/components/compliance/ConsentManager';
import { AdviceRecordsList } from '@/components/compliance/AdviceRecordsList';
import { CommunicationLogs } from '@/components/compliance/CommunicationLogs';

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
              Monitor regulatory compliance, audit trail, and client consents
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
                <p className="text-sm text-muted-foreground">Based on audit readiness factors</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-success">94%</p>
              <p className="text-sm text-muted-foreground">+2% from last month</p>
            </div>
          </div>
          <Progress value={94} className="h-3" />
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="alerts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="consents">Consents</TabsTrigger>
            <TabsTrigger value="advice">Advice Records</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <ComplianceAlerts />
          </TabsContent>

          <TabsContent value="consents">
            <ConsentManager />
          </TabsContent>

          <TabsContent value="advice">
            <AdviceRecordsList />
          </TabsContent>

          <TabsContent value="communications">
            <CommunicationLogs />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTrailViewer />
          </TabsContent>
        </Tabs>
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
