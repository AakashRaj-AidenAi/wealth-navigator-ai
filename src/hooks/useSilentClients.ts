import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

const SILENT_THRESHOLD_DAYS = 60;

export const useSilentClients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [silentClients, setSilentClients] = useState<SilentClient[]>([]);
  const [loading, setLoading] = useState(true);

  const detectSilentClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all clients for this advisor
      const { data: clients } = await supabase
        .from('clients')
        .select('id, client_name, email, total_assets')
        .eq('advisor_id', user.id)
        .eq('status', 'active');

      if (!clients || clients.length === 0) {
        setSilentClients([]);
        setLoading(false);
        return;
      }

      const cutoffDate = new Date(Date.now() - SILENT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const results: SilentClient[] = [];

      for (const client of clients) {
        // 1. Last meeting
        const { data: lastMeeting } = await supabase
          .from('client_activities')
          .select('created_at')
          .eq('client_id', client.id)
          .eq('activity_type', 'meeting')
          .order('created_at', { ascending: false })
          .limit(1);

        // 2. Last communication logged
        const { data: lastComm } = await supabase
          .from('communication_logs')
          .select('sent_at')
          .eq('client_id', client.id)
          .order('sent_at', { ascending: false })
          .limit(1);

        // 3. Last portfolio update (order)
        const { data: lastOrder } = await supabase
          .from('orders')
          .select('created_at')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const now = Date.now();
        const daysSinceMeeting = lastMeeting?.[0]
          ? Math.floor((now - new Date(lastMeeting[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        const daysSinceComm = lastComm?.[0]
          ? Math.floor((now - new Date(lastComm[0].sent_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        const daysSincePortfolio = lastOrder?.[0]
          ? Math.floor((now - new Date(lastOrder[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const isSilent =
          daysSinceMeeting >= SILENT_THRESHOLD_DAYS &&
          daysSinceComm >= SILENT_THRESHOLD_DAYS &&
          daysSincePortfolio >= SILENT_THRESHOLD_DAYS;

        if (isSilent) {
          results.push({
            clientId: client.id,
            clientName: client.client_name,
            email: client.email,
            totalAssets: Number(client.total_assets) || 0,
            daysSinceLastMeeting: daysSinceMeeting,
            daysSinceLastComm: daysSinceComm,
            daysSinceLastPortfolio: daysSincePortfolio,
            silent: true,
          });
        }
      }

      // Sort by most silent first (max days)
      results.sort((a, b) => {
        const maxA = Math.max(a.daysSinceLastMeeting, a.daysSinceLastComm, a.daysSinceLastPortfolio);
        const maxB = Math.max(b.daysSinceLastMeeting, b.daysSinceLastComm, b.daysSinceLastPortfolio);
        return maxB - maxA;
      });

      setSilentClients(results);
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
      // Check if a pending silent_client_followup task already exists
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('client_id', clientId)
        .eq('trigger_type', 'silent_client_followup')
        .in('status', ['todo', 'in_progress'])
        .limit(1);

      if (existingTask && existingTask.length > 0) {
        toast({ title: 'Task exists', description: 'A follow-up task already exists for this client.' });
        return;
      }

      // Create follow-up task
      const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { error: taskError } = await supabase.from('tasks').insert({
        title: `Follow up with silent client: ${clientName}`,
        description: `This client has had no meetings, communications, or portfolio updates in over 60 days. Please reach out to re-engage.`,
        priority: 'high' as any,
        status: 'todo' as any,
        due_date: dueDate,
        client_id: clientId,
        trigger_type: 'silent_client_followup' as any,
        assigned_to: user.id,
        created_by: user.id,
      });

      if (taskError) throw taskError;

      // Log activity in client timeline
      const { error: activityError } = await supabase.from('client_activities').insert({
        client_id: clientId,
        activity_type: 'silent_alert' as any,
        title: 'Silent Client Alert Triggered',
        description: 'No meeting, communication, or portfolio activity detected in 60+ days. Follow-up task created automatically.',
        created_by: user.id,
      });

      if (activityError) throw activityError;

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
