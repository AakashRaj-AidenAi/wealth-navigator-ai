import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Brain, FileText, Loader2, CheckCircle, Calendar, ListTodo } from 'lucide-react';

interface MeetingSummary {
  summary: string;
  decisions: string[];
  action_items: string[];
  follow_up_date: string | null;
}

interface MeetingSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
  onTasksCreated?: (tasks: string[]) => void;
}

export const MeetingSummaryModal = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  onTasksCreated
}: MeetingSummaryModalProps) => {
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    if (!notes.trim()) {
      toast.error('Please enter meeting notes');
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Please log in to use AI features');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-growth-engine`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            action: 'meeting_summary',
            context: { notes }
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('AI rate limit reached. Try again later.');
        } else {
          toast.error('Failed to generate summary');
        }
        return;
      }

      const data = await response.json();
      setSummary(data);
      toast.success('Summary generated!');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const createTasks = async () => {
    if (!summary?.action_items?.length) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const tasks = summary.action_items.map((item) => ({
        title: item.substring(0, 100),
        description: `From meeting${clientName ? ` with ${clientName}` : ''}: ${item}`,
        status: 'todo' as const,
        priority: 'medium' as const,
        trigger_type: 'meeting_logged' as const,
        assigned_to: session.session.user.id,
        created_by: session.session.user.id,
        client_id: clientId || null,
        due_date: summary.follow_up_date || null
      }));

      const { error } = await supabase.from('tasks').insert(tasks);
      
      if (error) throw error;

      toast.success(`${tasks.length} tasks created!`);
      onTasksCreated?.(summary.action_items);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating tasks:', error);
      toast.error('Failed to create tasks');
    }
  };

  const saveToClient = async () => {
    if (!clientId || !summary) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      // Save as client note
      const { error } = await supabase.from('client_notes').insert({
        client_id: clientId,
        title: `Meeting Summary - ${new Date().toLocaleDateString()}`,
        content: `**Summary:**\n${summary.summary}\n\n**Decisions:**\n${summary.decisions.map(d => `- ${d}`).join('\n')}\n\n**Action Items:**\n${summary.action_items.map(a => `- ${a}`).join('\n')}`,
        created_by: session.session.user.id
      });

      if (error) throw error;

      // Also log as activity
      await supabase.from('client_activities').insert({
        client_id: clientId,
        activity_type: 'meeting',
        title: 'Meeting Summary',
        description: summary.summary,
        created_by: session.session.user.id
      });

      toast.success('Saved to client timeline!');
    } catch (error) {
      console.error('Error saving to client:', error);
      toast.error('Failed to save to client');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Meeting Summary
          </DialogTitle>
          <DialogDescription>
            Paste your meeting notes to generate a summary, decisions, and action items
            {clientName && ` for ${clientName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Meeting Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste or type your meeting notes here... Include discussion points, decisions made, and any follow-up items mentioned."
              className="min-h-[150px]"
            />
          </div>

          <Button onClick={generateSummary} disabled={loading || !notes.trim()} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Generate Summary
          </Button>

          {summary && (
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Summary</span>
                </div>
                <p className="text-sm text-muted-foreground">{summary.summary}</p>
              </div>

              {summary.decisions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="font-medium text-sm">Key Decisions</span>
                  </div>
                  <ul className="space-y-1">
                    {summary.decisions.map((decision, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-success">•</span>
                        {decision}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.action_items.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ListTodo className="h-4 w-4 text-warning" />
                    <span className="font-medium text-sm">Action Items</span>
                    <Badge variant="outline" className="text-xs">{summary.action_items.length}</Badge>
                  </div>
                  <ul className="space-y-1">
                    {summary.action_items.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-warning">□</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.follow_up_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Follow-up: {summary.follow_up_date}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {summary && (
            <>
              {clientId && (
                <Button variant="outline" onClick={saveToClient}>
                  <FileText className="h-4 w-4 mr-2" />
                  Save to Client
                </Button>
              )}
              <Button onClick={createTasks} disabled={!summary.action_items?.length}>
                <ListTodo className="h-4 w-4 mr-2" />
                Create {summary.action_items?.length || 0} Tasks
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
