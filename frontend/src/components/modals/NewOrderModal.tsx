import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { Loader2, Settings2, AlertTriangle, Wallet, ArrowUpRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Client {
  id: string;
  client_name: string;
}

interface CashBalance {
  available_cash: number;
  pending_cash: number;
}

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onInitiateFunding?: (clientId: string, amount: number) => void;
}

type ExecutionType = 'market' | 'limit' | 'fill_or_kill' | 'good_till_cancel';

export const NewOrderModal = ({ open, onOpenChange, onSuccess, onInitiateFunding }: NewOrderModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cashBalance, setCashBalance] = useState<CashBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState('');
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  
  const [executionType, setExecutionType] = useState<ExecutionType>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  // Fetch cash balance when client changes
  useEffect(() => {
    if (selectedClient && user) {
      fetchCashBalance(selectedClient);
    } else {
      setCashBalance(null);
    }
  }, [selectedClient, user]);

  const fetchClients = async () => {
    try {
      const data = await api.get('/clients');
      setClients(extractItems<Client>(data));
    } catch { /* API client shows toast */ }
  };

  const fetchCashBalance = async (clientId: string) => {
    setLoadingBalance(true);
    try {
      const data = await api.get<CashBalance>(`/cash_balances/${clientId}`);
      setCashBalance(data ? { available_cash: Number(data.available_cash), pending_cash: Number(data.pending_cash) } : { available_cash: 0, pending_cash: 0 });
    } catch {
      setCashBalance({ available_cash: 0, pending_cash: 0 });
    }
    setLoadingBalance(false);
  };

  const estimatedTotal = ((parseFloat(limitPrice || price) || 0) * (parseFloat(quantity) || 0));
  const availableCash = cashBalance?.available_cash ?? 0;
  const insufficientFunds = orderType === 'buy' && estimatedTotal > 0 && estimatedTotal > availableCash;
  const shortfall = estimatedTotal - availableCash;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to create an order.', variant: 'destructive' });
      return;
    }

    if (!selectedClient || !symbol.trim() || !quantity) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    if ((executionType === 'limit' || executionType === 'good_till_cancel') && !limitPrice) {
      toast({ title: 'Validation Error', description: 'Limit price is required for limit and GTC orders.', variant: 'destructive' });
      return;
    }

    // Prevent buy orders exceeding available cash
    if (insufficientFunds) {
      toast({ title: 'Insufficient Funds', description: `Client needs ${formatCurrency(shortfall)} more to place this order. Initiate funding first.`, variant: 'destructive' });
      return;
    }

    setLoading(true);

    const effectivePrice = executionType === 'market' ? (price ? parseFloat(price) : null) : (limitPrice ? parseFloat(limitPrice) : null);
    const totalAmount = effectivePrice && quantity ? effectivePrice * parseFloat(quantity) : null;

    try {
      await api.post('/orders', {
        client_id: selectedClient,
        order_type: orderType,
        symbol: symbol.trim().toUpperCase(),
        quantity: parseFloat(quantity),
        price: price ? parseFloat(price) : null,
        total_amount: totalAmount,
        notes: notes.trim() || null,
        created_by: user.id,
        execution_type: executionType,
        limit_price: limitPrice ? parseFloat(limitPrice) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });

      // Reserve cash for buy orders (move from available to pending)
      if (orderType === 'buy' && totalAmount && totalAmount > 0) {
        const newAvailable = availableCash - totalAmount;
        const newPending = (cashBalance?.pending_cash ?? 0) + totalAmount;
        await api.put(`/cash_balances/${selectedClient}`, {
          available_cash: newAvailable,
          pending_cash: newPending,
          last_updated: new Date().toISOString()
        });
      }

      toast({
        title: 'Order Created',
        description: `${orderType.toUpperCase()} ${getExecutionTypeLabel(executionType)} order for ${symbol.toUpperCase()} placed.${orderType === 'buy' && totalAmount ? ` ${formatCurrency(totalAmount)} reserved.` : ''}`
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // API client already shows toast on error
    }

    setLoading(false);
  };

  const getExecutionTypeLabel = (type: ExecutionType): string => {
    switch (type) {
      case 'market': return 'Market';
      case 'limit': return 'Limit';
      case 'fill_or_kill': return 'Fill or Kill';
      case 'good_till_cancel': return 'Good Till Cancel';
      default: return 'Market';
    }
  };

  const resetForm = () => {
    setSelectedClient('');
    setOrderType('buy');
    setSymbol('');
    setQuantity('');
    setPrice('');
    setNotes('');
    setExecutionType('market');
    setLimitPrice('');
    setExpiresAt('');
    setShowAdvanced(false);
    setCashBalance(null);
  };

  const showLimitPrice = executionType === 'limit' || executionType === 'good_till_cancel';
  const showExpiry = executionType === 'good_till_cancel';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Trade Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="order-client">Client *</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cash Balance Indicator */}
          {selectedClient && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Available Cash</span>
              </div>
              {loadingBalance ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className={`text-sm font-semibold ${availableCash > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatCurrency(availableCash)}
                </span>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Order Type *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={orderType === 'buy' ? 'default' : 'outline'}
                className={orderType === 'buy' ? 'bg-success hover:bg-success/90' : ''}
                onClick={() => setOrderType('buy')}
              >
                Buy
              </Button>
              <Button
                type="button"
                variant={orderType === 'sell' ? 'default' : 'outline'}
                className={orderType === 'sell' ? 'bg-destructive hover:bg-destructive/90' : ''}
                onClick={() => setOrderType('sell')}
              >
                Sell
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="order-symbol">Symbol *</Label>
            <Input
              id="order-symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g., AAPL"
              className="uppercase"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order-quantity">Quantity *</Label>
              <Input
                id="order-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                min="0"
                step="1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-price">Price ($)</Label>
              <Input
                id="order-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Market"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Advanced Order Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between gap-2 text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Advanced Order Options
                </span>
                <span className="text-xs">{showAdvanced ? '▲' : '▼'}</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4 border-t mt-2">
              <div className="space-y-2">
                <Label>Execution Type</Label>
                <Select value={executionType} onValueChange={(v) => setExecutionType(v as ExecutionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market Order</SelectItem>
                    <SelectItem value="limit">Limit Order</SelectItem>
                    <SelectItem value="fill_or_kill">Fill or Kill (FOK)</SelectItem>
                    <SelectItem value="good_till_cancel">Good Till Cancel (GTC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showLimitPrice && (
                <div className="space-y-2">
                  <Label htmlFor="limit-price">Limit Price ($) *</Label>
                  <Input
                    id="limit-price"
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="Enter limit price"
                    min="0"
                    step="0.01"
                    required={showLimitPrice}
                  />
                </div>
              )}

              {showExpiry && (
                <div className="space-y-2">
                  <Label htmlFor="expires-at">Expires At</Label>
                  <Input
                    id="expires-at"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Estimated Total with Cash Check */}
          {((price && quantity) || (limitPrice && quantity)) && (
            <div className={`p-3 rounded-lg ${insufficientFunds ? 'bg-destructive/10 border border-destructive/30' : 'bg-secondary/30'}`}>
              <p className="text-sm text-muted-foreground">Estimated Total</p>
              <p className="text-xl font-semibold">
                {formatCurrency(estimatedTotal)}
              </p>
              {executionType !== 'market' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {getExecutionTypeLabel(executionType)} order at ${limitPrice || price}/share
                </p>
              )}
            </div>
          )}

          {/* Insufficient Funds Warning */}
          {insufficientFunds && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Insufficient funds. Short by <strong>{formatCurrency(shortfall)}</strong>.
                </span>
                {onInitiateFunding && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ml-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      onOpenChange(false);
                      onInitiateFunding(selectedClient, shortfall);
                    }}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                    Initiate Funding
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="order-notes">Notes</Label>
            <Textarea
              id="order-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-gold hover:opacity-90"
              disabled={loading || (insufficientFunds && orderType === 'buy')}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing Order...
                </>
              ) : (
                'Place Order'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
