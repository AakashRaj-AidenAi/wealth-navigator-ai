import { useCampaigns } from '@/components/campaigns/create/useCampaigns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Mail, MessageSquare, Bell, Send, Clock, FileEdit, CheckCircle, XCircle } from 'lucide-react';

const channelIcons: Record<string, React.ElementType> = {
  email: Mail,
  whatsapp: MessageSquare,
  in_app: Bell,
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  sending: { label: 'Sending', variant: 'default' },
  sent: { label: 'Sent', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export const CampaignHistory = () => {
  const { data: campaigns = [], isLoading } = useCampaigns();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-secondary/30 rounded w-1/3" />
            <div className="h-64 bg-secondary/30 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!campaigns.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign History</CardTitle>
          <CardDescription>No campaigns yet. Create your first campaign to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground">No campaigns found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign History</CardTitle>
        <CardDescription>{campaigns.length} campaigns total</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Recipients</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead className="text-right">Failed</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map(c => {
              const ChannelIcon = channelIcons[c.channel] || Mail;
              const status = statusConfig[c.status] || statusConfig.draft;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{c.name}</div>
                      {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize text-sm">{c.channel.replace('_', '-')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{c.total_recipients}</TableCell>
                  <TableCell className="text-right">{c.sent_count}</TableCell>
                  <TableCell className="text-right">{c.failed_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.sent_at
                      ? format(new Date(c.sent_at), 'dd MMM yyyy, HH:mm')
                      : c.scheduled_at
                        ? format(new Date(c.scheduled_at), 'dd MMM yyyy, HH:mm')
                        : format(new Date(c.created_at), 'dd MMM yyyy')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
