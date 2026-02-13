// This component is deprecated - using LeadQuickActionsDrawer instead
// Keeping for backwards compatibility

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Star, Calendar, Clock, MessageSquare,
  UserCheck, Trash2, Activity, Send, CheckCircle, ExternalLink
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  expected_value: number | null;
  stage: string;
  source: string | null;
  lead_score: number | null;
  probability: number | null;
  notes: string | null;
  converted_client_id: string | null;
  converted_at: string | null;
  last_activity_at: string | null;
  loss_reason: string | null;
  next_follow_up: string | null;
  created_at: string;
  assigned_to: string | null;
}

interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

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
  contacted: 'bg-cyan-500',
  meeting: 'bg-amber-500',
  proposal: 'bg-purple-500',
  closed_won: 'bg-success',
  lost: 'bg-destructive'
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
    try {
      const data = await api.get<LeadActivity[]>('/lead_activities', { lead_id: lead.id });
      setActivities(data);
    } catch {
      // API client already shows toast on error
    }
    setLoadingActivities(false);
  };

  const fetchClientInfo = async () => {
    if (!lead?.converted_client_id) {
      setClientInfo(null);
      return;
    }

    try {
      const data = await api.get<{ id: string; client_code: string; client_name: string }>(`/clients/${lead.converted_client_id}`);
      setClientInfo(data);
    } catch {
      setClientInfo(null);
    }
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

    try {
      await api.post('/lead_activities', {
        lead_id: lead.id,
        activity_type: 'note',
        title: 'Note added',
        description: newNote.trim(),
        created_by: user.id
      });

      await api.put(`/leads/${lead.id}`, { last_activity_at: new Date().toISOString() });

      toast({
        title: 'Note Added',
        description: 'Activity logged successfully'
      });

      setNewNote('');
      fetchActivities();
      onUpdate();
    } catch {
      // API client already shows toast on error
    }
    setAddingNote(false);
  };

  const handleDelete = async () => {
    if (!lead) return;

    try {
      await api.delete(`/leads/${lead.id}`);
      toast({
        title: 'Lead Deleted',
        description: `${lead.name} has been removed`
      });
      onClose();
      onUpdate();
    } catch {
      // API client already shows toast on error
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

            {lead.notes && (
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm">{lead.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
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

