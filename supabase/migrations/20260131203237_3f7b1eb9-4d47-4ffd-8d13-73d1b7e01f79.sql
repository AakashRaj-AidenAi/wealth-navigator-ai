-- Create enum for corporate action types
CREATE TYPE corporate_action_type AS ENUM (
  'dividend',
  'bonus',
  'split',
  'rights_issue',
  'merger',
  'demerger',
  'buyback'
);

-- Create enum for action status
CREATE TYPE corporate_action_status AS ENUM (
  'upcoming',
  'active',
  'completed',
  'cancelled'
);

-- Corporate actions master table
CREATE TABLE public.corporate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  security_name TEXT NOT NULL,
  action_type corporate_action_type NOT NULL,
  description TEXT,
  announcement_date DATE,
  ex_date DATE,
  record_date DATE,
  payment_date DATE,
  ratio TEXT,
  dividend_amount NUMERIC,
  currency TEXT DEFAULT 'INR',
  status corporate_action_status DEFAULT 'upcoming',
  ai_summary TEXT,
  ai_suggestion TEXT,
  source TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Client-specific corporate action impacts
CREATE TABLE public.client_corporate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_action_id UUID NOT NULL REFERENCES public.corporate_actions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  holdings_quantity NUMERIC NOT NULL DEFAULT 0,
  estimated_impact NUMERIC,
  ai_personalized_summary TEXT,
  is_notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMPTZ,
  task_created BOOLEAN DEFAULT false,
  task_id UUID REFERENCES public.tasks(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(corporate_action_id, client_id)
);

-- Corporate action alerts for advisors
CREATE TABLE public.corporate_action_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_action_id UUID NOT NULL REFERENCES public.corporate_actions(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'medium',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.corporate_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_corporate_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_action_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for corporate_actions (read-only for all advisors)
CREATE POLICY "Wealth advisors can view all corporate actions"
  ON public.corporate_actions FOR SELECT
  USING (is_wealth_advisor());

CREATE POLICY "Compliance officers can view all corporate actions"
  ON public.corporate_actions FOR SELECT
  USING (is_compliance_officer());

-- RLS Policies for client_corporate_actions
CREATE POLICY "Wealth advisors can view their client corporate actions"
  ON public.client_corporate_actions FOR SELECT
  USING (is_wealth_advisor() AND advisor_id = auth.uid());

CREATE POLICY "Wealth advisors can insert client corporate actions"
  ON public.client_corporate_actions FOR INSERT
  WITH CHECK (is_wealth_advisor() AND advisor_id = auth.uid());

CREATE POLICY "Wealth advisors can update their client corporate actions"
  ON public.client_corporate_actions FOR UPDATE
  USING (is_wealth_advisor() AND advisor_id = auth.uid());

CREATE POLICY "Compliance officers can view all client corporate actions"
  ON public.client_corporate_actions FOR SELECT
  USING (is_compliance_officer());

-- RLS Policies for corporate_action_alerts
CREATE POLICY "Wealth advisors can view their alerts"
  ON public.corporate_action_alerts FOR SELECT
  USING (is_wealth_advisor() AND advisor_id = auth.uid());

CREATE POLICY "Wealth advisors can update their alerts"
  ON public.corporate_action_alerts FOR UPDATE
  USING (is_wealth_advisor() AND advisor_id = auth.uid());

CREATE POLICY "Compliance officers can view all alerts"
  ON public.corporate_action_alerts FOR SELECT
  USING (is_compliance_officer());

-- Indexes for performance
CREATE INDEX idx_corporate_actions_symbol ON public.corporate_actions(symbol);
CREATE INDEX idx_corporate_actions_ex_date ON public.corporate_actions(ex_date);
CREATE INDEX idx_corporate_actions_status ON public.corporate_actions(status);
CREATE INDEX idx_client_corporate_actions_advisor ON public.client_corporate_actions(advisor_id);
CREATE INDEX idx_client_corporate_actions_client ON public.client_corporate_actions(client_id);
CREATE INDEX idx_corporate_action_alerts_advisor ON public.corporate_action_alerts(advisor_id);
CREATE INDEX idx_corporate_action_alerts_unread ON public.corporate_action_alerts(advisor_id, is_read) WHERE is_read = false;

-- Trigger for updated_at
CREATE TRIGGER update_corporate_actions_updated_at
  BEFORE UPDATE ON public.corporate_actions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_client_corporate_actions_updated_at
  BEFORE UPDATE ON public.client_corporate_actions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();