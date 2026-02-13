import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { churnRiskConfig, getChurnRiskLevel } from '@/hooks/useChurnPredictions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChurnRiskBadgeProps {
  percentage: number | undefined;
  showPercentage?: boolean;
  size?: 'sm' | 'md';
}

export const ChurnRiskBadge = ({ percentage, showPercentage = true, size = 'sm' }: ChurnRiskBadgeProps) => {
  if (percentage === undefined || percentage === null) return null;

  const level = getChurnRiskLevel(percentage);
  const config = churnRiskConfig[level];

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
            <AlertTriangle className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
            {showPercentage && <span>{percentage}%</span>}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Churn Risk: {percentage}%</p>
          <p className="text-xs text-muted-foreground">Based on interaction gaps, SIP status, engagement & campaigns</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
