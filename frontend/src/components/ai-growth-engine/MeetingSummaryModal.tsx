import { useState } from 'react';
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
import { Brain, FileText, Loader2, CheckCircle, Calendar, ListTodo, AlertTriangle, ArrowRight, Save } from 'lucide-react';
import { useMeetingSummary } from '@/hooks/useMeetingSummary';

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
  onTasksCreated,
}: MeetingSummaryModalProps) => {
  const [notes, setNotes] = useState('');
  const { generate, result, loading, saveSummary, createTasksFromSummary, saveToTimeline, reset } = useMeetingSummary();

  const handleGenerate = () => {
    generate(notes);
  };

  const handleCreateTasks = async () => {
    if (!result || !clientId) return;
    await createTasksFromSummary(clientId, clientName, result);
    onTasksCreated?.(result.action_items);
  };

  const handleSaveToClient = async () => {
    if (!clientId || !result) return;
    await saveSummary(clientId, notes, result);
    await saveToTimeline(clientId, result);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setNotes('');
      reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Meeting Summary
          </DialogTitle>
          <DialogDescription>
            Paste your meeting notes to generate a structured summary with action items
            {clientName && ` for ${clientName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Meeting Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste or type your meeting notes here... Include discussion points, decisions made, risks mentioned, and any follow-up items."
              className="min-h-[150px]"
            />
          </div>

          <Button onClick={handleGenerate} disabled={loading || !notes.trim()} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Generate AI Summary
          </Button>

          {result && (
            <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
              {/* Summary */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Summary</span>
                </div>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
              </div>

              {/* Key Discussion Points */}
              {result.key_discussion_points.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-chart-3" />
                    <span className="font-medium text-sm">Key Discussion Points</span>
                    <Badge variant="outline" className="text-xs">{result.key_discussion_points.length}</Badge>
                  </div>
                  <ul className="space-y-1">
                    {result.key_discussion_points.map((point, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-chart-3 mt-0.5">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Decisions Made */}
              {result.decisions_made.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="font-medium text-sm">Decisions Made</span>
                    <Badge variant="outline" className="text-xs">{result.decisions_made.length}</Badge>
                  </div>
                  <ul className="space-y-1">
                    {result.decisions_made.map((decision, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-success mt-0.5">✓</span>
                        {decision}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks Discussed */}
              {result.risks_discussed.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="font-medium text-sm">Risks Discussed</span>
                    <Badge variant="outline" className="text-xs">{result.risks_discussed.length}</Badge>
                  </div>
                  <ul className="space-y-1">
                    {result.risks_discussed.map((risk, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-warning mt-0.5">⚠</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {result.next_steps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Next Steps</span>
                  </div>
                  <ul className="space-y-1">
                    {result.next_steps.map((step, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">→</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {result.action_items.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ListTodo className="h-4 w-4 text-warning" />
                    <span className="font-medium text-sm">Action Items</span>
                    <Badge variant="outline" className="text-xs">{result.action_items.length}</Badge>
                  </div>
                  <ul className="space-y-1">
                    {result.action_items.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-warning mt-0.5">□</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up Date */}
              {result.follow_up_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Follow-up: {result.follow_up_date}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {result && (
            <>
              {clientId && (
                <Button variant="outline" onClick={handleSaveToClient}>
                  <Save className="h-4 w-4 mr-2" />
                  Save to Client
                </Button>
              )}
              <Button onClick={handleCreateTasks} disabled={!result.action_items?.length || !clientId}>
                <ListTodo className="h-4 w-4 mr-2" />
                Create {result.action_items?.length || 0} Tasks
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
