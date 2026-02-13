import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Target,
  TrendingUp,
  FileCheck,
  Shield,
  BarChart3,
  MessageSquare,
  Settings,
  Building2,
  Bot,
  CheckSquare,
  UserPlus,
  Send,
  Landmark,
  Megaphone,
  CircleDollarSign,
  Wallet,
  ClipboardList,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'MAIN MENU',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
      { label: 'Leads', icon: UserPlus, href: '/leads' },
      { label: 'Clients', icon: Users, href: '/clients' },
      { label: 'Portfolios', icon: Briefcase, href: '/portfolios' },
      { label: 'Goals & Planning', icon: Target, href: '/goals' },
      { label: 'CIO Desk', icon: TrendingUp, href: '/cio' },
      { label: 'Corp Actions', icon: Landmark, href: '/corporate-actions' },
      { label: 'Orders', icon: FileCheck, href: '/orders', badge: 3 },
      { label: 'Communications', icon: Send, href: '/communications' },
      { label: 'Campaigns', icon: Megaphone, href: '/campaigns' },
      { label: 'Compliance', icon: Shield, href: '/compliance', badge: 2 },
      { label: 'Reports', icon: BarChart3, href: '/reports' },
      { label: 'Business', icon: CircleDollarSign, href: '/business' },
      { label: 'Funding', icon: Wallet, href: '/funding' },
      { label: 'Portfolio Admin', icon: ClipboardList, href: '/portfolio-admin' },
    ],
  },
  {
    title: 'TOOLS & SETTINGS',
    items: [
      { label: 'AI Copilot', icon: Bot, href: '/copilot' },
      { label: 'Messages', icon: MessageSquare, href: '/messages', badge: 5 },
      { label: 'Firm Admin', icon: Building2, href: '/admin' },
      { label: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
];

export const Sidebar = () => {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden',
          expanded ? 'w-60' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-gradient-gold flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">W</span>
            </div>
            <span
              className={cn(
                'font-semibold text-foreground whitespace-nowrap transition-opacity duration-300',
                expanded ? 'opacity-100' : 'opacity-0'
              )}
            >
              WealthOS
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col h-[calc(100vh-4rem)] py-3 overflow-y-auto overflow-x-hidden">
          {navGroups.map((group, groupIndex) => (
            <div key={group.title}>
              {groupIndex > 0 && (
                <div className="my-3 mx-3 border-t border-sidebar-border" />
              )}

              {/* Group header - only visible when expanded */}
              <div
                className={cn(
                  'px-5 py-2 transition-opacity duration-300',
                  expanded ? 'opacity-100' : 'opacity-0 h-0 py-0 overflow-hidden'
                )}
              >
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {group.title}
                </span>
              </div>

              {/* Nav items */}
              <div className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  const linkContent = (
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg transition-all duration-200 group relative',
                        expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 flex-shrink-0',
                          isActive && 'text-primary'
                        )}
                      />

                      {/* Label - visible when expanded */}
                      <span
                        className={cn(
                          'flex-1 text-sm font-medium whitespace-nowrap transition-opacity duration-300',
                          expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                        )}
                      >
                        {item.label}
                      </span>

                      {/* Badge when expanded */}
                      {item.badge && expanded && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
                          {item.badge}
                        </span>
                      )}

                      {/* Badge when collapsed - positioned top-right of icon */}
                      {item.badge && !expanded && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground px-0.5">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );

                  // Show tooltip only when collapsed
                  if (!expanded) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="flex items-center gap-2">
                          {item.label}
                          {item.badge && (
                            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-1">
                              {item.badge}
                            </span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={item.href}>{linkContent}</div>;
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
};
