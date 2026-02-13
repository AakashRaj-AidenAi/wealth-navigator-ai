export type RiskCategory = 'very_conservative' | 'conservative' | 'moderate' | 'aggressive' | 'very_aggressive';

export interface RiskQuestion {
  id: string;
  category: 'financial_capacity' | 'risk_tolerance' | 'goal_requirement';
  question: string;
  options: {
    label: string;
    score: number;
  }[];
}

export interface RiskAnswer {
  questionId: string;
  category: string;
  questionText: string;
  selectedOption: string;
  selectedScore: number;
}

export interface AllocationSuggestion {
  equity: number;
  debt: number;
  gold: number;
  alternatives: number;
  cash: number;
}

export interface RiskProfile {
  id: string;
  client_id: string;
  advisor_id: string;
  total_score: number;
  category: RiskCategory;
  equity_pct: number;
  debt_pct: number;
  gold_pct: number;
  alternatives_pct: number;
  cash_pct: number;
  version: number;
  is_active: boolean;
  signature_data: string | null;
  signed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const RISK_QUESTIONS: RiskQuestion[] = [
  // Financial Capacity (Step 1)
  {
    id: 'fc_1',
    category: 'financial_capacity',
    question: 'What is your current annual household income?',
    options: [
      { label: 'Less than ₹5 Lakhs', score: 1 },
      { label: '₹5-15 Lakhs', score: 2 },
      { label: '₹15-30 Lakhs', score: 3 },
      { label: '₹30-50 Lakhs', score: 4 },
      { label: 'More than ₹50 Lakhs', score: 5 },
    ],
  },
  {
    id: 'fc_2',
    category: 'financial_capacity',
    question: 'How stable is your primary source of income?',
    options: [
      { label: 'Very unstable - irregular income', score: 1 },
      { label: 'Somewhat unstable - seasonal or project-based', score: 2 },
      { label: 'Moderately stable - salaried with some uncertainty', score: 3 },
      { label: 'Stable - permanent employment or steady business', score: 4 },
      { label: 'Very stable - multiple income sources or pension', score: 5 },
    ],
  },
  {
    id: 'fc_3',
    category: 'financial_capacity',
    question: 'How many months of expenses can you cover with your emergency fund?',
    options: [
      { label: 'Less than 1 month', score: 1 },
      { label: '1-3 months', score: 2 },
      { label: '3-6 months', score: 3 },
      { label: '6-12 months', score: 4 },
      { label: 'More than 12 months', score: 5 },
    ],
  },
  {
    id: 'fc_4',
    category: 'financial_capacity',
    question: 'What percentage of your income goes towards EMIs and loans?',
    options: [
      { label: 'More than 50%', score: 1 },
      { label: '40-50%', score: 2 },
      { label: '25-40%', score: 3 },
      { label: '10-25%', score: 4 },
      { label: 'Less than 10% or no loans', score: 5 },
    ],
  },
  // Risk Tolerance (Step 2)
  {
    id: 'rt_1',
    category: 'risk_tolerance',
    question: 'If your portfolio drops 20% in a month, what would you do?',
    options: [
      { label: 'Sell everything immediately', score: 1 },
      { label: 'Sell some investments to reduce risk', score: 2 },
      { label: 'Hold and wait for recovery', score: 3 },
      { label: 'Buy more at lower prices', score: 4 },
      { label: 'Significantly increase investment at discount', score: 5 },
    ],
  },
  {
    id: 'rt_2',
    category: 'risk_tolerance',
    question: 'How do you feel about investment volatility?',
    options: [
      { label: 'I cannot tolerate any fluctuations', score: 1 },
      { label: 'I prefer minimal fluctuations', score: 2 },
      { label: 'I can accept moderate fluctuations for better returns', score: 3 },
      { label: 'I am comfortable with significant fluctuations', score: 4 },
      { label: 'I embrace volatility for maximum growth potential', score: 5 },
    ],
  },
  {
    id: 'rt_3',
    category: 'risk_tolerance',
    question: 'What is your investment experience?',
    options: [
      { label: 'No experience - never invested before', score: 1 },
      { label: 'Limited - only FDs and savings accounts', score: 2 },
      { label: 'Moderate - mutual funds and some stocks', score: 3 },
      { label: 'Good - diversified portfolio including equity', score: 4 },
      { label: 'Extensive - active trading and derivatives', score: 5 },
    ],
  },
  {
    id: 'rt_4',
    category: 'risk_tolerance',
    question: 'Which return scenario appeals to you most?',
    options: [
      { label: 'Guaranteed 5% return with no risk', score: 1 },
      { label: '6-8% return with minimal risk', score: 2 },
      { label: '10-12% return with moderate risk', score: 3 },
      { label: '15-18% return with significant risk', score: 4 },
      { label: '20%+ return with high risk of loss', score: 5 },
    ],
  },
  // Goal/Return Requirements (Step 3)
  {
    id: 'gr_1',
    category: 'goal_requirement',
    question: 'What is your primary investment horizon?',
    options: [
      { label: 'Less than 1 year', score: 1 },
      { label: '1-3 years', score: 2 },
      { label: '3-5 years', score: 3 },
      { label: '5-10 years', score: 4 },
      { label: 'More than 10 years', score: 5 },
    ],
  },
  {
    id: 'gr_2',
    category: 'goal_requirement',
    question: 'What is your primary investment objective?',
    options: [
      { label: 'Capital preservation - protect my money', score: 1 },
      { label: 'Regular income - steady returns', score: 2 },
      { label: 'Balanced growth - income and appreciation', score: 3 },
      { label: 'Capital growth - wealth accumulation', score: 4 },
      { label: 'Aggressive growth - maximize returns', score: 5 },
    ],
  },
  {
    id: 'gr_3',
    category: 'goal_requirement',
    question: 'How soon will you need to access this investment?',
    options: [
      { label: 'Within 6 months', score: 1 },
      { label: '6 months to 2 years', score: 2 },
      { label: '2-5 years', score: 3 },
      { label: '5-10 years', score: 4 },
      { label: 'Not needed for 10+ years', score: 5 },
    ],
  },
  {
    id: 'gr_4',
    category: 'goal_requirement',
    question: 'What percentage of your total wealth will this investment represent?',
    options: [
      { label: 'More than 80% - almost everything', score: 1 },
      { label: '60-80% - majority of savings', score: 2 },
      { label: '40-60% - significant portion', score: 3 },
      { label: '20-40% - moderate portion', score: 4 },
      { label: 'Less than 20% - small portion', score: 5 },
    ],
  },
];

export const ALLOCATION_BY_CATEGORY: Record<RiskCategory, AllocationSuggestion> = {
  very_conservative: { equity: 10, debt: 60, gold: 15, alternatives: 5, cash: 10 },
  conservative: { equity: 25, debt: 50, gold: 10, alternatives: 5, cash: 10 },
  moderate: { equity: 45, debt: 35, gold: 10, alternatives: 5, cash: 5 },
  aggressive: { equity: 65, debt: 20, gold: 5, alternatives: 8, cash: 2 },
  very_aggressive: { equity: 80, debt: 10, gold: 3, alternatives: 5, cash: 2 },
};

export const getCategoryFromScore = (score: number): RiskCategory => {
  if (score <= 20) return 'very_conservative';
  if (score <= 32) return 'conservative';
  if (score <= 44) return 'moderate';
  if (score <= 52) return 'aggressive';
  return 'very_aggressive';
};

export const getCategoryLabel = (category: RiskCategory): string => {
  const labels: Record<RiskCategory, string> = {
    very_conservative: 'Very Conservative',
    conservative: 'Conservative',
    moderate: 'Moderate',
    aggressive: 'Aggressive',
    very_aggressive: 'Very Aggressive',
  };
  return labels[category];
};

export const getCategoryColor = (category: RiskCategory): string => {
  const colors: Record<RiskCategory, string> = {
    very_conservative: 'text-blue-500',
    conservative: 'text-cyan-500',
    moderate: 'text-green-500',
    aggressive: 'text-orange-500',
    very_aggressive: 'text-red-500',
  };
  return colors[category];
};
