
-- Create ai_meeting_summaries table
CREATE TABLE public.ai_meeting_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  raw_notes TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_discussion_points TEXT[] DEFAULT '{}',
  decisions_made TEXT[] DEFAULT '{}',
  risks_discussed TEXT[] DEFAULT '{}',
  next_steps TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  follow_up_date DATE,
  tasks_created BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_meeting_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their meeting summaries"
  ON public.ai_meeting_summaries FOR SELECT
  USING (advisor_id = auth.uid());

CREATE POLICY "Advisors can insert meeting summaries"
  ON public.ai_meeting_summaries FOR INSERT
  WITH CHECK (advisor_id = auth.uid());

CREATE POLICY "Advisors can update their meeting summaries"
  ON public.ai_meeting_summaries FOR UPDATE
  USING (advisor_id = auth.uid());

CREATE POLICY "Advisors can delete their meeting summaries"
  ON public.ai_meeting_summaries FOR DELETE
  USING (advisor_id = auth.uid());
