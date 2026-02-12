
-- Create client_engagement_scores table
CREATE TABLE public.client_engagement_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  engagement_score INTEGER NOT NULL DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  days_since_last_interaction INTEGER,
  meetings_last_90_days INTEGER DEFAULT 0,
  campaign_response_rate NUMERIC(5,2) DEFAULT 0,
  portfolio_activity_frequency INTEGER DEFAULT 0,
  revenue_contribution NUMERIC(12,2) DEFAULT 0,
  task_completion_rate NUMERIC(5,2) DEFAULT 0,
  engagement_level TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN engagement_score >= 75 THEN 'high'
      WHEN engagement_score >= 40 THEN 'medium'
      ELSE 'low'
    END
  ) STORED,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.client_engagement_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view engagement scores for their clients"
ON public.client_engagement_scores FOR SELECT
USING (advisor_id = auth.uid());

CREATE POLICY "Users can insert engagement scores for their clients"
ON public.client_engagement_scores FOR INSERT
WITH CHECK (advisor_id = auth.uid());

CREATE POLICY "Users can update engagement scores for their clients"
ON public.client_engagement_scores FOR UPDATE
USING (advisor_id = auth.uid());

CREATE POLICY "Users can delete engagement scores for their clients"
ON public.client_engagement_scores FOR DELETE
USING (advisor_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_client_engagement_scores_updated_at
BEFORE UPDATE ON public.client_engagement_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
