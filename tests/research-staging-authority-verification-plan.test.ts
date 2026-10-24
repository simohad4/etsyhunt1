import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Parse documentation data only. Never evaluate SQL/templates or import a harness/client.
const doc = readFileSync('docs/research-staging-authority-verification-plan.md', 'utf8');
const blocks = [...doc.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
assert.equal(blocks.length, 1, 'one structured plan inventory');
interface Check { id: string; stage: string; prerequisites: string[]; coverage: string[]; queries: string[];
  expected: string; evidence: string[]; cleanup: string; initialStatus: string }
interface Plan { schemaVersion: string; execution: Record<string, unknown>; target: Record<string, unknown>;
  stages: { id: string; gates: string[]; fixtures: boolean; writes: boolean }[];
  legacyRpcs: { signature: string; effect: string; currentServiceRoleExecute: boolean; targetDirectCallers: string[]; check: string }[];
  checks: Check[]; failureModes: string[]; decisions: Record<string, string> }
const plan = JSON.parse(blocks[0][1]) as Plan;
const covers = (...items: string[]) => {
  const coverage = new Set(plan.checks.flatMap(check => check.coverage));
  for (const item of items) assert.ok(coverage.has(item), `Missing coverage: ${item}`);
};

test('A6 plan remains offline default-denied and never turns documentation into execution', () => {
  assert.equal(plan.schemaVersion, 'authority-verification-plan-v1');
  assert.deepEqual(plan.execution, { mode: 'offline-plan-only', activationBlocked: true,
    executionAuthorized: false, automaticRetryAllowed: false, databaseAccessAuthorized: false, paidExecutionGoAllowed: false });
  assert.equal(plan.decisions.paidExecution, 'NO-GO');
  assert.equal(plan.decisions.productionAccess, 'NO-GO');
});

test('target is exact staging only with mandatory TLS and no M3.6 allowlist expansion', () => {
  assert.deepEqual(plan.target, { stagingRef: 'iwqnyqaefovhvnunarfa', rejectedProductionRef: 'fdvnojlojtfiwhtchgdk',
    database: 'postgres', sessionHost: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    sslmode: 'verify-full', expandM36Allowlist: false });
  covers('staging_identity', 'production_exclusion', 'tls');
});

test('ordered stages separate read-only approval from fixtures and concurrency/revocation', () => {
  assert.deepEqual(plan.stages, [
    { id: 'metadata', gates: ['G0', 'G1'], fixtures: false, writes: false },
    { id: 'identity', gates: ['G0', 'G1', 'G2'], fixtures: true, writes: true },
    { id: 'concurrency', gates: ['G0', 'G1', 'G2', 'G3'], fixtures: true, writes: true }
  ]);
  assert.equal(plan.decisions.unknownDeployment, 'BLOCKED');
  assert.equal(plan.decisions.missingEvidence, 'BLOCKED');
  assert.equal(plan.decisions.securityMismatch, 'FAIL');
});

test('every unexecuted check has unique ID prerequisites evidence acceptance and explicit cleanup', () => {
  assert.equal(plan.checks.length, 10);
  assert.equal(new Set(plan.checks.map(check => check.id)).size, plan.checks.length);
  for (const check of plan.checks) {
    assert.ok(plan.stages.some(stage => stage.id === check.stage));
    assert.ok(check.prerequisites.length >= 2);
    assert.ok(check.evidence.length > 0);
    assert.ok(check.expected.length > 0);
    assert.equal(check.initialStatus, 'BLOCKED');
    assert.equal(check.cleanup, { metadata: 'read_only_rollback', identity: 'isolated_fixture_cleanup',
      concurrency: 'multi_session_cleanup' }[check.stage]);
    for (const query of check.queries) assert.match(doc, new RegExp(`${query} —`));
  }
});

test('all six exact legacy signatures match actual M2 definitions and target no runtime direct callers', () => {
  const sql = readFileSync('supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql', 'utf8');
  const signatures = [...sql.matchAll(/CREATE FUNCTION public\.(\w+)\(\s*([\s\S]*?)\n\)/g)].map(match => {
    const types = match[2].split(',').map(arg => arg.trim().split(/\s+/)[1].toLowerCase());
    return `${match[1]}(${types.join(',')})`;
  });
  assert.equal(signatures.length, 6);
  assert.deepEqual(plan.legacyRpcs.map(rpc => rpc.signature).sort(), signatures.sort());
  for (const rpc of plan.legacyRpcs) {
    assert.equal(rpc.currentServiceRoleExecute, true);
    assert.deepEqual(rpc.targetDirectCallers, []);
    assert.equal(rpc.check, 'A6-M04');
    assert.ok(rpc.effect.length > 0);
  }
  covers('six_m2_rpcs', 'service_role_bypass', 'alternate_paths', 'atomic_cutover', 'old_rpc_denial');
});

test('identity coverage includes all principals definer context inheritance PUBLIC and indirect privileges', () => {
  covers('dispatcher_identity', 'reconciler_identity', 'billing_identity', 'session_user', 'current_user',
    'definer_identity', 'session_pooling', 'membership', 'inheritance', 'public_defaults', 'effective_execute',
    'cross_principal_denial', 'unknown_revoked_principals', 'registry_protection', 'role_switching', 'helpers', 'overloads');
});

test('revocation plan covers active reused fresh and prepared execution with concurrent identity changes', () => {
  covers('grant_revocation', 'active_sessions', 'pool_reuse', 'reconnect', 'cached_execution',
    'concurrent_role_change', 'replay_after_revocation', 'stale_fences');
});

test('concurrency and financial tests cover holds independent billing closure denial and no duplicate effects', () => {
  covers('competing_claims', 'stale_fences', 'reconciler_dispatcher_race', 'lost_arm_response', 'paused_sender',
    'billing_closure_race', 'late_billing', 'source_dedup', 'legacy_boundary_race', 'deadlock_detection', 'lock_order',
    'mapping_deletion', 'provider_id_immutability', 'uncertain_acceptance', 'incomplete_finance',
    'financial_closure_denied', 'purge_denied', 'audit_evidence', 'pricing_blocks');
  assert.equal(plan.checks.find(check => check.id === 'A6-C03')?.expected, 'no_duplicate_effect_no_financial_release');
});

test('inspection templates are SELECT-only documentation with no lifecycle execution or credential catalog', () => {
  const templates = [...doc.matchAll(/```sql\s*\n([\s\S]*?)\n```/g)].map(match => match[1]);
  assert.equal(templates.length, 7);
  for (const template of templates) {
    assert.match(template, /^SELECT\b/);
    assert.doesNotMatch(template, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|CALL|COPY|GRANT|REVOKE|DO)\b/i);
    assert.doesNotMatch(template, /pg_authid|rolpassword|request\.jwt|\.query\b/i);
    for (const rpc of plan.legacyRpcs) assert.ok(!template.includes(`${rpc.signature.split('(')[0]}(`));
  }
});

test('failure register covers every required deployment and evidence uncertainty', () => {
  assert.deepEqual([...plan.failureModes].sort(), ['collapsed_identity', 'service_role_bypass', 'definer_escalation',
    'unrevoked_legacy', 'incomplete_finance', 'lock_inversion', 'stale_identity', 'missing_audit', 'provider_pricing_unknown'].sort());
});
