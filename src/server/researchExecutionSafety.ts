import { calculateResearchEconomicsScenario, EconomicsScenarioError } from './researchEconomicsScenario';
import { planResearchExecution } from './researchExecutionPlan';
import { PINNED_APIFY_ACTOR, PINNED_OPENROUTER_MODEL } from './researchEconomics';
import { freeze, object, integer } from './providers/adapterContract';

export type SafetyReason = 'OFFLINE_ONLY' | 'ACTIVATION_BLOCKED' | 'INVALID_EVIDENCE' | 'ARITHMETIC_OVERFLOW' |
  'PROVISIONAL_COSTS' | 'UNKNOWN_COSTS' | 'CAP_EXCEEDED' | 'CLAIM_MISSING' | 'CLAIM_STALE' |
  'OWNERSHIP_CONFLICT' | 'FENCING_MISSING' | 'FENCING_CONFLICT' | 'INTENT_MISSING' | 'SUBMISSION_UNCERTAIN' |
  'PROVIDER_ID_MISSING' | 'PROVIDER_IDENTITY_CONFLICT' | 'UNRESOLVED_OUTCOME' | 'RECONCILIATION_REQUIRED' |
  'RECONCILIATION_CONFLICT' | 'ESTIMATED_ONLY' | 'BILLING_UNKNOWN' | 'BILLING_CONFLICT' | 'BILLING_RECONCILIATION_REQUIRED' |
  'INVOICE_AUTHORITY_MISSING' | 'LATE_CHARGE' | 'ESTIMATED_SETTLEMENT' | 'IDENTITY_UNVERIFIED' |
  'REPEAT_TRIAL_GRANT' | 'CONCURRENT_TRIAL_REDEMPTION' | 'TRIAL_LIABILITY' | 'TRIAL_BUDGET_INSUFFICIENT' |
  'TRIAL_ENTITLEMENT_UNIMPLEMENTED' | 'PLANNER_REVIEW_REQUIRED';
export type SafetyControl = 'keep_execution_disabled' | 'verify_pricing_and_full_costs' |
  'atomic_owner_claim_and_fencing' | 'durable_submission_and_provider_identity' |
  'authoritative_outcome_reconciliation' | 'authoritative_billing_and_late_adjustments' |
  'atomic_one_time_trial_entitlement_and_budget';
const BASE = Object.freeze({ mode: 'offline-safety-assessment' as const,
  evidenceTrust: 'synthetic_unverified' as const, activationBlocked: true as const,
  executionAuthorized: false as const, automaticRetryAllowed: false as const,
  requiresAuthoritativeDatabaseValidation: true as const });
function result<T>(status: 'HOLD' | 'REVIEW', reasons: SafetyReason[], control: SafetyControl, data: T) {
  const reasonCodes = [...new Set<SafetyReason>(['OFFLINE_ONLY', 'ACTIVATION_BLOCKED', ...reasons])].sort();
  // Incomplete exposure or a cap violation cannot be downgraded to advisory REVIEW.
  const effectiveStatus = reasons.includes('UNKNOWN_COSTS') || reasons.includes('CAP_EXCEEDED') ? 'HOLD' : status;
  return freeze({ ...BASE, status: effectiveStatus, reasonCodes, evidenceGaps: [...reasons].sort(),
    nextRequiredControls: [...new Set<SafetyControl>(['keep_execution_disabled', control])], data });
}
function assess<T>(control: SafetyControl, action: () => { hold: boolean; reasons: SafetyReason[]; data: T }) {
  try {
    const value = action();
    return result(value.hold ? 'HOLD' : 'REVIEW', value.reasons, control, value.data);
  } catch (error) {
    const code: SafetyReason = error instanceof EconomicsScenarioError && error.code === 'OVERFLOW'
      ? 'ARITHMETIC_OVERFLOW' : 'INVALID_EVIDENCE';
    return result('HOLD', [code], control, null);
  }
}
function bool(value: unknown): boolean { if (typeof value !== 'boolean') throw new Error('invalid'); return value; }
function choice<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error('invalid');
  return value as T;
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:/-]{1,200}$/.test(value)) throw new Error('invalid');
  return value;
}
function optionalId(value: unknown): string | null { return value === null ? null : id(value); }
function amount(value: unknown): number { return integer(value, Number.MAX_SAFE_INTEGER); }
function optionalAmount(value: unknown): number | null { return value === null ? null : amount(value); }

/** Reuses provisional arithmetic, never the active rate card or an activation override. */
export function assessResearchCost(input: unknown) {
  return assess('verify_pricing_and_full_costs', () => {
    const scenario = calculateResearchEconomicsScenario(input);
    const reasons: SafetyReason[] = ['PROVISIONAL_COSTS', 'UNKNOWN_COSTS'];
    if (scenario.reservedCapViolated) reasons.push('CAP_EXCEEDED');
    return { hold: scenario.reservedCapViolated, reasons, data: scenario };
  });
}

