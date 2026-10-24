import { parseResearchReservationResponse } from './researchRpcResponse';

// M2 research_jobs.status, not provider-attempt or credit-operation statuses.
export const RESEARCH_JOB_STATUSES = Object.freeze([
  'reserved', 'apify_running', 'apify_complete', 'apify_failed',
  'openrouter_running', 'openrouter_complete', 'openrouter_failed',
  'ambiguous', 'succeeded', 'failed', 'rejected'
] as const);
export type ResearchJobStatus = typeof RESEARCH_JOB_STATUSES[number];
export type ResearchLifecycleRpc = 'reserve_research_job' | 'begin_research_provider_attempt' |
  'finish_research_provider_attempt' | 'mark_research_job_ambiguous' | 'complete_research_job' | 'fail_research_job';

export type ResearchPlanObservation =
  | { kind: 'reservation_response'; response: unknown }
  // A projected job status, not an attempt RPC response. No ownership is inferred.
  | { kind: 'job_snapshot'; status: ResearchJobStatus }
  | { kind: 'transport_unknown'; lastKnownStatus?: ResearchJobStatus }
  | { kind: 'database_error' };

export type ResearchPlanClassification = 'new_reservation' | 'existing_reservation' | 'processing' |
  'stage_complete' | 'stage_failed' | 'terminal' | 'ambiguous' | 'transport_unknown' | 'database_error' | 'invalid_observation';
export type ResearchReviewBoundary = 'attempt_admission_review' | 'inspect_existing_job_and_attempts' |
  'reconcile_in_flight_attempt' | 'completion_evidence_review' | 'definitive_failure_or_retry_review' |
  'audited_reconciliation' | 'none';

const prerequisites = Object.freeze([
  'authenticated_owner_and_request_binding', 'verified_effective_provider_pricing',
  'authoritative_database_attempt_admission', 'current_credit_and_budget_checks',
  'exclusive_durable_execution_claim', 'no_unreconciled_unknown_outcome'
] as const);
export interface OfflineResearchPlan {
  readonly mode: 'offline-only';
  readonly databaseStatus: ResearchJobStatus | null;
  readonly classification: ResearchPlanClassification;
  readonly review: ResearchReviewBoundary;
  readonly executionAuthorized: false;
  readonly automaticRetryAllowed: false;
  readonly requiresAuthoritativeDatabaseValidation: true;
  readonly providerPrerequisites: typeof prerequisites;
}

function record(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Reflect.ownKeys(value).every(key => typeof key === 'string' &&
    'value' in Object.getOwnPropertyDescriptor(value, key)!);
}
function keys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}
function status(value: unknown): value is ResearchJobStatus {
  return typeof value === 'string' && (RESEARCH_JOB_STATUSES as readonly string[]).includes(value);
}
function plan(databaseStatus: ResearchJobStatus | null, classification: ResearchPlanClassification,
  review: ResearchReviewBoundary): OfflineResearchPlan {
  return Object.freeze({ mode: 'offline-only', databaseStatus, classification, review,
    executionAuthorized: false, automaticRetryAllowed: false,
    requiresAuthoritativeDatabaseValidation: true, providerPrerequisites: prerequisites });
}
function fromStatus(value: ResearchJobStatus): OfflineResearchPlan {
  switch (value) {
    case 'reserved': return plan(value, 'existing_reservation', 'inspect_existing_job_and_attempts');
    case 'apify_running': case 'openrouter_running': return plan(value, 'processing', 'reconcile_in_flight_attempt');
    case 'apify_complete': return plan(value, 'stage_complete', 'attempt_admission_review');
    case 'openrouter_complete': return plan(value, 'stage_complete', 'completion_evidence_review');
    case 'apify_failed': case 'openrouter_failed': return plan(value, 'stage_failed', 'definitive_failure_or_retry_review');
    case 'ambiguous': return plan(value, 'ambiguous', 'audited_reconciliation');
    case 'failed': case 'succeeded': case 'rejected': return plan(value, 'terminal', 'none');
  }
}

