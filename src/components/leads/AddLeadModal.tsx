import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type LeadSource = 'referral' | 'website' | 'social_media' | 'event' | 'cold_call' | 'advertisement' | 'partner' | 'other';

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const sources: { value: LeadSource; label: string }[] = [
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'event', label: 'Event' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' }
];

export const AddLeadModal = ({ open, onOpenChange, onSuccess }: AddLeadModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<LeadSource>('other');
  const [expectedValue, setExpectedValue] = useState('');
  const [probability, setProbability] = useState(50);
  const [notes, setNotes] = useState('');

  const calculateLeadScore = () => {
    let score = 0;
    
    // Contact completeness (up to 30 points)
    if (email) score += 15;
    if (phone) score += 15;
    
    // Source quality (up to 30 points)
    const sourceScores: Record<LeadSource, number> = {
      referral: 30,
      partner: 25,
      website: 20,
      event: 20,
      social_media: 15,
      cold_call: 10,
      advertisement: 10,
      other: 5
    };
    score += sourceScores[source] || 5;
    
    // Expected value (up to 20 points)
    const value = parseFloat(expectedValue) || 0;
    if (value >= 10000000) score += 20;
    else if (value >= 5000000) score += 15;
    else if (value >= 1000000) score += 10;
    else if (value > 0) score += 5;
    
    // Probability adjustment (up to 20 points)
    score += Math.floor(probability * 0.2);
    
    return Math.min(score, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add a lead.',
        variant: 'destructive'
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Lead name is required.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    const leadScore = calculateLeadScore();

    try {
      const lead = await api.post<any>('/leads', {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        source,
        expected_value: parseFloat(expectedValue) || 0,
        probability,
        lead_score: leadScore,
        notes: notes.trim() || null,
        assigned_to: user.id
      });

      // Log initial activity
      await api.post('/lead_activities', {
        lead_id: lead.id,
        activity_type: 'created',
        title: 'Lead created',
        description: `New lead added from ${source.replace('_', ' ')}`,
        created_by: user.id
      });

      // Auto-create follow-up task
      await api.post('/tasks', {
        title: `Initial contact with ${name}`,
        description: `New lead "${name}" added. Make initial contact to qualify the opportunity.`,
        priority: leadScore >= 70 ? 'high' : 'medium',
        status: 'todo',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        trigger_type: 'new_lead',
        assigned_to: user.id,
        created_by: user.id
      });

      toast({
        title: 'Lead Added',
        description: `${name} has been added to your pipeline with a score of ${leadScore}.`
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // API client already shows toast on error
    }

    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setSource('other');
    setExpectedValue('');
    setProbability(50);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-name">Name *</Label>
              <Input
                id="lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-source">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-value">Expected Investment ($)</Label>
              <Input
                id="lead-value"
                type="number"
                value={expectedValue}
                onChange={(e) => setExpectedValue(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Probability: {probability}%</Label>
              <Slider
                value={[probability]}
                onValueChange={(v) => setProbability(v[0])}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional information about this lead..."
              rows={3}
            />
          </div>

          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estimated Lead Score</span>
              <span className="text-lg font-bold text-primary">{calculateLeadScore()}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-gold hover:opacity-90" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
