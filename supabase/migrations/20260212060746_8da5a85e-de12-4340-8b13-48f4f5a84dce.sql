
CREATE TABLE public.voice_note_transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  duration_seconds INTEGER,
  raw_transcript TEXT NOT NULL,
  topics_discussed TEXT[] DEFAULT '{}',
  decisions TEXT[] DEFAULT '{}',
  follow_up_actions TEXT[] DEFAULT '{}',
  tasks_created BOOLEAN DEFAULT false,
  summary_id UUID REFERENCES public.ai_meeting_summaries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_note_transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view their voice transcriptions"
  ON public.voice_note_transcriptions FOR SELECT
  USING (advisor_id = auth.uid());

CREATE POLICY "Advisors can insert voice transcriptions"
  ON public.voice_note_transcriptions FOR INSERT
  WITH CHECK (advisor_id = auth.uid());

CREATE POLICY "Advisors can update their voice transcriptions"
  ON public.voice_note_transcriptions FOR UPDATE
  USING (advisor_id = auth.uid());

CREATE POLICY "Advisors can delete their voice transcriptions"
  ON public.voice_note_transcriptions FOR DELETE
  USING (advisor_id = auth.uid());
