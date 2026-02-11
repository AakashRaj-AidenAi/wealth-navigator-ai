import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useInvoices } from '@/hooks/useBusiness';
import { formatCurrency } from '@/lib/currency';
import { Loader2, FileText } from 'lucide-react';

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/10 text-blue-500',
  paid: 'bg-green-500/10 text-green-500',
  overdue: 'bg-destructive/10 text-destructive',
};

const Invoices = () => {
  const { data: records, isLoading } = useInvoices();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage client invoices and billing</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !records?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No invoices yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>All Invoices</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.invoice_number ?? r.id.slice(0, 8)}</TableCell>
                      <TableCell>{r.clients?.client_name ?? '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.gst)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(r.total_amount)}</TableCell>
                      <TableCell>{r.due_date ?? '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusColor[r.status] ?? ''}>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Invoices;
