import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Eye, MousePointerClick, MessageSquare, TrendingUp, DollarSign, BarChart3, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart as RPieChart, Pie, Cell, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useCampaigns } from '@/components/campaigns/create/useCampaigns';
import { format, subDays, subMonths, isAfter } from 'date-fns';

type DateRange = '7d' | '30d' | '90d' | 'all';

// Mock analytics data derived from campaigns
function useCampaignAnalytics(dateRange: DateRange, campaignFilter: string, segmentFilter: string) {
  const { data: campaigns = [], isLoading } = useCampaigns();

  const analytics = useMemo(() => {
    const now = new Date();
    const cutoff = dateRange === '7d' ? subDays(now, 7)
      : dateRange === '30d' ? subDays(now, 30)
      : dateRange === '90d' ? subMonths(now, 3)
      : new Date(0);

    let filtered = campaigns.filter(c =>
      isAfter(new Date(c.created_at), cutoff)
    );

    if (campaignFilter !== 'all') {
      filtered = filtered.filter(c => c.id === campaignFilter);
    }

    const totalSent = filtered.reduce((s, c) => s + (c.sent_count || 0), 0);
    const totalRecipients = filtered.reduce((s, c) => s + (c.total_recipients || 0), 0);
    const totalFailed = filtered.reduce((s, c) => s + (c.failed_count || 0), 0);

    // Mock engagement metrics based on sent counts
    const openRate = totalSent > 0 ? Math.min(95, 42 + Math.floor(Math.random() * 15)) : 0;
    const clickRate = totalSent > 0 ? Math.min(40, 12 + Math.floor(Math.random() * 8)) : 0;
    const replyRate = totalSent > 0 ? Math.min(25, 5 + Math.floor(Math.random() * 6)) : 0;
    const conversionRate = totalSent > 0 ? Math.min(15, 3 + Math.floor(Math.random() * 4)) : 0;

    const opens = Math.round(totalSent * openRate / 100);
    const clicks = Math.round(totalSent * clickRate / 100);
    const replies = Math.round(totalSent * replyRate / 100);
    const conversions = Math.round(totalSent * conversionRate / 100);
    const investmentsGenerated = conversions * (250000 + Math.floor(Math.random() * 500000));
    const revenueImpact = Math.round(investmentsGenerated * 0.012);

    // Performance over time
    const performanceData = Array.from({ length: dateRange === '7d' ? 7 : dateRange === '30d' ? 10 : 12 }, (_, i) => {
      const d = dateRange === '7d' ? subDays(now, 6 - i) : subDays(now, (dateRange === '30d' ? 30 : 90) - i * (dateRange === '30d' ? 3 : 8));
      const base = Math.max(1, Math.floor(totalSent / (dateRange === '7d' ? 7 : 10)));
      const sent = base + Math.floor(Math.random() * base * 0.5);
      return {
        date: format(d, 'dd MMM'),
        sent,
        opens: Math.round(sent * (0.35 + Math.random() * 0.2)),
        clicks: Math.round(sent * (0.08 + Math.random() * 0.1)),
        replies: Math.round(sent * (0.03 + Math.random() * 0.05)),
      };
    });

    // Channel effectiveness
    const channelData = [
      { channel: 'Email', sent: Math.round(totalSent * 0.6) || 45, opens: 48, clicks: 14, conversions: 5, color: 'hsl(var(--primary))' },
      { channel: 'WhatsApp', sent: Math.round(totalSent * 0.3) || 30, opens: 72, clicks: 22, conversions: 8, color: 'hsl(142, 71%, 45%)' },
      { channel: 'In-App', sent: Math.round(totalSent * 0.1) || 12, opens: 85, clicks: 35, conversions: 12, color: 'hsl(217, 91%, 60%)' },
    ];

    // ROI data
    const roiData = [
      { month: 'Oct', spend: 500, revenue: 1200 },
      { month: 'Nov', spend: 750, revenue: 2800 },
      { month: 'Dec', spend: 600, revenue: 3500 },
      { month: 'Jan', spend: 900, revenue: 5200 },
      { month: 'Feb', spend: 850, revenue: revenueImpact || 4800 },
    ];

    // Top segments
    const segmentData = [
      { name: 'HNI Clients', value: 35, campaigns: 8, avgOpen: 52, color: 'hsl(var(--primary))' },
      { name: 'New Clients', value: 25, campaigns: 12, avgOpen: 68, color: 'hsl(142, 71%, 45%)' },
      { name: 'Dormant', value: 20, campaigns: 5, avgOpen: 38, color: 'hsl(38, 92%, 50%)' },
      { name: 'NRI', value: 12, campaigns: 4, avgOpen: 45, color: 'hsl(262, 83%, 58%)' },
      { name: 'Other', value: 8, campaigns: 3, avgOpen: 41, color: 'hsl(var(--muted-foreground))' },
    ];

    // Top campaigns
    const topCampaigns = filtered
      .filter(c => c.status === 'sent' || c.status === 'completed')
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        channel: c.channel,
        sent: c.sent_count || 0,
        openRate: 35 + Math.floor(Math.random() * 30),
        clickRate: 8 + Math.floor(Math.random() * 15),
        conversions: Math.floor(Math.random() * 8),
        revenue: Math.floor(Math.random() * 50000),
      }));

    return {
      summary: { totalSent, totalRecipients, totalFailed, opens, clicks, replies, conversions, openRate, clickRate, replyRate, conversionRate, investmentsGenerated, revenueImpact },
      performanceData,
      channelData,
      roiData,
      segmentData,
      topCampaigns,
      campaignCount: filtered.length,
    };
  }, [campaigns, dateRange, campaignFilter]);

  return { analytics, isLoading, campaigns };
}

