import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MeetingSummaryResult {
  summary: string;
  key_discussion_points: string[];
  decisions_made: string[];
  risks_discussed: string[];
  next_steps: string[];
  action_items: string[];
  follow_up_date: string | null;
}

// Rule-based keyword dictionaries for simulated AI summarization
const DISCUSSION_KEYWORDS = ['discussed', 'talked about', 'reviewed', 'covered', 'explored', 'went over', 'addressed', 'examined', 'analyzed', 'considered'];
const DECISION_KEYWORDS = ['decided', 'agreed', 'confirmed', 'approved', 'chose', 'selected', 'finalized', 'committed', 'resolved to', 'will proceed'];
const RISK_KEYWORDS = ['risk', 'concern', 'worry', 'issue', 'problem', 'challenge', 'threat', 'volatility', 'downside', 'uncertainty', 'caution', 'warning'];
const ACTION_KEYWORDS = ['action', 'follow up', 'follow-up', 'todo', 'to-do', 'need to', 'must', 'should', 'will', 'assign', 'schedule', 'send', 'prepare', 'review', 'update', 'complete', 'submit', 'arrange', 'coordinate', 'ensure'];
const DATE_PATTERNS = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|next\s+(week|month|monday|tuesday|wednesday|thursday|friday)|in\s+(\d+)\s+(days?|weeks?|months?)/gi;

