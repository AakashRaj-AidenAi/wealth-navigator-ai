import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Client {
  id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  total_assets: number;
  risk_profile: string;
  status: string;
  date_of_birth: string | null;
  anniversary_date: string | null;
  kyc_expiry_date: string | null;
  address: string | null;
  pan_number: string | null;
  aadhar_number: string | null;
}

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onSuccess?: () => void;
}

export const EditClientModal = ({ open, onOpenChange, client, onSuccess }: EditClientModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    client_name: '',
    email: '',
    phone: '',
    total_assets: '',
    risk_profile: 'moderate',
    status: 'active',
    date_of_birth: '',
    anniversary_date: '',
    kyc_expiry_date: '',
    address: '',
    pan_number: '',
    aadhar_number: ''
  });

  useEffect(() => {
    if (client) {
      setForm({
        client_name: client.client_name,
        email: client.email || '',
        phone: client.phone || '',
        total_assets: client.total_assets?.toString() || '',
        risk_profile: client.risk_profile || 'moderate',
        status: client.status || 'active',
        date_of_birth: client.date_of_birth || '',
        anniversary_date: client.anniversary_date || '',
        kyc_expiry_date: client.kyc_expiry_date || '',
        address: client.address || '',
        pan_number: client.pan_number || '',
        aadhar_number: client.aadhar_number || ''
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.client_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Client name is required.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('clients')
      .update({
        client_name: form.client_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        total_assets: form.total_assets ? parseFloat(form.total_assets) : 0,
        risk_profile: form.risk_profile,
        status: form.status,
        date_of_birth: form.date_of_birth || null,
        anniversary_date: form.anniversary_date || null,
        kyc_expiry_date: form.kyc_expiry_date || null,
        address: form.address.trim() || null,
        pan_number: form.pan_number.trim() || null,
        aadhar_number: form.aadhar_number.trim() || null
      })
      .eq('id', client.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Client Updated',
        description: `${form.client_name} has been updated successfully.`
      });
      onOpenChange(false);
      onSuccess?.();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="kyc">KYC Details</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Client Name *</Label>
                  <Input
                    id="client-name"
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total-assets">Total Assets ($)</Label>
                  <Input
                    id="total-assets"
                    type="number"
                    value={form.total_assets}
                    onChange={(e) => setForm({ ...form, total_assets: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risk-profile">Risk Profile</Label>
                  <Select value={form.risk_profile} onValueChange={(v) => setForm({ ...form, risk_profile: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                      <SelectItem value="ultra-aggressive">Ultra Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anniversary">Anniversary Date</Label>
                  <Input
                    id="anniversary"
                    type="date"
                    value={form.anniversary_date}
                    onChange={(e) => setForm({ ...form, anniversary_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Enter full address"
                />
              </div>
            </TabsContent>

            <TabsContent value="kyc" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pan">PAN Number</Label>
                  <Input
                    id="pan"
                    value={form.pan_number}
                    onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadhar">Aadhar Number</Label>
                  <Input
                    id="aadhar"
                    value={form.aadhar_number}
                    onChange={(e) => setForm({ ...form, aadhar_number: e.target.value })}
                    placeholder="1234 5678 9012"
                    maxLength={14}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kyc-expiry">KYC Expiry Date</Label>
                <Input
                  id="kyc-expiry"
                  type="date"
                  value={form.kyc_expiry_date}
                  onChange={(e) => setForm({ ...form, kyc_expiry_date: e.target.value })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-gold hover:opacity-90" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
