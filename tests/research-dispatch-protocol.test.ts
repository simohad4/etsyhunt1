import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createResearchDispatchProtocol as create, transitionResearchDispatchProtocol as transition,
  DispatchProtocolError, DISPATCH_PROTOCOL_LIMITS, type DispatchProtocolState } from '../src/server/researchDispatchProtocol';
import { PINNED_APIFY_ACTOR, PINNED_OPENROUTER_MODEL, CURRENT_RESEARCH_PROVIDER_PRICING } from '../src/server/researchEconomics';

const identity = { requestId: 'request-1', attemptId: 'attempt-1', provider: 'apify',
  providerIdentifier: PINNED_APIFY_ACTOR, intentDigest: 'a'.repeat(64) };
const event = <T extends object>(eventId: string, fields: T, scope: object = identity) => ({ eventId, identity: scope, ...fields });
const claim = (eventId = 'claim-1', fields: object = {}) => event(eventId,
  { type: 'claim', workerId: 'worker-1', expectedEpoch: 0, now: 10, leaseExpiresAt: 20, ...fields });
const arm = (eventId = 'arm-1', fields: object = {}) => event(eventId,
  { type: 'arm', workerId: 'worker-1', epoch: 1, now: 11, ...fields });
const bind = (eventId = 'bind-1', fields: object = {}) => event(eventId,
  { type: 'bind_provider', workerId: 'worker-1', epoch: 1, providerRequestId: 'run-1', ...fields });
const uncertain = (eventId = 'unknown-1', cause = 'timeout') => event(eventId,
  { type: 'uncertain', workerId: 'worker-1', epoch: 1, cause });
const outcome = (eventId = 'outcome-1', status = 'completed') => event(eventId,
  { type: 'outcome', workerId: 'worker-1', epoch: 1, providerRequestId: 'run-1', outcome: status });
const reconcile = (state: DispatchProtocolState, eventId = 'reconcile-1', fields: object = {}) => event(eventId,
  { type: 'reconcile', evidenceId: eventId, expectedRevision: state.history.length, providerRequestId: 'run-1',
    authoritative: true, fresh: true, priorSenderQuiesced: true, decision: 'completed', ...fields });
const billing = (eventId: string, kind: string, amountMicroUsd: number | null, fields: object = {}) => event(eventId,
  { type: 'billing', billingEvent: { id: eventId, kind, amountMicroUsd, inputTokens: null, outputTokens: null, ...fields } });
function inert(value: unknown) {
  const v = value as Record<string, unknown>;
  assert.equal(v.activationBlocked, true); assert.equal(v.executionAuthorized, false);
  assert.equal(v.automaticRetryAllowed, false); assert.equal(v.requiresAuthoritativeDatabaseValidation, true);
  assert.equal(v.evidenceTrust, 'synthetic_unverified'); assert.equal(v.durableTransitionApplied, false);
  assert.equal(v.invoiceFinalityVerified, false);
  function frozen(item: unknown) {
    if (item && typeof item === 'object') {
      assert.ok(Object.isFrozen(item));
      assert.equal(Object.hasOwn(item, 'mayDispatch'), false); assert.equal(Object.hasOwn(item, 'sendAuthorized'), false);
      Object.values(item).forEach(frozen);
    }
  }
  frozen(value);
}
function step(state: DispatchProtocolState, input: unknown): DispatchProtocolState {
  const result = transition(state, input);
  assert.equal(result.assessment, 'transitioned', result.reasonCode); inert(result);
  assert.ok(result.state); return result.state;
}
function reject(state: DispatchProtocolState, input: unknown, code?: string) {
  const r = transition(state, input);
  assert.equal(r.assessment, 'rejected'); if (code) assert.equal(r.reasonCode, code);
  assert.deepEqual(r.state, state); inert(r); return r;
}
const claimed = () => step(create(identity), claim());
const armed = () => step(claimed(), arm());
const accepted = () => step(armed(), bind());

