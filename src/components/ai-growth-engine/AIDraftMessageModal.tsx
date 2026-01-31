import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Sparkles, Copy, Mail, MessageSquare, Loader2 } from 'lucide-react';

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
  defaultType = 'general',
  context = {}
}: AIDraftMessageModalProps) => {
  const [messageType, setMessageType] = useState(defaultType);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const generateDraft = async () => {
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
            action: 'draft_message',
            client_id: clientId,
            context: { type: messageType, data: context }
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('AI rate limit reached. Try again later.');
        } else {
          toast.error('Failed to generate draft');
        }
        return;
      }

      const data = await response.json();
      setDraft(data.draft || '');
      toast.success('Draft generated!');
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

  const handleSendEmail = () => {
    // In a real app, this would integrate with email service
    toast.info('Email functionality would open here');
    onOpenChange(false);
  };

  const handleSendWhatsApp = () => {
    // Clean the message for WhatsApp
    const cleanMessage = draft.replace(/Subject:.*\n\n?/, '');
    const encodedMessage = encodeURIComponent(cleanMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Draft Message
          </DialogTitle>
          <DialogDescription>
            Generate a personalized message for {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select message type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Check-in</SelectItem>
                <SelectItem value="review">Portfolio Review</SelectItem>
                <SelectItem value="birthday">Birthday Greeting</SelectItem>
                <SelectItem value="dividend">Dividend Reinvestment</SelectItem>
                <SelectItem value="kyc">KYC Reminder</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateDraft} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>

          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Click 'Generate' to create a draft message..."
            className="min-h-[200px] font-mono text-sm"
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={copyToClipboard} disabled={!draft}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" onClick={handleSendWhatsApp} disabled={!draft}>
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button onClick={handleSendEmail} disabled={!draft}>
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
