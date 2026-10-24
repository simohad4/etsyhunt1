import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

// Static source/document coverage only: no database engine, harness execution or transport imports.
const doc = readFileSync('docs/research-security-blocker-resolution.md', 'utf8');
const b6 = readFileSync('docs/research-durable-sql-feasibility.md', 'utf8');
const sql = readFileSync('supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql', 'utf8');
const foundation = readFileSync('supabase/migrations/20261010_etsyhunter_m1_foundation.sql', 'utf8');
const p1b = readFileSync('supabase/migrations/20261011160000_etsyhunter_m1_p1b_security.sql', 'utf8');
const admin = readFileSync('supabase/migrations/20261011180000_etsyhunter_m15_admin_rbac.sql', 'utf8');
function jsonBlock(text: string) {
  const match = /```json\s*([\s\S]*?)```/.exec(text);
  assert.ok(match, 'Missing static decision inventory');
  return JSON.parse(match[1]);
}
interface Blocker { id: string; status: string; severity: string; evidence: string[];
  missing: string; next: string; owner: string; blocks: string }
const review = jsonBlock(doc) as { version: string; reviewedHead: string; blockers: Blocker[];
  sqlAuthoringAllowed: boolean; stagingExecutionAllowed: boolean; paidDispatchAllowed: boolean;
  activationBlocked: boolean; executionAuthorized: boolean; automaticRetryAllowed: boolean;
  requiresAuthoritativeDatabaseValidation: boolean; runtimeEnforcementVerified: boolean };
const baseline = jsonBlock(b6) as { gates: { id: string; status: string }[] };
function includes(...requirements: string[]) {
  for (const requirement of requirements) assert.ok(doc.includes(requirement), `Missing B7 requirement: ${requirement}`);
}

test('B7 records the B6 baseline and cannot promote documentation into execution authority', () => {
  assert.equal(review.version, 'security-blocker-resolution-v1');
  assert.equal(review.reviewedHead, '51c36d478245d8c2c0b85f93e355daa95d476e5f');
  for (const field of ['sqlAuthoringAllowed', 'stagingExecutionAllowed', 'paidDispatchAllowed',
    'executionAuthorized', 'automaticRetryAllowed', 'runtimeEnforcementVerified'] as const) assert.equal(review[field], false);
  assert.equal(review.activationBlocked, true); assert.equal(review.requiresAuthoritativeDatabaseValidation, true);
  includes('Latest commit is the B6 feasibility commit', 'authenticated HTTP 503 unchanged',
    'No complete B6 gate is resolved offline', 'passing static test cannot resolve');
});

test('B7 covers every actual B6 gate without silently upgrading status and supplies owners and next evidence', () => {
  assert.deepEqual(review.blockers.map(row => row.id), baseline.gates.map(row => row.id));
  assert.equal(new Set(review.blockers.map(row => row.id)).size, 8);
  for (const [index, blocker] of review.blockers.entries()) {
    assert.equal(blocker.status, baseline.gates[index].status);
    assert.ok(['CRITICAL', 'HIGH', 'MEDIUM'].includes(blocker.severity));
    assert.ok(blocker.evidence.length >= 2);
    for (const field of ['missing', 'next', 'owner']) assert.ok(blocker[field as keyof Blocker].length > 20);
    assert.equal(blocker.blocks, 'ALL_THREE');
  }
  assert.equal(review.blockers.filter(row => row.status === 'BLOCKED').length, 4);
  assert.equal(review.blockers.filter(row => row.status === 'PROPOSED').length, 4);
  for (let i = 1; i <= 8; i++) assert.ok(doc.includes(`| R${String(i).padStart(2, '0')} `));
  includes('RESOLVED fact IDs R01–R08 are distinct', 'not deployed observations');
});

