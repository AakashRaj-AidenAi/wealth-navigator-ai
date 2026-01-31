import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  Gift,
  Split,
  ArrowRightLeft,
  RefreshCw,
  Search,
  Filter,
  Users,
  Calendar,
  Lightbulb,
  AlertCircle
} from 'lucide-react';

interface CorporateAction {
  id: string;
  symbol: string;
  security_name: string;
  action_type: string;
  description: string;
  ex_date: string | null;
  record_date: string | null;
  payment_date: string | null;
  ratio: string | null;
  dividend_amount: number | null;
  status: string;
  ai_summary: string | null;
  ai_suggestion: string | null;
  affected_clients: number;
  total_impact: number;
}

const actionIcons: Record<string, React.ElementType> = {
  dividend: Gift,
  bonus: TrendingUp,
  split: Split,
  buyback: ArrowRightLeft,
  rights_issue: TrendingUp,
  merger: ArrowRightLeft,
  demerger: ArrowRightLeft
};

const actionColors: Record<string, string> = {
  dividend: 'bg-success/10 text-success border-success/20',
  bonus: 'bg-primary/10 text-primary border-primary/20',
  split: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  buyback: 'bg-warning/10 text-warning border-warning/20',
  rights_issue: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  merger: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
  demerger: 'bg-muted text-muted-foreground border-muted'
};

const CorporateActions = () => {
  const { toast } = useToast();
  const [actions, setActions] = useState<CorporateAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchActions = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      const { data: session } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/corporate-actions?action=fetch`, {
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/corporate-actions?action=list`,
        {
          headers: {
            'Authorization': `Bearer ${session.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActions(data.actions || []);
      }
    } catch (error) {
      console.error('Error fetching corporate actions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch corporate actions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActions(true);
  }, []);

  const filteredActions = actions.filter(action => {
    const matchesSearch = 
      action.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.security_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || action.action_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const stats = {
    total: actions.length,
    dividends: actions.filter(a => a.action_type === 'dividend').length,
    bonus: actions.filter(a => a.action_type === 'bonus').length,
    totalImpact: actions.reduce((sum, a) => sum + (a.total_impact || 0), 0)
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Corporate Actions Intelligence</h1>
            <p className="text-muted-foreground">
              AI-powered detection and analysis of corporate actions affecting your clients
            </p>
          </div>
          <Button
            onClick={() => fetchActions(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Sync Data'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10">
                  <Gift className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.dividends}</p>
                  <p className="text-sm text-muted-foreground">Dividends</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-chart-3/10">
                  <Split className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.bonus}</p>
                  <p className="text-sm text-muted-foreground">Bonus/Splits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10">
                  <Users className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalImpact, true)}</p>
                  <p className="text-sm text-muted-foreground">Total Impact</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by security name or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="dividend">Dividends</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="split">Stock Split</SelectItem>
                  <SelectItem value="buyback">Buyback</SelectItem>
                  <SelectItem value="rights_issue">Rights Issue</SelectItem>
                  <SelectItem value="merger">Merger</SelectItem>
                  <SelectItem value="demerger">Demerger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions Table */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Upcoming Corporate Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-96" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredActions.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No corporate actions found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Corporate actions will appear here when detected'}
                </p>
                <Button onClick={() => fetchActions(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Security</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Ex-Date</TableHead>
                      <TableHead>Record Date</TableHead>
                      <TableHead>Clients</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>AI Suggestion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActions.map((action) => {
                      const Icon = actionIcons[action.action_type] || TrendingUp;
                      const colorClass = actionColors[action.action_type] || actionColors.dividend;

                      return (
                        <TableRow key={action.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${colorClass}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{action.symbol}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {action.security_name}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize ${colorClass}`}>
                              {action.action_type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-sm line-clamp-2">
                              {action.ai_summary || action.description}
                            </p>
                          </TableCell>
                          <TableCell>
                            {action.ex_date ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {new Date(action.ex_date).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">TBD</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {action.record_date ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {new Date(action.record_date).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">TBD</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span>{action.affected_clients}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {action.total_impact > 0 ? (
                              <span className="font-medium text-success">
                                {formatCurrency(action.total_impact, true)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {action.ai_suggestion && (
                              <div className="flex items-center gap-1 text-sm">
                                <Lightbulb className="h-3 w-3 text-warning" />
                                <span className="line-clamp-1">{action.ai_suggestion}</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CorporateActions;
