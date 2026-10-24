import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Documentation coverage only. No SQL execution or simulation of PostgreSQL locks.
const doc = readFileSync('docs/research-lock-authority-design.md', 'utf8');
const migration = readFileSync('supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql', 'utf8');
const match = /```json\s*([\s\S]*?)```/.exec(doc);
assert.ok(match, 'Missing versioned lock inventory');
const plan = JSON.parse(match[1]) as { version: string; status: string; order: string[];
  transactions: Record<string, string[]>; activationBlocked: boolean; executionAuthorized: boolean;
  automaticRetryAllowed: boolean; runtimeGuaranteesVerified: boolean };
const ORDER = ['AU0', 'AU', 'AS', 'MP', 'R', 'J', 'S', 'P', 'A', 'I', 'D', 'G', 'U',
  'LG', 'LA', 'WG', 'WA', 'B', 'O', 'C', 'E'];
function includes(...requirements: string[]) {
  for (const requirement of requirements) assert.ok(doc.includes(requirement), `Missing lock/authority requirement: ${requirement}`);
}
function section(start: string, end: string): string {
  const from = doc.indexOf(start), to = doc.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return doc.slice(from, to);
}

test('B5 remains offline documentation with every activation and runtime guarantee disabled', () => {
  assert.equal(plan.version, 'lock-authority-design-v1'); assert.equal(plan.status, 'PROPOSED_BLOCKED');
  assert.equal(plan.activationBlocked, true); assert.equal(plan.executionAuthorized, false);
  assert.equal(plan.automaticRetryAllowed, false); assert.equal(plan.runtimeGuaranteesVerified, false);
  includes('PROPOSED, OFFLINE ONLY', 'HTTP 503', 'requiresAuthoritativeDatabaseValidation=true',
    'not implemented SQL or deployed locking guarantees', 'No database runtime verification occurred');
  assert.doesNotMatch(doc, /CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|TABLE)\b/i);
});

test('B5 specifies one complete graph including authority subject pricing intent credit and financial scopes', () => {
  assert.deepEqual(plan.order, ORDER);
  includes('candidate refinement', 'not an approved replacement', 'authority/subject placement',
    'pricing P and intent I', 'Existing B1/B3 unresolved gates remain unresolved');
  for (const rank of ['AU0', 'AU', 'AS', 'MP', 'R', 'J', 'S', 'P', 'A', 'I', 'D', 'LG / LA', 'WG / WA', 'B', 'O', 'C', 'E']) {
    assert.ok(doc.includes(`| ${rank} |`), `Missing mode/absence rule: ${rank}`);
  }
});

test('B5 inventories all transaction classes as ordered subsets without duplicate ranks', () => {
  assert.deepEqual(Object.keys(plan.transactions), ['reserve', 'admit', 'claim', 'renew', 'arm', 'bind',
    'finish', 'hold', 'reconcile', 'billing', 'adjust', 'complete', 'fail', 'subscription_credit_reset',
    'revoke', 'delete_maintenance']);
  for (const [name, locks] of Object.entries(plan.transactions)) {
    assert.equal(new Set(locks).size, locks.length, `${name}: duplicated rank`);
    const indexes = locks.map(lock => ORDER.indexOf(lock));
    assert.ok(indexes.every((index, i) => index >= 0 && (i === 0 || index > indexes[i - 1])), `${name}: inverted order`);
    assert.deepEqual(locks.slice(0, 2), ['AU0', 'AU']);
    assert.equal(locks.at(-1), 'E');
  }
  assert.deepEqual(plan.transactions.admit, ORDER);
  assert.deepEqual(plan.transactions.arm, ORDER);
  for (const name of ['billing', 'adjust', 'complete', 'fail', 'hold', 'reconcile', 'finish']) {
    for (const rank of ['AS', 'R', 'J', 'A', 'I', 'D', 'G', 'U', 'LG', 'LA', 'WG', 'WA', 'B', 'O', 'C']) {
      assert.ok(plan.transactions[name].includes(rank), `${name} missing ${rank}`);
    }
  }
});

