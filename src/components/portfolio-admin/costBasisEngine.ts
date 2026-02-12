/**
 * Cost Basis Accounting Engine
 * Supports FIFO, LIFO, Average Cost, and Specific Identification methods
 */

export type CostBasisMethod = 'fifo' | 'lifo' | 'average' | 'specific';

export interface TaxLot {
  id: string;
  securityId: string;
  portfolioId: string;
  purchaseDate: string;
  quantity: number;
  remainingQuantity: number;
  costPerUnit: number;
  totalCost: number;
  transactionId: string;
}

export interface RealizedGainLoss {
  securityId: string;
  portfolioId: string;
  sellDate: string;
  sellTransactionId: string;
  quantity: number;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  holdingPeriodDays: number;
  isLongTerm: boolean; // > 365 days
  taxLotId: string;
  purchaseDate: string;
}

export interface UnrealizedGainLoss {
  securityId: string;
  portfolioId: string;
  taxLotId: string;
  purchaseDate: string;
  quantity: number;
  costBasis: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
  holdingPeriodDays: number;
  isLongTerm: boolean;
}

export interface PositionCostBasis {
  securityId: string;
  portfolioId: string;
  totalQuantity: number;
  totalCostBasis: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGL: number;
  unrealizedGLPct: number;
  taxLots: TaxLot[];
  unrealizedDetails: UnrealizedGainLoss[];
}

export interface CostBasisReport {
  method: CostBasisMethod;
  positions: PositionCostBasis[];
  realizedGains: RealizedGainLoss[];
  totalRealizedGL: number;
  totalRealizedLongTerm: number;
  totalRealizedShortTerm: number;
  totalUnrealizedGL: number;
  totalUnrealizedLongTerm: number;
  totalUnrealizedShortTerm: number;
}

