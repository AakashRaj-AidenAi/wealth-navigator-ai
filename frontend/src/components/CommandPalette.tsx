import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  SearchCode,
  RefreshCw,
  CalendarClock,
  Mail,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

interface PageItem {
  label: string;
  icon: React.ElementType;
  href: string;
  keywords?: string[];
}

interface AgentCommand {
  label: string;
  description: string;
  icon: React.ElementType;
  command: string;
}

const pages: PageItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/', keywords: ['home', 'overview'] },
  { label: 'Tasks', icon: CheckSquare, href: '/tasks', keywords: ['todo', 'action items'] },
  { label: 'Leads', icon: UserPlus, href: '/leads', keywords: ['prospects', 'pipeline'] },
  { label: 'Clients', icon: Users, href: '/clients', keywords: ['customers', 'accounts'] },
  { label: 'Portfolios', icon: Briefcase, href: '/portfolios', keywords: ['investments', 'holdings'] },
  { label: 'Goals & Planning', icon: Target, href: '/goals', keywords: ['financial planning', 'objectives'] },
  { label: 'CIO Desk', icon: TrendingUp, href: '/cio', keywords: ['market', 'research', 'insights'] },
  { label: 'Corp Actions', icon: Landmark, href: '/corporate-actions', keywords: ['dividends', 'splits'] },
  { label: 'Orders', icon: FileCheck, href: '/orders', keywords: ['trades', 'transactions'] },
  { label: 'Communications', icon: Send, href: '/communications', keywords: ['email', 'outreach'] },
  { label: 'Campaigns', icon: Megaphone, href: '/campaigns', keywords: ['marketing', 'outreach'] },
  { label: 'Compliance', icon: Shield, href: '/compliance', keywords: ['regulatory', 'kyc', 'aml'] },
  { label: 'Reports', icon: BarChart3, href: '/reports', keywords: ['analytics', 'performance'] },
  { label: 'Business', icon: CircleDollarSign, href: '/business', keywords: ['revenue', 'aum'] },
  { label: 'Funding', icon: Wallet, href: '/funding', keywords: ['deposits', 'withdrawals', 'sip'] },
  { label: 'Portfolio Admin', icon: ClipboardList, href: '/portfolio-admin', keywords: ['models', 'rebalancing'] },
  { label: 'AI Copilot', icon: Bot, href: '/copilot', keywords: ['ai', 'assistant', 'chat'] },
  { label: 'Messages', icon: MessageSquare, href: '/messages', keywords: ['inbox', 'chat'] },
  { label: 'Firm Admin', icon: Building2, href: '/admin', keywords: ['users', 'permissions'] },
  { label: 'Settings', icon: Settings, href: '/settings', keywords: ['preferences', 'profile'] },
];

const agentCommands: AgentCommand[] = [
  {
    label: '/analyze',
    description: 'Analyze a client portfolio for risks and opportunities',
    icon: SearchCode,
    command: '/analyze',
  },
  {
    label: '/rebalance',
    description: 'Generate rebalancing recommendations for a portfolio',
    icon: RefreshCw,
    command: '/rebalance',
  },
  {
    label: '/meeting-prep',
    description: 'Prepare briefing for upcoming client meeting',
    icon: CalendarClock,
    command: '/meeting-prep',
  },
  {
    label: '/draft-email',
    description: 'Draft a professional email to a client',
    icon: Mail,
    command: '/draft-email',
  },
];

// Static recent clients - will be connected to API later
const recentClients = [
  { name: 'Rajesh Sharma', id: 'client-1' },
  { name: 'Priya Kapoor', id: 'client-2' },
  { name: 'Amit Patel', id: 'client-3' },
];

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handlePageSelect = (href: string) => {
    navigate(href);
    setOpen(false);
  };

  const handleClientSelect = (clientId: string) => {
    navigate(`/clients/${clientId}`);
    setOpen(false);
  };

  const handleAgentCommand = (command: string) => {
    // Navigate to copilot with the command pre-filled
    navigate(`/copilot?command=${encodeURIComponent(command)}`);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, clients, or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Pages */}
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              value={`${page.label} ${page.keywords?.join(' ') || ''}`}
              onSelect={() => handlePageSelect(page.href)}
            >
              <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Recent Clients */}
        <CommandGroup heading="Recent Clients">
          {recentClients.map((client) => (
            <CommandItem
              key={client.id}
              value={client.name}
              onSelect={() => handleClientSelect(client.id)}
            >
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{client.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Agent Commands */}
        <CommandGroup heading="Agent Commands">
          {agentCommands.map((cmd) => (
            <CommandItem
              key={cmd.command}
              value={`${cmd.label} ${cmd.description}`}
              onSelect={() => handleAgentCommand(cmd.command)}
            >
              <cmd.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-mono text-sm">{cmd.label}</span>
                <span className="text-xs text-muted-foreground">{cmd.description}</span>
              </div>
              <CommandShortcut className="hidden sm:inline-flex">AI</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