function extractSentences(text: string): string[] {
  return text
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

function matchesKeywords(sentence: string, keywords: string[]): boolean {
  const lower = sentence.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function extractFollowUpDate(text: string): string | null {
  const match = text.match(DATE_PATTERNS);
  if (!match) return null;

  const raw = match[0].toLowerCase();
  const now = new Date();

  if (raw.includes('next week')) {
    now.setDate(now.getDate() + 7);
  } else if (raw.includes('next month')) {
    now.setMonth(now.getMonth() + 1);
  } else if (raw.includes('next monday')) {
    now.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
  } else if (raw.match(/in\s+(\d+)\s+days?/)) {
    const days = parseInt(raw.match(/in\s+(\d+)\s+days?/)![1]);
    now.setDate(now.getDate() + days);
  } else if (raw.match(/in\s+(\d+)\s+weeks?/)) {
    const weeks = parseInt(raw.match(/in\s+(\d+)\s+weeks?/)![1]);
    now.setDate(now.getDate() + weeks * 7);
  } else {
    // Try parsing a date string
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    // Default: 7 days
    now.setDate(now.getDate() + 7);
  }

  return now.toISOString().split('T')[0];
}

export function generateSimulatedSummary(notes: string): MeetingSummaryResult {
  const sentences = extractSentences(notes);

  const discussion = sentences.filter(s => matchesKeywords(s, DISCUSSION_KEYWORDS));
  const decisions = sentences.filter(s => matchesKeywords(s, DECISION_KEYWORDS));
  const risks = sentences.filter(s => matchesKeywords(s, RISK_KEYWORDS));
  const actions = sentences.filter(s => matchesKeywords(s, ACTION_KEYWORDS));

  // If no structured matches, use heuristics
  const keyPoints = discussion.length > 0 ? discussion : sentences.slice(0, Math.min(3, sentences.length));
  const decisionsMade = decisions.length > 0 ? decisions : [];
  const risksDiscussed = risks.length > 0 ? risks : [];
  const actionItems = actions.length > 0 ? actions : sentences.filter(s => {
    const lower = s.toLowerCase();
    return lower.startsWith('we ') || lower.startsWith('i ') || lower.includes('plan to');
  });

  // Build summary from first few meaningful sentences
  const summaryParts = sentences.slice(0, Math.min(4, sentences.length));
  const summary = summaryParts.length > 0
    ? `Meeting covered ${summaryParts.length} key topics. ${summaryParts[0]}. ${keyPoints.length} discussion points identified, ${decisionsMade.length} decisions made, and ${actionItems.length} action items extracted.`
    : 'Meeting notes were processed. No structured content could be extracted.';

  const followUpDate = extractFollowUpDate(notes);

  return {
    summary,
    key_discussion_points: keyPoints.slice(0, 5),
    decisions_made: decisionsMade.slice(0, 5),
    risks_discussed: risksDiscussed.slice(0, 5),
    next_steps: actionItems.slice(0, 3),
    action_items: actionItems.slice(0, 8),
    follow_up_date: followUpDate,
  };
}

export function useMeetingSummary() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MeetingSummaryResult | null>(null);

  const generate = (notes: string) => {
    if (!notes.trim()) {
      toast.error('Please enter meeting notes');
      return null;
    }
    setLoading(true);
    // Simulate slight delay for UX
    const summary = generateSimulatedSummary(notes);
    setResult(summary);
    setLoading(false);
    toast.success('Summary generated!');
    return summary;
  };

  const saveSummary = async (clientId: string, notes: string, summaryData: MeetingSummaryResult) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error('Please log in');
      return null;
    }

    const { data, error } = await supabase.from('ai_meeting_summaries' as any).insert({
      client_id: clientId,
      advisor_id: session.session.user.id,
      raw_notes: notes,
      summary: summaryData.summary,
      key_discussion_points: summaryData.key_discussion_points,
      decisions_made: summaryData.decisions_made,
      risks_discussed: summaryData.risks_discussed,
      next_steps: summaryData.next_steps,
      action_items: summaryData.action_items,
      follow_up_date: summaryData.follow_up_date,
    }).select().single();

    if (error) {
      console.error('Error saving summary:', error);
      toast.error('Failed to save summary');
      return null;
    }
    toast.success('Summary saved!');
    return data;
  };

  const createTasksFromSummary = async (
    clientId: string,
    clientName: string | undefined,
    summaryData: MeetingSummaryResult
  ) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session || !summaryData.action_items.length) return;

    const tasks = summaryData.action_items.map((item) => ({
      title: item.substring(0, 100),
      description: `From meeting${clientName ? ` with ${clientName}` : ''}: ${item}`,
      status: 'todo' as const,
      priority: 'medium' as const,
      trigger_type: 'meeting_logged' as const,
      assigned_to: session.session!.user.id,
      created_by: session.session!.user.id,
      client_id: clientId,
      due_date: summaryData.follow_up_date || null,
    }));

    const { error } = await supabase.from('tasks').insert(tasks);
    if (error) {
      console.error('Error creating tasks:', error);
      toast.error('Failed to create tasks');
      return;
    }
    toast.success(`${tasks.length} tasks created!`);
  };

  const saveToTimeline = async (clientId: string, summaryData: MeetingSummaryResult) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    // Save as client note
    await supabase.from('client_notes').insert({
      client_id: clientId,
      title: `AI Meeting Summary - ${new Date().toLocaleDateString()}`,
      content: `**Summary:**\n${summaryData.summary}\n\n**Key Discussion Points:**\n${summaryData.key_discussion_points.map(d => `- ${d}`).join('\n')}\n\n**Decisions Made:**\n${summaryData.decisions_made.map(d => `- ${d}`).join('\n')}\n\n**Risks Discussed:**\n${summaryData.risks_discussed.map(r => `- ${r}`).join('\n')}\n\n**Action Items:**\n${summaryData.action_items.map(a => `- ${a}`).join('\n')}`,
      created_by: session.session.user.id,
    });

    // Log as activity
    await supabase.from('client_activities').insert({
      client_id: clientId,
      activity_type: 'meeting',
      title: 'AI Meeting Summary Generated',
      description: summaryData.summary,
      created_by: session.session.user.id,
    });

    toast.success('Saved to client timeline!');
  };

  const reset = () => setResult(null);

  return { generate, result, loading, saveSummary, createTasksFromSummary, saveToTimeline, reset };
}
