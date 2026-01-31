import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileCheck, Clock, CheckCircle2, XCircle, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Consent {
  id: string;
  client_id: string;
  consent_type: string;
  status: string;
  document_version: string | null;
  signed_at: string | null;
  expires_at: string | null;
  created_at: string;
  clients?: { client_name: string };
}

const CONSENT_TYPES = [
  { value: 'risk_disclosure', label: 'Risk Disclosure' },
  { value: 'investment_policy', label: 'Investment Policy' },
  { value: 'data_privacy', label: 'Data Privacy' },
  { value: 'fee_agreement', label: 'Fee Agreement' },
  { value: 'kyc_authorization', label: 'KYC Authorization' },
  { value: 'portfolio_discretion', label: 'Portfolio Discretion' },
  { value: 'electronic_delivery', label: 'Electronic Delivery' }
];

export const ConsentManager = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [clients, setClients] = useState<{ id: string; client_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchConsents();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, client_name').order('client_name');
    if (data) setClients(data);
  };

  const fetchConsents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_consents')
      .select('*, clients(client_name)')
      .order('created_at', { ascending: false });

    if (data) {
      setConsents(data as Consent[]);
    }
    setLoading(false);
  };

  const handleAddConsent = async () => {
    if (!selectedClient || !selectedType) {
      toast({ title: 'Error', description: 'Please select a client and consent type', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('client_consents').insert({
      client_id: selectedClient,
      consent_type: selectedType as any,
      status: 'pending' as any,
      document_version: '1.0'
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Consent request created' });
      setAddModalOpen(false);
      setSelectedClient('');
      setSelectedType('');
      fetchConsents();
    }
    setSubmitting(false);
  };

  const handleMarkAsSigned = async (consentId: string) => {
    const { error } = await supabase
      .from('client_consents')
      .update({ 
        status: 'signed', 
        signed_at: new Date().toISOString() 
      })
      .eq('id', consentId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Consent marked as signed' });
      fetchConsents();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-success/20 text-success hover:bg-success/30">Signed</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning hover:bg-warning/30">Pending</Badge>;
      case 'expired':
        return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">Expired</Badge>;
      case 'revoked':
        return <Badge className="bg-muted text-muted-foreground hover:bg-muted/80">Revoked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = consents.filter(c => c.status === 'pending').length;
  const signedCount = consents.filter(c => c.status === 'signed').length;

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold mb-4">Consent Management</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-secondary/30 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileCheck className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Consent Management</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-warning">
              <Clock className="h-4 w-4" /> {pendingCount} Pending
            </span>
            <span className="flex items-center gap-1 text-success">
              <CheckCircle2 className="h-4 w-4" /> {signedCount} Signed
            </span>
          </div>
          {role === 'wealth_advisor' && (
            <Button size="sm" onClick={() => setAddModalOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Request Consent
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {consents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No consent records found
          </div>
        ) : (
          consents.map(consent => (
            <div
              key={consent.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                {getStatusBadge(consent.status)}
                <div>
                  <p className="font-medium">
                    {CONSENT_TYPES.find(t => t.value === consent.consent_type)?.label || consent.consent_type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {consent.clients?.client_name} • {format(new Date(consent.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {consent.signed_at && (
                  <span className="text-xs text-muted-foreground">
                    Signed: {format(new Date(consent.signed_at), 'MMM d, yyyy')}
                  </span>
                )}
                {consent.status === 'pending' && role === 'wealth_advisor' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAsSigned(consent.id)}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Mark Signed
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Consent Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Consent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Consent Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consent type" />
                </SelectTrigger>
                <SelectContent>
                  {CONSENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddConsent} disabled={submitting} className="gap-1">
              <Send className="h-4 w-4" /> Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
