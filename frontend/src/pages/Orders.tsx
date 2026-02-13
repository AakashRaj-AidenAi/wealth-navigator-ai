import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus, Search, Filter, Clock, CheckCircle2, XCircle, Check, X, TrendingUp,
  Wallet, AlertTriangle, ArrowUpRight, IndianRupee, CalendarClock,
} from 'lucide-react';
import { NewOrderModal } from '@/components/modals/NewOrderModal';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Order {
  id: string;
  client_id: string;
  order_type: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price: number | null;
  total_amount: number | null;
  status: 'pending' | 'executed' | 'cancelled';
  notes: string | null;
  created_at: string;
  executed_at: string | null;
  execution_type: 'market' | 'limit' | 'fill_or_kill' | 'good_till_cancel' | null;
  limit_price: number | null;
  execution_price: number | null;
  expires_at: string | null;
  clients?: { client_name: string } | null;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'bg-warning/20 text-warning', label: 'Pending' },
  executed: { icon: CheckCircle2, color: 'bg-success/20 text-success', label: 'Executed' },
  cancelled: { icon: XCircle, color: 'bg-destructive/20 text-destructive', label: 'Cancelled' },
};

const executionTypeLabels: Record<string, string> = {
  market: 'Market',
  limit: 'Limit',
  fill_or_kill: 'Fill or Kill',
  good_till_cancel: 'Good Till Cancel',
};

