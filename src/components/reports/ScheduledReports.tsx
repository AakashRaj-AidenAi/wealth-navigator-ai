import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, Clock, Users, FileText, MoreHorizontal, 
  Pause, Play, Trash2, Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  dayOfMonth: number;
  recipients: number;
  isActive: boolean;
  lastRun: string | null;
  nextRun: string;
}

const mockScheduledReports: ScheduledReport[] = [
  {
    id: '1',
    name: 'Monthly Portfolio Summary',
    reportType: 'monthly_portfolio',
    frequency: 'monthly',
    dayOfMonth: 1,
    recipients: 45,
    isActive: true,
    lastRun: '2025-01-01T10:00:00Z',
    nextRun: '2025-02-01T10:00:00Z'
  },
  {
    id: '2',
    name: 'Quarterly Performance Review',
    reportType: 'quarterly_performance',
    frequency: 'quarterly',
    dayOfMonth: 5,
    recipients: 38,
    isActive: true,
    lastRun: '2025-01-05T10:00:00Z',
    nextRun: '2025-04-05T10:00:00Z'
  },
  {
    id: '3',
    name: 'Tax P&L Statements',
    reportType: 'tax_pnl',
    frequency: 'monthly',
    dayOfMonth: 15,
    recipients: 52,
    isActive: false,
    lastRun: '2024-12-15T10:00:00Z',
    nextRun: '2025-02-15T10:00:00Z'
  }
];

export const ScheduledReports = () => {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(mockScheduledReports);

  const toggleActive = (id: string) => {
    setScheduledReports(prev =>
      prev.map(report =>
        report.id === id ? { ...report, isActive: !report.isActive } : report
      )
    );
  };

  const deleteSchedule = (id: string) => {
    setScheduledReports(prev => prev.filter(report => report.id !== id));
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'bg-chart-2 text-white';
      case 'monthly': return 'bg-primary text-primary-foreground';
      case 'quarterly': return 'bg-chart-3 text-white';
      default: return 'bg-secondary';
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Scheduled Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        {scheduledReports.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No scheduled reports</p>
            <p className="text-sm text-muted-foreground">Create a report and enable scheduling to see them here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledReports.map((schedule) => (
              <div
                key={schedule.id}
                className={`p-4 rounded-lg border transition-colors ${
                  schedule.isActive ? 'border-border' : 'border-border/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{schedule.name}</h4>
                      <Badge className={getFrequencyColor(schedule.frequency)}>
                        {schedule.frequency}
                      </Badge>
                      {!schedule.isActive && (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{schedule.recipients} recipients</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Day {schedule.dayOfMonth}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{schedule.reportType.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      {schedule.lastRun && (
                        <span>Last run: {new Date(schedule.lastRun).toLocaleDateString()}</span>
                      )}
                      <span>Next run: {new Date(schedule.nextRun).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.isActive}
                      onCheckedChange={() => toggleActive(schedule.id)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Edit className="h-4 w-4" />
                          Edit Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2"
                          onClick={() => toggleActive(schedule.id)}
                        >
                          {schedule.isActive ? (
                            <>
                              <Pause className="h-4 w-4" />
                              Pause Schedule
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Resume Schedule
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 text-destructive"
                          onClick={() => deleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Schedule
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
