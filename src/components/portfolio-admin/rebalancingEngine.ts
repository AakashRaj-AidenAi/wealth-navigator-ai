// ─── Rebalancing Engine ───
// Drift detection, trade suggestion, tax impact estimation, batch rebalance

export interface TargetAllocation {
  securityId: string;
  targetPct: number; // 0–100
  assetClass?: string;
}

export interface PositionSnapshot {
  securityId: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  purchaseDate?: string; // for tax lot LT/ST classification
}

export interface DriftResult {
  securityId: string;
  targetPct: number;
  currentPct: number;
  driftPct: number; // signed: positive = overweight
  absDrift: number;
  breached: boolean;
  direction: 'overweight' | 'underweight' | 'on-target';
}

export interface SuggestedTrade {
  securityId: string;
  side: 'buy' | 'sell';
  quantity: number;
  estimatedAmount: number;
  currentPrice: number;
  reason: string;
}

export interface TaxImpact {
  securityId: string;
  realisedGain: number;
  holdingPeriod: 'long-term' | 'short-term' | 'n/a';
  taxRate: number; // indicative %
  estimatedTax: number;
}

export interface TransactionCostEstimate {
  totalTradeValue: number;
  brokerageRate: number; // bps
  estimatedBrokerage: number;
  stt: number; // Securities Transaction Tax (India)
  gst: number;
  totalCost: number;
}

export interface RebalanceProposal {
  portfolioId: string;
  portfolioName: string;
  totalMarketValue: number;
  driftResults: DriftResult[];
  suggestedTrades: SuggestedTrade[];
  taxImpacts: TaxImpact[];
  transactionCost: TransactionCostEstimate;
  timestamp: string;
}

// ─── Drift Detection ───
export function detectDrift(
  positions: PositionSnapshot[],
  targets: TargetAllocation[],
  thresholdPct: number = 5,
): DriftResult[] {
  const totalMV = positions.reduce((s, p) => s + p.marketValue, 0);
  if (totalMV <= 0) return [];

  // Build a map of current weights
  const currentWeights = new Map<string, number>();
  for (const p of positions) {
    currentWeights.set(p.securityId, (p.marketValue / totalMV) * 100);
  }

  const results: DriftResult[] = [];

  for (const t of targets) {
    const currentPct = currentWeights.get(t.securityId) ?? 0;
    const drift = currentPct - t.targetPct;
    const absDrift = Math.abs(drift);
    results.push({
      securityId: t.securityId,
      targetPct: t.targetPct,
      currentPct: Number(currentPct.toFixed(2)),
      driftPct: Number(drift.toFixed(2)),
      absDrift: Number(absDrift.toFixed(2)),
      breached: absDrift >= thresholdPct,
      direction: absDrift < 0.5 ? 'on-target' : drift > 0 ? 'overweight' : 'underweight',
    });
  }

  // Securities held but not in target → overweight by definition
  for (const p of positions) {
    if (!targets.find(t => t.securityId === p.securityId)) {
      const pct = (p.marketValue / totalMV) * 100;
      results.push({
        securityId: p.securityId,
        targetPct: 0,
        currentPct: Number(pct.toFixed(2)),
        driftPct: Number(pct.toFixed(2)),
        absDrift: Number(pct.toFixed(2)),
        breached: pct >= thresholdPct,
        direction: 'overweight',
      });
    }
  }

  return results.sort((a, b) => b.absDrift - a.absDrift);
}

// ─── Suggested Trades ───
export function generateSuggestedTrades(
  positions: PositionSnapshot[],
  targets: TargetAllocation[],
  totalMV: number,
): SuggestedTrade[] {
  if (totalMV <= 0) return [];

  const trades: SuggestedTrade[] = [];
  const posMap = new Map(positions.map(p => [p.securityId, p]));

  for (const t of targets) {
    const targetValue = (t.targetPct / 100) * totalMV;
    const pos = posMap.get(t.securityId);
    const currentValue = pos?.marketValue ?? 0;
    const price = pos?.currentPrice ?? 0;
    const diff = targetValue - currentValue;

    if (Math.abs(diff) < 100) continue; // skip negligible adjustments

    if (diff > 0 && price > 0) {
      const qty = Math.floor(diff / price);
      if (qty > 0) {
        trades.push({
          securityId: t.securityId,
          side: 'buy',
          quantity: qty,
          estimatedAmount: qty * price,
          currentPrice: price,
          reason: `Underweight by ${((currentValue / totalMV) * 100 - t.targetPct).toFixed(1)}% — buy to reach ${t.targetPct}% target`,
        });
      }
    } else if (diff < 0 && price > 0) {
      const qty = Math.min(Math.floor(Math.abs(diff) / price), pos?.quantity ?? 0);
      if (qty > 0) {
        trades.push({
          securityId: t.securityId,
          side: 'sell',
          quantity: qty,
          estimatedAmount: qty * price,
          currentPrice: price,
          reason: `Overweight by ${((currentValue / totalMV) * 100 - t.targetPct).toFixed(1)}% — sell to reach ${t.targetPct}% target`,
        });
      }
    }
  }

  // Sell positions not in target
  for (const p of positions) {
    if (!targets.find(t => t.securityId === p.securityId) && p.quantity > 0 && p.currentPrice > 0) {
      trades.push({
        securityId: p.securityId,
        side: 'sell',
        quantity: p.quantity,
        estimatedAmount: p.quantity * p.currentPrice,
        currentPrice: p.currentPrice,
        reason: 'Not in target allocation — full exit suggested',
      });
    }
  }

  return trades;
}

