import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSegments } from '@/components/campaigns/segments/useSegments';
import { useCreateCampaign, useSendCampaign, useCampaigns } from './useCampaigns';
import { useQuery } from '@tanstack/react-query';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Save, Clock, Mail, MessageSquare, Bell, Eye, Paperclip, FileText } from 'lucide-react';

const PERSONALIZATION_VARS = [
  { label: 'Client Name', value: '{{client_name}}' },
  { label: 'Portfolio Value', value: '{{portfolio_value}}' },
  { label: 'Last Return', value: '{{last_return}}' },
];

interface CreateCampaignProps {
  onCreated?: () => void;
  initialContent?: string;
}

export const CreateCampaign = ({ onCreated, initialContent }: CreateCampaignProps) => {
  const { user } = useAuth();
  const { data: segments = [] } = useSegments();
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();

  const { data: templates = [] } = useQuery({
    queryKey: ['message-templates-active'],
    queryFn: async () => {
      return extractItems(await api.get('/message_templates', { is_active: true }));
    },
    enabled: !!user,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [channel, setChannel] = useState('email');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (initialContent) setContent(initialContent);
  }, [initialContent]);
  const selectedSegment = segments.find(s => s.id === segmentId);

  const insertVariable = (variable: string) => {
    setContent(prev => prev + variable);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setContent(template.content);
      if (template.subject) setSubject(template.subject);
      setChannel(template.channel);
    }
  };

  const handleSaveDraft = async () => {
    if (!name) return;
    await createCampaign.mutateAsync({
      name,
      description,
      segment_id: segmentId || undefined,
      channel,
      subject: subject || undefined,
      content,
      template_id: selectedTemplateId || undefined,
      status: 'draft',
    });
    onCreated?.();
  };

  const handleSchedule = async () => {
    if (!name || !scheduledAt) return;
    await createCampaign.mutateAsync({
      name,
      description,
      segment_id: segmentId || undefined,
      channel,
      subject: subject || undefined,
      content,
      template_id: selectedTemplateId || undefined,
      status: 'scheduled',
      scheduled_at: scheduledAt,
    });
    onCreated?.();
  };

  const handleSendNow = async () => {
    if (!name || !segmentId || !content) return;
    const campaign = await createCampaign.mutateAsync({
      name,
      description,
      segment_id: segmentId,
      channel,
      subject: subject || undefined,
      content,
      template_id: selectedTemplateId || undefined,
      status: 'sending',
    });
    if (campaign) {
      await sendCampaign.mutateAsync(campaign.id);
    }
    onCreated?.();
  };

  const isSending = createCampaign.isPending || sendCampaign.isPending;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Name *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Q1 Portfolio Review" />
                </div>
                <div className="space-y-2">
                  <Label>Segment *</Label>
                  <Select value={segmentId} onValueChange={setSegmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select segment" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.client_count} clients)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Campaign description..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Channel & Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={channel} onValueChange={setChannel}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /> Email</TabsTrigger>
                  <TabsTrigger value="whatsapp" className="gap-2"><MessageSquare className="h-4 w-4" /> WhatsApp</TabsTrigger>
                  <TabsTrigger value="in_app" className="gap-2"><Bell className="h-4 w-4" /> In-App</TabsTrigger>
                </TabsList>
              </Tabs>

              {templates.filter(t => t.channel === channel).length > 0 && (
                <div className="space-y-2">
                  <Label>Use Template</Label>
                  <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.channel === channel).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {channel === 'email' && (
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message *</Label>
                  <div className="flex gap-1">
                    {PERSONALIZATION_VARS.map(v => (
                      <Badge
                        key={v.value}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 text-xs"
                        onClick={() => insertVariable(v.value)}
                      >
                        + {v.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your message... Use personalization variables above."
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {selectedSegment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Target Audience</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedSegment.client_count}</div>
                <p className="text-sm text-muted-foreground">clients in "{selectedSegment.name}"</p>
                {selectedSegment.is_auto_updating && (
                  <Badge variant="secondary" className="mt-2">Auto-updating</Badge>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Schedule for later</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full gap-2" onClick={() => setPreviewOpen(true)} disabled={!content}>
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={handleSaveDraft} disabled={!name || isSending}>
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              {scheduledAt && (
                <Button variant="secondary" className="w-full gap-2" onClick={handleSchedule} disabled={!name || isSending}>
                  <Clock className="h-4 w-4" /> Schedule
                </Button>
              )}
              <Button className="w-full gap-2" onClick={handleSendNow} disabled={!name || !segmentId || !content || isSending}>
                <Send className="h-4 w-4" /> {isSending ? 'Sending...' : 'Send Now'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
          </DialogHeader>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Channel:</span>
                <Badge variant="outline">{channel}</Badge>
              </div>
              {subject && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subject:</span>
                  <span>{subject}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recipients:</span>
                <span>{selectedSegment?.client_count ?? 0} clients</span>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm whitespace-pre-wrap">
                  {content
                    .replace(/\{\{client_name\}\}/g, 'John Doe')
                    .replace(/\{\{portfolio_value\}\}/g, '₹25,00,000')
                    .replace(/\{\{last_return\}\}/g, '+12.5%')
                  }
                </p>
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
