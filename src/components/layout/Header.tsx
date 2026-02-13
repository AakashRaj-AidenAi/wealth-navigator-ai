import { Bot, ChevronDown, LogOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const roleLabels: Record<string, string> = {
  wealth_advisor: 'Wealth Advisor',
  compliance_officer: 'Compliance Officer',
  client: 'Client',
};

const pathMap: Record<string, string> = {
  '': 'Dashboard',
  clients: 'Clients',
  portfolios: 'Portfolios',
  orders: 'Orders',
  goals: 'Goals & Planning',
  cio: 'CIO Desk',
  compliance: 'Compliance',
  reports: 'Reports',
  leads: 'Leads',
  campaigns: 'Campaigns',
  communications: 'Communications',
  'corporate-actions': 'Corporate Actions',
  funding: 'Funding',
  business: 'Business',
  tasks: 'Tasks',
  settings: 'Settings',
  admin: 'Admin',
  copilot: 'AI Copilot',
  'portfolio-admin': 'Portfolio Admin',
  messages: 'Messages',
};

interface HeaderProps {
  onToggleChat?: () => void;
  chatOpen?: boolean;
}

export const Header = ({ onToggleChat, chatOpen }: HeaderProps = {}) => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Build breadcrumb segments from current path
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const handleCommandPaletteOpen = () => {
    // Dispatch the keyboard shortcut event to trigger CommandPalette
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left: Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {pathSegments.length === 0 ? (
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to="/">Dashboard</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {pathSegments.map((segment, index) => {
              const href = '/' + pathSegments.slice(0, index + 1).join('/');
              const label = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
              const isLast = index === pathSegments.length - 1;

              return (
                <BreadcrumbItem key={href}>
                  <BreadcrumbSeparator />
                  {isLast ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={href}>{label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Command Palette Trigger */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-2 text-muted-foreground h-8 px-3"
            onClick={handleCommandPaletteOpen}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search...</span>
            <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">Ctrl</span>K
            </kbd>
          </Button>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={handleCommandPaletteOpen}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* AI Copilot Toggle */}
          {onToggleChat && (
            <Button
              variant={chatOpen ? 'default' : 'ghost'}
              size="icon"
              onClick={onToggleChat}
              title="AI Copilot"
            >
              <Bot className="h-5 w-5" />
            </Button>
          )}

          {/* Notification Center */}
          <NotificationCenter />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2 pr-3">
                <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-foreground">
                    {userInitials}
                  </span>
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem>Team Management</DropdownMenuItem>
              <DropdownMenuItem>Preferences</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
