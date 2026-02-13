import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCommissionRecords, useRevenueRecords } from '@/hooks/useBusiness';
import { formatCurrency, formatCurrencyShort } from '@/lib/currency';
import { Loader2, Wallet, TrendingUp, AlertTriangle, ArrowUpRight, CalendarClock } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { format, subMonths, addMonths, parseISO, isAfter, isBefore } from 'date-fns';

const CHART_COLORS = [
  'hsl(43, 74%, 49%)',
  'hsl(160, 84%, 39%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 65%, 60%)',
  'hsl(340, 75%, 55%)',
  'hsl(25, 95%, 53%)',
  'hsl(210, 70%, 55%)',
];

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

const Commissions = () => {
  const { data: commRecords, isLoading: commLoading } = useCommissionRecords();
  const { data: revRecords, isLoading: revLoading } = useRevenueRecords();
  const isLoading = commLoading || revLoading;

  const analysis = useMemo(() => {
    if (!commRecords?.length) return null;
    const now = new Date();

    // Totals
    const totalUpfront = commRecords.reduce((s: number, r: any) => s + (r.upfront_commission || 0), 0);
    const totalTrail = commRecords.reduce((s: number, r: any) => s + (r.trail_commission || 0), 0);
    const totalCommission = totalUpfront + totalTrail;

    // Recurring revenue from revenue_records
    const recurringRevenue = revRecords?.filter((r: any) => r.recurring).reduce((s: number, r: any) => s + (r.amount || 0), 0) ?? 0;

    // Monthly breakdown (last 12 months)
    const monthlyMap = new Map<string, { upfront: number; trail: number }>();
    for (let i = 11; i >= 0; i--) {
      const key = format(subMonths(now, i), 'yyyy-MM');
      monthlyMap.set(key, { upfront: 0, trail: 0 });
    }
    commRecords.forEach((r: any) => {
      if (!r.payout_date) return;
      const key = r.payout_date.substring(0, 7);
      const entry = monthlyMap.get(key);
      if (entry) {
        entry.upfront += r.upfront_commission || 0;
        entry.trail += r.trail_commission || 0;
      }
    });
    const monthlyData = Array.from(monthlyMap.entries()).map(([key, val]) => ({
      month: format(parseISO(key + '-01'), 'MMM yy'),
      upfront: val.upfront,
      trail: val.trail,
      total: val.upfront + val.trail,
    }));

    // By client
    const clientMap = new Map<string, { name: string; upfront: number; trail: number }>();
    commRecords.forEach((r: any) => {
      const name = r.clients?.client_name ?? 'Unknown';
      const entry = clientMap.get(r.client_id) ?? { name, upfront: 0, trail: 0 };
      entry.upfront += r.upfront_commission || 0;
      entry.trail += r.trail_commission || 0;
      clientMap.set(r.client_id, entry);
    });
    const byClient = Array.from(clientMap.values())
      .map(c => ({ ...c, total: c.upfront + c.trail }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // By product
    const productMap = new Map<string, number>();
    commRecords.forEach((r: any) => {
      const prev = productMap.get(r.product_name) ?? 0;
      productMap.set(r.product_name, prev + (r.upfront_commission || 0) + (r.trail_commission || 0));
    });
    const byProduct = Array.from(productMap.entries())
      .map(([name, value]) => ({ name: name.substring(0, 18), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    // 12-month forecast based on average monthly trail
    const trailMonths = monthlyData.filter(m => m.trail > 0);
    const avgMonthlyTrail = trailMonths.length > 0
      ? trailMonths.reduce((s, m) => s + m.trail, 0) / trailMonths.length
      : 0;
    const forecastData = Array.from({ length: 12 }, (_, i) => {
      const d = addMonths(now, i + 1);
      return {
        month: format(d, 'MMM yy'),
        projected: Math.round(avgMonthlyTrail * (1 + i * 0.005)), // slight growth
      };
    });
    const totalForecast12m = forecastData.reduce((s, d) => s + d.projected, 0);

    // Alerts
    const alerts: { type: 'warning' | 'info'; message: string }[] = [];
    // Missing commission: records with no payout date
    const missingPayout = commRecords.filter((r: any) => !r.payout_date);
    if (missingPayout.length > 0) {
      alerts.push({ type: 'warning', message: `${missingPayout.length} commission record(s) missing payout date` });
    }
    // Delayed payouts: payout_date in the past but trail=0 could indicate issue
    const threeMonthsAgo = subMonths(now, 3);
    const staleRecords = commRecords.filter((r: any) => {
      if (!r.payout_date) return false;
      return isBefore(parseISO(r.payout_date), threeMonthsAgo) && (r.trail_commission || 0) === 0 && (r.upfront_commission || 0) === 0;
    });
    if (staleRecords.length > 0) {
      alerts.push({ type: 'warning', message: `${staleRecords.length} record(s) with past payout date and zero commission — possible delayed payout` });
    }
    if (avgMonthlyTrail === 0) {
      alerts.push({ type: 'info', message: 'No trail commissions recorded yet. Forecast will improve with data.' });
    }

    return {
      totalUpfront, totalTrail, totalCommission, recurringRevenue,
      monthlyData, byClient, byProduct,
      forecastData, totalForecast12m, avgMonthlyTrail,
      alerts,
    };
  }, [commRecords, revRecords]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </MainLayout>
    );
  }

  if (!commRecords?.length || !analysis) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
            <p className="text-muted-foreground">Upfront and trail commission tracking</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No commission records yet.</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
          <p className="text-muted-foreground">Upfront, trail &amp; recurring income tracking</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyShort(analysis.totalCommission)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upfront</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyShort(analysis.totalUpfront)}</div>
              <p className="text-xs text-muted-foreground">{analysis.totalCommission > 0 ? (analysis.totalUpfront / analysis.totalCommission * 100).toFixed(0) : 0}% of total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trail</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyShort(analysis.totalTrail)}</div>
              <p className="text-xs text-muted-foreground">Avg {formatCurrencyShort(analysis.avgMonthlyTrail)}/mo</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">12-Month Forecast</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyShort(analysis.totalForecast12m)}</div>
              <p className="text-xs text-muted-foreground">Projected trail income</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {analysis.alerts.length > 0 && (
          <div className="space-y-2">
            {analysis.alerts.map((alert, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${alert.type === 'warning' ? 'border-warning/50 bg-warning/5 text-warning' : 'border-border bg-muted/30 text-muted-foreground'}`}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        <Tabs defaultValue="monthly" className="space-y-4">
          <TabsList>
            <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
            <TabsTrigger value="clients">By Client</TabsTrigger>
            <TabsTrigger value="products">By Product</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>

          {/* Monthly commission chart */}
          <TabsContent value="monthly">
            <Card>
              <CardHeader><CardTitle>Monthly Commission (Last 12 Months)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analysis.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="upfront" name="Upfront" fill="hsl(43, 74%, 49%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="trail" name="Trail" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top revenue-generating clients */}
          <TabsContent value="clients">
            <Card>
              <CardHeader><CardTitle>Top 10 Revenue-Generating Clients</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analysis.byClient} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="upfront" name="Upfront" fill="hsl(43, 74%, 49%)" stackId="a" />
                    <Bar dataKey="trail" name="Trail" fill="hsl(160, 84%, 39%)" stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product revenue breakdown */}
          <TabsContent value="products">
            <Card>
              <CardHeader><CardTitle>Product Revenue Breakdown</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={analysis.byProduct} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {analysis.byProduct.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {analysis.byProduct.map((d: any, i: number) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {d.name}: {formatCurrencyShort(d.value)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 12-month forecast */}
          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle>12-Month Trail Commission Forecast</CardTitle>
                <p className="text-sm text-muted-foreground">Based on average monthly trail of {formatCurrency(analysis.avgMonthlyTrail)}</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={analysis.forecastData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="projected" name="Projected Trail" stroke="hsl(199, 89%, 48%)" strokeWidth={2.5} strokeDasharray="6 3" dot={{ fill: 'hsl(199, 89%, 48%)', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Commission Records Table */}
        <Card>
          <CardHeader><CardTitle>Commission Records</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Upfront</TableHead>
                  <TableHead className="text-right">Trail</TableHead>
                  <TableHead>Payout Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commRecords.map((r: any) => {
                  const hasMissing = !r.payout_date;
                  const isZero = (r.upfront_commission || 0) === 0 && (r.trail_commission || 0) === 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.clients?.client_name ?? '—'}</TableCell>
                      <TableCell>{r.product_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.upfront_commission)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.trail_commission)}</TableCell>
                      <TableCell>{r.payout_date ?? '—'}</TableCell>
                      <TableCell>
                        {hasMissing ? (
                          <Badge variant="outline" className="text-warning border-warning/50">Missing Date</Badge>
                        ) : isZero ? (
                          <Badge variant="outline" className="text-destructive border-destructive/50">Pending</Badge>
                        ) : (
                          <Badge variant="outline" className="text-success border-success/50">Received</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Commissions;
