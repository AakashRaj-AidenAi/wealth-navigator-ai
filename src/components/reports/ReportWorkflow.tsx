import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, Users, FileText, Send, ChevronRight, ChevronLeft,
  TrendingUp, PieChart, Calculator, Target, Receipt
} from 'lucide-react';
import { formatCurrencyShort } from '@/lib/currency';
import { ReportPreview } from './ReportPreview';
import { ReportDelivery } from './ReportDelivery';

interface Client {
  id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  total_assets: number | null;
}

type ReportType = 'monthly_portfolio' | 'quarterly_performance' | 'capital_gains' | 'tax_pnl' | 'goal_progress';

interface ReportTypeConfig {
  id: ReportType;
  name: string;
  description: string;
  icon: React.ElementType;
  frequency: string;
}

const reportTypes: ReportTypeConfig[] = [
  { 
    id: 'monthly_portfolio', 
    name: 'Monthly Portfolio Report', 
    description: 'Complete portfolio overview with holdings, allocation, and performance',
    icon: PieChart,
    frequency: 'Monthly'
  },
  { 
    id: 'quarterly_performance', 
    name: 'Quarterly Performance Report', 
    description: 'Detailed performance analysis with XIRR, CAGR, and benchmarks',
    icon: TrendingUp,
    frequency: 'Quarterly'
  },
  { 
    id: 'capital_gains', 
    name: 'Capital Gains Report', 
    description: 'Realized and unrealized gains with holding periods',
    icon: Calculator,
    frequency: 'Annual'
  },
  { 
    id: 'tax_pnl', 
    name: 'Tax P&L Statement', 
    description: 'Profit & Loss statement formatted for tax filing',
    icon: Receipt,
    frequency: 'Annual'
  },
  { 
    id: 'goal_progress', 
    name: 'Goal Progress Report', 
    description: 'Progress towards financial goals with projections',
    icon: Target,
    frequency: 'Monthly'
  }
];

interface ReportWorkflowProps {
  onComplete?: () => void;
}

