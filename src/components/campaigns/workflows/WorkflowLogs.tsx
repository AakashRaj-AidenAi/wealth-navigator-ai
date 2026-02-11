import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ScrollText } from 'lucide-react';
import { useWorkflowLogs, useWorkflows } from './useWorkflows';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function WorkflowLogs() {
  const { data: logs, isLoading } = useWorkflowLogs();
  const { data: workflows } = useWorkflows();

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!logs?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ScrollText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No workflow executions yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Execution Logs</CardTitle>
        <CardDescription>Recent workflow executions and their status.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="font-medium text-sm">
                  {workflows?.find(w => w.id === log.workflow_id)?.name ?? log.workflow_id.slice(0, 8)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.trigger_entity_type} / {log.trigger_entity_id.slice(0, 8)}</TableCell>
                <TableCell><Badge variant="outline">{log.current_step}</Badge></TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[log.status] ?? ''}`}>
                    {log.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.started_at ? format(new Date(log.started_at), 'dd MMM HH:mm') : '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.completed_at ? format(new Date(log.completed_at), 'dd MMM HH:mm') : '-'}</TableCell>
                <TableCell className="text-sm text-destructive max-w-[150px] truncate">{log.error_message || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
