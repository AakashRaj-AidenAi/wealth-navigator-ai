import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, PlusCircle, GitBranch, FileText, TrendingUp, History, ScrollText, Sparkles } from 'lucide-react';
import { SegmentsList } from '@/components/campaigns/segments/SegmentsList';
import { CreateCampaign } from '@/components/campaigns/create/CreateCampaign';
import { CampaignHistory } from '@/components/campaigns/history/CampaignHistory';
import { WorkflowBuilder } from '@/components/campaigns/workflows/WorkflowBuilder';
import { WorkflowList } from '@/components/campaigns/workflows/WorkflowList';
import { WorkflowLogs } from '@/components/campaigns/workflows/WorkflowLogs';
import { CampaignDashboard } from '@/components/campaigns/ai/CampaignDashboard';
import { AIContentGenerator } from '@/components/campaigns/ai/AIContentGenerator';
import { CampaignAnalytics } from '@/components/campaigns/analytics/CampaignAnalytics';
import { useState } from 'react';

const PlaceholderCard = ({ title, description }: { title: string; description: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
        <p className="text-muted-foreground text-sm">Coming soon</p>
      </div>
    </CardContent>
  </Card>
);

const tabItems = [
  { value: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { value: 'segments', label: 'Segments', icon: Users },
  { value: 'create', label: 'Create Campaign', icon: PlusCircle },
  { value: 'history', label: 'Campaign History', icon: History },
  { value: 'ai-content', label: 'AI Content', icon: Sparkles },
  { value: 'workflows', label: 'Workflows', icon: GitBranch },
  { value: 'workflow-builder', label: 'New Workflow', icon: PlusCircle },
  { value: 'workflow-logs', label: 'Workflow Logs', icon: ScrollText },
  { value: 'templates', label: 'Templates', icon: FileText },
  { value: 'analytics', label: 'Analytics', icon: TrendingUp },
];

const Campaigns = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [aiContent, setAiContent] = useState('');

  const handleAIContentInsert = (content: string) => {
    setAiContent(content);
    setActiveTab('create');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Manage client engagement campaigns, segments, and communication workflows.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {tabItems.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard">
            <CampaignDashboard />
          </TabsContent>
          <TabsContent value="segments">
            <SegmentsList />
          </TabsContent>
          <TabsContent value="create">
            <CreateCampaign onCreated={() => setActiveTab('history')} initialContent={aiContent} />
          </TabsContent>
          <TabsContent value="history">
            <CampaignHistory />
          </TabsContent>
          <TabsContent value="ai-content">
            <AIContentGenerator onInsertContent={handleAIContentInsert} />
          </TabsContent>
          <TabsContent value="workflows">
            <WorkflowList />
          </TabsContent>
          <TabsContent value="workflow-builder">
            <WorkflowBuilder onCreated={() => setActiveTab('workflows')} />
          </TabsContent>
          <TabsContent value="workflow-logs">
            <WorkflowLogs />
          </TabsContent>
          <TabsContent value="templates">
            <PlaceholderCard title="Templates" description="Create and manage reusable message templates across channels." />
          </TabsContent>
          <TabsContent value="analytics">
            <CampaignAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Campaigns;
