import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Filter, Clock, CheckCircle2, XCircle, Check, X } from 'lucide-react';
import { NewOrderModal } from '@/components/modals/NewOrderModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  clients?: { client_name: string } | null;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'bg-warning/20 text-warning', label: 'Pending' },
  executed: { icon: CheckCircle2, color: 'bg-success/20 text-success', label: 'Executed' },
  cancelled: { icon: XCircle, color: 'bg-destructive/20 text-destructive', label: 'Cancelled' },
};

const Orders = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    orderId: string;
    action: 'execute' | 'cancel';
    symbol: string;
  } | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        clients (client_name)
      `)
      .order('created_at', { ascending: false });
    
    if (data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const canCreateOrder = role === 'wealth_advisor';
  const canApproveOrders = role === 'compliance_officer';

  const handleOrderAction = async (orderId: string, action: 'execute' | 'cancel') => {
    setActionLoading(orderId);
    
    const updateData = action === 'execute' 
      ? { status: 'executed' as const, executed_at: new Date().toISOString() }
      : { status: 'cancelled' as const };

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: action === 'execute' ? 'Order Executed' : 'Order Cancelled',
        description: `Order has been ${action === 'execute' ? 'executed' : 'cancelled'} successfully.`
      });
      fetchOrders();
    }
    
    setActionLoading(null);
    setConfirmDialog(null);
  };

  const filteredOrders = orders.filter(order => 
    order.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.clients?.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const executedToday = orders.filter(o => 
    o.status === 'executed' && 
    new Date(o.created_at).toDateString() === new Date().toDateString()
  ).length;
  const totalVolume = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

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

        {/* Summary Cards */}
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
            <p className="text-2xl font-semibold mt-1">
              {formatCurrency(totalVolume, true)}
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-semibold mt-1">{orders.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4">
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

        {/* Orders Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">Create your first trade order to get started</p>
            {canCreateOrder && (
              <Button onClick={() => setNewOrderOpen(true)} className="bg-gradient-gold hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            )}
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground">Order ID</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Client</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Type</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Symbol</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Quantity</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Price</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                  {canApproveOrders && (
                    <TableHead className="text-xs font-medium text-muted-foreground text-center">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const status = statusConfig[order.status];
                  const StatusIcon = status.icon;
                  const isPending = order.status === 'pending';
                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-muted/20 transition-colors border-border"
                    >
                      <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                      <TableCell>{order.clients?.client_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={order.order_type === 'buy' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}>
                          {order.order_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{order.symbol}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(order.quantity).toLocaleString()}</TableCell>
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
                                  open: true, 
                                  orderId: order.id, 
                                  action: 'execute',
                                  symbol: order.symbol 
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
                                  open: true, 
                                  orderId: order.id, 
                                  action: 'cancel',
                                  symbol: order.symbol 
                                })}
                                disabled={actionLoading === order.id}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <NewOrderModal 
        open={newOrderOpen} 
        onOpenChange={setNewOrderOpen}
        onSuccess={fetchOrders}
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

export default Orders;
