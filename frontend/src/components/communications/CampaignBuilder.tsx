import { useState, useEffect } from 'react';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Megaphone, Plus, Play, Pause, Users, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  template_id: string | null;
  channel: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  channel: string;
  category: string;
}

interface Client {
  id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  risk_profile: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-secondary', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500', icon: Clock },
  sending: { label: 'Sending', color: 'bg-amber-500', icon: Play },
  completed: { label: 'Completed', color: 'bg-success', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-destructive', icon: XCircle }
};

export const CampaignBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [channel, setChannel] = useState('email');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [riskFilter, setRiskFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsData, templatesData, clientsData] = await Promise.all([
        api.get('/communication_campaigns'),
        api.get('/message_templates', { is_active: true }),
        api.get('/clients')
      ]);
      setCampaigns(extractItems<Campaign>(campaignsData));
      setTemplates(extractItems<Template>(templatesData));
      setClients(extractItems<Client>(clientsData));
    } catch {
      // API client already shows toast on error
    }
    setLoading(false);
  };

  const handleCreateCampaign = async () => {
    if (!name || selectedClients.length === 0) {
      toast({ title: 'Error', description: 'Please provide a name and select recipients', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      // Create campaign
      const campaign = await api.post<any>('/communication_campaigns', {
        name,
        description: description || null,
        template_id: templateId || null,
        channel,
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduled_at: scheduledAt || null,
        total_recipients: selectedClients.length,
        created_by: user?.id
      });

      // Add recipients
      const recipients = selectedClients.map(clientId => ({
        campaign_id: campaign.id,
        client_id: clientId,
        status: 'pending'
      }));

      await api.post('/campaign_recipients', recipients);

      toast({ title: 'Success', description: 'Campaign created successfully' });
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch {
      // API client already shows toast on error
    }
    setSubmitting(false);
  };

  const handleLaunchCampaign = async (campaign: Campaign) => {
    try {
      await api.put(`/communication_campaigns/${campaign.id}`, {
        status: 'sending',
        started_at: new Date().toISOString()
      });
      toast({ title: 'Campaign Launched', description: 'Messages are being sent' });
      fetchData();
    } catch {
      // API client already shows toast on error
    }
  };

  const handleCancelCampaign = async (campaignId: string) => {
    try {
      await api.put(`/communication_campaigns/${campaignId}`, { status: 'cancelled' });
      toast({ title: 'Campaign Cancelled' });
      fetchData();
    } catch {
      // API client already shows toast on error
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTemplateId('');
    setChannel('email');
    setScheduledAt('');
    setSelectedClients([]);
    setRiskFilter('all');
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    const filteredClients = riskFilter === 'all' 
      ? clients 
      : clients.filter(c => c.risk_profile === riskFilter);
    setSelectedClients(filteredClients.map(c => c.id));
  };

  const deselectAllClients = () => setSelectedClients([]);

  const filteredClients = riskFilter === 'all' 
    ? clients 
    : clients.filter(c => c.risk_profile === riskFilter);

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold mb-4">Campaigns</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-secondary/30 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Bulk Campaigns</h2>
          <Badge variant="secondary">{campaigns.length} campaigns</Badge>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setModalOpen(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No campaigns yet. Create your first bulk campaign!
          </div>
        ) : (
          campaigns.map(campaign => {
            const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;
            const progress = campaign.total_recipients > 0 
              ? Math.round((campaign.sent_count / campaign.total_recipients) * 100) 
              : 0;

            return (
              <div
                key={campaign.id}
                className="p-4 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{campaign.name}</p>
                      <Badge className={`${statusConfig.color} text-white text-xs`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {campaign.total_recipients} recipients
                      </span>
                      <span>
                        Created {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                      </span>
                      {campaign.scheduled_at && (
                        <span className="text-primary">
                          Scheduled: {format(new Date(campaign.scheduled_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      )}
                    </div>
                    {(campaign.status === 'sending' || campaign.status === 'completed') && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{campaign.sent_count}/{campaign.total_recipients} sent</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {campaign.status === 'draft' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleLaunchCampaign(campaign)}
                        className="gap-1"
                      >
                        <Play className="h-4 w-4" /> Launch
                      </Button>
                    )}
                    {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCancelCampaign(campaign.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Campaign Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., January SIP Reminder"
                />
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Campaign description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Message Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.channel === channel).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Schedule (optional)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>

            {/* Recipient Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Recipients *</Label>
                <div className="flex items-center gap-2">
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={selectAllClients}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllClients}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-background">
                {filteredClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No clients found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredClients.map(client => (
                      <div key={client.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={() => toggleClientSelection(client.id)}
                        />
                        <span className="flex-1">{client.client_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {channel === 'email' ? client.email : client.phone}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedClients.length} recipients selected
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCampaign} disabled={submitting}>
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
