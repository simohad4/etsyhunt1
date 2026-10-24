import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  planResearchExecution, describeResearchTransition, RESEARCH_JOB_STATUSES,
  type ResearchJobStatus, type ResearchLifecycleRpc, type OfflineResearchPlan
} from '../src/server/researchExecutionPlan';

const reservation = { success: true, idempotent: false, status: 'reserved',
  credits_reserved: 1, credits_remaining: 19, provider_budget_reserved_micro_usd: 50000 };
const replay = (status: ResearchJobStatus) => ({ ...reservation, status, idempotent: true,
  success: status !== 'failed' && status !== 'rejected' });
const observe = (response: unknown) => planResearchExecution({ kind: 'reservation_response', response });
const snapshot = (status: ResearchJobStatus) => planResearchExecution({ kind: 'job_snapshot', status });
function inert(value: { executionAuthorized: false; automaticRetryAllowed: false; requiresAuthoritativeDatabaseValidation: true }) {
  assert.equal(value.executionAuthorized, false);
  assert.equal(value.automaticRetryAllowed, false);
  assert.equal(value.requiresAuthoritativeDatabaseValidation, true);
  assert.ok(Object.isFrozen(value));
}

test('M4.1 preserves all eleven M2 job statuses without modifying existing reservation parsing', () => {
  const sql = readFileSync('supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql', 'utf8');
  const jobTable = sql.split('CREATE TABLE public.research_jobs (')[1].split('CREATE INDEX research_jobs_user_created_idx')[0];
  const check = jobTable.split("status TEXT NOT NULL CHECK (")[1].split('failure_category TEXT')[0];
  assert.deepEqual([...check.matchAll(/'([a-z_]+)'/g)].map(m => m[1]), [...RESEARCH_JOB_STATUSES]);
  assert.ok(Object.isFrozen(RESEARCH_JOB_STATUSES));
});

