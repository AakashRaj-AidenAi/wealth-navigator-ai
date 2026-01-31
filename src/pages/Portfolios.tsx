import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
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
import { 
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown,
  User, 
  Briefcase,
  AlertTriangle,
  Target,
  PieChart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PortfolioChart } from '@/components/dashboard/PortfolioChart';

interface ClientPortfolio {
  id: string;
  client_name: string;
  email: string | null;
  total_assets: number | null;
  risk_profile: string | null;
  status: string | null;
  goalsCount: number;
  ordersCount: number;
  goalProgress?: number;
}

const riskColors: Record<string, string> = {
  'aggressive': 'bg-destructive/20 text-destructive',
  'moderate': 'bg-warning/20 text-warning',
  'conservative': 'bg-success/20 text-success',
};

const Portfolios = () => {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<ClientPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [alerts, setAlerts] = useState<{ driftCount: number; underperformers: number }>({ driftCount: 0, underperformers: 0 });

  useEffect(() => {
    const fetchPortfolios = async () => {
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .order('total_assets', { ascending: false });

      if (clients) {
        // Fetch goals and orders counts for each client
        const portfoliosWithCounts = await Promise.all(
          clients.map(async (client) => {
            const [goalsResult, ordersResult, goalsDataResult] = await Promise.all([
              supabase.from('goals').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
              supabase.from('orders').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
              supabase.from('goals').select('target_amount, current_amount').eq('client_id', client.id),
            ]);

            // Calculate average goal progress
            let goalProgress = 0;
            if (goalsDataResult.data && goalsDataResult.data.length > 0) {
              const totalProgress = goalsDataResult.data.reduce((sum, g) => {
                return sum + ((g.current_amount || 0) / g.target_amount) * 100;
              }, 0);
              goalProgress = totalProgress / goalsDataResult.data.length;
            }

            return {
              ...client,
              goalsCount: goalsResult.count || 0,
              ordersCount: ordersResult.count || 0,
              goalProgress,
            };
          })
        );

        setPortfolios(portfoliosWithCounts);
        
        // Simulate alert counts (in production, calculate from real data)
        setAlerts({
          driftCount: Math.floor(Math.random() * 3),
          underperformers: portfoliosWithCounts.filter(p => (p.goalProgress || 0) < 50).length,
        });
      }
      setLoading(false);
    };

    fetchPortfolios();
  }, []);

  const totalValue = portfolios.reduce((sum, p) => sum + (Number(p.total_assets) || 0), 0);
  
  const filteredPortfolios = portfolios.filter(p => {
    const matchesSearch = p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRisk = riskFilter === 'all' || p.risk_profile === riskFilter;
    return matchesSearch && matchesRisk;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

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
            <Button 
              className="bg-gradient-gold hover:opacity-90 gap-2"
              onClick={() => navigate('/orders')}
            >
              <TrendingUp className="h-4 w-4" />
              New Trade
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass border-border/50">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total AUM</p>
                  <p className="text-2xl font-semibold mt-1">{formatCurrency(totalValue, true)}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-sm text-success">+12.5% YTD</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass border-border/50">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Portfolio Size</p>
                  <p className="text-2xl font-semibold mt-1">
                    {formatCurrency(portfolios.length > 0 ? totalValue / portfolios.length : 0, true)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{portfolios.length} active portfolios</p>
                </div>
                <div className="p-2.5 rounded-lg bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass border-border/50">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Goals On Track</p>
                  <p className="text-2xl font-semibold mt-1">
                    {portfolios.filter(p => (p.goalProgress || 0) >= 50).length}/{portfolios.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {alerts.underperformers > 0 && (
                      <span className="text-warning">{alerts.underperformers} need attention</span>
                    )}
                    {alerts.underperformers === 0 && 'All clients on track'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-warning/10">
                  <Target className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass border-border/50">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                  <p className="text-2xl font-semibold mt-1">{alerts.driftCount + alerts.underperformers}</p>
                  <div className="flex gap-2 mt-2">
                    {alerts.driftCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                        {alerts.driftCount} drift
                      </Badge>
                    )}
                    {alerts.underperformers > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                        {alerts.underperformers} goals
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PortfolioChart />
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="h-4 w-4 text-primary" />
                Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['conservative', 'moderate', 'aggressive'].map((risk) => {
                  const count = portfolios.filter(p => p.risk_profile === risk).length;
                  const percentage = portfolios.length > 0 ? (count / portfolios.length) * 100 : 0;
                  const value = portfolios
                    .filter(p => p.risk_profile === risk)
                    .reduce((sum, p) => sum + (Number(p.total_assets) || 0), 0);
                  
                  return (
                    <div key={risk} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs capitalize", riskColors[risk])}
                          >
                            {risk}
                          </Badge>
                          <span className="text-muted-foreground">{count} clients</span>
                        </div>
                        <span className="font-medium">{formatCurrency(value, true)}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name or email..."
                className="pl-9 bg-secondary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-48 bg-secondary/50">
                <SelectValue placeholder="Risk Profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Profiles</SelectItem>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Portfolios Table */}
        <div className="glass rounded-xl overflow-hidden">
          {filteredPortfolios.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No portfolios found</h3>
              <p className="text-muted-foreground mb-4">
                {portfolios.length === 0 
                  ? "Add clients to start managing portfolios" 
                  : "Try adjusting your search or filters"}
              </p>
              {portfolios.length === 0 && (
                <Button onClick={() => navigate('/clients')}>Add Client</Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground">Client</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Risk Profile</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Portfolio Value</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Weight</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Goals</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Orders</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPortfolios.map((portfolio) => {
                  const weight = totalValue > 0 
                    ? ((Number(portfolio.total_assets) || 0) / totalValue) * 100 
                    : 0;
                  
                  return (
                    <TableRow
                      key={portfolio.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer border-border"
                      onClick={() => navigate('/clients')}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{portfolio.client_name}</p>
                            <p className="text-xs text-muted-foreground">{portfolio.email || 'No email'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs capitalize', riskColors[portfolio.risk_profile || 'moderate'])}
                        >
                          {portfolio.risk_profile || 'Moderate'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(portfolio.total_assets, true)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={weight} className="w-16 h-1.5" />
                          <span className="text-sm tabular-nums w-12 text-right">{weight.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {portfolio.goalsCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {portfolio.ordersCount}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs capitalize',
                            portfolio.status === 'active' 
                              ? 'bg-success/10 text-success' 
                              : 'bg-muted/10 text-muted-foreground'
                          )}
                        >
                          {portfolio.status || 'Active'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Portfolios;
