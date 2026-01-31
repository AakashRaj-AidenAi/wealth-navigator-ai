-- Create consent type enum
CREATE TYPE public.consent_type AS ENUM (
  'risk_disclosure',
  'investment_policy',
  'data_privacy',
  'fee_agreement',
  'kyc_authorization',
  'portfolio_discretion',
  'electronic_delivery'
);

-- Create consent status enum
CREATE TYPE public.consent_status AS ENUM (
  'pending',
  'signed',
  'expired',
  'revoked'
);

-- Create client_consents table for consent capture
CREATE TABLE public.client_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  consent_type consent_type NOT NULL,
  status consent_status NOT NULL DEFAULT 'pending',
  document_version TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create advice_records table for tracking recommendations
CREATE TABLE public.advice_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  advice_type TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  rationale TEXT,
  risk_considerations TEXT,
  client_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table for full audit trail
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create compliance_alerts table
CREATE TABLE public.compliance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create communication_logs table
CREATE TABLE public.communication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  subject TEXT,
  content TEXT,
  attachments JSONB,
  sent_by UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.client_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- RLS for client_consents
CREATE POLICY "Compliance officers can view all consents"
ON public.client_consents FOR SELECT
USING (is_compliance_officer());

CREATE POLICY "Wealth advisors can view consents for their clients"
ON public.client_consents FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can insert consents for their clients"
ON public.client_consents FOR INSERT
WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can update consents for their clients"
ON public.client_consents FOR UPDATE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

-- RLS for advice_records
CREATE POLICY "Compliance officers can view all advice records"
ON public.advice_records FOR SELECT
USING (is_compliance_officer());

CREATE POLICY "Wealth advisors can view their advice records"
ON public.advice_records FOR SELECT
USING (is_wealth_advisor() AND advisor_id = auth.uid());

CREATE POLICY "Wealth advisors can insert advice records"
ON public.advice_records FOR INSERT
WITH CHECK (is_wealth_advisor() AND advisor_id = auth.uid());

CREATE POLICY "Wealth advisors can update their advice records"
ON public.advice_records FOR UPDATE
USING (is_wealth_advisor() AND advisor_id = auth.uid());

-- RLS for audit_logs (read-only for compliance, no direct writes)
CREATE POLICY "Compliance officers can view all audit logs"
ON public.audit_logs FOR SELECT
USING (is_compliance_officer());

CREATE POLICY "Wealth advisors can view audit logs for their actions"
ON public.audit_logs FOR SELECT
USING (is_wealth_advisor() AND changed_by = auth.uid());

-- RLS for compliance_alerts
CREATE POLICY "Compliance officers can view all alerts"
ON public.compliance_alerts FOR SELECT
USING (is_compliance_officer());

CREATE POLICY "Compliance officers can insert alerts"
ON public.compliance_alerts FOR INSERT
WITH CHECK (is_compliance_officer());

CREATE POLICY "Compliance officers can update alerts"
ON public.compliance_alerts FOR UPDATE
USING (is_compliance_officer());

CREATE POLICY "Wealth advisors can view alerts for their clients"
ON public.compliance_alerts FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

-- RLS for communication_logs
CREATE POLICY "Compliance officers can view all communication logs"
ON public.communication_logs FOR SELECT
USING (is_compliance_officer());

CREATE POLICY "Wealth advisors can view communications for their clients"
ON public.communication_logs FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can insert communications for their clients"
ON public.communication_logs FOR INSERT
WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));

-- Create audit trail function
CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create audit triggers for key tables
CREATE TRIGGER audit_clients
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_orders
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_client_documents
AFTER INSERT OR UPDATE OR DELETE ON public.client_documents
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_goals
AFTER INSERT OR UPDATE OR DELETE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_client_consents
AFTER INSERT OR UPDATE OR DELETE ON public.client_consents
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_advice_records
AFTER INSERT OR UPDATE OR DELETE ON public.advice_records
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Create indexes for performance
CREATE INDEX idx_client_consents_client_id ON public.client_consents(client_id);
CREATE INDEX idx_client_consents_status ON public.client_consents(status);
CREATE INDEX idx_advice_records_client_id ON public.advice_records(client_id);
CREATE INDEX idx_advice_records_advisor_id ON public.advice_records(advisor_id);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_by ON public.audit_logs(changed_by);
CREATE INDEX idx_audit_logs_changed_at ON public.audit_logs(changed_at DESC);
CREATE INDEX idx_compliance_alerts_client_id ON public.compliance_alerts(client_id);
CREATE INDEX idx_compliance_alerts_is_resolved ON public.compliance_alerts(is_resolved);
CREATE INDEX idx_communication_logs_client_id ON public.communication_logs(client_id);

-- Add updated_at trigger for client_consents
CREATE TRIGGER update_client_consents_updated_at
BEFORE UPDATE ON public.client_consents
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();