// ─── Tax Impact ───
const LONG_TERM_DAYS = 365;
const SHORT_TERM_TAX_RATE = 15; // indicative STCG %
const LONG_TERM_TAX_RATE = 10; // indicative LTCG %

export function estimateTaxImpact(
  trades: SuggestedTrade[],
  positions: PositionSnapshot[],
): TaxImpact[] {
  const posMap = new Map(positions.map(p => [p.securityId, p]));
  const now = Date.now();

  return trades
    .filter(t => t.side === 'sell')
    .map(t => {
      const pos = posMap.get(t.securityId);
      if (!pos) return { securityId: t.securityId, realisedGain: 0, holdingPeriod: 'n/a' as const, taxRate: 0, estimatedTax: 0 };

      const costBasis = t.quantity * pos.averageCost;
      const proceeds = t.estimatedAmount;
      const gain = proceeds - costBasis;

      let holdingPeriod: 'long-term' | 'short-term' | 'n/a' = 'n/a';
      let taxRate = 0;

      if (pos.purchaseDate) {
        const days = Math.floor((now - new Date(pos.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
        holdingPeriod = days >= LONG_TERM_DAYS ? 'long-term' : 'short-term';
        taxRate = holdingPeriod === 'long-term' ? LONG_TERM_TAX_RATE : SHORT_TERM_TAX_RATE;
      } else {
        taxRate = SHORT_TERM_TAX_RATE; // conservative default
        holdingPeriod = 'short-term';
      }

      return {
        securityId: t.securityId,
        realisedGain: Number(gain.toFixed(2)),
        holdingPeriod,
        taxRate,
        estimatedTax: gain > 0 ? Number(((gain * taxRate) / 100).toFixed(2)) : 0,
      };
    });
}

// ─── Transaction Cost Estimate ───
const DEFAULT_BROKERAGE_BPS = 3; // 0.03%
const STT_RATE = 0.001; // 0.1% on sell
const GST_ON_BROKERAGE = 0.18; // 18%

export function estimateTransactionCosts(trades: SuggestedTrade[]): TransactionCostEstimate {
  const totalTradeValue = trades.reduce((s, t) => s + t.estimatedAmount, 0);
  const sellValue = trades.filter(t => t.side === 'sell').reduce((s, t) => s + t.estimatedAmount, 0);

  const estimatedBrokerage = (totalTradeValue * DEFAULT_BROKERAGE_BPS) / 10000;
  const stt = sellValue * STT_RATE;
  const gst = estimatedBrokerage * GST_ON_BROKERAGE;

  return {
    totalTradeValue: Number(totalTradeValue.toFixed(2)),
    brokerageRate: DEFAULT_BROKERAGE_BPS,
    estimatedBrokerage: Number(estimatedBrokerage.toFixed(2)),
    stt: Number(stt.toFixed(2)),
    gst: Number(gst.toFixed(2)),
    totalCost: Number((estimatedBrokerage + stt + gst).toFixed(2)),
  };
}

// ─── Full Proposal Builder ───
export function buildRebalanceProposal(
  portfolioId: string,
  portfolioName: string,
  positions: PositionSnapshot[],
  targets: TargetAllocation[],
  thresholdPct: number = 5,
): RebalanceProposal {
  const totalMV = positions.reduce((s, p) => s + p.marketValue, 0);
  const driftResults = detectDrift(positions, targets, thresholdPct);
  const suggestedTrades = generateSuggestedTrades(positions, targets, totalMV);
  const taxImpacts = estimateTaxImpact(suggestedTrades, positions);
  const transactionCost = estimateTransactionCosts(suggestedTrades);

  return {
    portfolioId,
    portfolioName,
    totalMarketValue: totalMV,
    driftResults,
    suggestedTrades,
    taxImpacts,
    transactionCost,
    timestamp: new Date().toISOString(),
  };
}
