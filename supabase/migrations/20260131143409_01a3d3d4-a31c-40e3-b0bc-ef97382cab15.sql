-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');

-- Create task priority enum
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create task trigger type enum for automations
CREATE TYPE public.task_trigger AS ENUM (
  'manual',
  'new_client',
  'new_lead',
  'meeting_logged',
  'proposal_sent',
  'quarterly_review',
  'sip_missed',
  'recurring'
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'todo',
  due_date DATE,
  due_time TIME,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  next_occurrence DATE,
  
  -- Linking
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Automation tracking
  trigger_type task_trigger NOT NULL DEFAULT 'manual',
  trigger_reference_id UUID, -- Reference to the entity that triggered this task
  
  -- Ownership
  assigned_to UUID NOT NULL, -- The advisor assigned to this task
  created_by UUID NOT NULL,
  
  -- Timestamps
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Wealth advisors can view their assigned tasks"
ON public.tasks FOR SELECT
USING (is_wealth_advisor() AND assigned_to = auth.uid());

CREATE POLICY "Wealth advisors can view tasks for their clients"
ON public.tasks FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Compliance officers can view all tasks"
ON public.tasks FOR SELECT
USING (is_compliance_officer());

CREATE POLICY "Wealth advisors can insert tasks"
ON public.tasks FOR INSERT
WITH CHECK (is_wealth_advisor() AND assigned_to = auth.uid());

CREATE POLICY "Wealth advisors can update their assigned tasks"
ON public.tasks FOR UPDATE
USING (is_wealth_advisor() AND assigned_to = auth.uid());

CREATE POLICY "Wealth advisors can delete their tasks"
ON public.tasks FOR DELETE
USING (is_wealth_advisor() AND assigned_to = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();