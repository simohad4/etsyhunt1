import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { simulateResearchOrchestration } from '../src/server/researchOrchestration';
import { planResearchExecution, RESEARCH_JOB_STATUSES, type ResearchJobStatus } from '../src/server/researchExecutionPlan';
import { APIFY_PROJECTION_VERSION, MAX_APIFY_RESPONSE_BYTES } from '../src/server/providers/apifyAdapter';
import { OPENROUTER_PROJECTION_VERSION, MAX_OPENROUTER_RESPONSE_BYTES } from '../src/server/providers/openrouterAdapter';
import { PINNED_OPENROUTER_MODEL, MAX_OPENROUTER_INPUT_TOKENS } from '../src/server/researchEconomics';

const at = '2026-10-24T10:00:00.000Z';
const reservation = { success: true, idempotent: false, status: 'reserved',
  credits_reserved: 1, credits_remaining: 19, provider_budget_reserved_micro_usd: 50000 };
const snapshot = (status: ResearchJobStatus) => ({ kind: 'job_snapshot', status });
const apifyFixture = () => ({ responseJson: JSON.stringify({ schemaVersion: APIFY_PROJECTION_VERSION,
  listings: [{ listingUrl: 'https://www.etsy.com/listing/123/fixture' }] }),
  request: { keyword: 'contract fixture', pages: 1, maximumListings: 2 }, collectedAt: at });
const modelFixture = () => ({ responseJson: JSON.stringify({ schemaVersion: OPENROUTER_PROJECTION_VERSION,
  model: PINNED_OPENROUTER_MODEL, finishReason: 'stop', usage: { inputTokens: MAX_OPENROUTER_INPUT_TOKENS, outputTokens: 10 },
  interpretations: [{ listingId: '123', interpretation: 'Synthetic interpretation fixture.' }] }), generatedAt: at });