/** All evidence is caller-supplied simulation, not a real lease, lock or admission. */
export function assessDispatchOwnership(input: unknown) {
  return assess('atomic_owner_claim_and_fencing', () => {
    const v = object(input, ['workerId', 'claimWorkerId', 'durableClaim', 'claimState', 'contendingWorkers',
      'fence', 'currentFence', 'submissionIntent', 'provider', 'providerIdentifier', 'providerRequestId']);
    const worker = optionalId(v.workerId), owner = optionalId(v.claimWorkerId);
    const durable = bool(v.durableClaim);
    const state = choice(v.claimState, ['missing', 'current', 'stale', 'expired'] as const);
    const contenders = amount(v.contendingWorkers);
    const fence = optionalAmount(v.fence), current = optionalAmount(v.currentFence);
    const intent = choice(v.submissionIntent, ['missing', 'recorded', 'uncertain'] as const);
    const provider = choice(v.provider, ['apify', 'openrouter'] as const);
    const identifier = id(v.providerIdentifier), external = optionalId(v.providerRequestId);
    const reasons: SafetyReason[] = [];
    if (!durable || !worker || !owner || state === 'missing') reasons.push('CLAIM_MISSING');
    if (state === 'stale' || state === 'expired') reasons.push('CLAIM_STALE');
    if (worker !== owner || contenders !== 1) reasons.push('OWNERSHIP_CONFLICT');
    if (fence === null || current === null || fence === 0 || current === 0) reasons.push('FENCING_MISSING');
    else if (fence !== current) reasons.push('FENCING_CONFLICT');
    if (intent === 'missing') reasons.push('INTENT_MISSING');
    if (intent === 'uncertain') reasons.push('SUBMISSION_UNCERTAIN', 'RECONCILIATION_REQUIRED');
    if (external === null) reasons.push('PROVIDER_ID_MISSING');
    if (identifier !== (provider === 'apify' ? PINNED_APIFY_ACTOR : PINNED_OPENROUTER_MODEL)) reasons.push('PROVIDER_IDENTITY_CONFLICT');
    return { hold: reasons.length > 0, reasons, data: { claimState: state,
      submissionIntent: intent, durableEnforcementVerified: false as const,
      providerIdentityBound: false as const } };
  });
}

/** Explicit latch must be carried across calls by the caller; a job snapshot cannot clear it. */
export function assessResearchOutcome(input: unknown) {
  return assess('authoritative_outcome_reconciliation', () => {
    const v = object(input, ['requestId', 'attemptId', 'unresolvedOutcome', 'outcome', 'providerRequestId', 'reconciliation']);
    const request = id(v.requestId), attempt = id(v.attemptId), external = optionalId(v.providerRequestId);
    const prior = bool(v.unresolvedOutcome);
    const outcome = choice(v.outcome, ['not_submitted', 'accepted', 'completed', 'definitive_failure',
      'unknown', 'timeout', 'disconnected', 'partial'] as const);
    let unresolved = prior || ['unknown', 'timeout', 'disconnected', 'partial', 'accepted'].includes(outcome);
    const reasons: SafetyReason[] = [];
    const missingId = outcome !== 'not_submitted' && external === null;
    if (missingId) { unresolved = true; reasons.push('PROVIDER_ID_MISSING'); }
    let reconciliationAssessment: 'not_supplied' | 'insufficient' | 'conflicting' | 'resolution_candidate' = 'not_supplied';
    if (v.reconciliation !== null) {
      const r = object(v.reconciliation, ['requestId', 'attemptId', 'providerRequestId', 'authoritative', 'fresh', 'decision']);
      const rRequest = id(r.requestId), rAttempt = id(r.attemptId), rExternal = optionalId(r.providerRequestId);
      const authority = bool(r.authoritative), fresh = bool(r.fresh);
      const decision = choice(r.decision, ['not_submitted', 'completed', 'definitive_failure'] as const);
      const conflict = rRequest !== request || rAttempt !== attempt || rExternal !== external ||
        (decision === 'not_submitted' && external !== null) ||
        (['completed', 'definitive_failure'].includes(outcome) && decision !== outcome);
      if (conflict) {
        reconciliationAssessment = 'conflicting'; unresolved = true; reasons.push('RECONCILIATION_CONFLICT');
      } else if (!authority || !fresh || missingId || (decision !== 'not_submitted' && external === null)) {
        reconciliationAssessment = 'insufficient'; unresolved = true;
      } else {
        reconciliationAssessment = 'resolution_candidate'; unresolved = false;
      }
    }
    if (unresolved) reasons.push('UNRESOLVED_OUTCOME', 'RECONCILIATION_REQUIRED');
    return { hold: unresolved, reasons, data: { advisoryUnresolvedOutcome: unresolved,
      reconciliationAssessment, authoritativeResolutionVerified: false as const } };
  });
}

