
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseResearchReservationResponse,
  classifyResearchReservation,
  ResearchRpcResponseError
} from '../src/server/researchRpcResponse';

function parseAndClassify(value: unknown) {
  return classifyResearchReservation(
    parseResearchReservationResponse(value)
  );
}

test('accepts a new reserved research job', () => {
  const response = parseResearchReservationResponse({
    success: true,
    idempotent: false,
    status: 'reserved',
    credits_reserved: 1,
    credits_remaining: 19,
    provider_budget_reserved_micro_usd: 50000
  });

  assert.equal(response.creditsReserved, 1);
  assert.equal(response.creditsRemaining, 19);
  assert.equal(
    classifyResearchReservation(response),
    'new_reservation'
  );
});

test('classifies an existing reservation without treating it as new', () => {
  assert.equal(
    parseAndClassify({
      success: true,
      idempotent: true,
      status: 'reserved',
      credits_reserved: 1,
      provider_budget_reserved_micro_usd: 50000
    }),
    'existing_reservation'
  );
});

test('classifies insufficient credits as rejected', () => {
  assert.equal(
    parseAndClassify({
      success: false,
      idempotent: false,
      status: 'rejected',
      required: 2,
      credits_remaining: 1
    }),
    'rejected'
  );
});

test('classifies an ambiguous idempotent response as ambiguous', () => {
  assert.equal(
    parseAndClassify({
      success: true,
      idempotent: true,
      status: 'ambiguous',
      credits_reserved: 1,
      provider_budget_reserved_micro_usd: 50000
    }),
    'ambiguous'
  );
});

test('classifies completed research without restarting it', () => {
  assert.equal(
    parseAndClassify({
      success: true,
      idempotent: true,
      status: 'succeeded',
      credits_reserved: 1,
      provider_budget_reserved_micro_usd: 50000
    }),
    'already_succeeded'
  );
});

test('classifies an in-progress research job', () => {
  assert.equal(
    parseAndClassify({
      success: true,
      idempotent: true,
      status: 'apify_running',
      credits_reserved: 1,
      provider_budget_reserved_micro_usd: 50000
    }),
    'already_processing'
  );
});

test('rejects unknown statuses', () => {
  assert.throws(
    () => parseResearchReservationResponse({
      success: true,
      idempotent: true,
      status: 'unknown_status'
    }),
    (error: unknown) =>
      error instanceof ResearchRpcResponseError &&
      error.code === 'UNKNOWN_STATUS'
  );
});

test('rejects missing required fields', () => {
  assert.throws(
    () => parseResearchReservationResponse({
      success: true,
      status: 'reserved'
    }),
    ResearchRpcResponseError
  );
});

test('rejects inconsistent reserved response', () => {
  assert.throws(
    () => parseResearchReservationResponse({
      success: false,
      idempotent: false,
      status: 'reserved',
      credits_reserved: 1,
      credits_remaining: 19,
      provider_budget_reserved_micro_usd: 50000
    }),
    ResearchRpcResponseError
  );
});

test('rejects invalid credit values', () => {
  assert.throws(
    () => parseResearchReservationResponse({
      success: true,
      idempotent: false,
      status: 'reserved',
      credits_reserved: -1,
      credits_remaining: 19,
      provider_budget_reserved_micro_usd: 50000
    }),
    ResearchRpcResponseError
  );
});

test('rejects malformed new reservation', () => {
  assert.throws(
    () => parseResearchReservationResponse({
      success: true,
      idempotent: false,
      status: 'reserved'
    }),
    ResearchRpcResponseError
  );
});

test('rejects an invalid ambiguous response', () => {
  assert.throws(
    () => parseResearchReservationResponse({
      success: false,
      idempotent: true,
      status: 'ambiguous'
    }),
    ResearchRpcResponseError
  );
});

const replayStatuses = ['reserved','apify_running','apify_complete','apify_failed',
  'openrouter_running','openrouter_complete','openrouter_failed','ambiguous','succeeded','failed','rejected'] as const;
const replayResponse = (status: typeof replayStatuses[number]) => ({
  success: status !== 'failed' && status !== 'rejected', idempotent: true, status,
  credits_reserved: 1, provider_budget_reserved_micro_usd: 50000
});
for (const status of replayStatuses) {
  test(`M2 replay ${status} enforces the SQL success flag`, () => {
    const response = replayResponse(status);
    assert.equal(parseResearchReservationResponse(response).status, status);
    assert.throws(() => parseResearchReservationResponse({ ...response, success: !response.success }),
      (error: unknown) => error instanceof ResearchRpcResponseError && error.code === 'INCONSISTENT_RESPONSE');
  });
}
for (const status of ['apify_failed','openrouter_failed'] as const) {
  test(`${status} replay is explicitly stage_failed, never processing or a new reservation`, () => {
    const response = parseResearchReservationResponse(replayResponse(status));
    assert.equal(response.status, status);
    assert.equal(response.idempotent, true);
    assert.equal(response.success, true);
    assert.equal(classifyResearchReservation(response), 'stage_failed');
  });
  test(`${status} cannot be returned as a new reservation`, () => {
    assert.throws(() => parseResearchReservationResponse({ ...replayResponse(status), idempotent: false }),
      (error: unknown) => error instanceof ResearchRpcResponseError && error.code === 'INCONSISTENT_RESPONSE');
  });
}
test('replay requires the credit and budget fields returned by M2', () => {
  const response = replayResponse('apify_failed');
  for (const field of ['credits_reserved','provider_budget_reserved_micro_usd'] as const) {
    const missing: Record<string, unknown> = { ...response };
    delete missing[field];
    assert.throws(() => parseResearchReservationResponse(missing), ResearchRpcResponseError);
  }
});
for (const field of ['credits_reserved','credits_remaining','provider_budget_reserved_micro_usd','required'] as const) {
  test(`replay rejects malformed numeric ${field}, including null and undefined`, () => {
    for (const invalid of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null, undefined]) {
      assert.throws(() => parseResearchReservationResponse({ ...replayResponse('openrouter_failed'), [field]: invalid }),
        (error: unknown) => error instanceof ResearchRpcResponseError && error.code === 'INVALID_RESPONSE');
    }
  });
}
test('malformed response objects, RPC envelopes and unknown fields fail closed', () => {
  let getterCalls = 0;
  const accessor = Object.defineProperty({}, 'success', { get() { getterCalls++; return true; } });
  for (const value of [null, [], {}, 'apify_failed', accessor,
    { data: replayResponse('apify_failed'), error: null },
    { ...replayResponse('apify_failed'), attempt_id: 'not-a-reservation-field' },
    { ...replayResponse('openrouter_failed'), retryAllowed: true },
    { ...replayResponse('apify_failed'), status: 'apify_failure' },
    { ...replayResponse('openrouter_failed'), idempotent: 'true' }]) {
    assert.throws(() => parseResearchReservationResponse(value), ResearchRpcResponseError);
  }
  assert.equal(getterCalls, 0);
});
