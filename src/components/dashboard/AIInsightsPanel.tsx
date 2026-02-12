import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSilentClients } from '@/hooks/useSilentClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { churnRiskConfig, getChurnRiskLevel } from '@/hooks/useChurnPredictions';
import { sentimentConfig } from '@/hooks/useSentimentAnalysis';
import {
  Brain, ChevronDown, ChevronRight, AlertTriangle, UserX, TrendingUp,
  Frown, Lightbulb, User, Clock, Plus, RefreshCw, Sparkles
} from 'lucide-react';

// --- Types ---
interface ChurnClient {
  client_id: string;
  churn_risk_percentage: number;
  risk_level: string;
  risk_factors: string[];
  client_name: string;
}

interface EngagedClient {
  client_id: string;
  client_name: string;
  engagement_score: number;
  engagement_level: string;
  total_assets: number;
}

interface NegSentimentClient {
  client_id: string;
  client_name: string;
  negative_count: number;
  urgent_count: number;
  latest_text: string;
}

interface NextAction {
  client_id: string;
  client_name: string;
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

// --- Component ---
export const AIInsightsPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('churn');

  // Data states
  const [churnClients, setChurnClients] = useState<ChurnClient[]>([]);
  const [engagedClients, setEngagedClients] = useState<EngagedClient[]>([]);
  const [negSentiment, setNegSentiment] = useState<NegSentimentClient[]>([]);
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { silentClients, loading: silentLoading } = useSilentClients();

