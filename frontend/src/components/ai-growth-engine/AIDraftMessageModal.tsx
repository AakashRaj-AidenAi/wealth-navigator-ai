import { useState } from 'react';
import { api } from '@/services/api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Sparkles, Copy, Mail, MessageSquare, Loader2, 
  TrendingUp, CalendarCheck, UserPlus, RefreshCw, 
  Gift, FileText, Shield, Coins, Send, Clock
} from 'lucide-react';

const MESSAGE_TYPES = [
  { value: 'portfolio_update', label: 'Portfolio Update', icon: TrendingUp, description: 'Performance summary & allocation review' },
  { value: 'follow_up', label: 'Follow-up Reminder', icon: CalendarCheck, description: 'Post-meeting follow-up & next steps' },
  { value: 'review_invite', label: 'Review Invite', icon: FileText, description: 'Schedule a portfolio review meeting' },
  { value: 'upsell', label: 'Upsell Suggestion', icon: UserPlus, description: 'New investment opportunities' },
  { value: 'birthday', label: 'Birthday Wish', icon: Gift, description: 'Personalized birthday greeting' },
  { value: 'general', label: 'General Check-in', icon: MessageSquare, description: 'Routine relationship check-in' },
  { value: 'kyc', label: 'KYC Reminder', icon: Shield, description: 'KYC renewal reminder' },
  { value: 'dividend', label: 'Dividend Update', icon: Coins, description: 'Dividend credit & reinvestment' },
];

interface PersonalizationInfo {
  portfolio_value: number;
  risk_profile: string;
  goals_count: number;
  has_meeting_context: boolean;
  recent_orders: number;
}

interface AIDraftMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  defaultType?: string;
  context?: Record<string, any>;
}

export const AIDraftMessageModal = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  defaultType = 'portfolio_update',
  context = {}
}: AIDraftMessageModalProps) => {
  const [messageType, setMessageType] = useState(defaultType);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [personalization, setPersonalization] = useState<PersonalizationInfo | null>(null);
  const [loggingTimeline, setLoggingTimeline] = useState(false);

  const generateDraft = async () => {
    setLoading(true);
    setPersonalization(null);
    try {
      const data = await api.post<any>('/insights/ai-growth-engine', {
        action: 'draft_message',
        client_id: clientId,
        context: { type: messageType, data: context }
      });

      setDraft(data?.draft || '');
      if (data?.personalization_used) {
        setPersonalization(data.personalization_used);
      }
      toast.success('AI draft generated with personalized context!');
    } catch (error) {
      console.error('Error generating draft:', error);
      toast.error('Failed to generate draft');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft);
    toast.success('Copied to clipboard!');
  };

  const handleLogToTimeline = async () => {
    setLoggingTimeline(true);
    try {
      const subject = draft.match(/Subject:\s*(.+)/)?.[1] || 'AI Draft Message';
      const body = draft.replace(/Subject:.*\n\n?/, '');

      // Log to communication_logs
      await api.post('/communication_logs', {
        client_id: clientId,
        communication_type: 'email',
        direction: 'outbound',
        subject,
        content: body,
        status: 'draft',
        metadata: { source: 'ai_draft', message_type: messageType },
      });

      // Log activity
      await api.post('/client_activities', {
        client_id: clientId,
        activity_type: 'email',
        title: `AI Draft: ${subject}`,
        description: `AI-generated ${MESSAGE_TYPES.find(t => t.value === messageType)?.label || messageType} draft created`,
      });

      toast.success('Draft saved to timeline & communication history');
    } catch (error) {
      console.error('Error logging:', error);
      toast.error('Failed to log to timeline');
    } finally {
      setLoggingTimeline(false);
    }
  };

  const handleSendWhatsApp = () => {
    const cleanMessage = draft.replace(/Subject:.*\n\n?/, '');
    const encodedMessage = encodeURIComponent(cleanMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleSendEmail = () => {
    const subject = draft.match(/Subject:\s*(.+)/)?.[1] || '';
    const body = draft.replace(/Subject:.*\n\n?/, '');
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const selectedType = MESSAGE_TYPES.find(t => t.value === messageType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Draft Assistant
          </DialogTitle>
          <DialogDescription>
            Generate personalized communication for {clientName} using their portfolio, goals, and meeting history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Message Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message Type</label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select message type" />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground ml-1">— {type.description}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button onClick={generateDraft} disabled={loading} className="w-full gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? 'Generating personalized draft...' : `Generate ${selectedType?.label || 'Draft'}`}
          </Button>

          {/* Personalization Context */}
          {personalization && (
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs gap-1">
                <TrendingUp className="h-3 w-3" />
                Portfolio: ₹{(personalization.portfolio_value / 100000).toFixed(1)}L
              </Badge>
              <Badge variant="outline" className="text-xs gap-1 capitalize">
                <Shield className="h-3 w-3" />
                {personalization.risk_profile}
              </Badge>
              {personalization.goals_count > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  {personalization.goals_count} goal(s)
                </Badge>
              )}
              {personalization.has_meeting_context && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CalendarCheck className="h-3 w-3" />
                  Meeting context used
                </Badge>
              )}
              {personalization.recent_orders > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  {personalization.recent_orders} recent order(s)
                </Badge>
              )}
            </div>
          )}

          {/* Draft Preview */}
          {draft && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Editable Draft</label>
                <Button variant="ghost" size="sm" onClick={generateDraft} disabled={loading} className="gap-1 text-xs h-7">
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[220px] font-mono text-sm"
              />
            </div>
          )}
        </div>

        {draft && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogToTimeline} 
                disabled={loggingTimeline}
                className="gap-1"
              >
                {loggingTimeline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                Save to Timeline
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSendWhatsApp} className="gap-1">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button size="sm" onClick={handleSendEmail} className="gap-1">
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
