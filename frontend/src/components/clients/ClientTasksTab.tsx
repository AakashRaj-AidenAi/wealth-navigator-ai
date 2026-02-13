import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, Loader2, Trash2 } from 'lucide-react';
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

interface ClientTasksTabProps {
  clientId: string;
}

const priorityColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-muted text-muted-foreground'
};

export const ClientTasksTab = ({ clientId }: ClientTasksTabProps) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    priority: 'medium'
  });

  const canEdit = role === 'wealth_advisor';

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Use activities with specific types as tasks
      const data = await api.get('/client_activities', { client_id: clientId, activity_type: 'meeting,reminder' });
      setTasks(extractItems<Activity>(data));
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [clientId]);

  const handleAdd = async () => {
    if (!form.title || !user) {
      toast({ title: 'Error', description: 'Task title is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/client_activities', {
        client_id: clientId,
        created_by: user.id,
        activity_type: 'meeting',
        title: form.title,
        description: form.description || null,
        scheduled_at: form.scheduled_at || null,
        metadata: { priority: form.priority }
      });
      toast({ title: 'Success', description: 'Task created' });
      setModalOpen(false);
      setForm({ title: '', description: '', scheduled_at: '', priority: 'medium' });
      fetchTasks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create task', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleToggleComplete = async (task: Activity) => {
    try {
      await api.put('/client_activities/' + task.id, {
        completed_at: task.completed_at ? null : new Date().toISOString()
      });
      fetchTasks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update task', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete('/client_activities/' + taskToDelete);
      toast({ title: 'Deleted', description: 'Task removed' });
      fetchTasks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete task', variant: 'destructive' });
    }
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return !task.completed_at;
    if (filter === 'completed') return !!task.completed_at;
    return true;
  });

  const pendingCount = tasks.filter(t => !t.completed_at).length;
  const completedCount = tasks.filter(t => !!t.completed_at).length;

  const isOverdue = (task: Activity) => {
    if (task.completed_at) return false;
    if (!task.scheduled_at) return false;
    return new Date(task.scheduled_at) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Tasks</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Circle className="h-3 w-3" />
              {pendingCount} pending
            </Badge>
            <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/20">
              <CheckCircle2 className="h-3 w-3" />
              {completedCount} done
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {canEdit && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          )}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === 'completed' ? 'No completed tasks' : filter === 'pending' ? 'No pending tasks' : 'No tasks yet'}
            </p>
            {canEdit && filter !== 'completed' && (
              <Button className="mt-4" variant="outline" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task);
            const priority = (task as any).metadata?.priority || 'medium';
            return (
              <Card key={task.id} className={cn('glass group', task.completed_at && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {canEdit && (
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {task.completed_at ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn('font-medium', task.completed_at && 'line-through')}>
                          {task.title}
                        </p>
                        {overdue && (
                          <Badge variant="outline" className="gap-1 bg-destructive/10 text-destructive border-destructive/20">
                            <AlertCircle className="h-3 w-3" />
                            Overdue
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn('text-xs capitalize', priorityColors[priority])}>
                          {priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      )}
                      {task.scheduled_at && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(task.scheduled_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { setTaskToDelete(task.id); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
                placeholder="e.g., Quarterly portfolio review"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                placeholder="Add details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input 
                  type="datetime-local" 
                  value={form.scheduled_at} 
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};