  const fetchAllData = async () => {
    if (!user) return;
    setRefreshing(true);

    try {
      const [churnRes, engagementRes, sentimentRes, clientsRes] = await Promise.all([
        supabase
          .from('churn_predictions')
          .select('client_id, churn_risk_percentage, risk_level, risk_factors')
          .gte('churn_risk_percentage', 40)
          .order('churn_risk_percentage', { ascending: false })
          .limit(8),
        supabase
          .from('client_engagement_scores')
          .select('client_id, engagement_score, engagement_level')
          .gte('engagement_score', 70)
          .order('engagement_score', { ascending: false })
          .limit(8),
        supabase
          .from('sentiment_logs' as any)
          .select('client_id, sentiment, source_text')
          .in('sentiment', ['negative', 'urgent'])
          .order('analyzed_at', { ascending: false }),
        supabase
          .from('clients')
          .select('id, client_name, total_assets')
          .eq('advisor_id', user.id),
      ]);

      const clients = clientsRes.data || [];
      const nameMap = new Map(clients.map((c: any) => [c.id, c.client_name]));
      const assetMap = new Map(clients.map((c: any) => [c.id, Number(c.total_assets) || 0]));

      const sentimentData: any[] = sentimentRes.data || [];
      // Churn
      setChurnClients((churnRes.data || []).map((d: any) => ({
        ...d,
        risk_factors: d.risk_factors || [],
        client_name: nameMap.get(d.client_id) || 'Unknown',
      })));

      // High engagement
      setEngagedClients((engagementRes.data || []).map((d: any) => ({
        ...d,
        client_name: nameMap.get(d.client_id) || 'Unknown',
        total_assets: assetMap.get(d.client_id) || 0,
      })));

      // Negative sentiment
      const sentMap = new Map<string, { negative: number; urgent: number; latestText: string }>();
      for (const entry of sentimentData) {
        const existing = sentMap.get(entry.client_id) || { negative: 0, urgent: 0, latestText: '' };
        if (entry.sentiment === 'negative') existing.negative++;
        if (entry.sentiment === 'urgent') existing.urgent++;
        if (!existing.latestText) existing.latestText = (entry.source_text as string) || '';
        sentMap.set(entry.client_id, existing);
      }
      setNegSentiment(
        [...sentMap.entries()]
          .map(([id, d]) => ({
            client_id: id,
            client_name: nameMap.get(id) || 'Unknown',
            negative_count: d.negative,
            urgent_count: d.urgent,
            latest_text: d.latestText,
          }))
          .sort((a, b) => (b.urgent_count + b.negative_count) - (a.urgent_count + a.negative_count))
          .slice(0, 8)
      );

      // Next best actions (derived from churn + silent + sentiment)
      const actions: NextAction[] = [];
      for (const c of (churnRes.data || []).slice(0, 3)) {
        actions.push({
          client_id: c.client_id,
          client_name: nameMap.get(c.client_id) || 'Unknown',
          action: 'Schedule retention call',
          reason: `Churn risk at ${c.churn_risk_percentage}%`,
          priority: c.churn_risk_percentage >= 70 ? 'high' : 'medium',
        });
      }
      for (const s of silentClients.slice(0, 2)) {
        if (!actions.some(a => a.client_id === s.clientId)) {
          actions.push({
            client_id: s.clientId,
            client_name: s.clientName,
            action: 'Send check-in message',
            reason: `${Math.max(s.daysSinceLastMeeting, s.daysSinceLastComm)}+ days silent`,
            priority: 'medium',
          });
        }
      }
      for (const ns of [...sentMap.entries()].slice(0, 2)) {
        if (!actions.some(a => a.client_id === ns[0])) {
          actions.push({
            client_id: ns[0],
            client_name: nameMap.get(ns[0]) || 'Unknown',
            action: 'Address concern proactively',
            reason: `${ns[1].urgent + ns[1].negative} negative signals`,
            priority: ns[1].urgent > 0 ? 'high' : 'medium',
          });
        }
      }
      setNextActions(actions);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && !silentLoading) {
      fetchAllData();
    }
  }, [user, silentLoading]);

  const totalAlerts = churnClients.length + silentClients.length + negSentiment.length;

  const priorityColors = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    low: 'bg-muted text-muted-foreground',
  };

  const tabCounts = {
    churn: churnClients.length,
    silent: silentClients.length,
    engaged: engagedClients.length,
    sentiment: negSentiment.length,
    actions: nextActions.length,
  };

  const ClientRow = ({ id, name, children }: { id: string; name: string; children: React.ReactNode }) => (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/clients/${id}`)}
    >
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <User className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {children}
      </div>
    </div>
  );

  if (loading && silentLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    AI Insights Panel
                    {totalAlerts > 0 && (
                      <Badge variant="destructive" className="text-xs h-5 px-1.5">
                        {totalAlerts}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Churn risk · Silent clients · Engagement · Sentiment · Actions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); fetchAllData(); }}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                </Button>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-secondary/50 p-0.5 h-9">
                <TabsTrigger value="churn" className="text-xs gap-1 flex-1 h-8">
                  <AlertTriangle className="h-3 w-3" />
                  Churn
                  {tabCounts.churn > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{tabCounts.churn}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="silent" className="text-xs gap-1 flex-1 h-8">
                  <UserX className="h-3 w-3" />
                  Silent
                  {tabCounts.silent > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{tabCounts.silent}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="engaged" className="text-xs gap-1 flex-1 h-8">
                  <TrendingUp className="h-3 w-3" />
                  Engaged
                  {tabCounts.engaged > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{tabCounts.engaged}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="sentiment" className="text-xs gap-1 flex-1 h-8">
                  <Frown className="h-3 w-3" />
                  Sentiment
                  {tabCounts.sentiment > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{tabCounts.sentiment}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-xs gap-1 flex-1 h-8">
                  <Lightbulb className="h-3 w-3" />
                  Actions
                  {tabCounts.actions > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{tabCounts.actions}</Badge>}
                </TabsTrigger>
              </TabsList>

              {/* Churn Risk */}
              <TabsContent value="churn" className="mt-3">
                {churnClients.length === 0 ? (
                  <EmptyState icon={AlertTriangle} message="No at-risk clients detected" sub="Run churn analysis from client profiles" />
                ) : (
                  <div className="space-y-2">
                    {churnClients.map(c => {
                      const level = getChurnRiskLevel(c.churn_risk_percentage);
                      const config = churnRiskConfig[level];
                      return (
                        <ClientRow key={c.client_id} id={c.client_id} name={c.client_name}>
                          <p className="text-xs text-muted-foreground truncate">
                            {(c.risk_factors as string[])?.[0] || 'At risk'}
                          </p>
                          <Badge variant="outline" className={cn('text-xs mt-1', config.bgColor, config.color)}>
                            {c.churn_risk_percentage}% risk
                          </Badge>
                        </ClientRow>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Silent Clients */}
              <TabsContent value="silent" className="mt-3">
                {silentClients.length === 0 ? (
                  <EmptyState icon={UserX} message="No silent clients" sub="All clients are actively engaged" />
                ) : (
                  <div className="space-y-2">
                    {silentClients.slice(0, 8).map(c => {
                      const maxDays = Math.max(c.daysSinceLastMeeting, c.daysSinceLastComm, c.daysSinceLastPortfolio);
                      return (
                        <ClientRow key={c.clientId} id={c.clientId} name={c.clientName}>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{maxDays}+ days silent</span>
                            {c.totalAssets > 0 && (
                              <span className="ml-1">• {formatCurrency(c.totalAssets, true)}</span>
                            )}
                          </div>
                        </ClientRow>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* High Engagement */}
              <TabsContent value="engaged" className="mt-3">
                {engagedClients.length === 0 ? (
                  <EmptyState icon={TrendingUp} message="No high engagement data yet" sub="Engagement scores build over time" />
                ) : (
                  <div className="space-y-2">
                    {engagedClients.map(c => (
                      <ClientRow key={c.client_id} id={c.client_id} name={c.client_name}>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                            Score: {c.engagement_score}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">{c.engagement_level}</span>
                          {c.total_assets > 0 && (
                            <span className="text-xs text-muted-foreground">• {formatCurrency(c.total_assets, true)}</span>
                          )}
                        </div>
                      </ClientRow>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Negative Sentiment */}
              <TabsContent value="sentiment" className="mt-3">
                {negSentiment.length === 0 ? (
                  <EmptyState icon={Frown} message="No negative sentiment detected" sub="Run sentiment analysis from client profiles" />
                ) : (
                  <div className="space-y-2">
                    {negSentiment.map(c => (
                      <ClientRow key={c.client_id} id={c.client_id} name={c.client_name}>
                        <p className="text-xs text-muted-foreground truncate">{c.latest_text.substring(0, 60)}...</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {c.urgent_count > 0 && (
                            <Badge variant="outline" className={cn('text-xs', sentimentConfig.urgent.bgColor, sentimentConfig.urgent.color)}>
                              {c.urgent_count} urgent
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn('text-xs', sentimentConfig.negative.bgColor, sentimentConfig.negative.color)}>
                            {c.negative_count} negative
                          </Badge>
                        </div>
                      </ClientRow>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Next Best Actions */}
              <TabsContent value="actions" className="mt-3">
                {nextActions.length === 0 ? (
                  <EmptyState icon={Lightbulb} message="No suggested actions" sub="Add more client data for AI recommendations" />
                ) : (
                  <div className="space-y-2">
                    {nextActions.map((a, i) => (
                      <div
                        key={`${a.client_id}-${i}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/clients/${a.client_id}`)}
                      >
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{a.client_name}</p>
                            <Badge variant="outline" className={cn('text-[10px] h-4', priorityColors[a.priority])}>
                              {a.priority}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium text-primary mt-0.5">{a.action}</p>
                          <p className="text-xs text-muted-foreground">{a.reason}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const EmptyState = ({ icon: Icon, message, sub }: { icon: any; message: string; sub: string }) => (
  <div className="text-center py-6">
    <Icon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
    <p className="text-sm text-muted-foreground">{message}</p>
    <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
  </div>
);
