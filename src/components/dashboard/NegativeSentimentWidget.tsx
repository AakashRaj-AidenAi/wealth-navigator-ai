import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Frown, ChevronRight, User } from 'lucide-react';
import { sentimentConfig } from '@/hooks/useSentimentAnalysis';

interface NegativeSentimentClient {
  client_id: string;
  client_name: string;
  negative_count: number;
  urgent_count: number;
  latest_text: string;
}

export const NegativeSentimentWidget = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<NegativeSentimentClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Get all negative/urgent sentiment logs
      const { data: sentimentData } = await supabase
        .from('sentiment_logs')
        .select('client_id, sentiment, source_text')
        .in('sentiment', ['negative', 'urgent'])
        .order('analyzed_at', { ascending: false });

      if (!sentimentData || sentimentData.length === 0) {
        setLoading(false);
        return;
      }

      // Group by client
      const clientMap = new Map<string, { negative: number; urgent: number; latestText: string }>();
      for (const entry of sentimentData) {
        const existing = clientMap.get(entry.client_id) || { negative: 0, urgent: 0, latestText: '' };
        if (entry.sentiment === 'negative') existing.negative++;
        if (entry.sentiment === 'urgent') existing.urgent++;
        if (!existing.latestText) existing.latestText = (entry.source_text as string) || '';
        clientMap.set(entry.client_id, existing);
      }

      // Fetch client names
      const clientIds = [...clientMap.keys()];
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, client_name')
        .in('id', clientIds);

      const nameMap = new Map((clientsData ?? []).map(c => [c.id, c.client_name]));

      const results: NegativeSentimentClient[] = clientIds
        .map(id => {
          const d = clientMap.get(id)!;
          return {
            client_id: id,
            client_name: nameMap.get(id) || 'Unknown',
            negative_count: d.negative,
            urgent_count: d.urgent,
            latest_text: d.latestText,
          };
        })
        .sort((a, b) => (b.urgent_count + b.negative_count) - (a.urgent_count + a.negative_count))
        .slice(0, 5);

      setClients(results);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Frown className="h-4 w-4 text-destructive" />
            Negative Sentiment
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs"
            onClick={() => navigate('/clients')}
          >
            View All <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <Frown className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No negative sentiment detected</p>
            <p className="text-xs mt-1">Run sentiment analysis from client profiles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map(c => (
              <div
                key={c.client_id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/clients/${c.client_id}`)}
              >
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.latest_text.substring(0, 60)}...
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.urgent_count > 0 && (
                    <Badge variant="outline" className={cn('text-xs', sentimentConfig.urgent.bgColor, sentimentConfig.urgent.color)}>
                      {c.urgent_count} 🚨
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn('text-xs', sentimentConfig.negative.bgColor, sentimentConfig.negative.color)}>
                    {c.negative_count} 😟
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
