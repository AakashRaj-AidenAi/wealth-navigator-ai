import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  Brain, Sparkles, RefreshCw, AlertTriangle, TrendingDown, TrendingUp,
  IndianRupee, Target, Shield, Activity, BarChart3, Users, Eye,
  ArrowDownRight, ArrowUpRight, Calendar, Flame, Snowflake, Zap,
} from 'lucide-react';
import { format } from 'date-fns';

interface FundingAIDashboardProps {
  aiInsights: any;
  aiLoading: boolean;
  onFetchAI: () => void;
}

const severityColor = (s: string) => {
  if (s === 'critical') return 'border-destructive/50 bg-destructive/5';
  if (s === 'high') return 'border-amber-500/50 bg-amber-500/5';
  return 'border-muted';
};

const patternLabel: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  exit_risk: { label: 'Exit Risk', color: 'text-destructive border-destructive', icon: AlertTriangle },
  frequent_withdrawer: { label: 'Frequent Withdrawer', color: 'text-amber-500 border-amber-500', icon: Flame },
  early_redeemer: { label: 'Early Redeemer', color: 'text-orange-500 border-orange-500', icon: Zap },
  stable: { label: 'Stable', color: 'text-emerald-500 border-emerald-500', icon: Shield },
  growing: { label: 'Growing', color: 'text-blue-500 border-blue-500', icon: TrendingUp },
};

