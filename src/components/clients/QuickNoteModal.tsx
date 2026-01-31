import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface QuickNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess?: () => void;
}

export const QuickNoteModal = ({ open, onOpenChange, clientId, onSuccess }: QuickNoteModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSave = async () => {
    if (!content.trim() || !user) {
      toast({ title: 'Error', description: 'Note content is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('client_notes').insert({
      client_id: clientId,
      created_by: user.id,
      title: title.trim() || null,
      content: content.trim()
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Note Added', description: 'Your note has been saved.' });
      setTitle('');
      setContent('');
      onOpenChange(false);
      onSuccess?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Note title..."
            />
          </div>
          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="Write your note here..."
              className="min-h-[120px]"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};