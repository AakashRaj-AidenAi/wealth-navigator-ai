import { useEffect, useState, useMemo } from 'react';
import { api, extractItems } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { PortfolioMetrics } from '@/components/portfolio/PortfolioMetrics';
import { AssetAllocationChart, AllocationItem } from '@/components/portfolio/AssetAllocationChart';
import { PerformanceLineChart, PerformanceDataPoint } from '@/components/portfolio/PerformanceLineChart';
import { GoalProgressCard, Goal } from '@/components/portfolio/GoalProgressCard';
import { PortfolioAlerts, PortfolioAlert } from '@/components/portfolio/PortfolioAlerts';
import { HoldingsTable, Holding } from '@/components/portfolio/HoldingsTable';

interface ClientPortfolioTabProps {
  clientId: string;
  totalAssets: number;
}

// Helper to calculate XIRR (simplified approximation)
const calculateXIRR = (cashFlows: { amount: number; date: Date }[]): number => {
  if (cashFlows.length < 2) return 0;
  
  // Simplified XIRR using Newton-Raphson approximation
  const guess = 0.1;
  let rate = guess;
  
  for (let i = 0; i < 100; i++) {
    let npv = 0;
    let dnpv = 0;
    const firstDate = cashFlows[0].date;
    
    for (const cf of cashFlows) {
      const years = (cf.date.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      npv += cf.amount / Math.pow(1 + rate, years);
      dnpv -= years * cf.amount / Math.pow(1 + rate, years + 1);
    }
    
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < 0.0001) {
      return newRate * 100;
    }
    rate = newRate;
  }
  
  return rate * 100;
};

// Helper to calculate CAGR
const calculateCAGR = (startValue: number, endValue: number, years: number): number => {
  if (startValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
};

// Generate simulated historical performance data
const generatePerformanceData = (currentValue: number): PerformanceDataPoint[] => {
  const data: PerformanceDataPoint[] = [];
  const now = new Date();
  
  for (let i = 24; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    
    // Simulate growth with some volatility
    const progress = (24 - i) / 24;
    const baseValue = currentValue * 0.7; // Started at 70% of current
    const growthFactor = 1 + (0.3 * progress); // 30% growth over period
    const volatility = 1 + (Math.random() - 0.5) * 0.1; // ±5% volatility
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(baseValue * growthFactor * volatility),
    });
  }
  
  // Ensure last value matches current
  if (data.length > 0) {
    data[data.length - 1].value = currentValue;
  }
  
  return data;
};

// Generate alerts based on portfolio state
const generateAlerts = (
  allocations: AllocationItem[],
  goals: Goal[],
  holdings: Holding[]
): PortfolioAlert[] => {
  const alerts: PortfolioAlert[] = [];
  
  // Check allocation drift
  allocations.forEach(alloc => {
    if (alloc.targetPercentage) {
      const drift = Math.abs(alloc.percentage - alloc.targetPercentage);
      if (drift > 10) {
        alerts.push({
          id: `drift-${alloc.name}`,
          type: 'allocation_drift',
          severity: drift > 15 ? 'critical' : 'warning',
          title: `${alloc.name} allocation drift`,
          description: `${alloc.name} is ${drift.toFixed(1)}% off target allocation`,
          value: `Current: ${alloc.percentage.toFixed(1)}% | Target: ${alloc.targetPercentage}%`,
          action: 'Rebalance Portfolio',
          timestamp: new Date(),
        });
      }
    }
  });
  
  // Check for significant losses in holdings
  holdings.forEach(holding => {
    if (holding.gainLossPercent < -10) {
      alerts.push({
        id: `drop-${holding.id}`,
        type: 'price_drop',
        severity: holding.gainLossPercent < -20 ? 'critical' : 'warning',
        title: `${holding.symbol} price drop`,
        description: `${holding.name} is down ${Math.abs(holding.gainLossPercent).toFixed(1)}% from average cost`,
        action: 'Review Position',
        timestamp: new Date(),
      });
    }
  });
  
  // Check goal shortfalls
  goals.forEach(goal => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    if (goal.targetDate) {
      const monthsLeft = Math.max(0, 
        (new Date(goal.targetDate).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)
      );
      const expectedProgress = 100 - (monthsLeft / 60) * 100; // Assume 5 year goals
      
      if (progress < expectedProgress - 15) {
        alerts.push({
          id: `goal-${goal.id}`,
          type: 'goal_shortfall',
          severity: progress < expectedProgress - 25 ? 'critical' : 'warning',
          title: `${goal.name} behind schedule`,
          description: `Goal is ${(expectedProgress - progress).toFixed(0)}% behind expected progress`,
          action: 'Increase Contributions',
          timestamp: new Date(),
        });
      }
    }
  });
  
  return alerts;
};

