
-- Create payout_requests table
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  advisor_id uuid NOT NULL,
  payout_type text NOT NULL CHECK (payout_type IN ('ACH', 'Wire', 'TOA')),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Approved', 'Processing', 'Completed', 'Failed')),
  linked_trade_id text,
  requested_date timestamp with time zone NOT NULL DEFAULT now(),
  approved_by uuid,
  settlement_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their payout requests" ON public.payout_requests FOR SELECT USING (advisor_id = auth.uid());
CREATE POLICY "Advisors can insert payout requests" ON public.payout_requests FOR INSERT WITH CHECK (advisor_id = auth.uid());
CREATE POLICY "Advisors can update their payout requests" ON public.payout_requests FOR UPDATE USING (advisor_id = auth.uid());
CREATE POLICY "Advisors can delete their payout requests" ON public.payout_requests FOR DELETE USING (advisor_id = auth.uid());

-- Create payout_transactions table
CREATE TABLE public.payout_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.payout_requests(id),
  external_reference text,
  transfer_date timestamp with time zone,
  confirmation_status text NOT NULL DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their payout transactions" ON public.payout_transactions FOR SELECT USING (EXISTS (SELECT 1 FROM public.payout_requests pr WHERE pr.id = payout_transactions.payout_id AND pr.advisor_id = auth.uid()));
CREATE POLICY "Advisors can insert payout transactions" ON public.payout_transactions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.payout_requests pr WHERE pr.id = payout_transactions.payout_id AND pr.advisor_id = auth.uid()));
CREATE POLICY "Advisors can update their payout transactions" ON public.payout_transactions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.payout_requests pr WHERE pr.id = payout_transactions.payout_id AND pr.advisor_id = auth.uid()));

-- Create withdrawal_limits table
CREATE TABLE public.withdrawal_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) UNIQUE,
  advisor_id uuid NOT NULL,
  daily_limit numeric NOT NULL DEFAULT 500000,
  monthly_limit numeric NOT NULL DEFAULT 5000000,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their withdrawal limits" ON public.withdrawal_limits FOR SELECT USING (advisor_id = auth.uid());
CREATE POLICY "Advisors can insert withdrawal limits" ON public.withdrawal_limits FOR INSERT WITH CHECK (advisor_id = auth.uid());
CREATE POLICY "Advisors can update their withdrawal limits" ON public.withdrawal_limits FOR UPDATE USING (advisor_id = auth.uid());
