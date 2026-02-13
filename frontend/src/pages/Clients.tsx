import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Plus,
  Download,
  User,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  LayoutGrid,
  List,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OnboardingWizard } from '@/components/onboarding';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { useEngagementScores } from '@/hooks/useEngagementScores';
import { EngagementBadge } from '@/components/clients/EngagementBadge';
import { useChurnPredictions } from '@/hooks/useChurnPredictions';
import { ChurnRiskBadge } from '@/components/clients/ChurnRiskBadge';

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

interface ClientTag {
  client_id: string;
  tag: string;
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

const tagColors: Record<string, string> = {
  'hni': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'uhni': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'prospect': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'active': 'bg-green-500/10 text-green-500 border-green-500/20',
  'dormant': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  'vip': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  'nri': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
};

const Clients = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [engagementFilter, setEngagementFilter] = useState<string>('all');
  const [churnFilter, setChurnFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const { scores, getScoreForClient, calculateAll } = useEngagementScores();
  const { predictions, getPredictionForClient } = useChurnPredictions();
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientTags, setClientTags] = useState<ClientTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const [clientsRes, tagsRes] = await Promise.all([
        api.get('/clients', { order: 'created_at.desc' }),
        api.get('/client-tags').catch(() => [])
      ]);

      setClients(extractItems<Client>(clientsRes));
      setClientTags(extractItems<ClientTag>(tagsRes));
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const getClientTags = (clientId: string) => {
    return clientTags.filter(t => t.client_id === clientId);
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || client.risk_profile === riskFilter;
    const matchesTag = tagFilter === 'all' || getClientTags(client.id).some(t => t.tag === tagFilter);
    const score = getScoreForClient(client.id);
    const matchesEngagement = engagementFilter === 'all' || 
      (engagementFilter === 'high' && score && score.engagement_score >= 75) ||
      (engagementFilter === 'medium' && score && score.engagement_score >= 40 && score.engagement_score < 75) ||
      (engagementFilter === 'low' && score && score.engagement_score < 40) ||
      (engagementFilter === 'unscored' && !score);
    const churn = getPredictionForClient(client.id);
    const matchesChurn = churnFilter === 'all' ||
      (churnFilter === 'high' && churn && churn.churn_risk_percentage >= 70) ||
      (churnFilter === 'medium' && churn && churn.churn_risk_percentage >= 40 && churn.churn_risk_percentage < 70) ||
      (churnFilter === 'low' && churn && churn.churn_risk_percentage < 40) ||
      (churnFilter === 'unscored' && !churn);
    return matchesSearch && matchesStatus && matchesRisk && matchesTag && matchesEngagement && matchesChurn;
  }).sort((a, b) => {
    if (churnFilter !== 'all') {
      const riskA = getPredictionForClient(a.id)?.churn_risk_percentage ?? -1;
      const riskB = getPredictionForClient(b.id)?.churn_risk_percentage ?? -1;
      return riskB - riskA;
    }
    if (engagementFilter !== 'all') {
      const scoreA = getScoreForClient(a.id)?.engagement_score ?? -1;
      const scoreB = getScoreForClient(b.id)?.engagement_score ?? -1;
      return scoreB - scoreA;
    }
    return 0;
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
              <SelectTrigger className="w-36 bg-secondary/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-36 bg-secondary/50">
                <SelectValue placeholder="Risk Profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-32 bg-secondary/50">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                <SelectItem value="hni">HNI</SelectItem>
                <SelectItem value="uhni">UHNI</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="nri">NRI</SelectItem>
              </SelectContent>
            </Select>
            <Select value={engagementFilter} onValueChange={setEngagementFilter}>
              <SelectTrigger className="w-40 bg-secondary/50">
                <SelectValue placeholder="Engagement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engagement</SelectItem>
                <SelectItem value="high">High (75–100)</SelectItem>
                <SelectItem value="medium">Medium (40–74)</SelectItem>
                <SelectItem value="low">Low (0–39)</SelectItem>
                <SelectItem value="unscored">Unscored</SelectItem>
              </SelectContent>
            </Select>
            <Select value={churnFilter} onValueChange={setChurnFilter}>
              <SelectTrigger className="w-40 bg-secondary/50">
                <SelectValue placeholder="Churn Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Churn Risk</SelectItem>
                <SelectItem value="high">High Risk (70%+)</SelectItem>
                <SelectItem value="medium">Medium (40–69%)</SelectItem>
                <SelectItem value="low">Low (&lt;40%)</SelectItem>
                <SelectItem value="unscored">Not Analyzed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-lg bg-secondary/50">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-9 w-9 rounded-r-none", viewMode === 'grid' && "bg-primary/20")}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-9 w-9 rounded-l-none", viewMode === 'table' && "bg-primary/20")}
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Client List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No clients found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' || riskFilter !== 'all' || tagFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Add your first client to get started'}
            </p>
            {canAddClient && (
              <Button onClick={() => setAddClientOpen(true)} className="bg-gradient-gold hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="glass rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Client</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Churn Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">AUM</TableHead>
                  <TableHead>Risk Profile</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const tags = getClientTags(client.id);
                  return (
                    <TableRow 
                      key={client.id} 
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{client.client_name}</p>
                            <p className="text-xs text-muted-foreground">{client.email || 'No email'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <EngagementBadge score={getScoreForClient(client.id)?.engagement_score} />
                      </TableCell>
                      <TableCell>
                        <ChurnRiskBadge percentage={getPredictionForClient(client.id)?.churn_risk_percentage} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize', statusColors[client.status])}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="outline" className={cn('text-xs uppercase', tagColors[tag.tag])}>
                              {tag.tag}
                            </Badge>
                          ))}
                          {tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{tags.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(Number(client.total_assets), true)}
                      </TableCell>
                      <TableCell>
                        <span className={cn('font-medium capitalize', riskColors[client.risk_profile])}>
                          {client.risk_profile}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(client.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredClients.map((client) => {
              const tags = getClientTags(client.id);
              return (
                <div
                  key={client.id}
                  className="glass rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(`/clients/${client.id}`)}
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
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>View Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem>View Portfolio</DropdownMenuItem>
                        <DropdownMenuItem>Schedule Meeting</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className={cn('text-xs uppercase', tagColors[tag.tag])}>
                          {tag.tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Engagement</span>
                      <EngagementBadge score={getScoreForClient(client.id)?.engagement_score} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Churn Risk</span>
                      <ChurnRiskBadge percentage={getPredictionForClient(client.id)?.churn_risk_percentage} />
                    </div>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                            <Phone className="h-3 w-3" />
                          </Button>
                        )}
                        {client.email && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                            <Mail className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                          <Calendar className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">
                    Added: {new Date(client.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <OnboardingWizard 
        open={addClientOpen} 
        onOpenChange={setAddClientOpen}
        onSuccess={fetchClients}
      />
    </MainLayout>
  );
};

export default Clients;