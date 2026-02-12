import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Calculator, Download, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Clock, Calendar, FileText,
} from 'lucide-react';
import {
  computeCostBasisReport, exportCapitalGainsCSV,
  type CostBasisMethod, type CostBasisReport, type PositionCostBasis,
} from './costBasisEngine';

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

interface CostBasisViewProps {
  transactions: Transaction[];
  positions: Position[];
  selectedPortfolioId: string | null;
  getPortfolioName: (id: string) => string;
}

const METHOD_LABELS: Record<CostBasisMethod, string> = {
  fifo: 'FIFO (First In, First Out)',
  lifo: 'LIFO (Last In, First Out)',
  average: 'Average Cost',
  specific: 'Specific Identification',
};

export const CostBasisView = ({
  transactions,
  positions,
  selectedPortfolioId,
  getPortfolioName,
}: CostBasisViewProps) => {
  const [method, setMethod] = useState<CostBasisMethod>('fifo');
  const [subTab, setSubTab] = useState('positions');
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  const report = useMemo(
    () => computeCostBasisReport(transactions, positions, method, selectedPortfolioId),
    [transactions, positions, method, selectedPortfolioId]
  );

  const toggleExpanded = (key: string) => {
    setExpandedPositions(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    const csv = exportCapitalGainsCSV(report);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capital-gains-${method}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Cost Basis Accounting</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={method} onValueChange={v => setMethod(v as CostBasisMethod)}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METHOD_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={report.realizedGains.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryMini label="Realized G/L" value={report.totalRealizedGL} />
        <SummaryMini label="Realized (Long)" value={report.totalRealizedLongTerm} />
        <SummaryMini label="Realized (Short)" value={report.totalRealizedShortTerm} />
        <SummaryMini label="Unrealized G/L" value={report.totalUnrealizedGL} />
        <SummaryMini label="Unrealized (Long)" value={report.totalUnrealizedLongTerm} />
        <SummaryMini label="Unrealized (Short)" value={report.totalUnrealizedShortTerm} />
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="positions" className="gap-1"><FileText className="h-4 w-4" /> Cost Basis by Position</TabsTrigger>
          <TabsTrigger value="realized" className="gap-1"><TrendingUp className="h-4 w-4" /> Realized Gains</TabsTrigger>
          <TabsTrigger value="taxlots" className="gap-1"><Calendar className="h-4 w-4" /> Tax Lot Breakdown</TabsTrigger>
        </TabsList>

        {/* Positions with cost basis */}
        <TabsContent value="positions">
          <Card>
            <CardContent className="pt-4">
              {report.positions.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No positions found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Security</TableHead>
                      {!selectedPortfolioId && <TableHead>Portfolio</TableHead>}
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Avg Cost</TableHead>
                      <TableHead className="text-right">Cost Basis</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Mkt Value</TableHead>
                      <TableHead className="text-right">Unrealized G/L</TableHead>
                      <TableHead className="text-right">Tax Lots</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.positions.map(pos => {
                      const key = `${pos.portfolioId}:${pos.securityId}`;
                      const isExpanded = expandedPositions.has(key);
                      return (
                        <>
                          <TableRow key={key} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpanded(key)}>
                            <TableCell>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-medium">{pos.securityId}</TableCell>
                            {!selectedPortfolioId && <TableCell className="text-muted-foreground">{getPortfolioName(pos.portfolioId)}</TableCell>}
                            <TableCell className="text-right tabular-nums">{pos.totalQuantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(pos.averageCost)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(pos.totalCostBasis)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(pos.currentPrice)}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{formatCurrency(pos.currentValue)}</TableCell>
                            <TableCell className={cn('text-right tabular-nums font-medium', pos.unrealizedGL >= 0 ? 'text-success' : 'text-destructive')}>
                              {formatCurrency(pos.unrealizedGL)} <span className="text-xs">({pos.unrealizedGLPct.toFixed(1)}%)</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{pos.taxLots.length}</Badge>
                            </TableCell>
                          </TableRow>
                          {isExpanded && pos.unrealizedDetails.length > 0 && (
                            <TableRow key={`${key}-details`}>
                              <TableCell colSpan={selectedPortfolioId ? 9 : 10} className="bg-muted/20 p-0">
                                <div className="px-8 py-3">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Tax Lot Details — {pos.securityId}</p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Purchase Date</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Cost/Unit</TableHead>
                                        <TableHead className="text-right">Cost Basis</TableHead>
                                        <TableHead className="text-right">Current Value</TableHead>
                                        <TableHead className="text-right">G/L</TableHead>
                                        <TableHead className="text-right">Days Held</TableHead>
                                        <TableHead>Term</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {pos.unrealizedDetails.map((u, i) => (
                                        <TableRow key={i} className="text-sm">
                                          <TableCell>{format(new Date(u.purchaseDate), 'dd MMM yyyy')}</TableCell>
                                          <TableCell className="text-right tabular-nums">{u.quantity.toLocaleString()}</TableCell>
                                          <TableCell className="text-right tabular-nums">{formatCurrency(u.costBasis / u.quantity)}</TableCell>
                                          <TableCell className="text-right tabular-nums">{formatCurrency(u.costBasis)}</TableCell>
                                          <TableCell className="text-right tabular-nums">{formatCurrency(u.currentValue)}</TableCell>
                                          <TableCell className={cn('text-right tabular-nums', u.gainLoss >= 0 ? 'text-success' : 'text-destructive')}>
                                            {formatCurrency(u.gainLoss)}
                                          </TableCell>
                                          <TableCell className="text-right tabular-nums">{u.holdingPeriodDays}d</TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className={cn('text-[10px]', u.isLongTerm ? 'border-success/50 text-success' : 'border-warning/50 text-warning')}>
                                              {u.isLongTerm ? 'Long' : 'Short'}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Realized Gains */}
        <TabsContent value="realized">
          <Card>
            <CardContent className="pt-4">
              {report.realizedGains.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No realized gains/losses. Record sell transactions to see results.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Security</TableHead>
                      {!selectedPortfolioId && <TableHead>Portfolio</TableHead>}
                      <TableHead>Buy Date</TableHead>
                      <TableHead>Sell Date</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Cost Basis</TableHead>
                      <TableHead className="text-right">Proceeds</TableHead>
                      <TableHead className="text-right">Gain/Loss</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead>Term</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.realizedGains.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.securityId}</TableCell>
                        {!selectedPortfolioId && <TableCell className="text-muted-foreground">{getPortfolioName(r.portfolioId)}</TableCell>}
                        <TableCell className="text-sm">{format(new Date(r.purchaseDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-sm">{format(new Date(r.sellDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(r.costBasis)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(r.proceeds)}</TableCell>
                        <TableCell className={cn('text-right tabular-nums font-medium', r.gainLoss >= 0 ? 'text-success' : 'text-destructive')}>
                          {formatCurrency(r.gainLoss)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.holdingPeriodDays}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px]', r.isLongTerm ? 'border-success/50 text-success' : 'border-warning/50 text-warning')}>
                            {r.isLongTerm ? 'Long-Term' : 'Short-Term'}
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

        {/* Full Tax Lot Breakdown */}
        <TabsContent value="taxlots">
          <Card>
            <CardContent className="pt-4">
              {report.positions.flatMap(p => p.taxLots).length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No tax lots available. Record buy transactions to create lots.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Security</TableHead>
                      {!selectedPortfolioId && <TableHead>Portfolio</TableHead>}
                      <TableHead>Purchase Date</TableHead>
                      <TableHead className="text-right">Original Qty</TableHead>
                      <TableHead className="text-right">Remaining Qty</TableHead>
                      <TableHead className="text-right">Cost/Unit</TableHead>
                      <TableHead className="text-right">Remaining Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.positions.flatMap(pos =>
                      pos.taxLots.map(lot => (
                        <TableRow key={lot.id}>
                          <TableCell className="font-medium">{lot.securityId}</TableCell>
                          {!selectedPortfolioId && <TableCell className="text-muted-foreground">{getPortfolioName(lot.portfolioId)}</TableCell>}
                          <TableCell className="text-sm">{format(new Date(lot.purchaseDate), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right tabular-nums">{lot.quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums">{lot.remainingQuantity.toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(lot.costPerUnit)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(lot.remainingQuantity * lot.costPerUnit)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px]',
                              lot.remainingQuantity === lot.quantity
                                ? 'border-success/50 text-success'
                                : lot.remainingQuantity > 0
                                  ? 'border-warning/50 text-warning'
                                  : 'border-muted-foreground/50 text-muted-foreground'
                            )}>
                              {lot.remainingQuantity === lot.quantity ? 'Open' : lot.remainingQuantity > 0 ? 'Partial' : 'Closed'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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

// ─── Mini summary card ───
function SummaryMini({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className={cn('text-lg font-bold tabular-nums', value >= 0 ? 'text-success' : 'text-destructive')}>
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  );
}
