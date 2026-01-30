import { recentActivity } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArrowRightLeft,
  Calendar,
  FileText,
  Phone,
  Mail,
  ChevronRight
} from 'lucide-react';

const typeIcons = {
  trade: ArrowRightLeft,
  meeting: Calendar,
  document: FileText,
  call: Phone,
  email: Mail
};

const typeColors = {
  trade: 'bg-success/10 text-success',
  meeting: 'bg-primary/10 text-primary',
  document: 'bg-chart-3/10 text-chart-3',
  call: 'bg-chart-4/10 text-chart-4',
  email: 'bg-chart-5/10 text-chart-5'
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export const ActivityFeed = () => {
  return (
    <div className="glass rounded-xl overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">Latest actions & updates</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          
          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = typeIcons[activity.type];
              return (
                <div key={activity.id} className="relative flex gap-4 pl-10">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'absolute left-1.5 h-6 w-6 rounded-full flex items-center justify-center',
                      typeColors[activity.type]
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.description}
                        </p>
                        {activity.client && (
                          <p className="text-xs text-primary mt-1">{activity.client}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
