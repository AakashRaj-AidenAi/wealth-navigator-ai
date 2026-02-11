export interface SegmentFilterCriteria {
  aum_min?: number;
  aum_max?: number;
  risk_profiles?: string[];
  tags?: string[];
  location?: string;
  last_interaction_before?: string;
  last_interaction_after?: string;
  status?: string[];
  client_type?: string[];
  lead_stages?: string[];
}

export interface CampaignSegment {
  id: string;
  name: string;
  description: string | null;
  filter_criteria: SegmentFilterCriteria;
  is_auto_updating: boolean;
  client_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const RISK_PROFILE_OPTIONS = [
  'very_conservative',
  'conservative',
  'moderate',
  'aggressive',
  'very_aggressive',
] as const;

export const TAG_OPTIONS = [
  'hni', 'uhni', 'prospect', 'active', 'dormant', 'vip', 'nri',
] as const;

export const CLIENT_STATUS_OPTIONS = [
  'active', 'inactive', 'onboarding',
] as const;

export const CLIENT_TYPE_OPTIONS = [
  'individual', 'entity',
] as const;

export const LEAD_STAGE_OPTIONS = [
  'new', 'contacted', 'meeting', 'proposal', 'closed_won', 'lost',
] as const;
