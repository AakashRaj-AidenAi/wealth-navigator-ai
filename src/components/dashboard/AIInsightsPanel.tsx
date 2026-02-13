import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSilentClients } from '@/hooks/useSilentClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { churnRiskConfig, getChurnRiskLevel } from '@/hooks/useChurnPredictions';
import { sentimentConfig } from '@/hooks/useSentimentAnalysis';
import { toast } from 'sonner';
import {
  Brain, ChevronDown, ChevronRight, AlertTriangle, UserX, TrendingUp,
  Frown, Lightbulb, User, Clock, RefreshCw, Sparkles, Users, Target,
  Gift, PieChart, Zap, Phone, Mail, ListTodo
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

interface GrowthEngineData {
  clients_needing_attention: any[];
  dividend_opportunities: any[];
  rebalance_suggestions: any[];
  investment_opportunities: any[];
  lead_scores: any[];
  churn_risks: any[];
  smart_alerts: any[];
  summary: {
    total_clients: number;
    at_risk_clients: number;
    hot_leads: number;
    pending_dividends: number;
    rebalance_needed: number;
    total_opportunity_value: number;
  };
  generated_at: string;
}

// --- Component ---
export const AIInsightsPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('attention');

  // Local data states
  const [churnClients, setChurnClients] = useState<ChurnClient[]>([]);
  const [engagedClients, setEngagedClients] = useState<EngagedClient[]>([]);
  const [negSentiment, setNegSentiment] = useState<NegSentimentClient[]>([]);
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { silentClients, loading: silentLoading } = useSilentClients();

  // Growth engine data
  const [engineData, setEngineData] = useState<GrowthEngineData | null>(null);
  const [engineLoading, setEngineLoading] = useState(true);

  const fetchGrowthEngine = async () => {
    if (!user) return;
    try {
      const result = await api.post<GrowthEngineData>('/insights/ai-growth-engine', { action: 'full_scan' });
      setEngineData(result);
    } catch (error: any) {
      if (error?.status === 429) toast.error('AI rate limit reached.');
      else if (error?.status === 402) toast.error('AI usage limit reached.');
      else console.error('Growth engine error:', error);
    } finally {
      setEngineLoading(false);
    }
  };

  const fetchLocalData = async () => {
    if (!user) return;

    try {
      const [churnRes, engagementRes, sentimentRes, clientsRes] = await Promise.all([
        api.get<any>('/churn_predictions', { churn_risk_percentage_gte: '40', _sort: 'churn_risk_percentage', _order: 'desc', _limit: '8' }),
        api.get<any>('/client_engagement_scores', { engagement_score_gte: '70', _sort: 'engagement_score', _order: 'desc', _limit: '8' }),
        api.get<any>('/sentiment_logs', { sentiment_in: 'negative,urgent', _sort: 'analyzed_at', _order: 'desc' }),
        api.get<any>('/clients', { advisor_id: user.id }),
      ]);

      const churnData = extractItems<any>(churnRes);
      const engagementData = extractItems<any>(engagementRes);
      const sentimentData = extractItems<any>(sentimentRes);
      const clients = extractItems<any>(clientsRes);

      const nameMap = new Map(clients.map((c: any) => [c.id, c.client_name]));
      const assetMap = new Map(clients.map((c: any) => [c.id, Number(c.total_assets) || 0]));

      setChurnClients((churnData || []).map((d: any) => ({
        ...d,
        risk_factors: d.risk_factors || [],
        client_name: nameMap.get(d.client_id) || 'Unknown',
      })));

      setEngagedClients((engagementData || []).map((d: any) => ({
        ...d,
        client_name: nameMap.get(d.client_id) || 'Unknown',
        total_assets: assetMap.get(d.client_id) || 0,
      })));

      const sentMap = new Map<string, { negative: number; urgent: number; latestText: string }>();
      for (const entry of (sentimentData || [])) {
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

      const actions: NextAction[] = [];
      for (const c of (churnData || []).slice(0, 3)) {
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
      console.error('Error fetching local insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    setRefreshing(true);
    await Promise.all([fetchLocalData(), fetchGrowthEngine()]);
    setRefreshing(false);
    toast.success('AI insights refreshed');
  };

  useEffect(() => {
    if (user && !silentLoading) {
      fetchLocalData();
      fetchGrowthEngine();
    }
  }, [user, silentLoading]);

  const totalAlerts = churnClients.length + silentClients.length + negSentiment.length + (engineData?.smart_alerts?.length || 0);

  const urgencyColors: Record<string, string> = {
    critical: 'bg-destructive text-destructive-foreground',
    high: 'bg-warning text-warning-foreground',
    medium: 'bg-primary/20 text-primary',
  };

  const leadColors: Record<string, string> = {
    hot: 'bg-destructive text-destructive-foreground',
    warm: 'bg-warning text-warning-foreground',
    cold: 'bg-muted text-muted-foreground',
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    low: 'bg-muted text-muted-foreground',
  };

  const handleQuickAction = (type: string, id?: string) => {
    switch (type) {
      case 'call': toast.info('Opening dialer...'); break;
      case 'task': navigate('/tasks'); break;
      case 'email': navigate('/communications'); break;
      case 'client': if (id) navigate(`/clients/${id}`); break;
      case 'leads': navigate('/leads'); break;
    }
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

  const isLoading = loading && silentLoading && engineLoading;

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
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
                  <Brain className="h-4 w-4 text-primary" />
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
                    Growth engine · Churn · Silent · Engagement · Sentiment · Actions
                    {engineData && (
                      <span className="ml-2 opacity-60">
                        Updated {new Date(engineData.generated_at).toLocaleTimeString()}
                      </span>
                    )}
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
          <CardContent className="pt-0 space-y-4">
            {/* Summary Stats */}
            {engineData && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <StatBox icon={Users} color="text-primary" value={engineData.clients_needing_attention.length} label="Need Attention" />
                <StatBox icon={AlertTriangle} color="text-destructive" value={engineData.summary.at_risk_clients} label="At Risk" />
                <StatBox icon={Target} color="text-success" value={engineData.summary.hot_leads} label="Hot Leads" />
                <StatBox icon={Gift} color="text-chart-1" value={engineData.dividend_opportunities.length} label="Dividends" />
                <StatBox icon={PieChart} color="text-chart-2" value={engineData.summary.rebalance_needed} label="Rebalance" />
                <StatBox icon={TrendingUp} color="text-chart-3" value={formatCurrency(engineData.summary.total_opportunity_value, true)} label="Opportunity" />
              </div>
            )}

            {/* Smart Alerts */}
            {engineData && engineData.smart_alerts.length > 0 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="font-medium text-sm">Smart Alerts</span>
                  <Badge variant="outline" className="text-xs">{engineData.smart_alerts.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {engineData.smart_alerts.slice(0, 4).map((alert: any, i: number) => (
                    <Badge key={i} variant={alert.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                      {alert.title}
                    </Badge>
                  ))}
                  {engineData.smart_alerts.length > 4 && (
                    <Badge variant="outline" className="text-xs">+{engineData.smart_alerts.length - 4} more</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-secondary/50 p-0.5 h-auto flex-wrap gap-0.5">
                {/* Growth Engine tabs */}
                <TabsTrigger value="attention" className="text-xs gap-1 h-7">
                  <Users className="h-3 w-3" />
                  Attention
                </TabsTrigger>
                <TabsTrigger value="dividends" className="text-xs gap-1 h-7">
                  <Gift className="h-3 w-3" />
                  Dividends
                </TabsTrigger>
                <TabsTrigger value="rebalance" className="text-xs gap-1 h-7">
                  <PieChart className="h-3 w-3" />
                  Rebalance
                </TabsTrigger>
                <TabsTrigger value="opportunities" className="text-xs gap-1 h-7">
                  <TrendingUp className="h-3 w-3" />
                  Opportunities
                </TabsTrigger>
                <TabsTrigger value="leads" className="text-xs gap-1 h-7">
                  <Target className="h-3 w-3" />
                  Leads
                </TabsTrigger>
                {/* Local data tabs */}
                <TabsTrigger value="churn" className="text-xs gap-1 h-7">
                  <AlertTriangle className="h-3 w-3" />
                  Churn
                  {churnClients.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{churnClients.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="silent" className="text-xs gap-1 h-7">
                  <UserX className="h-3 w-3" />
                  Silent
                  {silentClients.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{silentClients.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="engaged" className="text-xs gap-1 h-7">
                  <TrendingUp className="h-3 w-3" />
                  Engaged
                  {engagedClients.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{engagedClients.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="sentiment" className="text-xs gap-1 h-7">
                  <Frown className="h-3 w-3" />
                  Sentiment
                  {negSentiment.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{negSentiment.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-xs gap-1 h-7">
                  <Lightbulb className="h-3 w-3" />
                  Actions
                  {nextActions.length > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{nextActions.length}</Badge>}
                </TabsTrigger>
              </TabsList>

              {/* === GROWTH ENGINE TABS === */}

              {/* Clients Needing Attention */}
              <TabsContent value="attention" className="mt-3">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {!engineData || engineData.clients_needing_attention.length === 0 ? (
                    <EmptyState icon={Users} message="All clients are in good standing!" sub="No immediate attention needed" />
                  ) : (
                    engineData.clients_needing_attention.map((client: any, i: number) => (
                      <div
                        key={client.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer group"
                        onClick={() => handleQuickAction('client', client.id)}
                      >
                        <div className="text-sm font-medium text-muted-foreground w-6">#{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{client.client_name}</span>
                            <Badge className={cn('text-xs', urgencyColors[client.urgency] || '')}>
                              {client.urgency}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{client.reason}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleQuickAction('call'); }}>
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleQuickAction('email'); }}>
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleQuickAction('task'); }}>
                            <ListTodo className="h-3.5 w-3.5" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Dividend Opportunities */}
              <TabsContent value="dividends" className="mt-3">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {!engineData || engineData.dividend_opportunities.length === 0 ? (
                    <EmptyState icon={Gift} message="No pending dividends" sub="Dividend opportunities will appear here" />
                  ) : (
                    engineData.dividend_opportunities.map((div: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20 cursor-pointer hover:bg-success/10"
                        onClick={() => handleQuickAction('client', div.client_id)}
                      >
                        <Gift className="h-5 w-5 text-success shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{div.client_name}</span>
                            <Badge variant="outline" className="text-xs">{div.symbol}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(div.total_dividend)} dividend • {div.client_holding} shares
                          </p>
                        </div>
                        <Badge className="text-xs bg-success/20 text-success border-success/30 shrink-0">{div.ai_suggestion}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Rebalance Suggestions */}
              <TabsContent value="rebalance" className="mt-3">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {!engineData || engineData.rebalance_suggestions.length === 0 ? (
                    <EmptyState icon={PieChart} message="All portfolios are balanced" sub="Rebalance suggestions will appear here" />
                  ) : (
                    engineData.rebalance_suggestions.map((rb: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg bg-chart-2/5 border border-chart-2/20 cursor-pointer hover:bg-chart-2/10"
                        onClick={() => handleQuickAction('client', rb.client_id)}
                      >
                        <PieChart className="h-5 w-5 text-chart-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{rb.client_name}</span>
                            <Badge variant="outline" className={cn("text-xs", rb.priority === 'high' ? 'border-destructive text-destructive' : '')}>{rb.priority}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{rb.ai_recommendation}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Investment Opportunities */}
              <TabsContent value="opportunities" className="mt-3">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {!engineData || engineData.investment_opportunities.length === 0 ? (
                    <EmptyState icon={TrendingUp} message="No opportunities identified" sub="Market and client-specific opportunities will appear here" />
                  ) : (
                    engineData.investment_opportunities.map((opp: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                          opp.type === 'market' ? 'bg-primary/5 border border-primary/20 hover:bg-primary/10' : 'bg-chart-3/5 border border-chart-3/20 hover:bg-chart-3/10'
                        )}
                      >
                        <TrendingUp className={cn("h-5 w-5 shrink-0", opp.type === 'market' ? 'text-primary' : 'text-chart-3')} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{opp.title}</span>
                            <Badge variant="outline" className="text-xs">{opp.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{opp.description}</p>
                        </div>
                        {opp.potential_value && (
                          <span className="text-sm font-medium text-success shrink-0">{formatCurrency(opp.potential_value, true)}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Lead Scores */}
              <TabsContent value="leads" className="mt-3">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {!engineData || engineData.lead_scores.length === 0 ? (
                    <EmptyState icon={Target} message="No active leads" sub="Lead scores will appear when leads are added" />
                  ) : (
                    engineData.lead_scores.slice(0, 10).map((lead: any) => (
                      <div
                        key={lead.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer"
                        onClick={() => handleQuickAction('leads')}
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold">{lead.score}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{lead.name}</span>
                            <Badge className={cn('text-xs', leadColors[lead.label] || '')}>{lead.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{lead.next_action}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* === LOCAL DATA TABS === */}

              {/* Churn Risk */}
              <TabsContent value="churn" className="mt-3">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {churnClients.length === 0 ? (
                    <EmptyState icon={AlertTriangle} message="No at-risk clients detected" sub="Run churn analysis from client profiles" />
                  ) : (
                    churnClients.map(c => {
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
                    })
                  )}
                </div>
              </TabsContent>

              {/* Silent Clients */}
              <TabsContent value="silent" className="mt-3">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {silentClients.length === 0 ? (
                    <EmptyState icon={UserX} message="No silent clients" sub="All clients are actively engaged" />
                  ) : (
                    silentClients.slice(0, 8).map(c => {
                      const maxDays = Math.max(c.daysSinceLastMeeting, c.daysSinceLastComm, c.daysSinceLastPortfolio);
                      return (
                        <ClientRow key={c.clientId} id={c.clientId} name={c.clientName}>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{maxDays}+ days silent</span>
                            {c.totalAssets > 0 && <span className="ml-1">• {formatCurrency(c.totalAssets, true)}</span>}
                          </div>
                        </ClientRow>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              {/* High Engagement */}
              <TabsContent value="engaged" className="mt-3">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {engagedClients.length === 0 ? (
                    <EmptyState icon={TrendingUp} message="No high engagement data yet" sub="Engagement scores build over time" />
                  ) : (
                    engagedClients.map(c => (
                      <ClientRow key={c.client_id} id={c.client_id} name={c.client_name}>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                            Score: {c.engagement_score}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">{c.engagement_level}</span>
                          {c.total_assets > 0 && <span className="text-xs text-muted-foreground">• {formatCurrency(c.total_assets, true)}</span>}
                        </div>
                      </ClientRow>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Negative Sentiment */}
              <TabsContent value="sentiment" className="mt-3">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {negSentiment.length === 0 ? (
                    <EmptyState icon={Frown} message="No negative sentiment detected" sub="Run sentiment analysis from client profiles" />
                  ) : (
                    negSentiment.map(c => (
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
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Next Best Actions */}
              <TabsContent value="actions" className="mt-3">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {nextActions.length === 0 ? (
                    <EmptyState icon={Lightbulb} message="No suggested actions" sub="Add more client data for AI recommendations" />
                  ) : (
                    nextActions.map((a, i) => (
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
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const StatBox = ({ icon: Icon, color, value, label }: { icon: any; color: string; value: string | number; label: string }) => (
  <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
    <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
    <p className="text-lg font-semibold leading-tight">{value}</p>
    <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
  </div>
);

const EmptyState = ({ icon: Icon, message, sub }: { icon: any; message: string; sub: string }) => (
  <div className="text-center py-6">
    <Icon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
    <p className="text-sm text-muted-foreground">{message}</p>
    <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
  </div>
);
