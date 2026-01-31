import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { Loader2, UserCheck, ArrowRight, CheckCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface ConvertLeadModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConvertLeadModal = ({ lead, onClose, onSuccess }: ConvertLeadModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'confirm' | 'success'>('confirm');

  // Pre-fill from lead data
  const [clientName, setClientName] = useState(lead?.name || '');
  const [email, setEmail] = useState(lead?.email || '');
  const [phone, setPhone] = useState(lead?.phone || '');
  const [totalAssets, setTotalAssets] = useState(lead?.expected_value?.toString() || '');

  const handleConvert = async () => {
    if (!lead || !user) return;

    setLoading(true);

    // Create new client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        client_name: clientName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        total_assets: parseFloat(totalAssets) || 0,
        advisor_id: user.id,
        status: 'active'
      })
      .select()
      .single();

    if (clientError) {
      toast({
        title: 'Error',
        description: 'Failed to create client',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    // Update lead with conversion info
    await supabase
      .from('leads')
      .update({
        converted_client_id: client.id,
        converted_at: new Date().toISOString(),
        stage: 'closed_won'
      })
      .eq('id', lead.id);

    // Log conversion activity
    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      activity_type: 'converted',
      title: 'Lead converted to client',
      description: `Successfully converted to client: ${clientName}`,
      created_by: user.id
    });

    // Create onboarding task for new client
    await supabase.from('tasks').insert({
      title: `Onboard new client: ${clientName}`,
      description: `Complete onboarding process for newly converted client "${clientName}". Verify KYC, set up portfolio, and schedule initial review meeting.`,
      priority: 'high',
      status: 'todo',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      client_id: client.id,
      trigger_type: 'new_client',
      assigned_to: user.id,
      created_by: user.id
    });

    setStep('success');
    setLoading(false);
  };

  const handleClose = () => {
    setStep('confirm');
    onClose();
    if (step === 'success') {
      onSuccess();
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={!!lead} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Convert Lead to Client
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected value: {formatCurrency(lead.expected_value)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                This will create a new client record with the lead's information. 
                The lead will be marked as converted and linked to the new client.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Client Name *</Label>
                  <Input
                    id="client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="client-email">Email</Label>
                    <Input
                      id="client-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-phone">Phone</Label>
                    <Input
                      id="client-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-assets">Initial Assets ($)</Label>
                  <Input
                    id="client-assets"
                    type="number"
                    value={totalAssets}
                    onChange={(e) => setTotalAssets(e.target.value)}
                    placeholder="Total assets under management"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleConvert} 
                disabled={loading || !clientName.trim()}
                className="bg-gradient-gold hover:opacity-90 gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Convert to Client
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Conversion Successful!</h3>
            <p className="text-muted-foreground mb-6">
              {clientName} has been added as a new client. An onboarding task has been created.
            </p>
            <Button onClick={handleClose} className="bg-gradient-gold hover:opacity-90">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
