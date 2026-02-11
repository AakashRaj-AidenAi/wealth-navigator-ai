
-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Campaigns table
CREATE TABLE public.campaigns_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  segment_id UUID REFERENCES public.campaign_segments(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  content TEXT NOT NULL DEFAULT '',
  variables_used TEXT[] DEFAULT '{}',
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  attachment_paths TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns_v2" ON public.campaigns_v2
  FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create own campaigns_v2" ON public.campaigns_v2
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own campaigns_v2" ON public.campaigns_v2
  FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own campaigns_v2" ON public.campaigns_v2
  FOR DELETE USING (auth.uid() = created_by);

CREATE TRIGGER update_campaigns_v2_updated_at
  BEFORE UPDATE ON public.campaigns_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaign message logs
CREATE TABLE public.campaign_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns_v2(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own message logs" ON public.campaign_message_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns_v2 c WHERE c.id = campaign_id AND c.created_by = auth.uid())
  );
CREATE POLICY "Users can insert message logs" ON public.campaign_message_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns_v2 c WHERE c.id = campaign_id AND c.created_by = auth.uid())
  );
CREATE POLICY "Users can update message logs" ON public.campaign_message_logs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.campaigns_v2 c WHERE c.id = campaign_id AND c.created_by = auth.uid())
  );
