import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
  BarChart, Bar, Cell, LineChart, Line, Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Activity, Banknote, TrendingUp, TrendingDown, BarChart3,
  Landmark, Clock, ArrowDownUp, CircleDollarSign, Shield, Gauge,
} from 'lucide-react';
import { computeAccountingReport, type AccountingReport, type CashLedgerEntry } from './accountingEngine';

// ─── Props ───

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

interface AccountingPerformanceViewProps {
  transactions: Transaction[];
  positions: Position[];
  selectedPortfolioId: string | null;
  getPortfolioName: (id: string) => string;
}

const CHART_COLORS = {
  primary: 'hsl(43, 74%, 49%)',
  success: 'hsl(160, 84%, 39%)',
  info: 'hsl(199, 89%, 48%)',
  warning: 'hsl(38, 92%, 50%)',
  destructive: 'hsl(0, 72%, 51%)',
  purple: 'hsl(280, 65%, 60%)',
};

const LEDGER_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  dividend: { label: 'Dividend', className: 'border-success/50 text-success' },
  fee: { label: 'Fee', className: 'border-destructive/50 text-destructive' },
  deposit: { label: 'Deposit', className: 'border-primary/50 text-primary' },
  withdrawal: { label: 'Withdrawal', className: 'border-warning/50 text-warning' },
  sell_proceeds: { label: 'Sell', className: 'border-success/50 text-success' },
  buy_outflow: { label: 'Buy', className: 'border-info/50 text-info' },
  accrual: { label: 'Accrual', className: 'border-purple/50 text-purple-500' },
  corporate_action: { label: 'Corp Action', className: 'border-warning/50 text-warning' },
};