test('B5 distinguishes lock modes guards for absent rows and unverifiable lock choices', () => {
  includes('FOR SHARE for ordinary transactions', 'revocation takes FOR UPDATE', 'KEY SHARE alone would not prevent',
    'Missing guard -> BLOCKED', 'AS protects absent/removable mapping', 'R protects absent intent/generation',
    'No advisory session locks', 'transaction-scoped EXCLUSIVE pg_advisory_xact_lock',
    'Lock upgrades are forbidden', 'ONE accounting subject and ONE request',
    'No SKIP LOCKED/NOWAIT shortcut', 'implicit lock completeness remain BLOCKED');
});

test('B5 documents actual six M2 lock differences rather than asserting existing safety', () => {
  const observed = section('## 1.', '## 2.');
  for (const name of ['reserve_research_job', 'begin_research_provider_attempt', 'finish_research_provider_attempt',
    'mark_research_job_ambiguous', 'complete_research_job', 'fail_research_job']) {
    assert.ok(observed.includes(`| ${name} |`));
    assert.ok(migration.includes(`CREATE FUNCTION public.${name}(`), `Missing committed RPC ${name}`);
  }
  includes('A→J differs', 'O→B differs', 'Same-request R mitigates', 'NOT proof',
    'FK key-share locks', 'unique-index waits', 'UNKNOWN writers must remain disabled');
  assert.ok(migration.includes('FOR SHARE;'), 'Expected actual pricing share lock');
  assert.ok(migration.includes('research_provider_attempts_one_active_uidx'));
});

test('B5 authentication separates login authority from definer caller labels and pooled assumptions', () => {
  includes('verified session_user', 'current_user inside SECURITY DEFINER is its owner',
    'SET ROLE does not establish a new login', 'SET SESSION AUTHORIZATION',
    'mutable session settings alone are not authentication', 'Supavisor session-path', 'UNVERIFIED',
    'restricted database identity', 'cannot restore shared service_role access',
    'INHERIT TRUE, SET FALSE, ADMIN FALSE', 'PUBLIC/inherited/effective privileges');
});

test('B5 revocation has explicit linearization modes replay denial and draining boundaries', () => {
  assert.deepEqual(plan.transactions.revoke, ['AU0', 'AU', 'E']);
  includes('AU0 SHARE then target AU UPDATE', 'Runtime holds AU SHARE to end of transaction',
    'including exact replay', 'If revocation commits first, the operation denies',
    'not retroactive cancellation', 'Password rotation/NOLOGIN alone',
    'drain/terminate active and pooled sessions', 'No lock may be held across HTTP');
});

test('B5 narrow capabilities deny closure purge and unresolved publication authority', () => {
  const authority = section('## 4.', '## 5.');
  for (const rpc of ['admit_research_provider_attempt', 'claim_research_dispatch', 'renew_research_dispatch_claim',
    'arm_research_submission', 'bind_research_provider_identity', 'hold_research_dispatch',
    'reconcile_research_dispatch', 'record_research_billing_evidence', 'apply_research_billing_adjustment']) {
    assert.ok(authority.includes(rpc), rpc);
  }
  includes('Reserve and completion/failure publication authority are not granted',
    'exact approved replacement signatures/authority contracts', 'No dynamic overload grant',
    'financial closure/liability release or historical purge');
});

test('B5 hardens definer ownership search paths PUBLIC defaults and dependency privileges', () => {
  includes('search_path=pg_catalog', 'pinned postgres', 'schema-qualified references',
    'no untrusted schema/temp shadowing/dynamic identifiers', 'runtime logins own nothing',
    'Revoke default PUBLIC EXECUTE for the actual creating owner', 'explicit same-transaction revocation',
    'RLS is defense in depth', 'existing admin', 'non-callable private helpers');
});