test('B7 deletion findings follow actual cascade and restrictive FKs without claiming unconditional deletion', () => {
  assert.match(foundation, /user_id UUID NOT NULL UNIQUE REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  assert.match(p1b, /user_id UUID NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  assert.match(sql, /REFERENCES public\.research_jobs\(request_id, user_id\) ON DELETE CASCADE/);
  assert.match(admin, /granted_by UUID NOT NULL REFERENCES auth\.users\(id\) ON DELETE RESTRICT/);
  assert.match(admin, /invited_by UUID NOT NULL REFERENCES auth\.users\(id\) ON DELETE RESTRICT/);
  includes('If an Auth deletion commits', 'does NOT prove the whole deletion will succeed',
    'No inspected existing account-specific parent is safe', 'global rows disappear',
    'admin_audit_logs', 'not a financial subject or billing ledger', 'bounded source search');
});

test('B7 retained subject and guard proposal has keys parents immutable scope and explicit deletion blockers', () => {
  includes('research_accounting_subjects', 'accounting_subject_id UUID primary key',
    'No FK to Auth, subscription, credit account, M2 job or attempt', 'Never reuse/rebind a retired subject',
    'research_accounting_auth_links', 'auth_user_id UUID primary key', 'UUID UNIQUE NOT NULL',
    'retained subject ON DELETE RESTRICT', 'AU0 must preexist', 'no lazy guard creation',
    'AS serializes absent mapping MP', 'Exact detached-scope schema is BLOCKED',
    'MUST NOT perform Auth cascades', 'legal holds are UNKNOWN/BLOCKED', 'Pseudonymization is not anonymization');
});

test('B7 known lock inventory covers every research path and implicit external mutation category', () => {
  for (const name of ['reserve_research_job', 'begin_research_provider_attempt', 'finish_research_provider_attempt',
    'mark_research_job_ambiguous', 'complete_research_job', 'fail_research_job', 'reserve_research_credits',
    'finalize_research_credits', 'consume_research_credits', 'handle_new_user_signup',
    'touch_user_profile_updated_at', 'enforce_saved_listing_quota', 'prevent_admin_audit_log_mutation']) includes(name);
  includes('FOR UPDATE except pricing FOR SHARE', 'FK/unique-index dependencies',
    'Not every non-key UPDATE necessarily reacquires every FK lock', 'unique indexes',
    'helper/default/check/trigger/unique-index edges', 'pg_depend misses dynamic/string-body edges',
    'Actual FK lock modes, cascade traversal and deployed writers remain UNKNOWN');
});

test('B7 retains proposed lock order and forbids claiming concurrency or retry guarantees', () => {
  includes('AU0→AU→AS→MP→R→J→S→P→A→I→D→G→U→LG→LA→WG→WA→B→O→C→E',
    'FOR SHARE', 'transaction-scoped exclusive advisory', 'one subject/request',
    'no lock is claimed on a nonexistent row', 'not implemented or proven',
    'Independent-session staging tests', 'both arrival orders', 'B5 C01–C12',
    'No deadlock freedom claim', 'Automatic retries stay disabled', 'Lost arm/commit');
});

test('B7 compares LOGIN and broker authority without collapsing caller and definer identity', () => {
  includes('Primary, PROPOSED: distinct PostgreSQL LOGIN', 'Fallback, PROPOSED: protected internal broker',
    'session_user resolves protected registry', 'current_user becomes owner in SECURITY DEFINER',
    'SET ROLE or mutable GUCs are not authentication', 'Database session_user identifies broker, NOT originating workload',
    'INHERIT TRUE, SET FALSE, ADMIN FALSE', 'transaction pooling not approved',
    'no shared service_role or migration credential', 'No new roles/credentials are created or inspected');
});

test('B7 privilege and revocation plan preserves definer protections exact grants and held liabilities', () => {
  includes('search_path=pg_catalog', 'schema-qualified objects', 'default PUBLIC EXECUTE',
    'grant exact approved signatures only', 'Recheck capability, credential generation, scope and revocation',
    'EVERY transaction and replay', 'AU SHARE held through commit', 'AU UPDATE revocation',
    'Password rotation/NOLOGIN alone', 'without clearing arm/liabilities', 'closure/purge denied');
});

test('B7 individually covers actual six signatures grants proposed ownership and atomic denial', () => {
  const definitions = [...sql.matchAll(/CREATE FUNCTION public\.(\w+)\(([\s\S]*?)\)\s*RETURNS JSONB/g)];
  assert.equal(definitions.length, 6);
  for (const [, name, args] of definitions) {
    const types = args.split(',').map(arg => arg.trim().split(/\s+/)[1].toLowerCase());
    includes(`${name}(${types.join(',')})`);
    assert.ok(sql.includes(`GRANT EXECUTE ON FUNCTION public.${name}(`));
  }
  includes('Every row currently grants service_role EXECUTE', 'All six OLD external signatures',
    'Separate authenticated customer-reservation gateway', 'Narrow Dispatcher observation reporting',
    'Reconciler execution-publication proposal', 'refund is a separately approved financial operation',
    'In ONE reviewed migration transaction', 'quiesce callers and drain old transactions',
    'Atomicity remains BLOCKED', 'No wrapper may coexist with a callable unsafe original');
});

test('B7 first-finish and financial rules cannot infer zero liability from failure or estimates', () => {
  assert.equal([...sql.matchAll(/provider_attempt_id = COALESCE\(p_provider_attempt_id, provider_attempt_id\)/g)].length, 2);
  includes('BOTH first-finish branches', 'maximum two attempts/provider is economic reserve',
    'No refund if original generation expired', 'reported-or-estimated', '120000 microUSD ($0.12) per credit',
    'Missing costs UNKNOWN, never zero', 'No complete/fail/reconcile/adjust/delete/rollover operation may release unknown liability',
    'late charges reopen pending finance', 'Financial closure/liability release and historical purge denied');
});

test('B7 authenticated billing evidence is separated from synthetic flags coverage assumptions and duplicate charges', () => {
  includes('authenticated Billing ingress/evidence access', 'independently verified source identity',
    'semantic event identity and evidence digest', 'authoritative=true is not verification',
    'No specific billing API, price, retention duration or provider idempotency API is assumed',
    'Event-vs-invoice overlap must not double count', 'correction events bind a recognized baseline',
    'Unsupported partial/pooled/overlapping/unattributable coverage stays held');
});

test('B7 PostgreSQL protocol covers every fixed vector and cannot certify from TypeScript/Python or text coverage', () => {
  const vectors = readFileSync('tests/research-canonical-intent.test.ts', 'utf8');
  const names = [...vectors.matchAll(/^  "([a-z]+)": \{/gm)].map(match => match[1]);
  assert.equal(names.length, 13);
  includes(`ALL 13 named vectors: ${names.join(', ')}.`);
  includes('exact UTF-8 byte sequence/hex AND lowercase SHA-256', 'submission-intent-v1 versus dispatch-operation-v1',
    'NFC/NFKC', 'lone surrogates/U+0000/malformed UTF-8', 'Duplicate JSON keys must reject before jsonb',
    'negative-zero/exponent lexical handling', 'every B4 rejection test',
    'NOT PostgreSQL results', 'Certification remains BLOCKED until actual approved results exist');
});

test('B7 preserves M3.6 and two-gate staging approval separation without executing a harness', () => {
  const harness = readFileSync('tests/research-staging.integration.mjs', 'utf8');
  assert.ok(harness.includes("if (mode === '--static') return { mode };"));
  assert.ok(harness.includes("PGSSLMODE: 'verify-full'"));
  assert.ok(harness.includes('ETSYHUNTER_M36_STAGING_RUN_CONFIRM'));
  includes('not the entire deployed database', 'No staging task is performed or authorized here',
    'NOT Gate 2 authority acceptance', 'M3.6 allowlist/parity', 'No existing SQL');
});

test('B7 introduces no executable migration and keeps static coverage distinct from runtime enforcement', () => {
  const entries = readdirSync('supabase/migrations', { withFileTypes: true });
  assert.ok(entries.every(entry => entry.isFile()));
  assert.deepEqual(entries.map(entry => entry.name).sort(), [
    '20261010_etsyhunter_m1_foundation.sql', '20261011160000_etsyhunter_m1_p1b_security.sql',
    '20261011170000_etsyhunter_m1_existing_users_backfill.sql', '20261011180000_etsyhunter_m15_admin_rbac.sql',
    '20261011200000_etsyhunter_m2_research_lifecycle.sql'
  ].sort());
  assert.doesNotMatch(doc, /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|FUNCTION)\b/i);
  includes('do not simulate PostgreSQL locks', 'unrelated work is preserved', 'runner adds one import only');
});