export function assessResearchBilling(input: unknown) {
  return assess('authoritative_billing_and_late_adjustments', () => {
    const v = object(input, ['estimatedMicroUsd', 'reportedMicroUsd', 'invoicedMicroUsd', 'invoiceAuthoritative',
      'recordsConflict', 'settledUsingEstimate', 'lateChargeMicroUsd']);
    const estimated = optionalAmount(v.estimatedMicroUsd), reported = optionalAmount(v.reportedMicroUsd);
    const invoiced = optionalAmount(v.invoicedMicroUsd), late = optionalAmount(v.lateChargeMicroUsd);
    const authority = bool(v.invoiceAuthoritative), conflict = bool(v.recordsConflict);
    const settled = bool(v.settledUsingEstimate);
    if (invoiced !== null && late !== null && BigInt(invoiced) + BigInt(late) > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new EconomicsScenarioError('OVERFLOW');
    }
    const reasons: SafetyReason[] = [];
    if (reported === null) reasons.push('ESTIMATED_ONLY');
    if (reported === null || invoiced === null || late === null) reasons.push('BILLING_UNKNOWN');
    if (!authority) reasons.push('INVOICE_AUTHORITY_MISSING');
    if (conflict) reasons.push('BILLING_CONFLICT');
    if (reported !== null && invoiced !== null && reported !== invoiced) reasons.push('BILLING_RECONCILIATION_REQUIRED');
    if (late !== null && late > 0) reasons.push('LATE_CHARGE');
    if (settled) reasons.push('ESTIMATED_SETTLEMENT');
    const stage = invoiced !== null && authority && reasons.length === 0 ? 'invoice_reconciled_claim' as const :
      reported !== null ? 'provider_reported' as const : 'estimated_or_unknown' as const;
    return { hold: reasons.length > 0, reasons, data: { estimatedMicroUsd: estimated,
      reportedMicroUsd: reported, invoicedMicroUsd: invoiced, lateChargeMicroUsd: late,
      billingEvidenceClass: stage, finalCostsVerified: false as const } };
  });
}

export function assessProposedTrial(input: unknown) {
  return assess('atomic_one_time_trial_entitlement_and_budget', () => {
    const v = object(input, ['identityVerified', 'priorGrants', 'concurrentRedemptions',
      'proposedGlobalBudgetMicroUsd', 'reservedMicroUsd', 'settledMicroUsd', 'unresolvedLiabilityMicroUsd']);
    const identity = bool(v.identityVerified), grants = amount(v.priorGrants), concurrent = amount(v.concurrentRedemptions);
    const proposed = amount(v.proposedGlobalBudgetMicroUsd), reserved = amount(v.reservedMicroUsd);
    const settled = amount(v.settledMicroUsd), liability = optionalAmount(v.unresolvedLiabilityMicroUsd);
    const knownCommitted = BigInt(reserved) + BigInt(settled) + BigInt(liability ?? 0);
    if (knownCommitted > BigInt(Number.MAX_SAFE_INTEGER)) throw new EconomicsScenarioError('OVERFLOW');
    const exposure = calculateResearchEconomicsScenario({ pages: 1, apifyAttempts: 2, openrouterAttempts: 2 });
    const reasons: SafetyReason[] = ['TRIAL_ENTITLEMENT_UNIMPLEMENTED', 'UNKNOWN_COSTS'];
    if (!identity) reasons.push('IDENTITY_UNVERIFIED');
    if (grants > 0) reasons.push('REPEAT_TRIAL_GRANT');
    if (concurrent > 0) reasons.push('CONCURRENT_TRIAL_REDEMPTION');
    if (liability === null || liability > 0) reasons.push('TRIAL_LIABILITY');
    if (liability === null || knownCommitted + BigInt(exposure.fullReservedCostMicroUsd) > BigInt(proposed)) reasons.push('TRIAL_BUDGET_INSUFFICIENT');
    return { hold: true, reasons, data: { proposedCredits: 1 as const, proposedGlobalBudgetMicroUsd: proposed,
      operationalTrialBudgetMicroUsd: 0 as const, trialGranted: false as const, budgetReserved: false as const,
      unresolvedLiabilityMicroUsd: liability,
      proposedBudgetFitsIncludedCostsOnly: liability !== null && knownCommitted + BigInt(exposure.fullReservedCostMicroUsd) <= BigInt(proposed),
      provisionalSearchExposureMicroUsd: exposure.fullReservedCostMicroUsd } };
  });
}

/** Components are independent synthetic assessments, not an executable coordinator. */
export function assessResearchExecutionSafety(input: unknown) {
  return assess('keep_execution_disabled', () => {
    const v = object(input, ['observation', 'cost', 'ownership', 'outcome', 'billing', 'trial']);
    const planner = planResearchExecution(v.observation);
    const cost = assessResearchCost(v.cost), ownership = assessDispatchOwnership(v.ownership);
    const outcome = assessResearchOutcome(v.outcome), billing = assessResearchBilling(v.billing);
    const trial = assessProposedTrial(v.trial);
    const componentReasons = [cost, ownership, outcome, billing, trial].flatMap(component => component.reasonCodes);
    return { hold: true, reasons: [...new Set<SafetyReason>(['PLANNER_REVIEW_REQUIRED', ...componentReasons])],
      data: { planner, cost, ownership, outcome, billing, trial } };
  });
}
