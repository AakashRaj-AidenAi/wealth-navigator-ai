import { Task } from '@/pages/Tasks';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  User,
  AlertCircle,
  Repeat,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface TaskKanbanViewProps {
  tasks: Task[];
  loading: boolean;
  onUpdate: () => void;
}

const columns: { key: Task['status']; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: 'bg-secondary' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-primary/20' },
  { key: 'done', label: 'Done', color: 'bg-success/20' },
];

const priorityConfig = {
  urgent: { label: 'Urgent', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  high: { label: 'High', class: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  medium: { label: 'Medium', class: 'bg-warning/10 text-warning border-warning/20' },
  low: { label: 'Low', class: 'bg-muted text-muted-foreground border-border' },
};

export const TaskKanbanView = ({ tasks, loading, onUpdate }: TaskKanbanViewProps) => {
  const navigate = useNavigate();

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');

    try {
      await api.put(`/tasks/${taskId}`, {
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      });
      toast.success('Task updated');
      onUpdate();
    } catch {
      toast.error('Failed to update task');
    }
  };

  const getTasksByStatus = (status: Task['status']) => 
    tasks.filter(t => t.status === status);

  const getDueDateClass = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'done') return 'text-muted-foreground';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-warning';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => (
          <div key={col.key} className="glass rounded-xl p-4">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[500px]">
      {columns.map(column => (
        <div
          key={column.key}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.key)}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', column.color)} />
              <h3 className="font-semibold">{column.label}</h3>
            </div>
            <Badge variant="secondary">{getTasksByStatus(column.key).length}</Badge>
          </div>

          <div className="space-y-3 min-h-[200px]">
            {getTasksByStatus(column.key).map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                className={cn(
                  'bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing',
                  'hover:shadow-md transition-shadow group'
                )}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn(
                        'font-medium text-sm',
                        task.status === 'done' && 'line-through text-muted-foreground'
                      )}>
                        {task.title}
                      </span>
                      <Badge variant="outline" className={cn('text-xs flex-shrink-0', priorityConfig[task.priority].class)}>
                        {priorityConfig[task.priority].label}
                      </Badge>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {task.due_date && (
                        <span className={cn('flex items-center gap-1 text-xs', getDueDateClass(task.due_date, task.status))}>
                          {isPast(new Date(task.due_date)) && task.status !== 'done' && !isToday(new Date(task.due_date)) && (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      )}
                      
                      {task.is_recurring && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Repeat className="h-3 w-3" />
                          {task.recurrence_pattern}
                        </span>
                      )}
                      
                      {task.clients?.client_name && (
                        <button
                          onClick={() => navigate(`/clients/${task.client_id}`)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <User className="h-3 w-3" />
                          {task.clients.client_name}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {getTasksByStatus(column.key).length === 0 && (
              <div className="h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                Drop tasks here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
