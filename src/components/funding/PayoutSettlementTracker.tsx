import { CheckCircle2, Clock, ArrowDownRight, Send, Wallet, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAYOUT_LIFECYCLE_STAGES = [
  { key: 'trade_executed', label: 'Trade Executed', icon: ArrowDownRight },
  { key: 'settlement_pending', label: 'Settlement Pending', icon: Clock },
  { key: 'cash_available', label: 'Cash Available', icon: Wallet },
  { key: 'payout_requested', label: 'Payout Requested', icon: Send },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

/**
 * Map payout status to lifecycle stage index:
 *  - Requested: stage 3 (payout_requested)
 *  - Approved / Processing: stage 3 (still in payout_requested phase)
 *  - Completed: stage 4
 *  - Failed: special
 *
 * settlementCleared: whether the linked trade has settled (funds moved to available)
 */
export const getPayoutLifecycleIndex = (
  status: string,
  settlementCleared: boolean,
): number => {
  if (status === 'Completed') return 4;
  if (status === 'Processing' || status === 'Approved') return 3;
  if (status === 'Requested') return 3;
  // Pre-request states (for settlement timeline view)
  if (settlementCleared) return 2;
  return 1; // settlement pending
};

interface PayoutSettlementTrackerProps {
  status: string;
  settlementCleared: boolean;
  isFailed?: boolean;
}

export const PayoutSettlementTracker = ({
  status,
  settlementCleared,
  isFailed = false,
}: PayoutSettlementTrackerProps) => {
  const currentIdx = getPayoutLifecycleIndex(status, settlementCleared);

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto py-2">
      {PAYOUT_LIFECYCLE_STAGES.map((stage, idx) => {
        const Icon = stage.icon;
        const isPast = !isFailed && currentIdx > idx;
        const isCurrent = !isFailed && currentIdx === idx;
        const isFuture = !isFailed && currentIdx < idx;

        return (
          <div key={stage.key} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all',
                  isPast && 'border-emerald-500 bg-emerald-500 text-white',
                  isCurrent && 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/30',
                  isFuture && 'border-muted-foreground/30 bg-muted text-muted-foreground',
                  isFailed && idx <= currentIdx && 'border-destructive bg-destructive/20 text-destructive',
                )}
              >
                {isPast ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  'text-[10px] text-center max-w-[72px] leading-tight',
                  isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {stage.label}
              </span>
            </div>
            {idx < PAYOUT_LIFECYCLE_STAGES.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-6 mx-1 mt-[-16px]',
                  isPast ? 'bg-emerald-500' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </div>
        );
      })}
      {isFailed && (
        <div className="flex items-center ml-2 flex-shrink-0">
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full flex items-center justify-center border-2 border-destructive bg-destructive text-white">
              <XCircle className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-semibold text-destructive">Failed</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface SettlementTimelineProps {
  tradeDate?: string | null;
  settlementDate?: string | null;
  cashAvailableDate?: string | null;
  payoutRequestedDate?: string | null;
  completedDate?: string | null;
  status: string;
}

export const SettlementTimeline = ({
  tradeDate,
  settlementDate,
  cashAvailableDate,
  payoutRequestedDate,
  completedDate,
  status,
}: SettlementTimelineProps) => {
  const events = [
    { label: 'Trade Executed', date: tradeDate, icon: ArrowDownRight },
    { label: 'Settlement Date', date: settlementDate, icon: Clock },
    { label: 'Cash Available', date: cashAvailableDate, icon: Wallet },
    { label: 'Payout Requested', date: payoutRequestedDate, icon: Send },
    ...(status === 'Completed' ? [{ label: 'Payout Completed', date: completedDate, icon: CheckCircle2 }] : []),
  ].filter(e => e.date);

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No settlement timeline data available.</p>;
  }

  return (
    <div className="space-y-0 pl-4 border-l-2 border-muted ml-3">
      {events.map((event, i) => {
        const Icon = event.icon;
        const isPast = true; // all shown events have dates
        return (
          <div key={i} className="relative pb-4 last:pb-0">
            <div className="absolute -left-[21px] top-0 h-6 w-6 rounded-full flex items-center justify-center border-2 bg-background border-emerald-500 text-emerald-500">
              <Icon className="h-3 w-3" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium">{event.label}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(event.date!).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
