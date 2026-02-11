import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Eye, Zap, Loader2 } from 'lucide-react';
import { useWorkflows, useToggleWorkflow, useDeleteWorkflow, useWorkflowSteps } from './useWorkflows';
import { TRIGGER_OPTIONS, ACTION_OPTIONS, type AutomationWorkflow } from './types';
import { format } from 'date-fns';

export function WorkflowList() {
  const { data: workflows, isLoading } = useWorkflows();
  const toggleWorkflow = useToggleWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const [viewingId, setViewingId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!workflows?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Zap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No workflows yet. Create your first automation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Automation Workflows</CardTitle>
          <CardDescription>{workflows.length} workflow{workflows.length !== 1 ? 's' : ''} configured</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map(wf => (
                <TableRow key={wf.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{wf.name}</p>
                      {wf.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{wf.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TRIGGER_OPTIONS.find(t => t.value === wf.trigger_type)?.label ?? wf.trigger_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={wf.is_enabled}
                        onCheckedChange={checked => toggleWorkflow.mutate({ id: wf.id, is_enabled: checked })}
                      />
                      <span className="text-xs">{wf.is_enabled ? 'Active' : 'Disabled'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(wf.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewingId(wf.id)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteWorkflow.mutate(wf.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WorkflowDetailDialog workflowId={viewingId} workflows={workflows} onClose={() => setViewingId(null)} />
    </>
  );
}

function WorkflowDetailDialog({ workflowId, workflows, onClose }: { workflowId: string | null; workflows: AutomationWorkflow[]; onClose: () => void }) {
  const { data: steps } = useWorkflowSteps(workflowId);
  const wf = workflows.find(w => w.id === workflowId);

  return (
    <Dialog open={!!workflowId} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{wf?.name}</DialogTitle>
        </DialogHeader>
        {wf && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{wf.description || 'No description'}</p>
              <Badge variant="outline" className="mt-2">{TRIGGER_OPTIONS.find(t => t.value === wf.trigger_type)?.label}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Steps ({steps?.length ?? 0})</p>
              <div className="space-y-2">
                {steps?.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 p-2 border rounded-md bg-muted/30">
                    <Badge variant="secondary" className="font-mono text-xs">{i + 1}</Badge>
                    <span className="text-sm">{ACTION_OPTIONS.find(a => a.value === s.action_type)?.label ?? s.action_type}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {s.action_type === 'wait' ? `${(s.action_config as any)?.days ?? 0} days` : ''}
                      {s.action_type === 'send_message' ? (s.action_config as any)?.channel ?? '' : ''}
                    </span>
                  </div>
                ))}
                {!steps?.length && <p className="text-sm text-muted-foreground">No steps defined</p>}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
