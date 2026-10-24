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
  verificationGates: { baseline: Record<string, unknown>; postCutover: Record<string, unknown> };
  expectedInventory: { version: string; repositoryBaseline: string; existingRpcInventory: string; deployedState: string;
    proposed: { id: string; kind: string; name?: string; names?: string[]; repositoryState: string; deployedState: string }[];
    legacyHardening: string[] };
  firstFinishCases: { prerequisites: string[]; branches: string[];
    cases: { stored: string; supplied: string; expected: string }[];
    finishedReplay: string[]; oldSignatureDenialProvesInternalSafety: boolean };
  stages: { id: string; gates: string[]; fixtures: boolean; writes: boolean }[];
  legacyRpcs: { signature: string; effect: string; currentServiceRoleExecute: boolean; targetDirectCallers: string[]; check: string }[];
  checks: Check[]; failureModes: string[]; decisions: Record<string, string> }
const plan = JSON.parse(blocks[0][1]) as Plan;
const covers = (...items: string[]) => {
  const coverage = new Set(plan.checks.flatMap(check => check.coverage));
  for (const item of items) assert.ok(coverage.has(item), `Missing coverage: ${item}`);
};

test('A6 plan remains offline default-denied and never turns documentation into execution', () => {
  assert.equal(plan.schemaVersion, 'authority-verification-plan-v2');
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
    { id: 'acceptance_metadata', gates: ['G0', 'G1', 'G2'], fixtures: false, writes: false },
    { id: 'identity', gates: ['G0', 'G1', 'G2'], fixtures: true, writes: true },
    { id: 'concurrency', gates: ['G0', 'G1', 'G2', 'G3'], fixtures: true, writes: true }
  ]);
  assert.equal(plan.decisions.unknownDeployment, 'BLOCKED');
  assert.equal(plan.decisions.missingEvidence, 'BLOCKED');
  assert.equal(plan.decisions.securityMismatch, 'FAIL');
});

