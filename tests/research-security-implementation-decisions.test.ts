import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

// Static document/source checks only. No database locks, transport or staging harness execution.
const doc = readFileSync('docs/research-security-implementation-decisions.md', 'utf8');
const sql = readFileSync('supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql', 'utf8');
const json = /```json\s*([\s\S]*?)```/.exec(doc);
assert.ok(json);
interface Decision { id: string; status: string; candidate: string; alternatives: string[]; reason: string;
  approvalRequested: string; owner: string; beforeSql: string; beforeStaging: string; beforePaid: string }
const plan = JSON.parse(json[1]) as { version: string; reviewedHead: string; decisions: Decision[];
  sqlAuthoringAllowed: boolean; stagingExecutionAllowed: boolean; paidDispatchAllowed: boolean;
  activationBlocked: boolean; executionAuthorized: boolean; automaticRetryAllowed: boolean; runtimeSafetyVerified: boolean };
function includes(...requirements: string[]) {
  for (const requirement of requirements) assert.ok(doc.includes(requirement), `Missing B8 candidate requirement: ${requirement}`);
}
function section(start: string, end: string) {
  const from = doc.indexOf(start), to = doc.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return doc.slice(from, to);
}

test('B8 records actual B7 baseline and keeps authoring staging dispatch and runtime proof blocked', () => {
  assert.equal(plan.version, 'security-implementation-decisions-v1');
  assert.equal(plan.reviewedHead, '32fd476e91d3fc8bfc46d0b605aa8529f5d08e53');
  for (const key of ['sqlAuthoringAllowed', 'stagingExecutionAllowed', 'paidDispatchAllowed',
    'executionAuthorized', 'automaticRetryAllowed', 'runtimeSafetyVerified'] as const) assert.equal(plan[key], false);
  assert.equal(plan.activationBlocked, true);
  includes('latest relevant commit B7', 'NOT APPROVED / NOT EXECUTED', 'requiresAuthoritativeDatabaseValidation=true',
    'HTTP 503', 'B6 F01–F08 statuses are not changed');
});

test('B8 five selected candidates each expose alternatives reasons owners and three separate evidence gates', () => {
  assert.deepEqual(plan.decisions.map(item => item.id), ['D1', 'D2', 'D3', 'D4', 'D5']);
  for (const item of plan.decisions) {
    assert.equal(item.status, 'PROPOSED');
    assert.ok(item.alternatives.length >= 2);
    for (const key of ['candidate', 'reason', 'approvalRequested', 'owner', 'beforeSql', 'beforeStaging', 'beforePaid'] as const) {
      assert.ok(item[key].length > 25, `${item.id}: missing concrete ${key}`);
    }
  }
  includes('Owner approval is requested', 'not inferred from selection', 'not runnable configuration');
});

test('B8 D1 selects precise lockable guard subject mapping retained request and intent schemas', () => {
  const d1 = section('## 2.', '## 3.');
  for (const table of ['research_authority_guard', 'research_authority_principals', 'research_accounting_subjects',
    'research_accounting_auth_links', 'research_retained_request_scopes', 'research_provider_intents']) {
    assert.ok(d1.includes(`| ${table} |`), table);
  }
  includes('guard_id smallint CHECK =1', 'PK guard_id', 'UNIQUE login_name', 'UNIQUE login_role_oid',
    'PK auth_user_id, UNIQUE accounting_subject_id', 'Auth FK ON DELETE CASCADE', 'subject FK ON DELETE RESTRICT',
    'UNIQUE reservation_id', 'UNIQUE(request_id,accounting_subject_id)',
    'UNIQUE(attempt_id,request_id,accounting_subject_id,provider)', 'missing AU0/AU/AS denies');
});

test('B8 D1 deletion and retention choices cannot erase accounting or silently certify zero generation', () => {
  includes('NO FK back into Auth-dependent rows', 'No FK may point from retained evidence to an Auth-cascading parent',
    'two-stage disable/retain', 'do not invoke Auth cascade in that short transaction',
    'M15 RESTRICT handling', 'Legal retention period, lawful basis, backup expiry and purge authority',
    'Full deletion remains BLOCKED', 'B4\'s local encoder currently permits zero creditGeneration',
    'Candidate admission MUST reject zero', 'reservation_id=request_id', 'do not modify B4 silently');
  const canonical = readFileSync('src/server/researchCanonicalIntent.ts', 'utf8');
  assert.ok(canonical.includes('integer(result.creditGeneration, 0, Number.MAX_SAFE_INTEGER)'));
  assert.ok(sql.includes('credit_account_generation <= 0'));
});

