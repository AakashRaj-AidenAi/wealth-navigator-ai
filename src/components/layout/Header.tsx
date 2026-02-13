import { useState } from 'react';
import { Search, Users, DollarSign, ListTodo, AlertTriangle, Plus, ShoppingCart, UserPlus } from 'lucide-react';
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
import { api, extractItems } from '@/services/api';
import { formatCurrency } from '@/lib/currency';
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

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);

  // Fetch header stats with React Query (60s cache)
  const { data: headerStats } = useQuery({
    queryKey: ['header-stats'],
    queryFn: async () => {
      const [clientsRes, tasksRes, alertsRes] = await Promise.all([
        api.get('/clients', { advisor_id: user?.id, fields: 'total_assets' }),
        api.get('/tasks', { assigned_to: user?.id, status: 'todo,in_progress' }),
        api.get('/compliance/alerts', { is_resolved: false }),
      ]);
      const clients = extractItems<any>(clientsRes);
      const tasks = extractItems<any>(tasksRes);
      const alerts = extractItems<any>(alertsRes);
      const totalAUM = clients.reduce((sum: number, c: any) => sum + (Number(c.total_assets) || 0), 0);
      return {
        totalAUM,
        activeClients: clients.length,
        pendingTasks: tasks.length,
        activeAlerts: alerts.length,
      };
    },
    staleTime: 60_000,
    enabled: !!user,
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

  const stats = [
    {
      label: 'Total AUM',
      value: headerStats ? formatCurrency(headerStats.totalAUM) : '...',
      icon: DollarSign,
      href: '/portfolios',
    },
    {
      label: 'Clients',
      value: headerStats?.activeClients ?? '...',
      icon: Users,
      href: '/clients',
    },
    {
      label: 'Tasks',
      value: headerStats?.pendingTasks ?? '...',
      icon: ListTodo,
      href: '/tasks',
    },
    {
      label: 'Alerts',
      value: headerStats?.activeAlerts ?? '...',
      icon: AlertTriangle,
      href: '/compliance',
      highlight: (headerStats?.activeAlerts ?? 0) > 0,
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <header className="h-14 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex h-full items-center justify-between px-6 gap-4">
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

          {/* Center: Global Stats */}
          <div className="hidden lg:flex items-center gap-1">
            {stats.map((stat) => (
              <Tooltip key={stat.label}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(stat.href)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-accent transition-colors text-sm"
                  >
                    <stat.icon className={`h-3.5 w-3.5 ${stat.highlight ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                    <span className={`text-xs font-semibold ${stat.highlight ? 'text-destructive' : ''}`}>
                      {stat.value}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Go to {stat.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

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
      </header>

      {/* Modals */}
      <AddClientModal open={addClientOpen} onOpenChange={setAddClientOpen} />
      <NewOrderModal open={newOrderOpen} onOpenChange={setNewOrderOpen} />
      <QuickAddTask open={quickTaskOpen} onOpenChange={setQuickTaskOpen} />
    </TooltipProvider>
  );
};
