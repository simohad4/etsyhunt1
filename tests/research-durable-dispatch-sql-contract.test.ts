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
    'Revoke EXECUTE from PUBLIC/anon/authenticated and service_role', 'grant only the separated capability roles',
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
  contains(design, 'no automatic TTL or Auth-delete cascade', 'research_accounting_subjects',
    'research_accounting_auth_links', 'anonymize user-facing profile data', 'must not disable triggers or delete liabilities',
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

test('separated authority requires verified connection identity, narrow grants and revocation before replay', () => {
  const authority = section('### 2A.', '### 2B.');
  contains(authority, 'separate authenticated backend connection principals: dispatcher, reconciler and billing',
    'No shared service_role credential may invoke the new protocol', 'narrow NOLOGIN capability role',
    '| dispatcher | claim_research_dispatch, renew_research_dispatch_claim, arm_research_submission, bind_research_provider_identity, hold_research_dispatch |',
    '| reconciler | reconcile_research_dispatch |',
    '| billing | record_research_billing_evidence, apply_research_billing_adjustment |',
    'derived from session_user, NOT current_user', 'not authentication',
    'on EVERY operation, including replay', 'Post-revocation replay cannot bypass capability checks',
    'terminate/drain existing sessions', 'Supabase connection-path support', 'are UNKNOWN',
    'Do not silently fall back to shared service_role');
});

test('canonical intent specifies strict domain-separated bytes and mandatory cross-language golden vectors', () => {
  const intent = section('### 2B.', '### 2C.');
  contains(intent, 'dispatch-canonical-v1', 'submission-intent-v1', 'dispatch-operation-v1',
    'one zero byte', 'SHA-256', 'UTF-8 byte length', 'sorted by unsigned UTF-8 byte order',
    'No floats', 'duplicate keys', 'reject lone surrogates, U+0000', 'Do not silently normalize Unicode',
    'immutable provider body', 'Exclude Auth UUID/email, credentials',
    'Encoding must not use JSON.stringify or jsonb::text',
    'TypeScript/PostgreSQL golden vectors are REQUIRED BEFORE IMPLEMENTATION',
    'Assert identical bytes and SHA-256', 'vectors are not implemented or certified here');
});

test('OpenRouter intent waits for validated source input and admission remains atomic', () => {
  const intent = section('### 2B.', '### 2C.');
  contains(intent, 'OpenRouter intent is created ONLY when its validated input exists',
    'Apify source-attempt identity', 'cannot be finalized at initial job reservation',
    'atomically create the attempt plus immutable dispatch/intent snapshot',
    'old begin signature cannot invent missing input', 'current wire drafts remain unverified against live providers');
});

test('billing excludes unallocatable invoices and forbids duplicate recognition or premature financial release', () => {
  const finance = section('## 7.', '## 8.');
  contains(finance, 'ONLY attempt-attributable billing evidence',
    'Pooled, overlapping and unattributable invoice allocation is explicitly excluded',
    'never invent proportional allocations', 'verified invoice amount is not final all-in cost',
    'Missing charges remain UNKNOWN, never zero',
    'signed correction relative to a referenced previously recorded evidence baseline',
    'same economic event cannot be recognized once as a billing_event and again as a corrective adjustment',
    'uncertain baselines reject', 'negative evidence does not release liability');
  contains(design, 'Financial closure and liability release are UNAVAILABLE',
    'none of these eight RPCs may set that state', 'FINANCIAL_RELEASE_UNAVAILABLE');
});

test('retained accounting scope replaces Auth-dependent FKs with a removable mapping and controlled deletion', () => {
  const retention = section('### 2C.', '## 3.');
  contains(retention, 'separate accounting-subject identity and removable Auth mapping',
    'auth_user_id uuid PRIMARY KEY referencing auth.users ON DELETE CASCADE',
    'Only this removable mapping participates in Auth deletion',
    'NO retained dispatch FK to auth.users, research_jobs or research_provider_attempts',
    'Pseudonymization is not anonymization', 'Dedicated purge authority',
    'Jurisdiction-specific legal retention periods', 'are UNKNOWN');
  assert.doesNotMatch(design, /composite FK \(attempt_id, request_id, user_id, provider\) to M2/);
  assert.doesNotMatch(design, /p_request_id uuid, p_user_id uuid, p_attempt_id uuid/);
  contains(design, 'p_accounting_subject_id uuid', 'canonical arguments use accounting_subject_id, not p_user_id');
});

test('cutover includes new authority and mapping dependencies and identifies unverified implicit locks', () => {
  const cutover = section('Atomic legacy bypass prevention:', '## 7.');
  contains(cutover, 'all six affected M2 lifecycle entry points',
    'hardened atomically in one future migration transaction',
    'drain/terminate relevant in-flight transactions', 'separated principal/capability checks',
    'implicit FK, unique-index, trigger, Auth deletion and financial UPDATE locks',
    'subject/account gate', 'exact placement is UNKNOWN',
    'separately authorized independent-session staging tests',
    'no executable migration is ready while this ordering decision is unresolved');
});

test('M4.7 shared late-billing phase is explicitly not the independent M4.8 SQL contract', () => {
  const dispatch = section('### research_dispatches\n', '### research_dispatch_events\n');
  contains(dispatch, 'Simulator difference: M4.7 late_adjustment explicitly sets phase=reconciliation_hold',
    'M4.8 instead preserves completed/reconciled execution phase',
    'M4.7 simulator is unchanged', 'not a SQL CHECK requirement',
    'Migration-specific tests must follow the independent M4.8 contract');
});
