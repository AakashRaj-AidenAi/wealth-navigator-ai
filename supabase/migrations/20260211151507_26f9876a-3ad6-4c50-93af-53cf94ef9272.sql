
-- Create campaign_segments table for the Client Segmentation Engine
CREATE TABLE public.campaign_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  filter_criteria JSONB NOT NULL DEFAULT '{}',
  is_auto_updating BOOLEAN NOT NULL DEFAULT false,
  client_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_segments ENABLE ROW LEVEL SECURITY;

-- Advisors can manage their own segments
CREATE POLICY "Users can view their own segments"
  ON public.campaign_segments FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create segments"
  ON public.campaign_segments FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own segments"
  ON public.campaign_segments FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own segments"
  ON public.campaign_segments FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_campaign_segments_updated_at
  BEFORE UPDATE ON public.campaign_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
