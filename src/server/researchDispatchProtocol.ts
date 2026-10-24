import { PINNED_APIFY_ACTOR, PINNED_OPENROUTER_MODEL, MAX_OPENROUTER_INPUT_TOKENS,
  MAX_OPENROUTER_OUTPUT_TOKENS } from './researchEconomics';
import { freeze, object, integer } from './providers/adapterContract';

export const DISPATCH_PROTOCOL_LIMITS = Object.freeze({ history: 128, billingEvents: 64 });
export type DispatchPhase = 'unclaimed' | 'claimed' | 'submission_armed' | 'acceptance_unknown' |
  'provider_accepted' | 'provider_completed' | 'provider_failed' | 'reconciliation_hold' | 'reconciled';
export type ProtocolReason = 'FRESH_TRANSITION' | 'EXACT_REPLAY' | 'DUPLICATE_BILLING_EVENT' |
  'INVALID_INPUT' | 'INVALID_STATE' | 'IDENTITY_MISMATCH' | 'CONFLICTING_REPLAY' | 'STALE_EPOCH' |
  'OWNER_CONFLICT' | 'LEASE_ACTIVE' | 'LEASE_EXPIRED' | 'SUBMISSION_BOUNDARY_CROSSED' |
  'INVALID_TRANSITION' | 'PROVIDER_ID_CONFLICT' | 'PROVIDER_ID_MISSING' | 'RECONCILIATION_REQUIRED' |
  'RECONCILIATION_CONFLICT' | 'BILLING_EVENT_CONFLICT' | 'OVERFLOW' | 'LIMIT_EXCEEDED';
const SAFETY = Object.freeze({ mode: 'offline-protocol-model' as const, evidenceTrust: 'synthetic_unverified' as const,
  activationBlocked: true as const, executionAuthorized: false as const, automaticRetryAllowed: false as const,
  requiresAuthoritativeDatabaseValidation: true as const, durableTransitionApplied: false as const,
  authoritativeResolutionVerified: false as const, invoiceFinalityVerified: false as const });
export interface DispatchIdentity {
  readonly requestId: string; readonly attemptId: string;
  readonly provider: 'apify' | 'openrouter'; readonly providerIdentifier: string; readonly intentDigest: string;
}
interface BillingEvent {
  readonly id: string;
  readonly kind: 'estimate' | 'reported_usage' | 'billing_event' | 'invoice' | 'late_adjustment';
  readonly amountMicroUsd: number | null;
  readonly inputTokens: number | null; readonly outputTokens: number | null;
}
interface EventBase { readonly eventId: string; readonly identity: DispatchIdentity }
type ProtocolEvent = EventBase & (
  | { readonly type: 'claim'; readonly workerId: string; readonly expectedEpoch: number; readonly now: number; readonly leaseExpiresAt: number }
  | { readonly type: 'arm'; readonly workerId: string; readonly epoch: number; readonly now: number }
  | { readonly type: 'uncertain'; readonly workerId: string; readonly epoch: number;
      readonly cause: 'unknown_acceptance' | 'timeout' | 'disconnect' | 'partial_result' | 'post_send_crash' | 'lost_arm_response' }
  | { readonly type: 'bind_provider'; readonly workerId: string; readonly epoch: number; readonly providerRequestId: string }
  | { readonly type: 'outcome'; readonly workerId: string; readonly epoch: number; readonly providerRequestId: string; readonly outcome: 'completed' | 'failed' }
  | { readonly type: 'reconcile'; readonly evidenceId: string; readonly providerRequestId: string | null;
      readonly authoritative: boolean; readonly fresh: boolean; readonly priorSenderQuiesced: boolean; readonly expectedRevision: number;
      readonly decision: 'not_submitted' | 'completed' | 'failed' }
  | { readonly type: 'billing'; readonly billingEvent: BillingEvent }
);
type BillingSummary = Readonly<{ estimateMicroUsd: number | null; reportedMicroUsd: number | null;
  billedMicroUsd: number | null; invoicedMicroUsd: number | null; adjustmentsMicroUsd: number | null;
  billedPlusAdjustmentsMicroUsd: number | null; finalCostsVerified: false }>;