const chartConfig = {
  sent: { label: 'Sent', color: 'hsl(var(--primary))' },
  opens: { label: 'Opens', color: 'hsl(142, 71%, 45%)' },
  clicks: { label: 'Clicks', color: 'hsl(217, 91%, 60%)' },
  replies: { label: 'Replies', color: 'hsl(38, 92%, 50%)' },
  spend: { label: 'Spend', color: 'hsl(var(--muted-foreground))' },
  revenue: { label: 'Revenue', color: 'hsl(142, 71%, 45%)' },
};

export function CampaignAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const { analytics, isLoading, campaigns } = useCampaignAnalytics(dateRange, campaignFilter, segmentFilter);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const { summary, performanceData, channelData, roiData, segmentData, topCampaigns } = analytics;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Period:</span>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Campaign:</span>
              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger className="w-[180px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Segment:</span>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-[150px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="hni">HNI Clients</SelectItem>
                  <SelectItem value="new">New Clients</SelectItem>
                  <SelectItem value="dormant">Dormant</SelectItem>
                  <SelectItem value="nri">NRI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard icon={<Send className="h-4 w-4" />} label="Messages Sent" value={summary.totalSent.toLocaleString()} change={12} />
        <KPICard icon={<Eye className="h-4 w-4" />} label="Opens" value={summary.opens.toLocaleString()} sub={`${summary.openRate}% rate`} change={5} />
        <KPICard icon={<MousePointerClick className="h-4 w-4" />} label="Clicks" value={summary.clicks.toLocaleString()} sub={`${summary.clickRate}% rate`} change={8} />
        <KPICard icon={<MessageSquare className="h-4 w-4" />} label="Replies" value={summary.replies.toLocaleString()} sub={`${summary.replyRate}% rate`} change={-2} />
        <KPICard icon={<TrendingUp className="h-4 w-4" />} label="Conversions" value={summary.conversions.toLocaleString()} sub={`${summary.conversionRate}% rate`} change={15} />
        <KPICard icon={<DollarSign className="h-4 w-4" />} label="Revenue Impact" value={`$${(summary.revenueImpact / 1000).toFixed(0)}K`} change={22} />
      </div>

      {/* Charts Row 1: Performance + ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Campaign Performance</CardTitle>
            <CardDescription>Message delivery and engagement over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="sent" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="opens" stackId="2" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="clicks" stackId="3" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.08} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> ROI Trend</CardTitle>
            <CardDescription>Campaign spend vs revenue generated</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={roiData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="spend" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
                <Bar dataKey="revenue" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Segments + Channel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><PieChart className="h-4 w-4" /> Best Performing Segments</CardTitle>
            <CardDescription>Campaign distribution by client segment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-[220px] w-[220px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie data={segmentData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                      {segmentData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {segmentData.map((seg) => (
                  <div key={seg.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="font-medium">{seg.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground text-xs">
                      <span>{seg.campaigns} campaigns</span>
                      <Badge variant="outline" className="text-xs">{seg.avgOpen}% open</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Channel Effectiveness</CardTitle>
            <CardDescription>Engagement rates by communication channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {channelData.map((ch) => (
                <div key={ch.channel} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{ch.channel}</span>
                    <span className="text-xs text-muted-foreground">{ch.sent} sent</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <ChannelMetric label="Open Rate" value={ch.opens} color={ch.color} />
                    <ChannelMetric label="Click Rate" value={ch.clicks} color={ch.color} />
                    <ChannelMetric label="Conversion" value={ch.conversions} color={ch.color} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Campaigns Table */}
      {topCampaigns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Performing Campaigns</CardTitle>
            <CardDescription>Ranked by conversion rate and revenue impact</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Campaign</th>
                    <th className="text-left py-2 font-medium">Channel</th>
                    <th className="text-right py-2 font-medium">Sent</th>
                    <th className="text-right py-2 font-medium">Open %</th>
                    <th className="text-right py-2 font-medium">Click %</th>
                    <th className="text-right py-2 font-medium">Conversions</th>
                    <th className="text-right py-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">{c.name}</td>
                      <td className="py-2.5"><Badge variant="outline" className="capitalize text-xs">{c.channel}</Badge></td>
                      <td className="py-2.5 text-right">{c.sent}</td>
                      <td className="py-2.5 text-right">{c.openRate}%</td>
                      <td className="py-2.5 text-right">{c.clickRate}%</td>
                      <td className="py-2.5 text-right">{c.conversions}</td>
                      <td className="py-2.5 text-right font-medium">${c.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📊 AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium">Best Channel</p>
              <p className="text-muted-foreground">WhatsApp campaigns show <span className="text-foreground font-medium">72% higher</span> open rates vs email</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Top Segment</p>
              <p className="text-muted-foreground">New Client onboarding campaigns drive <span className="text-foreground font-medium">3.2x more</span> conversions</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Optimal Timing</p>
              <p className="text-muted-foreground">Campaigns sent <span className="text-foreground font-medium">Tue-Thu 10AM</span> see 28% better engagement</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ icon, label, value, sub, change }: { icon: React.ReactNode; label: string; value: string; sub?: string; change?: number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">{icon}<span className="text-xs">{label}</span></div>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold">{value}</p>
          {change !== undefined && (
            <span className={`flex items-center text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ChannelMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-secondary/30">
      <p className="text-lg font-bold" style={{ color }}>{value}%</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
