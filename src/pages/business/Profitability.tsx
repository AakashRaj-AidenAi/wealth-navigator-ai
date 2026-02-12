import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRevenueRecords, useCommissionRecords, useInvoices } from '@/hooks/useBusiness';
import { formatCurrency, formatCurrencyShort } from '@/lib/currency';
import { Loader2, TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Target, Crown, Pencil } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart as RePieChart, Pie, LineChart, Line, ScatterChart, Scatter, ZAxis } from 'recharts';

const CHART_COLORS = ['hsl(43, 74%, 49%)', 'hsl(160, 84%, 39%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)', 'hsl(20, 80%, 55%)', 'hsl(120, 50%, 45%)'];
const HEATMAP_COLORS = { high: 'hsl(160, 84%, 39%)', medium: 'hsl(43, 74%, 49%)', low: 'hsl(340, 75%, 55%)' };

const Profitability = () => {
  const { data: revenueRecords, isLoading: revLoading } = useRevenueRecords();
  const { data: commissionRecords, isLoading: comLoading } = useCommissionRecords();
  const { data: invoices, isLoading: invLoading } = useInvoices();

  const isLoading = revLoading || comLoading || invLoading;

  const [servicingCosts, setServicingCosts] = useState<Record<string, number>>({});
  const [editingCost, setEditingCost] = useState<{ clientId: string; clientName: string } | null>(null);
  const [costInput, setCostInput] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const [sortBy, setSortBy] = useState<'profit' | 'revenue' | 'margin'>('profit');

  // Aggregate data per client
  const clientData = useMemo(() => {
    if (!revenueRecords && !commissionRecords && !invoices) return [];

    const clientMap: Record<string, { id: string; name: string; revenue: number; commissions: number; invoiced: number; productRevenue: Record<string, number>; firstDate: string }> = {};

    revenueRecords?.forEach((r: any) => {
      const id = r.client_id;
      const name = r.clients?.client_name || 'Unknown';
      if (!clientMap[id]) clientMap[id] = { id, name, revenue: 0, commissions: 0, invoiced: 0, productRevenue: {}, firstDate: r.date };
      clientMap[id].revenue += r.amount || 0;
      const pt = r.product_type || 'Other';
      clientMap[id].productRevenue[pt] = (clientMap[id].productRevenue[pt] || 0) + (r.amount || 0);
      if (r.date < clientMap[id].firstDate) clientMap[id].firstDate = r.date;
    });

    commissionRecords?.forEach((r: any) => {
      const id = r.client_id;
      const name = r.clients?.client_name || 'Unknown';
      if (!clientMap[id]) clientMap[id] = { id, name, revenue: 0, commissions: 0, invoiced: 0, productRevenue: {}, firstDate: r.payout_date || new Date().toISOString() };
      clientMap[id].commissions += (r.upfront_commission || 0) + (r.trail_commission || 0);
    });

    invoices?.forEach((r: any) => {
      const id = r.client_id;
      const name = r.clients?.client_name || 'Unknown';
      if (!clientMap[id]) clientMap[id] = { id, name, revenue: 0, commissions: 0, invoiced: 0, productRevenue: {}, firstDate: r.created_at };
      if (r.status === 'paid') clientMap[id].invoiced += r.total_amount || 0;
    });

    return Object.values(clientMap).map(c => {
      const totalRevenue = c.revenue + c.commissions + c.invoiced;
      const cost = servicingCosts[c.id] || 0;
      const profit = totalRevenue - cost;
      const margin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;
      const monthsActive = Math.max(1, Math.ceil((Date.now() - new Date(c.firstDate).getTime()) / (30 * 24 * 60 * 60 * 1000)));
      const monthlyAvg = totalRevenue / monthsActive;
      const ltv = monthlyAvg * 36; // 3-year LTV estimate

      return { ...c, totalRevenue, cost, profit, margin, monthlyAvg, ltv, monthsActive };
    }).sort((a, b) => sortBy === 'profit' ? b.profit - a.profit : sortBy === 'revenue' ? b.totalRevenue - a.totalRevenue : b.margin - a.margin);
  }, [revenueRecords, commissionRecords, invoices, servicingCosts, sortBy]);

  // Product aggregation
  const productData = useMemo(() => {
    const map: Record<string, number> = {};
    revenueRecords?.forEach((r: any) => {
      const pt = r.product_type || 'Other';
      map[pt] = (map[pt] || 0) + (r.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [revenueRecords]);

  // Analytics
  const analytics = useMemo(() => {
    if (!clientData.length) return null;

    const totalRevenue = clientData.reduce((s, c) => s + c.totalRevenue, 0);
    const totalProfit = clientData.reduce((s, c) => s + c.profit, 0);
    const avgMargin = clientData.length > 0 ? clientData.reduce((s, c) => s + c.margin, 0) / clientData.length : 0;
    const avgLTV = clientData.length > 0 ? clientData.reduce((s, c) => s + c.ltv, 0) / clientData.length : 0;

    // Top 20% revenue concentration (Pareto)
    const sorted = [...clientData].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const top20Count = Math.max(1, Math.ceil(sorted.length * 0.2));
    const top20Revenue = sorted.slice(0, top20Count).reduce((s, c) => s + c.totalRevenue, 0);
    const concentrationRatio = totalRevenue > 0 ? (top20Revenue / totalRevenue * 100) : 0;

    // Pareto chart data
    let cumulative = 0;
    const paretoData = sorted.map((c, i) => {
      cumulative += c.totalRevenue;
      return { name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name, revenue: c.totalRevenue, cumPct: totalRevenue > 0 ? (cumulative / totalRevenue * 100) : 0 };
    }).slice(0, 15);

    // Client segments
    const highProfit = clientData.filter(c => c.margin >= 50);
    const lowProfit = clientData.filter(c => c.margin < 20 && c.totalRevenue > 0);
    const highPotential = clientData.filter(c => c.margin >= 30 && c.totalRevenue < (totalRevenue / clientData.length));

    // Heatmap data (revenue vs margin quadrants)
    const heatmapData = clientData.map(c => ({
      name: c.name,
      revenue: c.totalRevenue,
      margin: c.margin,
      profit: c.profit,
      z: Math.max(Math.abs(c.profit), 1000),
    }));

    return { totalRevenue, totalProfit, avgMargin, avgLTV, concentrationRatio, top20Count, paretoData, highProfit, lowProfit, highPotential, heatmapData };
  }, [clientData]);

  const handleSaveCost = () => {
    if (!editingCost) return;
    setServicingCosts(prev => ({ ...prev, [editingCost.clientId]: parseFloat(costInput) || 0 }));
    setEditingCost(null);
    setCostInput('');
  };

  const getProfitBadge = (margin: number) => {
    if (margin >= 50) return <Badge className="bg-primary/10 text-primary">High</Badge>;
    if (margin >= 20) return <Badge className="bg-amber-500/10 text-amber-500">Medium</Badge>;
    return <Badge className="bg-destructive/10 text-destructive">Low</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profitability Analysis</h1>
            <p className="text-muted-foreground">Identify which clients and products drive real profit</p>
          </div>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="profit">Sort by Profit</SelectItem>
              <SelectItem value="revenue">Sort by Revenue</SelectItem>
              <SelectItem value="margin">Sort by Margin %</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !clientData.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Add revenue and commission records to see profitability analysis.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analytics?.totalRevenue ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">Across {clientData.length} clients</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analytics?.totalProfit ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">Avg margin {(analytics?.avgMargin ?? 0).toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue Concentration</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${(analytics?.concentrationRatio ?? 0) > 80 ? 'text-destructive' : ''}`}>{(analytics?.concentrationRatio ?? 0).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Top {analytics?.top20Count} clients = this % of revenue</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Client LTV</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrencyShort(analytics?.avgLTV ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">3-year projected value</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs value={activeView} onValueChange={setActiveView}>
              <TabsList>
                <TabsTrigger value="overview">Client Profitability</TabsTrigger>
                <TabsTrigger value="products">Product Revenue</TabsTrigger>
                <TabsTrigger value="pareto">Pareto (80/20)</TabsTrigger>
                <TabsTrigger value="heatmap">Profitability Map</TabsTrigger>
                <TabsTrigger value="segments">Client Segments</TabsTrigger>
              </TabsList>

              {/* Client Profitability Table */}
              <TabsContent value="overview">
                <Card>
                  <CardHeader><CardTitle>Client Profitability Ranking</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                          <TableHead className="text-right">Margin</TableHead>
                          <TableHead className="text-right">LTV (3yr)</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientData.map((c, i) => (
                          <TableRow key={c.id}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(c.totalRevenue)}</TableCell>
                            <TableCell className="text-right">{c.cost > 0 ? formatCurrency(c.cost) : <span className="text-muted-foreground text-xs">Not set</span>}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(c.profit)}</TableCell>
                            <TableCell className="text-right">{c.margin.toFixed(1)}%</TableCell>
                            <TableCell className="text-right">{formatCurrencyShort(c.ltv)}</TableCell>
                            <TableCell>{getProfitBadge(c.margin)}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingCost({ clientId: c.id, clientName: c.name }); setCostInput(String(c.cost || '')); }} title="Set servicing cost">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Product Revenue */}
              <TabsContent value="products">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle>Revenue by Product</CardTitle></CardHeader>
                    <CardContent>
                      {productData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={productData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                            <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]}>
                              {productData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <div className="flex items-center justify-center h-[300px] text-muted-foreground">No product data</div>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Product Mix</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center">
                      {productData.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={250}>
                            <RePieChart>
                              <Pie data={productData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                                {productData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                            </RePieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap gap-3 mt-2">
                            {productData.map((d, i) => (
                              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                {d.name}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">No data</div>}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Pareto Chart */}
              <TabsContent value="pareto">
                <Card>
                  <CardHeader>
                    <CardTitle>Pareto Analysis (80/20 Rule)</CardTitle>
                    <p className="text-sm text-muted-foreground">Top 20% of clients contribute {(analytics?.concentrationRatio ?? 0).toFixed(0)}% of total revenue</p>
                  </CardHeader>
                  <CardContent>
                    {analytics?.paretoData && analytics.paretoData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analytics.paretoData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-30} textAnchor="end" height={60} />
                          <YAxis yAxisId="revenue" tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip formatter={(v: number, name: string) => name === 'cumPct' ? `${v.toFixed(1)}%` : formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Bar yAxisId="revenue" dataKey="revenue" name="Revenue" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="pct" type="monotone" dataKey="cumPct" name="Cumulative %" stroke="hsl(43, 74%, 49%)" strokeWidth={2} dot={{ fill: 'hsl(43, 74%, 49%)' }} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-[350px] text-muted-foreground">No data</div>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Profitability Heatmap */}
              <TabsContent value="heatmap">
                <Card>
                  <CardHeader>
                    <CardTitle>Profitability Map</CardTitle>
                    <p className="text-sm text-muted-foreground">Revenue (X) vs Margin % (Y) — bubble size = profit</p>
                  </CardHeader>
                  <CardContent>
                    {analytics?.heatmapData && analytics.heatmapData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" dataKey="revenue" name="Revenue" tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis type="number" dataKey="margin" name="Margin %" unit="%" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                          <ZAxis type="number" dataKey="z" range={[60, 400]} />
                          <Tooltip
                            content={({ payload }) => {
                              if (!payload?.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-semibold text-sm">{d.name}</p>
                                  <p className="text-xs text-muted-foreground">Revenue: {formatCurrency(d.revenue)}</p>
                                  <p className="text-xs text-muted-foreground">Margin: {d.margin.toFixed(1)}%</p>
                                  <p className="text-xs text-muted-foreground">Profit: {formatCurrency(d.profit)}</p>
                                </div>
                              );
                            }}
                          />
                          <Scatter data={analytics.heatmapData}>
                            {analytics.heatmapData.map((d: any, i: number) => (
                              <Cell key={i} fill={d.margin >= 50 ? HEATMAP_COLORS.high : d.margin >= 20 ? HEATMAP_COLORS.medium : HEATMAP_COLORS.low} fillOpacity={0.7} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-[400px] text-muted-foreground">No data</div>}
                    <div className="flex gap-4 mt-3 justify-center">
                      {Object.entries(HEATMAP_COLORS).map(([label, color]) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                          {label.charAt(0).toUpperCase() + label.slice(1)} Margin
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Client Segments */}
              <TabsContent value="segments">
                <div className="grid gap-6 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-primary" />
                        <CardTitle>Top Performers</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">High margin (≥50%) clients</p>
                    </CardHeader>
                    <CardContent>
                      {analytics?.highProfit.length ? (
                        <div className="space-y-3">
                          {analytics.highProfit.slice(0, 8).map(c => (
                            <div key={c.id} className="flex justify-between items-center">
                              <span className="text-sm font-medium truncate max-w-[140px]">{c.name}</span>
                              <div className="text-right">
                                <span className="text-sm font-semibold">{formatCurrencyShort(c.profit)}</span>
                                <span className="text-xs text-muted-foreground ml-2">{c.margin.toFixed(0)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No high-margin clients yet</p>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <CardTitle>Low Revenue, High Effort</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">Low margin (&lt;20%) clients with revenue</p>
                    </CardHeader>
                    <CardContent>
                      {analytics?.lowProfit.length ? (
                        <div className="space-y-3">
                          {analytics.lowProfit.slice(0, 8).map(c => (
                            <div key={c.id} className="flex justify-between items-center">
                              <span className="text-sm font-medium truncate max-w-[140px]">{c.name}</span>
                              <div className="text-right">
                                <span className="text-sm text-destructive">{formatCurrencyShort(c.profit)}</span>
                                <span className="text-xs text-muted-foreground ml-2">{c.margin.toFixed(0)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No underperforming clients</p>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-amber-500" />
                        <CardTitle>High Potential</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">Good margin, below-avg revenue — room to grow</p>
                    </CardHeader>
                    <CardContent>
                      {analytics?.highPotential.length ? (
                        <div className="space-y-3">
                          {analytics.highPotential.slice(0, 8).map(c => (
                            <div key={c.id} className="flex justify-between items-center">
                              <span className="text-sm font-medium truncate max-w-[140px]">{c.name}</span>
                              <div className="text-right">
                                <span className="text-sm">{formatCurrencyShort(c.totalRevenue)}</span>
                                <span className="text-xs text-muted-foreground ml-2">{c.margin.toFixed(0)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No candidates identified</p>}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Edit Cost Dialog */}
        <Dialog open={!!editingCost} onOpenChange={() => setEditingCost(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Set Servicing Cost</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Client: {editingCost?.clientName}</p>
            <div className="space-y-4">
              <div>
                <Label>Annual Servicing Cost</Label>
                <Input type="number" placeholder="0" value={costInput} onChange={(e) => setCostInput(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Includes salary allocation, tech costs, admin overhead, etc.</p>
              </div>
              <Button onClick={handleSaveCost} className="w-full">Save Cost</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Profitability;
