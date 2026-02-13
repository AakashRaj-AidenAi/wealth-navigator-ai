/**
 * AgentAvatar - displays an agent-specific icon, name badge, and optional
 * typing indicator (animated dots). Each agent type gets a distinct colour
 * so users can quickly tell which specialist is responding.
 */

import {
  Bot,
  TrendingUp,
  Shield,
  LineChart,
  Briefcase,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------- Agent colour / icon mapping ----------

interface AgentConfig {
  icon: React.ElementType;
  color: string;        // Tailwind bg class for the avatar circle
  textColor: string;    // Tailwind text class for the icon
  label: string;        // Human-readable name
}

const AGENT_MAP: Record<string, AgentConfig> = {
  portfolio: {
    icon: Briefcase,
    color: 'bg-blue-500/15',
    textColor: 'text-blue-500',
    label: 'Portfolio Agent',
  },
  risk: {
    icon: AlertTriangle,
    color: 'bg-amber-500/15',
    textColor: 'text-amber-500',
    label: 'Risk Agent',
  },
  market: {
    icon: TrendingUp,
    color: 'bg-emerald-500/15',
    textColor: 'text-emerald-500',
    label: 'Market Agent',
  },
  compliance: {
    icon: Shield,
    color: 'bg-violet-500/15',
    textColor: 'text-violet-500',
    label: 'Compliance Agent',
  },
  analytics: {
    icon: LineChart,
    color: 'bg-cyan-500/15',
    textColor: 'text-cyan-500',
    label: 'Analytics Agent',
  },
  reasoning: {
    icon: Brain,
    color: 'bg-rose-500/15',
    textColor: 'text-rose-500',
    label: 'Reasoning Agent',
  },
};

const DEFAULT_CONFIG: AgentConfig = {
  icon: Bot,
  color: 'bg-primary/10',
  textColor: 'text-primary',
  label: 'AI Copilot',
};

// ---------- Helper ----------

function resolveConfig(agentName: string | null | undefined): AgentConfig {
  if (!agentName) return DEFAULT_CONFIG;

  const key = agentName.toLowerCase();

  // Direct match
  if (AGENT_MAP[key]) return AGENT_MAP[key];

  // Partial match - check if the agent name contains any known key
  for (const [mapKey, config] of Object.entries(AGENT_MAP)) {
    if (key.includes(mapKey)) return config;
  }

  return { ...DEFAULT_CONFIG, label: agentName };
}

// ---------- Component ----------

interface AgentAvatarProps {
  agentName?: string | null;
  /** Show animated typing dots inside the avatar */
  isTyping?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether to show the text label next to the avatar */
  showLabel?: boolean;
  className?: string;
}

export const AgentAvatar = ({
  agentName,
  isTyping = false,
  size = 'sm',
  showLabel = false,
  className,
}: AgentAvatarProps) => {
  const config = resolveConfig(agentName);
  const Icon = config.icon;

  const sizeClasses = size === 'sm'
    ? 'h-6 w-6'
    : 'h-8 w-8';

  const iconSize = size === 'sm'
    ? 'h-3.5 w-3.5'
    : 'h-4 w-4';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center flex-shrink-0',
          config.color,
          sizeClasses
        )}
      >
        {isTyping ? (
          <div className="flex gap-0.5">
            <span className={cn('rounded-full animate-bounce', config.textColor, 'h-1 w-1 bg-current')} style={{ animationDelay: '0ms' }} />
            <span className={cn('rounded-full animate-bounce', config.textColor, 'h-1 w-1 bg-current')} style={{ animationDelay: '150ms' }} />
            <span className={cn('rounded-full animate-bounce', config.textColor, 'h-1 w-1 bg-current')} style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <Icon className={cn(iconSize, config.textColor)} />
        )}
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );
};
