import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const Profitability = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profitability</h1>
          <p className="text-muted-foreground">Analyze margins and cost-to-serve</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Profitability analytics will appear here once revenue and commission data is populated.</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Profitability;
