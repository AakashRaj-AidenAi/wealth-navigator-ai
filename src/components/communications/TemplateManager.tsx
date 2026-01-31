import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Plus, Edit, Trash2, Mail, MessageSquare, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  channel: string;
  subject: string | null;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'sip_reminder', label: 'SIP Reminder' },
  { value: 'portfolio_report', label: 'Portfolio Report' },
  { value: 'meeting_invite', label: 'Meeting Invite' },
  { value: 'festive_greeting', label: 'Festive Greeting' },
  { value: 'custom', label: 'Custom' }
];

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare }
];

const COMMON_VARIABLES = [
  '{{client_name}}',
  '{{portfolio_value}}',
  '{{advisor_name}}',
  '{{sip_amount}}',
  '{{due_date}}',
  '{{meeting_date}}',
  '{{meeting_time}}'
];

export const TemplateManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [channel, setChannel] = useState('email');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setTemplates(data);
    if (error) console.error('Error fetching templates:', error);
    setLoading(false);
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{[^}]+\}\}/g) || [];
    return [...new Set(matches)];
  };

  const handleSave = async () => {
    if (!name || !category || !content) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const variables = extractVariables(content + (subject || ''));

    const templateData = {
      name,
      category,
      channel,
      subject: subject || null,
      content,
      variables,
      is_active: isActive,
      created_by: user?.id
    };

    let error;
    if (editingTemplate) {
      const { error: updateError } = await supabase
        .from('message_templates')
        .update(templateData)
        .eq('id', editingTemplate.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('message_templates')
        .insert(templateData);
      error = insertError;
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Template ${editingTemplate ? 'updated' : 'created'}` });
      setModalOpen(false);
      resetForm();
      fetchTemplates();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('message_templates').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Template deleted' });
      fetchTemplates();
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setCategory(template.category);
    setChannel(template.channel);
    setSubject(template.subject || '');
    setContent(template.content);
    setIsActive(template.is_active);
    setModalOpen(true);
  };

  const handleDuplicate = async (template: MessageTemplate) => {
    const { error } = await supabase.from('message_templates').insert({
      name: `${template.name} (Copy)`,
      category: template.category,
      channel: template.channel,
      subject: template.subject,
      content: template.content,
      variables: template.variables,
      is_active: true,
      created_by: user?.id
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Template duplicated' });
      fetchTemplates();
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setName('');
    setCategory('');
    setChannel('email');
    setSubject('');
    setContent('');
    setIsActive(true);
  };

  const insertVariable = (variable: string) => {
    setContent(prev => prev + variable);
  };

  const filteredTemplates = activeCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold mb-4">Message Templates</h2>
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Message Templates</h2>
          <Badge variant="secondary">{templates.length} templates</Badge>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setModalOpen(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat.value} value={cat.value}>{cat.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No templates found. Create your first template!
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              className="flex items-start justify-between p-4 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {template.channel === 'email' ? (
                    <Mail className="h-5 w-5 text-primary" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-success" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{template.name}</p>
                    {!template.is_active && (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {template.subject || template.content.substring(0, 60)}...
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORIES.find(c => c.value === template.category)?.label}
                    </Badge>
                    {template.variables.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {template.variables.length} variables
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Template Editor Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Monthly SIP Reminder"
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Channel *</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(ch => (
                      <SelectItem key={ch.value} value={ch.value}>
                        <div className="flex items-center gap-2">
                          <ch.icon className="h-4 w-4" />
                          {ch.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
            </div>

            {channel === 'email' && (
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Your Monthly SIP Reminder"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message Content *</Label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-2">Insert variable:</span>
                  {COMMON_VARIABLES.slice(0, 4).map(v => (
                    <Button
                      key={v}
                      variant="outline"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => insertVariable(v)}
                    >
                      {v.replace(/\{\{|\}\}/g, '')}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your message here. Use {{variable}} for personalization..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Detected variables: {extractVariables(content + subject).join(', ') || 'None'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting}>
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
