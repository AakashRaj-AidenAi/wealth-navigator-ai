import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateSimulatedSummary, type MeetingSummaryResult } from './useMeetingSummary';

// Mock transcription samples based on file duration/size
const MOCK_TRANSCRIPTS = [
  `We discussed the client's portfolio allocation and reviewed the equity exposure. The risk level seems moderate but there is concern about market volatility. We decided to reduce equity exposure by 10% and increase debt allocation. The client agreed to a conservative approach for the next quarter. We need to prepare a revised portfolio proposal by next week. Follow up with the client in 7 days to confirm the changes. We should also review the SIP amounts and ensure the nominee details are updated.`,
  `Reviewed the retirement planning goals with the client. Current savings rate is insufficient to meet the target of 2 crores by 2035. We discussed increasing the monthly SIP from 25000 to 40000. The client expressed worry about job security and wants to maintain a larger emergency fund. Decided to allocate 6 months of expenses as emergency reserve. Action items include preparing a revised financial plan, scheduling a follow-up meeting next month, and sending the updated goal tracker. We will proceed with the SIP increase from next month.`,
  `Meeting with the client regarding tax planning for the current financial year. We covered Section 80C investments, NPS contributions, and health insurance premiums. The client has already exhausted the 80C limit but should consider NPS for additional tax benefit. There is a risk of penalty if advance tax is not paid by the 15th. We agreed to submit the advance tax challan this week. Need to prepare a tax summary report and send it to the client. Will review the capital gains situation in the next meeting scheduled for next Friday.`,
];

export function useMockTranscription() {
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [structuredResult, setStructuredResult] = useState<MeetingSummaryResult | null>(null);

  const transcribeFile = async (file: File): Promise<string> => {
    setTranscribing(true);
    setTranscript(null);
    setStructuredResult(null);

    // Simulate transcription delay (1-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

    // Pick a mock transcript based on file size hash
    const index = file.size % MOCK_TRANSCRIPTS.length;
    const mockTranscript = MOCK_TRANSCRIPTS[index];

    setTranscript(mockTranscript);
    setTranscribing(false);
    toast.success('Transcription complete!');
    return mockTranscript;
  };

  const extractStructure = (text: string) => {
    const result = generateSimulatedSummary(text);
    setStructuredResult(result);
    return result;
  };

  const saveTranscription = async (
    clientId: string,
    file: File,
    transcriptText: string,
    structured: MeetingSummaryResult
  ) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error('Please log in');
      return null;
    }

    const { data, error } = await supabase.from('voice_note_transcriptions' as any).insert({
      client_id: clientId,
      advisor_id: session.session.user.id,
      file_name: file.name,
      file_size: file.size,
      duration_seconds: Math.round(file.size / 16000), // rough estimate
      raw_transcript: transcriptText,
      topics_discussed: structured.key_discussion_points,
      decisions: structured.decisions_made,
      follow_up_actions: structured.action_items,
    }).select().single();

    if (error) {
      console.error('Error saving transcription:', error);
      toast.error('Failed to save transcription');
      return null;
    }
    toast.success('Voice note saved!');
    return data;
  };

  const reset = () => {
    setTranscript(null);
    setStructuredResult(null);
  };

  return {
    transcribing,
    transcript,
    structuredResult,
    transcribeFile,
    extractStructure,
    saveTranscription,
    reset,
  };
}
