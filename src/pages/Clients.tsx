import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Filter,
  Download,
  Building2,
  User,
  Landmark,
  Building,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddClientModal } from '@/components/modals/AddClientModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';

interface Client {
  id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  total_assets: number;
  risk_profile: string;
  status: string;
  created_at: string;
}

const riskColors: Record<string, string> = {
  'conservative': 'text-chart-3',
  'moderate': 'text-primary',
  'aggressive': 'text-warning',
  'ultra-aggressive': 'text-destructive'
};

const statusColors: Record<string, string> = {
  'active': 'bg-success/10 text-success border-success/20',
  'inactive': 'bg-muted text-muted-foreground',
  'onboarding': 'bg-primary/10 text-primary border-primary/20'
};

const Clients = () => {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setClients(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canAddClient = role === 'wealth_advisor';

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Clients & Entities</h1>
            <p className="text-muted-foreground">
              Manage HNI clients, family offices, and institutional relationships
            </p>
          </div>
          {canAddClient && (
            <Button 
              className="bg-gradient-gold hover:opacity-90 gap-2"
              onClick={() => setAddClientOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary/50"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-secondary/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Client Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No clients found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search criteria' : 'Add your first client to get started'}
            </p>
            {canAddClient && (
              <Button onClick={() => setAddClientOpen(true)} className="bg-gradient-gold hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="glass rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <User className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {client.client_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{client.email || 'No email'}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Edit Details</DropdownMenuItem>
                      <DropdownMenuItem>View Portfolio</DropdownMenuItem>
                      <DropdownMenuItem>Schedule Meeting</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total Assets</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(Number(client.total_assets), true)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Risk Profile</span>
                    <span className={cn('text-sm font-medium capitalize', riskColors[client.risk_profile] || 'text-muted-foreground')}>
                      {client.risk_profile}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={cn('text-xs capitalize', statusColors[client.status] || '')}>
                      {client.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {client.phone && (
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}
                      {client.email && (
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Mail className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Calendar className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  Added: {new Date(client.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddClientModal 
        open={addClientOpen} 
        onOpenChange={setAddClientOpen}
        onSuccess={fetchClients}
      />
    </MainLayout>
  );
};

export default Clients;
