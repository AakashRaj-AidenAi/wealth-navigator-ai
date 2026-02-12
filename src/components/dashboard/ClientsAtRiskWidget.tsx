import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, ChevronRight, User } from 'lucide-react';
import { churnRiskConfig, getChurnRiskLevel } from '@/hooks/useChurnPredictions';

interface ChurnClient {
  client_id: string;
  churn_risk_percentage: number;
  risk_level: string;
  risk_factors: string[];
  days_since_interaction: number;
  client_name?: string;
}

export const ClientsAtRiskWidget = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ChurnClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('churn_predictions')
        .select('client_id, churn_risk_percentage, risk_level, risk_factors, days_since_interaction')
        .gte('churn_risk_percentage', 40)
        .order('churn_risk_percentage', { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        // Fetch client names
        const clientIds = data.map((d: any) => d.client_id);
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, client_name')
          .in('id', clientIds);

        const nameMap = new Map((clientsData ?? []).map(c => [c.id, c.client_name]));
        setClients(data.map((d: any) => ({
          ...d,
          risk_factors: d.risk_factors || [],
          client_name: nameMap.get(d.client_id) || 'Unknown'
        })));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Clients at Risk
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
        {clients.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No at-risk clients detected</p>
            <p className="text-xs mt-1">Run churn analysis from client profiles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map(c => {
              const level = getChurnRiskLevel(c.churn_risk_percentage);
              const config = churnRiskConfig[level];
              return (
                <div
                  key={c.client_id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/clients/${c.client_id}`)}
                >
                  <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(c.risk_factors as string[])?.[0] || 'At risk'}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn('text-xs shrink-0', config.bgColor, config.color)}>
                    {c.churn_risk_percentage}%
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
