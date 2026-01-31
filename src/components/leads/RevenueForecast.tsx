import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyShort } from '@/lib/currency';
import { TrendingUp, Calendar, Target, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadStage = Database['public']['Enums']['lead_stage'];

interface RevenueForecastProps {
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
  contacted: 'hsl(270, 80%, 55%)',
  meeting: 'hsl(40, 90%, 55%)',
  proposal: 'hsl(25, 90%, 55%)',
  closed_won: 'hsl(140, 70%, 45%)',
  lost: 'hsl(0, 70%, 55%)'
};

export const RevenueForecast = ({ leads }: RevenueForecastProps) => {
  // Calculate weighted pipeline by stage
  const pipelineByStage = stageOrder.map(stage => {
    const stageLeads = leads.filter(l => l.stage === stage);
    const totalValue = stageLeads.reduce((sum, l) => sum + (l.expected_value || 0), 0);
    const weightedValue = stageLeads.reduce((sum, l) => 
      sum + ((l.expected_value || 0) * (l.probability || 0) / 100), 0
    );
    
    return {
      stage,
      label: stageLabels[stage],
      totalValue,
      weightedValue,
      count: stageLeads.length,
      color: stageColors[stage]
    };
  });

  // Calculate forecast metrics
  const totalPipeline = leads
    .filter(l => l.stage !== 'lost' && l.stage !== 'closed_won')
    .reduce((sum, l) => sum + (l.expected_value || 0), 0);

  const weightedPipeline = leads
    .filter(l => l.stage !== 'lost' && l.stage !== 'closed_won')
    .reduce((sum, l) => sum + ((l.expected_value || 0) * (l.probability || 0) / 100), 0);

  const closedWonValue = leads
    .filter(l => l.stage === 'closed_won')
    .reduce((sum, l) => sum + (l.expected_value || 0), 0);

  // Monthly projection (assuming 30-day sales cycle)
  const avgConversionRate = leads.length > 0 
    ? leads.filter(l => l.stage === 'closed_won').length / leads.length 
    : 0.2;
  const monthlyForecast = totalPipeline * avgConversionRate;

  // Quarterly projection
  const quarterlyForecast = monthlyForecast * 3;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Forecast Metrics */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Revenue Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-xs text-muted-foreground">Total Pipeline</p>
              <p className="text-lg font-bold">{formatCurrencyShort(totalPipeline)}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground">Weighted</p>
              <p className="text-lg font-bold text-primary">{formatCurrencyShort(weightedPipeline)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-secondary/20">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">30-Day Forecast</span>
              </div>
              <span className="font-medium">{formatCurrencyShort(monthlyForecast)}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-secondary/20">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">90-Day Forecast</span>
              </div>
              <span className="font-medium">{formatCurrencyShort(quarterlyForecast)}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-success/10">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="text-sm">Closed Won</span>
              </div>
              <span className="font-medium text-success">{formatCurrencyShort(closedWonValue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline by Stage Chart */}
      <Card className="glass lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByStage} layout="vertical">
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
                  {pipelineByStage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stage Summary */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            {pipelineByStage.filter(s => s.stage !== 'closed_won').map((stage) => (
              <div key={stage.stage} className="text-center p-2 rounded bg-secondary/20">
                <p className="text-xs text-muted-foreground">{stage.label}</p>
                <p className="font-bold text-sm">{stage.count}</p>
                <p className="text-xs text-muted-foreground">{formatCurrencyShort(stage.weightedValue)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
