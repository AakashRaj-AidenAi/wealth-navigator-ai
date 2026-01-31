import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { format, differenceInMonths } from 'date-fns';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  status: string;
  priority: string;
}

interface GoalProgressCardProps {
  goals: Goal[];
}

export const GoalProgressCard = ({ goals }: GoalProgressCardProps) => {
  const getProgressStatus = (goal: Goal) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    if (!goal.targetDate) return { status: 'on_track', color: 'text-primary' };
    
    const monthsLeft = differenceInMonths(new Date(goal.targetDate), new Date());
    const expectedProgress = ((12 - monthsLeft) / 12) * 100; // Simplified projection
    
    if (progress >= 100) return { status: 'completed', color: 'text-success', icon: CheckCircle2 };
    if (progress < expectedProgress - 10) return { status: 'behind', color: 'text-destructive', icon: AlertTriangle };
    if (monthsLeft <= 6 && progress < 80) return { status: 'at_risk', color: 'text-warning', icon: Clock };
    return { status: 'on_track', color: 'text-success', icon: Target };
  };

  const priorityColors = {
    high: 'bg-destructive/10 text-destructive border-destructive/30',
    medium: 'bg-warning/10 text-warning border-warning/30',
    low: 'bg-muted/20 text-muted-foreground border-muted',
  };

  if (goals.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Target className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No goals set for this client</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" />
          Goal Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const { status, color, icon: StatusIcon } = getProgressStatus(goal);
          const shortfall = goal.targetAmount - goal.currentAmount;
          
          return (
            <div key={goal.id} className="space-y-2 p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{goal.name}</span>
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px]", priorityColors[goal.priority as keyof typeof priorityColors] || priorityColors.medium)}
                  >
                    {goal.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  {StatusIcon && <StatusIcon className={cn("h-3.5 w-3.5", color)} />}
                  <span className={cn("text-xs font-medium capitalize", color)}>
                    {status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Progress value={progress} className="flex-1 h-2" />
                <span className="text-sm font-medium tabular-nums w-12 text-right">
                  {progress.toFixed(0)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatCurrency(goal.currentAmount, true)} of {formatCurrency(goal.targetAmount, true)}
                </span>
                <div className="flex items-center gap-2">
                  {shortfall > 0 && (
                    <span className="text-warning">
                      {formatCurrency(shortfall, true)} to go
                    </span>
                  )}
                  {goal.targetDate && (
                    <span>Target: {format(new Date(goal.targetDate), 'MMM yyyy')}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
