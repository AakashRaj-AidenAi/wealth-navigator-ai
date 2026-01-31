import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { formatCurrency } from '@/lib/currency';
import { Plus, Target, GraduationCap, Home, Briefcase, Heart, Plane, Loader2, Trash2 } from 'lucide-react';
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

interface LifeGoal {
  id: string;
  goal_type: string;
  name: string;
  description: string | null;
  target_amount: number | null;
  target_date: string | null;
  priority: string;
  status: string;
}

interface ClientGoalsTabProps {
  clientId: string;
}

const goalTypeIcons: Record<string, React.ElementType> = {
  retirement: Heart,
  education: GraduationCap,
  house: Home,
  wealth: Briefcase,
  travel: Plane,
  other: Target
};

const priorityColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-muted text-muted-foreground'
};

export const ClientGoalsTab = ({ clientId }: ClientGoalsTabProps) => {
  const { role } = useAuth();
  const { toast } = useToast();
  
  const [goals, setGoals] = useState<LifeGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    goal_type: '',
    name: '',
    description: '',
    target_amount: '',
    target_date: '',
    priority: 'medium'
  });

  const canEdit = role === 'wealth_advisor';

  const fetchGoals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_life_goals')
      .select('*')
      .eq('client_id', clientId)
      .order('priority', { ascending: true });

    if (data) setGoals(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, [clientId]);

  const handleAdd = async () => {
    if (!form.goal_type || !form.name) {
      toast({ title: 'Error', description: 'Goal type and name are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('client_life_goals').insert({
      client_id: clientId,
      goal_type: form.goal_type,
      name: form.name,
      description: form.description || null,
      target_amount: form.target_amount ? parseFloat(form.target_amount) : null,
      target_date: form.target_date || null,
      priority: form.priority
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Goal added' });
      setModalOpen(false);
      setForm({ goal_type: '', name: '', description: '', target_amount: '', target_date: '', priority: 'medium' });
      fetchGoals();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!goalToDelete) return;
    const { error } = await supabase.from('client_life_goals').delete().eq('id', goalToDelete);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Goal removed' });
      fetchGoals();
    }
    setDeleteDialogOpen(false);
    setGoalToDelete(null);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Life Goals</h3>
        {canEdit && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        )}
      </div>

      {goals.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No goals defined yet</p>
            {canEdit && (
              <Button className="mt-4" variant="outline" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Goal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const Icon = goalTypeIcons[goal.goal_type] || Target;
            return (
              <Card key={goal.id} className="glass group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={priorityColors[goal.priority]}>
                        {goal.priority}
                      </Badge>
                      {canEdit && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => { setGoalToDelete(goal.id); setDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2">{goal.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{goal.description}</p>
                  )}
                  <div className="space-y-2 text-sm">
                    {goal.target_amount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target</span>
                        <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
                      </div>
                    )}
                    {goal.target_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target Date</span>
                        <span>{new Date(goal.target_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Life Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goal Type *</Label>
                <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retirement">Retirement</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="house">House/Property</SelectItem>
                    <SelectItem value="wealth">Wealth Creation</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Goal Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Children's Education Fund" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add details about this goal..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Amount</Label>
                <Input type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
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
