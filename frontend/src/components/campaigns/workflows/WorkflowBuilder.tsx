import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, ArrowDown, Zap, MessageSquare, CheckSquare, Clock, FileText, UserPlus, Save } from 'lucide-react';
import { TRIGGER_OPTIONS, ACTION_OPTIONS, type TriggerType, type ActionType } from './types';
import { useCreateWorkflow } from './useWorkflows';

interface StepDraft {
  id: string;
  action_type: ActionType;
  action_config: Record<string, unknown>;
}

const actionIcons: Record<ActionType, React.ReactNode> = {
  send_message: <MessageSquare className="h-4 w-4" />,
  create_task: <CheckSquare className="h-4 w-4" />,
  wait: <Clock className="h-4 w-4" />,
  send_report: <FileText className="h-4 w-4" />,
  assign_advisor: <UserPlus className="h-4 w-4" />,
};

export function WorkflowBuilder({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType | ''>('');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({});
  const [steps, setSteps] = useState<StepDraft[]>([]);

  const createWorkflow = useCreateWorkflow();

  const addStep = (actionType: ActionType) => {
    setSteps(prev => [...prev, {
      id: crypto.randomUUID(),
      action_type: actionType,
      action_config: actionType === 'wait' ? { days: 1 } : {},
    }]);
  };

  const removeStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));

  const updateStepConfig = (id: string, key: string, value: unknown) => {
    setSteps(prev => prev.map(s =>
      s.id === id ? { ...s, action_config: { ...s.action_config, [key]: value } } : s
    ));
  };

  const handleSave = () => {
    if (!name || !triggerType) return;
    createWorkflow.mutate({
      name,
      description,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      steps: steps.map(s => ({ action_type: s.action_type, action_config: s.action_config })),
    }, { onSuccess: () => onCreated?.() });
  };

  const selectedTrigger = TRIGGER_OPTIONS.find(t => t.value === triggerType);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5" /> Workflow Details</CardTitle>
          <CardDescription>Define the automation workflow name and trigger.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Workflow Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Welcome Drip for New Clients" />
            </div>
            <div className="space-y-2">
              <Label>Trigger *</Label>
              <Select value={triggerType} onValueChange={v => setTriggerType(v as TriggerType)}>
                <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this workflow do?" rows={2} />
          </div>
          {selectedTrigger && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Trigger:</strong> {selectedTrigger.description}
              </p>
              {triggerType === 'lead_stage_change' && (
                <div className="mt-2 space-y-2">
                  <Label className="text-xs">Target Stage</Label>
                  <Select value={(triggerConfig.target_stage as string) || ''} onValueChange={v => setTriggerConfig({ ...triggerConfig, target_stage: v })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Any stage" /></SelectTrigger>
                    <SelectContent>
                      {['contacted', 'meeting', 'proposal', 'closed_won', 'lost'].map(s => (
                        <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {triggerType === 'idle_cash' && (
                <div className="mt-2 space-y-2">
                  <Label className="text-xs">Minimum Idle Amount (₹)</Label>
                  <Input type="number" className="h-8" value={(triggerConfig.min_amount as string) || ''} onChange={e => setTriggerConfig({ ...triggerConfig, min_amount: Number(e.target.value) })} placeholder="e.g. 100000" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow Steps</CardTitle>
          <CardDescription>Build your automation sequence. Steps run in order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground text-sm mb-3">No steps yet. Add actions below.</p>
            </div>
          )}
          {steps.map((step, idx) => (
            <div key={step.id}>
              {idx > 0 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">Step {idx + 1}</Badge>
                    {actionIcons[step.action_type]}
                    <span className="font-medium text-sm">{ACTION_OPTIONS.find(a => a.value === step.action_type)?.label}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeStep(step.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <StepConfigFields step={step} onUpdate={(k, v) => updateStepConfig(step.id, k, v)} />
              </div>
            </div>
          ))}
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2">Add Action</p>
            <div className="flex flex-wrap gap-2">
              {ACTION_OPTIONS.map(a => (
                <Button key={a.value} variant="outline" size="sm" onClick={() => addStep(a.value)} className="gap-1.5">
                  {actionIcons[a.value]}
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={handleSave} disabled={!name || !triggerType || createWorkflow.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {createWorkflow.isPending ? 'Saving...' : 'Save Workflow'}
        </Button>
      </div>
    </div>
  );
}

function StepConfigFields({ step, onUpdate }: { step: StepDraft; onUpdate: (k: string, v: unknown) => void }) {
  switch (step.action_type) {
    case 'send_message':
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Channel</Label>
            <Select value={(step.action_config.channel as string) || 'email'} onValueChange={v => onUpdate('channel', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Message</Label>
            <Textarea value={(step.action_config.message as string) || ''} onChange={e => onUpdate('message', e.target.value)} rows={2} placeholder="Hello {{client_name}}, ..." />
          </div>
        </div>
      );
    case 'create_task':
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Task Title</Label>
            <Input className="h-8" value={(step.action_config.title as string) || ''} onChange={e => onUpdate('title', e.target.value)} placeholder="e.g. Follow up with client" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Select value={(step.action_config.priority as string) || 'medium'} onValueChange={v => onUpdate('priority', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    case 'wait':
      return (
        <div className="space-y-1">
          <Label className="text-xs">Wait Duration (days)</Label>
          <Input className="h-8 w-32" type="number" min={1} value={(step.action_config.days as number) || 1} onChange={e => onUpdate('days', Number(e.target.value))} />
        </div>
      );
    case 'send_report':
      return (
        <div className="space-y-1">
          <Label className="text-xs">Report Type</Label>
          <Select value={(step.action_config.report_type as string) || 'performance'} onValueChange={v => onUpdate('report_type', v)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">Performance Report</SelectItem>
              <SelectItem value="compliance">Compliance Report</SelectItem>
              <SelectItem value="risk">Risk Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case 'assign_advisor':
      return (
        <div className="space-y-1">
          <Label className="text-xs">Assignment Note</Label>
          <Input className="h-8" value={(step.action_config.note as string) || ''} onChange={e => onUpdate('note', e.target.value)} placeholder="Reason for assignment" />
        </div>
      );
    default:
      return null;
  }
}
