import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, ArrowRightLeft, BookOpen, Check, Clock, Copy, Edit, Eye,
  GitBranch, Layers, Plus, Scale, Shield, Target, Trash2, TrendingDown, TrendingUp, Users, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { type TargetAllocation, type PositionSnapshot, detectDrift, buildRebalanceProposal } from './rebalancingEngine';

// ─── Types ───
interface ModelAllocation {
  securityId: string;
  targetPct: number;
  assetClass?: string;
}

interface ModelVersion {
  version: number;
  allocations: ModelAllocation[];
  notes: string;
  createdAt: string;
}

interface ModelPortfolio {
  id: string;
  name: string;
  type: 'conservative' | 'balanced' | 'aggressive' | 'custom';
  description: string;
  allocations: ModelAllocation[];
  assignedPortfolioIds: string[];
  versions: ModelVersion[];
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface Portfolio {
  id: string;
  portfolio_name: string;
  client_id: string;
  clients?: { client_name: string };
}
interface Position {
  id: string;
  portfolio_id: string;
  security_id: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  market_value: number;
}

interface Props {
  portfolios: Portfolio[];
  positions: Position[];
  selectedPortfolioId: string | null;
}

const MODEL_TYPES = [
  { value: 'conservative', label: 'Conservative', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30', icon: Shield },
  { value: 'balanced', label: 'Balanced', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', icon: Scale },
  { value: 'aggressive', label: 'Aggressive', color: 'bg-red-500/10 text-red-500 border-red-500/30', icon: TrendingUp },
  { value: 'custom', label: 'Custom', color: 'bg-violet-500/10 text-violet-500 border-violet-500/30', icon: Layers },
];

const PRESET_ALLOCATIONS: Record<string, ModelAllocation[]> = {
  conservative: [
    { securityId: 'GOVT-BONDS', targetPct: 40, assetClass: 'Fixed Income' },
    { securityId: 'CORP-BONDS', targetPct: 20, assetClass: 'Fixed Income' },
    { securityId: 'LARGE-CAP', targetPct: 20, assetClass: 'Equity' },
    { securityId: 'GOLD-ETF', targetPct: 10, assetClass: 'Commodities' },
    { securityId: 'LIQUID-FUND', targetPct: 10, assetClass: 'Cash' },
  ],
  balanced: [
    { securityId: 'LARGE-CAP', targetPct: 30, assetClass: 'Equity' },
    { securityId: 'MID-CAP', targetPct: 15, assetClass: 'Equity' },
    { securityId: 'GOVT-BONDS', targetPct: 25, assetClass: 'Fixed Income' },
    { securityId: 'CORP-BONDS', targetPct: 15, assetClass: 'Fixed Income' },
    { securityId: 'GOLD-ETF', targetPct: 10, assetClass: 'Commodities' },
    { securityId: 'LIQUID-FUND', targetPct: 5, assetClass: 'Cash' },
  ],
  aggressive: [
    { securityId: 'LARGE-CAP', targetPct: 35, assetClass: 'Equity' },
    { securityId: 'MID-CAP', targetPct: 25, assetClass: 'Equity' },
    { securityId: 'SMALL-CAP', targetPct: 15, assetClass: 'Equity' },
    { securityId: 'INTL-EQUITY', targetPct: 10, assetClass: 'Equity' },
    { securityId: 'CORP-BONDS', targetPct: 10, assetClass: 'Fixed Income' },
    { securityId: 'GOLD-ETF', targetPct: 5, assetClass: 'Commodities' },
  ],
};

const CHART_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', '#ef4444', '#84cc16'];

const DRIFT_COLORS: Record<string, string> = {
  overweight: '#ef4444',
  underweight: '#3b82f6',
  'on-target': '#22c55e',
};

export const ModelPortfolioView = ({ portfolios, positions, selectedPortfolioId }: Props) => {
  const [subTab, setSubTab] = useState('library');
  const [models, setModels] = useState<ModelPortfolio[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({
    name: '',
    type: 'balanced' as ModelPortfolio['type'],
    description: '',
    allocations: [] as ModelAllocation[],
  });
  const [newAllocSecurity, setNewAllocSecurity] = useState('');
  const [newAllocPct, setNewAllocPct] = useState('');
  const [newAllocClass, setNewAllocClass] = useState('');

  // Assign
  const [assignPortfolioIds, setAssignPortfolioIds] = useState<string[]>([]);

  // Compare
  const [comparePortfolioId, setComparePortfolioId] = useState<string | null>(null);

  const selectedModel = models.find(m => m.id === selectedModelId);
  const totalAllocPct = form.allocations.reduce((s, a) => s + a.targetPct, 0);

  // ─── Create / Edit Model ───
  const handleCreateModel = () => {
    if (!form.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (Math.abs(totalAllocPct - 100) > 0.5) { toast({ title: 'Allocations must sum to 100%', variant: 'destructive' }); return; }

    if (editingModelId) {
      setModels(prev => prev.map(m => {
        if (m.id !== editingModelId) return m;
        const newVersion = m.currentVersion + 1;
        return {
          ...m,
          name: form.name,
          type: form.type,
          description: form.description,
          allocations: form.allocations,
          currentVersion: newVersion,
          versions: [...m.versions, {
            version: newVersion,
            allocations: form.allocations,
            notes: `Updated to v${newVersion}`,
            createdAt: new Date().toISOString(),
          }],
          updatedAt: new Date().toISOString(),
        };
      }));
      toast({ title: 'Model updated', description: `New version created for ${form.name}` });
    } else {
      const newModel: ModelPortfolio = {
        id: crypto.randomUUID(),
        name: form.name,
        type: form.type,
        description: form.description,
        allocations: form.allocations,
        assignedPortfolioIds: [],
        versions: [{
          version: 1,
          allocations: form.allocations,
          notes: 'Initial version',
          createdAt: new Date().toISOString(),
        }],
        currentVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setModels(prev => [...prev, newModel]);
      toast({ title: 'Model created', description: form.name });
    }
    setShowCreateDialog(false);
    setEditingModelId(null);
    resetForm();
  };

  const resetForm = () => setForm({ name: '', type: 'balanced', description: '', allocations: [] });

  const handleAddAllocation = () => {
    if (!newAllocSecurity.trim() || !newAllocPct) return;
    if (form.allocations.find(a => a.securityId === newAllocSecurity)) {
      toast({ title: 'Duplicate security', variant: 'destructive' }); return;
    }
    setForm(prev => ({
      ...prev,
      allocations: [...prev.allocations, { securityId: newAllocSecurity.toUpperCase(), targetPct: Number(newAllocPct), assetClass: newAllocClass || undefined }],
    }));
    setNewAllocSecurity('');
    setNewAllocPct('');
    setNewAllocClass('');
  };

  const handleRemoveAllocation = (secId: string) => {
    setForm(prev => ({ ...prev, allocations: prev.allocations.filter(a => a.securityId !== secId) }));
  };

  const handleLoadPreset = (type: string) => {
    const preset = PRESET_ALLOCATIONS[type];
    if (preset) setForm(prev => ({ ...prev, allocations: [...preset] }));
  };

  const handleDeleteModel = (id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
    if (selectedModelId === id) setSelectedModelId(null);
    toast({ title: 'Model deleted' });
  };

  const handleEditModel = (m: ModelPortfolio) => {
    setEditingModelId(m.id);
    setForm({ name: m.name, type: m.type, description: m.description, allocations: [...m.allocations] });
    setShowCreateDialog(true);
  };

  const handleDuplicateModel = (m: ModelPortfolio) => {
    setEditingModelId(null);
    setForm({ name: `${m.name} (Copy)`, type: m.type, description: m.description, allocations: [...m.allocations] });
    setShowCreateDialog(true);
  };

  // ─── Assign Clients ───
  const handleAssign = () => {
    if (!selectedModelId || assignPortfolioIds.length === 0) return;
    setModels(prev => prev.map(m =>
      m.id === selectedModelId
        ? { ...m, assignedPortfolioIds: [...new Set([...m.assignedPortfolioIds, ...assignPortfolioIds])] }
        : m
    ));
    toast({ title: 'Portfolios assigned', description: `${assignPortfolioIds.length} portfolio(s) linked to model` });
    setShowAssignDialog(false);
    setAssignPortfolioIds([]);
  };

  const handleUnassign = (modelId: string, portfolioId: string) => {
    setModels(prev => prev.map(m =>
      m.id === modelId
        ? { ...m, assignedPortfolioIds: m.assignedPortfolioIds.filter(id => id !== portfolioId) }
        : m
    ));
  };

  // ─── Compare Model vs Actual ───
  const comparisonData = useMemo(() => {
    if (!selectedModel || !comparePortfolioId) return null;
    const pPositions = positions.filter(p => p.portfolio_id === comparePortfolioId);
    const totalMV = pPositions.reduce((s, p) => s + Number(p.market_value || 0), 0);
    if (totalMV <= 0) return null;

    const snapshots: PositionSnapshot[] = pPositions.map(p => ({
      securityId: p.security_id, quantity: p.quantity, averageCost: p.average_cost,
      currentPrice: p.current_price, marketValue: p.market_value,
    }));
    const drifts = detectDrift(snapshots, selectedModel.allocations, 5);

    const radarData = selectedModel.allocations.map(a => {
      const pos = pPositions.find(p => p.security_id === a.securityId);
      const actualPct = pos ? (pos.market_value / totalMV) * 100 : 0;
      return { subject: a.securityId, model: a.targetPct, actual: Number(actualPct.toFixed(1)) };
    });

    return { drifts, radarData, totalMV, portfolio: portfolios.find(p => p.id === comparePortfolioId) };
  }, [selectedModel, comparePortfolioId, positions, portfolios]);

  // ─── Push Rebalance to All Assigned ───
  const pushRebalanceAll = () => {
    if (!selectedModel) return;
    const assigned = selectedModel.assignedPortfolioIds;
    if (assigned.length === 0) { toast({ title: 'No portfolios assigned', variant: 'destructive' }); return; }

    let totalTrades = 0;
    assigned.forEach(pid => {
      const pPos = positions.filter(p => p.portfolio_id === pid);
      const snapshots: PositionSnapshot[] = pPos.map(p => ({
        securityId: p.security_id, quantity: p.quantity, averageCost: p.average_cost,
        currentPrice: p.current_price, marketValue: p.market_value,
      }));
      const proposal = buildRebalanceProposal(pid, '', snapshots, selectedModel.allocations, 5);
      totalTrades += proposal.suggestedTrades.length;
    });

    toast({
      title: 'Rebalance pushed',
      description: `Generated ${totalTrades} trade(s) across ${assigned.length} portfolio(s). Review in Rebalancing tab.`,
    });
  };

  const getTypeMeta = (type: string) => MODEL_TYPES.find(t => t.value === type) || MODEL_TYPES[3];

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="library" className="gap-1"><BookOpen className="h-4 w-4" /> Model Library</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1"><Users className="h-4 w-4" /> Assignments</TabsTrigger>
          <TabsTrigger value="comparison" className="gap-1"><BarChart className="h-4 w-4" /> Model vs Actual</TabsTrigger>
          <TabsTrigger value="versions" className="gap-1"><GitBranch className="h-4 w-4" /> Version History</TabsTrigger>
        </TabsList>

        {/* ═══ MODEL LIBRARY ═══ */}
        <TabsContent value="library" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Model Portfolios</h2>
              <p className="text-sm text-muted-foreground">Create and manage allocation templates</p>
            </div>
            <Button onClick={() => { setEditingModelId(null); resetForm(); setShowCreateDialog(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> New Model
            </Button>
          </div>

          {models.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground mb-4">No model portfolios created yet</p>
                <Button variant="outline" onClick={() => { setEditingModelId(null); resetForm(); setShowCreateDialog(true); }}>
                  Create Your First Model
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map(m => {
                const meta = getTypeMeta(m.type);
                const Icon = meta.icon;
                return (
                  <Card key={m.id} className={cn('cursor-pointer transition-all hover:shadow-md', selectedModelId === m.id && 'ring-2 ring-primary')}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={meta.color}>
                          <Icon className="h-3 w-3 mr-1" /> {meta.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">v{m.currentVersion}</Badge>
                      </div>
                      <CardTitle className="text-base mt-2">{m.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">{m.description || 'No description'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {m.allocations.length} holdings</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {m.assignedPortfolioIds.length} assigned</span>
                      </div>

                      {/* Mini allocation bar */}
                      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                        {m.allocations.map((a, i) => (
                          <div key={a.securityId} style={{ width: `${a.targetPct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} title={`${a.securityId}: ${a.targetPct}%`} />
                        ))}
                      </div>

                      <div className="flex items-center gap-1 pt-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setSelectedModelId(m.id); setSubTab('comparison'); }}>
                          <Eye className="h-3 w-3 mr-1" /> Compare
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleEditModel(m)}>
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleDuplicateModel(m)}>
                          <Copy className="h-3 w-3 mr-1" /> Clone
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleDeleteModel(m.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ ASSIGNMENTS ═══ */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Client Assignments</h2>
              <p className="text-sm text-muted-foreground">Assign client portfolios to model templates</p>
            </div>
            <Button onClick={() => { if (!selectedModelId && models.length > 0) setSelectedModelId(models[0].id); setShowAssignDialog(true); }} disabled={models.length === 0} className="gap-2">
              <Plus className="h-4 w-4" /> Assign Portfolios
            </Button>
          </div>

          {models.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Create a model first to assign portfolios.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {models.map(m => {
                const meta = getTypeMeta(m.type);
                return (
                  <Card key={m.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                          {m.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedModelId(m.id); setShowAssignDialog(true); }}>
                            <Plus className="h-3 w-3 mr-1" /> Assign
                          </Button>
                          <Button size="sm" variant="default" onClick={() => { setSelectedModelId(m.id); pushRebalanceAll(); }} disabled={m.assignedPortfolioIds.length === 0}>
                            <Zap className="h-3 w-3 mr-1" /> Push Rebalance
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {m.assignedPortfolioIds.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No portfolios assigned</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Portfolio</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead>Market Value</TableHead>
                              <TableHead>Drift Status</TableHead>
                              <TableHead className="w-[80px]">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {m.assignedPortfolioIds.map(pid => {
                              const port = portfolios.find(p => p.id === pid);
                              const pPositions = positions.filter(p => p.portfolio_id === pid);
                              const mv = pPositions.reduce((s, p) => s + Number(p.market_value || 0), 0);
                              const snaps: PositionSnapshot[] = pPositions.map(p => ({
                                securityId: p.security_id, quantity: p.quantity, averageCost: p.average_cost,
                                currentPrice: p.current_price, marketValue: p.market_value,
                              }));
                              const drifts = mv > 0 ? detectDrift(snaps, m.allocations, 5) : [];
                              const breaches = drifts.filter(d => d.breached).length;

                              return (
                                <TableRow key={pid}>
                                  <TableCell className="font-medium">{port?.portfolio_name || pid}</TableCell>
                                  <TableCell>{port?.clients?.client_name || '—'}</TableCell>
                                  <TableCell>{formatCurrency(mv)}</TableCell>
                                  <TableCell>
                                    {breaches > 0 ? (
                                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                                        <AlertTriangle className="h-3 w-3 mr-1" /> {breaches} drift(s)
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                        <Check className="h-3 w-3 mr-1" /> On target
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => handleUnassign(m.id, pid)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ COMPARISON ═══ */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Model vs Actual Comparison</CardTitle>
              <CardDescription>Select a model and portfolio to compare allocations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Model Portfolio</Label>
                  <Select value={selectedModelId || ''} onValueChange={setSelectedModelId}>
                    <SelectTrigger><SelectValue placeholder="Select model..." /></SelectTrigger>
                    <SelectContent>
                      {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Client Portfolio</Label>
                  <Select value={comparePortfolioId || ''} onValueChange={setComparePortfolioId}>
                    <SelectTrigger><SelectValue placeholder="Select portfolio..." /></SelectTrigger>
                    <SelectContent>
                      {portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.portfolio_name} ({p.clients?.client_name})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {comparisonData ? (
                <div className="space-y-4">
                  {/* Radar chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Allocation Radar</CardTitle></CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={comparisonData.radarData}>
                              <PolarGrid strokeDasharray="3 3" className="opacity-30" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                              <PolarRadiusAxis angle={30} tick={{ fontSize: 10 }} />
                              <Radar name="Model" dataKey="model" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                              <Radar name="Actual" dataKey="actual" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
                              <Legend />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Drift Analysis</CardTitle></CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData.drifts.map(d => ({ name: d.securityId, drift: d.driftPct, fill: DRIFT_COLORS[d.direction] }))} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                              <XAxis type="number" tickFormatter={v => `${v}%`} />
                              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drift']} />
                              <Bar dataKey="drift" radius={[0, 4, 4, 0]}>
                                {comparisonData.drifts.map((d, i) => (
                                  <Cell key={i} fill={DRIFT_COLORS[d.direction]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detail table */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Detailed Comparison</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Security</TableHead>
                            <TableHead>Model %</TableHead>
                            <TableHead>Actual %</TableHead>
                            <TableHead>Drift</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparisonData.drifts.map(d => (
                            <TableRow key={d.securityId}>
                              <TableCell className="font-medium">{d.securityId}</TableCell>
                              <TableCell>{d.targetPct.toFixed(1)}%</TableCell>
                              <TableCell>{d.currentPct.toFixed(1)}%</TableCell>
                              <TableCell className={cn('font-medium', d.driftPct > 0 ? 'text-red-500' : d.driftPct < 0 ? 'text-blue-500' : '')}>
                                {d.driftPct > 0 ? '+' : ''}{d.driftPct.toFixed(2)}%
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  d.breached ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                                  'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                }>
                                  {d.breached ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                  {d.direction}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Select a model and client portfolio to compare</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ VERSION HISTORY ═══ */}
        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /> Version Control</CardTitle>
              <CardDescription>Track changes to model portfolio allocations over time</CardDescription>
            </CardHeader>
            <CardContent>
              {models.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No models created yet.</p>
              ) : (
                <div className="space-y-4">
                  <Select value={selectedModelId || ''} onValueChange={setSelectedModelId}>
                    <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select model..." /></SelectTrigger>
                    <SelectContent>
                      {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name} (v{m.currentVersion})</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {selectedModel && (
                    <div className="space-y-3">
                      {[...selectedModel.versions].reverse().map(v => (
                        <Card key={v.version} className={cn(v.version === selectedModel.currentVersion && 'ring-1 ring-primary')}>
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant={v.version === selectedModel.currentVersion ? 'default' : 'secondary'}>
                                  v{v.version}
                                </Badge>
                                <span className="text-sm">{v.notes}</span>
                                {v.version === selectedModel.currentVersion && (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">Current</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(v.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {v.allocations.map((a, i) => (
                                <Badge key={a.securityId} variant="outline" className="text-xs" style={{ borderColor: CHART_COLORS[i % CHART_COLORS.length] + '60' }}>
                                  {a.securityId}: {a.targetPct}%
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ CREATE / EDIT DIALOG ═══ */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModelId ? 'Edit Model Portfolio' : 'Create Model Portfolio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Model Name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Growth Model 2025" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as ModelPortfolio['type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODEL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Model portfolio strategy description..." rows={2} />
            </div>

            {/* Preset loader */}
            {!editingModelId && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Load preset:</span>
                <Button size="sm" variant="outline" onClick={() => handleLoadPreset('conservative')}>Conservative</Button>
                <Button size="sm" variant="outline" onClick={() => handleLoadPreset('balanced')}>Balanced</Button>
                <Button size="sm" variant="outline" onClick={() => handleLoadPreset('aggressive')}>Aggressive</Button>
              </div>
            )}

            {/* Add allocation */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Asset Allocation</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Security / Asset</Label>
                    <Input value={newAllocSecurity} onChange={e => setNewAllocSecurity(e.target.value)} placeholder="e.g. LARGE-CAP" />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Weight %</Label>
                    <Input type="number" min={0} max={100} value={newAllocPct} onChange={e => setNewAllocPct(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Asset Class</Label>
                    <Input value={newAllocClass} onChange={e => setNewAllocClass(e.target.value)} placeholder="e.g. Equity" />
                  </div>
                  <Button size="sm" onClick={handleAddAllocation}><Plus className="h-4 w-4" /></Button>
                </div>

                {form.allocations.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Security</TableHead>
                        <TableHead>Asset Class</TableHead>
                        <TableHead>Weight %</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.allocations.map(a => (
                        <TableRow key={a.securityId}>
                          <TableCell className="font-medium">{a.securityId}</TableCell>
                          <TableCell>{a.assetClass || '—'}</TableCell>
                          <TableCell>
                            <Input type="number" className="w-20 h-7" min={0} max={100} value={a.targetPct}
                              onChange={e => setForm(p => ({ ...p, allocations: p.allocations.map(x => x.securityId === a.securityId ? { ...x, targetPct: Number(e.target.value) } : x) }))} />
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-6 text-destructive" onClick={() => handleRemoveAllocation(a.securityId)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                        <TableCell>
                          <Badge variant={Math.abs(totalAllocPct - 100) < 0.5 ? 'default' : 'destructive'}>
                            {totalAllocPct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreateModel} disabled={!form.name.trim() || Math.abs(totalAllocPct - 100) > 0.5}>
              {editingModelId ? 'Save & Version' : 'Create Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ ASSIGN DIALOG ═══ */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Portfolios to Model</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Model</Label>
              <Select value={selectedModelId || ''} onValueChange={setSelectedModelId}>
                <SelectTrigger><SelectValue placeholder="Select model..." /></SelectTrigger>
                <SelectContent>
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Select Portfolios</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-3">
                {portfolios.filter(p => !selectedModel?.assignedPortfolioIds.includes(p.id)).map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`assign-${p.id}`}
                      checked={assignPortfolioIds.includes(p.id)}
                      onCheckedChange={checked => {
                        setAssignPortfolioIds(prev => checked ? [...prev, p.id] : prev.filter(id => id !== p.id));
                      }}
                    />
                    <label htmlFor={`assign-${p.id}`} className="text-sm cursor-pointer">
                      {p.portfolio_name} <span className="text-muted-foreground">({p.clients?.client_name})</span>
                    </label>
                  </div>
                ))}
                {portfolios.filter(p => !selectedModel?.assignedPortfolioIds.includes(p.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">All portfolios already assigned</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAssign} disabled={assignPortfolioIds.length === 0}>
              Assign {assignPortfolioIds.length} Portfolio(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
