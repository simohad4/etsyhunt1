import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareResearchRequest } from '../src/server/researchService';
import { ResearchEconomicsError } from '../src/server/researchEconomics';
import { ResearchRpcResponseError } from '../src/server/researchRpcResponse';
import {
  reserveResearchJob,
  mapResearchReservationParameters,
  resolveResearchReservationOutcome,
  ResearchRpcError,
  type ResearchRpcClient
} from '../src/server/researchRpc';

const prepared = prepareResearchRequest({ keyword: 'wall art', pages: 1, maximumListings: 36 });
const requestId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const input = { requestId, userId, prepared };
const reservedResponse = {
  success: true, idempotent: false, status: 'reserved',
  credits_reserved: 1, credits_remaining: 19, provider_budget_reserved_micro_usd: 50000
};

function resolveData(data: unknown) {
  return resolveResearchReservationOutcome({ kind: 'response', result: { data, error: null } });
}

test('production reservation rejects specifically PRICING_MISSING without even accessing the transport', async () => {
  let accesses = 0;
  const client: ResearchRpcClient = {
    get rpc(): ResearchRpcClient['rpc'] {
      accesses++;
      throw new Error('Transport must not be accessed');
    }
  };
  await assert.rejects(reserveResearchJob(client, input), (error: unknown) =>
    error instanceof ResearchEconomicsError && error.code === 'PRICING_MISSING');
  assert.equal(accesses, 0);
});

for (const field of ['requestId', 'userId'] as const) {
  for (const invalid of ['not-a-uuid', '', requestId + '\n', ' ' + requestId, null, 123]) {
    test(`validates ${field}=${JSON.stringify(invalid)} before pricing or RPC`, async () => {
      let calls = 0;
      const client: ResearchRpcClient = {
        async rpc() { calls++; return { data: reservedResponse, error: null }; }
      };
      await assert.rejects(
        reserveResearchJob(client, { ...input, [field]: invalid } as typeof input),
        (error: unknown) => error instanceof ResearchRpcError && error.code === 'INVALID_IDENTIFIERS'
      );
      assert.equal(calls, 0);
    });
  }
}

test('pure mapping preserves the exact M2 RPC parameter contract', () => {
  assert.deepEqual(mapResearchReservationParameters(input), {
    p_request_id: requestId,
    p_user_id: userId,
    p_keyword: 'wall art',
    p_pages: 1,
    p_maximum_listings: 36,
    p_request_fingerprint: prepared.fingerprint,
    p_pricing_version: prepared.pricingVersion,
    p_apify_actor: prepared.request.apifyActor,
    p_openrouter_model: prepared.request.openRouterModel
  });
});

test('pure result interpretation classifies a new reservation', () => {
  const result = resolveData(reservedResponse);
  assert.equal(result.decision, 'new_reservation');
  assert.equal(result.response.creditsReserved, 1);
  assert.equal(result.response.creditsRemaining, 19);
  assert.equal(result.response.providerBudgetReservedMicroUsd, 50000);
});

for (const [status, success, decision] of [
  ['reserved', true, 'existing_reservation'],
  ['ambiguous', true, 'ambiguous'],
  ['rejected', false, 'rejected'],
  ['failed', false, 'failed'],
  ['succeeded', true, 'already_succeeded'],
  ['apify_running', true, 'already_processing'],
  ['apify_complete', true, 'already_processing'],
  ['openrouter_running', true, 'already_processing'],
  ['openrouter_complete', true, 'already_processing']
] as const) {
  test(`existing ${status} response is classified as ${decision}, never a new reservation`, () => {
    const result = resolveData({ ...reservedResponse, idempotent: true, status, success });
    assert.equal(result.decision, decision);
  });
}

test('new rejection is preserved without any reservation or retry', () => {
  assert.equal(resolveData({
    success: false, idempotent: false, status: 'rejected', required: 1, credits_remaining: 0
  }).decision, 'rejected');
});

test('database errors take precedence over data and disclose no database details', () => {
  assert.throws(() => resolveResearchReservationOutcome({
    kind: 'response', result: {
      data: reservedResponse,
      error: { message: 'Sensitive database details', code: 'P0001', details: 'secret' }
    }
  }), (error: unknown) => {
    assert.ok(error instanceof ResearchRpcError);
    assert.equal(error.code, 'RPC_DATABASE_ERROR');
    assert.equal(error.message, 'Research reservation was rejected by the database.');
    assert.equal('cause' in error, false);
    assert.doesNotMatch(JSON.stringify(error), /Sensitive|P0001|secret/);
    return true;
  });
});

test('transport failure is an unknown outcome requiring reconciliation, not an automatic retry', () => {
  assert.throws(() => resolveResearchReservationOutcome({ kind: 'transport_error' }),
    (error: unknown) => error instanceof ResearchRpcError &&
      error.code === 'RPC_OUTCOME_UNKNOWN' && /reconcile by request ID before retrying/.test(error.message));
});

for (const [name, data, code] of [
  ['null data', null, 'INVALID_RESPONSE'],
  ['array data', [], 'INVALID_RESPONSE'],
  ['missing required fields', { success: true, status: 'reserved' }, 'INVALID_RESPONSE'],
  ['unknown status', { success: true, idempotent: true, status: 'unexpected' }, 'UNKNOWN_STATUS'],
  ['missing budget', { success: true, idempotent: false, status: 'reserved' }, 'INVALID_RESPONSE'],
  ['inconsistent flags', { ...reservedResponse, success: false }, 'INCONSISTENT_RESPONSE']
] as const) {
  test(`pure RPC result rejects ${name}`, () => {
    assert.throws(() => resolveData(data), (error: unknown) =>
      error instanceof ResearchRpcResponseError && error.code === code);
  });
}

for (const result of [null, undefined, [], {}, { data: reservedResponse }, { error: null }]) {
  test(`rejects malformed RPC envelope ${JSON.stringify(result)}`, () => {
    assert.throws(() => resolveResearchReservationOutcome({ kind: 'response', result }),
      (error: unknown) => error instanceof ResearchRpcResponseError && error.code === 'INVALID_RESPONSE');
  });
}
