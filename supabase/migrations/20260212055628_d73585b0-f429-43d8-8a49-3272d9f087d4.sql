-- Create sentiment_logs table
CREATE TABLE public.sentiment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('email', 'communication', 'note', 'meeting_note')),
  source_id UUID,
  source_text TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  keywords_matched TEXT[] DEFAULT '{}',
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast client lookups
CREATE INDEX idx_sentiment_logs_client ON public.sentiment_logs(client_id);
CREATE INDEX idx_sentiment_logs_sentiment ON public.sentiment_logs(sentiment);

-- Enable RLS
ALTER TABLE public.sentiment_logs ENABLE ROW LEVEL SECURITY;

-- Advisors can manage their own sentiment logs
CREATE POLICY "Advisors can view their sentiment logs"
  ON public.sentiment_logs FOR SELECT
  USING (advisor_id = auth.uid());

CREATE POLICY "Advisors can insert sentiment logs"
  ON public.sentiment_logs FOR INSERT
  WITH CHECK (advisor_id = auth.uid());

CREATE POLICY "Advisors can delete their sentiment logs"
  ON public.sentiment_logs FOR DELETE
  USING (advisor_id = auth.uid());