import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, Plus, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';

const goals = [
  { id: 1, name: 'Retirement Fund', target: 5000000, current: 3200000, deadline: 'Dec 2030', status: 'on-track' },
  { id: 2, name: 'Children Education', target: 1500000, current: 890000, deadline: 'Sep 2028', status: 'on-track' },
  { id: 3, name: 'Real Estate Investment', target: 2000000, current: 450000, deadline: 'Jun 2027', status: 'at-risk' },
  { id: 4, name: 'Emergency Fund', target: 500000, current: 500000, deadline: 'Completed', status: 'completed' },
];

const Goals = () => {
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
          <Button className="bg-gradient-gold hover:opacity-90 gap-2">
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
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
                <p className="text-2xl font-semibold">4</p>
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
                <p className="text-2xl font-semibold">3</p>
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
                <p className="text-2xl font-semibold">2</p>
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
                <p className="text-2xl font-semibold">1</p>
              </div>
            </div>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = (goal.current / goal.target) * 100;
            return (
              <div key={goal.id} className="glass rounded-xl p-6 hover:bg-muted/10 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{goal.name}</h3>
                    <p className="text-sm text-muted-foreground">Target: ${(goal.target / 1000000).toFixed(1)}M by {goal.deadline}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    goal.status === 'on-track' ? 'bg-success/20 text-success' :
                    goal.status === 'at-risk' ? 'bg-warning/20 text-warning' :
                    'bg-chart-3/20 text-chart-3'
                  }`}>
                    {goal.status === 'on-track' ? 'On Track' : goal.status === 'at-risk' ? 'At Risk' : 'Completed'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">${(goal.current / 1000000).toFixed(2)}M / ${(goal.target / 1000000).toFixed(1)}M</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">{progress.toFixed(0)}% complete</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Goals;
