import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Plus, Phone, Mail, Video, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface CommunicationLog {
  id: string;
  client_id: string;
  communication_type: string;
  direction: string;
  subject: string | null;
  content: string | null;
  sent_by: string;
  sent_at: string;
  clients?: { client_name: string };
}

const COMMUNICATION_TYPES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone Call', icon: Phone },
  { value: 'video', label: 'Video Call', icon: Video },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'message', label: 'Message', icon: MessageSquare }
];

export const CommunicationLogs = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [clients, setClients] = useState<{ id: string; client_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [commType, setCommType] = useState('');
  const [direction, setDirection] = useState('outbound');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchLogs();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, client_name').order('client_name');
    if (data) setClients(data);
  };

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('communication_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (data) {
      // Fetch client names separately
      const clientIds = [...new Set(data.map(l => l.client_id))];
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, client_name')
        .in('id', clientIds);

      const clientMap = new Map(clientData?.map(c => [c.id, c.client_name]) || []);

      const enrichedData = data.map(log => ({
        ...log,
        clients: { client_name: clientMap.get(log.client_id) || 'Unknown' }
      }));

      setLogs(enrichedData);
    }
    setLoading(false);
  };

  const handleAddLog = async () => {
    if (!selectedClient || !commType) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('communication_logs').insert({
      client_id: selectedClient,
      communication_type: commType,
      direction,
      subject: subject || null,
      content: content || null,
      sent_by: user?.id,
      sent_at: new Date().toISOString()
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Communication logged' });
      setAddModalOpen(false);
      resetForm();
      fetchLogs();
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setSelectedClient('');
    setCommType('');
    setDirection('outbound');
    setSubject('');
    setContent('');
  };

  const getTypeIcon = (type: string) => {
    const commType = COMMUNICATION_TYPES.find(t => t.value === type);
    const Icon = commType?.icon || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold mb-4">Communication Logs</h2>
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
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Communication Logs</h2>
          <Badge variant="secondary">{logs.length} entries</Badge>
        </div>
        {role === 'wealth_advisor' && (
          <Button size="sm" onClick={() => setAddModalOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Log Communication
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No communication logs found
          </div>
        ) : (
          logs.map(log => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  {getTypeIcon(log.communication_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{log.subject || log.communication_type}</p>
                    {log.direction === 'outbound' ? (
                      <ArrowUpRight className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowDownLeft className="h-3 w-3 text-success" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {log.clients?.client_name} • {format(new Date(log.sent_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {COMMUNICATION_TYPES.find(t => t.value === log.communication_type)?.label || log.communication_type}
              </Badge>
            </div>
          ))
        )}
      </div>

      {/* Add Communication Log Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Communication</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={commType} onValueChange={setCommType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNICATION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Communication subject..."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Summary or notes about the communication..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLog} disabled={submitting}>
              Save Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
