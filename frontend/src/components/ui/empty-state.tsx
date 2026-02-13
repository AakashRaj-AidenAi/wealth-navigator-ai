import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No data found',
  message = 'There are no items to display.',
  action,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
    {action && (
      <Button size="sm" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);
