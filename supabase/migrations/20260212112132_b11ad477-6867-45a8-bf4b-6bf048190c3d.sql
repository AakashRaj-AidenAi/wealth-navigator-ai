
-- Add compliance columns to payout_requests
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS requires_dual_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS second_approver_id uuid,
  ADD COLUMN IF NOT EXISTS compliance_flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS funding_account_id uuid REFERENCES public.funding_accounts(id);

-- Create funding audit log table
CREATE TABLE IF NOT EXISTS public.funding_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors and compliance can view audit logs"
  ON public.funding_audit_log FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR public.is_compliance_officer()
    OR public.is_wealth_advisor()
  );

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.funding_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Create payout compliance alerts table
CREATE TABLE IF NOT EXISTS public.payout_compliance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid REFERENCES public.payout_requests(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_compliance_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view payout compliance alerts"
  ON public.payout_compliance_alerts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payout_requests pr
      WHERE pr.id = payout_id AND pr.advisor_id = auth.uid()
    )
    OR public.is_compliance_officer()
  );

CREATE POLICY "System can insert payout compliance alerts"
  ON public.payout_compliance_alerts FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Compliance can update payout compliance alerts"
  ON public.payout_compliance_alerts FOR UPDATE TO authenticated
  USING (
    public.is_compliance_officer()
    OR EXISTS (
      SELECT 1 FROM public.payout_requests pr
      WHERE pr.id = payout_id AND pr.advisor_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_funding_audit_entity ON public.funding_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_funding_audit_actor ON public.funding_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_payout_compliance_payout ON public.payout_compliance_alerts(payout_id);
