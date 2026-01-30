-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('wealth_advisor', 'compliance_officer', 'client');

-- Create enum for order types
CREATE TYPE public.order_type AS ENUM ('buy', 'sell');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'executed', 'cancelled');

-- Create enum for report types
CREATE TYPE public.report_type AS ENUM ('compliance', 'analytics', 'performance', 'risk');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  total_assets DECIMAL(18,2) DEFAULT 0,
  risk_profile TEXT DEFAULT 'moderate',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(18,2) NOT NULL,
  current_amount DECIMAL(18,2) DEFAULT 0,
  target_date DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  order_type order_type NOT NULL,
  symbol TEXT NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  price DECIMAL(18,4),
  total_amount DECIMAL(18,2),
  status order_status DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type report_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  generated_by UUID REFERENCES auth.users(id) NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to check if current user is a wealth advisor
CREATE OR REPLACE FUNCTION public.is_wealth_advisor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'wealth_advisor')
$$;

-- Helper function to check if current user is a compliance officer
CREATE OR REPLACE FUNCTION public.is_compliance_officer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'compliance_officer')
$$;

-- Helper function to check if current user is a client
CREATE OR REPLACE FUNCTION public.is_client()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'client')
$$;

-- Helper function to check if current user is the advisor of a client
CREATE OR REPLACE FUNCTION public.is_client_advisor(_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients
    WHERE id = _client_id
      AND advisor_id = auth.uid()
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Wealth advisors can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_wealth_advisor());

CREATE POLICY "Compliance officers can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_compliance_officer());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Wealth advisors can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_wealth_advisor());

CREATE POLICY "Compliance officers can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_compliance_officer());

CREATE POLICY "Users can insert their own role during signup"
ON public.user_roles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Clients policies
CREATE POLICY "Wealth advisors can view all clients"
ON public.clients FOR SELECT
USING (public.is_wealth_advisor());

CREATE POLICY "Compliance officers can view all clients"
ON public.clients FOR SELECT
USING (public.is_compliance_officer());

CREATE POLICY "Wealth advisors can insert clients"
ON public.clients FOR INSERT
WITH CHECK (public.is_wealth_advisor() AND advisor_id = auth.uid());

CREATE POLICY "Wealth advisors can update their own clients"
ON public.clients FOR UPDATE
USING (public.is_wealth_advisor() AND advisor_id = auth.uid());

CREATE POLICY "Wealth advisors can delete their own clients"
ON public.clients FOR DELETE
USING (public.is_wealth_advisor() AND advisor_id = auth.uid());

-- Goals policies
CREATE POLICY "Wealth advisors can view all goals"
ON public.goals FOR SELECT
USING (public.is_wealth_advisor());

CREATE POLICY "Compliance officers can view all goals"
ON public.goals FOR SELECT
USING (public.is_compliance_officer());

CREATE POLICY "Wealth advisors can insert goals for their clients"
ON public.goals FOR INSERT
WITH CHECK (public.is_wealth_advisor() AND public.is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can update goals for their clients"
ON public.goals FOR UPDATE
USING (public.is_wealth_advisor() AND public.is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can delete goals for their clients"
ON public.goals FOR DELETE
USING (public.is_wealth_advisor() AND public.is_client_advisor(client_id));

-- Orders policies
CREATE POLICY "Wealth advisors can view all orders"
ON public.orders FOR SELECT
USING (public.is_wealth_advisor());

CREATE POLICY "Compliance officers can view all orders"
ON public.orders FOR SELECT
USING (public.is_compliance_officer());

CREATE POLICY "Wealth advisors can insert orders for their clients"
ON public.orders FOR INSERT
WITH CHECK (public.is_wealth_advisor() AND public.is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can update orders for their clients"
ON public.orders FOR UPDATE
USING (public.is_wealth_advisor() AND public.is_client_advisor(client_id));

-- Reports policies
CREATE POLICY "All authenticated users can view reports"
ON public.reports FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Compliance officers can insert reports"
ON public.reports FOR INSERT
WITH CHECK (public.is_compliance_officer() AND generated_by = auth.uid());

CREATE POLICY "Wealth advisors can insert reports"
ON public.reports FOR INSERT
WITH CHECK (public.is_wealth_advisor() AND generated_by = auth.uid());

CREATE POLICY "Report creators can update their own reports"
ON public.reports FOR UPDATE
USING (generated_by = auth.uid());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();