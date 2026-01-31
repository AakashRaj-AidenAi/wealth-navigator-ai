import { useState } from 'react';
import { MessageComposer } from '@/components/communications/MessageComposer';
import { CommunicationHistory } from '@/components/communications/CommunicationHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, History } from 'lucide-react';

interface ClientCommunicationsTabProps {
  clientId: string;
}

export const ClientCommunicationsTab = ({ clientId }: ClientCommunicationsTabProps) => {
  const [activeTab, setActiveTab] = useState('history');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMessageSent = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('history');
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" /> History
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-2">
            <Send className="h-4 w-4" /> Send Message
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold mb-4">Communication History</h3>
            <CommunicationHistory key={refreshKey} clientId={clientId} showClient={false} />
          </div>
        </TabsContent>

        <TabsContent value="compose" className="mt-4">
          <MessageComposer clientId={clientId} onMessageSent={handleMessageSent} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
