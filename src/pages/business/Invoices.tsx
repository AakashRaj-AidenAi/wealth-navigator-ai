import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInvoices, useUpsertInvoice, usePayments, useUpsertPayment } from '@/hooks/useBusiness';
import { formatCurrency } from '@/lib/currency';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Plus, Download, Send, CheckCircle2, AlertTriangle, Clock, IndianRupee, DollarSign } from 'lucide-react';
import { format, isPast, startOfMonth, endOfMonth } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RePieChart, Pie, Cell } from 'recharts';

const GST_RATE = 0.18;

const statusConfig: Record<string, { color: string; icon: any }> = {
  draft: { color: 'bg-muted text-muted-foreground', icon: FileText },
  sent: { color: 'bg-blue-500/10 text-blue-500', icon: Send },
  paid: { color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
  overdue: { color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
  partial: { color: 'bg-amber-500/10 text-amber-500', icon: Clock },
};

const CHART_COLORS = ['hsl(43, 74%, 49%)', 'hsl(160, 84%, 39%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)'];

const Invoices = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: records, isLoading } = useInvoices();
  const { data: allPayments } = usePayments();
  const upsertInvoice = useUpsertInvoice();
  const upsertPayment = useUpsertPayment();

  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Form state
  const [form, setForm] = useState({ client_id: '', fee_type: 'retainer', amount: '', gst_included: true, due_date: '', notes: '', recurring_frequency: '' });
  const [paymentForm, setPaymentForm] = useState({ amount_received: '', payment_mode: 'bank_transfer', payment_date: format(new Date(), 'yyyy-MM-dd') });

  const { data: clients } = useQuery({
    queryKey: ['clients-select'],
    queryFn: () => api.get<any[]>('/clients', { fields: 'id,client_name,total_assets', order: 'client_name' }),
  });

  // Analytics
  const analytics = useMemo(() => {
    if (!records) return null;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const paymentsMap: Record<string, number> = {};
    allPayments?.forEach((p: any) => {
      paymentsMap[p.invoice_id] = (paymentsMap[p.invoice_id] || 0) + (p.amount_received || 0);
    });

    let totalOutstanding = 0;
    let totalOverdue = 0;
    let collectedThisMonth = 0;
    let totalBilledThisMonth = 0;

    const byStatus: Record<string, number> = {};
    const byFeeType: Record<string, number> = {};
    const byMonth: Record<string, { billed: number; collected: number }> = {};

    records.forEach((inv: any) => {
      const paid = paymentsMap[inv.id] || 0;
      const outstanding = (inv.total_amount || 0) - paid;
      const isOverdue = inv.due_date && isPast(new Date(inv.due_date)) && inv.status !== 'paid';
      const created = new Date(inv.created_at);
      const monthKey = format(created, 'MMM yy');

      if (inv.status !== 'paid' && outstanding > 0) totalOutstanding += outstanding;
      if (isOverdue) totalOverdue += outstanding;

      if (created >= monthStart && created <= monthEnd) totalBilledThisMonth += inv.total_amount || 0;

      byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
      const ft = (inv as any).fee_type || 'retainer';
      byFeeType[ft] = (byFeeType[ft] || 0) + (inv.total_amount || 0);

      if (!byMonth[monthKey]) byMonth[monthKey] = { billed: 0, collected: 0 };
      byMonth[monthKey].billed += inv.total_amount || 0;
    });

    allPayments?.forEach((p: any) => {
      const pd = new Date(p.payment_date);
      if (pd >= monthStart && pd <= monthEnd) collectedThisMonth += p.amount_received || 0;
      const mk = format(pd, 'MMM yy');
      if (!byMonth[mk]) byMonth[mk] = { billed: 0, collected: 0 };
      byMonth[mk].collected += p.amount_received || 0;
    });

    const efficiency = totalBilledThisMonth > 0 ? (collectedThisMonth / totalBilledThisMonth * 100) : 0;

    const monthlyData = Object.entries(byMonth).slice(-6).map(([month, d]) => ({ month, ...d }));
    const feeTypeData = Object.entries(byFeeType).map(([name, value]) => ({ name, value }));

    return { totalOutstanding, totalOverdue, collectedThisMonth, efficiency, byStatus, monthlyData, feeTypeData, paymentsMap };
  }, [records, allPayments]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    if (activeTab === 'all') return records;
    return records.filter((r: any) => r.status === activeTab);
  }, [records, activeTab]);

  const handleCreate = async () => {
    if (!form.client_id || !form.amount) return;
    const amount = parseFloat(form.amount);
    const gst = form.gst_included ? Math.round(amount * GST_RATE) : 0;
    const total = amount + gst;
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    await upsertInvoice.mutateAsync({
      client_id: form.client_id,
      amount,
      gst,
      total_amount: total,
      invoice_number: invoiceNumber,
      status: 'draft',
      due_date: form.due_date || undefined,
    });
    setShowCreate(false);
    setForm({ client_id: '', fee_type: 'retainer', amount: '', gst_included: true, due_date: '', notes: '', recurring_frequency: '' });
  };

  const handleStatusChange = async (id: string, status: string) => {
    const inv = records?.find((r: any) => r.id === id);
    if (!inv) return;
    await upsertInvoice.mutateAsync({ id, client_id: inv.client_id, amount: inv.amount, total_amount: inv.total_amount, status });
  };

  const handleRecordPayment = async () => {
    if (!showPayment || !paymentForm.amount_received) return;
    await upsertPayment.mutateAsync({
      invoice_id: showPayment,
      amount_received: parseFloat(paymentForm.amount_received),
      payment_mode: paymentForm.payment_mode,
      payment_date: paymentForm.payment_date,
    });

    // Check if fully paid
    const inv = records?.find((r: any) => r.id === showPayment);
    if (inv) {
      const prevPaid = analytics?.paymentsMap[showPayment] || 0;
      const newTotal = prevPaid + parseFloat(paymentForm.amount_received);
      if (newTotal >= inv.total_amount) {
        await handleStatusChange(showPayment, 'paid');
      } else {
        await handleStatusChange(showPayment, 'partial');
      }
    }

    setShowPayment(null);
    setPaymentForm({ amount_received: '', payment_mode: 'bank_transfer', payment_date: format(new Date(), 'yyyy-MM-dd') });
  };

  const generatePDFContent = (inv: any) => {
    const paid = analytics?.paymentsMap[inv.id] || 0;
    const balance = (inv.total_amount || 0) - paid;
    const text = [
      `INVOICE: ${inv.invoice_number || inv.id.slice(0, 8)}`,
      `Date: ${format(new Date(inv.created_at), 'dd MMM yyyy')}`,
      `Due: ${inv.due_date || 'N/A'}`,
      `Client: ${inv.clients?.client_name || '—'}`,
      ``,
      `Amount: ${formatCurrency(inv.amount)}`,
      `GST (18%): ${formatCurrency(inv.gst)}`,
      `Total: ${formatCurrency(inv.total_amount)}`,
      `Paid: ${formatCurrency(paid)}`,
      `Balance: ${formatCurrency(balance)}`,
      `Status: ${inv.status.toUpperCase()}`,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoice_number || 'invoice'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Invoice downloaded' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fee Billing & Invoices</h1>
            <p className="text-muted-foreground">Create, track and manage client invoices</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create New Invoice</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Client</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm(f => ({ ...f, client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fee Type</Label>
                  <Select value={form.fee_type} onValueChange={(v) => setForm(f => ({ ...f, fee_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retainer">Retainer Fee</SelectItem>
                      <SelectItem value="aum_percentage">% of AUM</SelectItem>
                      <SelectItem value="project">Project Fee</SelectItem>
                      <SelectItem value="advisory">Advisory Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (before GST)</Label>
                  <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                  {form.amount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      GST (18%): {formatCurrency(Math.round(parseFloat(form.amount) * GST_RATE))} · 
                      Total: {formatCurrency(parseFloat(form.amount) + Math.round(parseFloat(form.amount) * GST_RATE))}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Recurring</Label>
                  <Select value={form.recurring_frequency || 'none'} onValueChange={(v) => setForm(f => ({ ...f, recurring_frequency: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">One-time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={!form.client_id || !form.amount || upsertInvoice.isPending} className="w-full">
                  {upsertInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Invoice
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analytics?.totalOutstanding ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">Unpaid invoices</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{formatCurrency(analytics?.totalOverdue ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">Past due date</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collected This Month</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analytics?.collectedThisMonth ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">Payments received</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collection Efficiency</CardTitle>
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(analytics?.efficiency ?? 0).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Collected / billed this month</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Billing vs Collection</CardTitle></CardHeader>
                <CardContent>
                  {analytics?.monthlyData && analytics.monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={analytics.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Bar dataKey="billed" name="Billed" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="collected" name="Collected" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[240px] text-muted-foreground">No billing data yet</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Revenue by Fee Type</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center">
                  {analytics?.feeTypeData && analytics.feeTypeData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <RePieChart>
                          <Pie data={analytics.feeTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="value">
                            {analytics.feeTypeData.map((_: any, i: number) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        </RePieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {analytics.feeTypeData.map((d: any, i: number) => (
                          <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            {d.name}: {formatCurrency(d.value)}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">No fee data</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Invoice Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Invoices</CardTitle>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="draft">Draft</TabsTrigger>
                      <TabsTrigger value="sent">Sent</TabsTrigger>
                      <TabsTrigger value="overdue">Overdue</TabsTrigger>
                      <TabsTrigger value="paid">Paid</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {filteredRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-muted-foreground">No invoices found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((r: any) => {
                        const paid = analytics?.paymentsMap[r.id] || 0;
                        const balance = (r.total_amount || 0) - paid;
                        const cfg = statusConfig[r.status] || statusConfig.draft;
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.invoice_number ?? r.id.slice(0, 8)}</TableCell>
                            <TableCell>{r.clients?.client_name ?? '—'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.gst)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(r.total_amount)}</TableCell>
                            <TableCell className="text-right text-primary">{formatCurrency(paid)}</TableCell>
                            <TableCell className="text-right">{balance > 0 ? <span className="text-destructive">{formatCurrency(balance)}</span> : '—'}</TableCell>
                            <TableCell>{r.due_date ? format(new Date(r.due_date), 'dd MMM yy') : '—'}</TableCell>
                            <TableCell><Badge className={cfg.color}>{r.status}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {r.status === 'draft' && (
                                  <Button size="sm" variant="ghost" onClick={() => handleStatusChange(r.id, 'sent')} title="Send">
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {r.status !== 'paid' && (
                                  <Button size="sm" variant="ghost" onClick={() => { setShowPayment(r.id); setPaymentForm(p => ({ ...p, amount_received: String(balance) })); }} title="Record Payment">
                                    <DollarSign className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {r.status !== 'paid' && r.due_date && isPast(new Date(r.due_date)) && r.status !== 'overdue' && (
                                  <Button size="sm" variant="ghost" onClick={() => handleStatusChange(r.id, 'overdue')} title="Mark Overdue">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => generatePDFContent(r)} title="Download">
                                  <Download className="h-3.5 w-3.5" />
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
          </>
        )}

        {/* Record Payment Dialog */}
        <Dialog open={!!showPayment} onOpenChange={() => setShowPayment(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount Received</Label>
                <Input type="number" value={paymentForm.amount_received} onChange={(e) => setPaymentForm(f => ({ ...f, amount_received: e.target.value }))} />
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select value={paymentForm.payment_mode} onValueChange={(v) => setPaymentForm(f => ({ ...f, payment_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Date</Label>
                <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <Button onClick={handleRecordPayment} disabled={!paymentForm.amount_received || upsertPayment.isPending} className="w-full">
                {upsertPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Invoices;
