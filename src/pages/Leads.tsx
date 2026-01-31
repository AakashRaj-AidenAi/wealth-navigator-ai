import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, TrendingUp, Users, DollarSign, Target,
  LayoutGrid, List
} from 'lucide-react';
import { LeadPipeline } from '@/components/leads/LeadPipeline';
import { LeadListView } from '@/components/leads/LeadListView';
import { AddLeadModal } from '@/components/leads/AddLeadModal';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { RevenueForecast } from '@/components/leads/RevenueForecast';
import { formatCurrencyShort } from '@/lib/currency';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadStage = Database['public']['Enums']['lead_stage'];

const Leads = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
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
  };

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !user) return;

    // For closed_won, the database trigger handles automatic conversion
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
      return;
    }

    // Log activity for non-conversion stage changes
    if (newStage !== 'closed_won') {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'stage_change',
        title: `Stage changed to ${newStage.replace('_', ' ')}`,
        description: `Lead moved from ${lead.stage.replace('_', ' ')} to ${newStage.replace('_', ' ')}`,
        created_by: user.id
      });

      // Auto-create task for stage change
      await supabase.from('tasks').insert({
        title: `Follow up with ${lead.name} - ${newStage.replace('_', ' ')} stage`,
        description: `Lead "${lead.name}" has moved to ${newStage.replace('_', ' ')} stage. Take appropriate action.`,
        priority: newStage === 'proposal' ? 'high' : 'medium',
        status: 'todo',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        trigger_type: 'new_lead',
        assigned_to: user.id,
        created_by: user.id
      });
    }

    // Refresh leads to get updated data
    await fetchLeads();

    // Show appropriate toast
    if (newStage === 'closed_won' && updatedLead?.converted_client_id) {
      const clientData = updatedLead.clients as { id: string; client_code: string; client_name: string } | null;
      toast({
        title: '🎉 Lead Successfully Converted to Client',
        description: clientData?.client_code 
          ? `${lead.name} is now Client ${clientData.client_code}. Onboarding tasks have been created automatically.`
          : `${lead.name} has been converted to a client. Onboarding tasks have been created automatically.`,
      });
    } else {
      toast({
        title: 'Stage Updated',
        description: `Lead moved to ${newStage.replace('_', ' ')}`
      });
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate metrics
  const totalLeads = leads.filter(l => l.stage !== 'closed_won' && l.stage !== 'lost').length;
  const pipelineValue = leads
    .filter(l => l.stage !== 'closed_won' && l.stage !== 'lost')
    .reduce((sum, l) => sum + ((l.expected_value || 0) * (l.probability || 0) / 100), 0);
  const conversionRate = leads.length > 0 
    ? (leads.filter(l => l.stage === 'closed_won').length / leads.length) * 100 
    : 0;
  const avgDealSize = leads.filter(l => l.stage === 'closed_won').length > 0
    ? leads.filter(l => l.stage === 'closed_won').reduce((sum, l) => sum + (l.expected_value || 0), 0) / 
      leads.filter(l => l.stage === 'closed_won').length
    : 0;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Lead Pipeline</h1>
            <p className="text-muted-foreground">
              Manage prospects and track conversions
            </p>
          </div>
          <Button 
            className="bg-gradient-gold hover:opacity-90 gap-2"
            onClick={() => setAddLeadOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Leads</p>
                <p className="text-2xl font-semibold">{totalLeads}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-semibold">{formatCurrencyShort(pipelineValue)}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-2/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-semibold">{conversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                <p className="text-2xl font-semibold">{formatCurrencyShort(avgDealSize)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
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
          </div>
        </div>

        {/* Revenue Forecast */}
        <RevenueForecast leads={leads} />

        {/* Main Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : viewMode === 'pipeline' ? (
          <LeadPipeline 
            leads={filteredLeads} 
            onStageChange={handleStageChange}
            onLeadClick={setSelectedLead}
          />
        ) : (
          <LeadListView 
            leads={filteredLeads}
            onLeadClick={setSelectedLead}
          />
        )}
      </div>

      <AddLeadModal 
        open={addLeadOpen} 
        onOpenChange={setAddLeadOpen}
        onSuccess={fetchLeads}
      />

      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={fetchLeads}
      />
    </MainLayout>
  );
};

export default Leads;
