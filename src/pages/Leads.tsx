import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, LayoutGrid, List, BarChart3, RefreshCw
} from 'lucide-react';
import { EnhancedLeadPipeline } from '@/components/leads/EnhancedLeadPipeline';
import { LeadListView } from '@/components/leads/LeadListView';
import { AddLeadModal } from '@/components/leads/AddLeadModal';
import { LeadQuickActionsDrawer } from '@/components/leads/LeadQuickActionsDrawer';
import { PipelineAnalytics } from '@/components/leads/PipelineAnalytics';
import { RevenueForecast } from '@/components/leads/RevenueForecast';
import { formatCurrencyShort } from '@/lib/currency';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadStage = Database['public']['Enums']['lead_stage'];

// Stage-based automation rules
const stageAutomationRules: Record<LeadStage, { taskTitle: string; taskDescription: string; dueDays: number; priority: 'low' | 'medium' | 'high' | 'urgent' } | null> = {
  new: { 
    taskTitle: 'Initial contact with lead',
    taskDescription: 'Make first contact with the new lead to qualify the opportunity.',
    dueDays: 1,
    priority: 'high'
  },
  contacted: { 
    taskTitle: 'Follow-up call',
    taskDescription: 'Follow up on initial contact and gather more information.',
    dueDays: 2,
    priority: 'medium'
  },
  meeting: { 
    taskTitle: 'Prepare meeting presentation',
    taskDescription: 'Prepare proposal materials and presentation for the upcoming meeting.',
    dueDays: 1,
    priority: 'high'
  },
  proposal: { 
    taskTitle: 'Follow-up on proposal',
    taskDescription: 'Follow up with the lead to discuss the proposal and address any questions.',
    dueDays: 3,
    priority: 'high'
  },
  closed_won: null, // Handled by database trigger
  lost: null
};

const Leads = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list' | 'analytics'>('pipeline');
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setLeads(data);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch leads',
        variant: 'destructive'
      });
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  const handleStageChange = useCallback(async (leadId: string, newStage: LeadStage) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !user) return;

    // Don't allow moving converted leads
    if (lead.stage === 'closed_won' && lead.converted_client_id) {
      toast({
        title: 'Cannot Move',
        description: 'This lead has been converted to a client.',
        variant: 'destructive'
      });
      return;
    }

    // Optimistic update
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, stage: newStage } : l
    ));

    // Update lead stage (trigger will log history)
    const { data: updatedLead, error } = await supabase
      .from('leads')
      .update({ 
        stage: newStage,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select('*, clients!leads_converted_client_id_fkey(id, client_code, client_name)')
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update lead stage',
        variant: 'destructive'
      });
      // Revert optimistic update
      fetchLeads(false);
      return;
    }

    // Log activity for non-closed stages
    if (newStage !== 'closed_won' && newStage !== 'lost') {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'stage_change',
        title: `Stage changed to ${newStage.replace('_', ' ')}`,
        description: `Lead moved from ${lead.stage.replace('_', ' ')} to ${newStage.replace('_', ' ')}`,
        created_by: user.id
      });

      // Auto-create task based on stage automation rules
      const automationRule = stageAutomationRules[newStage];
      if (automationRule) {
        await supabase.from('tasks').insert({
          title: `${automationRule.taskTitle} - ${lead.name}`,
          description: automationRule.taskDescription,
          priority: automationRule.priority,
          status: 'todo',
          due_date: new Date(Date.now() + automationRule.dueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          trigger_type: 'new_lead',
          assigned_to: user.id,
          created_by: user.id
        });
      }
    }

    // Refresh leads to get updated data
    await fetchLeads(false);

    // Show appropriate toast
    if (newStage === 'closed_won' && updatedLead?.converted_client_id) {
      const clientData = updatedLead.clients as { id: string; client_code: string; client_name: string } | null;
      toast({
        title: '🎉 Lead Successfully Converted to Client',
        description: clientData?.client_code 
          ? `${lead.name} is now Client ${clientData.client_code}. Onboarding tasks have been created automatically.`
          : `${lead.name} has been converted to a client. Onboarding tasks have been created automatically.`,
      });
    } else if (newStage === 'lost') {
      toast({
        title: 'Lead Closed',
        description: `${lead.name} marked as lost`
      });
    } else {
      toast({
        title: 'Stage Updated',
        description: `${lead.name} moved to ${newStage.replace('_', ' ')}`
      });
    }
  }, [leads, user, toast]);

  const handleLeadClick = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  }, []);

  const handleQuickAction = useCallback((lead: Lead, action: string) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
    // The drawer will handle the specific action
  }, []);

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone?.includes(searchQuery)
  );

  // Calculate metrics
  const openLeads = leads.filter(l => l.stage !== 'closed_won' && l.stage !== 'lost');
  const totalLeads = openLeads.length;
  const pipelineValue = openLeads.reduce((sum, l) => sum + ((l.expected_value || 0) * (l.probability || 0) / 100), 0);
  const closedWonValue = leads
    .filter(l => l.stage === 'closed_won')
    .reduce((sum, l) => sum + (l.expected_value || 0), 0);
  const conversionRate = leads.length > 0 
    ? (leads.filter(l => l.stage === 'closed_won').length / leads.length) * 100 
    : 0;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Lead Pipeline</h1>
            <p className="text-muted-foreground">
              Manage prospects, track conversions, and grow your client base
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => fetchLeads(false)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              className="bg-gradient-gold hover:opacity-90 gap-2"
              onClick={() => setAddLeadOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Active Leads</p>
            <p className="text-2xl font-bold">{totalLeads}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Pipeline Value</p>
            <p className="text-2xl font-bold text-primary">{formatCurrencyShort(pipelineValue)}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Won Revenue</p>
            <p className="text-2xl font-bold text-success">{formatCurrencyShort(closedWonValue)}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
            <Button
              variant={viewMode === 'pipeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('pipeline')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Pipeline
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('analytics')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Revenue Forecast - Only show in pipeline/list view */}
        {viewMode !== 'analytics' && <RevenueForecast leads={leads} />}

        {/* Main Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : viewMode === 'pipeline' ? (
          <EnhancedLeadPipeline 
            leads={filteredLeads} 
            onStageChange={handleStageChange}
            onLeadClick={handleLeadClick}
            onQuickAction={handleQuickAction}
          />
        ) : viewMode === 'list' ? (
          <LeadListView 
            leads={filteredLeads}
            onLeadClick={handleLeadClick}
          />
        ) : (
          <PipelineAnalytics leads={leads} />
        )}
      </div>

      <AddLeadModal 
        open={addLeadOpen} 
        onOpenChange={setAddLeadOpen}
        onSuccess={() => fetchLeads(false)}
      />

      <LeadQuickActionsDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdate={() => fetchLeads(false)}
        onStageChange={handleStageChange}
      />
    </MainLayout>
  );
};

export default Leads;
