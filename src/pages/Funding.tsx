import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import {
  Wallet,
  Plus,
  RefreshCw,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Landmark,
  History,
  IndianRupee,
  Trash2,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';

// Types
interface FundingAccount {
  id: string;
  client_id: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  verification_status: string;
  default_account: boolean;
  created_at: string;
  clients?: { client_name: string };
}

interface FundingRequest {
  id: string;
  client_id: string;
  funding_account_id: string | null;
  funding_type: string;
  amount: number;
  status: string;
  trade_reference: string | null;
  notes: string | null;
  initiated_by: string;
  created_at: string;
  clients?: { client_name: string };
  funding_accounts?: { bank_name: string; account_number: string } | null;
}

interface CashBalance {
  id: string;
  client_id: string;
  available_cash: number;
  pending_cash: number;
  last_updated: string;
  clients?: { client_name: string };
}

interface ClientOption {
  id: string;
  client_name: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  Initiated: { icon: Clock, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  Pending: { icon: AlertCircle, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  Completed: { icon: CheckCircle2, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  Failed: { icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/20' },
  pending: { icon: Clock, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  verified: { icon: CheckCircle2, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  rejected: { icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] || statusConfig['pending'];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={config.color}>
      <Icon className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  );
};

const Funding = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [accounts, setAccounts] = useState<FundingAccount[]>([]);
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [balances, setBalances] = useState<CashBalance[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [accountForm, setAccountForm] = useState({ client_id: '', bank_name: '', account_number: '', account_type: 'savings', default_account: false });
  const [requestForm, setRequestForm] = useState({ client_id: '', funding_account_id: '', funding_type: 'ACH', amount: '', trade_reference: '', notes: '' });
  const [balanceForm, setBalanceForm] = useState({ client_id: '', available_cash: '', pending_cash: '' });

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const [clientsRes, accountsRes, requestsRes, balancesRes] = await Promise.all([
      supabase.from('clients').select('id, client_name').eq('advisor_id', user.id).order('client_name'),
      supabase.from('funding_accounts').select('*, clients(client_name)').eq('advisor_id', user.id).order('created_at', { ascending: false }),
      supabase.from('funding_requests').select('*, clients(client_name), funding_accounts(bank_name, account_number)').eq('initiated_by', user.id).order('created_at', { ascending: false }),
      supabase.from('cash_balances').select('*, clients(client_name)').eq('advisor_id', user.id).order('last_updated', { ascending: false }),
    ]);
    setClients(clientsRes.data || []);
    setAccounts((accountsRes.data as any) || []);
    setRequests((requestsRes.data as any) || []);
    setBalances((balancesRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const handleAddAccount = async () => {
    if (!user || !accountForm.client_id || !accountForm.bank_name || !accountForm.account_number) return;
    const { error } = await supabase.from('funding_accounts').insert({
      client_id: accountForm.client_id,
      bank_name: accountForm.bank_name,
      account_number: accountForm.account_number,
      account_type: accountForm.account_type,
      default_account: accountForm.default_account,
      advisor_id: user.id,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Account added' });
    setShowAccountDialog(false);
    setAccountForm({ client_id: '', bank_name: '', account_number: '', account_type: 'savings', default_account: false });
    fetchAll();
  };

  const handleInitiateRequest = async () => {
    if (!user || !requestForm.client_id || !requestForm.amount) return;
    const { error } = await supabase.from('funding_requests').insert({
      client_id: requestForm.client_id,
      funding_account_id: requestForm.funding_account_id || null,
      funding_type: requestForm.funding_type,
      amount: parseFloat(requestForm.amount),
      trade_reference: requestForm.trade_reference || null,
      notes: requestForm.notes || null,
      initiated_by: user.id,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Funding request initiated' });
    setShowRequestDialog(false);
    setRequestForm({ client_id: '', funding_account_id: '', funding_type: 'ACH', amount: '', trade_reference: '', notes: '' });
    fetchAll();
  };

  const handleUpdateRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('funding_requests').update({ status }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Status updated to ${status}` });
    fetchAll();
  };

  const handleUpsertBalance = async () => {
    if (!user || !balanceForm.client_id) return;
    const existing = balances.find(b => b.client_id === balanceForm.client_id);
    if (existing) {
      const { error } = await supabase.from('cash_balances').update({
        available_cash: parseFloat(balanceForm.available_cash) || 0,
        pending_cash: parseFloat(balanceForm.pending_cash) || 0,
        last_updated: new Date().toISOString(),
      }).eq('id', existing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    } else {
      const { error } = await supabase.from('cash_balances').insert({
        client_id: balanceForm.client_id,
        available_cash: parseFloat(balanceForm.available_cash) || 0,
        pending_cash: parseFloat(balanceForm.pending_cash) || 0,
        advisor_id: user.id,
      });
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    }
    toast({ title: 'Cash balance saved' });
    setShowBalanceDialog(false);
    setBalanceForm({ client_id: '', available_cash: '', pending_cash: '' });
    fetchAll();
  };

  const handleDeleteAccount = async (id: string) => {
    const { error } = await supabase.from('funding_accounts').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Account removed' });
    fetchAll();
  };

  const maskAccount = (num: string) => {
    if (num.length <= 4) return num;
    return '••••' + num.slice(-4);
  };

  const totalAvailableCash = balances.reduce((s, b) => s + Number(b.available_cash), 0);
  const totalPendingCash = balances.reduce((s, b) => s + Number(b.pending_cash), 0);
  const pendingRequests = requests.filter(r => r.status === 'Initiated' || r.status === 'Pending').length;
  const completedRequests = requests.filter(r => r.status === 'Completed').length;

  const clientAccounts = accounts.filter(a => a.client_id === requestForm.client_id);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Funding & Cash Management
            </h1>
            <p className="text-muted-foreground">Track funding accounts, initiate transfers, and manage client cash balances.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Available Cash</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalAvailableCash)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Cash</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPendingCash)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-2xl font-bold">{pendingRequests}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Linked Accounts</p>
                  <p className="text-2xl font-bold">{accounts.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="dashboard">
              <Wallet className="h-4 w-4 mr-1.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="initiate">
              <ArrowUpRight className="h-4 w-4 mr-1.5" /> Initiate Funding
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-1.5" /> Funding History
            </TabsTrigger>
            <TabsTrigger value="ledger">
              <IndianRupee className="h-4 w-4 mr-1.5" /> Cash Ledger
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Linked Funding Accounts</CardTitle>
                  <CardDescription>Manage bank accounts linked to your clients</CardDescription>
                </div>
                <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add Account</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Funding Account</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Client</Label>
                        <Select value={accountForm.client_id} onValueChange={v => setAccountForm(p => ({ ...p, client_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Bank Name</Label>
                        <Input value={accountForm.bank_name} onChange={e => setAccountForm(p => ({ ...p, bank_name: e.target.value }))} placeholder="e.g. HDFC Bank" />
                      </div>
                      <div>
                        <Label>Account Number</Label>
                        <Input value={accountForm.account_number} onChange={e => setAccountForm(p => ({ ...p, account_number: e.target.value }))} placeholder="Account number" />
                      </div>
                      <div>
                        <Label>Account Type</Label>
                        <Select value={accountForm.account_type} onValueChange={v => setAccountForm(p => ({ ...p, account_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="current">Current</SelectItem>
                            <SelectItem value="demat">Demat</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <Button onClick={handleAddAccount}>Add Account</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No funding accounts linked yet. Add one to get started.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{(a as any).clients?.client_name || '—'}</TableCell>
                          <TableCell>{a.bank_name}</TableCell>
                          <TableCell className="font-mono text-sm">{maskAccount(a.account_number)}</TableCell>
                          <TableCell className="capitalize">{a.account_type}</TableCell>
                          <TableCell><StatusBadge status={a.verification_status} /></TableCell>
                          <TableCell>{a.default_account ? <Badge variant="secondary">Default</Badge> : '—'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAccount(a.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Initiate Funding Tab */}
          <TabsContent value="initiate">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Initiate Funding Request</CardTitle>
                  <CardDescription>Create a new funding transfer for a client</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                  <div>
                    <Label>Client</Label>
                    <Select value={requestForm.client_id} onValueChange={v => setRequestForm(p => ({ ...p, client_id: v, funding_account_id: '' }))}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Funding Account</Label>
                    <Select value={requestForm.funding_account_id} onValueChange={v => setRequestForm(p => ({ ...p, funding_account_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {clientAccounts.length === 0 ? (
                          <SelectItem value="none" disabled>No accounts linked</SelectItem>
                        ) : clientAccounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.bank_name} — {maskAccount(a.account_number)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Funding Type</Label>
                    <Select value={requestForm.funding_type} onValueChange={v => setRequestForm(p => ({ ...p, funding_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACH">ACH</SelectItem>
                        <SelectItem value="Wire">Wire</SelectItem>
                        <SelectItem value="TOA">TOA (Transfer of Assets)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input type="number" value={requestForm.amount} onChange={e => setRequestForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Trade Reference (Optional)</Label>
                    <Input value={requestForm.trade_reference} onChange={e => setRequestForm(p => ({ ...p, trade_reference: e.target.value }))} placeholder="e.g. ORD-12345" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea value={requestForm.notes} onChange={e => setRequestForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." rows={3} />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={handleInitiateRequest} disabled={!requestForm.client_id || !requestForm.amount}>
                      <ArrowUpRight className="h-4 w-4 mr-1.5" /> Initiate Request
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Funding History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Funding History</CardTitle>
                <CardDescription>All funding requests and their statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No funding requests yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Trade Ref</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}</TableCell>
                          <TableCell className="font-medium">{(r as any).clients?.client_name || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{r.funding_type}</Badge></TableCell>
                          <TableCell className="font-semibold">{formatCurrency(Number(r.amount))}</TableCell>
                          <TableCell className="text-sm">{(r as any).funding_accounts ? `${(r as any).funding_accounts.bank_name} ${maskAccount((r as any).funding_accounts.account_number)}` : '—'}</TableCell>
                          <TableCell className="font-mono text-sm">{r.trade_reference || '—'}</TableCell>
                          <TableCell><StatusBadge status={r.status} /></TableCell>
                          <TableCell>
                            {(r.status === 'Initiated' || r.status === 'Pending') && (
                              <div className="flex gap-1">
                                {r.status === 'Initiated' && (
                                  <Button size="sm" variant="outline" onClick={() => handleUpdateRequestStatus(r.id, 'Pending')}>Mark Pending</Button>
                                )}
                                <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleUpdateRequestStatus(r.id, 'Completed')}>Complete</Button>
                                <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleUpdateRequestStatus(r.id, 'Failed')}>Fail</Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Ledger Tab */}
          <TabsContent value="ledger">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cash Ledger</CardTitle>
                  <CardDescription>Available and pending cash per client</CardDescription>
                </div>
                <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add / Update Balance</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Set Cash Balance</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Client</Label>
                        <Select value={balanceForm.client_id} onValueChange={v => {
                          const existing = balances.find(b => b.client_id === v);
                          setBalanceForm({
                            client_id: v,
                            available_cash: existing ? String(existing.available_cash) : '',
                            pending_cash: existing ? String(existing.pending_cash) : '',
                          });
                        }}>
                          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Available Cash (₹)</Label>
                        <Input type="number" value={balanceForm.available_cash} onChange={e => setBalanceForm(p => ({ ...p, available_cash: e.target.value }))} placeholder="0.00" />
                      </div>
                      <div>
                        <Label>Pending Cash (₹)</Label>
                        <Input type="number" value={balanceForm.pending_cash} onChange={e => setBalanceForm(p => ({ ...p, pending_cash: e.target.value }))} placeholder="0.00" />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <Button onClick={handleUpsertBalance}>Save Balance</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {balances.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No cash balances recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Available Cash</TableHead>
                        <TableHead>Pending Cash</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balances.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{(b as any).clients?.client_name || '—'}</TableCell>
                          <TableCell className="text-green-600 font-semibold">{formatCurrency(Number(b.available_cash))}</TableCell>
                          <TableCell className="text-yellow-600">{formatCurrency(Number(b.pending_cash))}</TableCell>
                          <TableCell className="font-bold">{formatCurrency(Number(b.available_cash) + Number(b.pending_cash))}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(b.last_updated), 'dd MMM yyyy, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Funding;
