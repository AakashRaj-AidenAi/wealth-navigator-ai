import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRevenueRecords } from '@/hooks/useBusiness';
import { formatCurrency } from '@/lib/currency';
import { Loader2, IndianRupee } from 'lucide-react';

const Revenue = () => {
  const { data: records, isLoading } = useRevenueRecords();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
          <p className="text-muted-foreground">Track advisory fees and commissions</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !records?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IndianRupee className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No revenue records yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Revenue Records</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Recurring</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.clients?.client_name ?? '—'}</TableCell>
                      <TableCell>{r.product_type}</TableCell>
                      <TableCell><Badge variant="outline">{r.revenue_type}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(r.amount)}</TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell>{r.recurring ? 'Yes' : 'No'}</TableCell>
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

export default Revenue;
