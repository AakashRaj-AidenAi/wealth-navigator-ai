import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Globe, BarChart3, FileText, Bell } from 'lucide-react';

const marketInsights = [
  { region: 'US Markets', index: 'S&P 500', value: '4,892.50', change: '+1.2%', positive: true },
  { region: 'European Markets', index: 'STOXX 600', value: '478.32', change: '-0.3%', positive: false },
  { region: 'Asian Markets', index: 'Nikkei 225', value: '36,158.02', change: '+2.1%', positive: true },
  { region: 'Emerging Markets', index: 'MSCI EM', value: '1,023.45', change: '+0.8%', positive: true },
];

const researchNotes = [
  { title: 'Q1 2025 Market Outlook', author: 'CIO Team', date: 'Jan 28, 2025', category: 'Strategy' },
  { title: 'Tech Sector Analysis: AI Investment Opportunities', author: 'Research Desk', date: 'Jan 25, 2025', category: 'Sector' },
  { title: 'Fixed Income Strategy Update', author: 'Fixed Income Team', date: 'Jan 22, 2025', category: 'Fixed Income' },
  { title: 'ESG Investing: 2025 Trends', author: 'ESG Research', date: 'Jan 20, 2025', category: 'ESG' },
];

const CIODesk = () => {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">CIO Desk</h1>
            <p className="text-muted-foreground">
              Market insights, research, and investment strategy from the Chief Investment Office
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Bell className="h-4 w-4" />
            Subscribe to Updates
          </Button>
        </div>

        {/* Market Overview */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Global Market Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketInsights.map((market) => (
              <div key={market.index} className="bg-secondary/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground">{market.region}</p>
                <p className="font-medium mt-1">{market.index}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-semibold">{market.value}</span>
                  <span className={`flex items-center gap-1 text-sm ${market.positive ? 'text-success' : 'text-destructive'}`}>
                    {market.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {market.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Research Notes */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Latest Research</h2>
              </div>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="space-y-3">
              {researchNotes.map((note, i) => (
                <div key={i} className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-sm">{note.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{note.author} • {note.date}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">{note.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Investment Themes */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Investment Themes 2025</h2>
            </div>
            <div className="space-y-4">
              {[
                { theme: 'AI & Technology Infrastructure', conviction: 'High', weight: 85 },
                { theme: 'Healthcare Innovation', conviction: 'Medium-High', weight: 70 },
                { theme: 'Clean Energy Transition', conviction: 'Medium', weight: 60 },
                { theme: 'Emerging Market Growth', conviction: 'Medium', weight: 55 },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{item.theme}</span>
                    <span className="text-muted-foreground">{item.conviction}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-chart-1 rounded-full transition-all"
                      style={{ width: `${item.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CIODesk;
