import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

// Offline documentation/source inspection only; never import a database/transport harness.
const doc = readFileSync('docs/research-durable-sql-feasibility.md', 'utf8');
const migration = readFileSync('supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql', 'utf8');
const manifest = /```json\s*([\s\S]*?)```/.exec(doc);
assert.ok(manifest);
const decision = JSON.parse(manifest[1]) as { version: string; reviewedHead: string; decision: string;
  sqlAuthoringAllowed: boolean; migrationCreated: boolean; gates: { id: string; status: string; topic: string }[];
  activationBlocked: boolean; executionAuthorized: boolean; automaticRetryAllowed: boolean;
  requiresAuthoritativeDatabaseValidation: boolean };
function includes(...requirements: string[]): void {
  for (const requirement of requirements) assert.ok(doc.includes(requirement), `Missing B6 decision requirement: ${requirement}`);
}

test('B6 mandatory gate blocks SQL authoring when any critical decision is unresolved', () => {
  assert.equal(decision.version, 'durable-sql-feasibility-v1');
  assert.equal(decision.reviewedHead, '89f73871cd89a14ec7928a2a23db94ec187934e7');
  assert.equal(decision.decision, 'BLOCKED_FOR_SQL_AUTHORING');
  assert.equal(decision.sqlAuthoringAllowed, false); assert.equal(decision.migrationCreated, false);
  assert.equal(decision.gates.length, 8);
  assert.equal(decision.gates.every(gate => gate.status === 'RESOLVED'), decision.sqlAuthoringAllowed);
  assert.equal(new Set(decision.gates.map(gate => gate.topic)).size, 8);
  decision.gates.forEach((gate, i) => {
    assert.equal(gate.id, `F${String(i + 1).padStart(2, '0')}`);
    assert.ok(['RESOLVED', 'PROPOSED', 'BLOCKED'].includes(gate.status));
    assert.ok(doc.includes(`| ${gate.id} `));
  });
  includes('either PROPOSED or BLOCKED forbids executable SQL', 'Approval of a documentation task does not approve');
});

test('B6 creates no migration and leaves the inspected five-entry migration inventory intact', () => {
  const entries = readdirSync('supabase/migrations', { withFileTypes: true });
  assert.ok(entries.every(entry => entry.isFile()), 'New migration subdirectory requires review');
  assert.deepEqual(entries.map(entry => entry.name).sort(), [
    '20261010_etsyhunter_m1_foundation.sql',
    '20261011160000_etsyhunter_m1_p1b_security.sql',
    '20261011170000_etsyhunter_m1_existing_users_backfill.sql',
    '20261011180000_etsyhunter_m15_admin_rbac.sql',
    '20261011200000_etsyhunter_m2_research_lifecycle.sql'
  ].sort());
  assert.doesNotMatch(doc, /CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|TABLE)\b/i);
  includes('No executable migration was created', 'neither parses PostgreSQL nor proves body immutability');
});

test('B6 covers all eight mandatory architectural topics with concrete unresolved evidence', () => {
  assert.deepEqual(decision.gates.map(gate => gate.topic), ['guard_subject_deletion', 'global_explicit_implicit_locks',
    'authenticated_authority_grants', 'atomic_legacy_cutover', 'immutable_intent_provider_identity',
    'financial_holds_billing_retention', 'postgresql_canonical_certification', 'staging_only_validation']);
  includes('detached request scope', 'full Auth-cascade transfer', 'current_user in SECURITY DEFINER',
    'first-write external ID checks before BOTH finish branches', 'Missing charges UNKNOWN, never zero',
    'Financial closure/liability release and historical purge remain denied', '13 fixed independently generated Python vectors');
});

test('B6 documents all six actual M2 signatures and existing service-role grants without altering SQL', () => {
  const signatures = [
    'reserve_research_job(uuid,uuid,text,integer,integer,text,text,text,text)',
    'begin_research_provider_attempt(uuid,uuid,uuid,text,text,integer,text)',
    'finish_research_provider_attempt(uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,text)',
    'mark_research_job_ambiguous(uuid,uuid,text)',
    'complete_research_job(uuid,uuid,uuid,uuid,text,jsonb,integer,timestamptz,text,jsonb,text,timestamptz)',
    'fail_research_job(uuid,uuid,text)'
  ];
  for (const signature of signatures) {
    includes(signature);
    const name = signature.slice(0, signature.indexOf('('));
    assert.ok(migration.includes(`CREATE FUNCTION public.${name}(`));
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${escaped}\\([\\s\\S]*?\\)\\s+TO service_role;`));
  }
  includes('No mixed unsafe old/new mutation window', 'immutable protocol version',
    '1522/1563', 'null→A, A→A, A→B, A→null, null→null', 'changed-operation conflicts');
});

test('B6 explicit and implicit lock evidence is distinguished from an approved global order', () => {
  includes('J→A versus A→J', 'B→financial guards', 'O→B', 'Same-request advisory R mitigates',
    'FK key-share checks', 'unique-index waits', 'trigger/default/check-function dependencies',
    'subscription/credit resets', 'signup/backfill', 'saved quota locks',
    'pg_depend alone cannot enumerate dynamic SQL/string-body calls',
    'NOT a complete deployed implicit-lock graph', 'one reconciled schema-specific graph', 'PROPOSED');
});

test('B6 preserves M3.6 isolation and separates baseline metadata from authority acceptance', () => {
  const harness = readFileSync('tests/research-staging.integration.mjs', 'utf8');
  assert.ok(harness.includes("if (mode === '--static') return { mode };"));
  assert.ok(harness.includes('ETSYHUNTER_M36_STAGING_RUN_CONFIRM'));
  assert.ok(harness.includes("PGSSLMODE: 'verify-full'"));
  assert.ok(harness.includes('SET SESSION default_transaction_read_only = on;'));
  includes('default-denied --run', 'Do not widen allowlists, weaken parity, auto-accept new hashes',
    'Gate 1 bounded metadata discovery', 'Gate 2 needs implemented approved controls',
    'M3.6 PASS as M4.8 authority PASS', 'rollback cannot undo external side effects');
});

test('B6 canonical and staging certification prerequisites cannot be inferred from offline success', () => {
  includes('PostgreSQL certification has an explicit sequencing blocker', 'no approved standalone SQL certification artifact',
    'Independent TypeScript/Python vector agreement is insufficient', 'exact bytes',
    'Independent-session', 'both arrival orders', 'cleanup', 'No automatic retries');
  // Source facts are inspected without executing either simulator or canonicalizer.
  const canonical = readFileSync('src/server/researchCanonicalIntent.ts', 'utf8');
  const protocol = readFileSync('src/server/researchDispatchProtocol.ts', 'utf8');
  assert.ok(canonical.includes("'dispatch-canonical-v1'"));
  assert.ok(protocol.includes('executionAuthorized: false'));
});

test('B6 does not promote findings to activation financial closure or runtime guarantees', () => {
  assert.equal(decision.activationBlocked, true); assert.equal(decision.executionAuthorized, false);
  assert.equal(decision.automaticRetryAllowed, false); assert.equal(decision.requiresAuthoritativeDatabaseValidation, true);
  includes('Authenticated HTTP 503', 'cap $0.12/credit unchanged', 'No SQL execution',
    'not transactional safety or deployed parity', 'CRITICAL blockers', 'HIGH blockers',
    'No provider/HTTP calls in fixtures', 'separate decisions');
});
