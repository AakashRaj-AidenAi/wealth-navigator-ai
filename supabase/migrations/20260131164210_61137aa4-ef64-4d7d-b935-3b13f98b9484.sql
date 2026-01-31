
-- Create lead_stage enum
CREATE TYPE public.lead_stage AS ENUM (
  'new',
  'contacted',
  'meeting',
  'proposal',
  'closed_won',
  'lost'
);

-- Create lead_source enum
CREATE TYPE public.lead_source AS ENUM (
  'referral',
  'website',
  'social_media',
  'event',
  'cold_call',
  'advertisement',
  'partner',
  'other'
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source lead_source NOT NULL DEFAULT 'other',
  stage lead_stage NOT NULL DEFAULT 'new',
  expected_value NUMERIC DEFAULT 0,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  notes TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  assigned_to UUID NOT NULL,
  converted_client_id UUID REFERENCES public.clients(id),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lead_activities table for activity history
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "Wealth advisors can view their leads"
ON public.leads FOR SELECT
USING (public.is_wealth_advisor() AND assigned_to = auth.uid());

CREATE POLICY "Wealth advisors can view all leads"
ON public.leads FOR SELECT
USING (public.is_wealth_advisor());

CREATE POLICY "Wealth advisors can insert leads"
ON public.leads FOR INSERT
WITH CHECK (public.is_wealth_advisor() AND assigned_to = auth.uid());

CREATE POLICY "Wealth advisors can update their leads"
ON public.leads FOR UPDATE
USING (public.is_wealth_advisor() AND assigned_to = auth.uid());

CREATE POLICY "Wealth advisors can delete their leads"
ON public.leads FOR DELETE
USING (public.is_wealth_advisor() AND assigned_to = auth.uid());

CREATE POLICY "Compliance officers can view all leads"
ON public.leads FOR SELECT
USING (public.is_compliance_officer());

-- Lead activities policies
CREATE POLICY "Wealth advisors can view activities for their leads"
ON public.lead_activities FOR SELECT
USING (public.is_wealth_advisor() AND EXISTS (
  SELECT 1 FROM public.leads WHERE leads.id = lead_activities.lead_id AND leads.assigned_to = auth.uid()
));

CREATE POLICY "Wealth advisors can insert activities for their leads"
ON public.lead_activities FOR INSERT
WITH CHECK (public.is_wealth_advisor() AND EXISTS (
  SELECT 1 FROM public.leads WHERE leads.id = lead_activities.lead_id AND leads.assigned_to = auth.uid()
));

CREATE POLICY "Compliance officers can view all lead activities"
ON public.lead_activities FOR SELECT
USING (public.is_compliance_officer());

-- Create updated_at trigger for leads
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_leads_last_activity ON public.leads(last_activity_at);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
