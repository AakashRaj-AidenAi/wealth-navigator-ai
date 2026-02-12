
-- Create churn_predictions table
CREATE TABLE public.churn_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  churn_risk_percentage INTEGER NOT NULL DEFAULT 0 CHECK (churn_risk_percentage >= 0 AND churn_risk_percentage <= 100),
  risk_level TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN churn_risk_percentage >= 70 THEN 'high'
      WHEN churn_risk_percentage >= 40 THEN 'medium'
      ELSE 'low'
    END
  ) STORED,
  days_since_interaction INTEGER DEFAULT 0,
  sip_stopped BOOLEAN DEFAULT false,
  engagement_score INTEGER DEFAULT 0,
  campaign_responses INTEGER DEFAULT 0,
  total_campaigns INTEGER DEFAULT 0,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.churn_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view churn predictions for their clients"
ON public.churn_predictions FOR SELECT
USING (advisor_id = auth.uid());

CREATE POLICY "Users can insert churn predictions"
ON public.churn_predictions FOR INSERT
WITH CHECK (advisor_id = auth.uid());

CREATE POLICY "Users can update churn predictions"
ON public.churn_predictions FOR UPDATE
USING (advisor_id = auth.uid());

CREATE POLICY "Users can delete churn predictions"
ON public.churn_predictions FOR DELETE
USING (advisor_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_churn_predictions_updated_at
BEFORE UPDATE ON public.churn_predictions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
