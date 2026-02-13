import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Bell, Gift, Heart, Shield, Calendar, Check, Trash2, Loader2, AlertTriangle } from 'lucide-react';
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

interface Reminder {
  id: string;
  reminder_type: string;
  title: string;
  description: string | null;
  reminder_date: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  is_completed: boolean;
  completed_at: string | null;
}

interface ClientRemindersTabProps {
  clientId: string;
  clientName: string;
  dateOfBirth: string | null;
  anniversaryDate: string | null;
  kycExpiryDate: string | null;
}

const reminderIcons: Record<string, React.ElementType> = {
  birthday: Gift,
  anniversary: Heart,
  kyc_expiry: Shield,
  maturity_date: Calendar,
  review_meeting: Calendar,
  custom: Bell
};

const reminderColors: Record<string, string> = {
  birthday: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  anniversary: 'bg-red-500/10 text-red-500 border-red-500/20',
  kyc_expiry: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  maturity_date: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  review_meeting: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  custom: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
};

export const ClientRemindersTab = ({ clientId, clientName, dateOfBirth, anniversaryDate, kycExpiryDate }: ClientRemindersTabProps) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    reminder_type: '',
    title: '',
    description: '',
    reminder_date: '',
    is_recurring: false,
    recurrence_pattern: ''
  });

  const canEdit = role === 'wealth_advisor';

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const data = await api.get('/client_reminders', { client_id: clientId });
      setReminders(extractItems<Reminder>(data));
    } catch (err) {
      console.error('Failed to load reminders:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReminders();
  }, [clientId]);

  const handleAdd = async () => {
    if (!form.reminder_type || !form.title || !form.reminder_date || !user) {
      toast({ title: 'Error', description: 'Type, title, and date are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/client_reminders', {
        client_id: clientId,
        created_by: user.id,
        reminder_type: form.reminder_type,
        title: form.title,
        description: form.description || null,
        reminder_date: form.reminder_date,
        is_recurring: form.is_recurring,
        recurrence_pattern: form.recurrence_pattern || null
      });
      toast({ title: 'Success', description: 'Reminder created' });
      setModalOpen(false);
      setForm({ reminder_type: '', title: '', description: '', reminder_date: '', is_recurring: false, recurrence_pattern: '' });
      fetchReminders();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create reminder', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleComplete = async (reminderId: string) => {
    try {
      await api.put('/client_reminders/' + reminderId, { is_completed: true, completed_at: new Date().toISOString() });
      fetchReminders();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update reminder', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!reminderToDelete) return;
    try {
      await api.delete('/client_reminders/' + reminderToDelete);
      toast({ title: 'Deleted', description: 'Reminder removed' });
      fetchReminders();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete reminder', variant: 'destructive' });
    }
    setDeleteDialogOpen(false);
    setReminderToDelete(null);
  };

  const createAutoReminder = async (type: 'birthday' | 'anniversary' | 'kyc_expiry', date: string) => {
    if (!user) return;

    const titles: Record<string, string> = {
      birthday: `${clientName}'s Birthday`,
      anniversary: `${clientName}'s Anniversary`,
      kyc_expiry: `${clientName}'s KYC Expiry`
    };

    setSaving(true);
    try {
      await api.post('/client_reminders', {
        client_id: clientId,
        created_by: user.id,
        reminder_type: type,
        title: titles[type],
        reminder_date: date,
        is_recurring: type !== 'kyc_expiry'
      });
      toast({ title: 'Success', description: 'Auto reminder created' });
      fetchReminders();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create reminder', variant: 'destructive' });
    }
    setSaving(false);
  };

  const isUpcoming = (date: string) => {
    const reminderDate = new Date(date);
    const today = new Date();
    const diffDays = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const isPast = (date: string) => new Date(date) < new Date();

  // Check for missing auto-reminders
  const hasBirthdayReminder = reminders.some(r => r.reminder_type === 'birthday');
  const hasAnniversaryReminder = reminders.some(r => r.reminder_type === 'anniversary');
  const hasKycReminder = reminders.some(r => r.reminder_type === 'kyc_expiry');

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const activeReminders = reminders.filter(r => !r.is_completed);
  const completedReminders = reminders.filter(r => r.is_completed);

  return (
    <div className="space-y-6">
      {/* Auto-reminder suggestions */}
      {canEdit && (dateOfBirth || anniversaryDate || kycExpiryDate) && (
        <Card className="glass border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Quick Auto-Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dateOfBirth && !hasBirthdayReminder && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => createAutoReminder('birthday', dateOfBirth)}
                  disabled={saving}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Add Birthday Reminder
                </Button>
              )}
              {anniversaryDate && !hasAnniversaryReminder && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => createAutoReminder('anniversary', anniversaryDate)}
                  disabled={saving}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Add Anniversary Reminder
                </Button>
              )}
              {kycExpiryDate && !hasKycReminder && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => createAutoReminder('kyc_expiry', kycExpiryDate)}
                  disabled={saving}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Add KYC Expiry Reminder
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reminders</h3>
        {canEdit && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Reminder
          </Button>
        )}
      </div>

      {activeReminders.length === 0 && completedReminders.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No reminders set</p>
            {canEdit && (
              <Button className="mt-4" variant="outline" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Reminder
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Reminders */}
          {activeReminders.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Upcoming</h4>
              {activeReminders.map((reminder) => {
                const Icon = reminderIcons[reminder.reminder_type] || Bell;
                const upcoming = isUpcoming(reminder.reminder_date);
                const past = isPast(reminder.reminder_date);
                
                return (
                  <Card key={reminder.id} className={cn('glass', upcoming && 'border-primary/30')}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', reminderColors[reminder.reminder_type])}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{reminder.title}</p>
                              {upcoming && <Badge className="bg-primary text-primary-foreground text-xs">This Week</Badge>}
                              {past && !reminder.is_completed && (
                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                              {reminder.is_recurring && (
                                <Badge variant="outline" className="text-xs">Recurring</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(reminder.reminder_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleComplete(reminder.id)}>
                              <Check className="h-4 w-4 mr-1" />
                              Done
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => { setReminderToDelete(reminder.id); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Completed Reminders */}
          {completedReminders.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Completed</h4>
              {completedReminders.slice(0, 5).map((reminder) => {
                const Icon = reminderIcons[reminder.reminder_type] || Bell;
                return (
                  <Card key={reminder.id} className="glass opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium line-through">{reminder.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Completed {reminder.completed_at && new Date(reminder.completed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {canEdit && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => { setReminderToDelete(reminder.id); setDeleteDialogOpen(true); }}
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
        </>
      )}

      {/* Add Reminder Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reminder Type *</Label>
              <Select value={form.reminder_type} onValueChange={(v) => setForm({ ...form, reminder_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                  <SelectItem value="kyc_expiry">KYC Expiry</SelectItem>
                  <SelectItem value="maturity_date">Maturity Date</SelectItem>
                  <SelectItem value="review_meeting">Review Meeting</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Annual portfolio review" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add notes..." />
            </div>
            <div className="space-y-2">
              <Label>Reminder Date *</Label>
              <Input type="date" value={form.reminder_date} onChange={(e) => setForm({ ...form, reminder_date: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Recurring Reminder</Label>
              <Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
            </div>
            {form.is_recurring && (
              <div className="space-y-2">
                <Label>Recurrence Pattern</Label>
                <Select value={form.recurrence_pattern} onValueChange={(v) => setForm({ ...form, recurrence_pattern: v })}>
                  <SelectTrigger><SelectValue placeholder="Select pattern" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
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
