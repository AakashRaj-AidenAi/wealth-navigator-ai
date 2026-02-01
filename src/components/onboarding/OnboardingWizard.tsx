import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { TypeSelectionStep } from './steps/TypeSelectionStep';
import { DetailsStep } from './steps/DetailsStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { ReviewStep } from './steps/ReviewStep';
import { OnboardingState, ClientType, DuplicateMatch, FormData } from './types';

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
      const filePath = `${clientId}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Document upload error:', uploadError);
        continue;
      }

      // Create document record
      await supabase.from('client_documents').insert({
        client_id: clientId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        document_type: 'kyc',
        uploaded_by: user!.id,
      });
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

      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert(clientPayload)
        .select()
        .single();

      if (clientError) {
        throw clientError;
      }

      // Upload documents if any
      if (state.documents.length > 0) {
        await uploadDocuments(newClient.id);
      }

      // Create onboarding activity
      await supabase.from('client_activities').insert({
        client_id: newClient.id,
        created_by: user.id,
        activity_type: 'meeting',
        title: 'Client Onboarding',
        description: `Complete onboarding process for ${data.client_name.trim()}:\n• Collect KYC documents\n• Risk assessment questionnaire\n• Investment goals discussion\n• Portfolio recommendations`,
        scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Create onboarding task
      await supabase.from('tasks').insert({
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

      // Add prospect tag
      await supabase.from('client_tags').insert({
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
