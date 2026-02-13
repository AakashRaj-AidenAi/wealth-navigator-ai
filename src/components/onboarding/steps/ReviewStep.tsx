import { CheckCircle2, FileText, User, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ClientType, OnboardingFormData } from '../types';

interface ReviewStepProps {
  clientType: ClientType;
  formData: Partial<OnboardingFormData>;
  documents: File[];
}

export const ReviewStep = ({ clientType, formData, documents }: ReviewStepProps) => {
  const data = formData as any;

  const formatFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      client_name: clientType === 'individual' ? 'Full Name' : 'Organization Name',
      legal_name: 'Legal Name',
      email: 'Email',
      phone: 'Phone',
      pan_number: 'PAN Number',
      aadhar_number: 'Aadhaar Number',
      date_of_birth: 'Date of Birth',
      cin_number: 'CIN Number',
      gst_number: 'GST Number',
      registration_date: 'Date of Incorporation',
      business_nature: 'Nature of Business',
      address: 'Address',
      risk_profile: 'Risk Profile',
      authorized_person_name: 'Authorized Person',
      authorized_person_email: 'Authorized Person Email',
      authorized_person_phone: 'Authorized Person Phone',
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const renderValue = (key: string, value: any) => {
    if (!value) return <span className="text-muted-foreground italic">Not provided</span>;
    if (key === 'risk_profile') {
      return <Badge variant="outline" className="capitalize">{value}</Badge>;
    }
    return value;
  };

  const individualFields = [
    'client_name',
    'email',
    'phone',
    'date_of_birth',
    'pan_number',
    'aadhar_number',
    'address',
    'risk_profile',
  ];

  const entityFields = [
    'client_name',
    'legal_name',
    'email',
    'phone',
    'pan_number',
    'cin_number',
    'gst_number',
    'registration_date',
    'business_nature',
    'address',
    'risk_profile',
    'authorized_person_name',
    'authorized_person_email',
    'authorized_person_phone',
  ];

  const fields = clientType === 'individual' ? individualFields : entityFields;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold">Review & Confirm</h2>
        <p className="text-muted-foreground mt-2">
          Please review all the information before submitting
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Client Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {clientType === 'individual' ? (
                <User className="h-5 w-5 text-primary" />
              ) : (
                <Building2 className="h-5 w-5 text-primary" />
              )}
              Client Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-sm capitalize">
              {clientType === 'individual' ? 'Individual Client' : 'Entity / Organization'}
            </Badge>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Client Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field} className={field === 'address' ? 'sm:col-span-2' : ''}>
                  <p className="text-sm text-muted-foreground">{formatFieldLabel(field)}</p>
                  <p className="text-sm font-medium mt-1">{renderValue(field, data[field])}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No documents uploaded. You can add them later.
              </p>
            )}
          </CardContent>
        </Card>

        <Separator />

        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Ready to Submit
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                By clicking "Create Client", you confirm that all the information provided is accurate.
                An onboarding task will be automatically created.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
