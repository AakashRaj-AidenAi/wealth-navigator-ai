import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

interface ClickableMetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  className?: string;
  variant?: 'default' | 'highlight';
  href?: string;
  onClick?: () => void;
  subtitle?: string;
}

export const ClickableMetricCard = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  className,
  variant = 'default',
  href,
  onClick,
  subtitle
}: ClickableMetricCardProps) => {
  const navigate = useNavigate();
  const isPositive = change !== undefined && change >= 0;
  const isClickable = href || onClick;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      className={cn(
        'glass rounded-xl p-5 transition-all duration-300',
        variant === 'highlight' && 'border-primary/30 glow-gold',
        isClickable && 'cursor-pointer hover:scale-[1.02] hover:border-primary/50 group',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{title}</p>
            {isClickable && (
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={cn(
                  'text-sm font-medium tabular-nums',
                  isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {isPositive ? '+' : ''}{change.toFixed(2)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 ml-3">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