const Orders = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    orderId: string;
    action: 'execute' | 'cancel';
    symbol: string;
    clientId: string;
    orderType: string;
    totalAmount: number | null;
  } | null>(null);

  // Funding dashboard state
  const [totalAvailableCash, setTotalAvailableCash] = useState(0);
  const [pendingFundingAmount, setPendingFundingAmount] = useState(0);
  const [upcomingSettlements, setUpcomingSettlements] = useState(0);
  const [failedFundingCount, setFailedFundingCount] = useState(0);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders', { include: 'clients', order: 'created_at.desc' });
      const data = extractItems<Order>(response);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
    setLoading(false);
  };

  const fetchFundingDashboard = async () => {
    if (!user) return;
    try {
      const [balancesResp, pendingResp, allResp, failedResp] = await Promise.all([
        api.get('/funding/cash-balances', { advisor_id: user.id }),
        api.get('/funding/requests', { initiated_by: user.id, exclude_stages: 'completed,failed' }),
        api.get('/funding/requests', { initiated_by: user.id, exclude_stages: 'completed,failed', has_settlement_date: true }),
        api.get('/funding/requests', { initiated_by: user.id, workflow_stage: 'failed' }),
      ]);
      const balances = extractItems<any>(balancesResp);
      const pendingRequests = extractItems<any>(pendingResp);
      const allRequests = extractItems<any>(allResp);
      const failedRequests = extractItems<any>(failedResp);
      setTotalAvailableCash(balances.reduce((s: number, b: any) => s + Number(b.available_cash), 0));
      setPendingFundingAmount(pendingRequests.reduce((s: number, r: any) => s + Number(r.amount), 0));
      const upcoming = allRequests.filter((r: any) => {
        if (!r.settlement_date) return false;
        const days = differenceInDays(new Date(r.settlement_date), new Date());
        return days >= 0 && days <= 3;
      });
      setUpcomingSettlements(upcoming.length);
      setFailedFundingCount(failedRequests.length);
    } catch (err) {
      console.error('Failed to load funding dashboard:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchFundingDashboard();
  }, [user]);

  const canCreateOrder = role === 'wealth_advisor';
  const canApproveOrders = role === 'compliance_officer';

  const handleOrderAction = async (orderId: string, action: 'execute' | 'cancel') => {
    setActionLoading(orderId);

    const updateData = action === 'execute'
      ? { status: 'executed' as const, executed_at: new Date().toISOString() }
      : { status: 'cancelled' as const };

    try {
      await api.put('/orders/' + orderId, updateData);

      // On execution: deduct pending_cash (already reserved)
      // On cancellation: release reserved cash back to available
      if (confirmDialog && confirmDialog.orderType === 'buy' && confirmDialog.totalAmount && confirmDialog.totalAmount > 0) {
        try {
          const balancesResp = await api.get('/funding/cash-balances', { client_id: confirmDialog.clientId });
          const balances = extractItems<any>(balancesResp);
          const bal = balances[0];

          if (bal) {
            if (action === 'execute') {
              // Deduct from pending (cash is consumed)
              await api.put('/funding/cash-balances/' + bal.id, {
                pending_cash: Math.max(0, Number(bal.pending_cash) - confirmDialog.totalAmount),
                last_updated: new Date().toISOString(),
              });
            } else {
              // Cancel: release reserved cash back to available
              await api.put('/funding/cash-balances/' + bal.id, {
                available_cash: Number(bal.available_cash) + confirmDialog.totalAmount,
                pending_cash: Math.max(0, Number(bal.pending_cash) - confirmDialog.totalAmount),
                last_updated: new Date().toISOString(),
              });
            }
          }
        } catch (balErr) {
          console.error('Failed to update cash balance:', balErr);
        }
      }

      toast({
        title: action === 'execute' ? 'Order Executed' : 'Order Cancelled',
        description: `Order has been ${action === 'execute' ? 'executed' : 'cancelled'} successfully.${action === 'execute' && confirmDialog?.orderType === 'buy' ? ' Cash deducted.' : action === 'cancel' && confirmDialog?.orderType === 'buy' ? ' Reserved cash released.' : ''}`
      });
      fetchOrders();
      fetchFundingDashboard();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update order', variant: 'destructive' });
    }

    setActionLoading(null);
    setConfirmDialog(null);
  };

  const handleInitiateFunding = (clientId: string, amount: number) => {
    navigate('/funding');
  };

  const filteredOrders = orders.filter(order => 
    order.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.clients?.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const executedOrders = filteredOrders.filter(o => o.status === 'executed');
  const displayedOrders = activeTab === 'executions' ? executedOrders : filteredOrders;

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const executedToday = orders.filter(o => 
    o.status === 'executed' && 
    new Date(o.created_at).toDateString() === new Date().toDateString()
  ).length;
  const totalVolume = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalExecutedVolume = executedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Order Management</h1>
            <p className="text-muted-foreground">
              Track and manage trade orders across all client accounts
            </p>
          </div>
          {canCreateOrder && (
            <Button 
              className="bg-gradient-gold hover:opacity-90 gap-2"
              onClick={() => setNewOrderOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          )}
        </div>

        {/* Funding Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Cash</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalAvailableCash)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Funding</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(pendingFundingAmount)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming Settlements</p>
                  <p className="text-2xl font-bold">{upcomingSettlements}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CalendarClock className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={failedFundingCount > 0 ? 'border-destructive/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed Funding</p>
                  <p className={`text-2xl font-bold ${failedFundingCount > 0 ? 'text-destructive' : ''}`}>{failedFundingCount}</p>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${failedFundingCount > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                  <AlertTriangle className={`h-5 w-5 ${failedFundingCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Pending Orders</p>
            <p className="text-2xl font-semibold mt-1 text-warning">{pendingOrders}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Executed Today</p>
            <p className="text-2xl font-semibold mt-1 text-success">{executedToday}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-semibold mt-1">{formatCurrency(totalVolume, true)}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Executed Volume</p>
            <p className="text-2xl font-semibold mt-1 text-success">{formatCurrency(totalExecutedVolume, true)}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="all" className="gap-2">
              <Clock className="h-4 w-4" />
              All Orders
            </TabsTrigger>
            <TabsTrigger value="executions" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Executions
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="glass rounded-xl p-4 mt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/50"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>

          <TabsContent value="all" className="mt-4">
            {renderOrdersTable(displayedOrders, loading, canCreateOrder, canApproveOrders, actionLoading, setConfirmDialog, setNewOrderOpen, false)}
          </TabsContent>

          <TabsContent value="executions" className="mt-4">
            {renderOrdersTable(displayedOrders, loading, canCreateOrder, canApproveOrders, actionLoading, setConfirmDialog, setNewOrderOpen, true)}
          </TabsContent>
        </Tabs>
      </div>

      <NewOrderModal 
        open={newOrderOpen} 
        onOpenChange={setNewOrderOpen}
        onSuccess={() => { fetchOrders(); fetchFundingDashboard(); }}
        onInitiateFunding={handleInitiateFunding}
      />

      <AlertDialog open={confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === 'execute' ? 'Execute Order' : 'Cancel Order'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === 'execute' 
                ? `Are you sure you want to execute the order for ${confirmDialog?.symbol}? This action cannot be undone.`
                : `Are you sure you want to cancel the order for ${confirmDialog?.symbol}? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog?.action === 'execute' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
              onClick={() => confirmDialog && handleOrderAction(confirmDialog.orderId, confirmDialog.action)}
            >
              {confirmDialog?.action === 'execute' ? 'Execute' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

function renderOrdersTable(
  orders: Order[],
  loading: boolean,
  canCreateOrder: boolean,
  canApproveOrders: boolean,
  actionLoading: string | null,
  setConfirmDialog: React.Dispatch<React.SetStateAction<{
    open: boolean;
    orderId: string;
    action: 'execute' | 'cancel';
    symbol: string;
    clientId: string;
    orderType: string;
    totalAmount: number | null;
  } | null>>,
  setNewOrderOpen: React.Dispatch<React.SetStateAction<boolean>>,
  isExecutionsView: boolean
) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        {isExecutionsView ? (
          <>
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No executed orders yet</h3>
            <p className="text-muted-foreground">Executed orders will appear here with their execution prices</p>
          </>
        ) : (
          <>
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">Create your first trade order to get started</p>
            {canCreateOrder && (
              <Button onClick={() => setNewOrderOpen(true)} className="bg-gradient-gold hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="text-xs font-medium text-muted-foreground">Order ID</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Client</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Type</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Symbol</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Order Type</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground text-right">Quantity</TableHead>
            {isExecutionsView ? (
              <>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Limit Price</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Exec. Price</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Total Value</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Executed At</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Price</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                {canApproveOrders && (
                  <TableHead className="text-xs font-medium text-muted-foreground text-center">Actions</TableHead>
                )}
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const status = statusConfig[order.status];
            const StatusIcon = status.icon;
            const isPending = order.status === 'pending';
            const executionTypeLabel = order.execution_type ? executionTypeLabels[order.execution_type] : 'Market';
            
            return (
              <TableRow key={order.id} className="hover:bg-muted/20 transition-colors border-border">
                <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                <TableCell>{order.clients?.client_name || 'Unknown'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={order.order_type === 'buy' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}>
                    {order.order_type.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{order.symbol}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">{executionTypeLabel}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{Number(order.quantity).toLocaleString()}</TableCell>
                
                {isExecutionsView ? (
                  <>
                    <TableCell className="text-right font-medium">
                      {order.limit_price ? `$${Number(order.limit_price).toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      {order.execution_price ? `$${Number(order.execution_price).toFixed(2)}` : order.price ? `$${Number(order.price).toFixed(2)}` : 'Market'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {order.total_amount ? formatCurrency(Number(order.total_amount)) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.executed_at ? new Date(order.executed_at).toLocaleString() : '—'}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-right font-medium">
                      {order.price ? `$${Number(order.price).toFixed(2)}` : 'Market'}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    {canApproveOrders && (
                      <TableCell className="text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/20"
                              onClick={() => setConfirmDialog({ 
                                open: true, orderId: order.id, action: 'execute', symbol: order.symbol,
                                clientId: order.client_id, orderType: order.order_type, totalAmount: Number(order.total_amount) || null,
                              })}
                              disabled={actionLoading === order.id}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/20"
                              onClick={() => setConfirmDialog({ 
                                open: true, orderId: order.id, action: 'cancel', symbol: order.symbol,
                                clientId: order.client_id, orderType: order.order_type, totalAmount: Number(order.total_amount) || null,
                              })}
                              disabled={actionLoading === order.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    )}
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default Orders;
