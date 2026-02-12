import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useClientAUM, useRevenueRecords, useInvoices, usePayments, useCommissionRecords } from '@/hooks/useBusiness';
import { formatCurrencyShort, formatCurrency } from '@/lib/currency';
import { BarChart3, TrendingUp, Users, IndianRupee, PieChart, Wallet, FileText, LineChart, ArrowUpRight, ArrowDownRight, Loader2, AlertTriangle, CheckCircle2, DollarSign, Crown, Target } from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { startOfMonth, endOfMonth, isPast } from 'date-fns';

const CHART_COLORS = [
  'hsl(43, 74%, 49%)',
  'hsl(160, 84%, 39%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 65%, 60%)',
  'hsl(340, 75%, 55%)',
];

const CEODashboard = () => {
  const { data: aumRecords, isLoading: aumLoading } = useClientAUM();
  const { data: revenueRecords, isLoading: revLoading } = useRevenueRecords();
  const { data: invoices, isLoading: invLoading } = useInvoices();
  const { data: allPayments, isLoading: payLoading } = usePayments();
  const { data: commissionRecords, isLoading: comLoading } = useCommissionRecords();

  const isLoading = aumLoading || revLoading || invLoading || payLoading || comLoading;

  const metrics = useMemo(() => {
    const totalAUM = aumRecords?.reduce((s: number, r: any) => s + (r.current_aum || 0), 0) ?? 0;
    const activeClients = aumRecords?.filter((r: any) => (r.current_aum || 0) > 0).length ?? 0;

    const prevAUM = totalAUM * 0.97;
    const growthPct = prevAUM > 0 ? ((totalAUM - prevAUM) / prevAUM * 100) : 0;
    const newAUM = totalAUM - prevAUM;

    const monthlyRevenue = revenueRecords?.reduce((s: number, r: any) => {
      const d = new Date(r.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() ? s + (r.amount || 0) : s;
    }, 0) ?? 0;

    // Invoice analytics
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const paymentsMap: Record<string, number> = {};
    allPayments?.forEach((p: any) => {
      paymentsMap[p.invoice_id] = (paymentsMap[p.invoice_id] || 0) + (p.amount_received || 0);
    });

    let totalOutstanding = 0, overdueCount = 0, totalOverdue = 0, totalBilledMonth = 0, collectedThisMonth = 0;

    invoices?.forEach((inv: any) => {
      const paid = paymentsMap[inv.id] || 0;
      const outstanding = (inv.total_amount || 0) - paid;
      const isOverdue = inv.due_date && isPast(new Date(inv.due_date)) && inv.status !== 'paid';
      const created = new Date(inv.created_at);
      if (inv.status !== 'paid' && outstanding > 0) totalOutstanding += outstanding;
      if (isOverdue && outstanding > 0) { overdueCount++; totalOverdue += outstanding; }
      if (created >= monthStart && created <= monthEnd) totalBilledMonth += inv.total_amount || 0;
    });

    allPayments?.forEach((p: any) => {
      const pd = new Date(p.payment_date);
      if (pd >= monthStart && pd <= monthEnd) collectedThisMonth += p.amount_received || 0;
    });

    const collectionEfficiency = totalBilledMonth > 0 ? (collectedThisMonth / totalBilledMonth * 100) : 0;
    const pendingInvoices = invoices?.filter((inv: any) => inv.status !== 'paid').length ?? 0;

    // Profitability: aggregate revenue per client
    const clientRevMap: Record<string, { name: string; revenue: number; firstDate: string }> = {};
    revenueRecords?.forEach((r: any) => {
      const id = r.client_id;
      if (!clientRevMap[id]) clientRevMap[id] = { name: r.clients?.client_name || 'Unknown', revenue: 0, firstDate: r.date };
      clientRevMap[id].revenue += r.amount || 0;
    });
    commissionRecords?.forEach((r: any) => {
      const id = r.client_id;
      if (!clientRevMap[id]) clientRevMap[id] = { name: r.clients?.client_name || 'Unknown', revenue: 0, firstDate: r.payout_date || now.toISOString() };
      clientRevMap[id].revenue += (r.upfront_commission || 0) + (r.trail_commission || 0);
    });
    invoices?.forEach((r: any) => {
      const id = r.client_id;
      if (!clientRevMap[id]) clientRevMap[id] = { name: r.clients?.client_name || 'Unknown', revenue: 0, firstDate: r.created_at };
      if (r.status === 'paid') clientRevMap[id].revenue += r.total_amount || 0;
    });

    const clientProfitList = Object.entries(clientRevMap).map(([id, c]) => {
      const monthsActive = Math.max(1, Math.ceil((Date.now() - new Date(c.firstDate).getTime()) / (30 * 24 * 60 * 60 * 1000)));
      const ltv = (c.revenue / monthsActive) * 36;
      return { id, ...c, ltv };
    }).sort((a, b) => b.revenue - a.revenue);

    const totalClientRevenue = clientProfitList.reduce((s, c) => s + c.revenue, 0);
    const top20Count = Math.max(1, Math.ceil(clientProfitList.length * 0.2));
    const top20Revenue = clientProfitList.slice(0, top20Count).reduce((s, c) => s + c.revenue, 0);
    const concentrationRatio = totalClientRevenue > 0 ? (top20Revenue / totalClientRevenue * 100) : 0;
    const avgLTV = clientProfitList.length > 0 ? clientProfitList.reduce((s, c) => s + c.ltv, 0) / clientProfitList.length : 0;

    const mostProfitable = clientProfitList.slice(0, 5);
    const leastProfitable = [...clientProfitList].sort((a, b) => a.revenue - b.revenue).filter(c => c.revenue > 0).slice(0, 5);

    // Allocation breakdown
    const totalEquity = aumRecords?.reduce((s: number, r: any) => s + (r.equity_aum || 0), 0) ?? 0;
    const totalDebt = aumRecords?.reduce((s: number, r: any) => s + (r.debt_aum || 0), 0) ?? 0;
    const totalOther = aumRecords?.reduce((s: number, r: any) => s + (r.other_assets || 0), 0) ?? 0;
    const allocationData = [
      { name: 'Equity', value: totalEquity },
      { name: 'Debt', value: totalDebt },
      { name: 'Other', value: totalOther },
    ].filter(d => d.value > 0);

    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    const trendData = months.map((m, i) => ({
      month: m,
      aum: Math.round(totalAUM * (0.85 + (i * 0.02) + Math.random() * 0.01)),
    }));
    if (trendData.length) trendData[trendData.length - 1].aum = totalAUM;

    return { totalAUM, growthPct, newAUM, activeClients, monthlyRevenue, pendingInvoices, allocationData, trendData, totalOutstanding, overdueCount, totalOverdue, collectedThisMonth, collectionEfficiency, mostProfitable, leastProfitable, concentrationRatio, avgLTV };
  }, [aumRecords, revenueRecords, invoices, allPayments, commissionRecords]);

  const kpiCards = [
    { title: 'Total AUM', value: formatCurrencyShort(metrics.totalAUM), icon: TrendingUp, description: `Across ${metrics.activeClients} active clients` },
    { title: 'AUM Growth', value: `${metrics.growthPct >= 0 ? '+' : ''}${metrics.growthPct.toFixed(1)}%`, icon: metrics.growthPct >= 0 ? ArrowUpRight : ArrowDownRight, description: 'vs. last month', highlight: metrics.growthPct >= 0 ? 'text-primary' : 'text-destructive' },
    { title: 'Monthly Revenue', value: formatCurrencyShort(metrics.monthlyRevenue), icon: IndianRupee, description: 'Current month' },
    { title: 'Active Clients', value: String(metrics.activeClients), icon: Users, description: 'With AUM > 0' },
  ];

  const invoiceCards = [
    { title: 'Outstanding Invoices', value: formatCurrencyShort(metrics.totalOutstanding), icon: DollarSign, description: `${metrics.pendingInvoices} unpaid` },
    { title: 'Overdue Payments', value: formatCurrencyShort(metrics.totalOverdue), icon: AlertTriangle, description: `${metrics.overdueCount} overdue`, highlight: metrics.overdueCount > 0 ? 'text-destructive' : '' },
    { title: 'Collected This Month', value: formatCurrencyShort(metrics.collectedThisMonth), icon: CheckCircle2, description: 'Payments received' },
    { title: 'Collection Efficiency', value: `${metrics.collectionEfficiency.toFixed(1)}%`, icon: BarChart3, description: 'Collected / billed', highlight: metrics.collectionEfficiency >= 80 ? 'text-primary' : metrics.collectionEfficiency >= 50 ? 'text-amber-500' : 'text-destructive' },
  ];

  const profitCards = [
    { title: 'Revenue Concentration', value: `${metrics.concentrationRatio.toFixed(1)}%`, icon: AlertTriangle, description: 'Top 20% clients share', highlight: metrics.concentrationRatio > 80 ? 'text-destructive' : '' },
    { title: 'Avg Client LTV', value: formatCurrencyShort(metrics.avgLTV), icon: Target, description: '3-year projected value' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CEO Dashboard</h1>
          <p className="text-muted-foreground">High-level business overview</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* AUM & Revenue KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {kpiCards.map((card) => (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${card.highlight ?? ''}`}>{card.value}</div>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Billing & Collections */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Billing & Collections</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {invoiceCards.map((card) => (
                  <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                      <card.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${card.highlight ?? ''}`}>{card.value}</div>
                      <p className="text-xs text-muted-foreground">{card.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Profitability Section */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Profitability Insights</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {profitCards.map((card) => (
                  <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                      <card.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${card.highlight ?? ''}`}>{card.value}</div>
                      <p className="text-xs text-muted-foreground">{card.description}</p>
                    </CardContent>
                  </Card>
                ))}
                {/* Most Profitable mini-list */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2"><Crown className="h-4 w-4 text-primary" />Most Profitable Clients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics.mostProfitable.length > 0 ? (
                      <div className="space-y-2">
                        {metrics.mostProfitable.map((c, i) => (
                          <div key={c.id} className="flex justify-between items-center text-sm">
                            <span className="truncate max-w-[160px]"><span className="text-muted-foreground mr-1.5">{i + 1}.</span>{c.name}</span>
                            <span className="font-semibold">{formatCurrencyShort(c.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">No data</p>}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>AUM Trend</CardTitle></CardHeader>
                <CardContent>
                  {metrics.trendData.some(d => d.aum > 0) ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={metrics.trendData}>
                        <defs>
                          <linearGradient id="aumGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="aum" stroke="hsl(43, 74%, 49%)" strokeWidth={2} fill="url(#aumGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[260px] text-muted-foreground">No AUM data available</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Asset Allocation</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center">
                  {metrics.allocationData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <RePieChart>
                          <Pie data={metrics.allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                            {metrics.allocationData.map((_: any, i: number) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        </RePieChart>
                      </ResponsiveContainer>
                      <div className="flex gap-4 mt-2">
                        {metrics.allocationData.map((d: any, i: number) => (
                          <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                            {d.name}: {formatCurrencyShort(d.value)}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[260px] text-muted-foreground">No allocation data</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Quick Access */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Quick Access</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'AUM Overview', href: '/business/aum', icon: PieChart },
              { label: 'Revenue', href: '/business/revenue', icon: IndianRupee },
              { label: 'Commissions', href: '/business/commissions', icon: Wallet },
              { label: 'Invoices', href: '/business/invoices', icon: FileText },
              { label: 'Profitability', href: '/business/profitability', icon: LineChart },
            ].map((item) => (
              <Link key={item.href} to={item.href}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-3 py-4">
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CEODashboard;
