import { useState, useEffect } from 'react';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Mail, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CommunicationLog {
  id: string;
  client_id: string;
  communication_type: string;
  direction: string;
  subject: string | null;
  content: string | null;
  sent_at: string;
  status: string | null;
  attachments: any | null;
  clients?: { client_name: string };
}

interface CommunicationHistoryProps {
  clientId?: string;
  limit?: number;
  showClient?: boolean;
}

export const CommunicationHistory = ({ clientId, limit = 50, showClient = true }: CommunicationHistoryProps) => {
  const { role } = useAuth();
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<CommunicationLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [clientId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit };
      if (clientId) params.client_id = clientId;
      const data = extractItems<CommunicationLog>(await api.get('/communication_logs', params));

      // Fetch client names if needed
      if (showClient && !clientId) {
        const clientIds = [...new Set(data.map(l => l.client_id))];
        const clientRes = await api.get('/clients', { ids: clientIds.join(',') });
        const clientData = extractItems<{ id: string; client_name: string }>(clientRes);
        const clientMap = new Map(clientData.map(c => [c.id, c.client_name]));

        const enrichedData = data.map(log => ({
          ...log,
          clients: { client_name: clientMap.get(log.client_id) || 'Unknown' }
        }));

        setLogs(enrichedData);
      } else {
        setLogs(data);
      }
    } catch {
      // API client already shows toast on error
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="outline" className="text-success border-success">Delivered</Badge>;
      case 'opened':
        return <Badge className="bg-primary">Opened</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Sent</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-secondary/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No communication history found
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    {log.communication_type === 'email' ? (
                      <Mail className="h-4 w-4 text-primary" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {log.subject || log.communication_type.charAt(0).toUpperCase() + log.communication_type.slice(1)}
                      </p>
                      {log.direction === 'outbound' ? (
                        <ArrowUpRight className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowDownLeft className="h-3 w-3 text-success" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {showClient && log.clients && `${log.clients.client_name} • `}
                      {format(new Date(log.sent_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(log.status)}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog?.communication_type === 'email' ? (
                <Mail className="h-5 w-5" />
              ) : (
                <MessageSquare className="h-5 w-5" />
              )}
              {selectedLog?.subject || 'Message Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium capitalize">{selectedLog.communication_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Direction:</span>
                  <p className="font-medium capitalize">{selectedLog.direction}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sent:</span>
                  <p className="font-medium">{format(new Date(selectedLog.sent_at), 'PPpp')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>{getStatusBadge(selectedLog.status)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <span className="text-sm text-muted-foreground">Content:</span>
                <p className="mt-2 text-sm whitespace-pre-wrap bg-secondary/20 rounded-lg p-3">
                  {selectedLog.content || 'No content'}
                </p>
              </div>

              {selectedLog.attachments && Array.isArray(selectedLog.attachments) && selectedLog.attachments.length > 0 && (
                <div className="border-t pt-4">
                  <span className="text-sm text-muted-foreground">Attachments:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedLog.attachments.map((att: any, idx: number) => (
                      <Badge key={idx} variant="secondary">{att.name || att.file_name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
