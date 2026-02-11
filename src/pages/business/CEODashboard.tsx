import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, IndianRupee, PieChart, Wallet, FileText, LineChart } from 'lucide-react';

const CEODashboard = () => {
  const cards = [
    { title: 'Total AUM', value: '—', icon: TrendingUp, description: 'Across all clients' },
    { title: 'Monthly Revenue', value: '—', icon: IndianRupee, description: 'Current month' },
    { title: 'Active Clients', value: '—', icon: Users, description: 'With AUM > 0' },
    { title: 'Pending Invoices', value: '—', icon: BarChart3, description: 'Awaiting payment' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CEO Dashboard</h1>
          <p className="text-muted-foreground">High-level business overview</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Analytics will appear here once data is added.</p>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Quick Access</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'AUM Overview', href: '/business/aum', icon: PieChart },
              { label: 'Revenue', href: '/business/revenue', icon: IndianRupee },
              { label: 'Commissions', href: '/business/commissions', icon: Wallet },
              { label: 'Invoices', href: '/business/invoices', icon: FileText },
              { label: 'Profitability', href: '/business/profitability', icon: LineChart },
            ].map((item) => (
              <Link key={item.href} to={item.href}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-3 py-4">
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CEODashboard;
