import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CURRENT_RESEARCH_PROVIDER_PRICING } from '../src/server/researchEconomics';
import { createResearchDispatchProtocol } from '../src/server/researchDispatchProtocol';
import { PINNED_APIFY_ACTOR } from '../src/server/researchEconomics';

// Documentation coverage only: these tests do not execute SQL or prove database guarantees.
const design = readFileSync('docs/research-durable-dispatch-sql-design.md', 'utf8');
function section(start: string, end: string): string {
  const from = design.indexOf(start), to = design.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing specification section: ${start}`);
  return design.slice(from, to);
}
function contains(source: string, ...requirements: string[]): void {
  for (const requirement of requirements) assert.ok(source.includes(requirement), `Missing documented requirement: ${requirement}`);
}

test('M4.8 B1 documentation explicitly remains a non-executable offline proposal', () => {
  contains(design, 'PROPOSED / OFFLINE ONLY', 'not executable SQL', 'not PostgreSQL runtime guarantees',
    'Deployed definitions', 'UNKNOWN', 'No paid dispatch is authorized');
  assert.doesNotMatch(design, /CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|TABLE)\s+(?:public\.)?research_/i);
});

test('all five proposed tables specify typed keys, indexes, immutable records and retention', () => {
  const tables = ['research_dispatches', 'research_dispatch_events', 'research_reconciliation_evidence',
    'research_billing_evidence', 'research_billing_adjustments'];
  for (const [index, table] of tables.entries()) {
    const body = section(`### ${table}\n`, index + 1 < tables.length ? `### ${tables[index + 1]}\n` : '## 4.');
    contains(body, 'uuid PRIMARY KEY', 'ON DELETE RESTRICT', 'UNIQUE', 'immutable', 'Retention/RLS/grants follow section 2');
    assert.match(body, /index/i);
  }
  contains(design, 'ENABLE ROW LEVEL SECURITY', 'revoke ALL including TRUNCATE', 'column privileges',
    'no PUBLIC/anon/authenticated policies or grants', '9007199254740991', 'clock_timestamp()',
    'armed_at cannot be cleared or changed', 'external_id cannot change after binding');
});

test('all eight RPCs have typed signatures, common outputs and operation-specific audit results', () => {
  const rpcs = [
    ['claim_research_dispatch', 'claim/CLAIMED'], ['renew_research_dispatch_claim', 'renew/RENEWED'],
    ['arm_research_submission', 'arm/ARMED'], ['bind_research_provider_identity', 'bind/BOUND'],
    ['hold_research_dispatch', 'hold/HELD'], ['reconcile_research_dispatch', 'reconcile/RECONCILED'],
    ['record_research_billing_evidence', 'billing_evidence/EVIDENCE_RECORDED'],
    ['apply_research_billing_adjustment', 'billing_adjustment/ADJUSTMENT_RECORDED']
  ];
  for (const [index, [name, audit]] of rpcs.entries()) {
    const body = section(`### ${name}(`, index + 1 < rpcs.length ? `### ${rpcs[index + 1][0]}(` : '## 5.');
    contains(body, '-> jsonb', audit);
  }
  contains(design, 'p_operation_id uuid', 'p_expected_revision bigint', 'p_worker_id text, p_epoch bigint',
    'bounded JSONB envelope', 'No defaults or overloaded signatures', 'SAME transaction');
});

test('RPC security and replay contracts reject caller authority, changed replay and stale fencing', () => {
  const common = section('## 4.', '### claim_research_dispatch(');
  contains(common, 'SECURITY DEFINER', 'owner postgres', 'search_path=pg_catalog',
    'Revoke EXECUTE from PUBLIC/anon/authenticated', 'grant only service_role',
    'Service-role possession alone is insufficient', 'research.view is insufficient',
    'CURRENT state', 'CONFLICTING_REPLAY', 'STALE_REVISION/STALE_EPOCH', 'IDENTITY_MISMATCH',
    'fixed and sanitized', 'No HTTP while locks are held');
  contains(design, 'expired by database clock', 'SUBMISSION_BOUNDARY_CROSSED', 'cannot revive',
    'Replayed submission intent never grants a second send', 'lost response requires HOLD',
    'New second reconciliation -> RECONCILIATION_CONFLICT', 'separate future authoritative procedure');
});

