import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { assessResearchCost, assessDispatchOwnership, assessResearchOutcome, assessResearchBilling,
  assessProposedTrial, assessResearchExecutionSafety } from '../src/server/researchExecutionSafety';
import { calculateResearchEconomicsScenario } from '../src/server/researchEconomicsScenario';
import { planResearchExecution, RESEARCH_JOB_STATUSES } from '../src/server/researchExecutionPlan';
import { CURRENT_RESEARCH_PROVIDER_PRICING, PINNED_APIFY_ACTOR } from '../src/server/researchEconomics';

const ownership = { workerId: 'worker-1', claimWorkerId: 'worker-1', durableClaim: true,
  claimState: 'current', contendingWorkers: 1, fence: 1, currentFence: 1,
  submissionIntent: 'recorded', provider: 'apify', providerIdentifier: PINNED_APIFY_ACTOR, providerRequestId: 'run-1' };
const outcome = { requestId: 'request-1', attemptId: 'attempt-1', unresolvedOutcome: false,
  outcome: 'completed', providerRequestId: 'run-1', reconciliation: null };
const reconciliation = { requestId: 'request-1', attemptId: 'attempt-1', providerRequestId: 'run-1',
  authoritative: true, fresh: true, decision: 'completed' };
const billing = { estimatedMicroUsd: 100, reportedMicroUsd: 100, invoicedMicroUsd: 100,
  invoiceAuthoritative: true, recordsConflict: false, settledUsingEstimate: false, lateChargeMicroUsd: 0 };
const trial = { identityVerified: true, priorGrants: 0, concurrentRedemptions: 0,
  proposedGlobalBudgetMicroUsd: 100000000, reservedMicroUsd: 0, settledMicroUsd: 0, unresolvedLiabilityMicroUsd: 0 };
const aggregate = () => ({ observation: { kind: 'job_snapshot', status: 'reserved' }, cost: { pages: 1 },
  ownership: { ...ownership }, outcome: { ...outcome }, billing: { ...billing }, trial: { ...trial } });
