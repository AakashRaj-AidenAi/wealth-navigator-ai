import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, extractItems } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, User, Trash2, Edit, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  is_nominee: boolean;
}

interface Nominee {
  id: string;
  name: string;
  relationship: string;
  percentage: number;
  date_of_birth: string | null;
  address: string | null;
  id_proof_type: string | null;
  id_proof_number: string | null;
}

interface ClientFamilyTabProps {
  clientId: string;
}

export const ClientFamilyTab = ({ clientId }: ClientFamilyTabProps) => {
  const { role } = useAuth();
  const { toast } = useToast();
  
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [nomineeModalOpen, setNomineeModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'family' | 'nominee' } | null>(null);
  const [saving, setSaving] = useState(false);

  // Family form state
  const [familyForm, setFamilyForm] = useState({
    name: '',
    relationship: '',
    date_of_birth: '',
    email: '',
    phone: '',
    is_nominee: false
  });

  // Nominee form state
  const [nomineeForm, setNomineeForm] = useState({
    name: '',
    relationship: '',
    percentage: '',
    date_of_birth: '',
    address: '',
    id_proof_type: '',
    id_proof_number: ''
  });

  const canEdit = role === 'wealth_advisor';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [familyRaw, nomineeRaw] = await Promise.all([
        api.get('/client_family_members', { client_id: clientId }),
        api.get('/client_nominees', { client_id: clientId })
      ]);

      setFamilyMembers(extractItems<FamilyMember>(familyRaw));
      setNominees(extractItems<Nominee>(nomineeRaw));
    } catch (err) {
      console.error('Failed to load family data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const handleAddFamily = async () => {
    if (!familyForm.name || !familyForm.relationship) {
      toast({ title: 'Error', description: 'Name and relationship are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/client_family_members', {
        client_id: clientId,
        name: familyForm.name,
        relationship: familyForm.relationship,
        date_of_birth: familyForm.date_of_birth || null,
        email: familyForm.email || null,
        phone: familyForm.phone || null,
        is_nominee: familyForm.is_nominee
      });
      toast({ title: 'Success', description: 'Family member added' });
      setFamilyModalOpen(false);
      setFamilyForm({ name: '', relationship: '', date_of_birth: '', email: '', phone: '', is_nominee: false });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add family member', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleAddNominee = async () => {
    if (!nomineeForm.name || !nomineeForm.relationship || !nomineeForm.percentage) {
      toast({ title: 'Error', description: 'Name, relationship, and percentage are required', variant: 'destructive' });
      return;
    }

    const totalPercentage = nominees.reduce((sum, n) => sum + n.percentage, 0) + parseFloat(nomineeForm.percentage);
    if (totalPercentage > 100) {
      toast({ title: 'Error', description: 'Total nominee percentage cannot exceed 100%', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/client_nominees', {
        client_id: clientId,
        name: nomineeForm.name,
        relationship: nomineeForm.relationship,
        percentage: parseFloat(nomineeForm.percentage),
        date_of_birth: nomineeForm.date_of_birth || null,
        address: nomineeForm.address || null,
        id_proof_type: nomineeForm.id_proof_type || null,
        id_proof_number: nomineeForm.id_proof_number || null
      });
      toast({ title: 'Success', description: 'Nominee added' });
      setNomineeModalOpen(false);
      setNomineeForm({ name: '', relationship: '', percentage: '', date_of_birth: '', address: '', id_proof_type: '', id_proof_number: '' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add nominee', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    const table = itemToDelete.type === 'family' ? 'client_family_members' : 'client_nominees';
    try {
      await api.delete('/' + table + '/' + itemToDelete.id);
      toast({ title: 'Deleted', description: `${itemToDelete.type === 'family' ? 'Family member' : 'Nominee'} removed` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete', variant: 'destructive' });
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const totalNomineePercentage = nominees.reduce((sum, n) => sum + n.percentage, 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Family Members */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Family Members
          </CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => setFamilyModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {familyMembers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No family members added</p>
          ) : (
            <div className="space-y-3">
              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.relationship}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.is_nominee && (
                      <Badge variant="outline" className="text-xs">Nominee</Badge>
                    )}
                    {canEdit && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => { setItemToDelete({ id: member.id, type: 'family' }); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nominees */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Nominees
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {totalNomineePercentage}% allocated
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setNomineeModalOpen(true)} disabled={totalNomineePercentage >= 100}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {nominees.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No nominees added</p>
          ) : (
            <div className="space-y-3">
              {nominees.map((nominee) => (
                <div key={nominee.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">{nominee.percentage}%</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{nominee.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{nominee.relationship}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => { setItemToDelete({ id: nominee.id, type: 'nominee' }); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Family Modal */}
      <Dialog open={familyModalOpen} onOpenChange={setFamilyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={familyForm.name} onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Relationship *</Label>
                <Select value={familyForm.relationship} onValueChange={(v) => setFamilyForm({ ...familyForm, relationship: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={familyForm.date_of_birth} onChange={(e) => setFamilyForm({ ...familyForm, date_of_birth: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={familyForm.phone} onChange={(e) => setFamilyForm({ ...familyForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={familyForm.email} onChange={(e) => setFamilyForm({ ...familyForm, email: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFamilyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFamily} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Nominee Modal */}
      <Dialog open={nomineeModalOpen} onOpenChange={setNomineeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Nominee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={nomineeForm.name} onChange={(e) => setNomineeForm({ ...nomineeForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Relationship *</Label>
                <Select value={nomineeForm.relationship} onValueChange={(v) => setNomineeForm({ ...nomineeForm, relationship: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Percentage * (max {100 - totalNomineePercentage}%)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max={100 - totalNomineePercentage}
                  value={nomineeForm.percentage} 
                  onChange={(e) => setNomineeForm({ ...nomineeForm, percentage: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={nomineeForm.date_of_birth} onChange={(e) => setNomineeForm({ ...nomineeForm, date_of_birth: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={nomineeForm.address} onChange={(e) => setNomineeForm({ ...nomineeForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID Proof Type</Label>
                <Select value={nomineeForm.id_proof_type} onValueChange={(v) => setNomineeForm({ ...nomineeForm, id_proof_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pan">PAN Card</SelectItem>
                    <SelectItem value="aadhar">Aadhar Card</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="driving_license">Driving License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ID Proof Number</Label>
                <Input value={nomineeForm.id_proof_number} onChange={(e) => setNomineeForm({ ...nomineeForm, id_proof_number: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNomineeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNominee} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Nominee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemToDelete?.type === 'family' ? 'Family Member' : 'Nominee'}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