test('global lock graph covers six M2 routines, M1 credit paths and known inversions without claiming deadlock freedom', () => {
  const locks = section('## 5.', '## 6.');
  contains(locks, 'reserve_research_job', 'begin_research_provider_attempt', 'finish_research_provider_attempt',
    'mark_research_job_ambiguous', 'complete_research_job', 'fail_research_job',
    'reserve_research_credits', 'finalize_research_credits', 'consume_research_credits',
    'enforce_saved_listing_quota', 'handle_new_user_signup', 'subscription grants/resets/admin credit adjustment',
    'J->A', 'A->J', 'B->G/U/LG/LA', 'O->B/windows', 'NOT proof', 'UNKNOWN',
    'R -> J -> S -> A(sorted UUID) -> D -> G -> U -> LG -> LA -> WG -> WA -> B -> O -> C',
    'must never subsequently acquire R', 'lock_timeout 3s', 'statement_timeout 30s');
});

test('legacy bypass prevention includes controlled admission, both first-finish branches and historical isolation', () => {
  const bypass = section('## 6.', '## 7.');
  contains(bypass, 'dispatch_protocol_version', 'legacy-disabled', 'durable-dispatch-v1',
    'absence of a dispatch row for controlled jobs is an error', 'SAME transaction',
    'begin_research_provider_attempt', 'finish_research_provider_attempt', 'complete_research_job',
    'fail_research_job', 'mark_research_job_ambiguous', 'reserve_research_job',
    'FIRST_FINISH_ID_IMMUTABILITY', 'BEFORE both normal and cost-overrun', '1522 and 1563',
    'old callable bypass is unacceptable', 'Historical legacy attempts remain non-dispatchable',
    'Old consume/reserve/finalize privileges stay revoked');
});

test('billing contracts preserve unknowns, deduplicate evidence and keep financial holds separate from execution', () => {
  contains(design, 'amount_micro_usd | nullable money', 'delta_micro_usd | signed_money',
    'provider, source_namespace, source_account_key, source_event_id', 'BILLING_EVENT_CONFLICT',
    'Multiple partial/cumulative usage or invoice records are unsupported', 'COVERAGE_UNRESOLVED',
    'Unknown costs and unresolved liabilities stay UNKNOWN, never zero', 'NUMERIC intermediates',
    'Reject OVERFLOW atomically', 'settled_micro_usd <= reserved_micro_usd',
    'cannot represent late excess charges directly', 'pending financial state survives',
    'historical execution outcome', 'No automatic credit refund', 'not automatically a confirmed conflict');
});

test('retention explicitly addresses Auth cascades and unresolved deletion policy', () => {
  contains(design, 'no automatic TTL or Auth-delete cascade', 'RESTRICT intentionally prevents existing Auth/job cascades',
    'without a new cascading Auth FK', 'anonymize user-facing profile data', 'must not disable triggers or delete liabilities',
    'Policy/legal retention, orphan handling, backups and privileged purge authority remain UNKNOWN');
});

test('failure and rollout coverage includes external uncertainty and irreversible rollback limits', () => {
  const recovery = section('## 8.', '## 9.');
  contains(recovery, 'duplicate workers', 'lease expiration before arm', 'lease expiration after arm',
    'lost arm response', 'crash before external send', 'crash after external send', 'stale worker / paused sender',
    'provider-ID conflict', 'timeout / unknown acceptance', 'late charges or refunds',
    'conflicting reconciliation', 'partial invoice coverage', 'fencing token cannot prevent',
    'Exactly-once external execution is NOT claimed');
  contains(design, 'Separate B2 approval', 'Isolated staging approval', 'old entry points cannot bypass',
    'Separate activation approval', 'forward corrective migrations', 'SQL rollback cannot undo external acceptance');
});

