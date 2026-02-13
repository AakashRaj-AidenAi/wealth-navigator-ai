import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Users, TrendingUp, Zap, BarChart3, Clock, Target, RefreshCw } from 'lucide-react';
import { useCampaignInsights, usePredictiveTargeting, useEngagementScoring, useSmartSendTime } from './useCampaignAI';

export function CampaignDashboard() {
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useCampaignInsights();
  const { data: targeting, isLoading: targetingLoading } = usePredictiveTargeting();
  const { data: engagement, isLoading: engagementLoading } = useEngagementScoring();
  const { data: sendTime, isLoading: sendTimeLoading } = useSmartSendTime();

  const isLoading = insightsLoading;

  return (
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetchInsights()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Insights
        </Button>
      </div>

      {/* Overview Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : insights?.overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={<Send className="h-4 w-4" />} label="Total Campaigns" value={insights.overview.total_campaigns} sub={`${insights.overview.active_campaigns} active`} />
          <MetricCard icon={<Users className="h-4 w-4" />} label="Messages Sent" value={insights.overview.total_messages_sent} sub={`${insights.overview.delivery_rate}% delivered`} />
          <MetricCard icon={<Target className="h-4 w-4" />} label="Segments" value={insights.overview.total_segments} />
          <MetricCard icon={<Zap className="h-4 w-4" />} label="Workflows" value={insights.overview.total_workflows} sub={`${insights.overview.active_workflows} active`} />
        </div>
      ) : (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No campaign data yet. Create your first campaign!</CardContent></Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Predictive Targeting */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Predictive Targeting</CardTitle>
            <CardDescription>AI-scored client propensity signals</CardDescription>
          </CardHeader>
          <CardContent>
            {targetingLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : targeting?.summary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <p className="text-2xl font-bold text-green-600">{targeting.summary.high_invest}</p>
                    <p className="text-xs text-muted-foreground">Likely to invest</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-2xl font-bold text-red-600">{targeting.summary.high_churn}</p>
                    <p className="text-xs text-muted-foreground">Churn risk</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-2xl font-bold text-blue-600">{targeting.summary.high_response}</p>
                    <p className="text-xs text-muted-foreground">High response</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {targeting.predictions?.slice(0, 5).map((p: any) => (
                    <div key={p.client_id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <span className="font-medium truncate max-w-[120px]">{p.client_name}</span>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="text-xs">{p.segment_suggestion}</Badge>
                        <Badge className="text-xs" variant={p.invest_more_score > 60 ? 'default' : 'secondary'}>{p.invest_more_score}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No targeting data available</p>
            )}
          </CardContent>
        </Card>

        {/* Engagement Scoring */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Engagement Scoring</CardTitle>
            <CardDescription>Client engagement heat map</CardDescription>
          </CardHeader>
          <CardContent>
            {engagementLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : engagement?.summary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-2xl font-bold text-red-500">{engagement.summary.hot}</p>
                    <p className="text-xs text-muted-foreground">🔥 Hot</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                    <p className="text-2xl font-bold text-orange-500">{engagement.summary.warm}</p>
                    <p className="text-xs text-muted-foreground">🌤 Warm</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-slate-500">{engagement.summary.cold}</p>
                    <p className="text-xs text-muted-foreground">❄️ Cold</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {engagement.scores?.slice(0, 5).map((s: any) => (
                    <div key={s.client_id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <span className="font-medium truncate max-w-[120px]">{s.client_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{s.replies} replies</span>
                        <Badge variant={s.label === 'hot' ? 'destructive' : s.label === 'warm' ? 'default' : 'secondary'} className="text-xs">{s.engagement_score}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No engagement data</p>
            )}
          </CardContent>
        </Card>

        {/* Smart Send Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Smart Send Time</CardTitle>
            <CardDescription>Optimal delivery timing based on engagement history</CardDescription>
          </CardHeader>
          <CardContent>
            {sendTimeLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : sendTime ? (
              <div className="space-y-4">
                <div className="p-3 bg-primary/5 rounded-lg border">
                  <p className="text-sm font-medium">📌 {sendTime.recommendation}</p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Best Days</p>
                  <div className="flex gap-2">
                    {sendTime.best_days?.map((d: string) => (
                      <Badge key={d} variant="outline">{d}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Top Hours (by open rate)</p>
                  <div className="flex gap-2 flex-wrap">
                    {sendTime.best_hours?.slice(0, 4).map((h: any) => (
                      <Badge key={h.hour} variant="secondary" className="text-xs">{h.hour}:00 ({h.open_rate}% open)</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough data</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Campaigns */}
        {insights?.recent_campaigns?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.recent_campaigns.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.channel} · {c.sent_count} sent</p>
                    </div>
                    <Badge variant={c.status === 'sent' ? 'default' : c.status === 'draft' ? 'secondary' : 'outline'} className="text-xs">{c.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">{icon}<span className="text-xs">{label}</span></div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
