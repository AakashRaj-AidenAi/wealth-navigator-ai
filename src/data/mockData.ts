// Enterprise Wealth Management Mock Data

export interface Client {
  id: string;
  name: string;
  type: 'Individual' | 'Family Office' | 'Trust' | 'Corporation';
  aum: number;
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive' | 'Ultra-Aggressive';
  advisor: string;
  status: 'Active' | 'Under Review' | 'Onboarding';
  ytdReturn: number;
  lastContact: string;
  avatar?: string;
  entities?: string[];
}

export interface PortfolioHolding {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  value: number;
  weight: number;
  dayChange: number;
  ytdReturn: number;
  quantity: number;
}

export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface Alert {
  id: string;
  type: 'compliance' | 'market' | 'client' | 'rebalance';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
  clientId?: string;
}

export interface Activity {
  id: string;
  type: 'trade' | 'meeting' | 'document' | 'call' | 'email';
  title: string;
  description: string;
  timestamp: string;
  client?: string;
}

// High-Net-Worth Clients
export const clients: Client[] = [
  {
    id: 'CLI-001',
    name: 'The Raghavan Family Office',
    type: 'Family Office',
    aum: 485000000,
    riskProfile: 'Moderate',
    advisor: 'Priya Sharma',
    status: 'Active',
    ytdReturn: 12.4,
    lastContact: '2025-01-28',
    entities: ['Raghavan Holdings LLC', 'RFO Trust I', 'RFO Trust II', 'Lakshmi Charitable Foundation']
  },
  {
    id: 'CLI-002',
    name: 'Harrison & Associates Trust',
    type: 'Trust',
    aum: 275000000,
    riskProfile: 'Conservative',
    advisor: 'Michael Chen',
    status: 'Active',
    ytdReturn: 8.7,
    lastContact: '2025-01-29',
    entities: ['Harrison Family Trust', 'H&A Charitable Remainder']
  },
  {
    id: 'CLI-003',
    name: 'Victoria Sterling',
    type: 'Individual',
    aum: 125000000,
    riskProfile: 'Aggressive',
    advisor: 'Priya Sharma',
    status: 'Active',
    ytdReturn: 18.2,
    lastContact: '2025-01-27'
  },
  {
    id: 'CLI-004',
    name: 'Meridian Capital Partners',
    type: 'Corporation',
    aum: 890000000,
    riskProfile: 'Moderate',
    advisor: 'James Wright',
    status: 'Active',
    ytdReturn: 11.5,
    lastContact: '2025-01-30',
    entities: ['MCP Fund I', 'MCP Fund II', 'Meridian RE Holdings']
  },
  {
    id: 'CLI-005',
    name: 'Dr. Aisha Patel',
    type: 'Individual',
    aum: 45000000,
    riskProfile: 'Moderate',
    advisor: 'Sarah Johnson',
    status: 'Active',
    ytdReturn: 9.8,
    lastContact: '2025-01-25'
  },
  {
    id: 'CLI-006',
    name: 'The Nakamura Estate',
    type: 'Family Office',
    aum: 620000000,
    riskProfile: 'Conservative',
    advisor: 'Michael Chen',
    status: 'Under Review',
    ytdReturn: 7.2,
    lastContact: '2025-01-20',
    entities: ['Nakamura Holdings', 'Sakura Trust', 'NE Foundation']
  },
  {
    id: 'CLI-007',
    name: 'Robert & Elena Fitzgerald',
    type: 'Individual',
    aum: 78000000,
    riskProfile: 'Aggressive',
    advisor: 'James Wright',
    status: 'Active',
    ytdReturn: 15.6,
    lastContact: '2025-01-29'
  },
  {
    id: 'CLI-008',
    name: 'Quantum Ventures LLC',
    type: 'Corporation',
    aum: 340000000,
    riskProfile: 'Ultra-Aggressive',
    advisor: 'Priya Sharma',
    status: 'Onboarding',
    ytdReturn: 0,
    lastContact: '2025-01-30'
  }
];