const expected = {
  reserved: ['existing_reservation', 'inspect_existing_job_and_attempts'],
  apify_running: ['processing', 'reconcile_in_flight_attempt'],
  apify_complete: ['stage_complete', 'attempt_admission_review'],
  apify_failed: ['stage_failed', 'definitive_failure_or_retry_review'],
  openrouter_running: ['processing', 'reconcile_in_flight_attempt'],
  openrouter_complete: ['stage_complete', 'completion_evidence_review'],
  openrouter_failed: ['stage_failed', 'definitive_failure_or_retry_review'],
  ambiguous: ['ambiguous', 'audited_reconciliation'],
  succeeded: ['terminal', 'none'], failed: ['terminal', 'none'], rejected: ['terminal', 'none']
} as const;
for (const status of RESEARCH_JOB_STATUSES) {
  test(`M4.1 snapshot and reservation replay preserve ${status} and never permit provider execution`, () => {
    for (const result of [snapshot(status), observe(replay(status))]) {
      assert.equal(result.databaseStatus, status);
      assert.equal(result.classification, expected[status][0]);
      assert.equal(result.review, expected[status][1]);
      inert(result);
    }
  });
}
test('M4.1 a new reservation proposes admission review only; a duplicate never becomes new work', () => {
  const result = observe(reservation);
  assert.equal(result.classification, 'new_reservation');
  assert.equal(result.review, 'attempt_admission_review');
  inert(result);
  for (let i=0;i<3;i++) assert.equal(observe(replay('reserved')).review, 'inspect_existing_job_and_attempts');
  assert.ok(Object.isFrozen(result.providerPrerequisites));
  for (const prerequisite of ['authenticated_owner_and_request_binding','verified_effective_provider_pricing',
    'authoritative_database_attempt_admission','current_credit_and_budget_checks','exclusive_durable_execution_claim',
    'no_unreconciled_unknown_outcome']) assert.ok(result.providerPrerequisites.includes(prerequisite as never));
});
test('M4.1 a new rejected reservation is terminal and does not imply a refund', () => {
  const result = observe({ success: false, idempotent: false, status: 'rejected', required: 1, credits_remaining: 0 });
  assert.equal(result.databaseStatus, 'rejected');
  assert.equal(result.review, 'none');
  inert(result);
});
test('M4.1 unknown transport retains only a last-known status and requires reconciliation even after apparent success', () => {
  for (const lastKnownStatus of [undefined, ...RESEARCH_JOB_STATUSES]) {
    const result = planResearchExecution({ kind: 'transport_unknown', lastKnownStatus });
    assert.equal(result.classification, 'transport_unknown');
    assert.equal(result.databaseStatus, lastKnownStatus ?? null);
    assert.equal(result.review, 'audited_reconciliation');
    inert(result);
  }
});
test('M4.1 database errors remain blocked without exposing raw error details', () => {
  const result = planResearchExecution({ kind: 'database_error' });
  assert.equal(result.classification, 'database_error');
  inert(result);
  const invalid = planResearchExecution({ kind: 'database_error', error: 'secret database details' });
  assert.doesNotMatch(JSON.stringify(invalid), /secret/);
  assert.equal(invalid.classification, 'invalid_observation');
});
test('M4.1 malformed reservations fail closed instead of becoming another reservation or refund', () => {
  const malformed: unknown[] = [null, [], {}, 'reserved',
    { success: true, status: 'reserved' }, { ...reservation, success: false }, { ...reservation, idempotent: 'false' },
    { ...reservation, credits_reserved: 0 }, { ...reservation, credits_reserved: 4 },
    { ...reservation, credits_remaining: -1 }, { ...reservation, provider_budget_reserved_micro_usd: NaN },
    { ...reservation, provider_budget_reserved_micro_usd: Number.MAX_SAFE_INTEGER + 1 },
    { ...reservation, status: 'started' }, { ...reservation, status: 'committed' }, { ...reservation, status: 'unknown' },
    { ...replay('succeeded'), success: false }, { ...replay('apify_running'), success: false },
    { ...replay('apify_failed'), success: false }, { ...replay('openrouter_failed'), idempotent: false },
    { ...replay('ambiguous'), success: false }, { ...replay('failed'), success: true },
    { ...replay('reserved'), credits_reserved: null }, { ...replay('reserved'), provider_budget_reserved_micro_usd: undefined },
    { ...reservation, executeProvider: true }, { ...reservation, status: 'succeeded' }];
  for (const value of malformed) {
    const result = observe(value);
    assert.equal(result.classification, 'invalid_observation');
    assert.equal(result.review, 'audited_reconciliation');
    inert(result);
  }
});
test('M4.1 invalid observations, fake admissions, and accessors cannot authorize work or leak input', () => {
  let getterCalls = 0;
  const accessor = Object.defineProperty({}, 'kind', { get() { getterCalls++; return 'job_snapshot'; } });
  for (const input of [undefined, null, [], {}, accessor, { kind: 'attempt_admitted', executeProvider: true },
    { kind: 'job_snapshot', status: 'unknown' }, { kind: 'transport_unknown', lastKnownStatus: 'unknown' },
    { kind: 'job_snapshot', status: 'reserved', verifiedPricing: true }]) {
    const result = planResearchExecution(input);
    assert.equal(result.classification, 'invalid_observation');
    inert(result);
  }
  assert.equal(getterCalls, 0);
});

const rpcNames: ResearchLifecycleRpc[] = ['reserve_research_job','begin_research_provider_attempt',
  'finish_research_provider_attempt','mark_research_job_ambiguous','complete_research_job','fail_research_job'];
