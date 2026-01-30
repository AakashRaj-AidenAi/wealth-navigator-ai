import { MainLayout } from '@/components/layout/MainLayout';
import { portfolioHoldings, formatCurrency } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Download, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const assetClassColors: Record<string, string> = {
  'US Equity': 'bg-primary/20 text-primary',
  'Fixed Income': 'bg-chart-3/20 text-chart-3',
  'International Equity': 'bg-success/20 text-success',
  'Emerging Markets': 'bg-chart-4/20 text-chart-4',
  'Real Estate': 'bg-chart-5/20 text-chart-5',
  'Commodities': 'bg-warning/20 text-warning',
  'Cash': 'bg-muted-foreground/20 text-muted-foreground',
};

const Portfolios = () => {
  const totalValue = portfolioHoldings.reduce((sum, h) => sum + h.value, 0);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Portfolio Management</h1>
            <p className="text-muted-foreground">
              View and manage investment holdings across all client portfolios
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Rebalance
            </Button>
            <Button className="bg-gradient-gold hover:opacity-90 gap-2">
              <TrendingUp className="h-4 w-4" />
              New Trade
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
            <p className="text-2xl font-semibold mt-1">{formatCurrency(totalValue, true)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-success">+$12.4M today</span>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Holdings Count</p>
            <p className="text-2xl font-semibold mt-1">{portfolioHoldings.length}</p>
            <p className="text-xs text-muted-foreground mt-2">Across 6 asset classes</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Top Performer</p>
            <p className="text-2xl font-semibold mt-1 text-success">JPM +22.1%</p>
            <p className="text-xs text-muted-foreground mt-2">YTD return</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Cash Position</p>
            <p className="text-2xl font-semibold mt-1">11.3%</p>
            <Progress value={11.3} className="mt-3 h-1.5" />
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by symbol or name..."
                className="pl-9 bg-secondary/50"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-48 bg-secondary/50">
                <SelectValue placeholder="Asset Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Asset Classes</SelectItem>
                <SelectItem value="equity">US Equity</SelectItem>
                <SelectItem value="fixed">Fixed Income</SelectItem>
                <SelectItem value="intl">International</SelectItem>
                <SelectItem value="re">Real Estate</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 bg-secondary/50">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="raghavan">Raghavan Family</SelectItem>
                <SelectItem value="harrison">Harrison Trust</SelectItem>
                <SelectItem value="sterling">Victoria Sterling</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-xs font-medium text-muted-foreground">Symbol</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Asset Class</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Value</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Weight</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Day Change</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">YTD Return</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolioHoldings.map((holding) => (
                <TableRow
                  key={holding.id}
                  className="hover:bg-muted/20 transition-colors cursor-pointer border-border"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{holding.symbol.slice(0, 2)}</span>
                      </div>
                      {holding.symbol}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{holding.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', assetClassColors[holding.assetClass])}>
                      {holding.assetClass}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(holding.value, true)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={holding.weight} className="w-16 h-1.5" />
                      <span className="text-sm tabular-nums w-12 text-right">{holding.weight}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={cn(
                      'flex items-center justify-end gap-1',
                      holding.dayChange >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {holding.dayChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="tabular-nums">
                        {holding.dayChange >= 0 ? '+' : ''}{holding.dayChange}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      'font-medium tabular-nums',
                      holding.ytdReturn >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {holding.ytdReturn >= 0 ? '+' : ''}{holding.ytdReturn}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {holding.quantity.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
};

export default Portfolios;
