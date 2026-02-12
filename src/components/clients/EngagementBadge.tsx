import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';
import { engagementLevelConfig, getEngagementLevel } from '@/hooks/useEngagementScores';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EngagementBadgeProps {
  score: number | undefined;
  showScore?: boolean;
  size?: 'sm' | 'md';
}

export const EngagementBadge = ({ score, showScore = true, size = 'sm' }: EngagementBadgeProps) => {
  if (score === undefined || score === null) return null;

  const level = getEngagementLevel(score);
  const config = engagementLevelConfig[level];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 font-medium',
              config.bgColor,
              config.color,
              size === 'sm' ? 'text-xs' : 'text-sm'
            )}
          >
            <Activity className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
            {showScore && <span>{score}</span>}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Engagement Score: {score}/100</p>
          <p className="text-xs text-muted-foreground">Based on interactions, meetings, portfolio activity & more</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
