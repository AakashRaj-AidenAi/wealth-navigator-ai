
-- Message templates table
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- sip_reminder, portfolio_report, meeting_invite, festive_greeting, custom
  channel TEXT NOT NULL DEFAULT 'email', -- email, whatsapp
  subject TEXT,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}', -- placeholders like {{client_name}}, {{portfolio_value}}
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Communication campaigns for bulk messaging
CREATE TABLE public.communication_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_id UUID REFERENCES public.message_templates(id),
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, completed, cancelled
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  target_filter JSONB, -- filter criteria for recipients
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign recipients tracking
CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.communication_campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, delivered, opened
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add attachments support to communication_logs
ALTER TABLE public.communication_logs 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.message_templates(id),
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.communication_campaigns(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_templates
CREATE POLICY "Wealth advisors can manage templates" ON public.message_templates
  FOR ALL USING (public.is_wealth_advisor());

CREATE POLICY "Compliance can view templates" ON public.message_templates
  FOR SELECT USING (public.is_compliance_officer());

-- RLS Policies for communication_campaigns
CREATE POLICY "Wealth advisors can manage their campaigns" ON public.communication_campaigns
  FOR ALL USING (public.is_wealth_advisor() AND created_by = auth.uid());

CREATE POLICY "Compliance can view all campaigns" ON public.communication_campaigns
  FOR SELECT USING (public.is_compliance_officer());

-- RLS Policies for campaign_recipients
CREATE POLICY "Wealth advisors can manage campaign recipients" ON public.campaign_recipients
  FOR ALL USING (
    public.is_wealth_advisor() AND 
    EXISTS (SELECT 1 FROM public.communication_campaigns WHERE id = campaign_id AND created_by = auth.uid())
  );

CREATE POLICY "Compliance can view campaign recipients" ON public.campaign_recipients
  FOR SELECT USING (public.is_compliance_officer());

-- Indexes for performance
CREATE INDEX idx_message_templates_category ON public.message_templates(category);
CREATE INDEX idx_message_templates_channel ON public.message_templates(channel);
CREATE INDEX idx_campaigns_status ON public.communication_campaigns(status);
CREATE INDEX idx_campaigns_created_by ON public.communication_campaigns(created_by);
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_client ON public.campaign_recipients(client_id);
CREATE INDEX idx_communication_logs_campaign ON public.communication_logs(campaign_id);

-- Triggers for updated_at
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.communication_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
