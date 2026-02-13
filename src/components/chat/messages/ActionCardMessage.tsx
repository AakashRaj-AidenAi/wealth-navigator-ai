/**
 * ActionCardMessage - renders clickable action buttons inside a chat bubble.
 * Each card has a label, optional description, and an onClick handler so the
 * user can trigger actions like "View Portfolio" or "Place Order" directly
 * from the chat.
 */

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ActionItem {
  id: string;
  label: string;
  description?: string;
  /** An icon component from lucide-react (optional) */
  icon?: React.ElementType;
  /** If provided, navigates to this route */
  href?: string;
  /** Direct click handler */
  onClick?: () => void;
  /** Visual variant */
  variant?: 'default' | 'outline' | 'secondary';
}

export interface ActionCardMessageProps {
  title?: string;
  actions: ActionItem[];
  /** Called when any action is clicked, receives the action id */
  onAction?: (actionId: string) => void;
}

export const ActionCardMessage = ({
  title,
  actions,
  onAction,
}: ActionCardMessageProps) => {
  const handleClick = (action: ActionItem) => {
    if (action.onClick) {
      action.onClick();
    }
    if (onAction) {
      onAction(action.id);
    }
  };

  return (
    <div className="max-w-[85%] rounded-lg bg-secondary text-sm overflow-hidden">
      {title && (
        <div className="px-3 py-2 border-b border-border">
          <p className="font-medium text-xs text-muted-foreground">{title}</p>
        </div>
      )}
      <div className="p-2 space-y-1.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              className={cn(
                'w-full justify-start h-auto py-2 px-3 text-left',
                'hover:bg-primary/5'
              )}
              onClick={() => handleClick(action)}
            >
              <div className="flex items-center gap-2 w-full">
                {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-primary" />}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate">
                    {action.label}
                  </span>
                  {action.description && (
                    <span className="text-xs text-muted-foreground block truncate">
                      {action.description}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
