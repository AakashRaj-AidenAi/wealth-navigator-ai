export type TriggerType =
  | 'new_client'
  | 'sip_missed'
  | 'portfolio_review_due'
  | 'lead_stage_change'
  | 'birthday_festival'
  | 'idle_cash';

export type ActionType =
  | 'send_message'
  | 'create_task'
  | 'wait'
  | 'send_report'
  | 'assign_advisor';

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  created_at: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  is_enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowLog {
  id: string;
  workflow_id: string;
  trigger_entity_type: string;
  trigger_entity_id: string;
  current_step: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  log_details: unknown[];
  created_at: string;
}

export const TRIGGER_OPTIONS: { value: TriggerType; label: string; description: string }[] = [
  { value: 'new_client', label: 'New Client Created', description: 'When a new client is onboarded' },
  { value: 'sip_missed', label: 'SIP Missed', description: 'When a client misses a SIP payment' },
  { value: 'portfolio_review_due', label: 'Portfolio Review Due', description: 'When quarterly/annual portfolio review is due' },
  { value: 'lead_stage_change', label: 'Lead Moved Stage', description: 'When a lead moves to a new pipeline stage' },
  { value: 'birthday_festival', label: 'Birthday / Festival', description: 'On client birthdays or festive occasions' },
  { value: 'idle_cash', label: 'Idle Cash Detected', description: 'When idle cash is detected in client account' },
];

export const ACTION_OPTIONS: { value: ActionType; label: string; icon: string }[] = [
  { value: 'send_message', label: 'Send Message', icon: 'MessageSquare' },
  { value: 'create_task', label: 'Create Task', icon: 'CheckSquare' },
  { value: 'wait', label: 'Wait X Days', icon: 'Clock' },
  { value: 'send_report', label: 'Send Report', icon: 'FileText' },
  { value: 'assign_advisor', label: 'Assign Advisor', icon: 'UserPlus' },
];
