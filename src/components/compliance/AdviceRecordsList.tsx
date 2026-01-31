import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface AdviceRecord {
  id: string;
  client_id: string;
  advisor_id: string;
  advice_type: string;
  recommendation: string;
  rationale: string | null;
  risk_considerations: string | null;
  client_acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  clients?: { client_name: string };
  profiles?: { full_name: string | null; email: string };
}

const ADVICE_TYPES = [
  'Asset Allocation',
  'Investment Selection',
  'Risk Management',
  'Tax Planning',
  'Estate Planning',
  'Insurance Review',
  'Retirement Planning',
  'Goal Setting'
];

export const AdviceRecordsList = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<AdviceRecord[]>([]);
  const [clients, setClients] = useState<{ id: string; client_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [adviceType, setAdviceType] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [rationale, setRationale] = useState('');
  const [riskConsiderations, setRiskConsiderations] = useState('');

  useEffect(() => {
    fetchRecords();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, client_name').order('client_name');
    if (data) setClients(data);
  };

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('advice_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch client names separately
      const clientIds = [...new Set(data.map(r => r.client_id))];
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, client_name')
        .in('id', clientIds);

      const clientMap = new Map(clientData?.map(c => [c.id, c.client_name]) || []);

      const enrichedData = data.map(record => ({
        ...record,
        clients: { client_name: clientMap.get(record.client_id) || 'Unknown' }
      }));

      setRecords(enrichedData);
    }
    setLoading(false);
  };

  const handleAddRecord = async () => {
    if (!selectedClient || !adviceType || !recommendation) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('advice_records').insert({
      client_id: selectedClient,
      advisor_id: user?.id,
      advice_type: adviceType,
      recommendation,
      rationale: rationale || null,
      risk_considerations: riskConsiderations || null
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Advice record created' });
      setAddModalOpen(false);
      resetForm();
      fetchRecords();
    }
    setSubmitting(false);
  };

  const handleAcknowledge = async (recordId: string) => {
    const { error } = await supabase
      .from('advice_records')
      .update({ 
        client_acknowledged: true, 
        acknowledged_at: new Date().toISOString() 
      })
      .eq('id', recordId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Advice acknowledged by client' });
      fetchRecords();
    }
  };

  const resetForm = () => {
    setSelectedClient('');
    setAdviceType('');
    setRecommendation('');
    setRationale('');
    setRiskConsiderations('');
  };

  const acknowledgedCount = records.filter(r => r.client_acknowledged).length;
  const pendingCount = records.filter(r => !r.client_acknowledged).length;

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold mb-4">Advice Records</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-secondary/30 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Advice Records</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-warning">
              <Clock className="h-4 w-4" /> {pendingCount} Pending
            </span>
            <span className="flex items-center gap-1 text-success">
              <CheckCircle2 className="h-4 w-4" /> {acknowledgedCount} Acknowledged
            </span>
          </div>
          {role === 'wealth_advisor' && (
            <Button size="sm" onClick={() => setAddModalOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Add Record
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No advice records found
          </div>
        ) : (
          records.map(record => (
            <div
              key={record.id}
              className="p-4 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{record.advice_type}</Badge>
                    {record.client_acknowledged ? (
                      <Badge className="bg-success/20 text-success">Acknowledged</Badge>
                    ) : (
                      <Badge className="bg-warning/20 text-warning">Pending Acknowledgment</Badge>
                    )}
                  </div>
                  <p className="font-medium mt-1">{record.recommendation}</p>
                  <p className="text-sm text-muted-foreground">
                    {record.clients?.client_name} • {format(new Date(record.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                {!record.client_acknowledged && role === 'wealth_advisor' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcknowledge(record.id)}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Client Acknowledged
                  </Button>
                )}
              </div>
              {record.risk_considerations && (
                <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 p-2 rounded">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <span>{record.risk_considerations}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Advice Record Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Investment Advice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client *</Label>
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
              <Label>Advice Type *</Label>
              <Select value={adviceType} onValueChange={setAdviceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ADVICE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recommendation *</Label>
              <Textarea
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                placeholder="Describe the investment recommendation..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Rationale</Label>
              <Textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Explain the reasoning behind this advice..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Considerations</Label>
              <Textarea
                value={riskConsiderations}
                onChange={(e) => setRiskConsiderations(e.target.value)}
                placeholder="Note any risks the client should be aware of..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRecord} disabled={submitting}>
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