test('B5 lists exact legacy signatures and requires atomic denial with no compatibility bypass', () => {
  const cutover = section('## 5.', '## 6.');
  for (const signature of [
    'reserve_research_job(uuid,uuid,text,integer,integer,text,text,text,text)',
    'begin_research_provider_attempt(uuid,uuid,uuid,text,text,integer,text)',
    'finish_research_provider_attempt(uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,text)',
    'mark_research_job_ambiguous(uuid,uuid,text)',
    'complete_research_job(uuid,uuid,uuid,uuid,text,jsonb,integer,timestamptz,text,jsonb,text,timestamptz)',
    'fail_research_job(uuid,uuid,text)']) assert.ok(cutover.includes(signature), signature);
  includes('ONE migration transaction', 'quiesce/drain in-flight transactions', 'No mixed unsafe old/new window',
    'All six OLD external signatures have no runtime direct callers',
    'rollback must disable capabilities/callers', 'Missing controlled dispatch rows reject');
});

test('B5 provider identity replay deduplication and immutable generation survive both finish branches', () => {
  includes('Both first-finish branches', 'first-write', 'BOTH normal and overrun branches',
    'A→B rejects, A→null retains A, null→A binds', 'exact finished replay has no second effect',
    'unique local attempt and (request,provider,dispatch_generation)', 'irreversible armed_at',
    'no duplicate charge', 'operation ID plus exact canonical argument comparison');
});

test('B5 concrete matrix covers all twelve races with lock dependency outcome and hold requirements', () => {
  const matrix = section('## 6.', '## 7.');
  const rows = matrix.split('\n').filter(line => /^\| C\d{2} /.test(line));
  assert.equal(rows.length, 12);
  rows.forEach((row, i) => {
    assert.ok(row.startsWith(`| C${String(i + 1).padStart(2, '0')} `));
    assert.equal(row.split('|').length, 6, 'Expected race, winner/loser, dependency and invariant columns');
  });
  for (const race of ['admission vs admission', 'admission vs revocation', 'admission vs credit reservation',
    'claim expiry vs stale worker', 'arm vs cancellation', 'provider binding vs conflicting finish',
    'Reconciler vs Dispatcher', 'billing evidence vs refund/closure', 'completion vs financial hold',
    'deletion vs retained subject', 'legacy RPC vs new admission', 'database abort vs irreversible submission']) {
    assert.ok(matrix.includes(race), race);
  }
  includes('independent sessions and explicit barriers', 'Reverse arrival schedules', 'NOT EXECUTED');
});

test('B5 database abort recovery is distinct from paid retry and uncertain arm outcomes', () => {
  includes('Default remains NO automatic retries', 'CONFIRMED server abort', '40001 or 40P01',
    'UNKNOWN/BLOCKED, not implemented here', '55P03 timeout is not implicit retry permission',
    'No retry inside the failed transaction', 'Lost commit/arm response',
    'exact arm replay never grants a second send', 'Database fencing cannot stop an already paused external sender');
});

test('B5 financial independence retention and deletion do not release unknown liabilities', () => {
  includes('Execution phase and financial_status are independent', 'Missing costs remain UNKNOWN, never zero',
    'Preserve $0.12/credit cap', 'negative adjustments do not release a hold',
    'Financial closure/liability release and historical purge are denied',
    'must NOT execute Auth cascade deletion', 'Full account deletion', 'remains BLOCKED',
    'Retention periods/legal policy remain UNKNOWN');
});

test('B5 PostgreSQL byte and digest certification stays blocked despite TypeScript vectors', () => {
  includes('dispatch-canonical-v1', 'submission-intent-v1 versus dispatch-operation-v1', 'NUL framing',
    'No NFC/NFKC', 'validate before lossy conversion', 'NOT a complete RPC',
    'PostgreSQL certification is BLOCKED', 'exact bytes AND digests',
    'No activation until cross-runtime vectors match', 'TypeScript/Python success is not PostgreSQL compatibility',
    'Gate 1 baseline read-only discovery is NOT Gate 2', 'separate approval');
});
