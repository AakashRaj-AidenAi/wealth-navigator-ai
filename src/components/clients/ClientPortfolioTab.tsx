import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, PieChart, BarChart3, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface ClientPortfolioTabProps {
  clientId: string;
  totalAssets: number;
}

// Mock portfolio data - in production this would come from the database
const mockPortfolio = {
  allocations: [
    { name: 'Equity', percentage: 45, value: 0, color: 'bg-chart-1' },
    { name: 'Fixed Income', percentage: 30, value: 0, color: 'bg-chart-2' },
    { name: 'Real Estate', percentage: 15, value: 0, color: 'bg-chart-3' },
    { name: 'Cash & Alternatives', percentage: 10, value: 0, color: 'bg-chart-4' },
  ],
  performance: {
    ytd: 12.5,
    oneYear: 18.3,
    threeYear: 42.1,
    fiveYear: 85.6
  },
  holdings: [
    { name: 'HDFC Bank Ltd', type: 'Equity', value: 1250000, change: 5.2 },
    { name: 'Reliance Industries', type: 'Equity', value: 980000, change: -2.1 },
    { name: 'ICICI Prudential MF', type: 'Mutual Fund', value: 750000, change: 3.8 },
    { name: 'Government Bonds 2028', type: 'Fixed Income', value: 500000, change: 0.5 },
    { name: 'Gold ETF', type: 'Commodity', value: 320000, change: 1.2 },
  ]
};

export const ClientPortfolioTab = ({ clientId, totalAssets }: ClientPortfolioTabProps) => {
  const allocations = mockPortfolio.allocations.map(a => ({
    ...a,
    value: (a.percentage / 100) * totalAssets
  }));

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Portfolio</p>
                <p className="text-2xl font-semibold">{formatCurrency(totalAssets, true)}</p>
              </div>
              <Wallet className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">YTD Return</p>
                <p className="text-2xl font-semibold text-success">+{mockPortfolio.performance.ytd}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">1Y Return</p>
                <p className="text-2xl font-semibold text-success">+{mockPortfolio.performance.oneYear}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">3Y Return</p>
                <p className="text-2xl font-semibold text-success">+{mockPortfolio.performance.threeYear}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allocations.map((allocation) => (
              <div key={allocation.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{allocation.name}</span>
                  <span className="text-muted-foreground">
                    {allocation.percentage}% • {formatCurrency(allocation.value, true)}
                  </span>
                </div>
                <Progress value={allocation.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Holdings */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Top Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockPortfolio.holdings.map((holding, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm">{holding.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">{holding.type}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">{formatCurrency(holding.value)}</p>
                    <p className={`text-xs flex items-center justify-end gap-1 ${holding.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {holding.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {holding.change >= 0 ? '+' : ''}{holding.change}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for real portfolio integration */}
      <Card className="glass border-dashed">
        <CardContent className="py-8 text-center">
          <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Portfolio Integration</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Connect to your portfolio management system to display real-time holdings, 
            transactions, and performance analytics.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};