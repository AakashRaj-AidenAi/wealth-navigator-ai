import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Briefcase, Plus, RefreshCw, Trash2, Edit, Eye, Layers, ArrowLeftRight,
  TrendingUp, TrendingDown, Building2, DollarSign, Package, ClipboardList, LayoutDashboard, Calculator, Activity, Scale, BookOpen, Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TotalAssetView } from '@/components/portfolio-admin/TotalAssetView';
import { CostBasisView } from '@/components/portfolio-admin/CostBasisView';
import { AccountingPerformanceView } from '@/components/portfolio-admin/AccountingPerformanceView';
import { AdvancedPositionsView } from '@/components/portfolio-admin/AdvancedPositionsView';
import { RebalancingView } from '@/components/portfolio-admin/RebalancingView';
import { ModelPortfolioView } from '@/components/portfolio-admin/ModelPortfolioView';
import { PortfolioAIInsightsPanel } from '@/components/portfolio-admin/PortfolioAIInsightsPanel';

// ─── Types ───
interface Portfolio {
  id: string;
  client_id: string;
  advisor_id: string;
  portfolio_name: string;
  base_currency: string;
  created_at: string;
  clients?: { client_name: string };
}
interface Account {
  id: string;
  portfolio_id: string;
  account_type: string;
  custodian_name: string | null;
  created_at: string;
}
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
interface Transaction {
  id: string;
  portfolio_id: string;
  security_id: string;
  transaction_type: string;
  quantity: number;
  price: number;
  total_amount: number;
  trade_date: string;
  settlement_date: string | null;
  notes: string | null;
  created_at: string;
}
interface ClientOption { id: string; client_name: string; }

