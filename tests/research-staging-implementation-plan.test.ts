import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

// Documentation/source inspection only: no SQL, staging harness execution or transport imports.
const doc = readFileSync('docs/research-staging-implementation-plan.md', 'utf8');
const match = /```json\s*([\s\S]*?)```/.exec(doc);
assert.ok(match, 'Missing readiness inventory');
interface Phase { id: string; status: string; access: string; prerequisites: string[]; approval: string;
  deliverables: string[]; validation: string; pass: string; fail: string; stop: string; cleanup: string; executed: boolean }
const plan = JSON.parse(match[1]) as { version: string; reviewedHead: string; architectureAcceptance: string;
  phases: Phase[]; stagingAccessAuthorized: boolean; sqlAuthoringAuthorized: boolean; sqlExecutionAuthorized: boolean;
  paidDispatchAuthorized: boolean; activationBlocked: boolean; executionAuthorized: boolean;
  automaticRetryAllowed: boolean; requiresAuthoritativeDatabaseValidation: boolean };
function includes(...requirements: string[]): void {
  for (const requirement of requirements) assert.ok(doc.includes(requirement), `Missing B9 plan requirement: ${requirement}`);
}
function section(start: string, end: string): string {
  const from = doc.indexOf(start), to = doc.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return doc.slice(from, to);
}

test('B9 records B8 baseline and distinguishes provisional direction from every execution approval', () => {
  assert.equal(plan.version, 'staging-implementation-plan-v1');
  assert.equal(plan.reviewedHead, '81c274998b76a37583f24edac17b2f5e293e7c53');
  assert.equal(plan.architectureAcceptance, 'PROVISIONAL_DIRECTION_ONLY');
  for (const key of ['stagingAccessAuthorized', 'sqlAuthoringAuthorized', 'sqlExecutionAuthorized',
    'paidDispatchAuthorized', 'executionAuthorized', 'automaticRetryAllowed'] as const) assert.equal(plan[key], false);
  assert.equal(plan.activationBlocked, true); assert.equal(plan.requiresAuthoritativeDatabaseValidation, true);
  includes('latest relevant commit B8', 'HTTP 503', 'Historical B6–B8 documents remain unchanged',
    'NOT approval of exact DDL', 'No executable migration is created');
});

