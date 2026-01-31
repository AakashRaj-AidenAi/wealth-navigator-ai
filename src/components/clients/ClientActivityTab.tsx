import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Phone, Mail, Calendar, MessageSquare, FileText, Bell, Clock, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ClientActivityTabProps {
  clientId: string;
}

const activityIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  document: FileText,
  reminder: Bell
};

const activityColors: Record<string, string> = {
  call: 'bg-green-500/10 text-green-500',
  email: 'bg-blue-500/10 text-blue-500',
  meeting: 'bg-purple-500/10 text-purple-500',
  note: 'bg-amber-500/10 text-amber-500',
  document: 'bg-cyan-500/10 text-cyan-500',
  reminder: 'bg-pink-500/10 text-pink-500'
};

export const ClientActivityTab = ({ clientId }: ClientActivityTabProps) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    activity_type: '',
    title: '',
    description: '',
    scheduled_at: ''
  });

  const canEdit = role === 'wealth_advisor';

  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_activities')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (data) setActivities(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, [clientId]);

  const handleAdd = async () => {
    if (!form.activity_type || !form.title || !user) {
      toast({ title: 'Error', description: 'Activity type and title are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('client_activities').insert({
      client_id: clientId,
      created_by: user.id,
      activity_type: form.activity_type as any,
      title: form.title,
      description: form.description || null,
      scheduled_at: form.scheduled_at || null
    });

    // Automation: Create a follow-up task when meeting is logged
    if (!error && form.activity_type === 'meeting') {
      await supabase.from('tasks').insert({
        title: `Follow-up: ${form.title}`,
        description: `Follow up after meeting: ${form.title}${form.description ? `\n\nNotes: ${form.description}` : ''}`,
        priority: 'medium',
        status: 'todo',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        client_id: clientId,
        trigger_type: 'meeting_logged',
        assigned_to: user.id,
        created_by: user.id,
      });
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Activity logged' });
      setModalOpen(false);
      setForm({ activity_type: '', title: '', description: '', scheduled_at: '' });
      fetchActivities();
    }
    setSaving(false);
  };

  const handleMarkComplete = async (activityId: string) => {
    const { error } = await supabase
      .from('client_activities')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', activityId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchActivities();
    }
  };

  const handleDelete = async () => {
    if (!activityToDelete) return;
    const { error } = await supabase.from('client_activities').delete().eq('id', activityToDelete);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Activity removed' });
      fetchActivities();
    }
    setDeleteDialogOpen(false);
    setActivityToDelete(null);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activity Timeline</h3>
        {canEdit && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Activity
          </Button>
        )}
      </div>

      {activities.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No activities logged</p>
            {canEdit && (
              <Button className="mt-4" variant="outline" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log First Activity
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.activity_type] || Clock;
              return (
                <div key={activity.id} className="relative pl-14">
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute left-4 top-4 h-5 w-5 rounded-full flex items-center justify-center -translate-x-1/2',
                    activityColors[activity.activity_type]
                  )}>
                    <Icon className="h-3 w-3" />
                  </div>
                  
                  <Card className={cn('glass group', activity.completed_at && 'opacity-60')}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {activity.activity_type}
                            </Badge>
                            {activity.completed_at && (
                              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                                Completed
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{activity.title}</p>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Created: {formatDateTime(activity.created_at)}</span>
                            {activity.scheduled_at && (
                              <span>Scheduled: {formatDateTime(activity.scheduled_at)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit && !activity.completed_at && (
                            <Button variant="outline" size="sm" onClick={() => handleMarkComplete(activity.id)}>
                              Mark Complete
                            </Button>
                          )}
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => { setActivityToDelete(activity.id); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Activity Type *</Label>
              <Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Quarterly review call" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add details..." />
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date/Time</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
