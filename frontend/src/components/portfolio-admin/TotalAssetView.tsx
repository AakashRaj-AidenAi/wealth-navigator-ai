import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon,
  BarChart3, Activity, Globe,
} from 'lucide-react';

// ─── Simple FX rates to base currency (INR) ───
const FX_RATES: Record<string, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 91.2,
  GBP: 106.0,
};

const COLORS = [
  'hsl(43, 74%, 49%)',
  'hsl(199, 89%, 48%)',
  'hsl(160, 84%, 39%)',
  'hsl(280, 65%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(215, 20%, 55%)',
  'hsl(340, 75%, 55%)',
];

interface Portfolio {
  id: string;
  client_id: string;
  advisor_id: string;
  portfolio_name: string;
  base_currency: string;
  created_at: string;
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
  created_at: string;
}
interface Transaction {
  id: string;
  portfolio_id: string;
  security_id: string;
  transaction_type: string;
  quantity: number;
  price: number;
  total_amount: number;
  trade_date: string;
  settlement_date: string | null;
  notes: string | null;
  created_at: string;
}

interface TotalAssetViewProps {
  portfolios: Portfolio[];
  positions: Position[];
  transactions: Transaction[];
  displayCurrency: string;
}

export const TotalAssetView = ({ portfolios, positions, transactions, displayCurrency }: TotalAssetViewProps) => {
  const toDisplay = (amount: number, fromCurrency: string) => {
    const inINR = amount * (FX_RATES[fromCurrency] || 1);
    return inINR / (FX_RATES[displayCurrency] || 1);
  };

  const aggregated = useMemo(() => {
    let totalMV = 0;
    let totalCost = 0;
    let realizedGL = 0;
    let cashBalance = 0;
    const securityGroups: Record<string, { name: string; value: number }> = {};
    const portfolioValues: { name: string; value: number; client: string }[] = [];

    // Per-portfolio aggregation
    portfolios.forEach(portfolio => {
      const currency = portfolio.base_currency;
      const pPositions = positions.filter(p => p.portfolio_id === portfolio.id);
      let pMV = 0;
      let pCost = 0;

      pPositions.forEach(pos => {
        const mv = toDisplay(Number(pos.market_value || 0), currency);
        const cost = toDisplay(Number(pos.quantity) * Number(pos.average_cost), currency);
        pMV += mv;
        pCost += cost;

        // Group by security prefix as proxy for asset class
        const assetClass = classifyAsset(pos.security_id);
        if (!securityGroups[assetClass]) securityGroups[assetClass] = { name: assetClass, value: 0 };
        securityGroups[assetClass].value += mv;
      });

      totalMV += pMV;
      totalCost += pCost;

      // Realized G/L from sell transactions
      const pTxns = transactions.filter(t => t.portfolio_id === portfolio.id);
      pTxns.forEach(tx => {
        if (tx.transaction_type === 'sell') {
          realizedGL += toDisplay(Number(tx.total_amount), currency);
        }
        if (tx.transaction_type === 'dividend') {
          cashBalance += toDisplay(Number(tx.total_amount), currency);
        }
      });

      // Estimate cash from fee outflows
      pTxns.forEach(tx => {
        if (tx.transaction_type === 'fee') {
          cashBalance -= toDisplay(Number(tx.total_amount), currency);
        }
      });

      portfolioValues.push({
        name: portfolio.portfolio_name,
        value: pMV,
        client: (portfolio as any).clients?.client_name || 'Unknown',
      });
    });

    const unrealizedGL = totalMV - totalCost;
    const unrealizedPct = totalCost > 0 ? (unrealizedGL / totalCost) * 100 : 0;

    // Allocation percentages
    const allocationData = Object.values(securityGroups)
      .map(g => ({
        ...g,
        percentage: totalMV > 0 ? (g.value / totalMV) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Simulated trend data (last 12 months based on current value)
    const trendData = generateTrend(totalMV, 12);

    // Household-level grouping by client
    const householdMap: Record<string, { client: string; value: number; portfolioCount: number }> = {};
    portfolioValues.forEach(pv => {
      if (!householdMap[pv.client]) householdMap[pv.client] = { client: pv.client, value: 0, portfolioCount: 0 };
      householdMap[pv.client].value += pv.value;
      householdMap[pv.client].portfolioCount += 1;
    });
    const householdData = Object.values(householdMap).sort((a, b) => b.value - a.value);

    return {
      totalMV,
      totalCost,
      unrealizedGL,
      unrealizedPct,
      realizedGL,
      cashBalance,
      allocationData,
      portfolioValues,
      trendData,
      householdData,
    };
  }, [portfolios, positions, transactions, displayCurrency]);

  const currencyLabel = displayCurrency;

  return (
    <div className="space-y-6">
      {/* Currency indicator */}
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">All values displayed in</span>
        <Badge variant="outline">{currencyLabel}</Badge>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Portfolio Value"
          value={formatCurrency(aggregated.totalMV)}
          icon={<DollarSign className="h-4 w-4" />}
          subtitle={`Across ${portfolios.length} portfolio${portfolios.length !== 1 ? 's' : ''}`}
        />
        <SummaryCard
          title="Unrealized Gain/Loss"
          value={formatCurrency(aggregated.unrealizedGL)}
          icon={aggregated.unrealizedGL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          subtitle={`${aggregated.unrealizedPct >= 0 ? '+' : ''}${aggregated.unrealizedPct.toFixed(2)}%`}
          variant={aggregated.unrealizedGL >= 0 ? 'success' : 'destructive'}
        />
        <SummaryCard
          title="Realized Gain/Loss"
          value={formatCurrency(aggregated.realizedGL)}
          icon={<Activity className="h-4 w-4" />}
          subtitle="From sell transactions"
          variant={aggregated.realizedGL >= 0 ? 'success' : 'destructive'}
        />
        <SummaryCard
          title="Cash Balance"
          value={formatCurrency(aggregated.cashBalance)}
          icon={<Wallet className="h-4 w-4" />}
          subtitle="Dividends less fees"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Allocation Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aggregated.allocationData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">No position data to display.</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative w-44 h-44 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={aggregated.allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="percentage"
                      >
                        {aggregated.allocationData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-sm font-medium">{data.name}</p>
                                <p className="text-sm text-primary">{formatCurrency(data.value, true)}</p>
                                <p className="text-xs text-muted-foreground">{data.percentage.toFixed(1)}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-lg font-semibold">{formatCurrency(aggregated.totalMV, true)}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {aggregated.allocationData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium tabular-nums">{item.percentage.toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatCurrency(item.value, true)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Class Breakdown Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Asset Class Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aggregated.allocationData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">No position data to display.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={aggregated.allocationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => formatCurrency(v, true)} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-medium">{payload[0].payload.name}</p>
                            <p className="text-sm text-primary">{formatCurrency(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {aggregated.allocationData.map((_, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Value Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Portfolio Value Trend (12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={aggregated.trendData}>
              <defs>
                <linearGradient id="totalValueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => formatCurrency(v, true)} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-sm font-medium">{payload[0].payload.month}</p>
                        <p className="text-sm text-primary">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(43, 74%, 49%)"
                strokeWidth={2}
                fill="url(#totalValueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Household Breakdown */}
      {aggregated.householdData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Household / Client Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aggregated.householdData.map((hh, i) => {
                const pct = aggregated.totalMV > 0 ? (hh.value / aggregated.totalMV) * 100 : 0;
                return (
                  <div key={hh.client} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                        {hh.client.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{hh.client}</p>
                        <p className="text-xs text-muted-foreground">{hh.portfolioCount} portfolio{hh.portfolioCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(hh.value)}</p>
                      <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% of total</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Helpers ───

function classifyAsset(securityId: string): string {
  const id = securityId.toUpperCase();
  // Simple heuristic classification
  const bonds = ['BOND', 'GSEC', 'SDL', 'NCD', 'FD', 'TBILL', 'GILT'];
  const gold = ['GOLD', 'SGOLD', 'GOLDBEES'];
  const realestate = ['REIT', 'REALTY', 'EMBASSY', 'MINDSPACE', 'BROOKFIELD'];
  const mf = ['MF', 'FUND', 'ETF', 'NIFTY', 'SENSEX', 'INDEX'];
  const cash = ['CASH', 'LIQUID', 'OVERNIGHT', 'MONEY'];

  if (bonds.some(b => id.includes(b))) return 'Fixed Income';
  if (gold.some(g => id.includes(g))) return 'Gold';
  if (realestate.some(r => id.includes(r))) return 'Real Estate';
  if (mf.some(m => id.includes(m))) return 'Mutual Funds';
  if (cash.some(c => id.includes(c))) return 'Cash & Equivalents';
  return 'Equities';
}

function generateTrend(currentValue: number, months: number) {
  const data: { month: string; value: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    // Simulate growth with some variance
    const factor = 1 - (i * 0.02) + (Math.sin(i * 0.8) * 0.03);
    data.push({ month: monthLabel, value: Math.round(currentValue * Math.max(factor, 0.7)) });
  }
  return data;
}

// ─── Summary Card Component ───

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle: string;
  variant?: 'default' | 'success' | 'destructive';
}

function SummaryCard({ title, value, icon, subtitle, variant = 'default' }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center',
            variant === 'success' && 'bg-success/10 text-success',
            variant === 'destructive' && 'bg-destructive/10 text-destructive',
            variant === 'default' && 'bg-primary/10 text-primary',
          )}>
            {icon}
          </div>
        </div>
        <p className={cn(
          'text-2xl font-bold tabular-nums',
          variant === 'success' && 'text-success',
          variant === 'destructive' && 'text-destructive',
        )}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
