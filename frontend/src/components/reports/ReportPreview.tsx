import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, ChevronRight, Download, Eye, Upload,
  TrendingUp, PieChart, Calculator, Target, Receipt,
  Building2
} from 'lucide-react';
import { formatCurrency, formatCurrencyShort } from '@/lib/currency';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const reportTypeLabels: Record<string, { name: string; icon: React.ElementType }> = {
  monthly_portfolio: { name: 'Monthly Portfolio Report', icon: PieChart },
  quarterly_performance: { name: 'Quarterly Performance Report', icon: TrendingUp },
  capital_gains: { name: 'Capital Gains Report', icon: Calculator },
  tax_pnl: { name: 'Tax P&L Statement', icon: Receipt },
  goal_progress: { name: 'Goal Progress Report', icon: Target }
};

interface ReportPreviewProps {
  reports: any[];
  reportType: string;
  onBack: () => void;
  onNext: () => void;
}

interface BrandingConfig {
  firmName: string;
  logoUrl: string | null;
  tagline: string;
  primaryColor: string;
}

export const ReportPreview = ({ reports, reportType, onBack, onNext }: ReportPreviewProps) => {
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);
  const [branding, setBranding] = useState<BrandingConfig>({
    firmName: 'WealthOS Advisory',
    logoUrl: null,
    tagline: 'Your Trusted Wealth Partner',
    primaryColor: '#C9A962'
  });

  const currentReport = reports[selectedReportIndex];
  const reportConfig = reportTypeLabels[reportType];
  const Icon = reportConfig?.icon || PieChart;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBranding(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadPDF = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportContent = generatePrintableHTML(currentReport, reportType, branding);
    printWindow.document.write(reportContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleDownloadAllPDFs = () => {
    reports.forEach((report, index) => {
      setTimeout(() => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const reportContent = generatePrintableHTML(report, reportType, branding);
        printWindow.document.write(reportContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }, index * 500);
    });
  };

  const renderReportContent = () => {
    const data = currentReport.data;

    switch (reportType) {
      case 'monthly_portfolio':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                <p className="text-2xl font-bold">{formatCurrency(data.totalValue)}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">Monthly Change</p>
                <p className={`text-2xl font-bold ${data.monthlyChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {data.monthlyChange >= 0 ? '+' : ''}{data.monthlyChange.toFixed(2)}%
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Asset Allocation</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={data.holdings}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, allocation }) => `${name}: ${allocation}%`}
                      >
                        {data.holdings.map((_, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Holdings Breakdown</h4>
                <div className="space-y-2">
                  {data.holdings.map((holding: any, index: number) => (
                    <div key={holding.name} className="flex items-center justify-between p-2 rounded bg-secondary/20">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm">{holding.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrencyShort(holding.value)}</p>
                        <p className="text-xs text-muted-foreground">{holding.allocation}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'quarterly_performance':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">XIRR</p>
                <p className="text-xl font-bold text-success">{data.xirr.toFixed(2)}%</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">CAGR</p>
                <p className="text-xl font-bold text-success">{data.cagr.toFixed(2)}%</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">Total Gain</p>
                <p className={`text-xl font-bold ${data.gain >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrencyShort(data.gain)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">Benchmark</p>
                <p className="text-xl font-bold">{data.benchmarkReturn}%</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Quarterly Returns</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.quarterlyReturns}>
                    <XAxis dataKey="quarter" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="return" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case 'capital_gains':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">Short-Term Gains</p>
                <p className="text-xl font-bold">{formatCurrency(data.shortTermGains)}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">Long-Term Gains</p>
                <p className="text-xl font-bold text-success">{formatCurrency(data.longTermGains)}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">Unrealized Gains</p>
                <p className={`text-xl font-bold ${data.unrealizedGains >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(data.unrealizedGains)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Recent Transactions</h4>
              <div className="space-y-2">
                {data.transactions?.length > 0 ? (
                  data.transactions.map((tx: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded bg-secondary/20">
                      <div>
                        <p className="font-medium">{tx.symbol}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.executed_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(tx.total_amount)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No transactions to display</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'tax_pnl':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Income</h4>
                <div className="p-3 rounded bg-secondary/20 flex justify-between">
                  <span>Dividends</span>
                  <span className="font-medium">{formatCurrency(data.dividends)}</span>
                </div>
                <div className="p-3 rounded bg-secondary/20 flex justify-between">
                  <span>Interest</span>
                  <span className="font-medium">{formatCurrency(data.interest)}</span>
                </div>
                <div className="p-3 rounded bg-secondary/20 flex justify-between">
                  <span>Capital Gains</span>
                  <span className="font-medium">{formatCurrency(data.capitalGains)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Deductions</h4>
                <div className="p-3 rounded bg-secondary/20 flex justify-between">
                  <span>Capital Losses</span>
                  <span className="font-medium text-destructive">-{formatCurrency(data.losses)}</span>
                </div>
                <div className="p-3 rounded bg-primary/10 border border-primary flex justify-between mt-6">
                  <span className="font-medium">Net Taxable</span>
                  <span className="font-bold">{formatCurrency(data.netTaxable)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'goal_progress':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">Total Goal Target</p>
                <p className="text-xl font-bold">{formatCurrency(data.totalGoalTarget)}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">Current Progress</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(data.totalGoalCurrent)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Individual Goals</h4>
              {data.goals?.length > 0 ? (
                data.goals.map((goal: any, i: number) => (
                  <div key={i} className="p-4 rounded-lg bg-secondary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{goal.name}</span>
                      <Badge variant={goal.progress >= 75 ? 'default' : goal.progress >= 50 ? 'secondary' : 'destructive'}>
                        {goal.progress.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>{formatCurrencyShort(goal.current)} saved</span>
                      <span>{formatCurrencyShort(goal.target)} target</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No goals defined</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Report List */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm">Generated Reports ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {reports.map((report, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedReportIndex === index 
                      ? 'bg-primary/10 border border-primary' 
                      : 'bg-secondary/30 hover:bg-secondary/50'
                  }`}
                  onClick={() => setSelectedReportIndex(index)}
                >
                  <p className="font-medium text-sm">{report.client.client_name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrencyShort(report.client.total_assets)} AUM</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <Card className="glass lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {reportConfig?.name}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              {reports.length > 1 && (
                <Button variant="outline" size="sm" onClick={handleDownloadAllPDFs} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview">
            <TabsList className="mb-4">
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="branding" className="gap-2">
                <Building2 className="h-4 w-4" />
                Branding
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview">
              <div className="border rounded-lg p-6 bg-background">
                {/* Report Header */}
                <div className="flex items-center justify-between border-b pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    {branding.logoUrl ? (
                      <img src={branding.logoUrl} alt="Logo" className="h-12 w-auto" />
                    ) : (
                      <div className="h-12 w-12 rounded bg-primary/20 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-lg">{branding.firmName}</h2>
                      <p className="text-sm text-muted-foreground">{branding.tagline}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Generated on</p>
                    <p className="font-medium">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Client Info */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold">{currentReport.client.client_name}</h3>
                  <p className="text-muted-foreground">{currentReport.client.email}</p>
                </div>

                {/* Report Content */}
                {renderReportContent()}
              </div>
            </TabsContent>

            <TabsContent value="branding">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Firm Name</Label>
                    <Input
                      value={branding.firmName}
                      onChange={(e) => setBranding(prev => ({ ...prev, firmName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input
                      value={branding.tagline}
                      onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {branding.logoUrl && (
                      <img src={branding.logoUrl} alt="Logo preview" className="h-12 w-auto" />
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-secondary/50 transition-colors">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Logo</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="col-span-3 flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2 bg-gradient-gold hover:opacity-90">
          Next: Send Reports
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

function generatePrintableHTML(report: any, reportType: string, branding: any) {
  const data = report.data;
  const reportName = reportTypeLabels[reportType]?.name || 'Report';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportName} - ${report.client.client_name}</title>
      <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${branding.primaryColor}; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { display: flex; align-items: center; gap: 15px; }
        .logo-placeholder { width: 60px; height: 60px; background: ${branding.primaryColor}20; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .firm-name { font-size: 24px; font-weight: bold; }
        .tagline { color: #666; }
        .client-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
        .section { margin: 30px 0; }
        .section-title { font-size: 16px; font-weight: 600; margin-bottom: 15px; }
        .metric { background: #f5f5f5; padding: 15px; border-radius: 8px; }
        .metric-label { font-size: 12px; color: #666; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          ${branding.logoUrl ? `<img src="${branding.logoUrl}" style="height: 60px;">` : '<div class="logo-placeholder">📊</div>'}
          <div>
            <div class="firm-name">${branding.firmName}</div>
            <div class="tagline">${branding.tagline}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="color: #666;">Generated on</div>
          <div style="font-weight: 600;">${new Date().toLocaleDateString()}</div>
        </div>
      </div>
      
      <div class="client-name">${report.client.client_name}</div>
      <div style="color: #666;">${report.client.email || ''}</div>
      
      <div class="section">
        <h2>${reportName}</h2>
        <div class="grid">
          <div class="metric">
            <div class="metric-label">Portfolio Value</div>
            <div class="metric-value">$${(data.totalValue || 0).toLocaleString()}</div>
          </div>
          ${reportType === 'quarterly_performance' ? `
            <div class="metric">
              <div class="metric-label">XIRR</div>
              <div class="metric-value" style="color: green;">${(data.xirr || 0).toFixed(2)}%</div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="footer">
        <p>This report was generated by ${branding.firmName}. For any queries, please contact your advisor.</p>
        <p>Confidential - For ${report.client.client_name} only</p>
      </div>
    </body>
    </html>
  `;
}