export const AccountingPerformanceView = ({
  transactions,
  positions,
  selectedPortfolioId,
  getPortfolioName,
}: AccountingPerformanceViewProps) => {
  const [subTab, setSubTab] = useState('performance');

  const report = useMemo(
    () => computeAccountingReport(transactions, positions, selectedPortfolioId),
    [transactions, positions, selectedPortfolioId]
  );

  const perf = report.performance;

  return (
    <div className="space-y-4">
      {/* Header Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricMini icon={<CircleDollarSign className="h-4 w-4" />} label="Portfolio Value" value={formatCurrency(report.totalPortfolioValue)} />
        <MetricMini icon={<Banknote className="h-4 w-4" />} label="Cash Balance" value={formatCurrency(report.currentCashBalance)} />
        <MetricMini icon={<TrendingUp className="h-4 w-4" />} label="Income Received" value={formatCurrency(report.totalIncomeReceived)} variant="success" />
        <MetricMini icon={<ArrowDownUp className="h-4 w-4" />} label="Fees Deducted" value={formatCurrency(report.totalFeesDeducted)} variant="destructive" />
        <MetricMini icon={<Gauge className="h-4 w-4" />} label="TWR (Ann.)" value={`${perf.twr}%`} variant={perf.twr >= 0 ? 'success' : 'destructive'} />
        <MetricMini icon={<Activity className="h-4 w-4" />} label="IRR (Ann.)" value={`${perf.irr}%`} variant={perf.irr >= 0 ? 'success' : 'destructive'} />
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="performance" className="gap-1"><BarChart3 className="h-4 w-4" /> Performance</TabsTrigger>
          <TabsTrigger value="valuation" className="gap-1"><TrendingUp className="h-4 w-4" /> Daily Valuation</TabsTrigger>
          <TabsTrigger value="cashledger" className="gap-1"><Banknote className="h-4 w-4" /> Cash Ledger</TabsTrigger>
          <TabsTrigger value="corpactions" className="gap-1"><Landmark className="h-4 w-4" /> Corporate Actions</TabsTrigger>
          <TabsTrigger value="accruals" className="gap-1"><Clock className="h-4 w-4" /> Accruals</TabsTrigger>
        </TabsList>

        {/* ─── PERFORMANCE TAB ─── */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance Metrics Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Return Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <PerfRow label="Time-Weighted Return (Ann.)" value={`${perf.twr}%`} positive={perf.twr >= 0} />
                  <PerfRow label="TWR (Period)" value={`${perf.twrPeriod}%`} positive={perf.twrPeriod >= 0} />
                  <PerfRow label="Money-Weighted Return / IRR" value={`${perf.irr}%`} positive={perf.irr >= 0} />
                  <PerfRow label="Total Return" value={formatCurrency(perf.totalReturn)} positive={perf.totalReturn >= 0} sub={`${perf.totalReturnPct}%`} />
                  <div className="border-t border-border pt-2 mt-2" />
                  <PerfRow label="Benchmark Return (Nifty50 est.)" value={`${perf.benchmarkReturn}%`} neutral />
                  <PerfRow label="Alpha" value={`${perf.alpha > 0 ? '+' : ''}${perf.alpha}%`} positive={perf.alpha >= 0} />
                </div>
              </CardContent>
            </Card>

            {/* Risk Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Risk Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <PerfRow label="Volatility (Ann.)" value={`${perf.volatility}%`} neutral />
                  <PerfRow label="Sharpe Ratio" value={perf.sharpeRatio.toFixed(2)} positive={perf.sharpeRatio > 0} />
                  <PerfRow label="Max Drawdown" value={formatCurrency(perf.maxDrawdown)} positive={false} sub={`-${perf.maxDrawdownPct}%`} />
                </div>

                {/* Benchmark Comparison Bar */}
                <div className="mt-6">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Portfolio vs Benchmark</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={[
                      { name: 'Portfolio', value: perf.twr },
                      { name: 'Benchmark', value: 10 },
                      { name: 'Alpha', value: perf.alpha },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} />
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-sm font-medium">{payload[0].payload.name}</p>
                              <p className="text-sm text-primary">{(payload[0].value as number).toFixed(2)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        <Cell fill={CHART_COLORS.primary} />
                        <Cell fill={CHART_COLORS.info} />
                        <Cell fill={perf.alpha >= 0 ? CHART_COLORS.success : CHART_COLORS.destructive} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── DAILY VALUATION TAB ─── */}
        <TabsContent value="valuation" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Portfolio Value — 90 Day Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={report.dailyValuations}>
                  <defs>
                    <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.success} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => { try { return format(new Date(v), 'dd MMM'); } catch { return v; } }} interval={14} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => formatCurrency(v, true)} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-xs text-muted-foreground">{d.date}</p>
                          <p className="text-sm"><span className="text-muted-foreground">Portfolio:</span> <span className="font-medium">{formatCurrency(d.portfolioValue)}</span></p>
                          <p className="text-sm"><span className="text-muted-foreground">Cash:</span> <span className="font-medium">{formatCurrency(d.cashBalance)}</span></p>
                          <p className="text-sm"><span className="text-muted-foreground">Total:</span> <span className="font-semibold">{formatCurrency(d.totalValue)}</span></p>
                          <p className={cn('text-xs font-medium', d.dayChange >= 0 ? 'text-success' : 'text-destructive')}>{d.dayChange >= 0 ? '+' : ''}{formatCurrency(d.dayChange)} ({d.dayChangePct}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Legend />
                  <Area type="monotone" dataKey="portfolioValue" name="Portfolio" stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#valGrad)" />
                  <Area type="monotone" dataKey="cashBalance" name="Cash" stroke={CHART_COLORS.success} strokeWidth={1.5} fill="url(#cashGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily change mini chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily Change (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={report.dailyValuations.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => { try { return format(new Date(v), 'dd'); } catch { return v; } }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-xs">{payload[0].payload.date}</p>
                          <p className={cn('text-sm font-medium', (payload[0].value as number) >= 0 ? 'text-success' : 'text-destructive')}>{(payload[0].value as number).toFixed(3)}%</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="dayChangePct" radius={[2, 2, 0, 0]}>
                    {report.dailyValuations.slice(-30).map((v, i) => (
                      <Cell key={i} fill={v.dayChangePct >= 0 ? CHART_COLORS.success : CHART_COLORS.destructive} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── CASH LEDGER TAB ─── */}
        <TabsContent value="cashledger">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="h-4 w-4 text-primary" /> Cash Ledger Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.cashLedger.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No cash transactions recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Running Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.cashLedger.map(entry => {
                      const badge = LEDGER_TYPE_BADGE[entry.type] || { label: entry.type, className: '' };
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px]', badge.className)}>{badge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[300px] truncate">{entry.description}</TableCell>
                          <TableCell className={cn('text-right tabular-nums font-medium', entry.amount >= 0 ? 'text-success' : 'text-destructive')}>
                            {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(entry.runningBalance)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── CORPORATE ACTIONS TAB ─── */}
        <TabsContent value="corpactions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" /> Corporate Actions Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.corporateActions.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No corporate actions detected. Dividends, splits, bonuses, and mergers will appear here.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Security</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead className="text-right">Cash Impact</TableHead>
                      <TableHead className="text-right">Qty Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.corporateActions.map((ca, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{format(new Date(ca.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px] capitalize',
                            ca.type === 'dividend' ? 'border-success/50 text-success' :
                            ca.type === 'split' ? 'border-primary/50 text-primary' :
                            ca.type === 'bonus' ? 'border-info/50 text-info' :
                            'border-warning/50 text-warning'
                          )}>
                            {ca.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{ca.securityId}</TableCell>
                        <TableCell className="text-sm max-w-[250px] truncate">{ca.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{ca.impact}</TableCell>
                        <TableCell className={cn('text-right tabular-nums', ca.cashImpact > 0 ? 'text-success' : ca.cashImpact < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                          {ca.cashImpact !== 0 ? formatCurrency(ca.cashImpact) : '—'}
                        </TableCell>
                        <TableCell className={cn('text-right tabular-nums', ca.quantityImpact > 0 ? 'text-success' : 'text-muted-foreground')}>
                          {ca.quantityImpact > 0 ? `+${ca.quantityImpact}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ACCRUALS TAB ─── */}
        <TabsContent value="accruals">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Accrual Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.accruals.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No accrual data. Dividend/interest income history will generate accrual projections.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Security</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period Start</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead className="text-right">Accrued Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.accruals.map((ac, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{ac.securityId}</TableCell>
                        <TableCell className="capitalize text-sm">{ac.type.replace('_', ' ')}</TableCell>
                        <TableCell className="text-sm">{format(new Date(ac.startDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-sm">{format(new Date(ac.endDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-success">{formatCurrency(ac.accruedAmount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px]',
                            ac.status === 'accruing' ? 'border-warning/50 text-warning' :
                            ac.status === 'received' ? 'border-success/50 text-success' :
                            'border-destructive/50 text-destructive'
                          )}>
                            {ac.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Helper Components ───

function MetricMini({ icon, label, value, variant = 'default' }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'destructive';
}) {
  return (
    <Card>
      <CardContent className="pt-3 pb-2">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={cn(
            variant === 'success' ? 'text-success' :
            variant === 'destructive' ? 'text-destructive' :
            'text-primary'
          )}>{icon}</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <p className={cn('text-lg font-bold tabular-nums',
          variant === 'success' ? 'text-success' :
          variant === 'destructive' ? 'text-destructive' :
          'text-foreground'
        )}>{value}</p>
      </CardContent>
    </Card>
  );
}

function PerfRow({ label, value, positive, neutral, sub }: {
  label: string;
  value: string;
  positive?: boolean;
  neutral?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={cn('text-sm font-medium tabular-nums',
          neutral ? 'text-foreground' :
          positive ? 'text-success' : 'text-destructive'
        )}>{value}</span>
        {sub && <span className="text-xs text-muted-foreground ml-1">({sub})</span>}
      </div>
    </div>
  );
}
