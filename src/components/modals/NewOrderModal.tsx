import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface Client {
  id: string;
  client_name: string;
}

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const NewOrderModal = ({ open, onOpenChange, onSuccess }: NewOrderModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [selectedClient, setSelectedClient] = useState('');
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

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

    setLoading(true);

    const totalAmount = price && quantity ? parseFloat(price) * parseFloat(quantity) : null;

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
        created_by: user.id
      });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Order Created',
        description: `${orderType.toUpperCase()} order for ${symbol.toUpperCase()} has been placed.`
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    }

    setLoading(false);
  };

  const resetForm = () => {
    setSelectedClient('');
    setOrderType('buy');
    setSymbol('');
    setQuantity('');
    setPrice('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
          {price && quantity && (
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-sm text-muted-foreground">Estimated Total</p>
              <p className="text-xl font-semibold">
                ${(parseFloat(price) * parseFloat(quantity)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
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
