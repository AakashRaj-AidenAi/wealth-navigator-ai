import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sparkles,
  Briefcase,
  Shield,
  Search,
  ChevronDown,
  CheckSquare,
  BarChart3,
  Send,
  Target,
  UserPlus,
  TrendingUp,
  Users,
  Landmark,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';

interface AgentSelectorProps {
  value: string;
  onChange: (agentType: string) => void;
}

interface AgentInfo {
  name: string;
  description: string;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  advisory: 'Advisory',
  analysis: 'Analysis',
  operations: 'Operations',
  growth: 'Growth',
};

const CATEGORY_ORDER = ['advisory', 'analysis', 'operations', 'growth'];

const AGENT_ICONS: Record<string, React.ElementType> = {
  advisor_assistant: Sparkles,
  portfolio_intelligence: Briefcase,
  compliance_sentinel: Shield,
  cio_strategy: TrendingUp,
  tax_optimizer: Landmark,
  meeting_intelligence: Users,
  growth_engine: UserPlus,
  funding_risk: Wallet,
  task_workflow: CheckSquare,
  report_analytics: BarChart3,
  communications: Send,
  goal_planning: Target,
  onboarding: UserPlus,
};

const AGENT_COLORS: Record<string, string> = {
  advisory: 'text-primary',
  analysis: 'text-chart-1',
  operations: 'text-warning',
  growth: 'text-chart-3',
};

// Fallback hardcoded agents for when backend is unavailable
const FALLBACK_AGENTS: AgentInfo[] = [
  { name: 'advisor_assistant', description: 'General queries and assistance', category: 'advisory' },
  { name: 'portfolio_intelligence', description: 'Deep portfolio analysis & optimization', category: 'analysis' },
  { name: 'compliance_sentinel', description: 'Regulatory monitoring & compliance', category: 'operations' },
  { name: 'cio_strategy', description: 'Market research & strategy insights', category: 'analysis' },
];

const DISPLAY_NAMES: Record<string, string> = {
  advisor_assistant: 'General Assistant',
  portfolio_intelligence: 'Portfolio Analyst',
  compliance_sentinel: 'Compliance Sentinel',
  cio_strategy: 'CIO Strategy',
  tax_optimizer: 'Tax Optimizer',
  meeting_intelligence: 'Meeting Intel',
  growth_engine: 'Growth Engine',
  funding_risk: 'Funding Risk',
  task_workflow: 'Task Manager',
  report_analytics: 'Report Analytics',
  communications: 'Communications',
  goal_planning: 'Goal Planning',
  onboarding: 'Onboarding',
};

export const AgentSelector = ({ value, onChange }: AgentSelectorProps) => {
  const { data } = useQuery<{ agents: AgentInfo[] }>({
    queryKey: ['agents'],
    queryFn: () => api.get('/chat/agents'),
    staleTime: 5 * 60_000,
  });

  const agents = data?.agents ?? FALLBACK_AGENTS;

  const grouped = useMemo(() => {
    const groups: Record<string, AgentInfo[]> = {};
    for (const agent of agents) {
      const cat = agent.category || 'advisory';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(agent);
    }
    return groups;
  }, [agents]);

  const currentAgent = agents.find((a) => a.name === value) || agents[0];
  const CurrentIcon = AGENT_ICONS[currentAgent?.name] || Sparkles;
  const displayName = DISPLAY_NAMES[currentAgent?.name] || currentAgent?.name || 'General';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <div
            className={cn(
              'h-5 w-5 rounded flex items-center justify-center bg-secondary',
              AGENT_COLORS[currentAgent?.category] || 'text-primary'
            )}
          >
            <CurrentIcon className="h-3 w-3" />
          </div>
          <span className="font-medium">{displayName}</span>
          <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-[70vh] overflow-y-auto">
        {CATEGORY_ORDER.map((category, catIdx) => {
          const categoryAgents = grouped[category];
          if (!categoryAgents?.length) return null;

          return (
            <div key={category}>
              {catIdx > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[category] || category}
              </DropdownMenuLabel>
              {categoryAgents.map((agent) => {
                const Icon = AGENT_ICONS[agent.name] || Sparkles;
                const agentDisplayName = DISPLAY_NAMES[agent.name] || agent.name;

                return (
                  <DropdownMenuItem
                    key={agent.name}
                    onClick={() => onChange(agent.name)}
                    className={cn(
                      'flex items-center gap-3 py-3 cursor-pointer',
                      value === agent.name && 'bg-secondary'
                    )}
                  >
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center bg-secondary',
                        AGENT_COLORS[agent.category] || 'text-primary'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{agentDisplayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {agent.description}
                      </p>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
