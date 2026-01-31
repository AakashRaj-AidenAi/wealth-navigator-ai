import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Settings2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Client {
  id: string;
  client_name: string;
}

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ExecutionType = 'market' | 'limit' | 'fill_or_kill' | 'good_till_cancel';

export const NewOrderModal = ({ open, onOpenChange, onSuccess }: NewOrderModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState('');
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  
  // Advanced order settings
  const [executionType, setExecutionType] = useState<ExecutionType>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, client_name')
      .order('client_name');
    
    if (data) {
      setClients(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create an order.',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedClient || !symbol.trim() || !quantity) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    // Validate limit price for limit orders
    if ((executionType === 'limit' || executionType === 'good_till_cancel') && !limitPrice) {
      toast({
        title: 'Validation Error',
        description: 'Limit price is required for limit and GTC orders.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    const effectivePrice = executionType === 'market' ? (price ? parseFloat(price) : null) : (limitPrice ? parseFloat(limitPrice) : null);
    const totalAmount = effectivePrice && quantity ? effectivePrice * parseFloat(quantity) : null;

    const { error } = await supabase
      .from('orders')
      .insert({
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

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      const executionLabel = getExecutionTypeLabel(executionType);
      toast({
        title: 'Order Created',
        description: `${orderType.toUpperCase()} ${executionLabel} order for ${symbol.toUpperCase()} has been placed.`
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
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
                    <SelectItem value="market">
                      <div className="flex flex-col">
                        <span>Market Order</span>
                        <span className="text-xs text-muted-foreground">Execute immediately at best price</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="limit">
                      <div className="flex flex-col">
                        <span>Limit Order</span>
                        <span className="text-xs text-muted-foreground">Execute only at specified price or better</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="fill_or_kill">
                      <div className="flex flex-col">
                        <span>Fill or Kill (FOK)</span>
                        <span className="text-xs text-muted-foreground">Execute entire order immediately or cancel</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="good_till_cancel">
                      <div className="flex flex-col">
                        <span>Good Till Cancel (GTC)</span>
                        <span className="text-xs text-muted-foreground">Order remains active until filled or cancelled</span>
                      </div>
                    </SelectItem>
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
                  <p className="text-xs text-muted-foreground">
                    {orderType === 'buy' 
                      ? 'Order will execute when price falls to or below this level'
                      : 'Order will execute when price rises to or above this level'
                    }
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no expiration (order remains active until filled or manually cancelled)
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Estimated Total */}
          {((price && quantity) || (limitPrice && quantity)) && (
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Estimated Total</p>
              <p className="text-xl font-semibold">
                ${((parseFloat(limitPrice || price) || 0) * (parseFloat(quantity) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {executionType !== 'market' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {getExecutionTypeLabel(executionType)} order at ${limitPrice || price}/share
                </p>
              )}
            </div>
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
            <Button type="submit" className="bg-gradient-gold hover:opacity-90" disabled={loading}>
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