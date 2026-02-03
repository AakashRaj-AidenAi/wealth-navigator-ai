import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatCurrencyShort } from '@/lib/currency';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Mail, Calendar as CalendarIcon, MessageSquare, 
  ListTodo, UserCheck, Star, Clock, Send, Loader2,
  History, Activity, ExternalLink, CheckCircle, XCircle
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadActivity = Database['public']['Tables']['lead_activities']['Row'];
type LeadStage = Database['public']['Enums']['lead_stage'];

interface LeadQuickActionsDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onStageChange: (leadId: string, newStage: LeadStage) => void;
}

const stageLabels: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  meeting: 'Meeting Scheduled',
  proposal: 'Proposal Sent',
  closed_won: 'Closed Won',
  lost: 'Closed Lost'
};

const stageColors: Record<LeadStage, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-cyan-500',
  meeting: 'bg-amber-500',
  proposal: 'bg-purple-500',
  closed_won: 'bg-success',
  lost: 'bg-destructive'
};

export const LeadQuickActionsDrawer = ({ 
  lead, 
  open, 
  onOpenChange, 
  onUpdate,
  onStageChange 
}: LeadQuickActionsDrawerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('actions');
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [stageHistory, setStageHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Form states
  const [noteContent, setNoteContent] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [meetingDate, setMeetingDate] = useState<Date>();
  const [meetingNotes, setMeetingNotes] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState<Date>();
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [lossNotes, setLossNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState<Date>();

  // Fetch activities and history when tab changes
  const handleTabChange = async (value: string) => {
    setActiveTab(value);
    if (!lead) return;

    if (value === 'activity') {
      const { data } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setActivities(data);
    } else if (value === 'history') {
      setLoadingHistory(true);
      const { data } = await supabase
        .from('lead_stage_history')
        .select('*')
        .eq('lead_id', lead.id)
        .order('changed_at', { ascending: false });
      if (data) setStageHistory(data);
      setLoadingHistory(false);
    }
  };

  const logActivity = async (type: string, title: string, description?: string) => {
    if (!lead || !user) return;
    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      activity_type: type,
      title,
      description,
      created_by: user.id
    });
    await supabase.from('leads').update({ last_activity_at: new Date().toISOString() }).eq('id', lead.id);
  };

  const handleLogCall = async () => {
    if (!callNotes.trim()) {
      toast({ title: 'Please enter call notes', variant: 'destructive' });
      return;
    }
    setLoading(true);
    await logActivity('call', 'Phone call logged', callNotes);
    toast({ title: 'Call Logged', description: 'Activity recorded successfully' });
    setCallNotes('');
    onUpdate();
    setLoading(false);
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      toast({ title: 'Please enter a note', variant: 'destructive' });
      return;
    }
    setLoading(true);
    await logActivity('note', 'Note added', noteContent);
    toast({ title: 'Note Added', description: 'Note saved successfully' });
    setNoteContent('');
    onUpdate();
    setLoading(false);
  };

  const handleScheduleMeeting = async () => {
    if (!meetingDate || !lead || !user) {
      toast({ title: 'Please select a meeting date', variant: 'destructive' });
      return;
    }
    setLoading(true);
    
    // Create meeting activity
    await logActivity('meeting', `Meeting scheduled for ${format(meetingDate, 'PPP')}`, meetingNotes);
    
    // Create task for meeting
    await supabase.from('tasks').insert({
      title: `Meeting with ${lead.name}`,
      description: meetingNotes || `Scheduled meeting with lead ${lead.name}`,
      priority: 'high',
      status: 'todo',
      due_date: format(meetingDate, 'yyyy-MM-dd'),
      trigger_type: 'meeting_logged',
      assigned_to: user.id,
      created_by: user.id
    });

    // Move to meeting stage if currently new or contacted
    if (lead.stage === 'new' || lead.stage === 'contacted') {
      onStageChange(lead.id, 'meeting');
    }

    toast({ title: 'Meeting Scheduled', description: 'Task created and stage updated' });
    setMeetingDate(undefined);
    setMeetingNotes('');
    onUpdate();
    setLoading(false);
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !lead || !user) {
      toast({ title: 'Please enter a task title', variant: 'destructive' });
      return;
    }
    setLoading(true);
    
    await supabase.from('tasks').insert({
      title: taskTitle,
      description: `Task for lead: ${lead.name}`,
      priority: 'medium',
      status: 'todo',
      due_date: taskDueDate ? format(taskDueDate, 'yyyy-MM-dd') : format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      trigger_type: 'manual',
      assigned_to: user.id,
      created_by: user.id
    });
    
    await logActivity('task', 'Task created', taskTitle);
    toast({ title: 'Task Created', description: 'Follow-up task added' });
    setTaskTitle('');
    setTaskDueDate(undefined);
    onUpdate();
    setLoading(false);
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim() || !lead) {
      toast({ title: 'Please fill in email subject and body', variant: 'destructive' });
      return;
    }
    setLoading(true);
    await logActivity('email', `Email: ${emailSubject}`, emailBody);
    toast({ title: 'Email Logged', description: 'Email activity recorded (integration needed for actual send)' });
    setEmailSubject('');
    setEmailBody('');
    onUpdate();
    setLoading(false);
  };

  const handleSetFollowUp = async () => {
    if (!followUpDate || !lead) {
      toast({ title: 'Please select a follow-up date', variant: 'destructive' });
      return;
    }
    setLoading(true);
    
    await supabase.from('leads')
      .update({ next_follow_up: followUpDate.toISOString() })
      .eq('id', lead.id);
    
    await logActivity('reminder', 'Follow-up scheduled', `Next follow-up set for ${format(followUpDate, 'PPP')}`);
    toast({ title: 'Follow-up Set', description: `Reminder set for ${format(followUpDate, 'PPP')}` });
    setFollowUpDate(undefined);
    onUpdate();
    setLoading(false);
  };

  const handleMarkLost = async () => {
    if (!lossReason || !lead) {
      toast({ title: 'Please select a loss reason', variant: 'destructive' });
      return;
    }
    setLoading(true);
    
    await supabase.from('leads')
      .update({ 
        stage: 'lost',
        loss_reason: lossReason,
        notes: lossNotes ? `${lead.notes || ''}\n\nLoss Notes: ${lossNotes}` : lead.notes
      })
      .eq('id', lead.id);
    
    await logActivity('stage_change', 'Lead marked as lost', `Reason: ${lossReason}. ${lossNotes}`);
    toast({ title: 'Lead Closed', description: 'Lead marked as lost' });
    setLossReason('');
    setLossNotes('');
    onUpdate();
    onOpenChange(false);
    setLoading(false);
  };

  const handleConvert = () => {
    if (lead) {
      onStageChange(lead.id, 'closed_won');
      onOpenChange(false);
    }
  };

  const handleViewClient = () => {
    if (lead?.converted_client_id) {
      onOpenChange(false);
      navigate(`/clients/${lead.converted_client_id}`);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  if (!lead) return null;

  const isConverted = lead.stage === 'closed_won' && lead.converted_client_id;
  const isLost = lead.stage === 'lost';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{lead.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={cn('text-white', stageColors[lead.stage])}>
                  {stageLabels[lead.stage]}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {lead.source?.replace('_', ' ')}
                </Badge>
                <div className={cn('flex items-center gap-1', getScoreColor(lead.lead_score || 0))}>
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-medium">{lead.lead_score}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{lead.email || 'No email'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{lead.phone || 'No phone'}</span>
            </div>
          </div>
          
          {/* Value Info */}
          <div className="flex items-center justify-between mt-3 p-3 rounded-lg bg-secondary/30">
            <div>
              <p className="text-xs text-muted-foreground">Expected Value</p>
              <p className="text-lg font-bold">{formatCurrencyShort(lead.expected_value)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Weighted ({lead.probability}%)</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrencyShort((lead.expected_value || 0) * (lead.probability || 0) / 100)}
              </p>
            </div>
          </div>

          {/* Converted Status */}
          {isConverted && (
            <Button 
              onClick={handleViewClient}
              className="w-full mt-3 gap-2 bg-success hover:bg-success/90"
            >
              <CheckCircle className="h-4 w-4" />
              View Converted Client
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col mt-4 overflow-hidden">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="actions">Quick Actions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="history">Stage History</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="actions" className="space-y-4 mt-0">
              {!isConverted && !isLost && (
                <>
                  {/* Log Call */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Phone className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Log Call</h4>
                    </div>
                    <Textarea
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      placeholder="Enter call notes..."
                      rows={2}
                    />
                    <Button onClick={handleLogCall} disabled={loading} className="mt-2 w-full" size="sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Call'}
                    </Button>
                  </div>

                  {/* Add Note */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Add Note</h4>
                    </div>
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add a note..."
                      rows={2}
                    />
                    <Button onClick={handleAddNote} disabled={loading} className="mt-2 w-full" size="sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Note'}
                    </Button>
                  </div>

                  {/* Schedule Meeting */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Schedule Meeting</h4>
                    </div>
                    <div className="space-y-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {meetingDate ? format(meetingDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={meetingDate}
                            onSelect={setMeetingDate}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        value={meetingNotes}
                        onChange={(e) => setMeetingNotes(e.target.value)}
                        placeholder="Meeting notes (optional)"
                      />
                      <Button onClick={handleScheduleMeeting} disabled={loading} className="w-full" size="sm">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule Meeting'}
                      </Button>
                    </div>
                  </div>

                  {/* Create Task */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <ListTodo className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Create Task</h4>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Task title..."
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {taskDueDate ? format(taskDueDate, 'PPP') : 'Due date (optional)'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={taskDueDate}
                            onSelect={setTaskDueDate}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button onClick={handleCreateTask} disabled={loading} className="w-full" size="sm">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Task'}
                      </Button>
                    </div>
                  </div>

                  {/* Set Follow-up */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Set Follow-up</h4>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {followUpDate ? format(followUpDate, 'PPP') : 'Select follow-up date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={followUpDate}
                          onSelect={setFollowUpDate}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button onClick={handleSetFollowUp} disabled={loading} className="mt-2 w-full" size="sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set Follow-up'}
                    </Button>
                  </div>

                  {/* Log Email */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Log Email</h4>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Email subject..."
                      />
                      <Textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Email content..."
                        rows={2}
                      />
                      <Button onClick={handleSendEmail} disabled={loading} className="w-full" size="sm">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Email'}
                      </Button>
                    </div>
                  </div>

                  {/* Stage Actions */}
                  <div className="p-4 rounded-lg border bg-card space-y-3">
                    <h4 className="font-medium">Quick Stage Change</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {lead.stage !== 'closed_won' && (
                        <Button 
                          onClick={handleConvert}
                          className="bg-success hover:bg-success/90 gap-2"
                        >
                          <UserCheck className="h-4 w-4" />
                          Convert to Client
                        </Button>
                      )}
                      <Button 
                        variant="destructive"
                        onClick={() => setActiveTab('lost')}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Mark as Lost
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {isLost && (
                <div className="p-6 rounded-lg border bg-destructive/10 text-center">
                  <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                  <h4 className="font-medium text-lg">Lead Closed - Lost</h4>
                  {lead.loss_reason && (
                    <p className="text-muted-foreground mt-2">Reason: {lead.loss_reason}</p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity recorded yet
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-secondary/20">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{activity.title}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                        )}
                        <Badge variant="outline" className="mt-2 text-xs capitalize">
                          {activity.activity_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : stageHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No stage changes recorded yet
                </div>
              ) : (
                <div className="space-y-3">
                  {stageHistory.map((history) => (
                    <div key={history.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="capitalize">
                          {history.previous_stage.replace('_', ' ')}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge className={cn('text-white capitalize', stageColors[history.new_stage as LeadStage] || 'bg-secondary')}>
                          {history.new_stage.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(history.changed_at), { addSuffix: true })}
                      </p>
                      {history.duration_in_stage && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Time in previous stage: {history.duration_in_stage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Hidden Lost Form Tab */}
            <TabsContent value="lost" className="mt-0">
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-4">Mark Lead as Lost</h4>
                <div className="space-y-3">
                  <div>
                    <Label>Loss Reason *</Label>
                    <Select value={lossReason} onValueChange={setLossReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="budget">Budget Constraints</SelectItem>
                        <SelectItem value="competitor">Went with Competitor</SelectItem>
                        <SelectItem value="timing">Bad Timing</SelectItem>
                        <SelectItem value="no_response">No Response</SelectItem>
                        <SelectItem value="not_qualified">Not Qualified</SelectItem>
                        <SelectItem value="changed_mind">Changed Mind</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={lossNotes}
                      onChange={(e) => setLossNotes(e.target.value)}
                      placeholder="Any additional details..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActiveTab('actions')} className="flex-1">
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleMarkLost} disabled={loading} className="flex-1">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark as Lost'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
