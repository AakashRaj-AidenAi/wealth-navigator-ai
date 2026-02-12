
-- Portfolio Administration Module Tables

-- 1. Portfolios
CREATE TABLE public.portfolio_admin_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  portfolio_name TEXT NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_admin_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors manage own portfolios" ON public.portfolio_admin_portfolios
  FOR ALL USING (advisor_id = auth.uid()) WITH CHECK (advisor_id = auth.uid());

CREATE TRIGGER update_portfolio_admin_portfolios_updated_at
  BEFORE UPDATE ON public.portfolio_admin_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Accounts
CREATE TABLE public.portfolio_admin_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolio_admin_portfolios(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL DEFAULT 'brokerage' CHECK (account_type IN ('brokerage', 'retirement', 'external')),
  custodian_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_admin_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors manage own accounts" ON public.portfolio_admin_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.portfolio_admin_portfolios p WHERE p.id = portfolio_id AND p.advisor_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.portfolio_admin_portfolios p WHERE p.id = portfolio_id AND p.advisor_id = auth.uid())
  );

CREATE TRIGGER update_portfolio_admin_accounts_updated_at
  BEFORE UPDATE ON public.portfolio_admin_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Positions
CREATE TABLE public.portfolio_admin_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolio_admin_portfolios(id) ON DELETE CASCADE,
  security_id TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  average_cost NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC NOT NULL DEFAULT 0,
  market_value NUMERIC GENERATED ALWAYS AS (quantity * current_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_admin_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors manage own positions" ON public.portfolio_admin_positions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.portfolio_admin_portfolios p WHERE p.id = portfolio_id AND p.advisor_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.portfolio_admin_portfolios p WHERE p.id = portfolio_id AND p.advisor_id = auth.uid())
  );

CREATE TRIGGER update_portfolio_admin_positions_updated_at
  BEFORE UPDATE ON public.portfolio_admin_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Transactions
CREATE TABLE public.portfolio_admin_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolio_admin_portfolios(id) ON DELETE CASCADE,
  security_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'buy' CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'fee', 'split', 'transfer')),
  quantity NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  settlement_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_admin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors manage own transactions" ON public.portfolio_admin_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.portfolio_admin_portfolios p WHERE p.id = portfolio_id AND p.advisor_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.portfolio_admin_portfolios p WHERE p.id = portfolio_id AND p.advisor_id = auth.uid())
  );

CREATE TRIGGER update_portfolio_admin_transactions_updated_at
  BEFORE UPDATE ON public.portfolio_admin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
