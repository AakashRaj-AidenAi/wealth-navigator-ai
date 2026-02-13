import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, FileCheck, BarChart3, TrendingUp, Shield } from 'lucide-react';

interface GenerateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultType?: 'compliance' | 'analytics' | 'performance' | 'risk';
}

const reportTypeConfig = {
  compliance: { icon: Shield, label: 'Compliance Report', description: 'Regulatory compliance and audit trail' },
  analytics: { icon: BarChart3, label: 'Analytics Report', description: 'Data analytics and insights' },
  performance: { icon: TrendingUp, label: 'Performance Report', description: 'Portfolio and investment performance' },
  risk: { icon: FileCheck, label: 'Risk Report', description: 'Risk assessment and analysis' }
};

export const GenerateReportModal = ({ open, onOpenChange, onSuccess, defaultType = 'compliance' }: GenerateReportModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [reportType, setReportType] = useState<'compliance' | 'analytics' | 'performance' | 'risk'>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to generate a report.',
        variant: 'destructive'
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Report title is required.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    // Generate mock report data based on type
    const reportData = {
      generated_at: new Date().toISOString(),
      type: reportType,
      summary: {
        total_items: Math.floor(Math.random() * 100) + 50,
        status: 'completed',
        score: reportType === 'compliance' ? Math.floor(Math.random() * 10) + 90 : null
      }
    };

    try {
      await api.post('/reports', {
        report_type: reportType,
        title: title.trim(),
        description: description.trim() || null,
        generated_by: user.id,
        data: reportData
      });
      toast({
        title: 'Report Generated',
        description: `${title} has been generated successfully.`
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // API client already shows toast on error
    }

    setLoading(false);
  };

  const resetForm = () => {
    setReportType(defaultType);
    setTitle('');
    setDescription('');
  };

  const config = reportTypeConfig[reportType];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type *</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reportTypeConfig).map(([key, value]) => {
                  const TypeIcon = value.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        <span>{value.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-secondary/30 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{config.label}</p>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-title">Report Title *</Label>
            <Input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g., Q1 ${config.label}`}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-description">Description</Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes or description..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-gold hover:opacity-90" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
