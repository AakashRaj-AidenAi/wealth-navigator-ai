import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronLeft, Send, Mail, MessageCircle, Calendar, Clock, 
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

interface ReportDeliveryProps {
  reports: any[];
  onBack: () => void;
  onComplete: () => void;
}

interface DeliveryStatus {
  clientId: string;
  email: 'pending' | 'sending' | 'sent' | 'failed';
  whatsapp: 'pending' | 'sending' | 'sent' | 'failed';
}

export const ReportDelivery = ({ reports, onBack, onComplete }: ReportDeliveryProps) => {
  const { toast } = useToast();
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('monthly');
  const [scheduleDay, setScheduleDay] = useState('1');
  const [emailSubject, setEmailSubject] = useState('Your Portfolio Report is Ready');
  const [emailMessage, setEmailMessage] = useState(
    'Dear {client_name},\n\nPlease find attached your latest portfolio report. If you have any questions, feel free to reach out.\n\nBest regards,\nYour Advisor'
  );
  const [selectedClients, setSelectedClients] = useState<string[]>(reports.map(r => r.client.id));
  const [sending, setSending] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus[]>([]);

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSend = async () => {
    if (selectedClients.length === 0) {
      toast({
        title: 'No recipients selected',
        description: 'Please select at least one client to send reports to.',
        variant: 'destructive'
      });
      return;
    }

    if (!sendEmail && !sendWhatsApp) {
      toast({
        title: 'No delivery method selected',
        description: 'Please select at least one delivery method (Email or WhatsApp).',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    
    // Initialize delivery status
    const initialStatus: DeliveryStatus[] = selectedClients.map(clientId => ({
      clientId,
      email: sendEmail ? 'pending' : 'sent',
      whatsapp: sendWhatsApp ? 'pending' : 'sent'
    }));
    setDeliveryStatus(initialStatus);

    // Simulate sending process
    for (let i = 0; i < selectedClients.length; i++) {
      const clientId = selectedClients[i];
      
      // Update to sending
      setDeliveryStatus(prev => prev.map(s => 
        s.clientId === clientId 
          ? { ...s, email: sendEmail ? 'sending' : s.email, whatsapp: sendWhatsApp ? 'sending' : s.whatsapp }
          : s
      ));

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

      // Update to sent (with small chance of failure for realism)
      const emailSuccess = Math.random() > 0.05;
      const whatsappSuccess = Math.random() > 0.1;

      setDeliveryStatus(prev => prev.map(s => 
        s.clientId === clientId 
          ? { 
              ...s, 
              email: sendEmail ? (emailSuccess ? 'sent' : 'failed') : s.email,
              whatsapp: sendWhatsApp ? (whatsappSuccess ? 'sent' : 'failed') : s.whatsapp
            }
          : s
      ));
    }

    setSending(false);

    const successCount = deliveryStatus.filter(s => 
      (s.email === 'sent' || !sendEmail) && (s.whatsapp === 'sent' || !sendWhatsApp)
    ).length;

    toast({
      title: 'Reports Sent',
      description: `Successfully sent ${successCount} of ${selectedClients.length} reports.`
    });

    if (scheduleEnabled) {
      toast({
        title: 'Schedule Created',
        description: `Reports will be auto-sent ${scheduleFrequency} on day ${scheduleDay}.`
      });
    }

    setTimeout(onComplete, 1000);
  };

  const getStatusIcon = (status: 'pending' | 'sending' | 'sent' | 'failed') => {
    switch (status) {
      case 'sending':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-secondary" />;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Recipients */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Recipients ({selectedClients.length})</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedClients(
                selectedClients.length === reports.length ? [] : reports.map(r => r.client.id)
              )}
            >
              {selectedClients.length === reports.length ? 'Deselect All' : 'Select All'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {reports.map((report) => {
                const status = deliveryStatus.find(s => s.clientId === report.client.id);
                const isSelected = selectedClients.includes(report.client.id);
                
                return (
                  <div
                    key={report.client.id}
                    className={`p-3 rounded-lg transition-colors ${
                      isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleClient(report.client.id)}
                        disabled={sending}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{report.client.client_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{report.client.email || 'No email'}</p>
                      </div>
                      {status && (
                        <div className="flex items-center gap-2">
                          {sendEmail && (
                            <div className="flex items-center gap-1" title="Email">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {getStatusIcon(status.email)}
                            </div>
                          )}
                          {sendWhatsApp && (
                            <div className="flex items-center gap-1" title="WhatsApp">
                              <MessageCircle className="h-3 w-3 text-muted-foreground" />
                              {getStatusIcon(status.whatsapp)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delivery Options */}
      <Card className="glass lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Delivery Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery Methods */}
          <div className="grid grid-cols-2 gap-4">
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                sendEmail ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setSendEmail(!sendEmail)}
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  sendEmail ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}>
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">Send PDF via email</p>
                </div>
              </div>
            </div>
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                sendWhatsApp ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setSendWhatsApp(!sendWhatsApp)}
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  sendWhatsApp ? 'bg-success text-success-foreground' : 'bg-secondary'
                }`}>
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">Send via WhatsApp</p>
                </div>
              </div>
            </div>
          </div>

          {/* Email Customization */}
          {sendEmail && (
            <div className="space-y-4 p-4 rounded-lg bg-secondary/20">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Settings
              </h4>
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                />
              </div>
              <div className="space-y-2">
                <Label>Message Body</Label>
                <Textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Email message..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{client_name}'} to insert the client's name
                </p>
              </div>
            </div>
          )}

          {/* Scheduling */}
          <div className="p-4 rounded-lg bg-secondary/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Schedule Auto-Send</span>
              </div>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
              />
            </div>
            
            {scheduleEnabled && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Select value={scheduleDay} onValueChange={setScheduleDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 5, 10, 15, 20, 25].map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}{day === 1 ? 'st' : day === 5 ? 'th' : 'th'} of month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-medium mb-2">Delivery Summary</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {selectedClients.length} recipient{selectedClients.length !== 1 ? 's' : ''}
              </Badge>
              {sendEmail && <Badge>Email</Badge>}
              {sendWhatsApp && <Badge className="bg-success">WhatsApp</Badge>}
              {scheduleEnabled && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {scheduleFrequency}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="col-span-3 flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={sending} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleSend} 
          disabled={sending || selectedClients.length === 0}
          className="gap-2 bg-gradient-gold hover:opacity-90"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send {selectedClients.length} Report{selectedClients.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
