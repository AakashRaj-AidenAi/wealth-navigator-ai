import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TaskListView } from '@/components/tasks/TaskListView';
import { TaskKanbanView } from '@/components/tasks/TaskKanbanView';
import { QuickAddTask } from '@/components/tasks/QuickAddTask';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, List, Kanban, Search, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  due_date: string | null;
  due_time: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  client_id: string | null;
  trigger_type: string;
  assigned_to: string;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  clients?: { client_name: string } | null;
}

type FilterType = 'all' | 'today' | 'upcoming' | 'overdue';

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    if (user) fetchTasks();
  }, [user, activeFilter]);

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const params: Record<string, string> = {
      assigned_to: user.id,
      exclude_status: 'cancelled',
      order: 'due_date.asc',
      include: 'clients',
    };

    if (activeFilter === 'today') {
      params.due_date = today;
    } else if (activeFilter === 'upcoming') {
      params.due_date_after = today;
      params.due_date_before = weekFromNow;
    } else if (activeFilter === 'overdue') {
      params.due_date_before = today;
      params.status_not = 'done';
    }

    try {
      const data = await api.get('/tasks', params);
      setTasks(extractItems<Task>(data));
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
    setLoading(false);
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.clients?.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    today: tasks.filter(t => t.due_date === new Date().toISOString().split('T')[0] && t.status !== 'done').length,
    overdue: tasks.filter(t => t.due_date && t.due_date < new Date().toISOString().split('T')[0] && t.status !== 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'done').length,
  };

  const filters: { key: FilterType; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'all', label: 'All Tasks', icon: List },
    { key: 'today', label: 'Today', icon: Calendar, count: stats.today },
    { key: 'upcoming', label: 'Upcoming', icon: Clock },
    { key: 'overdue', label: 'Overdue', icon: AlertCircle, count: stats.overdue },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Tasks</h1>
            <p className="text-muted-foreground">Manage your productivity and client follow-ups</p>
          </div>
          <Button onClick={() => setShowQuickAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.today}</p>
                <p className="text-xs text-muted-foreground">Due Today</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 flex-wrap">
            {filters.map(filter => (
              <Button
                key={filter.key}
                variant={activeFilter === filter.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(filter.key)}
                className="gap-2"
              >
                <filter.icon className="h-4 w-4" />
                {filter.label}
                {filter.count !== undefined && filter.count > 0 && (
                  <Badge variant={activeFilter === filter.key ? 'secondary' : 'destructive'} className="ml-1">
                    {filter.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="rounded-none"
              >
                <Kanban className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Task Views */}
        {viewMode === 'list' ? (
          <TaskListView tasks={filteredTasks} loading={loading} onUpdate={fetchTasks} />
        ) : (
          <TaskKanbanView tasks={filteredTasks} loading={loading} onUpdate={fetchTasks} />
        )}

        {/* Quick Add Modal */}
        <QuickAddTask 
          open={showQuickAdd} 
          onOpenChange={setShowQuickAdd} 
          onSuccess={fetchTasks}
        />
      </div>
    </MainLayout>
  );
};

export default Tasks;
