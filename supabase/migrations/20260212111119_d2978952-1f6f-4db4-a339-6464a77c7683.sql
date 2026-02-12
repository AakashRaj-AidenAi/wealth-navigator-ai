
-- Add workflow columns to payout_requests
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS workflow_stage text NOT NULL DEFAULT 'requested',
  ADD COLUMN IF NOT EXISTS stage_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversal_reason text,
  ADD COLUMN IF NOT EXISTS estimated_completion timestamptz;

-- Create payout status history table for timeline
CREATE TABLE IF NOT EXISTS public.payout_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.payout_requests(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payout_status_history ENABLE ROW LEVEL SECURITY;

-- RLS: advisors can see history for their payouts
CREATE POLICY "Advisors can view payout history"
  ON public.payout_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payout_requests pr
      WHERE pr.id = payout_status_history.payout_id
        AND pr.advisor_id = auth.uid()
    )
  );

CREATE POLICY "Advisors can insert payout history"
  ON public.payout_status_history
  FOR INSERT
  WITH CHECK (changed_by = auth.uid());
