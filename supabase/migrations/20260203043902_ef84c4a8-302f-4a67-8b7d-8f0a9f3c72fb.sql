-- Create lead_stage_history table to track all stage transitions
CREATE TABLE public.lead_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  previous_stage TEXT NOT NULL,
  new_stage TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  duration_in_stage INTERVAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_stage_history
CREATE POLICY "Wealth advisors can view stage history for their leads"
  ON public.lead_stage_history FOR SELECT
  USING (
    is_wealth_advisor() AND 
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_stage_history.lead_id 
      AND leads.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Wealth advisors can insert stage history for their leads"
  ON public.lead_stage_history FOR INSERT
  WITH CHECK (
    is_wealth_advisor() AND 
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_stage_history.lead_id 
      AND leads.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Compliance officers can view all stage history"
  ON public.lead_stage_history FOR SELECT
  USING (is_compliance_officer());

-- Create indexes for performance
CREATE INDEX idx_lead_stage_history_lead_id ON public.lead_stage_history(lead_id);
CREATE INDEX idx_lead_stage_history_changed_at ON public.lead_stage_history(changed_at DESC);

-- Add loss_reason column to leads table for closed lost tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_reason TEXT;

-- Add next_follow_up column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMP WITH TIME ZONE;

-- Add expected_close_date column to leads table  
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS expected_close_date DATE;

-- Create function to automatically log stage history
CREATE OR REPLACE FUNCTION public.log_lead_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  time_in_stage INTERVAL;
BEGIN
  -- Only run if stage actually changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Calculate time spent in previous stage
    SELECT now() - COALESCE(
      (SELECT changed_at FROM lead_stage_history 
       WHERE lead_id = OLD.id 
       ORDER BY changed_at DESC 
       LIMIT 1),
      OLD.created_at
    ) INTO time_in_stage;
    
    -- Insert history record
    INSERT INTO lead_stage_history (
      lead_id, 
      previous_stage, 
      new_stage, 
      changed_by,
      duration_in_stage
    ) VALUES (
      OLD.id,
      OLD.stage::TEXT,
      NEW.stage::TEXT,
      auth.uid(),
      time_in_stage
    );
    
    -- Update last_activity_at
    NEW.last_activity_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic stage history logging
DROP TRIGGER IF EXISTS lead_stage_change_trigger ON public.leads;
CREATE TRIGGER lead_stage_change_trigger
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_stage_change();