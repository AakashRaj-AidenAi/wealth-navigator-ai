import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Phone, Star, Calendar, Clock, MessageSquare, 
  UserCheck, Trash2, Activity, Send, CheckCircle, ExternalLink
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadActivity = Database['public']['Tables']['lead_activities']['Row'];

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: () => void;
}

const stageLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  meeting: 'Meeting',
  proposal: 'Proposal',
  closed_won: 'Closed/Won',
  lost: 'Lost'
};

const stageColors: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-purple-500',
  meeting: 'bg-amber-500',
  proposal: 'bg-orange-500',
  closed_won: 'bg-green-500',
  lost: 'bg-red-500'
};

export const LeadDetailModal = ({ lead, onClose, onUpdate }: LeadDetailModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [clientInfo, setClientInfo] = useState<{ id: string; client_code: string; client_name: string } | null>(null);

  useEffect(() => {
    if (lead) {
      fetchActivities();
      fetchClientInfo();
    } else {
      setClientInfo(null);
    }
  }, [lead?.id]);

  const fetchActivities = async () => {
    if (!lead) return;
    
    setLoadingActivities(true);
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    
    if (data) setActivities(data);
    setLoadingActivities(false);
  };

  const fetchClientInfo = async () => {
    if (!lead?.converted_client_id) {
      setClientInfo(null);
      return;
    }
    
    const { data } = await supabase
      .from('clients')
      .select('id, client_code, client_name')
      .eq('id', lead.converted_client_id)
      .single();
    
    if (data) setClientInfo(data);
  };

  const handleViewClient = () => {
    if (clientInfo) {
      onClose();
      navigate(`/clients/${clientInfo.id}`);
    }
  };

  const handleAddNote = async () => {
    if (!lead || !user || !newNote.trim()) return;

    setAddingNote(true);

    // Add activity
    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      activity_type: 'note',
      title: 'Note added',
      description: newNote.trim(),
      created_by: user.id
    });

    // Update last activity
    await supabase
      .from('leads')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', lead.id);

    toast({
      title: 'Note Added',
      description: 'Activity logged successfully'
    });

    setNewNote('');
    fetchActivities();
    onUpdate();
    setAddingNote(false);
  };

  const handleDelete = async () => {
    if (!lead) return;

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', lead.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete lead',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Lead Deleted',
        description: `${lead.name} has been removed`
      });
      onClose();
      onUpdate();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note': return <MessageSquare className="h-4 w-4" />;
      case 'stage_change': return <Activity className="h-4 w-4" />;
      case 'created': return <Star className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (!lead) return null;

  const isConverted = lead.stage === 'closed_won' && lead.converted_client_id;

  return (
    <Dialog open={!!lead} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{lead.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={stageColors[lead.stage]}>
                  {stageLabels[lead.stage]}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {lead.source?.replace('_', ' ')}
                </Badge>
                <div className={`flex items-center gap-1 ${getScoreColor(lead.lead_score || 0)}`}>
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-medium">{lead.lead_score}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConverted && clientInfo && (
                <Button 
                  onClick={handleViewClient} 
                  variant="outline"
                  className="gap-2 border-success text-success hover:bg-success/10"
                >
                  <CheckCircle className="h-4 w-4" />
                  Converted → {clientInfo.client_code}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              {!isConverted && (
                <Button variant="ghost" size="icon" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email</span>
                </div>
                <p className="font-medium">{lead.email || 'Not provided'}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">Phone</span>
                </div>
                <p className="font-medium">{lead.phone || 'Not provided'}</p>
              </div>
            </div>

            {/* Financial Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground mb-1">Expected Value</p>
                <p className="text-xl font-bold">{formatCurrency(lead.expected_value)}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground mb-1">Weighted Value</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency((lead.expected_value || 0) * (lead.probability || 0) / 100)}
                </p>
                <p className="text-xs text-muted-foreground">{lead.probability}% probability</p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Created</span>
                </div>
                <p className="font-medium">{new Date(lead.created_at).toLocaleDateString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Last Activity</span>
                </div>
                <p className="font-medium">
                  {lead.last_activity_at 
                    ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true })
                    : 'Never'
                  }
                </p>
              </div>
            </div>

            {/* Notes */}
            {lead.notes && (
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm">{lead.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            {/* Add Note */}
            <div className="flex gap-2 mb-4">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note or log an activity..."
                rows={2}
                className="flex-1"
              />
              <Button 
                onClick={handleAddNote} 
                disabled={!newNote.trim() || addingNote}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Activity Timeline */}
            <ScrollArea className="h-[300px]">
              {loadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity recorded yet
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{activity.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
