import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AutomationWorkflow, WorkflowStep, WorkflowLog, TriggerType, ActionType } from './types';

export function useWorkflows() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['automation-workflows'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('automation_workflows')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AutomationWorkflow[];
    },
    enabled: !!user,
  });
}

export function useWorkflowSteps(workflowId: string | null) {
  return useQuery({
    queryKey: ['workflow-steps', workflowId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('workflow_steps')
        .select('*')
        .eq('workflow_id', workflowId!)
        .order('step_order');
      if (error) throw error;
      return (data ?? []) as WorkflowStep[];
    },
    enabled: !!workflowId,
  });
}

export function useWorkflowLogs(workflowId?: string) {
  return useQuery({
    queryKey: ['workflow-logs', workflowId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('workflow_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (workflowId) query = query.eq('workflow_id', workflowId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as WorkflowLog[];
    },
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      trigger_type: TriggerType;
      trigger_config?: Record<string, unknown>;
      steps: { action_type: ActionType; action_config: Record<string, unknown> }[];
    }) => {
      const { data: wf, error: wfErr } = await (supabase as any)
        .from('automation_workflows')
        .insert({
          name: input.name,
          description: input.description ?? null,
          trigger_type: input.trigger_type,
          trigger_config: input.trigger_config ?? {},
          is_enabled: false,
          created_by: user!.id,
        })
        .select()
        .single();
      if (wfErr) throw wfErr;

      if (input.steps.length > 0) {
        const stepRows = input.steps.map((s, i) => ({
          workflow_id: wf.id,
          step_order: i + 1,
          action_type: s.action_type,
          action_config: s.action_config,
        }));
        const { error: stErr } = await (supabase as any).from('workflow_steps').insert(stepRows);
        if (stErr) throw stErr;
      }
      return wf;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success('Workflow created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await (supabase as any)
        .from('automation_workflows')
        .update({ is_enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success('Workflow updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('automation_workflows').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success('Workflow deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