export const FundingAIDashboard = ({ aiInsights, aiLoading, onFetchAI }: FundingAIDashboardProps) => {
  const [aiSubTab, setAiSubTab] = useState('overview');

  if (aiLoading) {
    return (
      <Card><CardContent className="py-16 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
        <p className="text-muted-foreground">Running AI analysis on funding & payout operations...</p>
      </CardContent></Card>
    );
  }

  if (!aiInsights) {
    return (
      <Card><CardContent className="py-16 text-center">
        <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">Analyze funding operations, withdrawal patterns, and cash flows with AI</p>
        <Button onClick={onFetchAI}><Sparkles className="h-4 w-4 mr-1.5" /> Run AI Analysis</Button>
      </CardContent></Card>
    );
  }

  const summary = aiInsights.summary || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center"><Activity className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-xl font-bold">{summary.total_active_requests || 0}</p><p className="text-xs text-muted-foreground">Active Requests</p></CardContent></Card>
        <Card className={cn(summary.high_risk_count > 0 && 'border-destructive/50')}><CardContent className="pt-4 pb-3 text-center"><AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" /><p className="text-xl font-bold">{summary.high_risk_count || 0}</p><p className="text-xs text-muted-foreground">High Risk Alerts</p></CardContent></Card>
        <Card className={cn(summary.high_risk_withdrawals > 0 && 'border-amber-500/50')}><CardContent className="pt-4 pb-3 text-center"><Eye className="h-5 w-5 mx-auto text-amber-500 mb-1" /><p className="text-xl font-bold">{summary.high_risk_withdrawals || 0}</p><p className="text-xs text-muted-foreground">Risky Withdrawals</p></CardContent></Card>
        <Card className={cn(summary.exit_risk_clients > 0 && 'border-destructive/50')}><CardContent className="pt-4 pb-3 text-center"><Users className="h-5 w-5 mx-auto text-destructive mb-1" /><p className="text-xl font-bold">{summary.exit_risk_clients || 0}</p><p className="text-xs text-muted-foreground">Exit Risk Clients</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><IndianRupee className="h-5 w-5 mx-auto text-emerald-500 mb-1" /><p className="text-xl font-bold">{formatCurrency(summary.upcoming_large_payout_total || 0)}</p><p className="text-xs text-muted-foreground">Large Payouts Pending</p></CardContent></Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value={aiSubTab} onValueChange={setAiSubTab}>
        <TabsList className="bg-muted flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="withdrawal-risk">Withdrawal Risk</TabsTrigger>
          <TabsTrigger value="behavior">Client Behavior</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow Forecast</TabsTrigger>
          <TabsTrigger value="settlement">Settlement Monitor</TabsTrigger>
          <TabsTrigger value="heatmap">Cash Flow Heatmap</TabsTrigger>
          <TabsTrigger value="large-payouts">Large Payouts</TabsTrigger>
        </TabsList>

        {/* ─── Overview ─── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Alerts */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Risk Alerts</CardTitle>
                  <Badge variant="outline">{aiInsights.risk_alerts?.length || 0}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {(!aiInsights.risk_alerts || aiInsights.risk_alerts.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No risk alerts — all clear ✅</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {aiInsights.risk_alerts.slice(0, 10).map((alert: any, i: number) => (
                      <div key={i} className={cn('border rounded-lg p-3', severityColor(alert.severity))}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">{alert.severity}</Badge>
                              <Badge variant="secondary" className="text-[10px]">{alert.type?.replace(/_/g, ' ')}</Badge>
                            </div>
                            <p className="font-medium text-sm mt-1">{alert.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                            {alert.suggested_action && (
                              <p className="text-xs mt-1.5 flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /><span className="font-medium">Action:</span> {alert.suggested_action}</p>
                            )}
                          </div>
                          {alert.score != null && (
                            <div className="text-right flex-shrink-0">
                              <p className={cn('text-lg font-bold', alert.score > 70 ? 'text-destructive' : alert.score > 50 ? 'text-amber-500' : 'text-muted-foreground')}>{alert.score}%</p>
                              <p className="text-[10px] text-muted-foreground">risk</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Smart Suggestions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Smart Funding Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                {(!aiInsights.smart_suggestions || aiInsights.smart_suggestions.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No suggestions — all clients funded ✅</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {aiInsights.smart_suggestions.map((s: any, i: number) => (
                      <div key={i} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{s.client_name}</p>
                          <Badge variant={s.urgency === 'Urgent' ? 'destructive' : s.urgency === 'High' ? 'outline' : 'secondary'} className="text-[10px]">{s.urgency}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{s.reason}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <Badge variant="outline">{s.recommended_method}</Badge>
                          <span className="text-muted-foreground">Settlement: {s.estimated_settlement}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Withdrawal Risk ─── */}
        <TabsContent value="withdrawal-risk">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4 text-amber-500" /> Withdrawal Risk Profiles</CardTitle><CardDescription>AI-scored withdrawal risk for clients with recent payout activity</CardDescription></CardHeader>
            <CardContent>
              {(!aiInsights.withdrawal_risk_profiles || aiInsights.withdrawal_risk_profiles.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-8">No suspicious withdrawal patterns detected ✅</p>
              ) : (
                <div className="space-y-4">
                  {aiInsights.withdrawal_risk_profiles.map((w: any, i: number) => (
                    <div key={i} className={cn('border rounded-lg p-4', severityColor(w.risk_level))}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium">{w.client_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={w.risk_level === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">{w.risk_level}</Badge>
                            <span className="text-xs text-muted-foreground">{w.withdrawal_frequency} frequency</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn('text-2xl font-bold', w.risk_score >= 70 ? 'text-destructive' : w.risk_score >= 50 ? 'text-amber-500' : 'text-muted-foreground')}>{w.risk_score}</p>
                          <p className="text-[10px] text-muted-foreground">risk score</p>
                        </div>
                      </div>
                      <Progress value={w.risk_score} className="h-2 mb-3" />
                      <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                        <div><span className="text-muted-foreground">Withdrawals (30d):</span><p className="font-medium">{w.total_withdrawals_30d}</p></div>
                        <div><span className="text-muted-foreground">Total Amount:</span><p className="font-medium">{formatCurrency(w.total_amount_30d)}</p></div>
                        <div><span className="text-muted-foreground">Avg Withdrawal:</span><p className="font-medium">{formatCurrency(w.avg_withdrawal)}</p></div>
                      </div>
                      {w.flags?.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {w.flags.map((f: string, fi: number) => (
                            <p key={fi} className="text-xs flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />{f}</p>
                          ))}
                        </div>
                      )}
                      <p className="text-xs flex items-center gap-1 mt-2"><Sparkles className="h-3 w-3 text-primary" /><span className="font-medium">Action:</span> {w.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Client Behavior ─── */}
        <TabsContent value="behavior">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Client Behavior Analysis</CardTitle><CardDescription>90-day withdrawal patterns and behavior classification</CardDescription></CardHeader>
            <CardContent>
              {(!aiInsights.client_behaviors || aiInsights.client_behaviors.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-8">No payout activity to analyze</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Withdrawals (90d)</TableHead>
                      <TableHead>Total Withdrawn</TableHead>
                      <TableHead>AUM Ratio</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Signals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiInsights.client_behaviors.map((b: any, i: number) => {
                      const p = patternLabel[b.pattern] || patternLabel.stable;
                      const PatternIcon = p.icon;
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{b.client_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('gap-1 text-[10px]', p.color)}>
                              <PatternIcon className="h-3 w-3" />
                              {p.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{b.withdrawal_count_90d}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(b.total_withdrawn_90d)}</TableCell>
                          <TableCell>
                            <span className={cn('font-medium', b.payout_to_aum_ratio > 0.25 ? 'text-destructive' : b.payout_to_aum_ratio > 0.1 ? 'text-amber-500' : 'text-muted-foreground')}>
                              {Math.round(b.payout_to_aum_ratio * 100)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {b.trend === 'increasing' ? <TrendingUp className="h-3.5 w-3.5 text-destructive" /> : b.trend === 'decreasing' ? <TrendingDown className="h-3.5 w-3.5 text-emerald-500" /> : <span className="text-xs text-muted-foreground">—</span>}
                              <span className="text-xs capitalize">{b.trend}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 max-w-[200px]">
                              {b.signals?.slice(0, 2).map((s: string, si: number) => (
                                <p key={si} className="text-[10px] text-muted-foreground truncate">{s}</p>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Cash Flow Forecast ─── */}
        <TabsContent value="cashflow">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Liquidity & Cash Flow Forecast</CardTitle>
              <CardDescription>Projected cash positions including pending payouts, funding, and order outflows</CardDescription>
            </CardHeader>
            <CardContent>
              {(!aiInsights.cash_flow_forecasts || aiInsights.cash_flow_forecasts.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">No cash balance data to forecast</p>
              ) : (
                <div className="space-y-3">
                  {aiInsights.cash_flow_forecasts.map((cf: any, i: number) => (
                    <div key={i} className={cn('border rounded-lg p-4', cf.shortfall ? 'border-destructive/50 bg-destructive/5' : 'border-muted')}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium">{cf.client_name}</p>
                        <div className="flex items-center gap-2">
                          {cf.shortfall && <Badge variant="destructive" className="text-[10px]">Shortfall</Badge>}
                          {cf.days_until_shortfall != null && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500">~{cf.days_until_shortfall}d to depletion</Badge>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs mb-3">
                        <div><span className="text-muted-foreground">Available</span><p className="font-medium text-emerald-600">{formatCurrency(cf.current_available)}</p></div>
                        <div><span className="text-muted-foreground">Pending</span><p className="font-medium text-amber-600">{formatCurrency(cf.current_pending)}</p></div>
                        <div className="flex items-center gap-1"><ArrowUpRight className="h-3 w-3 text-emerald-500" /><div><span className="text-muted-foreground">Inflow</span><p className="font-medium">{formatCurrency(cf.projected_inflow)}</p></div></div>
                        <div className="flex items-center gap-1"><ArrowDownRight className="h-3 w-3 text-destructive" /><div><span className="text-muted-foreground">Outflow</span><p className="font-medium">{formatCurrency(cf.projected_outflow)}</p></div></div>
                        <div><span className="text-muted-foreground">Payout Outflow</span><p className="font-medium text-orange-500">{formatCurrency(cf.projected_payout_outflow || 0)}</p></div>
                      </div>
                      <div className="flex items-center justify-between text-xs border-t pt-2">
                        <span className="text-muted-foreground">Projected Balance:</span>
                        <span className={cn('font-bold', cf.projected_balance < 0 ? 'text-destructive' : 'text-emerald-600')}>{formatCurrency(cf.projected_balance)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> {cf.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Settlement Monitor ─── */}
        <TabsContent value="settlement">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Settlement Risk Monitor</CardTitle>
                <Badge variant="outline">{aiInsights.settlement_risks?.length || 0}</Badge>
              </div>
              <CardDescription>Settlement delay predictions and completion probabilities</CardDescription>
            </CardHeader>
            <CardContent>
              {(!aiInsights.settlement_risks || aiInsights.settlement_risks.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active settlement risks</p>
              ) : (
                <div className="space-y-3">
                  {aiInsights.settlement_risks.map((sr: any, i: number) => (
                    <div key={i} className={cn('border rounded-lg p-3', severityColor(sr.risk_level))}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{sr.client_name}</p>
                          <p className="text-xs text-muted-foreground">{sr.funding_type} • {formatCurrency(sr.amount)} • Stage: {sr.current_stage}</p>
                        </div>
                        <Badge variant={sr.risk_level === 'critical' ? 'destructive' : sr.risk_level === 'high' ? 'outline' : 'secondary'} className="text-[10px]">
                          {sr.days_remaining < 0 ? `${Math.abs(sr.days_remaining)}d overdue` : sr.days_remaining === 0 ? 'Due today' : `${sr.days_remaining}d left`}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span>Completion probability</span><span className="font-medium">{sr.completion_probability}%</span></div>
                        <Progress value={sr.completion_probability} className="h-1.5" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> {sr.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Cash Flow Heatmap ─── */}
        <TabsContent value="heatmap">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Cash Flow Heatmap</CardTitle><CardDescription>Daily inflows and outflows over the last 30 days and next 30 days</CardDescription></CardHeader>
            <CardContent>
              {(!aiInsights.cash_flow_heatmap || aiInsights.cash_flow_heatmap.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-8">No cash flow activity to display</p>
              ) : (
                <div className="space-y-4">
                  {/* Heatmap grid */}
                  <div className="flex flex-wrap gap-1">
                    {aiInsights.cash_flow_heatmap.map((entry: any, i: number) => {
                      const net = entry.net || 0;
                      const maxAbs = Math.max(...aiInsights.cash_flow_heatmap.map((e: any) => Math.abs(e.net || 0)), 1);
                      const intensity = Math.min(1, Math.abs(net) / maxAbs);
                      const isPositive = net >= 0;
                      const isFuture = new Date(entry.date) > new Date();

                      return (
                        <div
                          key={i}
                          title={`${entry.date}: In: ${formatCurrency(entry.inflows)}, Out: ${formatCurrency(entry.outflows)}, Net: ${formatCurrency(net)}`}
                          className={cn(
                            'w-8 h-8 rounded-sm flex items-center justify-center text-[8px] font-medium border cursor-default transition-colors',
                            isFuture && 'border-dashed',
                            isPositive
                              ? `bg-emerald-500/${Math.round(intensity * 40 + 10)} text-emerald-700 dark:text-emerald-300 border-emerald-500/30`
                              : `bg-destructive/${Math.round(intensity * 40 + 10)} text-destructive border-destructive/30`,
                            net === 0 && 'bg-muted/50 text-muted-foreground border-muted',
                          )}
                          style={{
                            backgroundColor: net === 0 ? undefined :
                              isPositive ? `hsl(142 76% 36% / ${intensity * 0.4 + 0.05})` :
                              `hsl(0 84% 60% / ${intensity * 0.4 + 0.05})`,
                          }}
                        >
                          {new Date(entry.date).getDate()}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-500/30" /> Net Inflow</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-destructive/30" /> Net Outflow</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm border border-dashed border-muted-foreground/50" /> Projected</div>
                  </div>

                  {/* Table view */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Inflows</TableHead>
                        <TableHead>Outflows</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Funding #</TableHead>
                        <TableHead>Payout #</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiInsights.cash_flow_heatmap.slice(0, 20).map((entry: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-emerald-600 font-medium">{entry.inflows > 0 ? formatCurrency(entry.inflows) : '—'}</TableCell>
                          <TableCell className="text-destructive font-medium">{entry.outflows > 0 ? formatCurrency(entry.outflows) : '—'}</TableCell>
                          <TableCell className={cn('font-semibold', entry.net >= 0 ? 'text-emerald-600' : 'text-destructive')}>{formatCurrency(entry.net)}</TableCell>
                          <TableCell>{entry.funding_count || '—'}</TableCell>
                          <TableCell>{entry.payout_count || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Large Payouts ─── */}
        <TabsContent value="large-payouts">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><IndianRupee className="h-4 w-4 text-primary" /> Upcoming Large Payouts</CardTitle><CardDescription>Active payouts ≥ ₹5L with cash coverage analysis</CardDescription></CardHeader>
            <CardContent>
              {(!aiInsights.upcoming_large_payouts || aiInsights.upcoming_large_payouts.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-8">No large payouts pending</p>
              ) : (
                <div className="space-y-3">
                  {aiInsights.upcoming_large_payouts.map((p: any, i: number) => (
                    <div key={i} className={cn('border rounded-lg p-4', p.coverage_ratio < 0.5 ? 'border-destructive/50 bg-destructive/5' : p.coverage_ratio < 1 ? 'border-amber-500/50 bg-amber-500/5' : 'border-muted')}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{p.client_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{p.payout_type}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                          </div>
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(p.amount)}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs mb-2">
                        <div><span className="text-muted-foreground">Cash Available</span><p className="font-medium text-emerald-600">{formatCurrency(p.cash_available)}</p></div>
                        <div><span className="text-muted-foreground">Coverage</span><p className={cn('font-medium', p.coverage_ratio >= 1 ? 'text-emerald-600' : p.coverage_ratio >= 0.5 ? 'text-amber-500' : 'text-destructive')}>{Math.round(p.coverage_ratio * 100)}%</p></div>
                        <div><span className="text-muted-foreground">Est. Completion</span><p className="font-medium">{p.estimated_completion ? format(new Date(p.estimated_completion), 'dd MMM') : '—'}</p></div>
                      </div>
                      <Progress value={p.coverage_ratio * 100} className="h-1.5" />
                      {p.coverage_ratio < 1 && (
                        <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Insufficient cash — shortfall of {formatCurrency(p.amount - p.cash_available)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Analysis generated: {aiInsights.generated_at ? format(new Date(aiInsights.generated_at), 'dd MMM yyyy, HH:mm') : '—'}</span>
        <Button variant="outline" size="sm" onClick={onFetchAI}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-analyze</Button>
      </div>
    </div>
  );
};