test('B8 D2 retains one ordered graph with concrete transaction subsets and no new reverse intent order', () => {
  const d2 = section('## 3.', '## 4.');
  const order = ['AU0', 'AU', 'AS', 'MP', 'R', 'J', 'S', 'P', 'A', 'I', 'D', 'G', 'U', 'LG', 'LA', 'WG', 'WA', 'B', 'O', 'C', 'E'];
  assert.ok(d2.includes(order.join('→')));
  const rows = d2.split('\n').filter(line => /^\| (reservation candidate|admission \/ arm|claim \/ renew \/ bind|report outcome \/ hold|billing evidence \/ correction|approved subscription|principal revocation|disable\/mapping)/.test(line));
  assert.equal(rows.length, 8);
  for (const row of rows) {
    const locks = row.split('|')[2].split(';')[0].split(' ').filter(token => order.includes(token));
    assert.ok(locks.length >= 3, row);
    assert.equal(new Set(locks).size, locks.length);
    const indices = locks.map(lock => order.indexOf(lock));
    assert.ok(indices.every((index, i) => i === 0 || index > indices[i - 1]), row);
  }
  includes('Do NOT acquire I before A', 'retained request parent before operational job',
    'No fresh dispatch may skip missing operational rows', 'No multi-subject/multi-request',
    'Unknown FK/unique-index/trigger edges block implementation', 'no SHARE→UPDATE upgrades');
});

test('B8 D3 selects actual authenticated principals instead of caller labels or service-role fallback', () => {
  includes('tp_research_dispatcher', 'tp_research_reconciler', 'tp_research_billing',
    'NOLOGIN tp_dispatch_cap, tp_reconcile_cap, tp_billing_cap',
    'NOT provisioned roles or approved pooler usernames', 'session_user at every transaction/pool checkout',
    'current_user inside SECURITY DEFINER is its pinned owner', 'INHERIT TRUE/SET FALSE/ADMIN FALSE',
    'Session pooling is CONDITIONAL', 'transaction pooling is not approved',
    'Client TLS verify-full', 'three separately restricted database identities',
    'no generic elevated broker fallback', 'password rotation/NOLOGIN alone is insufficient');
});

test('B8 D3 privilege matrix definer ownership and revocation remain explicit unapproved controls', () => {
  includes('search_path=pg_catalog', 'existing B1 postgres', 'default PUBLIC EXECUTE',
    'private helper EXECUTE revoked even from workload roles', 'new report/publication capabilities',
    'A5/A8 matrix revision/approval', 'No financial closure, liability release, credit refund, historical purge or customer reservation',
    'AU SHARE through transaction end', 'committed revocation first denies', 'No revocation clears armed state');
});

test('B8 D4 covers all six actual legacy signatures and selected replacement entry points', () => {
  const d4 = section('## 5.', '## 6.');
  const definitions = [...sql.matchAll(/CREATE FUNCTION public\.(\w+)\(([\s\S]*?)\)\s*RETURNS JSONB/g)];
  assert.equal(definitions.length, 6);
  for (const [, name, args] of definitions) {
    const types = args.split(',').map(arg => arg.trim().split(/\s+/)[1].toLowerCase());
    assert.ok(d4.includes(`${name}(${types.join(',')})`));
    assert.ok(sql.includes(`GRANT EXECUTE ON FUNCTION public.${name}(`));
  }
  for (const name of ['reserve_research_job_v2', 'admit_research_provider_attempt', 'report_research_provider_outcome',
    'hold_research_dispatch', 'publish_research_execution']) assert.ok(d4.includes(name));
  includes('p_command text; result jsonb', 'validation BEFORE any jsonb conversion',
    'B4 arm draft is NOT sufficient', 'DENY-ALL runtime placeholder', 'No separate refund RPC granted');
});

