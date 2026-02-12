import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';

// ─── Escalation threshold ───
const ESCALATION_AMOUNT = 1000000; // ₹10L — flag large funding

// ─── Core: Log to client activity timeline ───
async function logToTimeline(params: {
  clientId: string;
  userId: string;
  title: string;
  description: string;
  activityType?: string;
}) {
  await supabase.from('client_activities').insert({
    client_id: params.clientId,
    activity_type: (params.activityType || 'note') as any,
    title: params.title,
    description: params.description,
    created_by: params.userId,
  });
}

// ─── Core: Create a follow-up task ───
async function createFollowUpTask(params: {
  clientId: string;
  userId: string;
  title: string;
  description: string;
  priority?: string;
  dueDaysFromNow?: number;
}) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (params.dueDaysFromNow ?? 1));

  await supabase.from('tasks').insert({
    client_id: params.clientId,
    title: params.title,
    description: params.description,
    priority: (params.priority || 'medium') as any,
    status: 'todo' as any,
    due_date: dueDate.toISOString().split('T')[0],
    trigger_type: 'system' as any,
    assigned_to: params.userId,
    created_by: params.userId,
  });
}

// ─── Core: Create funding alert ───
async function createFundingAlert(params: {
  requestId: string;
  advisorId: string;
  alertType: string;
  message: string;
}) {
  // Avoid duplicates
  const { data: existing } = await supabase
    .from('funding_alerts')
    .select('id')
    .eq('funding_request_id', params.requestId)
    .eq('alert_type', params.alertType)
    .eq('is_resolved', false)
    .maybeSingle();

  if (!existing) {
    await supabase.from('funding_alerts').insert({
      funding_request_id: params.requestId,
      advisor_id: params.advisorId,
      alert_type: params.alertType,
      message: params.message,
    });
  }
}

// ═══════════════════════════════════════════
//  NOTIFICATION TRIGGERS
// ═══════════════════════════════════════════

/** Trigger: Funding Initiated */
export async function notifyFundingInitiated(params: {
  requestId: string;
  clientId: string;
  clientName: string;
  userId: string;
  fundingType: string;
  amount: number;
}) {
  const amountStr = formatCurrency(params.amount);

  // 1. Client timeline
  await logToTimeline({
    clientId: params.clientId,
    userId: params.userId,
    title: `${params.fundingType} funding initiated`,
    description: `${params.fundingType} funding request of ${amountStr} has been initiated.`,
  });

  // 2. Escalation for large amounts
  if (params.amount >= ESCALATION_AMOUNT) {
    await createFundingAlert({
      requestId: params.requestId,
      advisorId: params.userId,
      alertType: 'large_amount_escalation',
      message: `⚠️ Large funding: ${params.clientName} — ${amountStr} (${params.fundingType}). Review and confirm.`,
    });
  }
}

/** Trigger: Funding Completed */
export async function notifyFundingCompleted(params: {
  requestId: string;
  clientId: string;
  clientName: string;
  userId: string;
  fundingType: string;
  amount: number;
}) {
  const amountStr = formatCurrency(params.amount);

  // 1. Client timeline
  await logToTimeline({
    clientId: params.clientId,
    userId: params.userId,
    title: `${params.fundingType} funding completed`,
    description: `${amountStr} funding via ${params.fundingType} has been completed. Cash balance updated.`,
  });

  // 2. Auto-create follow-up task
  await createFollowUpTask({
    clientId: params.clientId,
    userId: params.userId,
    title: `Review completed ${params.fundingType} funding`,
    description: `${amountStr} funding for ${params.clientName} completed. Verify cash balance and proceed with any pending trades.`,
    priority: 'medium',
    dueDaysFromNow: 1,
  });
}

/** Trigger: Funding Failed */
export async function notifyFundingFailed(params: {
  requestId: string;
  clientId: string;
  clientName: string;
  userId: string;
  fundingType: string;
  amount: number;
}) {
  const amountStr = formatCurrency(params.amount);

  // 1. Client timeline
  await logToTimeline({
    clientId: params.clientId,
    userId: params.userId,
    title: `${params.fundingType} funding failed`,
    description: `${amountStr} funding via ${params.fundingType} has failed. Immediate attention required.`,
    activityType: 'note',
  });

  // 2. Alert
  await createFundingAlert({
    requestId: params.requestId,
    advisorId: params.userId,
    alertType: 'funding_failed',
    message: `❌ ${params.fundingType} funding of ${amountStr} for ${params.clientName} has failed.`,
  });

  // 3. High-priority follow-up task
  await createFollowUpTask({
    clientId: params.clientId,
    userId: params.userId,
    title: `Resolve failed ${params.fundingType} funding`,
    description: `${amountStr} funding for ${params.clientName} failed. Contact client to resolve or re-initiate.`,
    priority: 'high',
    dueDaysFromNow: 0,
  });
}