test('existing activation and retry blocks remain disabled without touching routes or pricing', () => {
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.activationBlocked, true);
  const state = createResearchDispatchProtocol({ requestId: 'spec-request', attemptId: 'spec-attempt',
    provider: 'apify', providerIdentifier: PINNED_APIFY_ACTOR, intentDigest: 'a'.repeat(64) });
  assert.equal(state.activationBlocked, true);
  assert.equal(state.executionAuthorized, false);
  assert.equal(state.automaticRetryAllowed, false);
  assert.equal(state.requiresAuthoritativeDatabaseValidation, true);
  contains(design, 'activationBlocked=true', 'executionAuthorized=false', 'automaticRetryAllowed=false',
    '120000 microUSD per-credit cap remain unchanged', 'keep HTTP 503');
});

test('financial status is independent of execution phase with precise compatible row and transition rules', () => {
  const dispatch = section('### research_dispatches\n', '### research_dispatch_events\n');
  contains(dispatch, 'No financial_status value constrains phase',
    '(phase=provider_completed, financial_status=pending)', '(phase=reconciled, financial_status=pending)',
    'phase=reconciled iff execution_reconciled_at IS NOT NULL',
    'financial_status IN (unknown,pending) implies billing_verified_through IS NULL',
    'it preserves phase, execution_outcome, execution_reconciled_at and unresolved_outcome',
    'Financial-only holds never relatch execution uncertainty',
    'Execution reconciliation sets phase=reconciled while preserving any pending financial state');
  assert.doesNotMatch(design, /Pending financial status requires phase=reconciliation_hold/);
});

test('operation identity compares canonical arguments separately from source semantic identity and evidence digests', () => {
  const replay = section('### Two-level idempotency', '### claim_research_dispatch(');
  contains(replay, 'ALL canonical arguments', 'both argument_digest and canonical_arguments structural equality',
    'digest equality alone is insufficient', 'explicit null versus zero',
    'Compare every persisted semantic field', 'Compare evidence_digest exactly',
    'Exclude operation_id, proposed new evidence/adjustment UUID, expected revision',
    'Same operation_id, identical canonical arguments', 'Same operation_id, changed canonical arguments or RPC kind',
    'CONFLICTING_REPLAY', 'Fresh source replay requires current expected revision and authorization');
});

test('source-event and adjustment duplicates under new operations produce receipts but no duplicate financial effects', () => {
  const replay = section('### Two-level idempotency', '### claim_research_dispatch(');
  contains(replay, 'SOURCE_EVENT_DUPLICATE', 'ADJUSTMENT_DUPLICATE',
    'one audit receipt in research_dispatch_events binds the NEW operation_id',
    'no new billing ledger row or financial effect', 'no new adjustment row or financial effect',
    'no new audit event, ledger row, revision or financial effect',
    'Replaying the receipt produces no further audit event or revision',
    'changed semantic content/evidence_digest', 'BILLING_EVENT_CONFLICT',
    'Unique source constraints and dispatch locks serialize concurrent duplicates',
    'No evidence or financial totals are updated on source replay');
});

test('all six M2 entry points and grants must be hardened atomically without a legacy compatibility bypass', () => {
  const bypass = section('Atomic legacy bypass prevention:', '## 7.');
  contains(bypass, 'reserve_research_job', 'begin_research_provider_attempt', 'finish_research_provider_attempt',
    'mark_research_job_ambiguous', 'complete_research_job', 'fail_research_job',
    'hardened atomically in one future migration transaction', 'including alternate overloads',
    'drain/terminate relevant in-flight transactions', 'before any caller resumes',
    'no staged compatibility window with a bypass');
});

test('lock-order acceptance requires multi-session staging runtime validation and never claims static deadlock freedom', () => {
  const locks = section('Required runtime lock validation:', '## 6.');
  contains(locks, 'independent sessions and explicit barriers', 'reversed arrival orders',
    'same-request begin/finish/complete/fail/ambiguous races',
    'different requests for the same account', 'different accounts',
    'duplicate source events and adjustments with distinct operation IDs',
    'one source ledger effect', 'no callable legacy bypass',
    'Static documentation cannot establish deadlock freedom',
    'does not prove all possible schedules safe', 'not performed in B1');
});
