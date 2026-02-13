import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings } from 'lucide-react';

const STORAGE_KEY = 'wealthyx-copilot-settings';

interface CopilotPreferences {
  defaultAgent: string;
  responseLength: 'concise' | 'balanced' | 'detailed';
  voiceEnabled: boolean;
  streamingEnabled: boolean;
}

const defaultPreferences: CopilotPreferences = {
  defaultAgent: 'general',
  responseLength: 'balanced',
  voiceEnabled: true,
  streamingEnabled: true,
};

function loadPreferences(): CopilotPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultPreferences, ...JSON.parse(stored) };
  } catch {}
  return defaultPreferences;
}

interface CopilotSettingsProps {
  onAgentChange?: (agent: string) => void;
}

export const CopilotSettings = ({ onAgentChange }: CopilotSettingsProps) => {
  const [prefs, setPrefs] = useState<CopilotPreferences>(loadPreferences);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const updatePref = <K extends keyof CopilotPreferences>(
    key: K,
    value: CopilotPreferences[K],
  ) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    if (key === 'defaultAgent' && onAgentChange) {
      onAgentChange(value as string);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">Copilot Settings</h4>
          <p className="text-xs text-muted-foreground">
            Customize how Wealthyx responds
          </p>
        </div>

        {/* Default Agent */}
        <div className="space-y-2">
          <Label className="text-xs">Default Agent</Label>
          <Select
            value={prefs.defaultAgent}
            onValueChange={(v) => updatePref('defaultAgent', v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General Assistant</SelectItem>
              <SelectItem value="portfolio">Portfolio Analyst</SelectItem>
              <SelectItem value="compliance">Compliance Officer</SelectItem>
              <SelectItem value="research">Research Analyst</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Response Length */}
        <div className="space-y-2">
          <Label className="text-xs">Response Length</Label>
          <Select
            value={prefs.responseLength}
            onValueChange={(v) =>
              updatePref('responseLength', v as CopilotPreferences['responseLength'])
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Voice Input */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Voice Input</Label>
          <Switch
            checked={prefs.voiceEnabled}
            onCheckedChange={(v) => updatePref('voiceEnabled', v)}
          />
        </div>

        {/* Streaming */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Streaming Responses</Label>
          <Switch
            checked={prefs.streamingEnabled}
            onCheckedChange={(v) => updatePref('streamingEnabled', v)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