function inert(result: ReturnType<typeof simulateResearchOrchestration>) {
  assert.equal(result.mode, 'offline-only');
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.requiresAuthoritativeDatabaseValidation, true);
  assert.equal(result.fixtureTrust, 'synthetic_unverified');
  function frozen(value: unknown) {
    if (value && typeof value === 'object') {
      assert.ok(Object.isFrozen(value));
      Object.values(value).forEach(frozen);
    }
  }
  frozen(result);
}
function preserves(observation: unknown, fixtures?: unknown) {
  const result = simulateResearchOrchestration(observation, fixtures);
  const { candidateNextStage, fixtureValidation, fixtureTrust, fixtures: outputFixtures, ...plan } = result;
  assert.deepEqual(plan, planResearchExecution(observation));
  inert(result);
  return result;
}
for (const status of RESEARCH_JOB_STATUSES) {
  test(`M4.3 ${status}: snapshot and reservation replay preserve planner boundary with execution off`, () => {
    const replay = { kind: 'reservation_response', response: { ...reservation, status, idempotent: true,
      success: status !== 'failed' && status !== 'rejected' } };
    const expected = status === 'reserved' ? 'apify' : status === 'apify_complete' ? 'openrouter' :
      status === 'openrouter_complete' ? 'completion_review' : 'none';
    for (const observation of [snapshot(status), replay]) {
      const first = preserves(observation);
      assert.equal(first.candidateNextStage, expected);
      assert.equal(first.databaseStatus, status);
      assert.equal(first.fixtureValidation, 'not_supplied');
      assert.deepEqual(preserves(observation), first);
    }
  });
}
test('M4.3 new reservation and rejection stay distinct; duplicates never restart execution', () => {
  const observation = { kind: 'reservation_response', response: reservation };
  assert.equal(preserves(observation).classification, 'new_reservation');
  assert.equal(preserves(observation).candidateNextStage, 'apify');
  const replay = { kind: 'reservation_response', response: { ...reservation, idempotent: true } };
  assert.equal(preserves(replay).classification, 'existing_reservation');
  assert.equal(preserves(replay).review, 'inspect_existing_job_and_attempts');
  assert.equal(preserves({ kind: 'reservation_response', response: { success: false, idempotent: false,
    status: 'rejected', required: 1, credits_remaining: 0 } }).candidateNextStage, 'none');
});
test('M4.3 transport unknown stays blocked for every last-known status, even with valid fixtures', () => {
  for (const lastKnownStatus of [undefined, ...RESEARCH_JOB_STATUSES]) {
    const observation = { kind: 'transport_unknown', lastKnownStatus };
    for (const fixtures of [undefined, { apify: apifyFixture(), openrouter: modelFixture() }]) {
      const result = preserves(observation, fixtures);
      assert.equal(result.classification, 'transport_unknown');
      assert.equal(result.databaseStatus, lastKnownStatus ?? null);
      assert.equal(result.candidateNextStage, 'none');
    }
  }
});
test('M4.3 database errors and malformed or forged observations cannot authorize or leak', () => {
  let calls = 0;
  const accessor = { get kind() { calls++; return 'job_snapshot'; } };
  for (const observation of [null, undefined, [], {}, accessor, () => {},
    { kind: 'job_snapshot', status: 'bad' }, { kind: 'attempt_admitted' },
    { kind: 'job_snapshot', status: 'reserved', token: 'sensitive-sentinel' },
    { ...planResearchExecution(snapshot('reserved')) },
    { kind: 'database_error' }, { kind: 'database_error', error: 'sensitive-sentinel' },
    { kind: 'reservation_response', response: { ...reservation, success: false } },
    { kind: 'reservation_response', response: { ...reservation, credits_reserved: 0 } }]) {
    const out = preserves(observation);
    assert.equal(out.candidateNextStage, 'none');
    assert.doesNotMatch(JSON.stringify(out), /sensitive-sentinel/);
  }
  assert.equal(calls, 0);
});
test('M4.3 fixture validators retain provenance and missing data, without completing a job', () => {
  for (const status of RESEARCH_JOB_STATUSES) {
    const observation = snapshot(status);
    const result = preserves(observation, { apify: apifyFixture(), openrouter: modelFixture() });
    assert.equal(result.fixtureValidation, 'validated');
    assert.equal(result.databaseStatus, status);
    assert.equal(result.candidateNextStage, simulateResearchOrchestration(observation).candidateNextStage);
    assert.equal(result.fixtures.apify?.listings[0].price.value, null);
    assert.equal(result.fixtures.apify?.listings[0].title.observationStatus, 'unavailable');
    assert.equal(result.fixtures.apify?.listings[0].title.dataClass, 'observed');
    assert.equal(result.fixtures.openrouter?.interpretations[0].interpretation.dataClass, 'modeled');
    assert.equal(result.fixtures.openrouter?.usage.inputTokens, MAX_OPENROUTER_INPUT_TOKENS);
  }
});
test('M4.3 Apify-only fixtures and empty results are valid without synthesizing evidence', () => {
  const a = apifyFixture();
  assert.equal(preserves(snapshot('apify_complete'), { apify: a }).fixtures.openrouter, null);
  a.responseJson = JSON.stringify({ schemaVersion: APIFY_PROJECTION_VERSION, listings: [] });
  const result = preserves(snapshot('apify_complete'), { apify: a });
  assert.equal(result.fixtureValidation, 'validated');
  assert.deepEqual(result.fixtures.apify?.listings, []);
  assert.equal(preserves(snapshot('openrouter_complete'), { apify: a, openrouter: modelFixture() }).fixtureValidation, 'invalid');
});
test('M4.3 malformed, oversized and inconsistent fixtures fail atomically without payload leaks', () => {
  let calls = 0;
  const a = apifyFixture();
  const m = modelFixture();
  const invalid: unknown[] = [null, {}, [], () => {}, { openrouter: m },
    { apify: a, token: 'sensitive-sentinel' },
    { get apify() { calls++; return a; } },
    { apify: { ...a, request: { ...a.request, transport: () => { calls++; } } } },
    { apify: { ...a, responseJson: 'sensitive-sentinel' } },
    { apify: { ...a, responseJson: 'x'.repeat(MAX_APIFY_RESPONSE_BYTES + 1) } },
    { apify: { ...a, collectedAt: 'bad' } },
    { apify: a, openrouter: { ...m, responseJson: 'x'.repeat(MAX_OPENROUTER_RESPONSE_BYTES + 1) } },
    { apify: a, openrouter: { ...m, maximumOutputTokens: 2049 } },
    { apify: a, openrouter: { ...m, contextJson: 'sensitive-sentinel' } },
    { apify: { ...a, responseJson: a.responseJson.replace('www.etsy.com', 'evil.test') } },
    { apify: { ...a, responseJson: a.responseJson.replace('listings', 'unexpected') } },
    { apify: a, openrouter: { ...m, responseJson: m.responseJson.replace('"123"', '"999"') } },
    { apify: a, openrouter: { ...m, responseJson: m.responseJson.replace('"stop"', '"length"') } }
  ];
  for (const fixtures of invalid) {
    const result = preserves(snapshot('apify_complete'), fixtures);
    assert.equal(result.fixtureValidation, 'invalid');
    assert.equal(result.candidateNextStage, 'none');
    assert.deepEqual(result.fixtures, { apify: null, openrouter: null });
    assert.doesNotMatch(JSON.stringify(result), /sensitive-sentinel/);
  }
  assert.equal(calls, 0);
});
test('M4.3 simulator is deterministic, does not mutate inputs, and has no execution dependencies', () => {
  const observation = Object.freeze(snapshot('reserved'));
  const fixture = Object.freeze({ apify: Object.freeze(apifyFixture()) });
  const before = JSON.stringify(fixture);
  assert.deepEqual(simulateResearchOrchestration(observation, fixture), simulateResearchOrchestration(observation, fixture));
  assert.equal(JSON.stringify(fixture), before);
  const source = readFileSync('src/server/researchOrchestration.ts', 'utf8');
  const imports = [...source.matchAll(/^import\s+[^;]+?from\s+'([^']+)';/gm)].map(m => m[1]);
  assert.deepEqual(imports, ['./researchExecutionPlan', './providers/apifyAdapter', './providers/openrouterAdapter', './providers/adapterContract']);
  assert.doesNotMatch(source, /\bfetch\s*\(|process\.|console\.|\.rpc\s*\(|\bset(?:Timeout|Interval)\s*\(|Date\.now|Math\.random|services\/analyzer/);
});