// Portfolio Holdings
export const portfolioHoldings: PortfolioHolding[] = [
  { id: 'H-001', symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'US Equity', value: 45000000, weight: 8.2, dayChange: 1.24, ytdReturn: 12.5, quantity: 195000 },
  { id: 'H-002', symbol: 'MSFT', name: 'Microsoft Corp', assetClass: 'US Equity', value: 52000000, weight: 9.5, dayChange: 0.87, ytdReturn: 15.3, quantity: 124000 },
  { id: 'H-003', symbol: 'GOOGL', name: 'Alphabet Inc.', assetClass: 'US Equity', value: 38000000, weight: 6.9, dayChange: -0.45, ytdReturn: 8.7, quantity: 215000 },
  { id: 'H-004', symbol: 'JPM', name: 'JPMorgan Chase', assetClass: 'US Equity', value: 28000000, weight: 5.1, dayChange: 0.32, ytdReturn: 22.1, quantity: 135000 },
  { id: 'H-005', symbol: 'BRK.B', name: 'Berkshire Hathaway', assetClass: 'US Equity', value: 35000000, weight: 6.4, dayChange: 0.15, ytdReturn: 18.4, quantity: 78000 },
  { id: 'H-006', symbol: 'AGG', name: 'iShares Core US Aggregate Bond', assetClass: 'Fixed Income', value: 85000000, weight: 15.5, dayChange: 0.08, ytdReturn: 4.2, quantity: 850000 },
  { id: 'H-007', symbol: 'TLT', name: 'iShares 20+ Year Treasury', assetClass: 'Fixed Income', value: 42000000, weight: 7.7, dayChange: -0.12, ytdReturn: 2.8, quantity: 450000 },
  { id: 'H-008', symbol: 'VNQ', name: 'Vanguard Real Estate ETF', assetClass: 'Real Estate', value: 55000000, weight: 10.0, dayChange: 0.65, ytdReturn: 9.4, quantity: 620000 },
  { id: 'H-009', symbol: 'GLD', name: 'SPDR Gold Trust', assetClass: 'Commodities', value: 32000000, weight: 5.8, dayChange: 0.42, ytdReturn: 6.8, quantity: 145000 },
  { id: 'H-010', symbol: 'EFA', name: 'iShares MSCI EAFE', assetClass: 'International Equity', value: 48000000, weight: 8.8, dayChange: 0.28, ytdReturn: 7.2, quantity: 580000 },
  { id: 'H-011', symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets', assetClass: 'Emerging Markets', value: 25000000, weight: 4.6, dayChange: -0.35, ytdReturn: 4.1, quantity: 580000 },
  { id: 'H-012', symbol: 'CASH', name: 'Cash & Equivalents', assetClass: 'Cash', value: 62000000, weight: 11.3, dayChange: 0, ytdReturn: 5.2, quantity: 62000000 },
];

// Market Data
export const marketData: MarketData[] = [
  { symbol: 'SPX', name: 'S&P 500', price: 6125.42, change: 28.45, changePercent: 0.47 },
  { symbol: 'DJI', name: 'Dow Jones', price: 44892.13, change: 156.78, changePercent: 0.35 },
  { symbol: 'IXIC', name: 'NASDAQ', price: 19876.54, change: 95.23, changePercent: 0.48 },
  { symbol: 'TNX', name: '10Y Treasury', price: 4.52, change: -0.03, changePercent: -0.66 },
  { symbol: 'DXY', name: 'US Dollar Index', price: 103.45, change: 0.12, changePercent: 0.12 },
  { symbol: 'GC=F', name: 'Gold Futures', price: 2785.30, change: 12.50, changePercent: 0.45 },
];

// Alerts
export const alerts: Alert[] = [
  {
    id: 'ALT-001',
    type: 'compliance',
    severity: 'high',
    title: 'Concentration Limit Breach',
    description: 'Nakamura Estate portfolio exceeds 25% single-sector concentration in Technology. Immediate review required.',
    timestamp: '2025-01-30T09:15:00Z',
    clientId: 'CLI-006'
  },
  {
    id: 'ALT-002',
    type: 'rebalance',
    severity: 'medium',
    title: 'Quarterly Rebalance Due',
    description: 'Harrison Trust quarterly rebalance window opens in 3 days. Current drift: 4.2% from target.',
    timestamp: '2025-01-30T08:00:00Z',
    clientId: 'CLI-002'
  },
  {
    id: 'ALT-003',
    type: 'market',
    severity: 'low',
    title: 'Fed Rate Decision',
    description: 'FOMC meeting scheduled for Feb 1st. Consider reviewing fixed income allocations.',
    timestamp: '2025-01-30T07:30:00Z'
  },
  {
    id: 'ALT-004',
    type: 'client',
    severity: 'medium',
    title: 'Large Withdrawal Request',
    description: 'Dr. Aisha Patel requested $2.5M withdrawal for property acquisition. Pending approval.',
    timestamp: '2025-01-29T16:45:00Z',
    clientId: 'CLI-005'
  },
  {
    id: 'ALT-005',
    type: 'compliance',
    severity: 'high',
    title: 'KYC Document Expiry',
    description: 'Meridian Capital Partners KYC documents expire in 15 days. Request updated documentation.',
    timestamp: '2025-01-29T14:20:00Z',
    clientId: 'CLI-004'
  }
];

// Recent Activity
export const recentActivity: Activity[] = [
  {
    id: 'ACT-001',
    type: 'trade',
    title: 'Trade Executed',
    description: 'Sold 10,000 shares of NVDA @ $875.42 for The Raghavan Family Office',
    timestamp: '2025-01-30T10:30:00Z',
    client: 'The Raghavan Family Office'
  },
  {
    id: 'ACT-002',
    type: 'meeting',
    title: 'Client Review Scheduled',
    description: 'Q1 portfolio review with Victoria Sterling - Feb 5, 2025',
    timestamp: '2025-01-30T09:45:00Z',
    client: 'Victoria Sterling'
  },
  {
    id: 'ACT-003',
    type: 'document',
    title: 'IPS Updated',
    description: 'Investment Policy Statement revised for Harrison & Associates Trust',
    timestamp: '2025-01-30T09:00:00Z',
    client: 'Harrison & Associates Trust'
  },
  {
    id: 'ACT-004',
    type: 'call',
    title: 'Advisor Call',
    description: 'Discussed tax-loss harvesting opportunities with Robert Fitzgerald',
    timestamp: '2025-01-29T16:30:00Z',
    client: 'Robert & Elena Fitzgerald'
  },
  {
    id: 'ACT-005',
    type: 'trade',
    title: 'Rebalance Complete',
    description: 'Quarterly rebalance executed for Meridian Capital Partners',
    timestamp: '2025-01-29T15:00:00Z',
    client: 'Meridian Capital Partners'
  }
];

// Asset Allocation for Charts
export const assetAllocation = [
  { name: 'US Equity', value: 36.1, color: 'hsl(43, 74%, 49%)' },
  { name: 'Fixed Income', value: 23.2, color: 'hsl(199, 89%, 48%)' },
  { name: 'International Equity', value: 13.4, color: 'hsl(160, 84%, 39%)' },
  { name: 'Cash', value: 11.3, color: 'hsl(215, 20%, 55%)' },
  { name: 'Real Estate', value: 10.0, color: 'hsl(280, 65%, 60%)' },
  { name: 'Commodities', value: 5.8, color: 'hsl(38, 92%, 50%)' },
];

// Performance data for charts
export const performanceData = [
  { month: 'Aug', portfolio: 2.1, benchmark: 1.8 },
  { month: 'Sep', portfolio: -1.2, benchmark: -1.5 },
  { month: 'Oct', portfolio: 3.4, benchmark: 2.9 },
  { month: 'Nov', portfolio: 4.2, benchmark: 3.8 },
  { month: 'Dec', portfolio: 2.8, benchmark: 2.4 },
  { month: 'Jan', portfolio: 1.1, benchmark: 0.9 },
];

// Summary Stats
export const firmStats = {
  totalAUM: 2858000000,
  totalClients: 147,
  avgClientAUM: 19440000,
  ytdReturn: 11.8,
  activeAlerts: 12,
  pendingTrades: 8,
  complianceScore: 98.5,
  advisorCount: 24
};

export const formatCurrency = (value: number, compact = false): string => {
  if (compact) {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};
