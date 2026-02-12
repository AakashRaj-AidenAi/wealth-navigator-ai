
-- Create funding_accounts table
CREATE TABLE public.funding_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'savings',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  default_account BOOLEAN NOT NULL DEFAULT false,
  advisor_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their client funding accounts" ON public.funding_accounts FOR SELECT USING (advisor_id = auth.uid());
CREATE POLICY "Advisors can insert funding accounts" ON public.funding_accounts FOR INSERT WITH CHECK (advisor_id = auth.uid());
CREATE POLICY "Advisors can update their funding accounts" ON public.funding_accounts FOR UPDATE USING (advisor_id = auth.uid());
CREATE POLICY "Advisors can delete their funding accounts" ON public.funding_accounts FOR DELETE USING (advisor_id = auth.uid());

-- Create funding_requests table
CREATE TABLE public.funding_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  funding_account_id UUID REFERENCES public.funding_accounts(id),
  funding_type TEXT NOT NULL DEFAULT 'ACH',
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Initiated',
  trade_reference TEXT,
  notes TEXT,
  initiated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their funding requests" ON public.funding_requests FOR SELECT USING (initiated_by = auth.uid());
CREATE POLICY "Advisors can insert funding requests" ON public.funding_requests FOR INSERT WITH CHECK (initiated_by = auth.uid());
CREATE POLICY "Advisors can update their funding requests" ON public.funding_requests FOR UPDATE USING (initiated_by = auth.uid());
CREATE POLICY "Advisors can delete their funding requests" ON public.funding_requests FOR DELETE USING (initiated_by = auth.uid());

-- Create funding_transactions table
CREATE TABLE public.funding_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funding_request_id UUID NOT NULL REFERENCES public.funding_requests(id) ON DELETE CASCADE,
  external_reference TEXT,
  settlement_date DATE,
  confirmation_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their funding transactions" ON public.funding_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.funding_requests fr WHERE fr.id = funding_transactions.funding_request_id AND fr.initiated_by = auth.uid())
);
CREATE POLICY "Advisors can insert funding transactions" ON public.funding_transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.funding_requests fr WHERE fr.id = funding_transactions.funding_request_id AND fr.initiated_by = auth.uid())
);
CREATE POLICY "Advisors can update funding transactions" ON public.funding_transactions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.funding_requests fr WHERE fr.id = funding_transactions.funding_request_id AND fr.initiated_by = auth.uid())
);

-- Create cash_balances table
CREATE TABLE public.cash_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  available_cash NUMERIC NOT NULL DEFAULT 0,
  pending_cash NUMERIC NOT NULL DEFAULT 0,
  advisor_id UUID NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their client cash balances" ON public.cash_balances FOR SELECT USING (advisor_id = auth.uid());
CREATE POLICY "Advisors can insert cash balances" ON public.cash_balances FOR INSERT WITH CHECK (advisor_id = auth.uid());
CREATE POLICY "Advisors can update their cash balances" ON public.cash_balances FOR UPDATE USING (advisor_id = auth.uid());
CREATE POLICY "Advisors can delete cash balances" ON public.cash_balances FOR DELETE USING (advisor_id = auth.uid());

-- Trigger for updated_at on funding_accounts
CREATE TRIGGER update_funding_accounts_updated_at BEFORE UPDATE ON public.funding_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on funding_requests
CREATE TRIGGER update_funding_requests_updated_at BEFORE UPDATE ON public.funding_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on funding_transactions
CREATE TRIGGER update_funding_transactions_updated_at BEFORE UPDATE ON public.funding_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
