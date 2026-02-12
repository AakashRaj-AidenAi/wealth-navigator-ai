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
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  UserPlus,
  Send,
  Landmark,
  Megaphone,
  CircleDollarSign,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
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
];

const secondaryNavItems: NavItem[] = [
  { label: 'AI Copilot', icon: Bot, href: '/copilot' },
  { label: 'Messages', icon: MessageSquare, href: '/messages', badge: 5 },
  { label: 'Firm Admin', icon: Building2, href: '/admin' },
  { label: 'Settings', icon: Settings, href: '/settings' },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar = ({ collapsed, setCollapsed }: SidebarProps) => {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-gold flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">W</span>
            </div>
            <span className="font-semibold text-foreground">WealthOS</span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 mx-auto rounded-lg bg-gradient-gold flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">W</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col h-[calc(100vh-4rem)] p-3 overflow-y-auto">
        {/* Main Nav */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="text-xs font-medium text-muted-foreground px-3 py-2 block">
              MAIN MENU
            </span>
          )}
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <span className="absolute right-2 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-sidebar-border" />

        {/* Secondary Nav */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="text-xs font-medium text-muted-foreground px-3 py-2 block">
              TOOLS & SETTINGS
            </span>
          )}
          {secondaryNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center gap-2 px-3 py-2 mt-4 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </nav>
    </aside>
  );
};
