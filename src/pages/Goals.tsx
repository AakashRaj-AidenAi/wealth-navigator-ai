import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, Plus, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { NewGoalModal } from '@/components/modals/NewGoalModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
interface Goal {
  id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  priority: string;
  status: string;
  created_at: string;
  client_id: string;
}

const Goals = () => {
  const { role } = useAuth();
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setGoals(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const canCreateGoal = role === 'wealth_advisor';

  const getGoalStatus = (goal: Goal) => {
    const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
    if (progress >= 100) return 'completed';
    if (goal.target_date && new Date(goal.target_date) < new Date()) return 'at-risk';
    return 'on-track';
  };

  const activeGoals = goals.filter(g => getGoalStatus(g) !== 'completed');
  const onTrackGoals = goals.filter(g => getGoalStatus(g) === 'on-track');
  const completedGoals = goals.filter(g => getGoalStatus(g) === 'completed');

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Goals & Planning</h1>
            <p className="text-muted-foreground">
              Track financial goals and create long-term wealth plans
            </p>
          </div>
          {canCreateGoal && (
            <Button 
              className="bg-gradient-gold hover:opacity-90 gap-2"
              onClick={() => setNewGoalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Goals</p>
                <p className="text-2xl font-semibold">{activeGoals.length}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On Track</p>
                <p className="text-2xl font-semibold">{onTrackGoals.length}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Milestones</p>
                <p className="text-2xl font-semibold">{goals.filter(g => g.target_date).length}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-semibold">{completedGoals.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Goals List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : goals.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
            <p className="text-muted-foreground mb-4">Create your first financial goal to get started</p>
            {canCreateGoal && (
              <Button onClick={() => setNewGoalOpen(true)} className="bg-gradient-gold hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
              const status = getGoalStatus(goal);
              return (
                <div key={goal.id} className="glass rounded-xl p-6 hover:bg-muted/10 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{goal.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Target: {formatCurrency(goal.target_amount, true)} 
                        {goal.target_date ? ` by ${new Date(goal.target_date).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      status === 'on-track' ? 'bg-success/20 text-success' :
                      status === 'at-risk' ? 'bg-warning/20 text-warning' :
                      'bg-chart-3/20 text-chart-3'
                    }`}>
                      {status === 'on-track' ? 'On Track' : status === 'at-risk' ? 'At Risk' : 'Completed'}
                    </span>
                  </div>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mb-4">{goal.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {formatCurrency(goal.current_amount, true)} / {formatCurrency(goal.target_amount, true)}
                      </span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{progress.toFixed(0)}% complete</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NewGoalModal 
        open={newGoalOpen} 
        onOpenChange={setNewGoalOpen}
        onSuccess={fetchGoals}
      />
    </MainLayout>
  );
};

export default Goals;