// Stateless planning only: no client, callbacks, clock, credentials, RPC or HTTP.
// Catch malformed JSON-like inputs without copying raw errors/data into output.
export function planResearchExecution(observation: unknown): OfflineResearchPlan {
  const invalid = () => plan(null, 'invalid_observation', 'audited_reconciliation');
  try {
    if (!record(observation)) return invalid();
    switch (observation.kind) {
      case 'transport_unknown':
        if (!keys(observation, ['kind', 'lastKnownStatus']) ||
            (observation.lastKnownStatus !== undefined && !status(observation.lastKnownStatus))) return invalid();
        return plan(observation.lastKnownStatus as ResearchJobStatus | undefined ?? null, 'transport_unknown', 'audited_reconciliation');
      case 'database_error':
        return keys(observation, ['kind']) ? plan(null, 'database_error', 'inspect_existing_job_and_attempts') : invalid();
      case 'job_snapshot':
        return keys(observation, ['kind', 'status']) && status(observation.status) ? fromStatus(observation.status) : invalid();
      case 'reservation_response': {
        if (!keys(observation, ['kind', 'response']) || !record(observation.response)) return invalid();
        const response = observation.response;
        if (!keys(response, ['success', 'idempotent', 'status', 'credits_reserved', 'credits_remaining',
          'provider_budget_reserved_micro_usd', 'required']) || !status(response.status)) return invalid();
        parseResearchReservationResponse(response);
        if (response.idempotent === true && (
          !Number.isSafeInteger(response.credits_reserved) || (response.credits_reserved as number) < 1 ||
          (response.credits_reserved as number) > 3 || !Number.isSafeInteger(response.provider_budget_reserved_micro_usd) ||
          (response.provider_budget_reserved_micro_usd as number) < 0)) return invalid();
        if (response.required !== undefined && (!Number.isInteger(response.required) || (response.required as number) > 3)) return invalid();
        if (response.status === 'reserved' && response.idempotent === false) {
          if (!Number.isInteger(response.credits_reserved) || (response.credits_reserved as number) > 3) return invalid();
          return plan('reserved', 'new_reservation', 'attempt_admission_review');
        }
        return fromStatus(response.status);
      }
      default: return invalid();
    }
  } catch {
    return invalid();
  }
}

export interface ResearchTransitionObservation {
  rpc: ResearchLifecycleRpc;
  from: ResearchJobStatus | null;
  to: ResearchJobStatus;
  replay: boolean;
}
export interface OfflineResearchTransition {
  readonly assessment: 'candidate' | 'duplicate' | 'blocked';
  readonly executionAuthorized: false;
  readonly automaticRetryAllowed: false;
  readonly requiresAuthoritativeDatabaseValidation: true;
}
const rpcs: readonly ResearchLifecycleRpc[] = Object.freeze(['reserve_research_job', 'begin_research_provider_attempt',
  'finish_research_provider_attempt', 'mark_research_job_ambiguous', 'complete_research_job', 'fail_research_job']);
const terminal = (s: ResearchJobStatus) => s === 'succeeded' || s === 'failed' || s === 'rejected';

// Describes a candidate M2 job transition; does NOT apply it or parse attempt RPC
// statuses as job statuses. Parameters, provenance, attempts, costs and ownership
// must still be checked authoritatively. In-flight failures are conservative.
export function describeResearchTransition(input: unknown): OfflineResearchTransition {
  const result = (assessment: OfflineResearchTransition['assessment']): OfflineResearchTransition => Object.freeze({
    assessment, executionAuthorized: false, automaticRetryAllowed: false, requiresAuthoritativeDatabaseValidation: true
  });
  try {
    if (!record(input) || !keys(input, ['rpc','from','to','replay']) ||
        !rpcs.includes(input.rpc as ResearchLifecycleRpc) || !status(input.to) ||
        (input.from !== null && !status(input.from)) || typeof input.replay !== 'boolean') return result('blocked');
    const { rpc, from, to, replay } = input as unknown as ResearchTransitionObservation;
    if (from === 'ambiguous') return result('blocked');
    if (replay) {
      // begin/finish duplicate attempt responses do not establish the current job
      // status. Only describe a no-change snapshot; never restart the provider.
      const duplicate = from === to && (rpc === 'reserve_research_job' ||
        rpc === 'begin_research_provider_attempt' || rpc === 'finish_research_provider_attempt' ||
        (rpc === 'complete_research_job' && from === 'succeeded') ||
        (rpc === 'fail_research_job' && from === 'failed'));
      return result(duplicate ? 'duplicate' : 'blocked');
    }
    if (from === null) return result(rpc === 'reserve_research_job' && (to === 'reserved' || to === 'rejected') ? 'candidate' : 'blocked');
    if (terminal(from)) return result('blocked');
    let candidate = false;
    switch (rpc) {
      case 'begin_research_provider_attempt':
        candidate = ((from === 'reserved' || from === 'apify_failed') && to === 'apify_running') ||
          ((from === 'apify_complete' || from === 'openrouter_failed') && to === 'openrouter_running');
        break;
      case 'finish_research_provider_attempt':
        candidate = (from === 'apify_running' && ['apify_complete','apify_failed','ambiguous'].includes(to)) ||
          (from === 'openrouter_running' && ['openrouter_complete','openrouter_failed','ambiguous'].includes(to));
        break;
      case 'mark_research_job_ambiguous': candidate = to === 'ambiguous'; break;
      case 'complete_research_job': candidate = from === 'openrouter_complete' && to === 'succeeded'; break;
      case 'fail_research_job':
        candidate = to === 'failed' && from !== 'apify_running' && from !== 'openrouter_running';
        break;
    }
    return result(candidate ? 'candidate' : 'blocked');
  } catch {
    return result('blocked');
  }
}
