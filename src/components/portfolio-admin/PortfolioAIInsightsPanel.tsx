import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, ArrowRightLeft, BarChart3, Brain, ChevronRight, DollarSign,
  Gauge, Loader2, PieChart, RefreshCw, Shield, Sparkles, Target, TrendingDown,
  TrendingUp, Zap, Activity, Eye,
} from 'lucide-react';

interface Insight {
  category: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'opportunity';
  affected_portfolios?: string[];
  recommended_action: string;
  estimated_impact?: string;
}

interface Summary {
  portfolios_needing_rebalance: number;
  risk_alerts_count: number;
  tax_opportunities_count: number;
  underperforming_count: number;
  overall_health_score: number;
  market_risk_level: string;
}

const CATEGORY_META: Record<string, { label: string; icon: typeof Brain; color: string }> = {
  drift_alert: { label: 'Drift Alert', icon: Target, color: 'text-amber-500' },
  risk_concentration: { label: 'Risk Concentration', icon: AlertTriangle, color: 'text-red-500' },
  tax_optimization: { label: 'Tax Optimization', icon: DollarSign, color: 'text-emerald-500' },
  performance_explanation: { label: 'Performance', icon: BarChart3, color: 'text-blue-500' },
  sector_risk: { label: 'Sector Risk', icon: PieChart, color: 'text-violet-500' },
  market_shock: { label: 'Market Shock', icon: Zap, color: 'text-orange-500' },
  underperformance: { label: 'Underperformance', icon: TrendingDown, color: 'text-red-500' },
  rebalance_timing: { label: 'Rebalance Timing', icon: ArrowRightLeft, color: 'text-cyan-500' },
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/30',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  opportunity: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
};

const MARKET_RISK_STYLES: Record<string, { color: string; bg: string }> = {
  low: { color: 'text-emerald-500', bg: 'bg-emerald-500' },
  moderate: { color: 'text-amber-500', bg: 'bg-amber-500' },
  elevated: { color: 'text-orange-500', bg: 'bg-orange-500' },
  high: { color: 'text-red-500', bg: 'bg-red-500' },
};

export const PortfolioAIInsightsPanel = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState('all');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('portfolio-ai', {
        body: { type: 'full_analysis' },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: 'AI Error', description: data.error, variant: 'destructive' });
        return;
      }

      setInsights(data?.insights || []);
      setSummary(data?.summary || null);
      toast({ title: 'AI Analysis Complete', description: `Generated ${data?.insights?.length || 0} insights` });
    } catch (err: any) {
      console.error('Portfolio AI error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to fetch AI insights', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredInsights = subTab === 'all'
    ? insights
    : insights.filter(i => i.category === subTab);

  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const warningCount = insights.filter(i => i.severity === 'warning').length;
  const opportunityCount = insights.filter(i => i.severity === 'opportunity').length;

  const healthColor = !summary ? 'text-muted-foreground' :
    summary.overall_health_score >= 80 ? 'text-emerald-500' :
    summary.overall_health_score >= 60 ? 'text-amber-500' : 'text-red-500';

  const riskMeta = MARKET_RISK_STYLES[summary?.market_risk_level || 'low'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> AI Portfolio Intelligence
          </h2>
          <p className="text-sm text-muted-foreground">AI-powered drift detection, risk analysis, and optimization suggestions</p>
        </div>
        <Button onClick={fetchInsights} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Analyzing...' : insights.length > 0 ? 'Refresh Analysis' : 'Run AI Analysis'}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                <Gauge className="h-3 w-3" /> Health Score
              </div>
              <p className={cn('text-2xl font-bold', healthColor)}>
                {summary.overall_health_score}<span className="text-sm font-normal">/100</span>
              </p>
              <Progress value={summary.overall_health_score} className="h-1 mt-1" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                <Shield className="h-3 w-3" /> Market Risk
              </div>
              <div className="flex items-center gap-2">
                <div className={cn('h-2.5 w-2.5 rounded-full', riskMeta.bg)} />
                <p className={cn('text-lg font-bold capitalize', riskMeta.color)}>
                  {summary.market_risk_level}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                <Target className="h-3 w-3" /> Need Rebalance
              </div>
              <p className="text-2xl font-bold text-amber-500">{summary.portfolios_needing_rebalance}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                <AlertTriangle className="h-3 w-3" /> Risk Alerts
              </div>
              <p className="text-2xl font-bold text-red-500">{summary.risk_alerts_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                <DollarSign className="h-3 w-3" /> Tax Opps
              </div>
              <p className="text-2xl font-bold text-emerald-500">{summary.tax_opportunities_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                <TrendingDown className="h-3 w-3" /> Underperforming
              </div>
              <p className="text-2xl font-bold text-orange-500">{summary.underperforming_count}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert badges summary */}
      {insights.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {criticalCount > 0 && (
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
              {criticalCount} Critical
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
              {warningCount} Warnings
            </Badge>
          )}
          {opportunityCount > 0 && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
              {opportunityCount} Opportunities
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{insights.length} insights generated</span>
        </div>
      )}

      {/* Insights List */}
      {insights.length > 0 ? (
        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="text-xs">All ({insights.length})</TabsTrigger>
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const count = insights.filter(i => i.category === key).length;
              if (count === 0) return null;
              const Icon = meta.icon;
              return (
                <TabsTrigger key={key} value={key} className="text-xs gap-1">
                  <Icon className={cn('h-3 w-3', meta.color)} /> {meta.label} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={subTab} className="mt-3 space-y-3">
            {filteredInsights.map((insight, idx) => {
              const meta = CATEGORY_META[insight.category] || CATEGORY_META.drift_alert;
              const Icon = meta.icon;
              const isExpanded = expandedIdx === idx;

              return (
                <Card key={idx} className={cn('transition-all cursor-pointer hover:shadow-sm', isExpanded && 'ring-1 ring-primary/30')}
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-0.5 p-1.5 rounded-md bg-muted/50')}>
                        <Icon className={cn('h-4 w-4', meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={SEVERITY_STYLES[insight.severity]}>
                            {insight.severity}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{meta.label}</Badge>
                          {insight.estimated_impact && (
                            <Badge variant="outline" className="text-xs bg-muted/50">{insight.estimated_impact}</Badge>
                          )}
                          <ChevronRight className={cn('h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
                        </div>
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{insight.description}</p>

                        {isExpanded && (
                          <div className="mt-3 space-y-2 border-t pt-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Action</p>
                              <p className="text-sm flex items-center gap-1.5">
                                <Zap className="h-3.5 w-3.5 text-primary" />
                                {insight.recommended_action}
                              </p>
                            </div>
                            {insight.affected_portfolios && insight.affected_portfolios.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Affected</p>
                                <div className="flex flex-wrap gap-1">
                                  {insight.affected_portfolios.map((p, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      ) : !loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground mb-1">No AI insights generated yet</p>
            <p className="text-xs text-muted-foreground mb-4">Run analysis to get drift alerts, risk warnings, tax optimizations, and more</p>
            <Button variant="outline" onClick={fetchInsights} className="gap-2">
              <Sparkles className="h-4 w-4" /> Run AI Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing portfolios, detecting risks, and generating insights...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
