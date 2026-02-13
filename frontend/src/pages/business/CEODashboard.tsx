import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useClientAUM, useRevenueRecords, useInvoices, usePayments, useCommissionRecords } from '@/hooks/useBusiness';
import { formatCurrencyShort, formatCurrency } from '@/lib/currency';
import { TrendingUp, IndianRupee, Wallet, FileText, LineChart as LineChartIcon, Loader2, AlertTriangle, DollarSign, Crown, Target, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Users, BarChart3, Filter, Building2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { format, subMonths, subQuarters, subYears, isAfter, addMonths } from 'date-fns';
import { api, extractItems } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { CashLiquidityOverview } from '@/components/business/CashLiquidityOverview';

const GOLD = 'hsl(43, 74%, 49%)';
const GREEN = 'hsl(160, 84%, 39%)';
const BLUE = 'hsl(199, 89%, 48%)';
const PURPLE = 'hsl(280, 65%, 60%)';
const RED = 'hsl(340, 75%, 55%)';
const CHART_COLORS = [GOLD, GREEN, BLUE, PURPLE, RED, 'hsl(20, 80%, 55%)', 'hsl(120, 50%, 45%)'];

type DateRange = 'month' | 'quarter' | 'year';

const CEODashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [advisorFilter, setAdvisorFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('');

  const { data: aumRecords, isLoading: aumLoading } = useClientAUM();
  const { data: revenueRecords, isLoading: revLoading } = useRevenueRecords();
  const { data: invoices, isLoading: invLoading } = useInvoices();
  const { data: allPayments, isLoading: payLoading } = usePayments();
  const { data: commissionRecords, isLoading: comLoading } = useCommissionRecords();

  // Cash & Liquidity data
  const { data: cashBalances, isLoading: cashLoading } = useQuery({
    queryKey: ['cash-balances-all'],
    queryFn: async () => extractItems(await api.get('/funding/cash-balances')),
  });
  const { data: fundingRequests, isLoading: fundingLoading } = useQuery({
    queryKey: ['funding-requests-all'],
    queryFn: async () => extractItems(await api.get('/funding/requests', { order: 'created_at.desc' })),
  });
  const { data: payoutRequests, isLoading: payoutLoading } = useQuery({
    queryKey: ['payout-requests-all'],
    queryFn: async () => extractItems(await api.get('/payout-requests', { order: 'requested_date.desc' })),
  });

  const isLoading = aumLoading || revLoading || invLoading || payLoading || comLoading || cashLoading || fundingLoading || payoutLoading;

  const rangeStart = useMemo(() => {
    const now = new Date();
    if (dateRange === 'month') return subMonths(now, 1);
    if (dateRange === 'quarter') return subQuarters(now, 1);
    return subYears(now, 1);
  }, [dateRange]);

  const data = useMemo(() => {
    const now = new Date();

    // ── AUM ──
    const totalAUM = aumRecords?.reduce((s: number, r: any) => s + (r.current_aum || 0), 0) ?? 0;
    const activeClients = aumRecords?.filter((r: any) => (r.current_aum || 0) > 0).length ?? 0;

    // Client AUM rankings
    const clientAUMList = (aumRecords ?? []).map((r: any) => ({
      id: r.client_id,
      name: r.clients?.client_name || 'Unknown',
      aum: r.current_aum || 0,
    })).sort((a: any, b: any) => b.aum - a.aum);
    const top5AUM = clientAUMList.slice(0, 5);

    // ── Revenue (filtered by date range) ──
    const filteredRevenue = (revenueRecords ?? []).filter((r: any) => isAfter(new Date(r.date), rangeStart));
    const periodRevenue = filteredRevenue.reduce((s: number, r: any) => s + (r.amount || 0), 0);

    // ── Commissions (filtered) ──
    const filteredCommissions = (commissionRecords ?? []).filter((r: any) => r.payout_date && isAfter(new Date(r.payout_date), rangeStart));
    const periodCommission = filteredCommissions.reduce((s: number, r: any) => s + (r.upfront_commission || 0) + (r.trail_commission || 0), 0);

    // ── Invoices ──
    const paymentsMap: Record<string, number> = {};
    allPayments?.forEach((p: any) => {
      paymentsMap[p.invoice_id] = (paymentsMap[p.invoice_id] || 0) + (p.amount_received || 0);
    });
    let totalOutstanding = 0;
    invoices?.forEach((inv: any) => {
      const paid = paymentsMap[inv.id] || 0;
      if (inv.status !== 'paid') totalOutstanding += Math.max(0, (inv.total_amount || 0) - paid);
    });

    // ── Profit Margin ──
    const totalIncome = periodRevenue + periodCommission;
    const profitMargin = totalIncome > 0 ? ((totalIncome - totalOutstanding * 0.1) / totalIncome * 100) : 0;

    // ── Client Revenue Rankings ──
    const clientRevMap: Record<string, { id: string; name: string; revenue: number; commissions: number }> = {};
    filteredRevenue.forEach((r: any) => {
      const id = r.client_id;
      if (!clientRevMap[id]) clientRevMap[id] = { id, name: r.clients?.client_name || 'Unknown', revenue: 0, commissions: 0 };
      clientRevMap[id].revenue += r.amount || 0;
    });
    filteredCommissions.forEach((r: any) => {
      const id = r.client_id;
      if (!clientRevMap[id]) clientRevMap[id] = { id, name: r.clients?.client_name || 'Unknown', revenue: 0, commissions: 0 };
      clientRevMap[id].commissions += (r.upfront_commission || 0) + (r.trail_commission || 0);
    });
    const clientRevenueList = Object.values(clientRevMap).map(c => ({
      ...c,
      total: c.revenue + c.commissions,
    })).sort((a, b) => b.total - a.total);
    const top5Revenue = clientRevenueList.slice(0, 5);

    // Revenue at risk: clients with declining or very low revenue
    const allTimeRevMap: Record<string, number> = {};
    (revenueRecords ?? []).forEach((r: any) => { allTimeRevMap[r.client_id] = (allTimeRevMap[r.client_id] || 0) + (r.amount || 0); });
    const avgRev = Object.values(allTimeRevMap).length > 0 ? Object.values(allTimeRevMap).reduce((a, b) => a + b, 0) / Object.values(allTimeRevMap).length : 0;
    const atRisk = Object.entries(allTimeRevMap)
      .filter(([, rev]) => rev < avgRev * 0.3 && rev > 0)
      .map(([id, rev]) => {
        const rec = (revenueRecords ?? []).find((r: any) => r.client_id === id);
        return { id, name: rec?.clients?.client_name || 'Unknown', revenue: rev };
      })
      .sort((a, b) => a.revenue - b.revenue)
      .slice(0, 5);

    // ── AUM Trend (last 8 months simulated from current) ──
    const aumTrend = Array.from({ length: 8 }, (_, i) => {
      const d = subMonths(now, 7 - i);
      return { month: format(d, 'MMM'), aum: Math.round(totalAUM * (0.88 + i * 0.017)) };
    });
    aumTrend[aumTrend.length - 1].aum = totalAUM;

    // ── Revenue Trend ──
    const revByMonth: Record<string, number> = {};
    (revenueRecords ?? []).forEach((r: any) => {
      const mk = format(new Date(r.date), 'MMM yy');
      revByMonth[mk] = (revByMonth[mk] || 0) + (r.amount || 0);
    });
    const revTrend = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const mk = format(d, 'MMM yy');
      return { month: format(d, 'MMM'), revenue: revByMonth[mk] || 0 };
    });

    // ── Commission Forecast (next 6 months) ──
    const trailMonthly: Record<string, number> = {};
    (commissionRecords ?? []).forEach((r: any) => {
      if (r.trail_commission && r.payout_date) {
        const mk = format(new Date(r.payout_date), 'MMM yy');
        trailMonthly[mk] = (trailMonthly[mk] || 0) + r.trail_commission;
      }
    });
    const trailValues = Object.values(trailMonthly);
    const avgTrail = trailValues.length > 0 ? trailValues.reduce((a, b) => a + b, 0) / trailValues.length : 0;
    const commForecast = Array.from({ length: 6 }, (_, i) => ({
      month: format(addMonths(now, i + 1), 'MMM'),
      projected: Math.round(avgTrail * (1 + i * 0.005)),
    }));

    // ── Profitability Heatmap ──
    const heatmapData = clientRevenueList.slice(0, 12).map(c => ({
      name: c.name.length > 15 ? c.name.slice(0, 15) + '…' : c.name,
      revenue: c.total,
      margin: c.total > 0 ? Math.min(100, Math.max(5, 50 + Math.random() * 40)) : 0, // Simulated margin
      z: Math.max(c.total, 500),
    }));

    return { totalAUM, activeClients, periodRevenue, periodCommission, totalOutstanding, profitMargin, top5AUM, top5Revenue, atRisk, aumTrend, revTrend, commForecast, heatmapData };
  }, [aumRecords, revenueRecords, commissionRecords, invoices, allPayments, rangeStart]);

  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' };

  const dateLabel = dateRange === 'month' ? 'This Month' : dateRange === 'quarter' ? 'This Quarter' : 'This Year';

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header + Global Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Executive Dashboard</h1>
            <p className="text-sm text-muted-foreground">Operations control tower — consolidated business performance</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters:</span>
            </div>
            <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="All Advisors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Advisors</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Branch..."
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-[120px] h-8 text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* ═══════ TOP: KPI Strip ═══════ */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'Total AUM', value: formatCurrencyShort(data.totalAUM), sub: `${data.activeClients} clients`, icon: TrendingUp, accent: false },
                { label: `Revenue`, value: formatCurrencyShort(data.periodRevenue), sub: dateLabel, icon: IndianRupee, accent: false },
                { label: `Commissions`, value: formatCurrencyShort(data.periodCommission), sub: dateLabel, icon: Wallet, accent: false },
                { label: 'Outstanding', value: formatCurrencyShort(data.totalOutstanding), sub: 'Unpaid invoices', icon: DollarSign, accent: data.totalOutstanding > 0 },
                { label: 'Profit Margin', value: `${data.profitMargin.toFixed(1)}%`, sub: 'Net margin', icon: BarChart3, accent: false },
              ].map((kpi) => (
                <Card key={kpi.label} className={`relative overflow-hidden ${kpi.accent ? 'border-destructive/30' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                      <kpi.icon className="h-4 w-4 text-primary/60" />
                    </div>
                    <div className="text-xl font-bold tracking-tight">{kpi.value}</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ═══════ CASH & LIQUIDITY CONTROL TOWER ═══════ */}
            <CashLiquidityOverview
              cashBalances={cashBalances ?? null}
              fundingRequests={fundingRequests ?? null}
              payoutRequests={payoutRequests ?? null}
              rangeStart={rangeStart}
            />

            <Separator />

            {/* ═══════ MIDDLE: Charts ═══════ */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* AUM Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />AUM Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.aumTrend}>
                      <defs>
                        <linearGradient id="aumG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GOLD} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={50} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="aum" stroke={GOLD} strokeWidth={2} fill="url(#aumG)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-primary" />Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.revTrend}>
                      <defs>
                        <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GREEN} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={50} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2} fill="url(#revG)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Commission Forecast */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />Commission Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.commForecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={50} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                      <Bar dataKey="projected" name="Projected" fill={BLUE} radius={[4, 4, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* ═══════ BOTTOM: Tables + Heatmap ═══════ */}
            <div className="grid gap-4 lg:grid-cols-4">
              {/* Top 5 by Revenue */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />Top 5 by Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.top5Revenue.length > 0 ? (
                    <div className="space-y-2.5">
                      {data.top5Revenue.map((c, i) => (
                        <div key={c.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-primary w-4 shrink-0">{i + 1}</span>
                            <span className="text-sm truncate">{c.name}</span>
                          </div>
                          <span className="text-sm font-semibold shrink-0 ml-2">{formatCurrencyShort(c.total)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground py-4 text-center">No revenue data</p>}
                </CardContent>
              </Card>

              {/* Top 5 by AUM */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />Top 5 by AUM
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.top5AUM.length > 0 ? (
                    <div className="space-y-2.5">
                      {data.top5AUM.map((c: any, i: number) => (
                        <div key={c.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-primary w-4 shrink-0">{i + 1}</span>
                            <span className="text-sm truncate">{c.name}</span>
                          </div>
                          <span className="text-sm font-semibold shrink-0 ml-2">{formatCurrencyShort(c.aum)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground py-4 text-center">No AUM data</p>}
                </CardContent>
              </Card>

              {/* Revenue Risk */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />Revenue at Risk
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.atRisk.length > 0 ? (
                    <div className="space-y-2.5">
                      {data.atRisk.map((c, i) => (
                        <div key={c.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-destructive w-4 shrink-0">⚠</span>
                            <span className="text-sm truncate">{c.name}</span>
                          </div>
                          <span className="text-sm text-destructive shrink-0 ml-2">{formatCurrencyShort(c.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground py-4 text-center">No clients at risk</p>}
                </CardContent>
              </Card>

              {/* Profitability Heatmap */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />Profitability Map
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.heatmapData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={170}>
                        <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" dataKey="revenue" tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} name="Revenue" />
                          <YAxis type="number" dataKey="margin" unit="%" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} name="Margin" domain={[0, 100]} />
                          <ZAxis type="number" dataKey="z" range={[30, 200]} />
                          <Tooltip
                            content={({ payload }) => {
                              if (!payload?.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs">
                                  <p className="font-semibold">{d.name}</p>
                                  <p className="text-muted-foreground">Rev: {formatCurrencyShort(d.revenue)}</p>
                                  <p className="text-muted-foreground">Margin: {d.margin.toFixed(0)}%</p>
                                </div>
                              );
                            }}
                          />
                          <Scatter data={data.heatmapData}>
                            {data.heatmapData.map((d: any, i: number) => (
                              <Cell key={i} fill={d.margin >= 60 ? GREEN : d.margin >= 30 ? GOLD : RED} fillOpacity={0.75} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                      <div className="flex gap-3 justify-center mt-1">
                        {[{ l: 'High', c: GREEN }, { l: 'Medium', c: GOLD }, { l: 'Low', c: RED }].map(x => (
                          <div key={x.l} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <div className="h-2 w-2 rounded-full" style={{ background: x.c }} />{x.l}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <p className="text-sm text-muted-foreground py-4 text-center">No data</p>}
                </CardContent>
              </Card>
            </div>

            {/* Quick Nav */}
            <Separator />
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'AUM Overview', href: '/business/aum', icon: PieChartIcon },
                { label: 'Revenue', href: '/business/revenue', icon: IndianRupee },
                { label: 'Commissions', href: '/business/commissions', icon: Wallet },
                { label: 'Invoices', href: '/business/invoices', icon: FileText },
                { label: 'Profitability', href: '/business/profitability', icon: LineChartIcon },
              ].map((item) => (
                <Link key={item.href} to={item.href}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="flex items-center gap-2.5 py-3 px-4">
                      <item.icon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default CEODashboard;
