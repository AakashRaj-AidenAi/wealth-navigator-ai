import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface QuickAddTaskProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultClientId?: string;
}

interface Client {
  id: string;
  client_name: string;
}

export const QuickAddTask = ({ open, onOpenChange, onSuccess, defaultClientId }: QuickAddTaskProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_date: '',
    due_time: '',
    client_id: defaultClientId || '',
    is_recurring: false,
    recurrence_pattern: '' as '' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  });

  useEffect(() => {
    if (open && user) {
      fetchClients();
      if (defaultClientId) {
        setForm(f => ({ ...f, client_id: defaultClientId }));
      }
    }
  }, [open, user, defaultClientId]);

  const fetchClients = async () => {
    try {
      const data = extractItems<Client>(await api.get('/clients'));
      setClients(data);
    } catch { /* API client shows toast */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim()) return;

    setSaving(true);
    try {
      await api.post('/tasks', {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        due_date: form.due_date || null,
        due_time: form.due_time || null,
        client_id: form.client_id || null,
        is_recurring: form.is_recurring,
        recurrence_pattern: form.is_recurring ? form.recurrence_pattern : null,
        next_occurrence: form.is_recurring && form.due_date ? form.due_date : null,
        assigned_to: user.id,
        created_by: user.id,
        trigger_type: 'manual',
      });
      toast.success('Task created');
      onOpenChange(false);
      setForm({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        due_time: '',
        client_id: defaultClientId || '',
        is_recurring: false,
        recurrence_pattern: '',
      });
      onSuccess();
    } catch {
      toast.error('Failed to create task');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter task title..."
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add details..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={form.priority} onValueChange={(v: typeof form.priority) => setForm({ ...form, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="client">Link to Client</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="due_time">Time</Label>
              <Input
                id="due_time"
                type="time"
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
            <div>
              <p className="font-medium text-sm">Recurring Task</p>
              <p className="text-xs text-muted-foreground">Automatically recreate this task</p>
            </div>
            <Switch
              checked={form.is_recurring}
              onCheckedChange={(checked) => setForm({ ...form, is_recurring: checked })}
            />
          </div>

          {form.is_recurring && (
            <div>
              <Label htmlFor="recurrence">Repeat</Label>
              <Select 
                value={form.recurrence_pattern} 
                onValueChange={(v: typeof form.recurrence_pattern) => setForm({ ...form, recurrence_pattern: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
