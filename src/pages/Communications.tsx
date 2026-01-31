import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateManager } from '@/components/communications/TemplateManager';
import { CampaignBuilder } from '@/components/communications/CampaignBuilder';
import { MessageComposer } from '@/components/communications/MessageComposer';
import { CommunicationHistory } from '@/components/communications/CommunicationHistory';
import { MessageSquare, FileText, Megaphone, Send, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Communications = () => {
  const [activeTab, setActiveTab] = useState('compose');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication Hub</h1>
          <p className="text-muted-foreground">
            Manage client communications across email and WhatsApp channels
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="compose" className="gap-2">
              <Send className="h-4 w-4" /> Compose
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Megaphone className="h-4 w-4" /> Campaigns
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <MessageComposer />
              
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Messages
                  </CardTitle>
                  <CardDescription>Your latest sent communications</CardDescription>
                </CardHeader>
                <CardContent>
                  <CommunicationHistory limit={10} />
                </CardContent>
              </Card>
            </div>

            {/* Quick Use Cases */}
            <div className="grid gap-4 md:grid-cols-4">
              <QuickAction
                title="SIP Reminder"
                description="Send monthly SIP reminders to clients"
                icon={MessageSquare}
                onClick={() => setActiveTab('templates')}
              />
              <QuickAction
                title="Portfolio Report"
                description="Share portfolio performance updates"
                icon={FileText}
                onClick={() => setActiveTab('templates')}
              />
              <QuickAction
                title="Meeting Invite"
                description="Schedule review meetings"
                icon={Send}
                onClick={() => setActiveTab('templates')}
              />
              <QuickAction
                title="Festive Greetings"
                description="Send holiday wishes to clients"
                icon={Megaphone}
                onClick={() => setActiveTab('campaigns')}
              />
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <TemplateManager />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignBuilder />
          </TabsContent>

          <TabsContent value="history">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Communication History
                </CardTitle>
                <CardDescription>Track all sent messages and their delivery status</CardDescription>
              </CardHeader>
              <CardContent>
                <CommunicationHistory limit={100} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

interface QuickActionProps {
  title: string;
  description: string;
  icon: any;
  onClick: () => void;
}

const QuickAction = ({ title, description, icon: Icon, onClick }: QuickActionProps) => (
  <Card 
    className="glass cursor-pointer hover:bg-secondary/30 transition-colors"
    onClick={onClick}
  >
    <CardContent className="pt-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Communications;
