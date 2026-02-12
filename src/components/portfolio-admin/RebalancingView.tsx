import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { formatCurrency } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, ArrowRightLeft, Check, ChevronRight, CircleDot, Download,
  PieChart, Scale, Shield, Target, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart as RePieChart, Pie, Legend,
} from 'recharts';
import {
  type TargetAllocation, type PositionSnapshot, type RebalanceProposal, type SuggestedTrade,
  detectDrift, buildRebalanceProposal,
} from './rebalancingEngine';

// ─── Types ───
interface Portfolio {
  id: string;
  portfolio_name: string;
  client_id: string;
  clients?: { client_name: string };
}
interface Position {
  id: string;
  portfolio_id: string;
  security_id: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  market_value: number;
}

interface Props {
  portfolios: Portfolio[];
  positions: Position[];
  selectedPortfolioId: string | null;
}

const DRIFT_COLORS = {
  overweight: '#ef4444',
  underweight: '#3b82f6',
  'on-target': '#22c55e',
};

const CHART_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'];

export const RebalancingView = ({ portfolios, positions, selectedPortfolioId }: Props) => {
  const [subTab, setSubTab] = useState('setup');
  const [thresholdPct, setThresholdPct] = useState(5);
  const [targets, setTargets] = useState<TargetAllocation[]>([]);
  const [proposal, setProposal] = useState<RebalanceProposal | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, { enabled: boolean; quantity?: number }>>({});
  const [batchMode, setBatchMode] = useState(false);
  const [batchPortfolioIds, setBatchPortfolioIds] = useState<string[]>([]);
  const [batchProposals, setBatchProposals] = useState<RebalanceProposal[]>([]);

  // Current portfolio positions
  const currentPositions = useMemo(() =>
    selectedPortfolioId ? positions.filter(p => p.portfolio_id === selectedPortfolioId) : positions,
    [positions, selectedPortfolioId]
  );

  const currentPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const totalMV = currentPositions.reduce((s, p) => s + Number(p.market_value || 0), 0);

  // Unique securities across current positions
  const securities = useMemo(() => {
    const set = new Set<string>();
    currentPositions.forEach(p => set.add(p.security_id));
    return Array.from(set);
  }, [currentPositions]);

  // ─── Target Allocation Management ───
  const handleAddTarget = (securityId: string) => {
    if (targets.find(t => t.securityId === securityId)) return;
    setTargets(prev => [...prev, { securityId, targetPct: 0 }]);
  };

  const handleUpdateTargetPct = (securityId: string, pct: number) => {
    setTargets(prev => prev.map(t => t.securityId === securityId ? { ...t, targetPct: pct } : t));
  };

  const handleRemoveTarget = (securityId: string) => {
    setTargets(prev => prev.filter(t => t.securityId !== securityId));
  };

  const totalTargetPct = targets.reduce((s, t) => s + t.targetPct, 0);

  // Auto-populate targets from current weights
  const autoPopulateTargets = () => {
    if (totalMV <= 0) return;
    const newTargets: TargetAllocation[] = currentPositions.map(p => ({
      securityId: p.security_id,
      targetPct: Number(((p.market_value / totalMV) * 100).toFixed(1)),
    }));
    setTargets(newTargets);
    toast({ title: 'Auto-populated', description: 'Targets set to current portfolio weights' });
  };

  // Equal-weight all targets
  const equalWeightTargets = () => {
    if (targets.length === 0) return;
    const pct = Number((100 / targets.length).toFixed(1));
    setTargets(prev => prev.map(t => ({ ...t, targetPct: pct })));
  };

  // ─── Run Rebalance ───
  const runRebalance = () => {
    if (!selectedPortfolioId || !currentPortfolio) {
      toast({ title: 'Select a portfolio first', variant: 'destructive' });
      return;
    }
    if (targets.length === 0) {
      toast({ title: 'Set target allocations first', variant: 'destructive' });
      return;
    }
    const snapshots: PositionSnapshot[] = currentPositions.map(p => ({
      securityId: p.security_id,
      quantity: p.quantity,
      averageCost: p.average_cost,
      currentPrice: p.current_price,
      marketValue: p.market_value,
    }));
    const result = buildRebalanceProposal(
      selectedPortfolioId,
      currentPortfolio.portfolio_name,
      snapshots,
      targets,
      thresholdPct,
    );
    setProposal(result);
    // Init overrides
    const ov: Record<string, { enabled: boolean; quantity?: number }> = {};
    result.suggestedTrades.forEach(t => { ov[t.securityId] = { enabled: true, quantity: t.quantity }; });
    setOverrides(ov);
    setSubTab('results');
  };

  // ─── Batch Rebalance ───
  const runBatchRebalance = () => {
    if (batchPortfolioIds.length === 0 || targets.length === 0) {
      toast({ title: 'Select portfolios and set targets', variant: 'destructive' });
      return;
    }
    const proposals: RebalanceProposal[] = batchPortfolioIds.map(pid => {
      const p = portfolios.find(x => x.id === pid);
      const pPos = positions.filter(x => x.portfolio_id === pid);
      const snapshots: PositionSnapshot[] = pPos.map(x => ({
        securityId: x.security_id, quantity: x.quantity, averageCost: x.average_cost,
        currentPrice: x.current_price, marketValue: x.market_value,
      }));
      return buildRebalanceProposal(pid, p?.portfolio_name || pid, snapshots, targets, thresholdPct);
    });
    setBatchProposals(proposals);
    setSubTab('batch-results');
  };

  // ─── Confirm Rebalance ───
  const confirmRebalance = () => {
    // In production this would create actual trade orders
    toast({ title: 'Rebalance confirmed', description: 'Trade orders have been queued for execution.' });
    setShowConfirmDialog(false);
    setProposal(null);
    setSubTab('setup');
  };

  // ─── Export ───
  const exportProposal = () => {
    if (!proposal) return;
    const rows = [
      ['Security', 'Side', 'Quantity', 'Price', 'Amount', 'Reason'],
      ...proposal.suggestedTrades.map(t => [
        t.securityId, t.side, String(t.quantity), String(t.currentPrice), String(t.estimatedAmount), t.reason,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rebalance-${proposal.portfolioId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Chart data ───
  const driftChartData = proposal?.driftResults.map(d => ({
    name: d.securityId,
    drift: d.driftPct,
    fill: DRIFT_COLORS[d.direction],
  })) || [];

  const allocationPieData = useMemo(() => {
    if (!proposal) return [];
    return [
      ...proposal.driftResults.map((d, i) => ({
        name: d.securityId,
        current: d.currentPct,
        target: d.targetPct,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })),
    ];
  }, [proposal]);

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="setup" className="gap-1"><Target className="h-4 w-4" /> Setup</TabsTrigger>
          <TabsTrigger value="results" className="gap-1" disabled={!proposal}><Scale className="h-4 w-4" /> Results</TabsTrigger>
          <TabsTrigger value="batch" className="gap-1"><Zap className="h-4 w-4" /> Batch</TabsTrigger>
          {batchProposals.length > 0 && (
            <TabsTrigger value="batch-results" className="gap-1"><PieChart className="h-4 w-4" /> Batch Results</TabsTrigger>
          )}
        </TabsList>

        {/* ═══ SETUP TAB ═══ */}
        <TabsContent value="setup" className="space-y-4">
          {/* Drift Threshold */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><CircleDot className="h-4 w-4 text-primary" /> Drift Threshold</CardTitle>
              <CardDescription>Rebalancing triggers when any position drifts beyond this threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Slider
                  value={[thresholdPct]}
                  onValueChange={v => setThresholdPct(v[0])}
                  min={1} max={20} step={0.5}
                  className="flex-1"
                />
                <Badge variant="secondary" className="text-sm min-w-[60px] justify-center">{thresholdPct}%</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Target Allocation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Target Allocation</CardTitle>
                  <CardDescription>Define desired portfolio weights per security</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={autoPopulateTargets}>
                    Auto-fill Current
                  </Button>
                  <Button size="sm" variant="outline" onClick={equalWeightTargets} disabled={targets.length === 0}>
                    Equal Weight
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add security */}
              <div className="flex items-center gap-2">
                <Select onValueChange={v => handleAddTarget(v)}>
                  <SelectTrigger className="w-[240px]"><SelectValue placeholder="Add security..." /></SelectTrigger>
                  <SelectContent>
                    {securities.filter(s => !targets.find(t => t.securityId === s)).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {targets.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Security</TableHead>
                      <TableHead>Current %</TableHead>
                      <TableHead>Target %</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targets.map(t => {
                      const pos = currentPositions.find(p => p.security_id === t.securityId);
                      const currentPct = totalMV > 0 && pos ? ((pos.market_value / totalMV) * 100) : 0;
                      return (
                        <TableRow key={t.securityId}>
                          <TableCell className="font-medium">{t.securityId}</TableCell>
                          <TableCell>{currentPct.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Input
                              type="number" min={0} max={100} step={0.5}
                              value={t.targetPct}
                              onChange={e => handleUpdateTargetPct(t.securityId, Number(e.target.value))}
                              className="w-24 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => handleRemoveTarget(t.securityId)}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        <Badge variant={Math.abs(totalTargetPct - 100) < 0.5 ? 'default' : 'destructive'}>
                          {totalTargetPct.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              )}

              {targets.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Add securities and set target weights to begin</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Run */}
          <div className="flex justify-end">
            <Button onClick={runRebalance} disabled={targets.length === 0 || !selectedPortfolioId} className="gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Analyze Drift & Generate Trades
            </Button>
          </div>
        </TabsContent>

        {/* ═══ RESULTS TAB ═══ */}
        <TabsContent value="results" className="space-y-4">
          {proposal && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Portfolio Value</p>
                    <p className="text-xl font-bold">{formatCurrency(proposal.totalMarketValue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Positions Drifting</p>
                    <p className="text-xl font-bold text-amber-500">{proposal.driftResults.filter(d => d.breached).length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Suggested Trades</p>
                    <p className="text-xl font-bold">{proposal.suggestedTrades.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Est. Total Cost</p>
                    <p className="text-xl font-bold">{formatCurrency(proposal.transactionCost.totalCost)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Drift Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Allocation Drift</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={driftChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis type="number" tickFormatter={v => `${v}%`} />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drift']} />
                          <Bar dataKey="drift" radius={[0, 4, 4, 0]}>
                            {driftChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie data={allocationPieData} dataKey="target" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, target }) => `${name}: ${target}%`}>
                            {allocationPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Suggested Trades with Overrides */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Suggested Trades</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={exportProposal} className="gap-1">
                        <Download className="h-3.5 w-3.5" /> Export CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Include</TableHead>
                        <TableHead>Security</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposal.suggestedTrades.map((t, i) => {
                        const ov = overrides[t.securityId] || { enabled: true, quantity: t.quantity };
                        return (
                          <TableRow key={i} className={cn(!ov.enabled && 'opacity-40')}>
                            <TableCell>
                              <Checkbox
                                checked={ov.enabled}
                                onCheckedChange={v => setOverrides(prev => ({
                                  ...prev, [t.securityId]: { ...ov, enabled: !!v },
                                }))}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{t.securityId}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={t.side === 'buy' ? 'border-emerald-500 text-emerald-500' : 'border-red-500 text-red-500'}>
                                {t.side.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number" min={0}
                                value={ov.quantity ?? t.quantity}
                                onChange={e => setOverrides(prev => ({
                                  ...prev, [t.securityId]: { ...ov, quantity: Number(e.target.value) },
                                }))}
                                className="w-20 h-7 text-sm"
                                disabled={!ov.enabled}
                              />
                            </TableCell>
                            <TableCell>{formatCurrency(t.currentPrice)}</TableCell>
                            <TableCell>{formatCurrency((ov.quantity ?? t.quantity) * t.currentPrice)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{t.reason}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Tax Impact */}
              {proposal.taxImpacts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Tax Impact Estimate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Security</TableHead>
                          <TableHead>Holding Period</TableHead>
                          <TableHead>Realised Gain</TableHead>
                          <TableHead>Tax Rate</TableHead>
                          <TableHead>Est. Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposal.taxImpacts.map((ti, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{ti.securityId}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={ti.holdingPeriod === 'long-term' ? 'border-emerald-500 text-emerald-500' : 'border-amber-500 text-amber-500'}>
                                {ti.holdingPeriod}
                              </Badge>
                            </TableCell>
                            <TableCell className={ti.realisedGain >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                              {formatCurrency(ti.realisedGain)}
                            </TableCell>
                            <TableCell>{ti.taxRate}%</TableCell>
                            <TableCell>{formatCurrency(ti.estimatedTax)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell />
                          <TableCell>{formatCurrency(proposal.taxImpacts.reduce((s, t) => s + t.realisedGain, 0))}</TableCell>
                          <TableCell />
                          <TableCell>{formatCurrency(proposal.taxImpacts.reduce((s, t) => s + t.estimatedTax, 0))}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Transaction Cost */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Transaction Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Trade Value</p><p className="font-semibold">{formatCurrency(proposal.transactionCost.totalTradeValue)}</p></div>
                    <div><p className="text-muted-foreground">Brokerage ({proposal.transactionCost.brokerageRate} bps)</p><p className="font-semibold">{formatCurrency(proposal.transactionCost.estimatedBrokerage)}</p></div>
                    <div><p className="text-muted-foreground">STT</p><p className="font-semibold">{formatCurrency(proposal.transactionCost.stt)}</p></div>
                    <div><p className="text-muted-foreground">GST</p><p className="font-semibold">{formatCurrency(proposal.transactionCost.gst)}</p></div>
                    <div><p className="text-muted-foreground">Total Cost</p><p className="font-bold text-primary">{formatCurrency(proposal.transactionCost.totalCost)}</p></div>
                  </div>
                </CardContent>
              </Card>

              {/* Confirm */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setProposal(null); setSubTab('setup'); }}>Back to Setup</Button>
                <Button onClick={() => setShowConfirmDialog(true)} className="gap-2">
                  <Check className="h-4 w-4" /> Confirm & Execute Rebalance
                </Button>
              </div>
            </>
          )}

          {!proposal && (
            <div className="text-center py-16 text-muted-foreground">
              <Scale className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Run drift analysis from the Setup tab to see results here</p>
            </div>
          )}
        </TabsContent>

        {/* ═══ BATCH TAB ═══ */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Batch Rebalance</CardTitle>
              <CardDescription>Apply the same target allocation across multiple portfolios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Portfolios</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {portfolios.map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                      <Checkbox
                        checked={batchPortfolioIds.includes(p.id)}
                        onCheckedChange={v => {
                          setBatchPortfolioIds(prev =>
                            v ? [...prev, p.id] : prev.filter(x => x !== p.id)
                          );
                        }}
                      />
                      <span className="text-sm">{p.portfolio_name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{p.clients?.client_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-1">
                  Using target allocation from Setup tab ({targets.length} securities, threshold: {thresholdPct}%)
                </p>
                {targets.length === 0 && (
                  <p className="text-sm text-amber-500">⚠ Set up target allocations in the Setup tab first</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={runBatchRebalance} disabled={batchPortfolioIds.length === 0 || targets.length === 0} className="gap-2">
                  <Zap className="h-4 w-4" /> Run Batch Analysis ({batchPortfolioIds.length} portfolios)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ BATCH RESULTS TAB ═══ */}
        <TabsContent value="batch-results" className="space-y-4">
          {batchProposals.map((bp, idx) => (
            <Card key={bp.portfolioId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{bp.portfolioName}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{formatCurrency(bp.totalMarketValue)}</Badge>
                    <Badge variant={bp.driftResults.filter(d => d.breached).length > 0 ? 'destructive' : 'default'}>
                      {bp.driftResults.filter(d => d.breached).length} drifting
                    </Badge>
                    <Badge variant="secondary">{bp.suggestedTrades.length} trades</Badge>
                    <Badge variant="outline">Cost: {formatCurrency(bp.transactionCost.totalCost)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Security</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bp.suggestedTrades.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell>{t.securityId}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={t.side === 'buy' ? 'border-emerald-500 text-emerald-500' : 'border-red-500 text-red-500'}>
                            {t.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{t.quantity}</TableCell>
                        <TableCell>{formatCurrency(t.estimatedAmount)}</TableCell>
                      </TableRow>
                    ))}
                    {bp.suggestedTrades.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No rebalancing needed</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* ═══ CONFIRMATION DIALOG ═══ */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Rebalance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>You are about to execute the following rebalance for <strong>{proposal?.portfolioName}</strong>:</p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p><strong>{Object.values(overrides).filter(o => o.enabled).length}</strong> trades will be placed</p>
              <p>Estimated cost: <strong>{formatCurrency(proposal?.transactionCost.totalCost || 0)}</strong></p>
              <p>Estimated tax: <strong>{formatCurrency(proposal?.taxImpacts.reduce((s, t) => s + t.estimatedTax, 0) || 0)}</strong></p>
            </div>
            <p className="text-muted-foreground">This action will generate trade orders. Please review carefully.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={confirmRebalance} className="gap-2"><Check className="h-4 w-4" /> Execute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
