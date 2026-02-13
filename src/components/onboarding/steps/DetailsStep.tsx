import { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientType, DuplicateMatch, OnboardingFormData } from '../types';
import { DuplicateWarning } from '../DuplicateWarning';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface DetailsStepProps {
  clientType: ClientType;
  formData: Partial<OnboardingFormData>;
  onFormChange: (data: Partial<OnboardingFormData>) => void;
  onDuplicatesFound: (duplicates: DuplicateMatch[], hasHardBlock: boolean) => void;
  duplicates: DuplicateMatch[];
  hasHardBlock: boolean;
}

export const DetailsStep = ({
  clientType,
  formData,
  onFormChange,
  onDuplicatesFound,
  duplicates,
  hasHardBlock,
}: DetailsStepProps) => {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [dismissedWarning, setDismissedWarning] = useState(false);

  const handleChange = (field: string, value: string) => {
    onFormChange({ ...formData, [field]: value });
    setDismissedWarning(false);
  };

  // Debounced duplicate check
  const checkDuplicates = useCallback(async () => {
    if (!user) return;

    const { client_name, email, phone, pan_number } = formData as any;
    const cin_number = clientType === 'entity' ? (formData as any).cin_number : null;
    const gst_number = clientType === 'entity' ? (formData as any).gst_number : null;

    // Only check if we have enough data
    if (!client_name && !email && !phone && !pan_number && !cin_number && !gst_number) {
      onDuplicatesFound([], false);
      return;
    }

    setIsChecking(true);

    try {
      const data = await api.post<any[]>('/rpc/check_client_duplicates', {
        p_advisor_id: user.id,
        p_client_name: client_name || null,
        p_email: email || null,
        p_phone: phone || null,
        p_pan_number: pan_number || null,
        p_cin_number: cin_number || null,
        p_gst_number: gst_number || null,
      });

      const matches: DuplicateMatch[] = (data || []).map((d: any) => ({
        client_id: d.client_id,
        client_name: d.client_name,
        email: d.email,
        phone: d.phone,
        match_type: d.match_type,
        confidence_score: d.confidence_score,
        is_hard_block: d.is_hard_block,
      }));

      const hasHard = matches.some((m) => m.is_hard_block);
      onDuplicatesFound(matches, hasHard);
    } catch (err) {
      console.error('Duplicate check failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, [user, formData, clientType, onDuplicatesFound]);

  useEffect(() => {
    const timer = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timer);
  }, [checkDuplicates]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold">
          {clientType === 'individual' ? 'Individual Details' : 'Entity Details'}
        </h2>
        <p className="text-muted-foreground mt-2">
          Enter the {clientType === 'individual' ? "client's personal" : "organization's"} information
        </p>
        {isChecking && (
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking for duplicates...
          </div>
        )}
      </div>

      {!dismissedWarning && (
        <DuplicateWarning
          duplicates={duplicates}
          hasHardBlock={hasHardBlock}
          onDismiss={() => setDismissedWarning(true)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Common Fields */}
        <div className="space-y-2">
          <Label htmlFor="client_name">
            {clientType === 'individual' ? 'Full Name' : 'Organization Name'} *
          </Label>
          <Input
            id="client_name"
            value={(formData as any).client_name || ''}
            onChange={(e) => handleChange('client_name', e.target.value)}
            placeholder={clientType === 'individual' ? 'John Doe' : 'ABC Corporation'}
            required
          />
        </div>

        {clientType === 'entity' && (
          <div className="space-y-2">
            <Label htmlFor="legal_name">Registered Legal Name</Label>
            <Input
              id="legal_name"
              value={(formData as any).legal_name || ''}
              onChange={(e) => handleChange('legal_name', e.target.value)}
              placeholder="ABC Corporation Private Limited"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={(formData as any).email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="client@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={(formData as any).phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+91 98765 43210"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pan_number">PAN Number *</Label>
          <Input
            id="pan_number"
            value={(formData as any).pan_number || ''}
            onChange={(e) => handleChange('pan_number', e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
            maxLength={10}
          />
        </div>

        {clientType === 'individual' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="aadhar_number">Aadhaar Number</Label>
              <Input
                id="aadhar_number"
                value={(formData as any).aadhar_number || ''}
                onChange={(e) => handleChange('aadhar_number', e.target.value)}
                placeholder="1234 5678 9012"
                maxLength={14}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={(formData as any).date_of_birth || ''}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="cin_number">CIN Number</Label>
              <Input
                id="cin_number"
                value={(formData as any).cin_number || ''}
                onChange={(e) => handleChange('cin_number', e.target.value.toUpperCase())}
                placeholder="U12345MH2020PTC123456"
                maxLength={21}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst_number">GST Number</Label>
              <Input
                id="gst_number"
                value={(formData as any).gst_number || ''}
                onChange={(e) => handleChange('gst_number', e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_date">Date of Incorporation</Label>
              <Input
                id="registration_date"
                type="date"
                value={(formData as any).registration_date || ''}
                onChange={(e) => handleChange('registration_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_nature">Nature of Business</Label>
              <Input
                id="business_nature"
                value={(formData as any).business_nature || ''}
                onChange={(e) => handleChange('business_nature', e.target.value)}
                placeholder="Manufacturing, IT Services, etc."
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="risk_profile">Risk Profile</Label>
          <Select
            value={(formData as any).risk_profile || 'moderate'}
            onValueChange={(value) => handleChange('risk_profile', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select risk profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
              <SelectItem value="ultra-aggressive">Ultra Aggressive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={(formData as any).address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter full address"
            rows={3}
          />
        </div>

        {clientType === 'entity' && (
          <>
            <div className="md:col-span-2 pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">Authorized Person Details</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorized_person_name">Name</Label>
              <Input
                id="authorized_person_name"
                value={(formData as any).authorized_person_name || ''}
                onChange={(e) => handleChange('authorized_person_name', e.target.value)}
                placeholder="Authorized signatory name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorized_person_email">Email</Label>
              <Input
                id="authorized_person_email"
                type="email"
                value={(formData as any).authorized_person_email || ''}
                onChange={(e) => handleChange('authorized_person_email', e.target.value)}
                placeholder="signatory@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorized_person_phone">Phone</Label>
              <Input
                id="authorized_person_phone"
                value={(formData as any).authorized_person_phone || ''}
                onChange={(e) => handleChange('authorized_person_phone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
