import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, Download, Calendar, Eye, Loader2,
  TrendingUp, PieChart, Calculator, Target, Receipt
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Report {
  id: string;
  report_type: string;
  title: string;
  description: string | null;
  created_at: string;
  data: any;
}

const reportIcons: Record<string, React.ElementType> = {
  compliance: FileText,
  analytics: TrendingUp,
  performance: TrendingUp,
  risk: Calculator,
  monthly_portfolio: PieChart,
  quarterly_performance: TrendingUp,
  capital_gains: Calculator,
  tax_pnl: Receipt,
  goal_progress: Target
};

interface RecentReportsProps {
  limit?: number;
  showHeader?: boolean;
  onRefresh?: () => void;
}

export const RecentReports = ({ limit = 10, showHeader = true, onRefresh }: RecentReportsProps) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (data) {
      setReports(data);
    }
    setLoading(false);
  };

  const handleDownload = (report: Report) => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; }
          h1 { color: #1a1a1a; }
          .meta { color: #666; margin-bottom: 20px; }
          .data { background: #f5f5f5; padding: 20px; border-radius: 8px; }
          pre { white-space: pre-wrap; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <div class="meta">
          <p>Type: ${report.report_type}</p>
          <p>Generated: ${new Date(report.created_at).toLocaleString()}</p>
          ${report.description ? `<p>Description: ${report.description}</p>` : ''}
        </div>
        <div class="data">
          <h3>Report Data</h3>
          <pre>${JSON.stringify(report.data, null, 2)}</pre>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const getReportIcon = (reportType: string) => {
    const Icon = reportIcons[reportType] || FileText;
    return Icon;
  };

  if (loading) {
    return (
      <Card className="glass">
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Reports
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Reports
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No reports generated yet</p>
            <p className="text-sm text-muted-foreground">Create your first report using the workflow above</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {reports.map((report) => {
                const Icon = getReportIcon(report.report_type);
                return (
                  <div
                    key={report.id}
                    className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{report.title}</h4>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {report.report_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {report.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {report.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownload(report)}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
