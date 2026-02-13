import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, Search, LayoutList } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

export interface Holding {
  id: string;
  name: string;
  symbol: string;
  assetClass: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface HoldingsTableProps {
  holdings: Holding[];
  assetClassFilter?: string | null;
}

export const HoldingsTable = ({ holdings, assetClassFilter }: HoldingsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'gainLoss'>('value');

  const filteredHoldings = holdings
    .filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = !assetClassFilter || h.assetClass === assetClassFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'value') return b.value - a.value;
      return b.gainLoss - a.gainLoss;
    });

  const totalValue = filteredHoldings.reduce((sum, h) => sum + h.value, 0);
  const totalGainLoss = filteredHoldings.reduce((sum, h) => sum + h.gainLoss, 0);

  const assetClassColors: Record<string, string> = {
    'Equity': 'bg-chart-1/20 text-chart-1 border-chart-1/30',
    'Fixed Income': 'bg-chart-2/20 text-chart-2 border-chart-2/30',
    'Real Estate': 'bg-chart-3/20 text-chart-3 border-chart-3/30',
    'Mutual Fund': 'bg-chart-4/20 text-chart-4 border-chart-4/30',
    'Commodity': 'bg-chart-5/20 text-chart-5 border-chart-5/30',
    'Cash': 'bg-muted/30 text-muted-foreground border-muted/50',
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutList className="h-4 w-4 text-primary" />
            Holdings
            {assetClassFilter && (
              <Badge variant="outline" className="ml-2 text-xs">
                {assetClassFilter}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search holdings..."
                className="pl-8 h-8 w-48 text-sm bg-secondary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30">
                <TableHead className="text-xs font-medium">Holding</TableHead>
                <TableHead className="text-xs font-medium">Asset Class</TableHead>
                <TableHead className="text-xs font-medium text-right">Qty</TableHead>
                <TableHead className="text-xs font-medium text-right">Avg Cost</TableHead>
                <TableHead className="text-xs font-medium text-right">CMP</TableHead>
                <TableHead className="text-xs font-medium text-right cursor-pointer hover:text-primary" onClick={() => setSortBy('value')}>
                  Value {sortBy === 'value' && '↓'}
                </TableHead>
                <TableHead className="text-xs font-medium text-right cursor-pointer hover:text-primary" onClick={() => setSortBy('gainLoss')}>
                  Gain/Loss {sortBy === 'gainLoss' && '↓'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHoldings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No holdings found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredHoldings.map((holding) => {
                    const isPositive = holding.gainLoss >= 0;
                    return (
                      <TableRow key={holding.id} className="border-border">
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{holding.name}</p>
                            <p className="text-xs text-muted-foreground">{holding.symbol}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px]", assetClassColors[holding.assetClass] || assetClassColors['Cash'])}
                          >
                            {holding.assetClass}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {holding.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatCurrency(holding.avgCost)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatCurrency(holding.currentPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-sm">
                          {formatCurrency(holding.value, true)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={cn("flex items-center justify-end gap-1", isPositive ? "text-success" : "text-destructive")}>
                            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            <span className="tabular-nums text-sm font-medium">
                              {isPositive ? '+' : ''}{formatCurrency(holding.gainLoss, true)}
                            </span>
                            <span className="text-xs">
                              ({isPositive ? '+' : ''}{holding.gainLossPercent.toFixed(1)}%)
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/20 font-medium">
                    <TableCell colSpan={5} className="text-sm">Total</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatCurrency(totalValue, true)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("tabular-nums text-sm", totalGainLoss >= 0 ? "text-success" : "text-destructive")}>
                        {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss, true)}
                      </span>
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
