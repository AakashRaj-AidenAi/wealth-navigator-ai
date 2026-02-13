import { Bell, CheckSquare, Shield, Wallet, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  category: 'tasks' | 'compliance' | 'funding' | 'chat';
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const categoryConfig = {
  tasks: {
    icon: CheckSquare,
    color: 'text-blue-500',
    dotColor: 'bg-blue-500',
    label: 'Tasks',
  },
  compliance: {
    icon: Shield,
    color: 'text-amber-500',
    dotColor: 'bg-amber-500',
    label: 'Compliance',
  },
  funding: {
    icon: Wallet,
    color: 'text-emerald-500',
    dotColor: 'bg-emerald-500',
    label: 'Funding',
  },
  chat: {
    icon: MessageSquare,
    color: 'text-purple-500',
    dotColor: 'bg-purple-500',
    label: 'Chat',
  },
};

// Static notification data - will be connected to API later
const notifications: Notification[] = [
  {
    id: '1',
    category: 'tasks',
    title: 'Portfolio Review Due',
    description: 'Quarterly review for Sharma family trust is due tomorrow.',
    time: '10 min ago',
    read: false,
  },
  {
    id: '2',
    category: 'compliance',
    title: 'KYC Document Expired',
    description: 'Client Rajesh Patel KYC documents need renewal.',
    time: '30 min ago',
    read: false,
  },
  {
    id: '3',
    category: 'funding',
    title: 'SIP Installment Processed',
    description: 'Monthly SIP of 50,000 processed for Mehra account.',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '4',
    category: 'compliance',
    title: 'Regulatory Alert',
    description: 'New SEBI circular on mutual fund categorization.',
    time: '2 hours ago',
    read: true,
  },
  {
    id: '5',
    category: 'chat',
    title: 'New Message from Client',
    description: 'Priya Kapoor sent a message about tax-loss harvesting.',
    time: '3 hours ago',
    read: true,
  },
  {
    id: '6',
    category: 'tasks',
    title: 'Rebalancing Recommendation',
    description: 'AI suggests rebalancing for 3 portfolios drifted >5%.',
    time: '4 hours ago',
    read: true,
  },
];

export const NotificationCenter = () => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group notifications by category
  const grouped = notifications.reduce(
    (acc, notification) => {
      if (!acc[notification.category]) {
        acc[notification.category] = [];
      }
      acc[notification.category].push(notification);
      return acc;
    },
    {} as Record<string, Notification[]>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-base font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[400px] overflow-y-auto">
          {Object.entries(grouped).map(([category, items]) => {
            const config = categoryConfig[category as keyof typeof categoryConfig];
            const CategoryIcon = config.icon;

            return (
              <div key={category}>
                {/* Category header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
                  <CategoryIcon className={cn('h-3.5 w-3.5', config.color)} />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {config.label}
                  </span>
                </div>

                {/* Notification items */}
                {items.map((notification) => (
                  <button
                    key={notification.id}
                    className={cn(
                      'flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-accent',
                      !notification.read && 'bg-accent/30'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                        notification.read ? 'bg-transparent' : config.dotColor
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">{notification.time}</p>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        <DropdownMenuSeparator />
        <button className="w-full px-3 py-2 text-center text-sm text-primary hover:bg-accent transition-colors rounded-b-md">
          View all notifications
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
