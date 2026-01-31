-- Add new columns to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS anniversary_date DATE,
ADD COLUMN IF NOT EXISTS kyc_expiry_date DATE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS pan_number TEXT,
ADD COLUMN IF NOT EXISTS aadhar_number TEXT;

-- Create client tags enum
DO $$ BEGIN
  CREATE TYPE client_tag AS ENUM ('hni', 'uhni', 'prospect', 'active', 'dormant', 'vip', 'nri');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create activity type enum
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'document', 'reminder');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create reminder type enum
DO $$ BEGIN
  CREATE TYPE reminder_type AS ENUM ('birthday', 'anniversary', 'kyc_expiry', 'maturity_date', 'review_meeting', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create document type enum
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('kyc', 'agreement', 'statement', 'id_proof', 'address_proof', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create family members table
CREATE TABLE public.client_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  date_of_birth DATE,
  email TEXT,
  phone TEXT,
  is_nominee BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create nominees table
CREATE TABLE public.client_nominees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  date_of_birth DATE,
  address TEXT,
  id_proof_type TEXT,
  id_proof_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client tags table (many-to-many)
CREATE TABLE public.client_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  tag client_tag NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, tag)
);

-- Create client notes table
CREATE TABLE public.client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client documents table
CREATE TABLE public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID NOT NULL,
  document_type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client activities table
CREATE TABLE public.client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  activity_type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client reminders table
CREATE TABLE public.client_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  reminder_type reminder_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reminder_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client goals table (separate from investment goals)
CREATE TABLE public.client_life_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  goal_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(18,2),
  target_date DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.client_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_life_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_family_members
CREATE POLICY "Wealth advisors can view family members for their clients"
ON public.client_family_members FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can insert family members for their clients"
ON public.client_family_members FOR INSERT
WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can update family members for their clients"
ON public.client_family_members FOR UPDATE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can delete family members for their clients"
ON public.client_family_members FOR DELETE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Compliance officers can view all family members"
ON public.client_family_members FOR SELECT
USING (is_compliance_officer());

-- RLS Policies for client_nominees
CREATE POLICY "Wealth advisors can view nominees for their clients"
ON public.client_nominees FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can insert nominees for their clients"
ON public.client_nominees FOR INSERT
WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can update nominees for their clients"
ON public.client_nominees FOR UPDATE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can delete nominees for their clients"
ON public.client_nominees FOR DELETE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Compliance officers can view all nominees"
ON public.client_nominees FOR SELECT
USING (is_compliance_officer());

-- RLS Policies for client_tags
CREATE POLICY "Wealth advisors can view tags for their clients"
ON public.client_tags FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can insert tags for their clients"
ON public.client_tags FOR INSERT
WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can delete tags for their clients"
ON public.client_tags FOR DELETE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Compliance officers can view all tags"
ON public.client_tags FOR SELECT
USING (is_compliance_officer());

-- RLS Policies for client_notes
CREATE POLICY "Wealth advisors can view notes for their clients"
ON public.client_notes FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can insert notes for their clients"
ON public.client_notes FOR INSERT
WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can update notes for their clients"
ON public.client_notes FOR UPDATE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can delete notes for their clients"
ON public.client_notes FOR DELETE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Compliance officers can view all notes"
ON public.client_notes FOR SELECT
USING (is_compliance_officer());

-- RLS Policies for client_documents
CREATE POLICY "Wealth advisors can view documents for their clients"
ON public.client_documents FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can insert documents for their clients"
ON public.client_documents FOR INSERT
WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can delete documents for their clients"
ON public.client_documents FOR DELETE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Compliance officers can view all documents"
ON public.client_documents FOR SELECT
USING (is_compliance_officer());

-- RLS Policies for client_activities
CREATE POLICY "Wealth advisors can view activities for their clients"
ON public.client_activities FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can insert activities for their clients"
ON public.client_activities FOR INSERT
WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can update activities for their clients"
ON public.client_activities FOR UPDATE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can delete activities for their clients"
ON public.client_activities FOR DELETE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Compliance officers can view all activities"
ON public.client_activities FOR SELECT
USING (is_compliance_officer());

-- RLS Policies for client_reminders
CREATE POLICY "Wealth advisors can view reminders for their clients"
ON public.client_reminders FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can insert reminders for their clients"
ON public.client_reminders FOR INSERT
WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can update reminders for their clients"
ON public.client_reminders FOR UPDATE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can delete reminders for their clients"
ON public.client_reminders FOR DELETE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Compliance officers can view all reminders"
ON public.client_reminders FOR SELECT
USING (is_compliance_officer());

-- RLS Policies for client_life_goals
CREATE POLICY "Wealth advisors can view life goals for their clients"
ON public.client_life_goals FOR SELECT
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can insert life goals for their clients"
ON public.client_life_goals FOR INSERT
WITH CHECK (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can update life goals for their clients"
ON public.client_life_goals FOR UPDATE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Wealth advisors can delete life goals for their clients"
ON public.client_life_goals FOR DELETE
USING (is_wealth_advisor() AND is_client_advisor(client_id));

CREATE POLICY "Compliance officers can view all life goals"
ON public.client_life_goals FOR SELECT
USING (is_compliance_officer());

-- Create storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view client documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete client documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-documents' 
  AND auth.uid() IS NOT NULL
);

-- Create triggers for updated_at
CREATE TRIGGER update_client_family_members_updated_at
  BEFORE UPDATE ON public.client_family_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_client_nominees_updated_at
  BEFORE UPDATE ON public.client_nominees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_client_notes_updated_at
  BEFORE UPDATE ON public.client_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_client_life_goals_updated_at
  BEFORE UPDATE ON public.client_life_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();