function inert(value: { activationBlocked: true; executionAuthorized: false; automaticRetryAllowed: false;
  requiresAuthoritativeDatabaseValidation: true; status: string; reasonCodes: readonly string[] }) {
  assert.equal(value.activationBlocked, true);
  assert.equal(value.executionAuthorized, false);
  assert.equal(value.automaticRetryAllowed, false);
  assert.equal(value.requiresAuthoritativeDatabaseValidation, true);
  assert.ok(['HOLD', 'REVIEW'].includes(value.status));
  assert.ok(value.reasonCodes.includes('OFFLINE_ONLY'));
  function frozen(item: unknown) {
    if (item && typeof item === 'object') { assert.ok(Object.isFrozen(item)); Object.values(item).forEach(frozen); }
  }
  frozen(value);
}
for (const pages of [1, 2, 3]) for (const apifyAttempts of [1, 2]) for (const openrouterAttempts of [1, 2]) {
  test(`M4.6 cost assessment ${pages} pages ${apifyAttempts}/${openrouterAttempts} attempts`, () => {
    const input = { pages, apifyAttempts, openrouterAttempts };
    const result = assessResearchCost(input);
    assert.deepEqual(result.data, calculateResearchEconomicsScenario(input));
    assert.equal(result.status, 'HOLD');
    assert.ok(result.reasonCodes.includes('CAP_EXCEEDED'));
    assert.equal(result.data?.assumptions.totalCostComplete, false);
    assert.ok(result.data?.assumptions.excludedUnknownCosts.every(c => c.costMicroUsd === null));
    inert(result);
  });
}
test('unknown costs HOLD even when included costs fit the cap', () => {
  const result = assessResearchCost({ pages: 1, requestedListings: 1 });
  assert.equal(result.status, 'HOLD');
  assert.equal(result.data?.reservedCapViolated, false);
  assert.equal(result.reasonCodes.includes('CAP_EXCEEDED'), false);
  assert.ok(result.reasonCodes.includes('PROVISIONAL_COSTS'));
  assert.ok(result.reasonCodes.includes('UNKNOWN_COSTS'));
  inert(result);
});
test('every cap-exceeded cost assessment HOLDs across all page and attempt combinations', () => {
  for (const pages of [1, 2, 3]) for (const apifyAttempts of [1, 2]) for (const openrouterAttempts of [1, 2]) {
    const r = assessResearchCost({ pages, apifyAttempts, openrouterAttempts });
    assert.ok(r.reasonCodes.includes('CAP_EXCEEDED'));
    assert.equal(r.status, 'HOLD'); inert(r);
  }
});
test('ownership evidence never enforces a lease and duplicate/stale/fenced workers hold', () => {
  const reviewed = assessDispatchOwnership(ownership);
  assert.equal(reviewed.status, 'REVIEW');
  assert.equal(reviewed.data?.durableEnforcementVerified, false);
  inert(reviewed);
  const cases = [
    [{ durableClaim: false }, 'CLAIM_MISSING'], [{ workerId: null }, 'CLAIM_MISSING'],
    [{ claimState: 'missing' }, 'CLAIM_MISSING'], [{ claimState: 'stale' }, 'CLAIM_STALE'],
    [{ claimState: 'expired' }, 'CLAIM_STALE'], [{ contendingWorkers: 2 }, 'OWNERSHIP_CONFLICT'],
    [{ claimWorkerId: 'other' }, 'OWNERSHIP_CONFLICT'], [{ fence: null }, 'FENCING_MISSING'],
    [{ fence: 0 }, 'FENCING_MISSING'], [{ fence: 2 }, 'FENCING_CONFLICT'],
    [{ submissionIntent: 'missing' }, 'INTENT_MISSING'], [{ providerRequestId: null }, 'PROVIDER_ID_MISSING'],
    [{ providerIdentifier: 'other' }, 'PROVIDER_IDENTITY_CONFLICT']
  ] as const;
  for (const [change, reason] of cases) {
    const r = assessDispatchOwnership({ ...ownership, ...change });
    assert.equal(r.status, 'HOLD'); assert.ok(r.reasonCodes.includes(reason)); inert(r);
  }
});
test('lease expiry after uncertain submission never permits takeover or automatic retry', () => {
  const result = assessDispatchOwnership({ ...ownership, claimState: 'expired', submissionIntent: 'uncertain', providerRequestId: null });
  for (const reason of ['CLAIM_STALE', 'SUBMISSION_UNCERTAIN', 'RECONCILIATION_REQUIRED', 'PROVIDER_ID_MISSING']) {
    assert.ok(result.reasonCodes.includes(reason as never));
  }
  assert.equal(result.status, 'HOLD'); inert(result);
});
for (const observedOutcome of ['unknown', 'timeout', 'disconnected', 'partial', 'accepted']) {
  test(`M4.6 outcome ${observedOutcome} remains latched and blocked`, () => {
    const r = assessResearchOutcome({ ...outcome, outcome: observedOutcome });
    assert.equal(r.data?.advisoryUnresolvedOutcome, true);
    assert.equal(r.status, 'HOLD'); inert(r);
  });
}
test('prior unresolved outcome survives all stale planner snapshots and evidence claims', () => {
  for (const status of RESEARCH_JOB_STATUSES) {
    const input = aggregate(); input.observation.status = status;
    input.outcome.unresolvedOutcome = true;
    const r = assessResearchExecutionSafety(input);
    assert.deepEqual(r.data?.planner, planResearchExecution(input.observation));
    assert.equal(r.data?.outcome.data?.advisoryUnresolvedOutcome, true);
    assert.equal(r.status, 'HOLD'); inert(r);
  }
});
test('only matching fresh authoritative reconciliation can propose advisory latch resolution', () => {
  const r = assessResearchOutcome({ ...outcome, unresolvedOutcome: true, reconciliation });
  assert.equal(r.status, 'REVIEW');
  assert.equal(r.data?.advisoryUnresolvedOutcome, false);
  assert.equal(r.data?.authoritativeResolutionVerified, false);
  inert(r);
  for (const change of [{ authoritative: false }, { fresh: false }, { requestId: 'other' },
    { attemptId: 'other' }, { providerRequestId: 'other' }, { decision: 'not_submitted' }]) {
    const result = assessResearchOutcome({ ...outcome, unresolvedOutcome: true, reconciliation: { ...reconciliation, ...change } });
    assert.equal(result.data?.advisoryUnresolvedOutcome, true);
    assert.equal(result.status, 'HOLD'); inert(result);
  }
});
test('missing external identity blocks even a completed claim or purported reconciliation', () => {
  const r = assessResearchOutcome({ ...outcome, providerRequestId: null,
    reconciliation: { ...reconciliation, providerRequestId: null } });
  assert.equal(r.data?.advisoryUnresolvedOutcome, true);
  assert.ok(r.reasonCodes.includes('PROVIDER_ID_MISSING'));
  inert(r);
});
test('advisory reconciliation is synthetic, nondurable and cannot authorize a retry', () => {
  const input = { ...outcome, unresolvedOutcome: true, reconciliation: { ...reconciliation } };
  const before = JSON.stringify(input);
  const r = assessResearchOutcome(input);
  assert.equal(r.data?.reconciliationAssessment, 'resolution_candidate');
  assert.equal(r.data?.advisoryUnresolvedOutcome, false);
  assert.equal(r.data?.authoritativeResolutionVerified, false);
  assert.equal(r.evidenceTrust, 'synthetic_unverified');
  assert.equal(JSON.stringify(input), before);
  inert(r);
  // No durable latch was cleared: the original unresolved evidence still holds
  // without reconciliation, even if the caller presents a completed snapshot.
  const stale = assessResearchOutcome({ ...input, reconciliation: null });
  assert.equal(stale.data?.advisoryUnresolvedOutcome, true);
  assert.equal(stale.status, 'HOLD'); inert(stale);
  for (const change of [{ requestId: 'other' }, { attemptId: 'other' }, { providerRequestId: 'other' }]) {
    const conflict = assessResearchOutcome({ ...input, reconciliation: { ...reconciliation, ...change } });
    assert.equal(conflict.data?.reconciliationAssessment, 'conflicting');
    assert.ok(conflict.reasonCodes.includes('RECONCILIATION_CONFLICT'));
    assert.equal(conflict.data?.advisoryUnresolvedOutcome, true); inert(conflict);
  }
});
test('billing levels distinguish unknown, estimated, reported and reconciled claims without finality', () => {
  const empty = assessResearchBilling({ ...billing, reportedMicroUsd: null, invoicedMicroUsd: null, lateChargeMicroUsd: null, invoiceAuthoritative: false });
  assert.equal(empty.data?.reportedMicroUsd, null);
  assert.equal(empty.data?.invoicedMicroUsd, null);
  assert.equal(empty.data?.billingEvidenceClass, 'estimated_or_unknown');
  assert.ok(empty.reasonCodes.includes('BILLING_UNKNOWN')); inert(empty);
  const reported = assessResearchBilling({ ...billing, invoicedMicroUsd: null, invoiceAuthoritative: false });
  assert.equal(reported.data?.billingEvidenceClass, 'provider_reported'); inert(reported);
  const invoice = assessResearchBilling(billing);
  assert.equal(invoice.status, 'REVIEW');
  assert.equal(invoice.data?.billingEvidenceClass, 'invoice_reconciled_claim');
  assert.equal(invoice.data?.finalCostsVerified, false); inert(invoice);
  const zero = assessResearchBilling({ ...billing, estimatedMicroUsd: 0, reportedMicroUsd: 0, invoicedMicroUsd: 0 });
  assert.equal(zero.data?.invoicedMicroUsd, 0);
});
test('late charges, estimated settlements and conflicting billing records hold', () => {
  for (const [change, reason] of [
    [{ lateChargeMicroUsd: 1 }, 'LATE_CHARGE'], [{ settledUsingEstimate: true }, 'ESTIMATED_SETTLEMENT'],
    [{ recordsConflict: true }, 'BILLING_CONFLICT'], [{ invoicedMicroUsd: 101 }, 'BILLING_RECONCILIATION_REQUIRED'],
    [{ invoiceAuthoritative: false }, 'INVOICE_AUTHORITY_MISSING']
  ] as const) {
    const r = assessResearchBilling({ ...billing, ...change });
    assert.equal(r.status, 'HOLD'); assert.ok(r.reasonCodes.includes(reason));
    assert.equal(r.data?.finalCostsVerified, false); inert(r);
  }
});
test('billing differences require reconciliation rather than implying contradictory evidence', () => {
  for (const invoicedMicroUsd of [99, 101]) {
    const r = assessResearchBilling({ ...billing, invoicedMicroUsd });
    assert.ok(r.reasonCodes.includes('BILLING_RECONCILIATION_REQUIRED'));
    assert.equal(r.reasonCodes.includes('BILLING_CONFLICT'), false);
    assert.equal(r.status, 'HOLD');
    assert.equal(r.data?.finalCostsVerified, false); inert(r);
  }
  const explicit = assessResearchBilling({ ...billing, recordsConflict: true });
  assert.ok(explicit.reasonCodes.includes('BILLING_CONFLICT'));
  assert.equal(explicit.reasonCodes.includes('BILLING_RECONCILIATION_REQUIRED'), false);
  assert.equal(explicit.status, 'HOLD'); inert(explicit);
});
test('missing billing remains null and caller-asserted invoice authority never establishes finality', () => {
  for (const authority of [true, false]) {
    const r = assessResearchBilling({ ...billing, invoiceAuthoritative: authority,
      reportedMicroUsd: null, invoicedMicroUsd: null, lateChargeMicroUsd: null });
    assert.equal(r.data?.reportedMicroUsd, null);
    assert.equal(r.data?.invoicedMicroUsd, null);
    assert.equal(r.data?.lateChargeMicroUsd, null);
    assert.ok(r.reasonCodes.includes('BILLING_UNKNOWN'));
    assert.equal(r.data?.finalCostsVerified, false); inert(r);
  }
  const claimed = assessResearchBilling(billing);
  assert.equal(claimed.evidenceTrust, 'synthetic_unverified');
  assert.equal(claimed.data?.finalCostsVerified, false); inert(claimed);
});
test('trial budget is operationally zero even when the hypothetical proposal fits', () => {
  const r = assessProposedTrial(trial);
  assert.equal(r.status, 'HOLD');
  assert.equal(r.data?.proposedBudgetFitsIncludedCostsOnly, true);
  assert.equal(r.data?.provisionalSearchExposureMicroUsd, 598884);
  assert.equal(r.data?.operationalTrialBudgetMicroUsd, 0);
  assert.equal(r.data?.trialGranted, false); assert.equal(r.data?.budgetReserved, false); inert(r);
});
test('trial duplicate grants, concurrency, unverified identities and liabilities remain held', () => {
  for (const [change, reason] of [
    [{ identityVerified: false }, 'IDENTITY_UNVERIFIED'], [{ priorGrants: 1 }, 'REPEAT_TRIAL_GRANT'],
    [{ concurrentRedemptions: 2 }, 'CONCURRENT_TRIAL_REDEMPTION'], [{ unresolvedLiabilityMicroUsd: 1 }, 'TRIAL_LIABILITY'],
    [{ unresolvedLiabilityMicroUsd: null }, 'TRIAL_LIABILITY'], [{ proposedGlobalBudgetMicroUsd: 0 }, 'TRIAL_BUDGET_INSUFFICIENT'],
    [{ reservedMicroUsd: 100000000 }, 'TRIAL_BUDGET_INSUFFICIENT']
  ] as const) {
    const r = assessProposedTrial({ ...trial, ...change });
    assert.equal(r.status, 'HOLD'); assert.ok(r.reasonCodes.includes(reason)); inert(r);
  }
});
test('malformed, unsafe, unexpected and missing evidence fails closed without leaking data', () => {
  for (const fn of [assessResearchCost, assessDispatchOwnership, assessResearchOutcome, assessResearchBilling, assessProposedTrial, assessResearchExecutionSafety]) {
    for (const value of [undefined, null, [], {}, () => {}, { secret: 'sensitive-sentinel' }]) {
      const r = fn(value); assert.equal(r.status, 'HOLD'); inert(r);
      assert.doesNotMatch(JSON.stringify(r), /sensitive-sentinel/);
    }
  }
  for (const reportedMicroUsd of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, undefined, '100']) {
    assert.ok(assessResearchBilling({ ...billing, reportedMicroUsd }).reasonCodes.includes('INVALID_EVIDENCE'));
  }
  assert.ok(assessResearchCost({ pages: 4 }).reasonCodes.includes('INVALID_EVIDENCE'));
  assert.ok(assessDispatchOwnership({ ...ownership, durableClaim: 'true' }).reasonCodes.includes('INVALID_EVIDENCE'));
  assert.ok(assessResearchOutcome({ ...outcome, unresolvedOutcome: undefined }).reasonCodes.includes('INVALID_EVIDENCE'));
  assert.ok(assessProposedTrial({ ...trial, priorGrants: -1 }).reasonCodes.includes('INVALID_EVIDENCE'));
  let calls = 0;
  const r = assessDispatchOwnership({ get workerId() { calls++; return 'secret'; } });
  assert.ok(r.reasonCodes.includes('INVALID_EVIDENCE')); assert.equal(calls, 0);
  assert.ok(assessProposedTrial({ ...trial, callback: () => { calls++; } }).reasonCodes.includes('INVALID_EVIDENCE'));
  assert.equal(calls, 0);
});
test('aggregate overflow holds with fixed diagnostics rather than rounding money', () => {
  const r = assessResearchBilling({ ...billing, invoicedMicroUsd: Number.MAX_SAFE_INTEGER, lateChargeMicroUsd: 1 });
  assert.ok(r.reasonCodes.includes('ARITHMETIC_OVERFLOW')); inert(r);
  const t = assessProposedTrial({ ...trial, settledMicroUsd: Number.MAX_SAFE_INTEGER, reservedMicroUsd: 1 });
  assert.ok(t.reasonCodes.includes('ARITHMETIC_OVERFLOW')); inert(t);
});
test('composed assessment reports component gaps without mutating inputs or clearing gates', () => {
  const input = aggregate();
  const before = JSON.stringify(input);
  const r = assessResearchExecutionSafety(input);
  assert.ok(r.reasonCodes.includes('CAP_EXCEEDED'));
  assert.ok(r.reasonCodes.includes('TRIAL_ENTITLEMENT_UNIMPLEMENTED'));
  assert.deepEqual(r, assessResearchExecutionSafety(input));
  assert.equal(JSON.stringify(input), before); inert(r);
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.activationBlocked, true);
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.apify.microUsdPerBillingUnit, null);
  const source = readFileSync('src/server/researchExecutionSafety.ts', 'utf8');
  const dependencies = [...source.matchAll(/from '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(dependencies, ['./researchEconomicsScenario', './researchExecutionPlan', './researchEconomics', './providers/adapterContract']);
  assert.doesNotMatch(source, /\bfetch\s*\(|process\.|console\.|\.rpc\s*\(|setTimeout|setInterval|Date\.now|Math\.random/);
});
