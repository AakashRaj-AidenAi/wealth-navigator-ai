import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { sentimentConfig } from '@/hooks/useSentimentAnalysis';
import { cn } from '@/lib/utils';

interface SentimentBadgeProps {
  sentiment?: string | null;
  size?: 'sm' | 'md';
  showEmoji?: boolean;
}

export const SentimentBadge = ({ sentiment, size = 'sm', showEmoji = true }: SentimentBadgeProps) => {
  if (!sentiment) return null;

  const config = sentimentConfig[sentiment];
  if (!config) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'cursor-default',
              config.bgColor,
              config.color,
              size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-sm px-2 py-0.5'
            )}
          >
            {showEmoji && <span className="mr-1">{config.emoji}</span>}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Sentiment: {config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