test('B9 provides six actionable phases with prerequisites approval deliverables procedures and safe cleanup', () => {
  assert.deepEqual(plan.phases.map(phase => phase.id), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
  assert.deepEqual(plan.phases.map(phase => phase.status), ['READY_FOR_APPROVAL', 'BLOCKED', 'BLOCKED',
    'BLOCKED', 'BLOCKED', 'OFFLINE_PREPARATION_AVAILABLE_PAID_BLOCKED']);
  for (const phase of plan.phases) {
    assert.equal(phase.executed, false);
    assert.ok(phase.prerequisites.length >= 2); assert.ok(phase.deliverables.length >= 3);
    for (const key of ['access', 'approval', 'validation', 'pass', 'fail', 'stop', 'cleanup'] as const) {
      assert.ok(phase[key].length > 20, `${phase.id} missing ${key}`);
    }
  }
  includes('READY_FOR_APPROVAL is not permission to connect', 'All live steps are NOT EXECUTED');
});

test('B9 S1 reuses exact bounded metadata templates and excludes concurrency probes and privilege changes', () => {
  const s1 = section('## 2.', '## 3.');
  for (const id of ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M13', 'M14', 'M15', 'M16']) {
    assert.ok(s1.includes(`| ${id} /`), id);
  }
  includes('Q1–Q6/Q8–Q12', 'Q7 live activity/concurrency diagnostics are EXCLUDED',
    'pg_constraint', 'condeferrable/condeferred/convalidated', 'pg_index', 'pg_policy', 'pg_attribute/pg_type',
    'No lifecycle/definer invocation, SET ROLE', 'no credential values', 'Lack of metadata visibility is INACCESSIBLE/UNKNOWN',
    'Do not automatically run M3.6 --preflight/--run');
});

test('B9 S1 preserves staging identity TLS read-only initialization bounded results and no-elevation stops', () => {
  includes('iwqnyqaefovhvnunarfa ONLY', 'reject production fdvnojlojtfiwhtchgdk',
    'aws-0-eu-west-1.pooler.supabase.com:5432', 'TLS verify-full', 'trusted CA/system trust',
    'backend pg_stat_ssl is not that proof', 'BOTH default_transaction_read_only and transaction_read_only on',
    'statement_timeout=30s and lock_timeout=3s', '<=64 role/function-name seeds', '<=512 OIDs',
    'LIMIT 1001', 'recursive depth <=16', 'not broader queries or elevation', 'Existing service_role grants are BASELINE');
});

test('B9 S2 certifies all thirteen fixed vectors independently rather than hashing precomputed TS bytes', () => {
  const vectors = readFileSync('tests/research-canonical-intent.test.ts', 'utf8');
  const names = [...vectors.matchAll(/^  "([a-z]+)": \{/gm)].map(item => item[1]);
  assert.equal(names.length, 13);
  includes(`all 13 vectors: ${names.join(', ')}.`, 'PostgreSQL computes its OWN canonical UTF-8 bytes/hex and SHA-256',
    'do not pass precomputed TypeScript canonical text', 'Compare exact bytes AND lowercase digest',
    'NFC/NFKC preservation', 'negative-zero and JSON lexical/duplicate-key loss',
    'positive generation and reservation_id=request_id', 'NON-MIGRATION standalone certification artifact',
    'no extension install', 'Rollback all scratch work');
});

test('B9 S3 existing-principal feasibility does not create credentials or assume missing registry enforcement', () => {
  const s3 = section('## 4.', '## 5.');
  for (const requirement of ['Existing logins only', 'no CREATE ROLE, password/credential change, grants or new membership',
    'ALREADY APPROVED read-only SECURITY DEFINER probe', 'current_user=expected owner',
    'future registry need not exist', 'post-S5 acceptance', 'Do not call limited identity feasibility authority acceptance',
    'postgres/shared service_role masquerading through SET ROLE', 'Revocation cannot be tested by changing roles/registry in S3']) {
    assert.ok(s3.includes(requirement), requirement);
  }
});

test('B9 authoring dependencies avoid waiving canonical prerequisite or faking post-installation acceptance', () => {
  const author = plan.phases.find(phase => phase.id === 'S4'); assert.ok(author);
  assert.ok(author.prerequisites.some(item => item.includes('S1')));
  assert.ok(author.prerequisites.some(item => item.includes('S2 actual PostgreSQL certificate')));
  assert.ok(author.prerequisites.some(item => item.includes('S3')));
  includes('Do not bypass B6\'s certification prerequisite', 'S3 is split into feasibility before authoring and acceptance after S5',
    'separate future owner-approved provisioning/probe task', 'S3 full post-installation acceptance belongs to S5',
    'Exact D1–D5 DDL/command/lock/financial/deletion contracts approved');
});

test('B9 S4 names unapplied atomic migration and test artifacts without changing existing SQL or harness pins', () => {
  includes('Future artifacts, NOT CREATED', 'supabase/migrations/<approved-next-version>_etsyhunter_m48_durable_research_security.sql',
    'tests/research-durable-security.migration.test.ts', 'tests/research-durable-security.staging.sql',
    'docs/research-durable-security-cutover-runbook.md', 'in this ONE transaction',
    'No role passwords, live credentials or automatic LOGIN provisioning embedded',
    'Missing critical gate -> no migration file', 'Do not change M3.6 allowlists/parity automatically');
});

test('B9 covers all six legacy replacements and denies rollback to unsafe mutation paths', () => {
  const sql = readFileSync('supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql', 'utf8');
  const names = [...sql.matchAll(/CREATE FUNCTION public\.(\w+)\(([\s\S]*?)\)\s*RETURNS JSONB/g)].map(item => item[1]);
  assert.equal(names.length, 6);
  const s4 = section('## 5.', '## 6.');
  for (const name of names) assert.ok(s4.includes(name), name);
  includes('denied reserve_research_job_v2 placeholder', 'first-write ID BEFORE both branches',
    'no settlement/refund', 'No direct old runtime callers', 'never restore unsafe old grants',
    'No database rollback can cancel an external submission');
});

test('B9 S5 requires separate install privilege and race approvals with cleanup and no sender', () => {
  includes('G-INSTALL', 'G-PRIV and G-RACE', 'S5 does not implicitly authorize principal/credential creation',
    'approved narrow replacement grants LAST', 'a later validation error is not permission denial evidence',
    'B5 C01–C12', 'independent sessions with explicit barriers and reverse arrivals',
    'first-finish normal/overrun null/matching/conflicting IDs', 'no automatic retry',
    'Multi-session committed/append-only fixtures require preapproved disposal/retention procedure',
    'not deadlock freedom or exactly-once external execution');
});

test('B9 S6 uses existing provisional calculator without promoting unknown billing or raising caps', () => {
  includes('calculateResearchEconomicsScenario', '120000 microUSD ($0.12) per credit', '33280 input/2048 output',
    'independent one/two total attempts/provider', 'unknown, not zero',
    'never a recommendation simply to increase it', 'Passing a provisional scenario cannot verify prices',
    'Synthetic fixtures cannot become verified marketplace/billing observations',
    'remain BLOCKED rather than run a trial call', 'no paid billing API calls');
});

test('B9 ends with exactly one real next action requesting approval without executing it', () => {
  const final = doc.split('## 9. Recommended next action')[1]?.trim();
  assert.ok(final);
  assert.equal(final.split(/\n\s*\n/).length, 1);
  assert.match(final, /^Request explicit owner approval for ONE bounded S1 metadata-only staging discovery session/);
  assert.match(final, /do not execute the session until that separate approval is given\.$/);
  assert.equal((doc.match(/Recommended next action/g) ?? []).length, 1);
});

test('B9 only describes future artifacts and creates no migration or runtime safety proof', () => {
  const entries = readdirSync('supabase/migrations', { withFileTypes: true });
  assert.ok(entries.every(entry => entry.isFile()));
  assert.deepEqual(entries.map(entry => entry.name).sort(), [
    '20261010_etsyhunter_m1_foundation.sql', '20261011160000_etsyhunter_m1_p1b_security.sql',
    '20261011170000_etsyhunter_m1_existing_users_backfill.sql', '20261011180000_etsyhunter_m15_admin_rbac.sql',
    '20261011200000_etsyhunter_m2_research_lifecycle.sql'
  ].sort());
  assert.doesNotMatch(doc, /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|FUNCTION)\b/i);
  includes('Static tests validate this plan, not database enforcement', 'unrelated work remain unchanged');
});
