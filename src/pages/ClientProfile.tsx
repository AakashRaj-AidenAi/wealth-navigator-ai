import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Edit,
  Users,
  Target,
  FileText,
  Bell,
  MessageSquare,
  Send,
  Clock,
  Gift,
  PieChart,
  CheckSquare,
  StickyNote,
  Landmark,
  Sparkles,
  Brain,
  ShieldCheck,
  Activity,
  Mic,
  Wallet
} from 'lucide-react';

import { ClientOverviewTab } from '@/components/clients/ClientOverviewTab';
import { ClientFamilyTab } from '@/components/clients/ClientFamilyTab';
import { ClientGoalsTab } from '@/components/clients/ClientGoalsTab';
import { ClientDocumentsTab } from '@/components/clients/ClientDocumentsTab';
import { ClientActivityTab } from '@/components/clients/ClientActivityTab';
import { ClientRemindersTab } from '@/components/clients/ClientRemindersTab';
import { ClientNotesTab } from '@/components/clients/ClientNotesTab';
import { ClientPortfolioTab } from '@/components/clients/ClientPortfolioTab';
import { ClientTasksTab } from '@/components/clients/ClientTasksTab';
import { ClientCommunicationsTab } from '@/components/clients/ClientCommunicationsTab';
import { ClientCorporateActionsTab } from '@/components/clients/ClientCorporateActionsTab';
import { EditClientModal } from '@/components/modals/EditClientModal';
import { QuickNoteModal } from '@/components/clients/QuickNoteModal';
import { AIDraftMessageModal, MeetingSummaryModal, VoiceNoteModal } from '@/components/ai-growth-engine';
import { ClientRiskProfileTab } from '@/components/risk-profiling';
import { ClientPayoutsTab } from '@/components/clients/ClientPayoutsTab';
import { useEngagementScores } from '@/hooks/useEngagementScores';
import { EngagementBadge } from '@/components/clients/EngagementBadge';
import { useChurnPredictions } from '@/hooks/useChurnPredictions';
import { ChurnRiskBadge } from '@/components/clients/ChurnRiskBadge';
import { useSentimentAnalysis } from '@/hooks/useSentimentAnalysis';
import { SentimentBadge } from '@/components/clients/SentimentBadge';
interface Client {
  id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  total_assets: number;
  risk_profile: string;
  status: string;
  created_at: string;
  date_of_birth: string | null;
  anniversary_date: string | null;
  kyc_expiry_date: string | null;
  address: string | null;
  pan_number: string | null;
  aadhar_number: string | null;
}

