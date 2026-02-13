import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Brain,
  RefreshCw,
  Users,
  TrendingUp,
  AlertTriangle,
  Target,
  Gift,
  PieChart,
  Zap,
  ChevronRight,
  Phone,
  Mail,
  ListTodo,
  Clock
} from 'lucide-react';

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

export const AIInsightsCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<GrowthEngineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('attention');

  useEffect(() => {
    if (user) fetchInsights();
  }, [user]);

  const fetchInsights = async (showToast = false) => {
    if (!user) return;

    try {
      if (showToast) setRefreshing(true);

      const result = await api.post<GrowthEngineData>('/insights/ai-growth-engine', { action: 'full_scan' });
      if (result) setData(result);

      if (showToast) {
        toast.success('AI insights refreshed');
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      if (showToast) toast.error('Failed to fetch insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleQuickAction = (type: string, id?: string) => {
    switch (type) {
      case 'call':
        toast.info('Opening dialer...');
        break;
      case 'task':
        navigate('/tasks');
        break;
      case 'email':
        navigate('/communications');
        break;
      case 'client':
        if (id) navigate(`/clients/${id}`);
        break;
      case 'leads':
        navigate('/leads');
        break;
    }
  };

  if (loading) {
    return (
      <Card className="glass col-span-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="glass col-span-full">
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Unable to load AI insights</p>
          <Button variant="outline" onClick={() => fetchInsights(true)} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const urgencyColors = {
    critical: 'bg-destructive text-destructive-foreground',
    high: 'bg-warning text-warning-foreground',
    medium: 'bg-primary/20 text-primary'
  };

  const leadColors = {
    hot: 'bg-destructive text-destructive-foreground',
    warm: 'bg-warning text-warning-foreground',
    cold: 'bg-muted text-muted-foreground'
  };

  return (
    <Card className="glass col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">AI Growth Engine</CardTitle>
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(data.generated_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-semibold">{data.clients_needing_attention.length}</p>
            <p className="text-xs text-muted-foreground">Need Attention</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
            <p className="text-xl font-semibold">{data.summary.at_risk_clients}</p>
            <p className="text-xs text-muted-foreground">At Risk</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <Target className="h-5 w-5 mx-auto text-success mb-1" />
            <p className="text-xl font-semibold">{data.summary.hot_leads}</p>
            <p className="text-xs text-muted-foreground">Hot Leads</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <Gift className="h-5 w-5 mx-auto text-chart-1 mb-1" />
            <p className="text-xl font-semibold">{data.dividend_opportunities.length}</p>
            <p className="text-xs text-muted-foreground">Dividends</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <PieChart className="h-5 w-5 mx-auto text-chart-2 mb-1" />
            <p className="text-xl font-semibold">{data.summary.rebalance_needed}</p>
            <p className="text-xs text-muted-foreground">Rebalance</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-chart-3 mb-1" />
            <p className="text-xl font-semibold">{formatCurrency(data.summary.total_opportunity_value, true)}</p>
            <p className="text-xs text-muted-foreground">Opportunity</p>
          </div>
        </div>

        {/* Smart Alerts Banner */}
        {data.smart_alerts.length > 0 && (
          <div className="mb-6 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-warning" />
              <span className="font-medium text-sm">Smart Alerts</span>
              <Badge variant="outline" className="text-xs">{data.smart_alerts.length}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.smart_alerts.slice(0, 3).map((alert, i) => (
                <Badge 
                  key={i} 
                  variant={alert.priority === 'high' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {alert.title}
                </Badge>
              ))}
              {data.smart_alerts.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{data.smart_alerts.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
            <TabsTrigger value="attention" className="text-xs">Attention</TabsTrigger>
            <TabsTrigger value="dividends" className="text-xs">Dividends</TabsTrigger>
            <TabsTrigger value="rebalance" className="text-xs">Rebalance</TabsTrigger>
            <TabsTrigger value="opportunities" className="text-xs">Opportunities</TabsTrigger>
            <TabsTrigger value="leads" className="text-xs">Leads</TabsTrigger>
            <TabsTrigger value="churn" className="text-xs">At Risk</TabsTrigger>
          </TabsList>

          {/* Clients Needing Attention */}
          <TabsContent value="attention" className="mt-0">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.clients_needing_attention.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">All clients are in good standing!</p>
              ) : (
                data.clients_needing_attention.map((client, i) => (
                  <div 
                    key={client.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer group"
                    onClick={() => handleQuickAction('client', client.id)}
                  >
                    <div className="text-sm font-medium text-muted-foreground w-6">#{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{client.client_name}</span>
                        <Badge className={cn('text-xs', urgencyColors[client.urgency as keyof typeof urgencyColors])}>
                          {client.urgency}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{client.reason}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleQuickAction('call'); }}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleQuickAction('email'); }}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleQuickAction('task'); }}
                      >
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
          <TabsContent value="dividends" className="mt-0">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.dividend_opportunities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending dividends</p>
              ) : (
                data.dividend_opportunities.map((div, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20 cursor-pointer hover:bg-success/10"
                    onClick={() => handleQuickAction('client', div.client_id)}
                  >
                    <Gift className="h-5 w-5 text-success" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{div.client_name}</span>
                        <Badge variant="outline" className="text-xs">{div.symbol}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(div.total_dividend)} dividend • {div.client_holding} shares
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="text-xs bg-success/20 text-success border-success/30">
                        {div.ai_suggestion}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Rebalance Suggestions */}
          <TabsContent value="rebalance" className="mt-0">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.rebalance_suggestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">All portfolios are balanced</p>
              ) : (
                data.rebalance_suggestions.map((rb, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-chart-2/5 border border-chart-2/20 cursor-pointer hover:bg-chart-2/10"
                    onClick={() => handleQuickAction('client', rb.client_id)}
                  >
                    <PieChart className="h-5 w-5 text-chart-2" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{rb.client_name}</span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", rb.priority === 'high' ? 'border-destructive text-destructive' : '')}
                        >
                          {rb.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rb.ai_recommendation}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Investment Opportunities */}
          <TabsContent value="opportunities" className="mt-0">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.investment_opportunities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No opportunities identified</p>
              ) : (
                data.investment_opportunities.map((opp, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                      opp.type === 'market' ? 'bg-primary/5 border border-primary/20 hover:bg-primary/10' : 'bg-chart-3/5 border border-chart-3/20 hover:bg-chart-3/10'
                    )}
                  >
                    <TrendingUp className={cn("h-5 w-5", opp.type === 'market' ? 'text-primary' : 'text-chart-3')} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{opp.title}</span>
                        <Badge variant="outline" className="text-xs">{opp.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{opp.description}</p>
                    </div>
                    {opp.potential_value && (
                      <span className="text-sm font-medium text-success">
                        {formatCurrency(opp.potential_value, true)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Lead Scores */}
          <TabsContent value="leads" className="mt-0">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.lead_scores.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No active leads</p>
              ) : (
                data.lead_scores.slice(0, 10).map((lead, i) => (
                  <div 
                    key={lead.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer"
                    onClick={() => handleQuickAction('leads')}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold">{lead.score}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{lead.name}</span>
                        <Badge className={cn('text-xs', leadColors[lead.label])}>
                          {lead.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{lead.next_action}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Churn Risks */}
          <TabsContent value="churn" className="mt-0">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.churn_risks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No churn risks detected</p>
              ) : (
                data.churn_risks.map((risk, i) => (
                  <div 
                    key={risk.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20 cursor-pointer hover:bg-destructive/10"
                    onClick={() => handleQuickAction('client', risk.id)}
                  >
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{risk.client_name}</span>
                        <Badge variant="destructive" className="text-xs">
                          {risk.risk_score}% risk
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{risk.signals.join(' • ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{formatCurrency(risk.total_assets, true)}</p>
                      <Badge variant="outline" className="text-xs mt-1">{risk.retention_action}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
