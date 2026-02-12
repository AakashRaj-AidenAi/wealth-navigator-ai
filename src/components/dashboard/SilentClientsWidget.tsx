import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSilentClients } from '@/hooks/useSilentClients';
import { formatCurrency } from '@/lib/currency';
import { UserX, ChevronRight, User, Clock, Plus } from 'lucide-react';

export const SilentClientsWidget = () => {
  const navigate = useNavigate();
  const { silentClients, loading, createFollowUpTask } = useSilentClients();

  if (loading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const displayed = silentClients.slice(0, 5);

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <UserX className="h-4 w-4 text-warning" />
            Clients Needing Attention
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs"
            onClick={() => navigate('/clients')}
          >
            View All <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {displayed.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <UserX className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No silent clients detected</p>
            <p className="text-xs mt-1">All clients are actively engaged</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(c => {
              const maxDays = Math.max(c.daysSinceLastMeeting, c.daysSinceLastComm, c.daysSinceLastPortfolio);
              return (
                <div
                  key={c.clientId}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/clients/${c.clientId}`)}
                >
                  <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.clientName}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{maxDays}+ days silent</span>
                      {c.totalAssets > 0 && (
                        <span className="ml-1">• {formatCurrency(c.totalAssets, true)}</span>
                      )}
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            createFollowUpTask(c.clientId, c.clientName);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Create follow-up task</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Badge variant="outline" className="text-xs shrink-0 bg-warning/10 text-warning border-warning/20">
                    Silent
                  </Badge>
                </div>
              );
            })}
            {silentClients.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                +{silentClients.length - 5} more silent clients
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