export interface DispatchProtocolState {
  readonly mode: typeof SAFETY.mode; readonly evidenceTrust: typeof SAFETY.evidenceTrust;
  readonly activationBlocked: true; readonly executionAuthorized: false; readonly automaticRetryAllowed: false;
  readonly requiresAuthoritativeDatabaseValidation: true; readonly durableTransitionApplied: false;
  readonly authoritativeResolutionVerified: false; readonly invoiceFinalityVerified: false;
  readonly identity: DispatchIdentity; readonly phase: DispatchPhase; readonly claimEpoch: number;
  readonly ownerId: string | null; readonly leaseExpiresAt: number | null;
  readonly submissionBoundaryCrossed: boolean; readonly providerRequestId: string | null;
  readonly unresolvedOutcome: boolean; readonly executionOutcome: 'completed' | 'failed' | 'not_submitted' | null;
  readonly financialReconciliationStatus: 'unverified' | 'pending';
  readonly billingEvents: readonly BillingEvent[]; readonly billingSummary: BillingSummary;
  readonly history: readonly ProtocolEvent[];
}
export class DispatchProtocolError extends Error {
  constructor(public readonly code: ProtocolReason) { super(`Offline dispatch protocol rejected: ${code}.`); this.name = 'DispatchProtocolError'; }
}
function fail(code: ProtocolReason): never { throw new DispatchProtocolError(code); }
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:/-]{1,100}$/.test(value)) fail('INVALID_INPUT');
  return value;
}
function enumeration<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== 'string' || !values.includes(value as T)) fail('INVALID_INPUT');
  return value as T;
}
function boolean(value: unknown): boolean { if (typeof value !== 'boolean') fail('INVALID_INPUT'); return value; }
function safeSigned(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) fail('OVERFLOW');
  return Number(value);
}
function parseIdentity(value: unknown): DispatchIdentity {
  const v = object(value, ['requestId', 'attemptId', 'provider', 'providerIdentifier', 'intentDigest']);
  const provider = enumeration(v.provider, ['apify', 'openrouter'] as const);
  const providerIdentifier = id(v.providerIdentifier);
  if (providerIdentifier !== (provider === 'apify' ? PINNED_APIFY_ACTOR : PINNED_OPENROUTER_MODEL) ||
      typeof v.intentDigest !== 'string' || !/^[a-f0-9]{64}$/.test(v.intentDigest)) fail('INVALID_INPUT');
  return { requestId: id(v.requestId), attemptId: id(v.attemptId), provider, providerIdentifier, intentDigest: v.intentDigest };
}
function parseBilling(value: unknown): BillingEvent {
  const v = object(value, ['id', 'kind', 'amountMicroUsd', 'inputTokens', 'outputTokens']);
  const kind = enumeration(v.kind, ['estimate', 'reported_usage', 'billing_event', 'invoice', 'late_adjustment'] as const);
  const amount = v.amountMicroUsd === null ? null : kind === 'late_adjustment'
    ? (Number.isSafeInteger(v.amountMicroUsd) ? v.amountMicroUsd as number : fail('INVALID_INPUT'))
    : integer(v.amountMicroUsd, Number.MAX_SAFE_INTEGER);
  if (kind === 'late_adjustment' && amount === null) fail('INVALID_INPUT');
  const inputTokens = v.inputTokens === null ? null : integer(v.inputTokens, MAX_OPENROUTER_INPUT_TOKENS);
  const outputTokens = v.outputTokens === null ? null : integer(v.outputTokens, MAX_OPENROUTER_OUTPUT_TOKENS);
  if (kind !== 'reported_usage' && (inputTokens !== null || outputTokens !== null)) fail('INVALID_INPUT');
  return { id: id(v.id), kind, amountMicroUsd: amount, inputTokens, outputTokens };
}
function parseEvent(value: unknown): ProtocolEvent {
  const all = ['eventId', 'identity', 'type', 'workerId', 'expectedEpoch', 'epoch', 'now', 'leaseExpiresAt',
    'cause', 'providerRequestId', 'outcome', 'evidenceId', 'authoritative', 'fresh', 'priorSenderQuiesced', 'expectedRevision', 'decision', 'billingEvent'];
  const v = object(value, all);
  const base = { eventId: id(v.eventId), identity: parseIdentity(v.identity) };
  const exact = (fields: string[]) => object(value, ['eventId', 'identity', 'type', ...fields]);
  switch (v.type) {
    case 'claim': exact(['workerId', 'expectedEpoch', 'now', 'leaseExpiresAt']); return { ...base, type: 'claim',
      workerId: id(v.workerId), expectedEpoch: integer(v.expectedEpoch, Number.MAX_SAFE_INTEGER),
      now: integer(v.now, Number.MAX_SAFE_INTEGER), leaseExpiresAt: integer(v.leaseExpiresAt, Number.MAX_SAFE_INTEGER) };
    case 'arm': exact(['workerId', 'epoch', 'now']); return { ...base, type: 'arm', workerId: id(v.workerId),
      epoch: integer(v.epoch, Number.MAX_SAFE_INTEGER, 1), now: integer(v.now, Number.MAX_SAFE_INTEGER) };
    case 'uncertain': exact(['workerId', 'epoch', 'cause']); return { ...base, type: 'uncertain', workerId: id(v.workerId),
      epoch: integer(v.epoch, Number.MAX_SAFE_INTEGER, 1), cause: enumeration(v.cause,
        ['unknown_acceptance', 'timeout', 'disconnect', 'partial_result', 'post_send_crash', 'lost_arm_response'] as const) };
    case 'bind_provider': exact(['workerId', 'epoch', 'providerRequestId']); return { ...base, type: 'bind_provider',
      workerId: id(v.workerId), epoch: integer(v.epoch, Number.MAX_SAFE_INTEGER, 1), providerRequestId: id(v.providerRequestId) };
    case 'outcome': exact(['workerId', 'epoch', 'providerRequestId', 'outcome']); return { ...base, type: 'outcome',
      workerId: id(v.workerId), epoch: integer(v.epoch, Number.MAX_SAFE_INTEGER, 1), providerRequestId: id(v.providerRequestId),
      outcome: enumeration(v.outcome, ['completed', 'failed'] as const) };
    case 'reconcile': exact(['evidenceId', 'providerRequestId', 'authoritative', 'fresh', 'priorSenderQuiesced', 'expectedRevision', 'decision']);
      return { ...base, type: 'reconcile', evidenceId: id(v.evidenceId), providerRequestId: v.providerRequestId === null ? null : id(v.providerRequestId),
        authoritative: boolean(v.authoritative), fresh: boolean(v.fresh), priorSenderQuiesced: boolean(v.priorSenderQuiesced),
        expectedRevision: integer(v.expectedRevision, DISPATCH_PROTOCOL_LIMITS.history),
        decision: enumeration(v.decision, ['not_submitted', 'completed', 'failed'] as const) };
    case 'billing': exact(['billingEvent']); return { ...base, type: 'billing', billingEvent: parseBilling(v.billingEvent) };
    default: return fail('INVALID_INPUT');
  }
}
function same(a: unknown, b: unknown): boolean { return JSON.stringify(a) === JSON.stringify(b); }
function summarize(events: readonly BillingEvent[]): BillingSummary {
  const total = (kind: BillingEvent['kind']) => {
    const rows = events.filter(event => event.kind === kind);
    if (!rows.length || rows.some(row => row.amountMicroUsd === null)) return null;
    // Treat the subtotal overflow as failure even if another category could offset it.
    return safeSigned(rows.reduce((sum, row) => sum + BigInt(row.amountMicroUsd!), 0n));
  };
  const billed = total('billing_event'), adjustments = total('late_adjustment');
  return { estimateMicroUsd: total('estimate'), reportedMicroUsd: total('reported_usage'), billedMicroUsd: billed,
    invoicedMicroUsd: total('invoice'), adjustmentsMicroUsd: adjustments,
    billedPlusAdjustmentsMicroUsd: billed === null || adjustments === null ? null : safeSigned(BigInt(billed) + BigInt(adjustments)),
    finalCostsVerified: false };
}
function initial(identity: DispatchIdentity): DispatchProtocolState {
  return { ...SAFETY, identity, phase: 'unclaimed', claimEpoch: 0, ownerId: null, leaseExpiresAt: null,
    submissionBoundaryCrossed: false, providerRequestId: null, unresolvedOutcome: false, executionOutcome: null,
    financialReconciliationStatus: 'unverified',
    billingEvents: [], billingSummary: summarize([]), history: [] };
}
function apply(state: DispatchProtocolState, event: ProtocolEvent): DispatchProtocolState {
  if (!same(state.identity, event.identity)) fail('IDENTITY_MISMATCH');
  let next = { ...state };
  if ('epoch' in event) {
    if (event.epoch !== state.claimEpoch) fail('STALE_EPOCH');
    if (event.workerId !== state.ownerId) fail('OWNER_CONFLICT');
  }
  switch (event.type) {
    case 'claim':
      if (state.submissionBoundaryCrossed) fail('SUBMISSION_BOUNDARY_CROSSED');
      if (event.expectedEpoch !== state.claimEpoch) fail('STALE_EPOCH');
      if (event.leaseExpiresAt <= event.now) fail('LEASE_EXPIRED');
      if (state.phase === 'claimed' && state.leaseExpiresAt! > event.now) fail('LEASE_ACTIVE');
      next = { ...next, phase: 'claimed', claimEpoch: safeSigned(BigInt(state.claimEpoch) + 1n),
        ownerId: event.workerId, leaseExpiresAt: event.leaseExpiresAt }; break;
    case 'arm':
      if (state.submissionBoundaryCrossed) fail('SUBMISSION_BOUNDARY_CROSSED');
      if (state.phase !== 'claimed') fail('INVALID_TRANSITION');
      if (event.now >= state.leaseExpiresAt!) fail('LEASE_EXPIRED');
      next = { ...next, phase: 'submission_armed', submissionBoundaryCrossed: true, unresolvedOutcome: true }; break;
    case 'uncertain':
      if (!state.submissionBoundaryCrossed || state.phase === 'reconciled') fail('INVALID_TRANSITION');
      next = { ...next, phase: state.providerRequestId === null ? 'acceptance_unknown' : 'reconciliation_hold', unresolvedOutcome: true }; break;
    case 'bind_provider':
      if (!state.submissionBoundaryCrossed || state.executionOutcome !== null || state.phase === 'reconciled') fail('INVALID_TRANSITION');
      if (state.providerRequestId !== null && state.providerRequestId !== event.providerRequestId) fail('PROVIDER_ID_CONFLICT');
      next = { ...next, providerRequestId: event.providerRequestId,
        phase: ['acceptance_unknown', 'reconciliation_hold'].includes(state.phase) ? 'reconciliation_hold' : 'provider_accepted' }; break;
    case 'outcome':
      if (state.providerRequestId === null) fail('PROVIDER_ID_MISSING');
      if (state.providerRequestId !== event.providerRequestId) fail('PROVIDER_ID_CONFLICT');
      if (state.phase !== 'provider_accepted') fail('INVALID_TRANSITION');
      next = { ...next, executionOutcome: event.outcome,
        phase: event.outcome === 'completed' ? 'provider_completed' : 'provider_failed' }; break;
    case 'reconcile':
      if (!state.submissionBoundaryCrossed) fail('INVALID_TRANSITION');
      if (event.expectedRevision !== state.history.length || state.history.some(prior =>
          prior.type === 'reconcile')) fail('RECONCILIATION_CONFLICT');
      if (!event.authoritative || !event.fresh || !event.priorSenderQuiesced) fail('RECONCILIATION_REQUIRED');
      if (event.providerRequestId !== state.providerRequestId ||
          (state.executionOutcome !== null && event.decision !== state.executionOutcome)) fail('RECONCILIATION_CONFLICT');
      if (event.decision === 'not_submitted' && state.providerRequestId !== null) fail('RECONCILIATION_CONFLICT');
      if (event.decision !== 'not_submitted' && state.providerRequestId === null) fail('PROVIDER_ID_MISSING');
      next = { ...next, phase: state.financialReconciliationStatus === 'pending' ? 'reconciliation_hold' : 'reconciled',
        unresolvedOutcome: false, executionOutcome: event.decision }; break;
    case 'billing': {
      if (event.billingEvent.kind !== 'estimate' && !state.submissionBoundaryCrossed) fail('INVALID_TRANSITION');
      const existing = state.billingEvents.find(row => row.id === event.billingEvent.id);
      if (existing && !same(existing, event.billingEvent)) fail('BILLING_EVENT_CONFLICT');
      if (!existing) {
        if (['estimate', 'reported_usage', 'invoice'].includes(event.billingEvent.kind) &&
            state.billingEvents.some(row => row.kind === event.billingEvent.kind)) fail('BILLING_EVENT_CONFLICT');
        if (state.billingEvents.length >= DISPATCH_PROTOCOL_LIMITS.billingEvents) fail('LIMIT_EXCEEDED');
        const events = [...state.billingEvents, event.billingEvent];
        next = { ...next, billingEvents: events, billingSummary: summarize(events) };
        if (event.billingEvent.kind === 'late_adjustment') {
          next.phase = 'reconciliation_hold';
          next.financialReconciliationStatus = 'pending';
        }
      }
      break;
    }
  }
  if (state.history.length >= DISPATCH_PROTOCOL_LIMITS.history) fail('LIMIT_EXCEEDED');
  return { ...next, history: [...state.history, event] };
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max) fail('INVALID_STATE');
  const keys = ['length', ...Array.from({ length: value.length }, (_, i) => String(i))];
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !keys.includes(key)) ||
      keys.some(key => !('value' in (Object.getOwnPropertyDescriptor(value, key) ?? {})))) fail('INVALID_STATE');
  return value;
}
/** Compare only against a bounded reconstructed tree; never stringify an untrusted state. */
function matches(value: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== 'object') return value === expected;
  if (Array.isArray(expected)) {
    const rows = array(value, Math.max(DISPATCH_PROTOCOL_LIMITS.history, expected.length));
    return rows.length === expected.length && rows.every((row, i) => matches(row, expected[i]));
  }
  const target = expected as Record<string, unknown>;
  const row = object(value, Object.keys(target));
  return Object.keys(row).length === Object.keys(target).length && Object.keys(target).every(key => matches(row[key], target[key]));
}
function restore(value: unknown): DispatchProtocolState {
  const shape = initial({ requestId: '', attemptId: '', provider: 'apify', providerIdentifier: '', intentDigest: '' });
  const row = object(value, Object.keys(shape));
  let state = initial(parseIdentity(row.identity));
  for (const raw of array(row.history, DISPATCH_PROTOCOL_LIMITS.history)) {
    const event = parseEvent(raw);
    if (state.history.some(prior => prior.eventId === event.eventId)) fail('INVALID_STATE');
    state = apply(state, event);
  }
  if (!matches(value, state)) fail('INVALID_STATE');
  return state;
}
export function createResearchDispatchProtocol(identity: unknown): Readonly<DispatchProtocolState> {
  try { return freeze(initial(parseIdentity(identity))); } catch { return fail('INVALID_INPUT'); }
}
function response(state: DispatchProtocolState | null, assessment: 'rejected' | 'replay' | 'transitioned', reasonCode: ProtocolReason) {
  const holdReasonCodes = ['EXECUTION_DISABLED', 'INVOICE_UNVERIFIED'];
  if (state === null || state.unresolvedOutcome) holdReasonCodes.push('SUBMISSION_UNRESOLVED');
  if (state === null || state.billingSummary.billedMicroUsd === null || state.billingSummary.invoicedMicroUsd === null ||
      state.billingSummary.adjustmentsMicroUsd === null) holdReasonCodes.push('BILLING_EVIDENCE_UNKNOWN');
  if (state?.phase === 'reconciliation_hold') holdReasonCodes.push('RECONCILIATION_HOLD');
  if (state?.financialReconciliationStatus === 'pending') holdReasonCodes.push('FINANCIAL_RECONCILIATION_PENDING');
  return freeze({ ...SAFETY, assessment, reasonCode, holdReasonCodes, state });
}
export function transitionResearchDispatchProtocol(current: unknown, input: unknown) {
  let state: DispatchProtocolState;
  try { state = restore(current); } catch {
    return response(null, 'rejected', 'INVALID_STATE');
  }
  try {
    const event = parseEvent(input);
    if (!same(state.identity, event.identity)) fail('IDENTITY_MISMATCH');
    const replay = state.history.find(prior => prior.eventId === event.eventId);
    if (replay) {
      if (!same(replay, event)) fail('CONFLICTING_REPLAY');
      return response(state, 'replay', 'EXACT_REPLAY');
    }
    const duplicate = event.type === 'billing' && state.billingEvents.some(row => row.id === event.billingEvent.id);
    const next = apply(state, event);
    return response(next, 'transitioned', duplicate ? 'DUPLICATE_BILLING_EVENT' : 'FRESH_TRANSITION');
  } catch (error) {
    const reasonCode: ProtocolReason = error instanceof DispatchProtocolError ? error.code : 'INVALID_INPUT';
    return response(state, 'rejected', reasonCode);
  }
}
