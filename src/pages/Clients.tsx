import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { clients, formatCurrency, formatPercent } from '@/data/mockData';
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
  ChevronRight,
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

const typeIcons = {
  'Individual': User,
  'Family Office': Building2,
  'Trust': Landmark,
  'Corporation': Building
};

const statusColors = {
  'Active': 'bg-success/10 text-success border-success/20',
  'Under Review': 'bg-warning/10 text-warning border-warning/20',
  'Onboarding': 'bg-primary/10 text-primary border-primary/20'
};

const riskColors = {
  'Conservative': 'text-chart-3',
  'Moderate': 'text-primary',
  'Aggressive': 'text-warning',
  'Ultra-Aggressive': 'text-destructive'
};

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || client.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

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
          <Button className="bg-gradient-gold hover:opacity-90 gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary/50"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 bg-secondary/50">
                <SelectValue placeholder="Client Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Family Office">Family Office</SelectItem>
                <SelectItem value="Trust">Trust</SelectItem>
                <SelectItem value="Corporation">Corporation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-secondary/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Onboarding">Onboarding</SelectItem>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const Icon = typeIcons[client.type];
            return (
              <div
                key={client.id}
                className="glass rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {client.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{client.id}</p>
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
                    <span className="text-xs text-muted-foreground">AUM</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(client.aum, true)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">YTD Return</span>
                    <span className={cn(
                      'font-medium tabular-nums',
                      client.ytdReturn >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {formatPercent(client.ytdReturn)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Risk Profile</span>
                    <span className={cn('text-sm font-medium', riskColors[client.riskProfile])}>
                      {client.riskProfile}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-xs', statusColors[client.status])}>
                        {client.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{client.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Mail className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Calendar className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {client.entities && client.entities.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Related Entities</p>
                    <div className="flex flex-wrap gap-1">
                      {client.entities.slice(0, 2).map((entity, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {entity}
                        </Badge>
                      ))}
                      {client.entities.length > 2 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{client.entities.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Advisor: {client.advisor}</span>
                  <span>Last contact: {new Date(client.lastContact).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Clients;
