import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Client {
  id: string;
  client_name: string;
  email: string | null;
  total_assets: number | null;
  risk_profile: string | null;
  status: string | null;
}

const statusColors: Record<string, string> = {
  'active': 'bg-success/10 text-success border-success/20',
  'inactive': 'bg-muted/10 text-muted-foreground border-muted/20',
  'onboarding': 'bg-primary/10 text-primary border-primary/20'
};

const riskColors: Record<string, string> = {
  'aggressive': 'text-destructive',
  'moderate': 'text-warning',
  'conservative': 'text-success'
};

const formatCurrency = (amount: number | null): string => {
  if (!amount) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const ClientsTable = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_name, email, total_assets, risk_profile, status')
        .order('total_assets', { ascending: false })
        .limit(6);

      if (!error && data) {
        setClients(data);
      }
      setLoading(false);
    };

    fetchClients();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
        <div className="p-5 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Top Clients</h3>
            <p className="text-sm text-muted-foreground">By Assets Under Management</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary"
            onClick={() => navigate('/clients')}
          >
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No clients yet</p>
          <Button 
            variant="link" 
            className="mt-2"
            onClick={() => navigate('/clients')}
          >
            Add your first client
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Client
                </th>
                <th className="text-right py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  AUM
                </th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Risk Profile
                </th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-muted/20 transition-colors cursor-pointer group"
                  onClick={() => navigate('/clients')}
                >
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">
                          {client.client_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{client.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <span className="font-medium tabular-nums">{formatCurrency(client.total_assets)}</span>
                  </td>
                  <td className="py-4 px-5">
                    <span className={cn(
                      'text-sm font-medium capitalize',
                      riskColors[client.risk_profile || 'moderate']
                    )}>
                      {client.risk_profile || 'Moderate'}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs capitalize', statusColors[client.status || 'active'])}
                    >
                      {client.status || 'Active'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