interface Transaction {
  id: string;
  portfolio_id: string;
  security_id: string;
  transaction_type: string;
  quantity: number;
  price: number;
  total_amount: number;
  trade_date: string;
  settlement_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Position {
  id: string;
  portfolio_id: string;
  security_id: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  created_at: string;
}

function daysBetween(d1: string, d2: string): number {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.floor(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Build tax lots from buy transactions, sorted by date
 */
function buildTaxLots(
  transactions: Transaction[],
  portfolioId?: string
): TaxLot[] {
  const buys = transactions
    .filter(t => t.transaction_type === 'buy' && (!portfolioId || t.portfolio_id === portfolioId))
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  return buys.map((tx, i) => ({
    id: `lot-${tx.id}-${i}`,
    securityId: tx.security_id,
    portfolioId: tx.portfolio_id,
    purchaseDate: tx.trade_date,
    quantity: Number(tx.quantity),
    remainingQuantity: Number(tx.quantity),
    costPerUnit: Number(tx.price),
    totalCost: Number(tx.total_amount),
    transactionId: tx.id,
  }));
}

/**
 * Process sell transactions against tax lots using the selected method
 */
function processSells(
  taxLots: TaxLot[],
  transactions: Transaction[],
  method: CostBasisMethod,
  portfolioId?: string
): RealizedGainLoss[] {
  const sells = transactions
    .filter(t => t.transaction_type === 'sell' && (!portfolioId || t.portfolio_id === portfolioId))
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  const realized: RealizedGainLoss[] = [];

  for (const sell of sells) {
    let remaining = Number(sell.quantity);
    const sellPrice = Number(sell.price);
    const securityLots = taxLots
      .filter(lot => lot.securityId === sell.security_id && lot.portfolioId === sell.portfolio_id && lot.remainingQuantity > 0);

    // Sort lots based on method
    if (method === 'lifo') {
      securityLots.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    } else if (method === 'specific') {
      // For specific identification, pick highest cost first to minimize gains
      securityLots.sort((a, b) => b.costPerUnit - a.costPerUnit);
    }
    // FIFO: already sorted by date ascending from buildTaxLots
    // Average: we'll handle differently below

    if (method === 'average') {
      // Average cost: calculate weighted average across all lots
      const totalQty = securityLots.reduce((s, l) => s + l.remainingQuantity, 0);
      const totalCost = securityLots.reduce((s, l) => s + l.remainingQuantity * l.costPerUnit, 0);
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;

      const qty = Math.min(remaining, totalQty);
      const costBasis = qty * avgCost;
      const proceeds = qty * sellPrice;
      const days = securityLots.length > 0 ? daysBetween(securityLots[0].purchaseDate, sell.trade_date) : 0;

      realized.push({
        securityId: sell.security_id,
        portfolioId: sell.portfolio_id,
        sellDate: sell.trade_date,
        sellTransactionId: sell.id,
        quantity: qty,
        proceeds,
        costBasis,
        gainLoss: proceeds - costBasis,
        holdingPeriodDays: days,
        isLongTerm: days > 365,
        taxLotId: 'avg-pool',
        purchaseDate: securityLots[0]?.purchaseDate || sell.trade_date,
      });

      // Reduce lots proportionally
      let toReduce = qty;
      for (const lot of securityLots) {
        if (toReduce <= 0) break;
        const take = Math.min(lot.remainingQuantity, toReduce);
        lot.remainingQuantity -= take;
        toReduce -= take;
      }
    } else {
      // FIFO / LIFO / Specific
      for (const lot of securityLots) {
        if (remaining <= 0) break;
        const take = Math.min(lot.remainingQuantity, remaining);
        const costBasis = take * lot.costPerUnit;
        const proceeds = take * sellPrice;
        const days = daysBetween(lot.purchaseDate, sell.trade_date);

        realized.push({
          securityId: sell.security_id,
          portfolioId: sell.portfolio_id,
          sellDate: sell.trade_date,
          sellTransactionId: sell.id,
          quantity: take,
          proceeds,
          costBasis,
          gainLoss: proceeds - costBasis,
          holdingPeriodDays: days,
          isLongTerm: days > 365,
          taxLotId: lot.id,
          purchaseDate: lot.purchaseDate,
        });

        lot.remainingQuantity -= take;
        remaining -= take;
      }
    }
  }

  return realized;
}

/**
 * Compute unrealized gains from remaining tax lots
 */
function computeUnrealized(
  taxLots: TaxLot[],
  positions: Position[],
  today: string
): UnrealizedGainLoss[] {
  const priceMap: Record<string, number> = {};
  positions.forEach(p => {
    priceMap[`${p.portfolio_id}:${p.security_id}`] = Number(p.current_price);
  });

  return taxLots
    .filter(lot => lot.remainingQuantity > 0)
    .map(lot => {
      const currentPrice = priceMap[`${lot.portfolioId}:${lot.securityId}`] || lot.costPerUnit;
      const costBasis = lot.remainingQuantity * lot.costPerUnit;
      const currentValue = lot.remainingQuantity * currentPrice;
      const gainLoss = currentValue - costBasis;
      const days = daysBetween(lot.purchaseDate, today);

      return {
        securityId: lot.securityId,
        portfolioId: lot.portfolioId,
        taxLotId: lot.id,
        purchaseDate: lot.purchaseDate,
        quantity: lot.remainingQuantity,
        costBasis,
        currentValue,
        gainLoss,
        gainLossPct: costBasis > 0 ? (gainLoss / costBasis) * 100 : 0,
        holdingPeriodDays: days,
        isLongTerm: days > 365,
      };
    });
}

/**
 * Build position-level cost basis summary
 */
function buildPositionSummaries(
  taxLots: TaxLot[],
  unrealized: UnrealizedGainLoss[],
  positions: Position[]
): PositionCostBasis[] {
  const posMap: Record<string, PositionCostBasis> = {};

  // Initialize from positions
  positions.forEach(p => {
    const key = `${p.portfolio_id}:${p.security_id}`;
    posMap[key] = {
      securityId: p.security_id,
      portfolioId: p.portfolio_id,
      totalQuantity: Number(p.quantity),
      totalCostBasis: 0,
      averageCost: Number(p.average_cost),
      currentPrice: Number(p.current_price),
      currentValue: Number(p.market_value || 0),
      unrealizedGL: 0,
      unrealizedGLPct: 0,
      taxLots: [],
      unrealizedDetails: [],
    };
  });

  // Attach tax lots
  taxLots.forEach(lot => {
    if (lot.remainingQuantity <= 0) return;
    const key = `${lot.portfolioId}:${lot.securityId}`;
    if (posMap[key]) {
      posMap[key].taxLots.push(lot);
      posMap[key].totalCostBasis += lot.remainingQuantity * lot.costPerUnit;
    }
  });

  // Attach unrealized details
  unrealized.forEach(u => {
    const key = `${u.portfolioId}:${u.securityId}`;
    if (posMap[key]) {
      posMap[key].unrealizedDetails.push(u);
    }
  });

  // Finalize
  Object.values(posMap).forEach(p => {
    p.averageCost = p.totalQuantity > 0 ? p.totalCostBasis / p.totalQuantity : 0;
    p.unrealizedGL = p.currentValue - p.totalCostBasis;
    p.unrealizedGLPct = p.totalCostBasis > 0 ? (p.unrealizedGL / p.totalCostBasis) * 100 : 0;
  });

  return Object.values(posMap);
}

/**
 * Main entry point: compute full cost basis report
 */
export function computeCostBasisReport(
  transactions: Transaction[],
  positions: Position[],
  method: CostBasisMethod,
  portfolioId?: string | null
): CostBasisReport {
  const filteredTx = portfolioId ? transactions.filter(t => t.portfolio_id === portfolioId) : transactions;
  const filteredPos = portfolioId ? positions.filter(p => p.portfolio_id === portfolioId) : positions;
  const today = new Date().toISOString().split('T')[0];

  // Build tax lots (deep copy to avoid mutations across calls)
  const taxLots = buildTaxLots(filteredTx);

  // Process sells
  const realizedGains = processSells(taxLots, filteredTx, method);

  // Compute unrealized
  const unrealized = computeUnrealized(taxLots, filteredPos, today);

  // Position summaries
  const positionSummaries = buildPositionSummaries(taxLots, unrealized, filteredPos);

  // Aggregates
  const totalRealizedGL = realizedGains.reduce((s, r) => s + r.gainLoss, 0);
  const totalRealizedLongTerm = realizedGains.filter(r => r.isLongTerm).reduce((s, r) => s + r.gainLoss, 0);
  const totalRealizedShortTerm = realizedGains.filter(r => !r.isLongTerm).reduce((s, r) => s + r.gainLoss, 0);
  const totalUnrealizedGL = unrealized.reduce((s, u) => u.gainLoss + s, 0);
  const totalUnrealizedLongTerm = unrealized.filter(u => u.isLongTerm).reduce((s, u) => s + u.gainLoss, 0);
  const totalUnrealizedShortTerm = unrealized.filter(u => !u.isLongTerm).reduce((s, u) => s + u.gainLoss, 0);

  return {
    method,
    positions: positionSummaries,
    realizedGains,
    totalRealizedGL,
    totalRealizedLongTerm,
    totalRealizedShortTerm,
    totalUnrealizedGL,
    totalUnrealizedLongTerm,
    totalUnrealizedShortTerm,
  };
}

/**
 * Generate CSV for capital gains report
 */
export function exportCapitalGainsCSV(report: CostBasisReport): string {
  const headers = [
    'Security', 'Portfolio', 'Purchase Date', 'Sell Date',
    'Quantity', 'Cost Basis', 'Proceeds', 'Gain/Loss',
    'Holding Days', 'Term', 'Method',
  ];

  const rows = report.realizedGains.map(r => [
    r.securityId,
    r.portfolioId,
    r.purchaseDate,
    r.sellDate,
    r.quantity.toString(),
    r.costBasis.toFixed(2),
    r.proceeds.toFixed(2),
    r.gainLoss.toFixed(2),
    r.holdingPeriodDays.toString(),
    r.isLongTerm ? 'Long-Term' : 'Short-Term',
    report.method.toUpperCase(),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
