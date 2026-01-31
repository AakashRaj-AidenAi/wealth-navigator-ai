import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Mail, MessageSquare, Paperclip, FileText, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Client {
  id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
}

interface Template {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  content: string;
  variables: string[];
  category: string;
}

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string;
}

interface MessageComposerProps {
  clientId?: string;
  onMessageSent?: () => void;
}

export const MessageComposer = ({ clientId, onMessageSent }: MessageComposerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState(clientId || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (clientId) {
      setSelectedClientId(clientId);
      fetchClientDocuments(clientId);
    }
  }, [clientId]);

  const fetchData = async () => {
    setLoading(true);
    const [clientsRes, templatesRes] = await Promise.all([
      supabase.from('clients').select('id, client_name, email, phone').order('client_name'),
      supabase.from('message_templates').select('*').eq('is_active', true)
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (templatesRes.data) setTemplates(templatesRes.data);
    setLoading(false);
  };

  const fetchClientDocuments = async (cId: string) => {
    const { data } = await supabase
      .from('client_documents')
      .select('id, file_name, file_path, document_type')
      .eq('client_id', cId);
    if (data) setDocuments(data);
  };

  const handleClientChange = (cId: string) => {
    setSelectedClientId(cId);
    fetchClientDocuments(cId);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setChannel(template.channel as 'email' | 'whatsapp');
      setSubject(template.subject || '');
      
      // Replace variables with actual values
      const client = clients.find(c => c.id === selectedClientId);
      let processedContent = template.content;
      
      if (client) {
        processedContent = processedContent.replace(/\{\{client_name\}\}/g, client.client_name);
      }
      
      setContent(processedContent);
    }
  };

  const toggleAttachment = (docId: string) => {
    setAttachments(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleSend = async () => {
    if (!selectedClientId || !content) {
      toast({ title: 'Error', description: 'Please select a client and enter a message', variant: 'destructive' });
      return;
    }

    setSending(true);

    const attachmentData = documents
      .filter(d => attachments.includes(d.id))
      .map(d => ({ id: d.id, name: d.file_name, path: d.file_path }));

    const { error } = await supabase.from('communication_logs').insert({
      client_id: selectedClientId,
      communication_type: channel,
      direction: 'outbound',
      subject: channel === 'email' ? subject : null,
      content,
      attachments: attachmentData.length > 0 ? attachmentData : null,
      template_id: selectedTemplateId || null,
      sent_by: user?.id,
      sent_at: new Date().toISOString(),
      status: 'sent'
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Message Sent', description: `${channel === 'email' ? 'Email' : 'WhatsApp message'} logged successfully` });
      
      // Reset form
      setSubject('');
      setContent('');
      setAttachments([]);
      setSelectedTemplateId('');
      
      if (!clientId) {
        setSelectedClientId('');
      }
      
      onMessageSent?.();
    }
    setSending(false);
  };

  const getPreviewContent = () => {
    const client = clients.find(c => c.id === selectedClientId);
    return {
      to: client ? (channel === 'email' ? client.email : client.phone) : 'Select a client',
      name: client?.client_name || 'Client Name',
      subject,
      content,
      attachments: documents.filter(d => attachments.includes(d.id))
    };
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary/30 rounded w-1/3" />
          <div className="h-32 bg-secondary/30 rounded" />
        </div>
      </div>
    );
  }

  const preview = getPreviewContent();

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Send className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Compose Message</h2>
      </div>

      <Tabs value={channel} onValueChange={(v) => setChannel(v as 'email' | 'whatsapp')} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" /> Email
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" /> WhatsApp
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>To *</Label>
            <Select value={selectedClientId} onValueChange={handleClientChange} disabled={!!clientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.client_name} ({channel === 'email' ? client.email : client.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Use Template</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select template (optional)" />
              </SelectTrigger>
              <SelectContent>
                {templates.filter(t => t.channel === channel).map(template => (
                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {channel === 'email' && (
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Message *</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your message..."
            rows={6}
          />
        </div>

        {/* Attachments */}
        {selectedClientId && documents.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Attach Documents
            </Label>
            <div className="flex flex-wrap gap-2">
              {documents.map(doc => (
                <Button
                  key={doc.id}
                  variant={attachments.includes(doc.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleAttachment(doc.id)}
                  className="gap-1"
                >
                  <FileText className="h-3 w-3" />
                  {doc.file_name}
                  {attachments.includes(doc.id) && <X className="h-3 w-3 ml-1" />}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-1">
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button onClick={handleSend} disabled={sending} className="flex-1 gap-1">
            <Send className="h-4 w-4" /> 
            {sending ? 'Sending...' : `Send ${channel === 'email' ? 'Email' : 'WhatsApp'}`}
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
          </DialogHeader>
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To:</span>
                  <span>{preview.name} ({preview.to})</span>
                </div>
                {channel === 'email' && preview.subject && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subject:</span>
                    <span>{preview.subject}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <p className="text-sm whitespace-pre-wrap">{preview.content || 'No message content'}</p>
                </div>
                {preview.attachments.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground mb-2">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {preview.attachments.map(doc => (
                        <Badge key={doc.id} variant="secondary" className="gap-1">
                          <FileText className="h-3 w-3" />
                          {doc.file_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

