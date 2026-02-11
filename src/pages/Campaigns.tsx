import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, PlusCircle, GitBranch, FileText, TrendingUp } from 'lucide-react';
import { SegmentsList } from '@/components/campaigns/segments/SegmentsList';

const tabItems = [
  { value: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { value: 'segments', label: 'Segments', icon: Users },
  { value: 'create', label: 'Create Campaign', icon: PlusCircle },
  { value: 'workflows', label: 'Workflows', icon: GitBranch },
  { value: 'templates', label: 'Templates', icon: FileText },
  { value: 'analytics', label: 'Analytics', icon: TrendingUp },
];

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

const Campaigns = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Manage client engagement campaigns, segments, and communication workflows.</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {tabItems.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard">
            <PlaceholderCard title="Campaign Dashboard" description="Overview of all active and past campaigns with key metrics." />
          </TabsContent>
          <TabsContent value="segments">
            <SegmentsList />
          </TabsContent>
          <TabsContent value="create">
            <PlaceholderCard title="Create Campaign" description="Set up new campaigns with targeting, messaging, and scheduling." />
          </TabsContent>
          <TabsContent value="workflows">
            <PlaceholderCard title="Workflows" description="Build automated engagement workflows and drip sequences." />
          </TabsContent>
          <TabsContent value="templates">
            <PlaceholderCard title="Templates" description="Create and manage reusable message templates across channels." />
          </TabsContent>
          <TabsContent value="analytics">
            <PlaceholderCard title="Analytics" description="Track campaign performance, engagement rates, and ROI." />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Campaigns;