interface ClientTag {
  id: string;
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

const ClientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [client, setClient] = useState<Client | null>(null);
  const [tags, setTags] = useState<ClientTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [aiDraftOpen, setAiDraftOpen] = useState(false);
  const [meetingSummaryOpen, setMeetingSummaryOpen] = useState(false);
  const [voiceNoteOpen, setVoiceNoteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { getScoreForClient, calculateAndUpsert } = useEngagementScores();
  const engagementData = id ? getScoreForClient(id) : undefined;
  const { getPredictionForClient, calculateAndUpsert: calculateChurn } = useChurnPredictions();
  const churnData = id ? getPredictionForClient(id) : undefined;
  const { analyzeClientComms, getClientSentimentSummary, fetchLogs: fetchSentimentLogs } = useSentimentAnalysis();
  const sentimentSummary = id ? getClientSentimentSummary(id) : null;
  const fetchClient = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [data, tagsData] = await Promise.all([
        api.get<Client>('/clients/' + id),
        api.get<ClientTag[]>('/client-tags', { client_id: id })
      ]);

      setClient(data);

      if (tagsData) {
        setTags(tagsData);
      }
    } catch (err) {
      console.error('Failed to load client details:', err);
      toast({
        title: 'Error',
        description: 'Failed to load client details',
        variant: 'destructive'
      });
      navigate('/clients');
      return;
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchClient();
    if (id) fetchSentimentLogs(id);
  }, [id]);

  const canEdit = role === 'wealth_advisor';

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="glass rounded-xl p-6">
            <div className="flex items-start gap-6">
              <Skeleton className="h-24 w-24 rounded-xl" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!client) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <User className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Client not found</h2>
          <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="gap-2"
          onClick={() => navigate('/clients')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Button>

        {/* Client Header */}
        <div className="glass rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-semibold">{client.client_name}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className={cn('capitalize', statusColors[client.status])}>
                      {client.status}
                    </Badge>
                    {tags.map((tag) => (
                      <Badge 
                        key={tag.id} 
                        variant="outline" 
                        className={cn('uppercase text-xs', tagColors[tag.tag])}
                      >
                        {tag.tag}
                      </Badge>
                    ))}
                    <EngagementBadge score={engagementData?.engagement_score} size="md" />
                    <ChurnRiskBadge percentage={churnData?.churn_risk_percentage} size="md" />
                    {sentimentSummary && (
                      <SentimentBadge sentiment={sentimentSummary.dominant} size="md" />
                    )}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  {canEdit && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={async () => {
                          if (!client) return;
                          await calculateAndUpsert(client.id);
                          await calculateChurn(client.id);
                        }}
                      >
                        <Activity className="h-4 w-4" />
                        Analyze Client
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={async () => {
                          if (!client) return;
                          await analyzeClientComms(client.id);
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                        Analyze Sentiment
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => setAiDraftOpen(true)}
                      >
                        <Sparkles className="h-4 w-4" />
                        AI Draft
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => setMeetingSummaryOpen(true)}
                      >
                        <Brain className="h-4 w-4" />
                        Meeting Notes
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => setVoiceNoteOpen(true)}
                      >
                        <Mic className="h-4 w-4" />
                        Voice Note
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setQuickNoteOpen(true)}
                      >
                        <StickyNote className="h-4 w-4" />
                        Quick Note
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setEditModalOpen(true)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
                {client.date_of_birth && (
                  <div className="flex items-center gap-2 text-sm">
                    <Gift className="h-4 w-4 text-muted-foreground" />
                    <span>DOB: {new Date(client.date_of_birth).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-row lg:flex-col gap-4 lg:gap-2 lg:text-right shrink-0">
              <div>
                <p className="text-xs text-muted-foreground">Total Assets</p>
                <p className="text-xl font-semibold">{formatCurrency(Number(client.total_assets), true)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Risk Profile</p>
                <p className={cn('font-semibold capitalize', riskColors[client.risk_profile])}>
                  {client.risk_profile}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Reorganized per user request */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-secondary/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="overview" className="gap-2">
              <User className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="risk-profile" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Risk Profile
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="gap-2">
              <PieChart className="h-4 w-4" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Clock className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="family" className="gap-2">
              <Users className="h-4 w-4" />
              Family
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Target className="h-4 w-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-2">
              <Bell className="h-4 w-4" />
              Reminders
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="communications" className="gap-2">
              <Send className="h-4 w-4" />
              Communications
            </TabsTrigger>
            <TabsTrigger value="corporate-actions" className="gap-2">
              <Landmark className="h-4 w-4" />
              Corp Actions
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-2">
              <Wallet className="h-4 w-4" />
              Payouts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ClientOverviewTab client={client} tags={tags} onTagsChange={fetchClient} />
          </TabsContent>
          <TabsContent value="risk-profile">
            <ClientRiskProfileTab clientId={client.id} clientName={client.client_name} />
          </TabsContent>
          <TabsContent value="portfolio">
            <ClientPortfolioTab clientId={client.id} totalAssets={Number(client.total_assets)} />
          </TabsContent>
          <TabsContent value="tasks">
            <ClientTasksTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="documents">
            <ClientDocumentsTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="activity">
            <ClientActivityTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="family">
            <ClientFamilyTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="goals">
            <ClientGoalsTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="reminders">
            <ClientRemindersTab 
              clientId={client.id} 
              clientName={client.client_name} 
              dateOfBirth={client.date_of_birth} 
              anniversaryDate={client.anniversary_date} 
              kycExpiryDate={client.kyc_expiry_date} 
            />
          </TabsContent>
          <TabsContent value="notes">
            <ClientNotesTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="communications">
            <ClientCommunicationsTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="corporate-actions">
            <ClientCorporateActionsTab clientId={client.id} />
          </TabsContent>
          <TabsContent value="payouts">
            <ClientPayoutsTab clientId={client.id} />
          </TabsContent>
        </Tabs>
      </div>

      <EditClientModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        client={client}
        onSuccess={fetchClient}
      />

      <QuickNoteModal
        open={quickNoteOpen}
        onOpenChange={setQuickNoteOpen}
        clientId={client.id}
        onSuccess={() => {
          if (activeTab === 'notes') {
            // Will be refreshed by the tab
          }
        }}
      />

      <AIDraftMessageModal
        open={aiDraftOpen}
        onOpenChange={setAiDraftOpen}
        clientId={client.id}
        clientName={client.client_name}
      />

      <MeetingSummaryModal
        open={meetingSummaryOpen}
        onOpenChange={setMeetingSummaryOpen}
        clientId={client.id}
        clientName={client.client_name}
      />

      <VoiceNoteModal
        open={voiceNoteOpen}
        onOpenChange={setVoiceNoteOpen}
        clientId={client.id}
        clientName={client.client_name}
      />
    </MainLayout>
  );
};

export default ClientProfile;