import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyShort, formatCurrency } from '@/lib/currency';
import {
  Banknote, Clock, ArrowDownToLine, ArrowUpFromLine, CheckCircle2,
  Droplets, Activity, TrendingUp, TrendingDown, ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  AreaChart, Area, Legend
} from 'recharts';
import { format, subMonths, isAfter, isBefore } from 'date-fns';

const GOLD = 'hsl(43, 74%, 49%)';
const GREEN = 'hsl(160, 84%, 39%)';
const BLUE = 'hsl(199, 89%, 48%)';
const RED = 'hsl(340, 75%, 55%)';
const PURPLE = 'hsl(280, 65%, 60%)';

interface CashLiquidityProps {
  cashBalances: any[] | null;
  fundingRequests: any[] | null;
  payoutRequests: any[] | null;
  rangeStart: Date;
}

export const CashLiquidityOverview = ({
  cashBalances,
  fundingRequests,
  payoutRequests,
  rangeStart,
}: CashLiquidityProps) => {
  const metrics = useMemo(() => {
    const now = new Date();

    // Total client cash
    const totalCash = (cashBalances ?? []).reduce(
      (s, r) => s + (r.available_cash || 0) + (r.pending_cash || 0), 0
    );
    const availableCash = (cashBalances ?? []).reduce((s, r) => s + (r.available_cash || 0), 0);
    const pendingCash = (cashBalances ?? []).reduce((s, r) => s + (r.pending_cash || 0), 0);

    // Funding requests in range
    const filteredFunding = (fundingRequests ?? []).filter(
      (r) => isAfter(new Date(r.created_at), rangeStart)
    );
    const pendingFunding = filteredFunding.filter(
      (r) => !['completed', 'cancelled', 'rejected'].includes(r.status)
    );
    const pendingFundingAmount = pendingFunding.reduce((s, r) => s + (r.amount || 0), 0);

    // Pending settlements
    const pendingSettlements = filteredFunding.filter(
      (r) => r.workflow_stage === 'settlement_pending' || r.status === 'processing'
    );
    const pendingSettlementAmount = pendingSettlements.reduce((s, r) => s + (r.amount || 0), 0);

    // Payout requests in range
    const filteredPayouts = (payoutRequests ?? []).filter(
      (r) => isAfter(new Date(r.requested_date || r.created_at), rangeStart)
    );
    const pendingPayouts = filteredPayouts.filter(
      (r) => !['completed', 'cancelled', 'rejected', 'reversed'].includes(r.status)
    );
    const pendingPayoutAmount = pendingPayouts.reduce((s, r) => s + (r.amount || 0), 0);

    const completedPayouts = filteredPayouts.filter((r) => r.status === 'completed');
    const completedPayoutAmount = completedPayouts.reduce((s, r) => s + (r.amount || 0), 0);

    // Liquidity ratio: available cash / (pending payouts + pending settlements)
    const obligations = pendingPayoutAmount + pendingSettlementAmount;
    const liquidityRatio = obligations > 0 ? availableCash / obligations : availableCash > 0 ? 99.9 : 0;

    // Net cash flow
    const totalInflow = filteredFunding
      .filter((r) => r.status === 'completed')
      .reduce((s, r) => s + (r.amount || 0), 0);
    const totalOutflow = completedPayoutAmount;
    const netCashFlow = totalInflow - totalOutflow;

    // Cash flow trend (last 6 months)
    const cashFlowTrend = Array.from({ length: 6 }, (_, i) => {
      const monthStart = subMonths(now, 5 - i);
      const monthEnd = subMonths(now, 4 - i);
      const monthLabel = format(monthStart, 'MMM');

      const inflow = (fundingRequests ?? [])
        .filter((r) => {
          const d = new Date(r.created_at);
          return r.status === 'completed' && isAfter(d, monthStart) && isBefore(d, monthEnd);
        })
        .reduce((s, r) => s + (r.amount || 0), 0);

      const outflow = (payoutRequests ?? [])
        .filter((r) => {
          const d = new Date(r.requested_date || r.created_at);
          return r.status === 'completed' && isAfter(d, monthStart) && isBefore(d, monthEnd);
        })
        .reduce((s, r) => s + (r.amount || 0), 0);

      return { month: monthLabel, inflow, outflow, net: inflow - outflow };
    });

    // Status breakdown for waterfall
    const waterfall = [
      { name: 'Available Cash', value: availableCash, color: GREEN },
      { name: 'Pending Cash', value: pendingCash, color: GOLD },
      { name: 'Pending Funding', value: pendingFundingAmount, color: BLUE },
      { name: 'Pending Settlements', value: pendingSettlementAmount, color: PURPLE },
      { name: 'Pending Payouts', value: pendingPayoutAmount, color: RED },
    ];

    return {
      totalCash, availableCash, pendingCash,
      pendingFundingAmount, pendingFunding: pendingFunding.length,
      pendingSettlementAmount, pendingSettlements: pendingSettlements.length,
      pendingPayoutAmount, pendingPayoutCount: pendingPayouts.length,
      completedPayoutAmount, completedPayoutCount: completedPayouts.length,
      liquidityRatio, netCashFlow, totalInflow, totalOutflow,
      cashFlowTrend, waterfall,
    };
  }, [cashBalances, fundingRequests, payoutRequests, rangeStart]);

  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  const liquidityStatus = metrics.liquidityRatio >= 2
    ? { label: 'Healthy', variant: 'default' as const, color: 'text-success' }
    : metrics.liquidityRatio >= 1
    ? { label: 'Adequate', variant: 'secondary' as const, color: 'text-warning' }
    : { label: 'Critical', variant: 'destructive' as const, color: 'text-destructive' };

  const kpis = [
    {
      label: 'Total Client Cash',
      value: formatCurrencyShort(metrics.totalCash),
      sub: `${formatCurrencyShort(metrics.availableCash)} available`,
      icon: Banknote,
      accent: false,
    },
    {
      label: 'Pending Settlements',
      value: formatCurrencyShort(metrics.pendingSettlementAmount),
      sub: `${metrics.pendingSettlements} transactions`,
      icon: Clock,
      accent: metrics.pendingSettlements > 5,
    },
    {
      label: 'Pending Funding',
      value: formatCurrencyShort(metrics.pendingFundingAmount),
      sub: `${metrics.pendingFunding} requests`,
      icon: ArrowDownToLine,
      accent: false,
    },
    {
      label: 'Pending Payouts',
      value: formatCurrencyShort(metrics.pendingPayoutAmount),
      sub: `${metrics.pendingPayoutCount} requests`,
      icon: ArrowUpFromLine,
      accent: metrics.pendingPayoutCount > 3,
    },
    {
      label: 'Completed Payouts',
      value: formatCurrencyShort(metrics.completedPayoutAmount),
      sub: `${metrics.completedPayoutCount} processed`,
      icon: CheckCircle2,
      accent: false,
    },
    {
      label: 'Liquidity Ratio',
      value: `${Math.min(metrics.liquidityRatio, 99.9).toFixed(1)}x`,
      sub: liquidityStatus.label,
      icon: Droplets,
      accent: metrics.liquidityRatio < 1,
      badge: liquidityStatus,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-1 rounded-full bg-primary" />
        <div>
          <h2 className="text-lg font-bold tracking-tight">Cash & Liquidity Control Tower</h2>
          <p className="text-xs text-muted-foreground">Real-time operational liquidity monitoring</p>
        </div>
        {metrics.liquidityRatio < 1.5 && (
          <Badge variant="destructive" className="ml-auto gap-1">
            <ShieldAlert className="h-3 w-3" /> Low Liquidity
          </Badge>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`relative overflow-hidden ${kpi.accent ? 'border-destructive/30' : ''}`}>
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
                  {kpi.label}
                </span>
                <kpi.icon className="h-3.5 w-3.5 text-primary/60" />
              </div>
              <div className="text-lg font-bold tracking-tight">{kpi.value}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                {kpi.badge && (
                  <Badge variant={kpi.badge.variant} className="text-[9px] px-1.5 py-0 h-4">
                    {kpi.badge.label}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Net Cash Flow Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Net Cash Flow (Inflow vs Outflow)
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-success" />
                Inflow: {formatCurrencyShort(metrics.totalInflow)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-destructive" />
                Outflow: {formatCurrencyShort(metrics.totalOutflow)}
              </span>
              <span className={`font-semibold ${metrics.netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                Net: {metrics.netCashFlow >= 0 ? '+' : ''}{formatCurrencyShort(metrics.netCashFlow)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={metrics.cashFlowTrend}>
                <defs>
                  <linearGradient id="inflowG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outflowG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={RED} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={55} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="inflow" name="Inflows" stroke={GREEN} strokeWidth={2} fill="url(#inflowG)" />
                <Area type="monotone" dataKey="outflow" name="Outflows" stroke={RED} strokeWidth={2} fill="url(#outflowG)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cash Position Waterfall */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              Cash Position Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metrics.waterfall} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={110} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                  {metrics.waterfall.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