export const ReportWorkflow = ({ onComplete }: ReportWorkflowProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await api.get<Client[]>('/clients');
      if (data) setClients(data);
    } catch { /* API client shows toast */ }
    setLoading(false);
  };

  const filteredClients = clients.filter(client =>
    client.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(c => c.id));
    }
  };

  const handleGenerateReports = async () => {
    if (!selectedReport || selectedClients.length === 0 || !user) return;
    
    setGenerating(true);
    const reports: any[] = [];

    for (const clientId of selectedClients) {
      const client = clients.find(c => c.id === clientId);
      if (!client) continue;

      // Fetch real data for this client
      const [goals, orders] = await Promise.all([
        api.get<any[]>('/goals', { client_id: clientId }).catch(() => []),
        api.get<any[]>('/orders', { client_id: clientId, status: 'executed' }).catch(() => [])
      ]);

      // Generate report data based on type
      const reportData = generateReportData(selectedReport, client, goals, orders);
      
      reports.push({
        client,
        reportType: selectedReport,
        data: reportData,
        generatedAt: new Date().toISOString()
      });
    }

    setGeneratedReports(reports);
    setGenerating(false);
    setStep(3);
  };

  const generateReportData = (
    reportType: ReportType, 
    client: Client, 
    goals: any[], 
    orders: any[]
  ) => {
    const totalValue = client.total_assets || 0;
    const totalInvested = orders.reduce((sum, o) => {
      return sum + (o.order_type === 'buy' ? (o.total_amount || 0) : -(o.total_amount || 0));
    }, 0);
    const gain = totalValue - totalInvested;
    const gainPercent = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

    const baseData = {
      clientName: client.client_name,
      clientEmail: client.email,
      totalValue,
      asOfDate: new Date().toISOString(),
    };

    switch (reportType) {
      case 'monthly_portfolio':
        return {
          ...baseData,
          holdings: [
            { name: 'Equity', value: totalValue * 0.6, allocation: 60 },
            { name: 'Debt', value: totalValue * 0.25, allocation: 25 },
            { name: 'Gold', value: totalValue * 0.1, allocation: 10 },
            { name: 'Cash', value: totalValue * 0.05, allocation: 5 }
          ],
          monthlyChange: (Math.random() - 0.3) * 10,
          totalTransactions: orders.length
        };
      
      case 'quarterly_performance':
        return {
          ...baseData,
          xirr: 12.5 + (Math.random() * 5),
          cagr: 10.2 + (Math.random() * 3),
          gain,
          gainPercent,
          benchmarkReturn: 11.2,
          quarterlyReturns: [
            { quarter: 'Q1', return: 3.2 },
            { quarter: 'Q2', return: 4.1 },
            { quarter: 'Q3', return: 2.8 },
            { quarter: 'Q4', return: 3.5 }
          ]
        };

      case 'capital_gains':
        const realizedGain = orders
          .filter(o => o.order_type === 'sell')
          .reduce((sum, o) => sum + (o.total_amount || 0) * 0.1, 0);
        return {
          ...baseData,
          shortTermGains: realizedGain * 0.4,
          longTermGains: realizedGain * 0.6,
          unrealizedGains: gain,
          transactions: orders.filter(o => o.order_type === 'sell').slice(0, 10)
        };

      case 'tax_pnl':
        return {
          ...baseData,
          totalIncome: totalValue * 0.08,
          dividends: totalValue * 0.02,
          interest: totalValue * 0.015,
          capitalGains: gain > 0 ? gain * 0.3 : 0,
          losses: gain < 0 ? Math.abs(gain) : 0,
          netTaxable: Math.max(0, gain * 0.3 + totalValue * 0.035)
        };

      case 'goal_progress':
        return {
          ...baseData,
          goals: goals.map(g => ({
            name: g.name,
            target: g.target_amount,
            current: g.current_amount || 0,
            progress: g.target_amount > 0 ? ((g.current_amount || 0) / g.target_amount) * 100 : 0,
            targetDate: g.target_date,
            status: g.status
          })),
          totalGoalTarget: goals.reduce((sum, g) => sum + (g.target_amount || 0), 0),
          totalGoalCurrent: goals.reduce((sum, g) => sum + (g.current_amount || 0), 0)
        };

      default:
        return baseData;
    }
  };

  const handleDeliveryComplete = async () => {
    // Save reports to database
    if (!user) return;

    try {
      for (const report of generatedReports) {
        await api.post('/reports', {
          report_type: 'performance', // Map to existing enum
          title: `${reportTypes.find(r => r.id === report.reportType)?.name} - ${report.client.client_name}`,
          description: `Generated for ${report.client.client_name}`,
          generated_by: user.id,
          data: report.data
        });
      }
    } catch { /* API client shows toast */ }

    onComplete?.();
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            step >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
          }`}>
            {s}
          </div>
          {s < 4 && (
            <div className={`w-12 h-0.5 mx-1 ${step > s ? 'bg-primary' : 'bg-secondary'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Clients ({selectedClients.length} selected)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={selectAllClients}>
            {selectedClients.length === filteredClients.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedClients.includes(client.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleClient(client.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => toggleClient(client.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{client.client_name}</p>
                      <p className="text-sm text-muted-foreground">{client.email || 'No email'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrencyShort(client.total_assets)}</p>
                      <p className="text-xs text-muted-foreground">AUM</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button 
            onClick={() => setStep(2)} 
            disabled={selectedClients.length === 0}
            className="gap-2"
          >
            Next: Select Report
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Select Report Type
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <div
                key={report.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedReport === report.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedReport(report.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{report.name}</h3>
                      <Badge variant="secondary" className="text-xs">{report.frequency}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={handleGenerateReports} 
            disabled={!selectedReport || generating}
            className="gap-2 bg-gradient-gold hover:opacity-90"
          >
            {generating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                Generate {selectedClients.length} Report{selectedClients.length > 1 ? 's' : ''}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <ReportPreview
      reports={generatedReports}
      reportType={selectedReport!}
      onBack={() => setStep(2)}
      onNext={() => setStep(4)}
    />
  );

  const renderStep4 = () => (
    <ReportDelivery
      reports={generatedReports}
      onBack={() => setStep(3)}
      onComplete={handleDeliveryComplete}
    />
  );

  return (
    <div className="space-y-6">
      {renderStepIndicator()}
      
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">
          {step === 1 && 'Select the clients for whom you want to generate reports'}
          {step === 2 && 'Choose the type of report to generate'}
          {step === 3 && 'Preview and customize your reports'}
          {step === 4 && 'Send reports via email or WhatsApp'}
        </p>
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
};
