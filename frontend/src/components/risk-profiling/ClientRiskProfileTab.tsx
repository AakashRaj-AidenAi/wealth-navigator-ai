import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, extractItems } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RiskProfile, 
  getCategoryLabel, 
  getCategoryColor,
  ALLOCATION_BY_CATEGORY,
  RiskCategory
} from './types';
import { RiskMeter } from './RiskMeter';
import { AllocationPieChart, AllocationBreakdown } from './AllocationPieChart';
import { RiskProfilingWizard } from './RiskProfilingWizard';
import { 
  ShieldCheck, 
  Plus, 
  History, 
  FileText, 
  Clock,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow, differenceInMonths } from 'date-fns';

interface ClientRiskProfileTabProps {
  clientId: string;
  clientName: string;
}

export const ClientRiskProfileTab = ({ clientId, clientName }: ClientRiskProfileTabProps) => {
  const { role } = useAuth();
  const [activeProfile, setActiveProfile] = useState<RiskProfile | null>(null);
  const [profileHistory, setProfileHistory] = useState<RiskProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      // Fetch active profile
      const active = await api.get<RiskProfile>(`/risk_profiles/active/${clientId}`);
      setActiveProfile(active || null);

      // Fetch history
      const history = extractItems<RiskProfile>(await api.get('/risk_profiles', { client_id: clientId }));
      setProfileHistory(history);
    } catch {
      setActiveProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, [clientId]);

  const canEdit = role === 'wealth_advisor';

  // Check if re-profiling is due (more than 12 months old)
  const isReprofilingDue = activeProfile 
    ? differenceInMonths(new Date(), new Date(activeProfile.created_at)) >= 12
    : false;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!activeProfile) {
    return (
      <div className="space-y-6">
        <Card className="glass border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldCheck className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Risk Profile</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              This client hasn't completed a risk profiling assessment yet. 
              Start the assessment to determine their risk appetite and recommended portfolio allocation.
            </p>
            {canEdit && (
              <Button onClick={() => setWizardOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Start Risk Assessment
              </Button>
            )}
          </CardContent>
        </Card>

        <RiskProfilingWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          clientId={clientId}
          clientName={clientName}
          onComplete={fetchProfiles}
        />
      </div>
    );
  }

  const allocation = {
    equity: Number(activeProfile.equity_pct),
    debt: Number(activeProfile.debt_pct),
    gold: Number(activeProfile.gold_pct),
    alternatives: Number(activeProfile.alternatives_pct),
    cash: Number(activeProfile.cash_pct),
  };

  return (
    <div className="space-y-6">
      {/* Header with re-profile alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Risk Profile</h3>
            <p className="text-sm text-muted-foreground">
              Version {activeProfile.version} • Last updated{' '}
              {formatDistanceToNow(new Date(activeProfile.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isReprofilingDue && (
            <Badge variant="outline" className="gap-1 text-warning border-warning/30">
              <AlertTriangle className="h-3 w-3" />
              Annual review due
            </Badge>
          )}
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setWizardOpen(true)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Re-assess
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Risk Score Card */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk Assessment Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6">
            <RiskMeter 
              score={activeProfile.total_score} 
              maxScore={60} 
              category={activeProfile.category as RiskCategory}
              size="lg"
            />
          </CardContent>
        </Card>

        {/* Allocation Card */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recommended Allocation</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex items-start gap-6">
              <AllocationPieChart allocation={allocation} size={160} />
              <div className="flex-1">
                <AllocationBreakdown allocation={allocation} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Details */}
      {activeProfile.notes && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Assessment Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{activeProfile.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Signature Info */}
      {activeProfile.signed_at && (
        <Card className="glass">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Signed on {new Date(activeProfile.signed_at).toLocaleDateString()} at{' '}
                {new Date(activeProfile.signed_at).toLocaleTimeString()}
              </div>
              {activeProfile.signature_data && (
                <img 
                  src={activeProfile.signature_data} 
                  alt="Client signature" 
                  className="h-12 border rounded bg-white ml-auto"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      {profileHistory.length > 1 && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Assessment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profileHistory.map((profile) => (
                <div
                  key={profile.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    profile.is_active ? 'bg-primary/5 border border-primary/20' : 'bg-secondary/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                      v{profile.version}
                    </Badge>
                    <div>
                      <span className={getCategoryColor(profile.category as RiskCategory)}>
                        {getCategoryLabel(profile.category as RiskCategory)}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        Score: {profile.total_score}/60
                      </span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RiskProfilingWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        clientId={clientId}
        clientName={clientName}
        onComplete={fetchProfiles}
      />
    </div>
  );
};
