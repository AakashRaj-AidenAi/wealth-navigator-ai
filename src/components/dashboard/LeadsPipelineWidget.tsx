import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyShort } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { ChevronRight, Target, TrendingUp, Users } from 'lucide-react';

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
  color: string;
}

const stageConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-500' },
  contacted: { label: 'Contacted', color: 'bg-cyan-500' },
  meeting: { label: 'Meeting', color: 'bg-amber-500' },
  proposal: { label: 'Proposal', color: 'bg-purple-500' },
  closed_won: { label: 'Won', color: 'bg-success' }
};

export const LeadsPipelineWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [wonCount, setWonCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchPipelineData();
  }, [user]);

  const fetchPipelineData = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('leads')
      .select('stage, expected_value, probability')
      .eq('assigned_to', user.id)
      .neq('stage', 'lost');

    if (data) {
      const stageMap = new Map<string, { count: number; value: number }>();
      let wonLeads = 0;
      
      data.forEach(lead => {
        if (lead.stage === 'closed_won') wonLeads++;
        const current = stageMap.get(lead.stage) || { count: 0, value: 0 };
        const weightedValue = (Number(lead.expected_value) || 0) * (Number(lead.probability) || 0) / 100;
        stageMap.set(lead.stage, {
          count: current.count + 1,
          value: current.value + weightedValue
        });
      });

      const pipelineStages: PipelineStage[] = [];
      Object.entries(stageConfig).forEach(([stage, config]) => {
        const stageData = stageMap.get(stage);
        if (stageData && stageData.count > 0) {
          pipelineStages.push({
            stage: config.label,
            count: stageData.count,
            value: stageData.value,
            color: config.color
          });
        }
      });

      const openLeads = data.filter(l => l.stage !== 'closed_won');
      setStages(pipelineStages);
      setTotalLeads(openLeads.length);
      setTotalValue(openLeads.reduce((sum, l) => 
        sum + ((Number(l.expected_value) || 0) * (Number(l.probability) || 0) / 100), 0
      ));
      setWonCount(wonLeads);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-4 w-full mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div 
      className="glass rounded-xl p-5 cursor-pointer hover:border-primary/50 transition-all group"
      onClick={() => navigate('/leads')}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Leads Pipeline</h3>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-primary/10">
          <div className="flex items-center justify-center gap-1">
            <Users className="h-3 w-3 text-primary" />
            <span className="text-lg font-bold">{totalLeads}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Active</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span className="text-sm font-bold">{formatCurrencyShort(totalValue)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Pipeline</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-success/10">
          <span className="text-lg font-bold text-success">{wonCount}</span>
          <p className="text-[10px] text-muted-foreground">Won</p>
        </div>
      </div>

      {stages.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No active leads</p>
      ) : (
        <div className="space-y-2">
          {stages.filter(s => s.stage !== 'Won').map((stage) => (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16 truncate">{stage.stage}</span>
              <div className="flex-1 h-5 bg-secondary/50 rounded overflow-hidden">
                <div
                  className={cn('h-full rounded transition-all flex items-center justify-end pr-1', stage.color)}
                  style={{ width: `${Math.max((stage.count / maxCount) * 100, 15)}%` }}
                >
                  <span className="text-[10px] text-white font-medium">{stage.count}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {formatCurrencyShort(stage.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" className="w-full mt-3 text-sm" size="sm">
        View Pipeline
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};
