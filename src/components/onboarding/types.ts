import { Database } from '@/integrations/supabase/types';

export type ClientType = Database['public']['Enums']['client_type'];

export interface DuplicateMatch {
  client_id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  match_type: string;
  confidence_score: number;
  is_hard_block: boolean;
}

export interface IndividualFormData {
  client_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  pan_number: string;
  aadhar_number: string;
  address: string;
  risk_profile: string;
}

export interface EntityFormData {
  client_name: string;
  legal_name: string;
  email: string;
  phone: string;
  pan_number: string;
  cin_number: string;
  gst_number: string;
  registration_date: string;
  business_nature: string;
  address: string;
  authorized_person_name: string;
  authorized_person_email: string;
  authorized_person_phone: string;
  risk_profile: string;
}

export type FormData = IndividualFormData | EntityFormData;

export interface OnboardingState {
  step: number;
  clientType: ClientType | null;
  formData: Partial<FormData>;
  documents: File[];
  duplicates: DuplicateMatch[];
  hasHardBlock: boolean;
}
