import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SilentClient {
  clientId: string;
  clientName: string;
  email: string | null;
  totalAssets: number;
  daysSinceLastMeeting: number;
  daysSinceLastComm: number;
  daysSinceLastPortfolio: number;
  silent: boolean;
}

export const useSilentClients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [silentClients, setSilentClients] = useState<SilentClient[]>([]);
  const [loading, setLoading] = useState(true);

  const detectSilentClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const data = await api.get<SilentClient[]>('/insights/silent-clients');
      setSilentClients(data);
    } catch (err) {
      console.error('Error detecting silent clients:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    detectSilentClients();
  }, [detectSilentClients]);

  const createFollowUpTask = useCallback(async (clientId: string, clientName: string) => {
    if (!user) return;

    try {
      await api.post(`/insights/silent-clients/${clientId}/follow-up`, {
        client_name: clientName,
      });

      toast({
        title: 'Follow-up created',
        description: `Task and activity logged for ${clientName}`,
      });
    } catch (err) {
      console.error('Error creating follow-up:', err);
      toast({ title: 'Error', description: 'Failed to create follow-up task', variant: 'destructive' });
    }
  }, [user, toast]);

  return { silentClients, loading, detectSilentClients, createFollowUpTask };
};
