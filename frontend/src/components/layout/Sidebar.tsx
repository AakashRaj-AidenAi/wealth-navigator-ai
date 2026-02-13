import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  LogOut,
  ChevronUp,
  Home,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

// ---------- Types ----------

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

// ---------- Nav Groups (5 domains) ----------

const navGroups: NavGroup[] = [
  {
    title: 'Core',
    items: [
      { label: 'Home', icon: Home, href: '/' },
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'AI Copilot', icon: Bot, href: '/copilot' },
      { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
      { label: 'Leads', icon: UserPlus, href: '/leads' },
      { label: 'Clients', icon: Users, href: '/clients' },
    ],
  },
  {
    title: 'Portfolio',
    items: [
      { label: 'Portfolios', icon: Briefcase, href: '/portfolios' },
      { label: 'Goals & Planning', icon: Target, href: '/goals' },
      { label: 'CIO Desk', icon: TrendingUp, href: '/cio' },
      { label: 'Corp Actions', icon: Landmark, href: '/corporate-actions' },
      { label: 'Orders', icon: FileCheck, href: '/orders', badge: 3 },
    ],
  },
  {
    title: 'Outreach',
    items: [
      { label: 'Communications', icon: Send, href: '/communications' },
      { label: 'Campaigns', icon: Megaphone, href: '/campaigns' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Compliance', icon: Shield, href: '/compliance', badge: 2 },
      { label: 'Reports', icon: BarChart3, href: '/reports' },
      { label: 'Business', icon: CircleDollarSign, href: '/business' },
      { label: 'Funding', icon: Wallet, href: '/funding' },
      { label: 'Portfolio Admin', icon: ClipboardList, href: '/portfolio-admin' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Firm Admin', icon: Building2, href: '/admin' },
      { label: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
];

// ---------- Role labels ----------

const roleLabels: Record<string, string> = {
  wealth_advisor: 'Wealth Advisor',
  compliance_officer: 'Compliance Officer',
  client: 'Client',
};

// ---------- Props ----------

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

// ---------- Component ----------

export const Sidebar = ({ expanded, onToggle }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const [filter, setFilter] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'U';

  const userName = user?.user_metadata?.full_name || user?.email || 'User';
  const userRole = role ? roleLabels[role] : 'User';

  // Filter nav items by search query
  const filteredGroups = useMemo(() => {
    if (!filter.trim()) return navGroups;
    const q = filter.toLowerCase();
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0);
  }, [filter]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-3 top-3 bottom-3 z-40 floating-bar flex flex-col transition-all duration-200 ease-in-out overflow-hidden',
          expanded ? 'w-64' : 'w-16'
        )}
      >
        {/* Header: Logo + Toggle */}
        <div className={cn(
          "relative flex h-14 items-center px-3 border-b border-border/30 flex-shrink-0",
          expanded ? "justify-between" : "justify-center"
        )}>
          {expanded ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src="/AidenAI_Logo Blue bold.svg"
                  alt="AidenAI"
                  className="h-7 w-auto"
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={onToggle}
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-[#0A2750] flex items-center justify-center">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={onToggle}
                  >
                    <PanelLeftOpen className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Expand sidebar
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Search filter (expanded only) */}
        {expanded && (
          <div className="px-3 py-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter navigation..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        )}

        {/* Navigation groups */}
        <ScrollArea className="flex-1">
          <nav className="py-2">
            {filteredGroups.map((group, groupIndex) => (
              <div key={group.title}>
                {/* Divider between groups */}
                {groupIndex > 0 && (
                  <div className="my-1.5 mx-3 border-t border-border/30" />
                )}

                {/* Group header */}
                {expanded ? (
                  <div className="px-4 py-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </span>
                  </div>
                ) : null}

                {/* Nav items */}
                <div className="space-y-0.5 px-2">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    const linkContent = (
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg transition-colors duration-150 group relative',
                          expanded ? 'px-3 py-2' : 'px-0 py-2 justify-center',
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

                        {expanded && (
                          <span className="flex-1 text-sm font-medium whitespace-nowrap truncate">
                            {item.label}
                          </span>
                        )}

                        {/* Badge when expanded */}
                        {item.badge && expanded && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
                            {item.badge}
                          </span>
                        )}

                        {/* Badge when collapsed */}
                        {item.badge && !expanded && (
                          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground px-0.5">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );

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
        </ScrollArea>

        {/* Bottom section: User profile */}
        <div className="flex-shrink-0 border-t border-border/30">
          {/* User Profile */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 transition-colors hover:bg-sidebar-accent',
                      !expanded && 'justify-center'
                    )}
                  >
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-gold flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary-foreground">
                        {userInitials}
                      </span>
                    </div>
                    {expanded && (
                      <>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium truncate text-sidebar-foreground">
                            {userName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {userRole}
                          </p>
                        </div>
                        <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </>
                    )}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right">{userName}</TooltipContent>
              )}
            </Tooltip>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem>Preferences</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
};