export const ClientPortfolioTab = ({ clientId, totalAssets }: ClientPortfolioTabProps) => {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [assetFilter, setAssetFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [goalsRaw, ordersRaw] = await Promise.all([
          api.get('/goals', { client_id: clientId }),
          api.get('/orders', { client_id: clientId }),
        ]);
        const goalsData = extractItems(goalsRaw);
        const ordersData = extractItems(ordersRaw);

        if (goalsData) {
          setGoals(goalsData.map((g: any) => ({
            id: g.id,
            name: g.name,
            targetAmount: g.target_amount,
            currentAmount: g.current_amount || 0,
            targetDate: g.target_date,
            status: g.status || 'active',
            priority: g.priority || 'medium',
          })));
        }

        if (ordersData) {
          setOrders(ordersData);
        }
      } catch (err) {
        console.error('Failed to load portfolio data:', err);
      }

      setLoading(false);
    };

    fetchData();
  }, [clientId]);

  // Calculate portfolio metrics
  const metrics = useMemo(() => {
    // Simulate invested value (80% of current for demo)
    const investedValue = totalAssets * 0.8;
    
    // Calculate XIRR from orders
    const cashFlows = orders.map(o => ({
      amount: o.order_type === 'buy' ? -(o.total_amount || o.quantity * (o.price || 0)) : (o.total_amount || o.quantity * (o.price || 0)),
      date: new Date(o.created_at),
    }));
    // Add current value as final cash flow
    cashFlows.push({ amount: totalAssets, date: new Date() });
    
    const xirr = cashFlows.length > 1 ? calculateXIRR(cashFlows) : 15.5; // Fallback
    const cagr = calculateCAGR(investedValue, totalAssets, 2); // Assume 2 year history
    
    return { investedValue, xirr, cagr };
  }, [totalAssets, orders]);

  // Asset allocation data
  const allocations: AllocationItem[] = useMemo(() => [
    { name: 'Equity', value: totalAssets * 0.45, percentage: 45, targetPercentage: 50 },
    { name: 'Fixed Income', value: totalAssets * 0.30, percentage: 30, targetPercentage: 30 },
    { name: 'Real Estate', value: totalAssets * 0.15, percentage: 15, targetPercentage: 12 },
    { name: 'Cash', value: totalAssets * 0.10, percentage: 10, targetPercentage: 8 },
  ], [totalAssets]);

  // Holdings data (simulated based on allocation)
  const holdings: Holding[] = useMemo(() => [
    { id: '1', name: 'Apple Inc.', symbol: 'AAPL', assetClass: 'Equity', quantity: 150, avgCost: 145.50, currentPrice: 178.25, value: 26737.50, gainLoss: 4912.50, gainLossPercent: 22.5 },
    { id: '2', name: 'Microsoft Corp', symbol: 'MSFT', assetClass: 'Equity', quantity: 80, avgCost: 320.00, currentPrice: 378.50, value: 30280.00, gainLoss: 4680.00, gainLossPercent: 18.3 },
    { id: '3', name: 'Tesla Inc.', symbol: 'TSLA', assetClass: 'Equity', quantity: 45, avgCost: 280.00, currentPrice: 245.00, value: 11025.00, gainLoss: -1575.00, gainLossPercent: -12.5 },
    { id: '4', name: 'Vanguard Bond ETF', symbol: 'BND', assetClass: 'Fixed Income', quantity: 500, avgCost: 72.50, currentPrice: 74.25, value: 37125.00, gainLoss: 875.00, gainLossPercent: 2.4 },
    { id: '5', name: 'iShares TIPS ETF', symbol: 'TIP', assetClass: 'Fixed Income', quantity: 300, avgCost: 108.00, currentPrice: 110.50, value: 33150.00, gainLoss: 750.00, gainLossPercent: 2.3 },
    { id: '6', name: 'Vanguard REIT ETF', symbol: 'VNQ', assetClass: 'Real Estate', quantity: 200, avgCost: 85.00, currentPrice: 92.50, value: 18500.00, gainLoss: 1500.00, gainLossPercent: 8.8 },
    { id: '7', name: 'SPDR Gold Trust', symbol: 'GLD', assetClass: 'Commodity', quantity: 50, avgCost: 175.00, currentPrice: 182.00, value: 9100.00, gainLoss: 350.00, gainLossPercent: 4.0 },
    { id: '8', name: 'Money Market Fund', symbol: 'CASH', assetClass: 'Cash', quantity: 15000, avgCost: 1.00, currentPrice: 1.00, value: 15000.00, gainLoss: 0, gainLossPercent: 0 },
  ], []);

  // Performance data
  const performanceData = useMemo(() => generatePerformanceData(totalAssets), [totalAssets]);

  // Alerts
  const alerts = useMemo(() => generateAlerts(allocations, goals, holdings), [allocations, goals, holdings]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <PortfolioMetrics
        currentValue={totalAssets}
        investedValue={metrics.investedValue}
        xirr={metrics.xirr}
        cagr={metrics.cagr}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AssetAllocationChart
          allocations={allocations}
          totalValue={totalAssets}
          selectedFilter={assetFilter}
          onFilterChange={setAssetFilter}
        />
        <PerformanceLineChart data={performanceData} />
      </div>

      {/* Goals and Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalProgressCard goals={goals} />
        <PortfolioAlerts 
          alerts={alerts}
          onDismiss={(id) => console.log('Dismiss:', id)}
          onAction={(alert) => console.log('Action:', alert)}
        />
      </div>

      {/* Holdings Table */}
      <HoldingsTable holdings={holdings} assetClassFilter={assetFilter} />
    </div>
  );
};
