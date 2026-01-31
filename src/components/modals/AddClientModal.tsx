import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddClientModal = ({ open, onOpenChange, onSuccess }: AddClientModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [clientName, setClientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAssets, setTotalAssets] = useState('');
  const [riskProfile, setRiskProfile] = useState('moderate');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add a client.',
        variant: 'destructive'
      });
      return;
    }

    if (!clientName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Client name is required.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    // Create client
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        advisor_id: user.id,
        client_name: clientName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        total_assets: totalAssets ? parseFloat(totalAssets) : 0,
        risk_profile: riskProfile,
        status: 'onboarding' // New clients start in onboarding
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    // Auto-create onboarding activity/task
    if (newClient) {
      // Create activity for timeline
      await supabase.from('client_activities').insert({
        client_id: newClient.id,
        created_by: user.id,
        activity_type: 'meeting',
        title: 'Client Onboarding',
        description: `Complete onboarding process for ${clientName.trim()}:\n• Collect KYC documents\n• Risk assessment questionnaire\n• Investment goals discussion\n• Portfolio recommendations`,
        scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
      });

      // Create task in the Tasks module (automation: new_client)
      await supabase.from('tasks').insert({
        title: `Onboarding: ${clientName.trim()}`,
        description: `Complete client onboarding:\n• Collect KYC documents\n• Risk assessment questionnaire\n• Investment goals discussion\n• Portfolio recommendations`,
        priority: 'high',
        status: 'todo',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        client_id: newClient.id,
        trigger_type: 'new_client',
        trigger_reference_id: newClient.id,
        assigned_to: user.id,
        created_by: user.id,
      });

      // Add prospect tag automatically for new clients
      await supabase.from('client_tags').insert({
        client_id: newClient.id,
        tag: 'prospect'
      });
    }

    toast({
      title: 'Client Added',
      description: `${clientName} has been added with an onboarding task.`
    });
    resetForm();
    onOpenChange(false);
    onSuccess?.();

    setLoading(false);
  };

  const resetForm = () => {
    setClientName('');
    setEmail('');
    setPhone('');
    setTotalAssets('');
    setRiskProfile('moderate');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name">Client Name *</Label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-phone">Phone</Label>
            <Input
              id="client-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total-assets">Total Assets ($)</Label>
            <Input
              id="total-assets"
              type="number"
              value={totalAssets}
              onChange={(e) => setTotalAssets(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="risk-profile">Risk Profile</Label>
            <Select value={riskProfile} onValueChange={setRiskProfile}>
              <SelectTrigger>
                <SelectValue placeholder="Select risk profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
                <SelectItem value="ultra-aggressive">Ultra Aggressive</SelectItem>
              </SelectContent>
            </Select>
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
                'Add Client'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};