/** Trigger: Funding pending > X days */
export async function notifyFundingStale(params: {
  requestId: string;
  clientId: string;
  clientName: string;
  userId: string;
  fundingType: string;
  amount: number;
  daysPending: number;
}) {
  const amountStr = formatCurrency(params.amount);

  // 1. Alert
  await createFundingAlert({
    requestId: params.requestId,
    advisorId: params.userId,
    alertType: 'funding_stale',
    message: `⏳ ${params.fundingType} funding of ${amountStr} for ${params.clientName} pending for ${params.daysPending} days.`,
  });

  // 2. Client timeline
  await logToTimeline({
    clientId: params.clientId,
    userId: params.userId,
    title: `Funding pending ${params.daysPending} days`,
    description: `${params.fundingType} funding of ${amountStr} has been pending for ${params.daysPending} days without progress.`,
  });

  // 3. Follow-up task
  await createFollowUpTask({
    clientId: params.clientId,
    userId: params.userId,
    title: `Follow up on stale ${params.fundingType} funding`,
    description: `${amountStr} funding for ${params.clientName} has been pending ${params.daysPending} days. Investigate and resolve.`,
    priority: 'high',
    dueDaysFromNow: 0,
  });
}

/** Trigger: Trade settlement mismatch */
export async function notifySettlementMismatch(params: {
  requestId: string;
  clientId: string;
  clientName: string;
  userId: string;
  fundingType: string;
  amount: number;
  settlementDate: string;
  daysOverdue: number;
}) {
  const amountStr = formatCurrency(params.amount);

  // 1. Alert
  await createFundingAlert({
    requestId: params.requestId,
    advisorId: params.userId,
    alertType: 'settlement_mismatch',
    message: `🔴 Settlement mismatch: ${params.clientName} — ${amountStr} (${params.fundingType}) was due ${params.settlementDate} (${params.daysOverdue} day${params.daysOverdue > 1 ? 's' : ''} overdue).`,
  });

  // 2. Client timeline
  await logToTimeline({
    clientId: params.clientId,
    userId: params.userId,
    title: `Settlement date mismatch`,
    description: `${params.fundingType} funding of ${amountStr} missed settlement date (${params.settlementDate}). ${params.daysOverdue} day(s) overdue.`,
  });

  // 3. Urgent task
  await createFollowUpTask({
    clientId: params.clientId,
    userId: params.userId,
    title: `Resolve settlement mismatch — ${params.clientName}`,
    description: `${amountStr} ${params.fundingType} funding missed settlement (${params.settlementDate}). Trade may be at risk. Escalate immediately.`,
    priority: 'high',
    dueDaysFromNow: 0,
  });
}

/** Check all in-progress requests for stale and settlement issues */
export async function checkFundingHealthAlerts(
  requests: Array<{
    id: string;
    client_id: string;
    funding_type: string;
    amount: number;
    workflow_stage: string;
    stage_updated_at: string;
    settlement_date: string | null;
    clients?: { client_name: string } | null;
  }>,
  userId: string,
  staleDaysThreshold = 3
) {
  const now = new Date();

  for (const r of requests) {
    if (r.workflow_stage === 'completed' || r.workflow_stage === 'failed') continue;
    const clientName = (r as any).clients?.client_name || 'Client';

    // Check stale (pending > X days without stage change)
    const daysSinceUpdate = Math.floor((now.getTime() - new Date(r.stage_updated_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate >= staleDaysThreshold) {
      await notifyFundingStale({
        requestId: r.id,
        clientId: r.client_id,
        clientName,
        userId,
        fundingType: r.funding_type,
        amount: Number(r.amount),
        daysPending: daysSinceUpdate,
      });
    }

    // Check settlement mismatch (overdue)
    if (r.settlement_date) {
      const settlementDate = new Date(r.settlement_date);
      const daysOverdue = Math.floor((now.getTime() - settlementDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue > 0) {
        await notifySettlementMismatch({
          requestId: r.id,
          clientId: r.client_id,
          clientName,
          userId,
          fundingType: r.funding_type,
          amount: Number(r.amount),
          settlementDate: r.settlement_date,
          daysOverdue,
        });
      }
    }
  }
}
