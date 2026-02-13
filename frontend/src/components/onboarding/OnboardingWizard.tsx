import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

import { TypeSelectionStep } from './steps/TypeSelectionStep';
import { DetailsStep } from './steps/DetailsStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { ReviewStep } from './steps/ReviewStep';
import { OnboardingState, ClientType, DuplicateMatch, OnboardingFormData } from './types';

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 1, title: 'Client Type' },
  { id: 2, title: 'Details' },
  { id: 3, title: 'Documents' },
  { id: 4, title: 'Review' },
];

export const OnboardingWizard = ({ open, onOpenChange, onSuccess }: OnboardingWizardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [state, setState] = useState<OnboardingState>({
    step: 1,
    clientType: null,
    formData: { risk_profile: 'moderate' },
    documents: [],
    duplicates: [],
    hasHardBlock: false,
  });

  const resetState = () => {
    setState({
      step: 1,
      clientType: null,
      formData: { risk_profile: 'moderate' },
      documents: [],
      duplicates: [],
      hasHardBlock: false,
    });
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleNext = () => {
    if (state.step < 4) {
      setState((prev) => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      setState((prev) => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const handleTypeSelect = (type: ClientType) => {
    setState((prev) => ({
      ...prev,
      clientType: type,
      formData: { risk_profile: 'moderate' },
      duplicates: [],
      hasHardBlock: false,
    }));
  };

  const handleFormChange = (data: Partial<FormData>) => {
    setState((prev) => ({ ...prev, formData: data }));
  };

  const handleDuplicatesFound = (duplicates: DuplicateMatch[], hasHardBlock: boolean) => {
    setState((prev) => ({ ...prev, duplicates, hasHardBlock }));
  };

  const handleDocumentsChange = (documents: File[]) => {
    setState((prev) => ({ ...prev, documents }));
  };

  const canProceed = (): boolean => {
    switch (state.step) {
      case 1:
        return state.clientType !== null;
      case 2:
        const data = state.formData as any;
        if (state.hasHardBlock) return false;
        return !!(data.client_name?.trim() && data.pan_number?.trim());
      case 3:
        return true; // Documents are optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  const uploadDocuments = async (clientId: string) => {
    for (const file of state.documents) {
      try {
        // Upload file via API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('client_id', clientId);
        formData.append('document_type', 'kyc');

        await fetch(`${import.meta.env.VITE_API_URL || '/api'}/client_documents/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData,
        });
      } catch (err) {
        console.error('Document upload error:', err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user || !state.clientType) return;

    setLoading(true);

    try {
      const data = state.formData as any;

      // Create client
      const clientPayload: any = {
        advisor_id: user.id,
        client_name: data.client_name.trim(),
        client_type: state.clientType,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        pan_number: data.pan_number?.trim() || null,
        address: data.address?.trim() || null,
        risk_profile: data.risk_profile || 'moderate',
        status: 'onboarding',
      };

      if (state.clientType === 'individual') {
        clientPayload.date_of_birth = data.date_of_birth || null;
        clientPayload.aadhar_number = data.aadhar_number?.trim() || null;
      } else {
        clientPayload.legal_name = data.legal_name?.trim() || null;
        clientPayload.cin_number = data.cin_number?.trim() || null;
        clientPayload.gst_number = data.gst_number?.trim() || null;
        clientPayload.registration_date = data.registration_date || null;
        clientPayload.business_nature = data.business_nature?.trim() || null;
        clientPayload.authorized_person_name = data.authorized_person_name?.trim() || null;
        clientPayload.authorized_person_email = data.authorized_person_email?.trim() || null;
        clientPayload.authorized_person_phone = data.authorized_person_phone?.trim() || null;
      }

      const newClient = await api.post<any>('/clients', clientPayload);

      if (!newClient) {
        throw new Error('Failed to create client');
      }

      // Upload documents if any
      if (state.documents.length > 0) {
        await uploadDocuments(newClient.id);
      }

      // Create onboarding activity
      await api.post('/client_activities', {
        client_id: newClient.id,
        created_by: user.id,
        activity_type: 'meeting',
        title: 'Client Onboarding',
        description: `Complete onboarding process for ${data.client_name.trim()}:\n• Collect KYC documents\n• Risk assessment questionnaire\n• Investment goals discussion\n• Portfolio recommendations`,
        scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Create onboarding task
      await api.post('/tasks', {
        title: `Onboarding: ${data.client_name.trim()}`,
        description: `Complete client onboarding:\n• Collect KYC documents\n• Risk assessment questionnaire\n• Investment goals discussion\n• Portfolio recommendations`,
        priority: 'high',
        status: 'todo',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        client_id: newClient.id,
        trigger_type: 'new_client',
        trigger_reference_id: newClient.id,
        assigned_to: user.id,
        created_by: user.id,
      });

      // Create risk profiling task
      await api.post('/tasks', {
        title: `Risk Profiling: ${data.client_name.trim()}`,
        description: `Complete risk profiling assessment to determine client's risk appetite and recommended portfolio allocation.`,
        priority: 'high',
        status: 'todo',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        client_id: newClient.id,
        trigger_type: 'new_client',
        trigger_reference_id: newClient.id,
        assigned_to: user.id,
        created_by: user.id,
      });

      // Create annual risk re-profiling reminder
      await api.post('/client_reminders', {
        client_id: newClient.id,
        created_by: user.id,
        reminder_type: 'review_meeting',
        title: 'Annual Risk Profile Review',
        description: 'Re-assess risk profile to ensure investment strategy aligns with current financial situation and goals.',
        reminder_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_recurring: true,
        recurrence_pattern: 'yearly',
      });

      // Add prospect tag
      await api.post('/client_tags', {
        client_id: newClient.id,
        tag: 'prospect',
      });

      toast({
        title: 'Client Created Successfully',
        description: `${data.client_name} has been added with an onboarding task.`,
      });

      handleClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create client. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = (state.step / 4) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Client</DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 ${
                  state.step >= step.id ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    state.step > step.id
                      ? 'bg-primary text-primary-foreground'
                      : state.step === step.id
                      ? 'border-2 border-primary text-primary'
                      : 'border-2 border-muted text-muted-foreground'
                  }`}
                >
                  {state.step > step.id ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="py-6">
          {state.step === 1 && (
            <TypeSelectionStep
              selectedType={state.clientType}
              onSelectType={handleTypeSelect}
            />
          )}

          {state.step === 2 && state.clientType && (
            <DetailsStep
              clientType={state.clientType}
              formData={state.formData}
              onFormChange={handleFormChange}
              onDuplicatesFound={handleDuplicatesFound}
              duplicates={state.duplicates}
              hasHardBlock={state.hasHardBlock}
            />
          )}

          {state.step === 3 && state.clientType && (
            <DocumentsStep
              clientType={state.clientType}
              documents={state.documents}
              onDocumentsChange={handleDocumentsChange}
            />
          )}

          {state.step === 4 && state.clientType && (
            <ReviewStep
              clientType={state.clientType}
              formData={state.formData}
              documents={state.documents}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={state.step === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {state.step < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className="bg-gradient-gold hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Client'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
