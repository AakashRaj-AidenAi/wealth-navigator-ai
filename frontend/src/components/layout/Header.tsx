import React, { useState, useEffect } from 'react';
import { Search, Plus, ShoppingCart, UserPlus, TrendingUp, TrendingDown, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import { AddClientModal } from '@/components/modals/AddClientModal';
import { NewOrderModal } from '@/components/modals/NewOrderModal';
import { QuickAddTask } from '@/components/tasks/QuickAddTask';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  currency: string;
}

const STORAGE_KEY = 'wealthos-ticker-collapsed';

const fallbackQuotes: MarketQuote[] = [
  { symbol: 'SENSEX', name: 'BSE Sensex', price: 77245.30, change: 312.45, change_percent: 0.41, currency: 'INR' },
  { symbol: 'NIFTY', name: 'Nifty 50', price: 23432.15, change: 98.70, change_percent: 0.42, currency: 'INR' },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', price: 49876.50, change: -123.40, change_percent: -0.25, currency: 'INR' },
  { symbol: 'GOLD', name: 'Gold', price: 2648.30, change: 15.20, change_percent: 0.58, currency: 'USD' },
  { symbol: 'USD/INR', name: 'USD/INR', price: 83.42, change: -0.08, change_percent: -0.10, currency: 'INR' },
];

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [tickerCollapsed, setTickerCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(tickerCollapsed));
  }, [tickerCollapsed]);

  // Fetch market quotes
  const { data: quotes } = useQuery<MarketQuote[]>({
    queryKey: ['market-quotes'],
    queryFn: async () => {
      try {
        const res = await api.get<{ quotes: MarketQuote[] }>('/market/quotes');
        return res.quotes;
      } catch {
        return fallbackQuotes;
      }
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    initialData: fallbackQuotes,
  });

  // Build breadcrumb segments
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const handleCommandPaletteOpen = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  const displayQuotes = quotes ?? fallbackQuotes;

  return (
    <TooltipProvider delayDuration={300}>
      <header className={cn("floating-bar sticky top-0 z-30", tickerCollapsed ? "h-11" : "h-auto")}>
        {/* Top row: Breadcrumbs + Actions */}
        <div className="flex h-11 items-center justify-between px-6 gap-4">
          {/* Left: Breadcrumbs */}
          <Breadcrumb className="flex-shrink-0">
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
                  <React.Fragment key={href}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={href}>{label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Quick Actions */}
            <div className="hidden md:flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setAddClientOpen(true)}>
                    <UserPlus className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Client</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Client</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setNewOrderOpen(true)}>
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Order</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Order</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setQuickTaskOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Task</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Task</TooltipContent>
              </Tooltip>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-5 bg-border mx-1" />

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

            {/* Mobile search */}
            <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8" onClick={handleCommandPaletteOpen}>
              <Search className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification Center */}
            <NotificationCenter />
          </div>
        </div>

        {/* Bottom row: Market ticker data */}
        {!tickerCollapsed && (
          <div className="h-8 flex items-center justify-between px-6 gap-2 border-t border-border/30">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Live</span>
            </div>

            {/* Market quotes — evenly distributed */}
            <div className="flex-1 flex items-center justify-around">
              {displayQuotes.map((q, i) => (
                <div key={q.symbol} className="flex items-center gap-2">
                  {i > 0 && (
                    <div className="h-4 w-px bg-border/40 -ml-1" />
                  )}
                  <div className="flex items-center gap-1.5 px-2">
                    <span className="text-xs font-semibold text-foreground">{q.symbol}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {q.currency === 'INR' ? '\u20B9' : '$'}
                      {q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={cn(
                        'flex items-center gap-0.5 text-xs font-medium tabular-nums',
                        q.change >= 0 ? 'text-emerald-500' : 'text-red-500'
                      )}
                    >
                      {q.change >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {q.change >= 0 ? '+' : ''}{q.change_percent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Collapse button */}
            <button
              onClick={() => setTickerCollapsed(true)}
              className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 rounded-lg hover:bg-muted/50"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Collapsed ticker toggle */}
        {tickerCollapsed && (
          <button
            onClick={() => setTickerCollapsed(false)}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex items-center gap-1 px-2 py-0.5 bg-card border border-border rounded-full text-[10px] text-muted-foreground hover:text-foreground transition-colors shadow-sm"
          >
            <Activity className="h-3 w-3" />
            Markets
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
      </header>

      {/* Modals */}
      <AddClientModal open={addClientOpen} onOpenChange={setAddClientOpen} />
      <NewOrderModal open={newOrderOpen} onOpenChange={setNewOrderOpen} />
      <QuickAddTask open={quickTaskOpen} onOpenChange={setQuickTaskOpen} />
    </TooltipProvider>
  );
};
