import { clients, formatCurrency, formatPercent } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Building2, User, Landmark, Building } from 'lucide-react';

const typeIcons = {
  'Individual': User,
  'Family Office': Building2,
  'Trust': Landmark,
  'Corporation': Building
};

const statusColors = {
  'Active': 'bg-success/10 text-success border-success/20',
  'Under Review': 'bg-warning/10 text-warning border-warning/20',
  'Onboarding': 'bg-primary/10 text-primary border-primary/20'
};

export const ClientsTable = () => {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Top Clients</h3>
            <p className="text-sm text-muted-foreground">By Assets Under Management</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Client
              </th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="text-right py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AUM
              </th>
              <th className="text-right py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                YTD Return
              </th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Advisor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.slice(0, 6).map((client) => {
              const Icon = typeIcons[client.type];
              return (
                <tr
                  key={client.id}
                  className="hover:bg-muted/20 transition-colors cursor-pointer group"
                >
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">
                          {client.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{client.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-sm text-muted-foreground">{client.type}</span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <span className="font-medium tabular-nums">{formatCurrency(client.aum, true)}</span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <span
                      className={cn(
                        'font-medium tabular-nums',
                        client.ytdReturn >= 0 ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {formatPercent(client.ytdReturn)}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <Badge variant="outline" className={cn('text-xs', statusColors[client.status])}>
                      {client.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-sm">{client.advisor}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
