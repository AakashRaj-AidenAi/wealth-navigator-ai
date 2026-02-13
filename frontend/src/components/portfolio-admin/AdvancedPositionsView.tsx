import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, ShieldAlert, TrendingUp, TrendingDown,
  Globe, Building, Layers, BarChart3, Edit, Trash2, Plus,
} from 'lucide-react';

// ─── Security Metadata Mappings ───

const SECTOR_MAP: Record<string, string> = {
  RELIANCE: 'Energy', ONGC: 'Energy', IOC: 'Energy', BPCL: 'Energy', GAIL: 'Energy',
  TCS: 'Technology', INFY: 'Technology', WIPRO: 'Technology', HCLTECH: 'Technology', TECHM: 'Technology', LTI: 'Technology', MPHASIS: 'Technology', COFORGE: 'Technology',
  HDFCBANK: 'Financial', ICICIBANK: 'Financial', SBIN: 'Financial', KOTAKBANK: 'Financial', AXISBANK: 'Financial', BAJFINANCE: 'Financial', HDFCLIFE: 'Financial', SBILIFE: 'Financial',
  HINDUNILVR: 'Consumer', ITC: 'Consumer', NESTLEIND: 'Consumer', DABUR: 'Consumer', MARICO: 'Consumer', TITAN: 'Consumer', ASIAN: 'Consumer',
  SUNPHARMA: 'Healthcare', DRREDDY: 'Healthcare', CIPLA: 'Healthcare', DIVISLAB: 'Healthcare', APOLLOHOSP: 'Healthcare',
  TATAMOTORS: 'Automotive', MARUTI: 'Automotive', M_M: 'Automotive', BAJAJ_AUTO: 'Automotive', EICHER: 'Automotive',
  TATASTEEL: 'Materials', JSWSTEEL: 'Materials', HINDALCO: 'Materials', VEDL: 'Materials', ULTRACEMCO: 'Materials', SHREECEM: 'Materials',
  LT: 'Industrials', SIEMENS: 'Industrials', ABB: 'Industrials', BEL: 'Industrials', HAL: 'Industrials',
  BHARTIARTL: 'Telecom', IDEA: 'Telecom',
  ADANIENT: 'Conglomerate', ADANIPORTS: 'Infrastructure', ADANIGREEN: 'Utilities', NTPC: 'Utilities', POWERGRID: 'Utilities', TATAPOWER: 'Utilities',
};

const COUNTRY_MAP: Record<string, string> = {
  AAPL: 'USA', MSFT: 'USA', GOOGL: 'USA', AMZN: 'USA', TSLA: 'USA', META: 'USA', NVDA: 'USA', JPM: 'USA', V: 'USA',
  BABA: 'China', JD: 'China', PDD: 'China',
  TSM: 'Taiwan', ASML: 'Netherlands', SAP: 'Germany', SHOP: 'Canada',
};

function getSector(securityId: string): string {
  const id = securityId.toUpperCase().replace(/[^A-Z]/g, '');
  return SECTOR_MAP[id] || 'Other';
}

function getCountry(securityId: string): string {
  const id = securityId.toUpperCase().replace(/[^A-Z]/g, '');
  if (COUNTRY_MAP[id]) return COUNTRY_MAP[id];
  // Default: if in SECTOR_MAP, assume India
  if (SECTOR_MAP[id]) return 'India';
  return 'Other';
}

// ─── Risk Detection ───

interface RiskAlert {
  type: 'concentration' | 'imbalance' | 'overexposure';
  severity: 'warning' | 'critical';
  message: string;
  detail: string;
}

function detectRisks(
  enrichedPositions: EnrichedPosition[],
  totalMV: number,
  sectorData: { name: string; value: number; pct: number }[],
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  // Single stock concentration > 20%
  enrichedPositions.forEach(pos => {
    if (pos.portfolioPct > 20) {
      alerts.push({
        type: 'concentration',
        severity: pos.portfolioPct > 35 ? 'critical' : 'warning',
        message: `${pos.security_id} is ${pos.portfolioPct.toFixed(1)}% of portfolio`,
        detail: `Single position exceeds 20% threshold. Consider rebalancing to reduce concentration risk.`,
      });
    }
  });

  // Sector imbalance > 40%
  sectorData.forEach(s => {
    if (s.pct > 40) {
      alerts.push({
        type: 'imbalance',
        severity: s.pct > 60 ? 'critical' : 'warning',
        message: `${s.name} sector is ${s.pct.toFixed(1)}% of portfolio`,
        detail: `Sector allocation exceeds 40% threshold. Portfolio may be overexposed to sector-specific risk.`,
      });
    }
  });

  // Too few positions (< 5) with meaningful value
  const meaningfulPositions = enrichedPositions.filter(p => p.portfolioPct > 1);
  if (meaningfulPositions.length < 5 && meaningfulPositions.length > 0) {
    alerts.push({
      type: 'overexposure',
      severity: meaningfulPositions.length < 3 ? 'critical' : 'warning',
      message: `Only ${meaningfulPositions.length} meaningful positions detected`,
      detail: `Low diversification may increase portfolio volatility. Consider adding positions across sectors.`,
    });
  }

  return alerts;
}