test('every unexecuted check has unique ID prerequisites evidence acceptance and explicit cleanup', () => {
  assert.equal(plan.checks.length, 11);
  assert.equal(new Set(plan.checks.map(check => check.id)).size, plan.checks.length);
  for (const check of plan.checks) {
    assert.ok(plan.stages.some(stage => stage.id === check.stage));
    assert.ok(check.prerequisites.length >= 2);
    assert.ok(check.evidence.length > 0);
    assert.ok(check.expected.length > 0);
    assert.equal(check.initialStatus, 'BLOCKED');
    assert.equal(check.cleanup, { metadata: 'read_only_rollback', acceptance_metadata: 'read_only_rollback', identity: 'isolated_fixture_cleanup',
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
  assert.equal(templates.length, 12);
  assert.equal([...doc.matchAll(/\*\*NOT EXECUTED — FUTURE APPROVAL REQUIRED\*\*\s*```sql/g)].length, templates.length);
  for (const template of templates) {
    assert.match(template, /^(?:SELECT\b|WITH RECURSIVE\b)/);
    // Privilege names such as 'UPDATE' are data, not statements. This is a lexical
    // documentation guard, not a SQL parser or safety certification.
    const structure = template.replace(/'(?:[^']|'')*'/g, "''");
    assert.doesNotMatch(structure, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|CALL|COPY|GRANT|REVOKE|DO)\b/i);
    assert.equal((structure.match(/;/g) ?? []).length, 1);
    assert.doesNotMatch(template, /pg_authid|rolpassword|request\.jwt|\.query\b/i);
    for (const rpc of plan.legacyRpcs) assert.ok(!template.includes(`${rpc.signature.split('(')[0]}(`));
  }
});

test('baseline observations do not demand post-cutover guarantees or claim authority acceptance', () => {
  assert.deepEqual(plan.verificationGates.baseline, { requiresImplementedControls: false, serviceRoleGrants: 'observe',
    missingProposedObjects: 'record_missing_or_unknown', authorityAcceptance: false, writes: false });
  const baseline = plan.checks.filter(check => check.stage === 'metadata');
  assert.ok(baseline.length > 0);
  for (const check of baseline) {
    assert.notEqual(check.expected, 'legacy_direct_execute_denied');
    assert.ok(!check.prerequisites.includes('approved_cutover_manifest'));
  }
  assert.equal(baseline.find(check => check.id === 'A6-M04')?.expected, 'record_legacy_grants_as_baseline');
});

test('post-cutover gate requires implemented controls distinct principals and separate acceptance approval', () => {
  assert.deepEqual(plan.verificationGates.postCutover, { requiresImplementedControls: true,
    requiresProvisionedPrincipals: true, requiresSeparateApproval: true, legacyBypass: 'deny', initialStatus: 'BLOCKED' });
  const acceptance = plan.checks.find(check => check.id === 'A8-P01')!;
  assert.equal(acceptance.stage, 'acceptance_metadata');
  assert.equal(acceptance.expected, 'legacy_direct_execute_denied');
  assert.deepEqual(acceptance.prerequisites, ['implemented_approved_controls', 'provisioned_distinct_principals',
    'approved_cutover_manifest', 'approved_registry_and_admission']);
  assert.ok(plan.checks.find(check => check.id === 'A6-I01')?.prerequisites.includes('acceptance_metadata_pass'));
});

test('versioned inventory separates repository facts from proposed and unknown deployed objects', () => {
  const inventory = plan.expectedInventory;
  assert.equal(inventory.version, 'authority-objects-v1');
  assert.equal(inventory.repositoryBaseline, '9fbebd3');
  assert.equal(inventory.existingRpcInventory, 'legacyRpcs');
  assert.equal(inventory.deployedState, 'UNKNOWN');
  assert.deepEqual(inventory.proposed.map(object => object.id).sort(), ['dispatcher', 'reconciler', 'billing',
    'authority_registry', 'attempt_admission', 'dispatch_controls', 'reconciliation_controls', 'billing_controls'].sort());
  for (const object of inventory.proposed) {
    assert.equal(object.deployedState, 'UNKNOWN');
    assert.ok(['proposed', 'contract_missing'].includes(object.repositoryState));
    if (object.kind !== 'rpc_group') assert.equal(object.name, 'UNASSIGNED');
  }
  assert.equal(inventory.proposed.find(object => object.id === 'attempt_admission')?.repositoryState, 'contract_missing');
  assert.equal(inventory.proposed.flatMap(object => object.names ?? []).length, 8);
  assert.equal(inventory.legacyHardening.length, plan.legacyRpcs.length);
});

test('metadata coverage includes recursive reachability alternate schemas all mutation levels and missing visibility', () => {
  covers('recursive_reachability', 'admin_set_inherit', 'alternate_schemas', 'schema_mutation', 'table_mutation',
    'column_mutation', 'triggers', 'dependencies', 'missing_objects', 'inaccessible_metadata');
  const templates = [...doc.matchAll(/```sql\s*\n([\s\S]*?)\n```/g)].map(match => match[1]);
  const membership = templates[2];
  assert.match(membership, /^WITH RECURSIVE/);
  for (const field of ['admin_option', 'inherit_option', 'set_option', 'set_path', 'inherit_path', 'depth_limited']) {
    assert.ok(membership.includes(field));
  }
  assert.match(membership, /w\.depth < 16/);
  assert.doesNotMatch(templates[3], /n\.nspname\s*=\s*'public'/);
  for (const catalog of ['pg_namespace', 'pg_class', 'pg_attribute', 'pg_trigger', 'pg_depend']) {
    assert.ok(templates.some(template => template.includes(catalog)), catalog);
  }
  assert.ok(templates.some(template => template.includes('has_schema_privilege')));
  assert.ok(templates.some(template => template.includes('has_table_privilege')));
  assert.ok(templates.some(template => template.includes('has_column_privilege')));
  for (const template of templates.slice(1).filter((_, i) => i !== 3)) assert.match(template, /LIMIT 1001/);
});

test('missing and inaccessible objects never become fabricated deployed authority or a passing acceptance result', () => {
  assert.equal(plan.decisions.unknownDeployment, 'BLOCKED');
  assert.match(doc, /INACCESSIBLE\/UNKNOWN/);
  assert.match(doc, /TRUNCATED\/BLOCKED/);
  assert.match(doc, /DEPTH_LIMIT\/BLOCKED/);
  assert.match(doc, /UNASSIGNED proposed names are UNKNOWN\/name-unresolved/);
  assert.match(doc, /pg_depend does NOT enumerate every PL\/pgSQL/);
  assert.match(doc, /under Gate 2 they are BLOCKED/);
});

test('first-finish specification covers both branches matching conflicting null and first-write IDs', () => {
  const identity = plan.firstFinishCases;
  assert.deepEqual(identity.branches, ['normal', 'overrun']);
  assert.deepEqual(identity.cases, [
    { stored: 'null', supplied: 'A', expected: 'bind_first_write' },
    { stored: 'A', supplied: 'A', expected: 'retain_A' },
    { stored: 'A', supplied: 'B', expected: 'reject_preserve_A' },
    { stored: 'A', supplied: 'null', expected: 'retain_A' },
    { stored: 'null', supplied: 'null', expected: 'block_success_keep_acceptance_unresolved' }
  ]);
  assert.equal(identity.oldSignatureDenialProvesInternalSafety, false);
  assert.ok(identity.prerequisites.includes('approved_replacement_or_internal_test_boundary'));
  assert.ok(identity.prerequisites.includes('Gate2_approval'));
  assert.deepEqual(identity.finishedReplay, ['identical_no_second_effect', 'changed_id_rejected',
    'null_retains_binding', 'changed_outcome_or_usage_rejected']);
});

test('failure register covers every required deployment and evidence uncertainty', () => {
  assert.deepEqual([...plan.failureModes].sort(), ['collapsed_identity', 'service_role_bypass', 'definer_escalation',
    'unrevoked_legacy', 'incomplete_finance', 'lock_inversion', 'stale_identity', 'missing_audit', 'provider_pricing_unknown'].sort());
});
