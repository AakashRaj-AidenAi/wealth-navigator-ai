import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyShort } from '@/lib/currency';
import { differenceInDays } from 'date-fns';
import { 
  TrendingUp, Target, Clock, DollarSign, 
  Users, CheckCircle, XCircle, BarChart3 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Sector, FunnelChart, Funnel, LabelList
} from 'recharts';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadStage = Database['public']['Enums']['lead_stage'];

interface PipelineAnalyticsProps {
  leads: Lead[];
}

const stageOrder: LeadStage[] = ['new', 'contacted', 'meeting', 'proposal', 'closed_won'];
const stageLabels: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  meeting: 'Meeting',
  proposal: 'Proposal',
  closed_won: 'Won',
  lost: 'Lost'
};

const stageColors: Record<LeadStage, string> = {
  new: 'hsl(210, 80%, 55%)',
  contacted: 'hsl(185, 80%, 45%)',
  meeting: 'hsl(40, 90%, 55%)',
  proposal: 'hsl(270, 70%, 55%)',
  closed_won: 'hsl(140, 70%, 45%)',
  lost: 'hsl(0, 70%, 55%)'
};

export const PipelineAnalytics = ({ leads }: PipelineAnalyticsProps) => {
  const analytics = useMemo(() => {
    const activeLeads = leads.filter(l => l.stage !== 'lost');
    const closedWon = leads.filter(l => l.stage === 'closed_won');
    const closedLost = leads.filter(l => l.stage === 'lost');
    const openLeads = leads.filter(l => !['closed_won', 'lost'].includes(l.stage));

    // Pipeline value calculations
    const totalPipeline = openLeads.reduce((sum, l) => sum + (l.expected_value || 0), 0);
    const weightedPipeline = openLeads.reduce((sum, l) => 
      sum + ((l.expected_value || 0) * (l.probability || 0) / 100), 0
    );
    const closedWonValue = closedWon.reduce((sum, l) => sum + (l.expected_value || 0), 0);
    const lostValue = closedLost.reduce((sum, l) => sum + (l.expected_value || 0), 0);

    // Conversion rates
    const totalClosed = closedWon.length + closedLost.length;
    const conversionRate = totalClosed > 0 ? (closedWon.length / totalClosed) * 100 : 0;
    const winRate = leads.length > 0 ? (closedWon.length / leads.length) * 100 : 0;

    // Average deal size
    const avgDealSize = closedWon.length > 0 ? closedWonValue / closedWon.length : 0;
    const avgPipelineDeal = openLeads.length > 0 ? totalPipeline / openLeads.length : 0;

    // Sales cycle time (for closed won leads)
    const cycleTimesWon = closedWon
      .filter(l => l.converted_at)
      .map(l => differenceInDays(new Date(l.converted_at!), new Date(l.created_at)));
    const avgSalesCycle = cycleTimesWon.length > 0 
      ? Math.round(cycleTimesWon.reduce((a, b) => a + b, 0) / cycleTimesWon.length)
      : 0;

    // Stage distribution
    const stageData = stageOrder.map(stage => {
      const stageLeads = leads.filter(l => l.stage === stage);
      return {
        stage,
        label: stageLabels[stage],
        count: stageLeads.length,
        value: stageLeads.reduce((sum, l) => sum + (l.expected_value || 0), 0),
        weightedValue: stageLeads.reduce((sum, l) => 
          sum + ((l.expected_value || 0) * (l.probability || 0) / 100), 0
        ),
        color: stageColors[stage]
      };
    });

    // Source breakdown
    const sourceMap = new Map<string, { count: number; value: number; won: number }>();
    leads.forEach(lead => {
      const source = lead.source || 'other';
      const current = sourceMap.get(source) || { count: 0, value: 0, won: 0 };
      sourceMap.set(source, {
        count: current.count + 1,
        value: current.value + (lead.expected_value || 0),
        won: current.won + (lead.stage === 'closed_won' ? 1 : 0)
      });
    });
    const sourceData = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source: source.replace('_', ' ').charAt(0).toUpperCase() + source.replace('_', ' ').slice(1),
      ...data,
      conversionRate: data.count > 0 ? ((data.won / data.count) * 100).toFixed(0) : '0'
    })).sort((a, b) => b.value - a.value);

    // Loss reasons (for analytics)
    const lossReasonMap = new Map<string, number>();
    closedLost.forEach(lead => {
      const reason = lead.loss_reason || 'Not specified';
      lossReasonMap.set(reason, (lossReasonMap.get(reason) || 0) + 1);
    });
    const lossReasonData = Array.from(lossReasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // Funnel data
    const funnelData = stageOrder.slice(0, -1).map(stage => ({
      name: stageLabels[stage],
      value: leads.filter(l => l.stage === stage || 
        stageOrder.indexOf(l.stage) > stageOrder.indexOf(stage)).length,
      fill: stageColors[stage]
    }));

    return {
      totalLeads: leads.length,
      openLeads: openLeads.length,
      closedWon: closedWon.length,
      closedLost: closedLost.length,
      totalPipeline,
      weightedPipeline,
      closedWonValue,
      lostValue,
      conversionRate,
      winRate,
      avgDealSize,
      avgPipelineDeal,
      avgSalesCycle,
      stageData,
      sourceData,
      lossReasonData,
      funnelData
    };
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Open Leads</p>
                <p className="text-2xl font-bold">{analytics.openLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Sales Cycle</p>
                <p className="text-2xl font-bold">{analytics.avgSalesCycle} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-2/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                <p className="text-2xl font-bold">{formatCurrencyShort(analytics.avgDealSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Value & Win/Loss */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <span className="text-sm text-muted-foreground">Total Pipeline</span>
              <span className="text-lg font-bold">{formatCurrencyShort(analytics.totalPipeline)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
              <span className="text-sm text-muted-foreground">Weighted Pipeline</span>
              <span className="text-lg font-bold text-primary">{formatCurrencyShort(analytics.weightedPipeline)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
              <span className="text-sm text-muted-foreground">Closed Won</span>
              <span className="text-lg font-bold text-success">{formatCurrencyShort(analytics.closedWonValue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Win/Loss Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-success/10 text-center">
                <CheckCircle className="h-6 w-6 text-success mx-auto mb-1" />
                <p className="text-2xl font-bold text-success">{analytics.closedWon}</p>
                <p className="text-xs text-muted-foreground">Won</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 text-center">
                <XCircle className="h-6 w-6 text-destructive mx-auto mb-1" />
                <p className="text-2xl font-bold text-destructive">{analytics.closedLost}</p>
                <p className="text-xs text-muted-foreground">Lost</p>
              </div>
            </div>
            {analytics.lossReasonData.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Top Loss Reasons</p>
                {analytics.lossReasonData.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <span className="capitalize">{item.reason.replace('_', ' ')}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stage Distribution Chart */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.stageData} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => formatCurrencyShort(v)} />
                <YAxis type="category" dataKey="label" width={80} />
                <Tooltip 
                  formatter={(value: number) => formatCurrencyShort(value)}
                  labelFormatter={(label) => `${label} Stage`}
                />
                <Bar 
                  dataKey="weightedValue" 
                  name="Weighted Value"
                  radius={[0, 4, 4, 0]}
                >
                  {analytics.stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stage Summary */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            {analytics.stageData.filter(s => s.stage !== 'closed_won').map((stage) => (
              <div key={stage.stage} className="text-center p-2 rounded-lg bg-secondary/20">
                <p className="text-xs text-muted-foreground">{stage.label}</p>
                <p className="font-bold">{stage.count}</p>
                <p className="text-xs text-muted-foreground">{formatCurrencyShort(stage.weightedValue)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Source Performance */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lead Source Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.sourceData.slice(0, 6).map((source, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{source.source}</span>
                  <span className="text-xs text-muted-foreground">{source.count} leads</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{formatCurrencyShort(source.value)}</span>
                  <span className="text-xs text-success">{source.conversionRate}% conv</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