// ─── Types ───

interface Position {
  id: string;
  portfolio_id: string;
  security_id: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  created_at: string;
}

interface EnrichedPosition extends Position {
  costBasis: number;
  pnl: number;
  pnlPct: number;
  portfolioPct: number;
  sector: string;
  country: string;
}

interface AdvancedPositionsViewProps {
  positions: Position[];
  selectedPortfolioId: string | null;
  getPortfolioName: (id: string) => string;
  onAddPosition: () => void;
  onEditPosition: (pos: Position) => void;
  onDeletePosition: (id: string) => void;
}

const COLORS = [
  'hsl(43, 74%, 49%)', 'hsl(199, 89%, 48%)', 'hsl(160, 84%, 39%)',
  'hsl(280, 65%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(215, 20%, 55%)',
  'hsl(340, 75%, 55%)', 'hsl(120, 40%, 50%)', 'hsl(15, 80%, 55%)',
  'hsl(200, 60%, 40%)',
];

export const AdvancedPositionsView = ({
  positions,
  selectedPortfolioId,
  getPortfolioName,
  onAddPosition,
  onEditPosition,
  onDeletePosition,
}: AdvancedPositionsViewProps) => {
  const filteredPositions = selectedPortfolioId
    ? positions.filter(p => p.portfolio_id === selectedPortfolioId)
    : positions;

  const { enriched, totalMV, sectorData, countryData, riskAlerts, heatmapData } = useMemo(() => {
    const totalMV = filteredPositions.reduce((s, p) => s + (Number(p.market_value) || 0), 0);

    const enriched: EnrichedPosition[] = filteredPositions.map(pos => {
      const mv = Number(pos.market_value) || 0;
      const costBasis = Number(pos.quantity) * Number(pos.average_cost);
      const pnl = mv - costBasis;
      return {
        ...pos,
        costBasis,
        pnl,
        pnlPct: costBasis > 0 ? (pnl / costBasis) * 100 : 0,
        portfolioPct: totalMV > 0 ? (mv / totalMV) * 100 : 0,
        sector: getSector(pos.security_id),
        country: getCountry(pos.security_id),
      };
    });

    // Sector aggregation
    const sectorAgg: Record<string, number> = {};
    enriched.forEach(p => {
      sectorAgg[p.sector] = (sectorAgg[p.sector] || 0) + (Number(p.market_value) || 0);
    });
    const sectorData = Object.entries(sectorAgg)
      .map(([name, value]) => ({ name, value, pct: totalMV > 0 ? (value / totalMV) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    // Country aggregation
    const countryAgg: Record<string, number> = {};
    enriched.forEach(p => {
      countryAgg[p.country] = (countryAgg[p.country] || 0) + (Number(p.market_value) || 0);
    });
    const countryData = Object.entries(countryAgg)
      .map(([name, value]) => ({ name, value, pct: totalMV > 0 ? (value / totalMV) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    // Heatmap: sector x country matrix
    const heatmapMap: Record<string, Record<string, number>> = {};
    enriched.forEach(p => {
      if (!heatmapMap[p.sector]) heatmapMap[p.sector] = {};
      heatmapMap[p.sector][p.country] = (heatmapMap[p.sector][p.country] || 0) + (Number(p.market_value) || 0);
    });
    const allCountries = [...new Set(enriched.map(p => p.country))];
    const heatmapData = Object.entries(heatmapMap).map(([sector, countries]) => ({
      sector,
      ...Object.fromEntries(allCountries.map(c => [c, countries[c] || 0])),
    }));

    const riskAlerts = detectRisks(enriched, totalMV, sectorData);

    return { enriched, totalMV, sectorData, countryData, riskAlerts, heatmapData };
  }, [filteredPositions]);

  return (
    <div className="space-y-4">
      {/* Risk Alerts */}
      {riskAlerts.length > 0 && (
        <div className="space-y-2">
          {riskAlerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                alert.severity === 'critical'
                  ? 'bg-destructive/5 border-destructive/30'
                  : 'bg-warning/5 border-warning/30'
              )}
            >
              {alert.severity === 'critical'
                ? <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                : <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              }
              <div>
                <p className={cn('text-sm font-medium', alert.severity === 'critical' ? 'text-destructive' : 'text-warning')}>
                  {alert.message}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
              </div>
              <Badge variant="outline" className={cn('ml-auto text-[10px] flex-shrink-0',
                alert.severity === 'critical' ? 'border-destructive/50 text-destructive' : 'border-warning/50 text-warning'
              )}>
                {alert.type === 'concentration' ? 'Concentration' : alert.type === 'imbalance' ? 'Imbalance' : 'Low Diversification'}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Positions Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Positions
              <Badge variant="outline" className="ml-1">{enriched.length}</Badge>
            </CardTitle>
            <Button size="sm" onClick={onAddPosition}>
              <Plus className="h-4 w-4 mr-1" /> Add Position
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {enriched.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No positions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Security</TableHead>
                  {!selectedPortfolioId && <TableHead>Portfolio</TableHead>}
                  <TableHead>Sector</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost Basis</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">% of Portfolio</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enriched.map(pos => (
                  <TableRow key={pos.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pos.security_id}</span>
                        {pos.portfolioPct > 20 && (
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger>
                                <AlertTriangle className={cn('h-3.5 w-3.5', pos.portfolioPct > 35 ? 'text-destructive' : 'text-warning')} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Concentration: {pos.portfolioPct.toFixed(1)}% of portfolio</p>
                              </TooltipContent>
                            </UITooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    {!selectedPortfolioId && <TableCell className="text-muted-foreground text-sm">{getPortfolioName(pos.portfolio_id)}</TableCell>}
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{pos.sector}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{pos.country}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{Number(pos.quantity).toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(pos.costBasis)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCurrency(Number(pos.market_value) || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', pos.portfolioPct > 20 ? 'bg-warning' : 'bg-primary')}
                            style={{ width: `${Math.min(pos.portfolioPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm tabular-nums">{pos.portfolioPct.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn('text-right tabular-nums font-medium', pos.pnl >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatCurrency(pos.pnl)} <span className="text-xs">({pos.pnlPct.toFixed(1)}%)</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onEditPosition(pos)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDeletePosition(pos.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Exposure Analytics */}
      {enriched.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sector Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" /> Sector Exposure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative w-40 h-40 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sectorData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                        {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-sm font-medium">{d.name}</p>
                              <p className="text-sm text-primary">{formatCurrency(d.value, true)}</p>
                              <p className="text-xs text-muted-foreground">{d.pct.toFixed(1)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {sectorData.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs">{s.name}</span>
                        {s.pct > 40 && <AlertTriangle className="h-3 w-3 text-warning" />}
                      </div>
                      <span className="text-xs font-medium tabular-nums">{s.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Country Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Geography Exposure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative w-40 h-40 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={countryData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                        {countryData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-sm font-medium">{d.name}</p>
                              <p className="text-sm text-primary">{formatCurrency(d.value, true)}</p>
                              <p className="text-xs text-muted-foreground">{d.pct.toFixed(1)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {countryData.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} />
                        <span className="text-xs">{c.name}</span>
                      </div>
                      <span className="text-xs font-medium tabular-nums">{c.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Heatmap - Sector x Country */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Sector × Country Exposure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, heatmapData.length * 40 + 40)}>
                <BarChart data={heatmapData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => formatCurrency(v, true)} />
                  <YAxis type="category" dataKey="sector" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={90} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-sm font-medium">{payload[0]?.payload?.sector}</p>
                          {payload.map((p: any, i: number) => (
                            <p key={i} className="text-xs">
                              <span style={{ color: p.color }}>{p.name}:</span> {formatCurrency(p.value as number, true)}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }} />
                  {[...new Set(enriched.map(p => p.country))].map((country, i) => (
                    <Bar key={country} dataKey={country} stackId="a" fill={COLORS[(i + 1) % COLORS.length]} radius={i === 0 ? [0, 0, 0, 0] : undefined} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                {[...new Set(enriched.map(p => p.country))].map((country, i) => (
                  <div key={country} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[(i + 1) % COLORS.length] }} />
                    <span className="text-xs text-muted-foreground">{country}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