const edges: ReadonlyArray<readonly [ResearchLifecycleRpc, ResearchJobStatus | null, ResearchJobStatus]> = [
  ['reserve_research_job',null,'reserved'], ['reserve_research_job',null,'rejected'],
  ['begin_research_provider_attempt','reserved','apify_running'],
  ['begin_research_provider_attempt','apify_failed','apify_running'],
  ['begin_research_provider_attempt','apify_complete','openrouter_running'],
  ['begin_research_provider_attempt','openrouter_failed','openrouter_running'],
  ['finish_research_provider_attempt','apify_running','apify_complete'],
  ['finish_research_provider_attempt','apify_running','apify_failed'],
  ['finish_research_provider_attempt','apify_running','ambiguous'],
  ['finish_research_provider_attempt','openrouter_running','openrouter_complete'],
  ['finish_research_provider_attempt','openrouter_running','openrouter_failed'],
  ['finish_research_provider_attempt','openrouter_running','ambiguous'],
  ['complete_research_job','openrouter_complete','succeeded'],
  ...(['reserved','apify_running','apify_complete','apify_failed','openrouter_running','openrouter_complete','openrouter_failed'] as const)
    .map(s => ['mark_research_job_ambiguous',s,'ambiguous'] as const),
  ...(['reserved','apify_complete','apify_failed','openrouter_complete','openrouter_failed'] as const)
    .map(s => ['fail_research_job',s,'failed'] as const)
];
test('M4.1 exhaustive fresh-transition matrix blocks every edge outside the conservative M2 contract', () => {
  for (const rpc of rpcNames) for (const from of [null, ...RESEARCH_JOB_STATUSES]) for (const to of RESEARCH_JOB_STATUSES) {
    const result = describeResearchTransition({ rpc, from, to, replay: false });
    const candidate = edges.some(e => e[0]===rpc && e[1]===from && e[2]===to);
    assert.equal(result.assessment, candidate ? 'candidate' : 'blocked', `${rpc}: ${from} -> ${to}`);
    inert(result);
  }
});
test('M4.1 duplicates cannot advance state; ambiguity remains blocked for every RPC', () => {
  for (const rpc of rpcNames) for (const from of RESEARCH_JOB_STATUSES) for (const to of RESEARCH_JOB_STATUSES) {
    const result = describeResearchTransition({ rpc, from, to, replay: true });
    if (from !== to || from === 'ambiguous') assert.equal(result.assessment, 'blocked');
    else assert.notEqual(result.assessment, 'candidate');
    inert(result);
  }
});
test('M4.1 complete happy path remains observational, including separate provider admissions and publication', () => {
  const journey = edges.filter(e => [
    'reserve_research_job:null:reserved', 'begin_research_provider_attempt:reserved:apify_running',
    'finish_research_provider_attempt:apify_running:apify_complete',
    'begin_research_provider_attempt:apify_complete:openrouter_running',
    'finish_research_provider_attempt:openrouter_running:openrouter_complete',
    'complete_research_job:openrouter_complete:succeeded'
  ].includes(`${e[0]}:${e[1]}:${e[2]}`));
  assert.equal(journey.length, 6);
  for (const [rpc,from,to] of journey) {
    assert.equal(describeResearchTransition({rpc,from,to,replay:false}).assessment, 'candidate');
    inert(snapshot(to));
  }
});
test('M4.1 unknown, mismatched and malformed transition events fail closed', () => {
  for (const input of [undefined, {}, null, { rpc:'unknown',from:null,to:'reserved',replay:false },
    { rpc:'reserve_research_job',from:null,to:'reserved' },
    { rpc:'begin_research_provider_attempt',from:'transport_unknown',to:'apify_running',replay:false },
    { rpc:'begin_research_provider_attempt',from:'reserved',to:'apify_running',replay:false,verified:true }]) {
    const result = describeResearchTransition(input);
    assert.equal(result.assessment,'blocked');
    inert(result);
  }
});
test('M4.1 module has no execution dependencies and planning is deterministic without mutating input', () => {
  const source = readFileSync('src/server/researchExecutionPlan.ts','utf8');
  const imports = [...source.matchAll(/^import\s+[^;]+?from\s+'([^']+)';/gm)].map(m => m[1]);
  assert.deepEqual(imports, ['./researchRpcResponse']);
  assert.doesNotMatch(source, /\bfetch\s*\(|\bsetTimeout\s*\(|\bprocess\.|\bconsole\.|\.rpc\s*\(|Math\.random|Date\.now/);
  const input = Object.freeze({kind:'reservation_response',response:Object.freeze({...reservation})});
  const first: OfflineResearchPlan = planResearchExecution(input);
  assert.deepEqual(planResearchExecution(input),first);
  assert.deepEqual(input.response,reservation);
});
