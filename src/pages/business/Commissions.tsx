import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCommissionRecords } from '@/hooks/useBusiness';
import { formatCurrency } from '@/lib/currency';
import { Loader2, Wallet } from 'lucide-react';

const Commissions = () => {
  const { data: records, isLoading } = useCommissionRecords();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
          <p className="text-muted-foreground">Upfront and trail commission tracking</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !records?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No commission records yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Commission Records</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Upfront</TableHead>
                    <TableHead className="text-right">Trail</TableHead>
                    <TableHead>Payout Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.clients?.client_name ?? '—'}</TableCell>
                      <TableCell>{r.product_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.upfront_commission)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.trail_commission)}</TableCell>
                      <TableCell>{r.payout_date ?? '—'}</TableCell>
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

export default Commissions;
