
-- 1. client_aum
CREATE TABLE public.client_aum (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  current_aum NUMERIC DEFAULT 0,
  equity_aum NUMERIC DEFAULT 0,
  debt_aum NUMERIC DEFAULT 0,
  other_assets NUMERIC DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.client_aum ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advisors can view their client AUM" ON public.client_aum FOR SELECT USING (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Advisors can insert client AUM" ON public.client_aum FOR INSERT WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Advisors can update client AUM" ON public.client_aum FOR UPDATE USING (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Advisors can delete client AUM" ON public.client_aum FOR DELETE USING (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Compliance can view all client AUM" ON public.client_aum FOR SELECT USING (is_compliance_officer());

-- 2. revenue_records
CREATE TABLE public.revenue_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  revenue_type TEXT NOT NULL DEFAULT 'commission',
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advisors can view their revenue" ON public.revenue_records FOR SELECT USING (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Advisors can insert revenue" ON public.revenue_records FOR INSERT WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Advisors can update revenue" ON public.revenue_records FOR UPDATE USING (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Advisors can delete revenue" ON public.revenue_records FOR DELETE USING (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Compliance can view all revenue" ON public.revenue_records FOR SELECT USING (is_compliance_officer());

-- 3. commission_records
CREATE TABLE public.commission_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  upfront_commission NUMERIC DEFAULT 0,
  trail_commission NUMERIC DEFAULT 0,
  payout_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advisors can view their commissions" ON public.commission_records FOR SELECT USING (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Advisors can insert commissions" ON public.commission_records FOR INSERT WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Advisors can update commissions" ON public.commission_records FOR UPDATE USING (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Advisors can delete commissions" ON public.commission_records FOR DELETE USING (is_wealth_advisor() AND is_client_advisor(client_id));
CREATE POLICY "Compliance can view all commissions" ON public.commission_records FOR SELECT USING (is_compliance_officer());

-- 4. invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  gst NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advisors can view their invoices" ON public.invoices FOR SELECT USING (is_wealth_advisor() AND (advisor_id = auth.uid()));
CREATE POLICY "Advisors can insert invoices" ON public.invoices FOR INSERT WITH CHECK (is_wealth_advisor() AND (advisor_id = auth.uid()));
CREATE POLICY "Advisors can update invoices" ON public.invoices FOR UPDATE USING (is_wealth_advisor() AND (advisor_id = auth.uid()));
CREATE POLICY "Advisors can delete invoices" ON public.invoices FOR DELETE USING (is_wealth_advisor() AND (advisor_id = auth.uid()));
CREATE POLICY "Compliance can view all invoices" ON public.invoices FOR SELECT USING (is_compliance_officer());

-- 5. payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT NOT NULL DEFAULT 'bank_transfer',
  amount_received NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advisors can view payments for their invoices" ON public.payments FOR SELECT USING (is_wealth_advisor() AND EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = payments.invoice_id AND invoices.advisor_id = auth.uid()));
CREATE POLICY "Advisors can insert payments" ON public.payments FOR INSERT WITH CHECK (is_wealth_advisor() AND EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = payments.invoice_id AND invoices.advisor_id = auth.uid()));
CREATE POLICY "Advisors can update payments" ON public.payments FOR UPDATE USING (is_wealth_advisor() AND EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = payments.invoice_id AND invoices.advisor_id = auth.uid()));
CREATE POLICY "Advisors can delete payments" ON public.payments FOR DELETE USING (is_wealth_advisor() AND EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = payments.invoice_id AND invoices.advisor_id = auth.uid()));
CREATE POLICY "Compliance can view all payments" ON public.payments FOR SELECT USING (is_compliance_officer());
