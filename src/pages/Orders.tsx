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
import { Plus, Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const orders = [
  { id: 'ORD-001', client: 'Raghavan Family Office', type: 'Buy', symbol: 'AAPL', quantity: 500, price: '$182.50', status: 'pending', time: '10:32 AM' },
  { id: 'ORD-002', client: 'Harrison Trust', type: 'Sell', symbol: 'MSFT', quantity: 200, price: '$378.20', status: 'executed', time: '10:28 AM' },
  { id: 'ORD-003', client: 'Victoria Sterling', type: 'Buy', symbol: 'GOOGL', quantity: 100, price: '$141.80', status: 'executed', time: '10:15 AM' },
  { id: 'ORD-004', client: 'Meridian Capital', type: 'Sell', symbol: 'NVDA', quantity: 150, price: '$495.50', status: 'pending', time: '10:05 AM' },
  { id: 'ORD-005', client: 'Quantum Ventures', type: 'Buy', symbol: 'AMZN', quantity: 300, price: '$155.30', status: 'cancelled', time: '09:55 AM' },
  { id: 'ORD-006', client: 'Sterling Foundation', type: 'Buy', symbol: 'BRK.B', quantity: 50, price: '$362.40', status: 'review', time: '09:45 AM' },
];

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'bg-warning/20 text-warning', label: 'Pending' },
  executed: { icon: CheckCircle2, color: 'bg-success/20 text-success', label: 'Executed' },
  cancelled: { icon: XCircle, color: 'bg-destructive/20 text-destructive', label: 'Cancelled' },
  review: { icon: AlertCircle, color: 'bg-chart-4/20 text-chart-4', label: 'Under Review' },
};

const Orders = () => {
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
          <Button className="bg-gradient-gold hover:opacity-90 gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Pending Orders</p>
            <p className="text-2xl font-semibold mt-1 text-warning">3</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Executed Today</p>
            <p className="text-2xl font-semibold mt-1 text-success">12</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-semibold mt-1">$4.2M</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Avg Execution Time</p>
            <p className="text-2xl font-semibold mt-1">1.2s</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
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
                <TableHead className="text-xs font-medium text-muted-foreground">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const status = statusConfig[order.status];
                const StatusIcon = status.icon;
                return (
                  <TableRow
                    key={order.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer border-border"
                  >
                    <TableCell className="font-mono text-sm">{order.id}</TableCell>
                    <TableCell>{order.client}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={order.type === 'Buy' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}>
                        {order.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{order.symbol}</TableCell>
                    <TableCell className="text-right tabular-nums">{order.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">{order.price}</TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{order.time}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
};

export default Orders;
