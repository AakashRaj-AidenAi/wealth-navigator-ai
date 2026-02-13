import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SentimentLog {
  id: string;
  client_id: string;
  source_type: string;
  source_id: string | null;
  source_text: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  confidence_score: number;
  keywords_matched: string[];
  analyzed_at: string;
}

// Rule-based keyword dictionaries
const SENTIMENT_KEYWORDS = {
  urgent: [
    'urgent', 'asap', 'immediately', 'critical', 'emergency', 'deadline',
    'time-sensitive', 'right away', 'as soon as possible', 'escalate',
    'cannot wait', 'serious issue', 'crisis'
  ],
  negative: [
    'unhappy', 'dissatisfied', 'disappointed', 'frustrated', 'angry',
    'complaint', 'unacceptable', 'poor', 'terrible', 'worst', 'cancel',
    'withdraw', 'close account', 'lost money', 'losing', 'bad experience',
    'not satisfied', 'regret', 'mistake', 'failed', 'issue', 'problem',
    'concerned', 'worried', 'upset', 'annoyed', 'ridiculous', 'horrible',
    'incompetent', 'negligent', 'misleading', 'scam', 'ripped off',
    'overcharged', 'delayed', 'ignored', 'no response', 'unresponsive'
  ],
  positive: [
    'thank you', 'thanks', 'great', 'excellent', 'wonderful', 'fantastic',
    'happy', 'satisfied', 'pleased', 'impressed', 'amazing', 'love',
    'appreciate', 'perfect', 'outstanding', 'brilliant', 'helpful',
    'recommend', 'grateful', 'well done', 'keep up', 'good job',
    'exceptional', 'delighted', 'thrilled', 'awesome', 'superb',
    'commend', 'praise', 'growth', 'profit', 'gains', 'successful'
  ],
};

export const analyzeSentiment = (text: string): {
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  confidence: number;
  matchedKeywords: string[];
} => {
  const lowerText = text.toLowerCase();
  const matched: Record<string, string[]> = { urgent: [], negative: [], positive: [] };

  // Check each category
  for (const [category, keywords] of Object.entries(SENTIMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        matched[category].push(keyword);
      }
    }
  }

  // Priority: urgent > negative > positive > neutral
  if (matched.urgent.length > 0) {
    const confidence = Math.min(100, 50 + matched.urgent.length * 15);
    return { sentiment: 'urgent', confidence, matchedKeywords: matched.urgent };
  }
  if (matched.negative.length > 0) {
    const confidence = Math.min(100, 40 + matched.negative.length * 12);
    return { sentiment: 'negative', confidence, matchedKeywords: matched.negative };
  }
  if (matched.positive.length > 0) {
    const confidence = Math.min(100, 40 + matched.positive.length * 12);
    return { sentiment: 'positive', confidence, matchedKeywords: matched.positive };
  }

  return { sentiment: 'neutral', confidence: 60, matchedKeywords: [] };
};

export const sentimentConfig: Record<string, { label: string; color: string; bgColor: string; emoji: string }> = {
  positive: { label: 'Positive', color: 'text-success', bgColor: 'bg-success/10 border-success/20', emoji: '😊' },
  neutral: { label: 'Neutral', color: 'text-muted-foreground', bgColor: 'bg-muted/50 border-muted-foreground/20', emoji: '😐' },
  negative: { label: 'Negative', color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20', emoji: '😟' },
  urgent: { label: 'Urgent', color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20', emoji: '🚨' },
};

export const useSentimentAnalysis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<SentimentLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (clientId?: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (clientId) params.client_id = clientId;
      const data = await api.get<SentimentLog[]>('/insights/sentiment', params);
      setLogs(data);
    } catch (error) {
      console.error('Error fetching sentiment logs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const analyzeClientComms = useCallback(async (clientId: string) => {
    if (!user) return;

    try {
      const result = await api.post<{ count: number }>(`/insights/sentiment/${clientId}/analyze`);
      await fetchLogs(clientId);
      toast({ title: 'Sentiment analyzed', description: `${result.count} entries processed for this client.` });
    } catch (err) {
      console.error('Error analyzing sentiment:', err);
      toast({ title: 'Error', description: 'Failed to analyze sentiment', variant: 'destructive' });
    }
  }, [user, fetchLogs, toast]);

  const getClientSentimentSummary = useCallback((clientId: string) => {
    const clientLogs = logs.filter(l => l.client_id === clientId);
    if (clientLogs.length === 0) return null;

    const counts = { positive: 0, neutral: 0, negative: 0, urgent: 0 };
    for (const log of clientLogs) {
      counts[log.sentiment]++;
    }

    // Dominant sentiment
    const dominant = (Object.entries(counts) as [string, number][])
      .sort((a, b) => b[1] - a[1])[0][0] as keyof typeof counts;

    return { counts, dominant, total: clientLogs.length };
  }, [logs]);

  return {
    logs,
    loading,
    fetchLogs,
    analyzeClientComms,
    getClientSentimentSummary,
  };
};
