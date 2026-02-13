import { useState, useEffect } from 'react';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  FileText, Plus, Edit, Trash2, Mail, MessageSquare, Copy, Download,
  Briefcase, CalendarCheck, IndianRupee, TrendingUp, Gift, ShieldAlert, Loader2,
} from 'lucide-react';

interface Template {
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
  { value: 'portfolio_update', label: 'Portfolio Update', icon: Briefcase },
  { value: 'review_invite', label: 'Review Invite', icon: CalendarCheck },
  { value: 'sip_reminder', label: 'SIP Reminder', icon: IndianRupee },
  { value: 'tax_saver', label: 'Tax Saver', icon: IndianRupee },
  { value: 'nfo_alert', label: 'NFO Alert', icon: TrendingUp },
  { value: 'greeting', label: 'Greeting', icon: Gift },
  { value: 'market_update', label: 'Market Update', icon: ShieldAlert },
  { value: 'custom', label: 'Custom', icon: FileText },
];

const CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
];

const VARIABLES = [
  '{{client_name}}', '{{portfolio_value}}', '{{advisor_name}}', '{{sip_amount}}',
  '{{due_date}}', '{{meeting_date}}', '{{meeting_time}}', '{{fund_name}}',
  '{{last_return}}', '{{tax_saving_limit}}',
];

const PREBUILT_TEMPLATES: Omit<Template, 'id' | 'created_at'>[] = [
  {
    name: 'Monthly Portfolio Update',
    category: 'portfolio_update',
    channel: 'email',
    subject: 'Your Portfolio Update for This Month',
    content: `Dear {{client_name}},\n\nHere's your monthly portfolio summary:\n\n📊 Current Value: {{portfolio_value}}\n📈 Monthly Return: {{last_return}}\n\nYour portfolio continues to be aligned with your financial goals. Key highlights:\n\n• Equity allocation remains on track\n• Debt instruments are performing within expected range\n• No rebalancing action required this month\n\nPlease don't hesitate to reach out if you'd like to discuss your portfolio in detail.\n\nBest regards,\n{{advisor_name}}`,
    variables: ['{{client_name}}', '{{portfolio_value}}', '{{last_return}}', '{{advisor_name}}'],
    is_active: true,
  },
  {
    name: 'Quarterly Review Invite',
    category: 'review_invite',
    channel: 'email',
    subject: 'Invitation: Quarterly Portfolio Review',
    content: `Dear {{client_name}},\n\nIt's time for your quarterly portfolio review! I'd like to schedule a meeting to discuss:\n\n✅ Portfolio performance & returns\n✅ Market outlook for the next quarter\n✅ Any changes to your financial goals\n✅ Rebalancing opportunities\n\nProposed date: {{meeting_date}} at {{meeting_time}}\n\nPlease confirm your availability, or suggest an alternative time that works better for you.\n\nLooking forward to our discussion.\n\nWarm regards,\n{{advisor_name}}`,
    variables: ['{{client_name}}', '{{meeting_date}}', '{{meeting_time}}', '{{advisor_name}}'],
    is_active: true,
  },
  {
    name: 'SIP Reminder',
    category: 'sip_reminder',
    channel: 'whatsapp',
    subject: null,
    content: `Hi {{client_name}} 👋\n\nFriendly reminder: Your SIP of {{sip_amount}} is due on {{due_date}}.\n\nPlease ensure sufficient balance in your account for a smooth transaction.\n\n💡 Consistent SIP investing is key to long-term wealth creation!\n\nReach out if you have any questions.\n— {{advisor_name}}`,
    variables: ['{{client_name}}', '{{sip_amount}}', '{{due_date}}', '{{advisor_name}}'],
    is_active: true,
  },
  {
    name: 'Tax Saver Campaign',
    category: 'tax_saver',
    channel: 'email',
    subject: 'Maximize Your Tax Savings Before March 31st',
    content: `Dear {{client_name}},\n\nThe financial year-end is approaching! Here's your tax-saving checklist:\n\n🏦 Section 80C: Up to {{tax_saving_limit}} in ELSS, PPF, EPF\n🏥 Section 80D: Health insurance premiums\n🏠 Section 24: Home loan interest deduction\n📊 Section 80CCD: NPS contributions\n\nYour current utilization shows room for optimization. I've identified specific investment options tailored to your profile.\n\nLet's schedule a quick call to finalize your tax-saving strategy.\n\nBest regards,\n{{advisor_name}}`,
    variables: ['{{client_name}}', '{{tax_saving_limit}}', '{{advisor_name}}'],
    is_active: true,
  },
  {
    name: 'New Fund / NFO Alert',
    category: 'nfo_alert',
    channel: 'email',
    subject: 'New Fund Opportunity: {{fund_name}}',
    content: `Dear {{client_name}},\n\nExciting new investment opportunity!\n\n🆕 Fund: {{fund_name}}\n📋 Category: Equity - Large & Mid Cap\n📅 NFO Period: Open now\n💰 Min Investment: ₹5,000\n\nWhy consider this fund:\n• Experienced fund management team\n• Aligned with your risk profile\n• Diversification opportunity for your portfolio\n\nI've reviewed this fund and believe it could complement your current portfolio. Would you like to discuss this further?\n\nBest regards,\n{{advisor_name}}`,
    variables: ['{{client_name}}', '{{fund_name}}', '{{advisor_name}}'],
    is_active: true,
  },
  {
    name: 'Birthday Greeting',
    category: 'greeting',
    channel: 'whatsapp',
    subject: null,
    content: `Happy Birthday, {{client_name}}! 🎂🎉\n\nWishing you a wonderful year filled with health, happiness, and prosperity.\n\nAs your financial advisor, I'm committed to helping you achieve every milestone. Here's to another year of growing wealth together!\n\nWarm wishes,\n{{advisor_name}} 🌟`,
    variables: ['{{client_name}}', '{{advisor_name}}'],
    is_active: true,
  },
  {
    name: 'Market Volatility Reassurance',
    category: 'market_update',
    channel: 'email',
    subject: 'Market Update: Staying the Course',
    content: `Dear {{client_name}},\n\nYou may have noticed recent market volatility. I want to assure you that your portfolio is well-positioned:\n\n📊 Your Portfolio: {{portfolio_value}}\n🛡️ Risk Profile: Aligned with your goals\n📈 Long-term Outlook: Positive\n\nKey points to remember:\n• Market corrections are normal and healthy\n• Your asset allocation provides built-in protection\n• Historical data shows markets recover and grow\n• Your SIPs benefit from lower prices (rupee cost averaging)\n\nI'm monitoring the situation closely. No immediate action is needed, but I'm here to discuss any concerns.\n\nStay invested. Stay patient.\n\nBest regards,\n{{advisor_name}}`,
    variables: ['{{client_name}}', '{{portfolio_value}}', '{{advisor_name}}'],
    is_active: true,
  },
];

