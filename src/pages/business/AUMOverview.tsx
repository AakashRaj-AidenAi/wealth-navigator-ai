import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientAUM } from '@/hooks/useBusiness';
import { formatCurrency } from '@/lib/currency';
import { Loader2, PieChart } from 'lucide-react';

const AUMOverview = () => {
  const { data: aumRecords, isLoading } = useClientAUM();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AUM Overview</h1>
          <p className="text-muted-foreground">Client-wise assets under management</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !aumRecords?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PieChart className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No AUM records yet. Add client AUM data to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Client AUM Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Equity</TableHead>
                    <TableHead className="text-right">Debt</TableHead>
                    <TableHead className="text-right">Other</TableHead>
                    <TableHead className="text-right">Total AUM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aumRecords.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.clients?.client_name ?? '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.equity_aum)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.debt_aum)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.other_assets)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(r.current_aum)}</TableCell>
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

export default AUMOverview;