test('M4.7 immutable identity and complete synthetic journey preserve every execution block', () => {
  let s = create(identity); inert(s); assert.equal(s.phase, 'unclaimed');
  s = step(s, claim()); assert.equal(s.phase, 'claimed');
  s = step(s, arm()); assert.equal(s.phase, 'submission_armed'); assert.equal(s.unresolvedOutcome, true);
  s = step(s, bind()); assert.equal(s.phase, 'provider_accepted');
  s = step(s, outcome()); assert.equal(s.phase, 'provider_completed'); assert.equal(s.unresolvedOutcome, true);
  s = step(s, reconcile(s)); assert.equal(s.phase, 'reconciled'); assert.equal(s.unresolvedOutcome, false);
  assert.equal(s.authoritativeResolutionVerified, false); assert.equal(s.billingSummary.invoicedMicroUsd, null);
});
test('exclusive claim rejects duplicate workers and exact claim replay never advances epoch', () => {
  const s = claimed();
  const replay = transition(s, claim()); assert.equal(replay.assessment, 'replay'); assert.deepEqual(replay.state, s); inert(replay);
  reject(s, claim('duplicate', { expectedEpoch: 1, workerId: 'worker-2' }), 'LEASE_ACTIVE');
  reject(s, arm('foreign', { workerId: 'worker-2' }), 'OWNER_CONFLICT');
});
test('expired pre-boundary claim reassigns with monotonic fencing and blocks paused old sender', () => {
  const s = step(claimed(), claim('claim-2', { workerId: 'worker-2', expectedEpoch: 1, now: 20, leaseExpiresAt: 30 }));
  assert.equal(s.claimEpoch, 2); assert.equal(s.ownerId, 'worker-2');
  reject(s, arm(), 'STALE_EPOCH');
  reject(s, arm('wrong-owner', { epoch: 2 }), 'OWNER_CONFLICT');
  assert.equal(step(s, arm('arm-2', { workerId: 'worker-2', epoch: 2, now: 21 })).phase, 'submission_armed');
  reject(claimed(), arm('expired', { now: 20 }), 'LEASE_EXPIRED');
});
test('lost arm response, repeated arm and lease expiry never allow a second submission', () => {
  const s = armed();
  const replay = transition(s, arm()); assert.equal(replay.assessment, 'replay'); assert.deepEqual(replay.state, s); inert(replay);
  reject(s, arm('new-arm'), 'SUBMISSION_BOUNDARY_CROSSED');
  reject(s, claim('takeover', { expectedEpoch: 1, workerId: 'worker-2', now: 100, leaseExpiresAt: 110 }), 'SUBMISSION_BOUNDARY_CROSSED');
  const lost = step(s, uncertain('lost', 'lost_arm_response'));
  assert.equal(lost.phase, 'acceptance_unknown'); assert.equal(lost.unresolvedOutcome, true);
  const oldReplay = transition(lost, arm()); assert.equal(oldReplay.assessment, 'replay'); assert.deepEqual(oldReplay.state, lost);
});
for (const cause of ['unknown_acceptance', 'timeout', 'disconnect', 'partial_result', 'post_send_crash']) {
  test(`uncertainty cause ${cause} stays latched through provider binding`, () => {
    const s = step(armed(), uncertain('uncertain', cause));
    assert.equal(s.phase, 'acceptance_unknown'); assert.equal(s.providerRequestId, null);
    const bound = step(s, bind()); assert.equal(bound.phase, 'reconciliation_hold'); assert.equal(bound.unresolvedOutcome, true);
    reject(bound, outcome(), 'INVALID_TRANSITION');
  });
}
test('provider binding is first-write or identical replay; external ID replacement rejects', () => {
  const s = accepted();
  assert.equal(transition(s, bind()).assessment, 'replay');
  assert.equal(step(s, bind('same-id')).providerRequestId, 'run-1');
  reject(s, bind('changed-id', { providerRequestId: 'run-2' }), 'PROVIDER_ID_CONFLICT');
  reject(s, event('bad', { type: 'outcome', workerId: 'worker-1', epoch: 1,
    providerRequestId: 'run-2', outcome: 'completed' }), 'PROVIDER_ID_CONFLICT');
});
test('identity, provider and intent digest cannot change across commands', () => {
  for (const change of [{ requestId: 'other' }, { attemptId: 'other' }, { intentDigest: 'b'.repeat(64) },
    { provider: 'openrouter', providerIdentifier: PINNED_OPENROUTER_MODEL }]) {
    reject(armed(), { ...bind(), identity: { ...identity, ...change } }, 'IDENTITY_MISMATCH');
  }
  reject(claimed(), { ...claim(), workerId: 'other' }, 'CONFLICTING_REPLAY');
});
test('missing provider identity, conflicting/stale reconciliation and active prior sender remain blocked', () => {
  const unknown = step(armed(), uncertain());
  reject(unknown, reconcile(unknown, 'no-id', { providerRequestId: null }), 'PROVIDER_ID_MISSING');
  const s = step(unknown, bind());
  for (const fields of [{ authoritative: false }, { fresh: false }, { priorSenderQuiesced: false }]) {
    reject(s, reconcile(s, 'insufficient', fields), 'RECONCILIATION_REQUIRED');
  }
  for (const fields of [{ providerRequestId: 'run-2' }, { decision: 'not_submitted' }, { expectedRevision: 0 }]) {
    reject(s, reconcile(s, 'conflict', fields), 'RECONCILIATION_CONFLICT');
  }
  const r = step(s, reconcile(s)); assert.equal(r.phase, 'reconciled'); inert(r);
  reject(r, claim('no-resend', { expectedEpoch: 1, now: 100, leaseExpiresAt: 110 }), 'SUBMISSION_BOUNDARY_CROSSED');
});
test('definitive execution failure does not imply known or zero billing', () => {
  const s = step(accepted(), outcome('failure', 'failed'));
  assert.equal(s.phase, 'provider_failed'); assert.equal(s.unresolvedOutcome, true);
  assert.equal(s.billingSummary.billedMicroUsd, null); assert.equal(s.billingSummary.invoicedMicroUsd, null);
  reject(s, reconcile(s), 'RECONCILIATION_CONFLICT');
  const r = step(s, reconcile(s, 'failure-review', { decision: 'failed' }));
  assert.equal(r.executionOutcome, 'failed'); assert.equal(r.billingSummary.finalCostsVerified, false);
});
test('not-submitted reconciliation is advisory and never reopens the same armed attempt', () => {
  const s = armed();
  const r = step(s, reconcile(s, 'not-sent', { providerRequestId: null, decision: 'not_submitted' }));
  assert.equal(r.executionOutcome, 'not_submitted'); assert.equal(r.submissionBoundaryCrossed, true);
  reject(r, arm('no-second-send'), 'SUBMISSION_BOUNDARY_CROSSED');
});
test('append-only billing separates estimates, usage, billed events, invoices and signed adjustments', () => {
  let s = step(create(identity), billing('estimate', 'estimate', 100));
  s = step(s, claim()); s = step(s, arm());
  s = step(s, billing('usage', 'reported_usage', null, { inputTokens: 10, outputTokens: 2 }));
  assert.equal(s.billingSummary.reportedMicroUsd, null);
  s = step(s, billing('bill-1', 'billing_event', 90));
  s = step(s, billing('bill-2', 'billing_event', 10));
  s = step(s, billing('invoice', 'invoice', 95));
  s = step(s, billing('credit', 'late_adjustment', -5));
  assert.equal(s.phase, 'reconciliation_hold');
  assert.equal(s.billingSummary.estimateMicroUsd, 100);
  assert.equal(s.billingSummary.billedMicroUsd, 100);
  assert.equal(s.billingSummary.adjustmentsMicroUsd, -5);
  assert.equal(s.billingSummary.billedPlusAdjustmentsMicroUsd, 95);
  assert.equal(s.billingSummary.invoicedMicroUsd, 95);
  assert.equal(s.billingSummary.finalCostsVerified, false);
  assert.equal(s.billingEvents[5].amountMicroUsd, -5); inert(s);
});
test('billing event IDs deduplicate while conflicting replay and extra snapshots reject', () => {
  const e = billing('billing-command', 'billing_event', 100);
  const s = step(armed(), e);
  const replay = transition(s, e); assert.equal(replay.assessment, 'replay'); assert.equal(replay.state?.billingEvents.length, 1);
  const duplicate = transition(s, { ...e, eventId: 'second-command' });
  assert.equal(duplicate.reasonCode, 'DUPLICATE_BILLING_EVENT'); assert.equal(duplicate.state?.billingEvents.length, 1);
  reject(s, billing('billing-command', 'billing_event', 101), 'CONFLICTING_REPLAY');
  reject(s, { ...billing('other-command', 'billing_event', 101), billingEvent: { ...e.billingEvent, amountMicroUsd: 101 } }, 'BILLING_EVENT_CONFLICT');
  const invoice = step(s, billing('invoice', 'invoice', 100));
  reject(invoice, billing('second-invoice', 'invoice', 100), 'BILLING_EVENT_CONFLICT');
});
test('late charges hold reconciled state; old event/evidence cannot clear the new hold', () => {
  let s = step(accepted(), outcome());
  const reconciliationEvent = reconcile(s); s = step(s, reconciliationEvent);
  const charged = step(s, billing('late-debit', 'late_adjustment', 10));
  assert.equal(charged.phase, 'reconciliation_hold');
  assert.equal(charged.financialReconciliationStatus, 'pending');
  assert.equal(charged.executionOutcome, 'completed');
  assert.equal(charged.unresolvedOutcome, false);
  assert.equal(charged.billingSummary.billedPlusAdjustmentsMicroUsd, null);
  assert.deepEqual(transition(charged, reconciliationEvent).state, charged);
  reject(charged, { ...reconciliationEvent, eventId: 'replayed-evidence' }, 'RECONCILIATION_CONFLICT');
  reject(charged, reconcile(charged, 'new-command', { evidenceId: 'reconcile-1' }), 'RECONCILIATION_CONFLICT');
  assert.ok(transition(charged, reconciliationEvent).holdReasonCodes.includes('RECONCILIATION_HOLD'));
  assert.ok(transition(charged, reconciliationEvent).holdReasonCodes.includes('FINANCIAL_RECONCILIATION_PENDING'));
  reject(charged, reconcile(charged, 'fresh-evidence'), 'RECONCILIATION_CONFLICT');
  inert(charged);
});
test('a second reconciliation cannot replace or reaffirm a recorded execution outcome', () => {
  for (const decision of ['completed', 'failed'] as const) {
    const original = step(accepted(), outcome('original-outcome', decision));
    const command = reconcile(original, 'original-review', { decision });
    const reconciled = step(original, command);
    assert.equal(reconciled.financialReconciliationStatus, 'unverified');
    for (const nextDecision of ['completed', 'failed', 'not_submitted']) {
      reject(reconciled, reconcile(reconciled, 'second-review', { decision: nextDecision }), 'RECONCILIATION_CONFLICT');
    }
    const adjusted = step(reconciled, billing('late-credit', 'late_adjustment', -10));
    assert.equal(adjusted.executionOutcome, decision);
    assert.equal(reconciled.executionOutcome, decision);
    assert.equal(adjusted.financialReconciliationStatus, 'pending');
    const replay = transition(adjusted, command);
    assert.equal(replay.assessment, 'replay');
    assert.equal(replay.reasonCode, 'EXACT_REPLAY');
    assert.deepEqual(replay.state, adjusted); inert(replay);
    reject(adjusted, reconcile(adjusted, 'new-review', { decision }), 'RECONCILIATION_CONFLICT');
  }
});
test('execution reconciliation cannot settle a previously received late adjustment', () => {
  const adjusted = step(accepted(), billing('early-adjustment', 'late_adjustment', 5));
  const reviewed = step(adjusted, reconcile(adjusted));
  assert.equal(reviewed.executionOutcome, 'completed');
  assert.equal(reviewed.unresolvedOutcome, false);
  assert.equal(reviewed.phase, 'reconciliation_hold');
  assert.equal(reviewed.financialReconciliationStatus, 'pending');
  assert.equal(reviewed.billingSummary.finalCostsVerified, false); inert(reviewed);
});
test('multiple reported usage snapshots are unsupported rather than silently aggregated', () => {
  const s = step(armed(), billing('usage-first', 'reported_usage', null, { inputTokens: 10 }));
  reject(s, billing('usage-second', 'reported_usage', 20, { inputTokens: 20 }), 'BILLING_EVENT_CONFLICT');
  assert.equal(s.billingSummary.reportedMicroUsd, null);
});
test('safe signed arithmetic rejects positive/negative subtotal and combined overflow', () => {
  const s = step(armed(), billing('max', 'billing_event', Number.MAX_SAFE_INTEGER));
  reject(s, billing('over', 'billing_event', 1), 'OVERFLOW');
  reject(s, billing('over-combined', 'late_adjustment', 1), 'OVERFLOW');
  const negative = step(armed(), billing('min', 'late_adjustment', -Number.MAX_SAFE_INTEGER));
  reject(negative, billing('under', 'late_adjustment', -1), 'OVERFLOW');
});
test('null is unknown, zero is explicit and invoice evidence never proves finality', () => {
  let s = armed();
  assert.equal(s.billingSummary.adjustmentsMicroUsd, null);
  s = step(s, billing('zero', 'billing_event', 0)); s = step(s, billing('zero-invoice', 'invoice', 0));
  assert.equal(s.billingSummary.billedMicroUsd, 0); assert.equal(s.billingSummary.invoicedMicroUsd, 0);
  assert.equal(s.invoiceFinalityVerified, false); assert.equal(s.billingSummary.finalCostsVerified, false);
});
test('malformed commands, callbacks, unknown fields and forged snapshots fail closed', () => {
  const s = claimed();
  for (const value of [null, [], {}, 'arm', () => {}, { ...arm(), secret: 'sensitive-sentinel' },
    arm('wrong', { epoch: -1 }), arm('fraction', { epoch: 1.5 }), arm('unsafe', { epoch: Number.MAX_SAFE_INTEGER + 1 }),
    { ...billing('bad', 'late_adjustment', 1), billingEvent: { id: 'bad', kind: 'late_adjustment', amountMicroUsd: null, inputTokens: null, outputTokens: null } }]) {
    const r = reject(s, value); assert.doesNotMatch(JSON.stringify(r), /sensitive-sentinel/);
  }
  let calls = 0;
  reject(s, { get eventId() { calls++; return 'evil'; } }, 'INVALID_INPUT'); assert.equal(calls, 0);
  for (const state of [{ ...s, phase: 'reconciled' }, { ...s, claimEpoch: Number.MAX_SAFE_INTEGER },
    { ...s, executionAuthorized: true }, { ...s, providerRequestId: 'forged' }, { ...s, history: [claim(), claim()] }]) {
    const r = transition(state, arm()); assert.equal(r.reasonCode, 'INVALID_STATE'); assert.equal(r.state, null); inert(r);
  }
  for (const bad of [null, { ...identity, providerIdentifier: 'other' }, { ...identity, intentDigest: 'bad' }]) {
    assert.throws(() => create(bad), DispatchProtocolError);
  }
});
test('bounded histories and billing ledgers reject unbounded accumulation', () => {
  let s = armed();
  for (let i = 0; i < DISPATCH_PROTOCOL_LIMITS.billingEvents; i++) s = step(s, billing(`bill-${i}`, 'billing_event', 1));
  reject(s, billing('extra', 'billing_event', 1), 'LIMIT_EXCEEDED');
  const e = billing('bill-0', 'billing_event', 1);
  while (s.history.length < DISPATCH_PROTOCOL_LIMITS.history) s = step(s, { ...e, eventId: `duplicate-${s.history.length}` });
  reject(s, { ...e, eventId: 'history-over' }, 'LIMIT_EXCEEDED');
  assert.equal(transition(s, arm()).assessment, 'replay');
});
test('deterministic replay from serialized snapshots does not mutate inputs or import executors', () => {
  const s = accepted(); const before = JSON.stringify(s);
  const a = transition(s, outcome()); const b = transition(JSON.parse(before), outcome());
  assert.deepEqual(a, b); assert.equal(JSON.stringify(s), before); inert(a);
  const source = readFileSync('src/server/researchDispatchProtocol.ts', 'utf8');
  assert.deepEqual([...source.matchAll(/from '([^']+)'/g)].map(match => match[1]), ['./researchEconomics', './providers/adapterContract']);
  assert.doesNotMatch(source, /\bfetch\s*\(|process\.|console\.|\.rpc\s*\(|setTimeout|setInterval|Date\.now|Math\.random|services\/analyzer/);
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.activationBlocked, true);
});
