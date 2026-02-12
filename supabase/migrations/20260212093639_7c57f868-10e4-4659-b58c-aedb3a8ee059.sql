
-- Add settlement_date and workflow columns to funding_requests
ALTER TABLE public.funding_requests 
  ADD COLUMN IF NOT EXISTS settlement_date DATE,
  ADD COLUMN IF NOT EXISTS workflow_stage TEXT NOT NULL DEFAULT 'initiated',
  ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create funding_status_history for timeline tracking
CREATE TABLE public.funding_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funding_request_id UUID NOT NULL REFERENCES public.funding_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their funding status history" ON public.funding_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.funding_requests fr WHERE fr.id = funding_status_history.funding_request_id AND fr.initiated_by = auth.uid())
);
CREATE POLICY "Advisors can insert funding status history" ON public.funding_status_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.funding_requests fr WHERE fr.id = funding_status_history.funding_request_id AND fr.initiated_by = auth.uid())
);

-- Create funding_alerts table
CREATE TABLE public.funding_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funding_request_id UUID NOT NULL REFERENCES public.funding_requests(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their funding alerts" ON public.funding_alerts FOR SELECT USING (advisor_id = auth.uid());
CREATE POLICY "Advisors can insert funding alerts" ON public.funding_alerts FOR INSERT WITH CHECK (advisor_id = auth.uid());
CREATE POLICY "Advisors can update their funding alerts" ON public.funding_alerts FOR UPDATE USING (advisor_id = auth.uid());
CREATE POLICY "Advisors can delete their funding alerts" ON public.funding_alerts FOR DELETE USING (advisor_id = auth.uid());
