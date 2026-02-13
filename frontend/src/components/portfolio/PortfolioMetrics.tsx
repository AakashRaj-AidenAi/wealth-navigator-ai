import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Target, BarChart3, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface PortfolioMetricsProps {
  currentValue: number;
  investedValue: number;
  xirr: number;
  cagr: number;
}

export const PortfolioMetrics = ({ currentValue, investedValue, xirr, cagr }: PortfolioMetricsProps) => {
  const gainLoss = currentValue - investedValue;
  const gainLossPercent = investedValue > 0 ? ((gainLoss / investedValue) * 100) : 0;
  const isPositive = gainLoss >= 0;

  const metrics = [
    {
      label: 'Current Value',
      value: formatCurrency(currentValue, true),
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Gain/Loss',
      value: `${isPositive ? '+' : ''}${formatCurrency(gainLoss, true)}`,
      subValue: `${isPositive ? '+' : ''}${gainLossPercent.toFixed(2)}%`,
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-success' : 'text-destructive',
      bgColor: isPositive ? 'bg-success/10' : 'bg-destructive/10',
    },
    {
      label: 'XIRR',
      value: `${xirr >= 0 ? '+' : ''}${xirr.toFixed(2)}%`,
      subValue: 'Annualized return',
      icon: BarChart3,
      color: xirr >= 0 ? 'text-success' : 'text-destructive',
      bgColor: xirr >= 0 ? 'bg-success/10' : 'bg-destructive/10',
    },
    {
      label: 'CAGR',
      value: `${cagr >= 0 ? '+' : ''}${cagr.toFixed(2)}%`,
      subValue: 'Compound growth',
      icon: Percent,
      color: cagr >= 0 ? 'text-success' : 'text-destructive',
      bgColor: cagr >= 0 ? 'bg-success/10' : 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="glass border-border/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className={cn('text-xl font-semibold', metric.color)}>{metric.value}</p>
                {metric.subValue && (
                  <p className="text-xs text-muted-foreground">{metric.subValue}</p>
                )}
              </div>
              <div className={cn('p-2.5 rounded-lg', metric.bgColor)}>
                <metric.icon className={cn('h-5 w-5', metric.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
