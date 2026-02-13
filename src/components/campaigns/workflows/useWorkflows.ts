import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AutomationWorkflow, WorkflowStep, WorkflowLog, TriggerType, ActionType } from './types';

export function useWorkflows() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['automation-workflows'],
    queryFn: async () => {
      const data = await api.get<AutomationWorkflow[]>('/automation_workflows');
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useWorkflowSteps(workflowId: string | null) {
  return useQuery({
    queryKey: ['workflow-steps', workflowId],
    queryFn: async () => {
      const data = await api.get<WorkflowStep[]>('/workflow_steps', { workflow_id: workflowId! });
      return data ?? [];
    },
    enabled: !!workflowId,
  });
}

export function useWorkflowLogs(workflowId?: string) {
  return useQuery({
    queryKey: ['workflow-logs', workflowId],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (workflowId) params.workflow_id = workflowId;
      const data = await api.get<WorkflowLog[]>('/workflow_logs', params);
      return data ?? [];
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
      const wf = await api.post<AutomationWorkflow>('/automation_workflows', {
        name: input.name,
        description: input.description ?? null,
        trigger_type: input.trigger_type,
        trigger_config: input.trigger_config ?? {},
        is_enabled: false,
        created_by: user!.id,
        steps: input.steps.map((s, i) => ({
          step_order: i + 1,
          action_type: s.action_type,
          action_config: s.action_config,
        })),
      });
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
      await api.put(`/automation_workflows/${id}`, { is_enabled });
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
      await api.delete(`/automation_workflows/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success('Workflow deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
