import { Bell, Search, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const roleLabels: Record<string, string> = {
  wealth_advisor: 'Wealth Advisor',
  compliance_officer: 'Compliance Officer',
  client: 'Client'
};

// Static market data (could be replaced with real API later)
const marketTicker = [
  { symbol: 'NIFTY', price: 22456.80, changePercent: 0.45 },
  { symbol: 'SENSEX', price: 73852.94, changePercent: 0.38 },
  { symbol: 'GOLD', price: 62450.00, changePercent: -0.12 },
  { symbol: 'USD/INR', price: 83.12, changePercent: 0.05 },
];

export const Header = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'U';

  const userName = user?.user_metadata?.full_name || user?.email || 'User';
  const userRole = role ? roleLabels[role] : 'User';

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex h-full items-center justify-between px-6">
        {/* Market Ticker */}
        <div className="flex items-center gap-6">
          {marketTicker.map((item) => (
            <div key={item.symbol} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{item.symbol}</span>
              <span className="text-sm font-medium tabular-nums">{item.price.toLocaleString()}</span>
              <span
                className={cn(
                  'text-xs font-medium tabular-nums',
                  item.changePercent >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-4">
          {/* Global Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients, portfolios..."
              className="pl-9 bg-secondary/50 border-border focus:bg-secondary"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Badge variant="secondary" className="text-xs">3 new</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-auto">
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="text-sm font-medium">Pending Orders</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Review pending orders - Just now</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    <span className="text-sm font-medium">Portfolio Review Due</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Quarterly review reminder - 1 hour ago</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-sm font-medium">New Client Added</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Successfully onboarded - Today</span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-primary text-sm justify-center">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2 pr-3">
                <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-foreground">{userInitials}</span>
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
              <DropdownMenuItem onClick={() => navigate('/settings')}>Profile Settings</DropdownMenuItem>
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