const TRANSACTION_TYPES = ['buy', 'sell', 'dividend', 'fee', 'split', 'transfer'];
const ACCOUNT_TYPES = ['brokerage', 'retirement', 'external'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

const txTypeBadge: Record<string, string> = {
  buy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  sell: 'bg-red-500/10 text-red-500 border-red-500/30',
  dividend: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  fee: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  split: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  transfer: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
};

const PortfolioAdmin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('total-assets');
  const [loading, setLoading] = useState(true);

  // Data
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Selected portfolio for detail views
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);

  // Dialogs
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showPositionDialog, setShowPositionDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);

  // Forms
  const [portfolioForm, setPortfolioForm] = useState({ client_id: '', portfolio_name: '', base_currency: 'INR' });
  const [accountForm, setAccountForm] = useState({ portfolio_id: '', account_type: 'brokerage', custodian_name: '' });
  const [positionForm, setPositionForm] = useState({ portfolio_id: '', security_id: '', quantity: '', average_cost: '', current_price: '' });
  const [transactionForm, setTransactionForm] = useState({ portfolio_id: '', security_id: '', transaction_type: 'buy', quantity: '', price: '', total_amount: '', trade_date: '', settlement_date: '', notes: '' });

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [clientsData, portfoliosData, accountsData, positionsData, transactionsData] = await Promise.all([
        api.get<ClientOption[]>('/clients', { advisor_id: user.id, fields: 'id,client_name', order: 'client_name' }),
        api.get<any[]>('/portfolio-admin/portfolios', { advisor_id: user.id, include: 'clients', order: 'created_at.desc' }),
        api.get<any[]>('/portfolio-admin/accounts', { order: 'created_at.desc' }),
        api.get<any[]>('/portfolio-admin/positions', { order: 'created_at.desc' }),
        api.get<any[]>('/portfolio-admin/transactions', { order: 'trade_date.desc' }),
      ]);
      setClients(clientsData || []);
      setPortfolios(portfoliosData || []);
      setAccounts(accountsData || []);
      setPositions(positionsData || []);
      setTransactions(transactionsData || []);
    } catch (err) {
      console.error('Failed to load portfolio admin data:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Portfolio CRUD ───
  const handleSavePortfolio = async () => {
    if (!user || !portfolioForm.client_id || !portfolioForm.portfolio_name) return;
    try {
      if (editingId) {
        await api.put('/portfolio-admin/portfolios/' + editingId, {
          client_id: portfolioForm.client_id,
          portfolio_name: portfolioForm.portfolio_name,
          base_currency: portfolioForm.base_currency,
        });
        toast({ title: 'Portfolio updated' });
      } else {
        await api.post('/portfolio-admin/portfolios', {
          client_id: portfolioForm.client_id,
          advisor_id: user.id,
          portfolio_name: portfolioForm.portfolio_name,
          base_currency: portfolioForm.base_currency,
        });
        toast({ title: 'Portfolio created' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save portfolio', variant: 'destructive' });
      return;
    }
    setShowPortfolioDialog(false);
    setEditingId(null);
    setPortfolioForm({ client_id: '', portfolio_name: '', base_currency: 'INR' });
    fetchAll();
  };

  const handleDeletePortfolio = async (id: string) => {
    try {
      await api.delete('/portfolio-admin/portfolios/' + id);
      toast({ title: 'Portfolio deleted' });
      if (selectedPortfolioId === id) setSelectedPortfolioId(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete portfolio', variant: 'destructive' });
    }
  };

  const handleEditPortfolio = (p: Portfolio) => {
    setEditingId(p.id);
    setPortfolioForm({ client_id: p.client_id, portfolio_name: p.portfolio_name, base_currency: p.base_currency });
    setShowPortfolioDialog(true);
  };

  // ─── Account CRUD ───
  const handleSaveAccount = async () => {
    if (!accountForm.portfolio_id) return;
    try {
      if (editingId) {
        await api.put('/portfolio-admin/accounts/' + editingId, {
          account_type: accountForm.account_type,
          custodian_name: accountForm.custodian_name || null,
        });
        toast({ title: 'Account updated' });
      } else {
        await api.post('/portfolio-admin/accounts', {
          portfolio_id: accountForm.portfolio_id,
          account_type: accountForm.account_type,
          custodian_name: accountForm.custodian_name || null,
        });
        toast({ title: 'Account added' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save account', variant: 'destructive' });
      return;
    }
    setShowAccountDialog(false);
    setEditingId(null);
    setAccountForm({ portfolio_id: '', account_type: 'brokerage', custodian_name: '' });
    fetchAll();
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await api.delete('/portfolio-admin/accounts/' + id);
      toast({ title: 'Account deleted' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete account', variant: 'destructive' });
    }
  };

  // ─── Position CRUD ───
  const handleSavePosition = async () => {
    const pid = positionForm.portfolio_id || selectedPortfolioId;
    if (!pid || !positionForm.security_id) return;
    const posData = {
      portfolio_id: pid,
      security_id: positionForm.security_id,
      quantity: Number(positionForm.quantity) || 0,
      average_cost: Number(positionForm.average_cost) || 0,
      current_price: Number(positionForm.current_price) || 0,
    };
    try {
      if (editingId) {
        await api.put('/portfolio-admin/positions/' + editingId, posData);
        toast({ title: 'Position updated' });
      } else {
        await api.post('/portfolio-admin/positions', posData);
        toast({ title: 'Position added' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save position', variant: 'destructive' });
      return;
    }
    setShowPositionDialog(false);
    setEditingId(null);
    setPositionForm({ portfolio_id: '', security_id: '', quantity: '', average_cost: '', current_price: '' });
    fetchAll();
  };

  const handleDeletePosition = async (id: string) => {
    try {
      await api.delete('/portfolio-admin/positions/' + id);
      toast({ title: 'Position deleted' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete position', variant: 'destructive' });
    }
  };

  // ─── Transaction CRUD ───
  const handleSaveTransaction = async () => {
    const pid = transactionForm.portfolio_id || selectedPortfolioId;
    if (!pid || !transactionForm.security_id) return;
    const txData = {
      portfolio_id: pid,
      security_id: transactionForm.security_id,
      transaction_type: transactionForm.transaction_type,
      quantity: Number(transactionForm.quantity) || 0,
      price: Number(transactionForm.price) || 0,
      total_amount: Number(transactionForm.total_amount) || 0,
      trade_date: transactionForm.trade_date || new Date().toISOString().split('T')[0],
      settlement_date: transactionForm.settlement_date || null,
      notes: transactionForm.notes || null,
    };
    try {
      if (editingId) {
        await api.put('/portfolio-admin/transactions/' + editingId, txData);
        toast({ title: 'Transaction updated' });
      } else {
        await api.post('/portfolio-admin/transactions', txData);
        toast({ title: 'Transaction recorded' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save transaction', variant: 'destructive' });
      return;
    }
    setShowTransactionDialog(false);
    setEditingId(null);
    setTransactionForm({ portfolio_id: '', security_id: '', transaction_type: 'buy', quantity: '', price: '', total_amount: '', trade_date: '', settlement_date: '', notes: '' });
    fetchAll();
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await api.delete('/portfolio-admin/transactions/' + id);
      toast({ title: 'Transaction deleted' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete transaction', variant: 'destructive' });
    }
  };

  // ─── Derived data ───
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const filteredPositions = selectedPortfolioId ? positions.filter(p => p.portfolio_id === selectedPortfolioId) : positions;
  const filteredTransactions = selectedPortfolioId ? transactions.filter(t => t.portfolio_id === selectedPortfolioId) : transactions;
  const filteredAccounts = selectedPortfolioId ? accounts.filter(a => a.portfolio_id === selectedPortfolioId) : accounts;

  const totalMarketValue = filteredPositions.reduce((s, p) => s + Number(p.market_value || 0), 0);
  const totalCostBasis = filteredPositions.reduce((s, p) => s + (Number(p.quantity) * Number(p.average_cost)), 0);
  const totalPnL = totalMarketValue - totalCostBasis;
  const pnlPct = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

  const getPortfolioName = (id: string) => portfolios.find(p => p.id === id)?.portfolio_name || '—';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-7 w-7 text-primary" />
              Portfolio Administration
            </h1>
            <p className="text-muted-foreground mt-1">Track, manage, and record portfolio activity</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Portfolio filter */}
            <Select value={selectedPortfolioId || 'all'} onValueChange={v => setSelectedPortfolioId(v === 'all' ? null : v)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All Portfolios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Portfolios</SelectItem>
                {portfolios.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.portfolio_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Briefcase className="h-3.5 w-3.5" /> Portfolios
              </div>
              <p className="text-2xl font-bold">{portfolios.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Building2 className="h-3.5 w-3.5" /> Accounts
              </div>
              <p className="text-2xl font-bold">{filteredAccounts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Layers className="h-3.5 w-3.5" /> Positions
              </div>
              <p className="text-2xl font-bold">{filteredPositions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <DollarSign className="h-3.5 w-3.5" /> Market Value
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalMarketValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                {totalPnL >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                Unrealized P&L
              </div>
              <p className={cn('text-2xl font-bold', totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {formatCurrency(totalPnL)} <span className="text-sm font-normal">({pnlPct.toFixed(1)}%)</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="total-assets" className="gap-1"><LayoutDashboard className="h-4 w-4" /> Total Asset View</TabsTrigger>
            <TabsTrigger value="overview" className="gap-1"><Briefcase className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="positions" className="gap-1"><Layers className="h-4 w-4" /> Positions</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1"><ArrowLeftRight className="h-4 w-4" /> Transactions</TabsTrigger>
            <TabsTrigger value="cost-basis" className="gap-1"><Calculator className="h-4 w-4" /> Cost Basis</TabsTrigger>
            <TabsTrigger value="accounting" className="gap-1"><Activity className="h-4 w-4" /> Accounting & Performance</TabsTrigger>
            <TabsTrigger value="rebalancing" className="gap-1"><Scale className="h-4 w-4" /> Rebalancing</TabsTrigger>
            <TabsTrigger value="models" className="gap-1"><BookOpen className="h-4 w-4" /> Model Portfolios</TabsTrigger>
            <TabsTrigger value="ai-insights" className="gap-1"><Brain className="h-4 w-4" /> AI Insights</TabsTrigger>
          </TabsList>

          {/* ─── TOTAL ASSET VIEW TAB ─── */}
          <TabsContent value="total-assets" className="space-y-4">
            <TotalAssetView
              portfolios={portfolios}
              positions={positions}
              transactions={transactions}
              displayCurrency={selectedPortfolio?.base_currency || 'INR'}
            />
          </TabsContent>

          {/* ─── OVERVIEW TAB ─── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Portfolios & Accounts</h2>
              <div className="flex gap-2">
                <Button onClick={() => { setEditingId(null); setPortfolioForm({ client_id: '', portfolio_name: '', base_currency: 'INR' }); setShowPortfolioDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> New Portfolio
                </Button>
                <Button variant="outline" onClick={() => { setEditingId(null); setAccountForm({ portfolio_id: selectedPortfolioId || '', account_type: 'brokerage', custodian_name: '' }); setShowAccountDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Account
                </Button>
              </div>
            </div>

            {/* Portfolios Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Portfolios</CardTitle>
              </CardHeader>
              <CardContent>
                {portfolios.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No portfolios yet. Create one to get started.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Portfolio Name</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Positions</TableHead>
                        <TableHead>Market Value</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portfolios.map(p => {
                        const pPositions = positions.filter(pos => pos.portfolio_id === p.id);
                        const pMV = pPositions.reduce((s, pos) => s + Number(pos.market_value || 0), 0);
                        return (
                          <TableRow key={p.id} className={cn(selectedPortfolioId === p.id && 'bg-primary/5')}>
                            <TableCell className="font-medium">{p.portfolio_name}</TableCell>
                            <TableCell>{(p as any).clients?.client_name || '—'}</TableCell>
                            <TableCell><Badge variant="outline">{p.base_currency}</Badge></TableCell>
                            <TableCell>{pPositions.length}</TableCell>
                            <TableCell>{formatCurrency(pMV)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{format(new Date(p.created_at), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedPortfolioId(p.id)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEditPortfolio(p)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePortfolio(p.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Accounts Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Accounts {selectedPortfolio ? `— ${selectedPortfolio.portfolio_name}` : ''}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAccounts.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-6 text-center">No accounts found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Portfolio</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead>Custodian</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map(a => (
                        <TableRow key={a.id}>
                          <TableCell>{getPortfolioName(a.portfolio_id)}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{a.account_type}</Badge></TableCell>
                          <TableCell>{a.custodian_name || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{format(new Date(a.created_at), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteAccount(a.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── POSITIONS TAB ─── */}
          <TabsContent value="positions" className="space-y-4">
            <AdvancedPositionsView
              positions={positions}
              selectedPortfolioId={selectedPortfolioId}
              getPortfolioName={getPortfolioName}
              onAddPosition={() => {
                setEditingId(null);
                setPositionForm({ portfolio_id: selectedPortfolioId || '', security_id: '', quantity: '', average_cost: '', current_price: '' });
                setShowPositionDialog(true);
              }}
              onEditPosition={(pos) => {
                setEditingId(pos.id);
                setPositionForm({ portfolio_id: pos.portfolio_id, security_id: pos.security_id, quantity: String(pos.quantity), average_cost: String(pos.average_cost), current_price: String(pos.current_price) });
                setShowPositionDialog(true);
              }}
              onDeletePosition={handleDeletePosition}
            />
          </TabsContent>

          {/* ─── TRANSACTIONS TAB ─── */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Transaction Ledger {selectedPortfolio ? `— ${selectedPortfolio.portfolio_name}` : ''}</h2>
              <Button onClick={() => { setEditingId(null); setTransactionForm({ portfolio_id: selectedPortfolioId || '', security_id: '', transaction_type: 'buy', quantity: '', price: '', total_amount: '', trade_date: new Date().toISOString().split('T')[0], settlement_date: '', notes: '' }); setShowTransactionDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Record Transaction
              </Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                {filteredTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No transactions recorded.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Security</TableHead>
                        {!selectedPortfolioId && <TableHead>Portfolio</TableHead>}
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Settlement</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm">{format(new Date(tx.trade_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('capitalize', txTypeBadge[tx.transaction_type] || '')}>{tx.transaction_type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{tx.security_id}</TableCell>
                          {!selectedPortfolioId && <TableCell className="text-muted-foreground">{getPortfolioName(tx.portfolio_id)}</TableCell>}
                          <TableCell className="text-right">{Number(tx.quantity).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(tx.price))}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(tx.total_amount))}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{tx.settlement_date ? format(new Date(tx.settlement_date), 'dd MMM') : '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => {
                                setEditingId(tx.id);
                                setTransactionForm({
                                  portfolio_id: tx.portfolio_id, security_id: tx.security_id, transaction_type: tx.transaction_type,
                                  quantity: String(tx.quantity), price: String(tx.price), total_amount: String(tx.total_amount),
                                  trade_date: tx.trade_date, settlement_date: tx.settlement_date || '', notes: tx.notes || '',
                                });
                                setShowTransactionDialog(true);
                              }}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteTransaction(tx.id)}>
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
          </TabsContent>

          {/* ─── COST BASIS TAB ─── */}
          <TabsContent value="cost-basis" className="space-y-4">
            <CostBasisView
              transactions={transactions}
              positions={positions}
              selectedPortfolioId={selectedPortfolioId}
              getPortfolioName={getPortfolioName}
            />
          </TabsContent>

          {/* ─── ACCOUNTING & PERFORMANCE TAB ─── */}
          <TabsContent value="accounting" className="space-y-4">
            <AccountingPerformanceView
              transactions={transactions}
              positions={positions}
              selectedPortfolioId={selectedPortfolioId}
              getPortfolioName={getPortfolioName}
            />
          </TabsContent>

          {/* ─── REBALANCING TAB ─── */}
          <TabsContent value="rebalancing" className="space-y-4">
            <RebalancingView
              portfolios={portfolios}
              positions={positions}
              selectedPortfolioId={selectedPortfolioId}
            />
          </TabsContent>

          {/* ─── MODEL PORTFOLIOS TAB ─── */}
          <TabsContent value="models" className="space-y-4">
            <ModelPortfolioView
              portfolios={portfolios}
              positions={positions}
              selectedPortfolioId={selectedPortfolioId}
            />
          </TabsContent>

          {/* ─── AI INSIGHTS TAB ─── */}
          <TabsContent value="ai-insights" className="space-y-4">
            <PortfolioAIInsightsPanel />
          </TabsContent>
        </Tabs>

        {/* ─── DIALOGS ─── */}

        {/* Portfolio Dialog */}
        <Dialog open={showPortfolioDialog} onOpenChange={setShowPortfolioDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? 'Edit Portfolio' : 'New Portfolio'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client</Label>
                <Select value={portfolioForm.client_id} onValueChange={v => setPortfolioForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Portfolio Name</Label>
                <Input value={portfolioForm.portfolio_name} onChange={e => setPortfolioForm(f => ({ ...f, portfolio_name: e.target.value }))} placeholder="e.g. Growth Portfolio" />
              </div>
              <div>
                <Label>Base Currency</Label>
                <Select value={portfolioForm.base_currency} onValueChange={v => setPortfolioForm(f => ({ ...f, base_currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSavePortfolio}>{editingId ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Account Dialog */}
        <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Portfolio</Label>
                <Select value={accountForm.portfolio_id} onValueChange={v => setAccountForm(f => ({ ...f, portfolio_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select portfolio" /></SelectTrigger>
                  <SelectContent>{portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.portfolio_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Account Type</Label>
                <Select value={accountForm.account_type} onValueChange={v => setAccountForm(f => ({ ...f, account_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Custodian Name</Label>
                <Input value={accountForm.custodian_name} onChange={e => setAccountForm(f => ({ ...f, custodian_name: e.target.value }))} placeholder="e.g. Zerodha, ICICI Direct" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSaveAccount}>Add Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Position Dialog */}
        <Dialog open={showPositionDialog} onOpenChange={setShowPositionDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? 'Edit Position' : 'Add Position'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {!selectedPortfolioId && (
                <div>
                  <Label>Portfolio</Label>
                  <Select value={positionForm.portfolio_id} onValueChange={v => setPositionForm(f => ({ ...f, portfolio_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select portfolio" /></SelectTrigger>
                    <SelectContent>{portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.portfolio_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Security ID / Symbol</Label>
                <Input value={positionForm.security_id} onChange={e => setPositionForm(f => ({ ...f, security_id: e.target.value }))} placeholder="e.g. RELIANCE, INFY" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" value={positionForm.quantity} onChange={e => setPositionForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div>
                  <Label>Avg Cost</Label>
                  <Input type="number" value={positionForm.average_cost} onChange={e => setPositionForm(f => ({ ...f, average_cost: e.target.value }))} />
                </div>
                <div>
                  <Label>Current Price</Label>
                  <Input type="number" value={positionForm.current_price} onChange={e => setPositionForm(f => ({ ...f, current_price: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSavePosition}>{editingId ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Dialog */}
        <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? 'Edit Transaction' : 'Record Transaction'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {!selectedPortfolioId && (
                <div>
                  <Label>Portfolio</Label>
                  <Select value={transactionForm.portfolio_id} onValueChange={v => setTransactionForm(f => ({ ...f, portfolio_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select portfolio" /></SelectTrigger>
                    <SelectContent>{portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.portfolio_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Security ID</Label>
                  <Input value={transactionForm.security_id} onChange={e => setTransactionForm(f => ({ ...f, security_id: e.target.value }))} placeholder="e.g. TCS" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={transactionForm.transaction_type} onValueChange={v => setTransactionForm(f => ({ ...f, transaction_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TRANSACTION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Quantity</Label><Input type="number" value={transactionForm.quantity} onChange={e => setTransactionForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><Label>Price</Label><Input type="number" value={transactionForm.price} onChange={e => setTransactionForm(f => ({ ...f, price: e.target.value }))} /></div>
                <div><Label>Total Amount</Label><Input type="number" value={transactionForm.total_amount} onChange={e => setTransactionForm(f => ({ ...f, total_amount: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Trade Date</Label><Input type="date" value={transactionForm.trade_date} onChange={e => setTransactionForm(f => ({ ...f, trade_date: e.target.value }))} /></div>
                <div><Label>Settlement Date</Label><Input type="date" value={transactionForm.settlement_date} onChange={e => setTransactionForm(f => ({ ...f, settlement_date: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={transactionForm.notes} onChange={e => setTransactionForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSaveTransaction}>{editingId ? 'Update' : 'Record'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default PortfolioAdmin;
