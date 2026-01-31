import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  ArrowRight, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  due_date: string | null;
  due_time: string | null;
  client_id: string | null;
  clients?: { client_name: string } | null;
}

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

export const TodaysPlanWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchTodaysTasks();
  }, [user]);

  const fetchTodaysTasks = async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch today's high priority tasks + any overdue
    const { data } = await supabase
      .from('tasks')
      .select('id, title, priority, status, due_date, due_time, client_id, clients(client_name)')
      .eq('assigned_to', user.id)
      .neq('status', 'done')
      .neq('status', 'cancelled')
      .or(`due_date.eq.${today},due_date.lt.${today}`)
      .order('due_date', { ascending: true })
      .limit(6);

    if (data) {
      // Sort by priority
      const sorted = data.sort((a, b) => 
        priorityOrder[a.priority as keyof typeof priorityOrder] - 
        priorityOrder[b.priority as keyof typeof priorityOrder]
      );
      setTasks(sorted as Task[]);
    }
    setLoading(false);
  };

  const handleComplete = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', taskId);

    if (!error) {
      toast.success('Task completed!');
      fetchTodaysTasks();
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-warning';
      default: return 'bg-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Today's Plan</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')} className="gap-1">
          View All
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-3" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm text-muted-foreground">No high-priority tasks for today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div
              key={task.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group'
              )}
            >
              <Checkbox
                onCheckedChange={() => handleComplete(task.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full', getPriorityColor(task.priority))} />
                  <span className="text-sm font-medium truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {task.due_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.due_time.slice(0, 5)}
                    </span>
                  )}
                  {isOverdue(task.due_date) && (
                    <Badge variant="destructive" className="text-xs py-0 h-5 gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Overdue
                    </Badge>
                  )}
                  {task.clients?.client_name && (
                    <span className="truncate">{task.clients.client_name}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
