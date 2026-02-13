import { useState } from 'react';
import { Task } from '@/pages/Tasks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  MoreHorizontal, 
  Clock, 
  User, 
  Calendar,
  AlertCircle,
  ArrowRight,
  Repeat,
  Trash2,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface TaskListViewProps {
  tasks: Task[];
  loading: boolean;
  onUpdate: () => void;
}

const priorityConfig = {
  urgent: { label: 'Urgent', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  high: { label: 'High', class: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium: { label: 'Medium', class: 'bg-warning/10 text-warning border-warning/20' },
  low: { label: 'Low', class: 'bg-muted text-muted-foreground border-border' },
};

const statusConfig = {
  todo: { label: 'To Do', class: 'bg-secondary text-secondary-foreground' },
  in_progress: { label: 'In Progress', class: 'bg-primary/10 text-primary' },
  done: { label: 'Done', class: 'bg-success/10 text-success' },
  cancelled: { label: 'Cancelled', class: 'bg-muted text-muted-foreground' },
};

export const TaskListView = ({ tasks, loading, onUpdate }: TaskListViewProps) => {
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggleComplete = async (task: Task) => {
    setUpdatingId(task.id);
    const newStatus = task.status === 'done' ? 'todo' : 'done';

    try {
      await api.put(`/tasks/${task.id}`, {
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      });
      toast.success(newStatus === 'done' ? 'Task completed!' : 'Task reopened');
      onUpdate();
    } catch {
      toast.error('Failed to update task');
    }
    setUpdatingId(null);
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    try {
      await api.put(`/tasks/${task.id}`, {
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      });
      onUpdate();
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Task deleted');
      onUpdate();
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const getDueDateLabel = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date)) return 'Overdue';
    return format(date, 'MMM d');
  };

  const getDueDateClass = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'done') return 'text-muted-foreground';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-warning';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="glass rounded-xl divide-y divide-border">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-2">No tasks found</h3>
        <p className="text-muted-foreground text-sm">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl divide-y divide-border overflow-hidden">
      {tasks.map(task => (
        <div
          key={task.id}
          className={cn(
            'p-4 flex items-start gap-4 hover:bg-secondary/30 transition-colors group',
            task.status === 'done' && 'opacity-60'
          )}
        >
          <Checkbox
            checked={task.status === 'done'}
            onCheckedChange={() => handleToggleComplete(task)}
            disabled={updatingId === task.id}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <span className={cn(
                'font-medium',
                task.status === 'done' && 'line-through text-muted-foreground'
              )}>
                {task.title}
              </span>
              <Badge variant="outline" className={cn('text-xs', priorityConfig[task.priority].class)}>
                {priorityConfig[task.priority].label}
              </Badge>
              {task.is_recurring && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Repeat className="h-3 w-3" />
                  {task.recurrence_pattern}
                </Badge>
              )}
            </div>
            
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {task.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 mt-2 text-xs">
              {task.due_date && (
                <span className={cn('flex items-center gap-1', getDueDateClass(task.due_date, task.status))}>
                  {isPast(new Date(task.due_date)) && task.status !== 'done' && !isToday(new Date(task.due_date)) && (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  <Clock className="h-3 w-3" />
                  {getDueDateLabel(task.due_date)}
                  {task.due_time && ` at ${task.due_time.slice(0, 5)}`}
                </span>
              )}
              
              {task.clients?.client_name && (
                <button
                  onClick={() => navigate(`/clients/${task.client_id}`)}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <User className="h-3 w-3" />
                  {task.clients.client_name}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
              
              <Badge variant="secondary" className={cn('text-xs', statusConfig[task.status].class)}>
                {statusConfig[task.status].label}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange(task, 'todo')}>
                Set to To Do
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(task, 'in_progress')}>
                Set to In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(task, 'done')}>
                Mark Complete
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(task.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
};