export function CampaignTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [channel, setChannel] = useState('email');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = extractItems<Template>(await api.get('/message_templates'));
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
    setLoading(false);
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{[^}]+\}\}/g) || [];
    return [...new Set(matches)];
  };

  const seedPrebuiltTemplates = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const toInsert = PREBUILT_TEMPLATES.map(t => ({ ...t, created_by: user.id }));
      await api.post('/message_templates/bulk', toInsert);
      toast.success(`${PREBUILT_TEMPLATES.length} pre-built templates added!`);
      fetchTemplates();
    } catch {
      // API client already shows toast on error
    }
    setSubmitting(false);
  };

  const handleSave = async () => {
    if (!name || !category || !content || !user?.id) {
      toast.error('Please fill in required fields');
      return;
    }
    setSubmitting(true);
    const variables = extractVariables(content + (subject || ''));
    const templateData = { name, category, channel, subject: subject || null, content, variables, is_active: isActive, created_by: user.id };

    try {
      if (editingTemplate) {
        await api.put(`/message_templates/${editingTemplate.id}`, templateData);
      } else {
        await api.post('/message_templates', templateData);
      }
      toast.success(`Template ${editingTemplate ? 'updated' : 'created'}`); setModalOpen(false); resetForm(); fetchTemplates();
    } catch {
      // API client already shows toast on error
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/message_templates/${id}`);
      toast.success('Template deleted'); fetchTemplates();
    } catch {
      // API client already shows toast on error
    }
  };

  const handleEdit = (t: Template) => {
    setEditingTemplate(t); setName(t.name); setCategory(t.category); setChannel(t.channel);
    setSubject(t.subject || ''); setContent(t.content); setIsActive(t.is_active); setModalOpen(true);
  };

  const handleDuplicate = async (t: Template) => {
    if (!user?.id) return;
    try {
      await api.post('/message_templates', {
        name: `${t.name} (Copy)`, category: t.category, channel: t.channel,
        subject: t.subject, content: t.content, variables: t.variables, is_active: true, created_by: user.id,
      });
      toast.success('Template duplicated'); fetchTemplates();
    } catch {
      // API client already shows toast on error
    }
  };

  const resetForm = () => {
    setEditingTemplate(null); setName(''); setCategory(''); setChannel('email');
    setSubject(''); setContent(''); setIsActive(true);
  };

  const filteredTemplates = activeCategory === 'all' ? templates : templates.filter(t => t.category === activeCategory);
  const getCategoryInfo = (val: string) => CATEGORIES.find(c => c.value === val);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Campaign Templates</h2>
          <Badge variant="secondary">{templates.length} templates</Badge>
        </div>
        <div className="flex items-center gap-2">
          {templates.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedPrebuiltTemplates} disabled={submitting} className="gap-1.5">
              <Download className="h-4 w-4" /> Load Pre-built Templates
            </Button>
          )}
          <Button size="sm" onClick={() => { resetForm(); setModalOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>
      </div>

      {/* Pre-built templates gallery (shown when empty) */}
      {templates.length === 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🚀 Get Started with Pre-built Templates</CardTitle>
            <CardDescription>Wealth advisor templates ready to use — click "Load Pre-built Templates" above to add all 7.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PREBUILT_TEMPLATES.map((t, i) => {
                const cat = getCategoryInfo(t.category);
                const Icon = cat?.icon || FileText;
                return (
                  <div key={i} className="p-3 rounded-lg border bg-background space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs capitalize">{t.channel}</Badge>
                      <Badge variant="secondary" className="text-xs">{t.variables.length} vars</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category filter */}
      {templates.length > 0 && (
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All</TabsTrigger>
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value} className="gap-1.5">
                <cat.icon className="h-3.5 w-3.5" />
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Template list */}
      {templates.length > 0 && (
        <div className="grid gap-3">
          {filteredTemplates.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No templates in this category.</CardContent></Card>
          ) : (
            filteredTemplates.map(t => {
              const cat = getCategoryInfo(t.category);
              const Icon = cat?.icon || FileText;
              return (
                <Card key={t.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{t.name}</p>
                            {!t.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">
                            {t.subject || t.content.substring(0, 80)}...
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs capitalize">{t.channel}</Badge>
                            <Badge variant="outline" className="text-xs">{cat?.label || t.category}</Badge>
                            {t.variables.length > 0 && (
                              <Badge variant="outline" className="text-xs">{t.variables.length} variables</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(t)} title="Duplicate">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(t.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Seed button at bottom when templates exist */}
      {templates.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={seedPrebuiltTemplates} disabled={submitting} className="gap-1.5">
            <Download className="h-4 w-4" /> Add Pre-built Templates
          </Button>
        </div>
      )}

      {/* Editor Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Monthly SIP Reminder" />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Channel *</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(ch => (
                      <SelectItem key={ch.value} value={ch.value}>
                        <div className="flex items-center gap-2"><ch.icon className="h-4 w-4" />{ch.label}</div>
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
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Your Monthly SIP Reminder" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message Content *</Label>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-muted-foreground mr-1">Insert:</span>
                  {VARIABLES.slice(0, 5).map(v => (
                    <Button key={v} variant="outline" size="sm" className="text-xs h-6 px-2" onClick={() => setContent(c => c + v)}>
                      {v.replace(/\{\{|\}\}/g, '')}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your message here. Use {{variable}} for personalization..." rows={8} />
              <p className="text-xs text-muted-foreground">
                Detected variables: {extractVariables(content + subject).join(', ') || 'None'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
