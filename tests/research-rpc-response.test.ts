
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
      credits_reserved: 1
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
      credits_reserved: 1
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