test('B8 D4 orders revocation before grants and defines rollback without restoring a bypass', () => {
  includes('quiesce', 'drain old transactions', 'One migration transaction',
    'grant only approved capability-specific signatures LAST', 'hardening/default privilege revocations',
    'any error rolls back DDL/ACL atomically', 'workloads remain disabled',
    'not reverse arms/delete evidence/restore unsafe legacy grants',
    'No atomicity claim yet', 'SQL authoring remains BLOCKED');
});

test('B8 D5 selects durable unknown holds independently from invoices credits and account deletion', () => {
  includes('research_financial_holds', 'hold_id uuid PK', 'status text unknown/pending',
    'minimum_known_liability_micro_usd bigint nullable', 'status has NO closed value',
    'research_billing_evidence', 'research_billing_adjustments', 'source correction identity',
    'research_retained_liabilities', 'partial UNIQUE global scope and account subject',
    'minimum_known_excess_micro_usd bigint nullable', 'non-double-counting aggregate transition',
    'initial publication does not settle M2 reservation', 'minimum_known_liability');
});

test('B8 D5 pricing and evidence uncertainty cannot authorize spending refunds finality or liability release', () => {
  includes('$0.12/credit =120000 microUSD', '33280 input/2048 output', 'two-attempt reserve (not retry permission)',
    'missing charges UNKNOWN', 'Provider APIs, actual billing semantics, failed-run/demand/surcharge costs',
    'Caller booleans or synthetic invoice JSON are not independently authenticated evidence',
    'never add invoice again', 'Signed negative evidence', 'No refund/settlement/closure/purge path initially',
    'Financial pending/unknown survives execution completion');
});

test('B8 staging plan contains all six non-executing scopes with distinct approval evidence risk and cleanup', () => {
  const staging = section('## 8.', '## 9.');
  const rows = staging.split('\n').filter(line => /^\| S[1-6] /.test(line));
  assert.equal(rows.length, 6);
  for (const [i, row] of rows.entries()) {
    assert.ok(row.startsWith(`| S${i + 1} `));
    const columns = row.split('|').slice(1, -1);
    assert.equal(columns.length, 4);
    assert.ok(columns[0].trim().length > 15);
    assert.ok(columns.slice(1).every(column => column.trim().length > 40));
    assert.match(columns[1], /Gate G/);
    assert.match(columns[2], /LOW|MEDIUM|HIGH/);
    assert.match(columns[3], /Stop|BLOCKED|mismatch/i);
  }
  includes('all NOT EXECUTED', 'G-CANON', 'G2-ID', 'G3-LOCK', 'G-CUTOVER', 'G-FIN',
    'This table is not permission to connect', 'No safe cleanup/retention exception -> BLOCKED',
    'S5 validates an approved deployment/cutover', 'BEFORE S3–S4–S6 acceptance');
});

test('B8 certification and staging discovery do not silently satisfy B6 prerequisite or authority acceptance', () => {
  includes('B1/B6 require PostgreSQL canonical certification before implementation',
    'B8 does not waive that gate', 'all 13 vectors', 'identical UTF-8 bytes/hex and SHA-256',
    'TypeScript/Python success not PostgreSQL proof', 'NFC/NFKC/surrogates/NUL',
    'NOT post-cutover acceptance', 'do not expand M3.6 allowlists',
    'reject production fdvnojlojtfiwhtchgdk', 'iwqnyqaefovhvnunarfa', 'No secrets in commands/artifacts');
});

test('B8 introduces no executable migration and static checks do not establish deployed safety', () => {
  const entries = readdirSync('supabase/migrations', { withFileTypes: true });
  assert.ok(entries.every(entry => entry.isFile()));
  assert.deepEqual(entries.map(entry => entry.name).sort(), [
    '20261010_etsyhunter_m1_foundation.sql', '20261011160000_etsyhunter_m1_p1b_security.sql',
    '20261011170000_etsyhunter_m1_existing_users_backfill.sql', '20261011180000_etsyhunter_m15_admin_rbac.sql',
    '20261011200000_etsyhunter_m2_research_lifecycle.sql'
  ].sort());
  assert.doesNotMatch(doc, /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|FUNCTION)\b/i);
  includes('do NOT simulate PostgreSQL locking or prove deployed safety', 'unrelated work is preserved');
});
