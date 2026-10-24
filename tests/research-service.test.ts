
import assert from 'node:assert/strict';
import test from 'node:test';
import './research-execution-plan.test';
import './research-provider-adapters.test';
import './research-orchestration.test';
import './research-economics-scenario.test';
import './provider-wire-drafts.test';
import './research-execution-safety.test';
import './research-dispatch-protocol.test';
import './research-durable-dispatch-sql-contract.test';
import './research-authority-contract.test';
import './research-staging-authority-verification-plan.test';

import {
  prepareResearchRequest,
  assertResearchActivationReady
} from '../src/server/researchService';

import {
  RESEARCH_PRICING_VERSION,
  PINNED_APIFY_ACTOR,
  PINNED_OPENROUTER_MODEL,
  ResearchEconomicsError
} from '../src/server/researchEconomics';

const validInput = {
  keyword: 'wall art',
  pages: 1,
  maximumListings: 36
};

test('prepares a valid research request', () => {
  const result = prepareResearchRequest(validInput);

  assert.equal(result.request.keyword, 'wall art');
  assert.equal(result.request.pages, 1);
  assert.equal(result.request.maximumListings, 36);
  assert.equal(result.pricingVersion, RESEARCH_PRICING_VERSION);
  assert.equal(result.request.apifyActor, PINNED_APIFY_ACTOR);
  assert.equal(result.request.openRouterModel, PINNED_OPENROUTER_MODEL);
  assert.match(result.fingerprint, /^[a-f0-9]{64}$/);
});

test('normalizes keyword before fingerprinting', () => {
  const first = prepareResearchRequest(validInput);

  const second = prepareResearchRequest({
    ...validInput,
    keyword: '  WALL   ART  '
  });

  assert.equal(first.fingerprint, second.fingerprint);
});

test('different research parameters produce different fingerprints', () => {
  const first = prepareResearchRequest(validInput);

  const second = prepareResearchRequest({
    ...validInput,
    pages: 2
  });

  assert.notEqual(first.fingerprint, second.fingerprint);
});

test('rejects invalid research requests', () => {
  assert.throws(
    () => prepareResearchRequest({
      keyword: '',
      pages: 1,
      maximumListings: 36
    }),
    ResearchEconomicsError
  );

  assert.throws(
    () => prepareResearchRequest({
      keyword: 'wall art',
      pages: 4,
      maximumListings: 36
    }),
    ResearchEconomicsError
  );

  assert.throws(
    () => prepareResearchRequest({
      ...validInput,
      unexpectedField: true
    }),
    ResearchEconomicsError
  );
});

test('rejects mismatched providers', () => {
  assert.throws(
    () => prepareResearchRequest({
      ...validInput,
      apifyActor: 'unknown/actor'
    }),
    ResearchEconomicsError
  );
});

test('blocks research while provider pricing is unverified', () => {
  assert.throws(
    () => assertResearchActivationReady(),
    ResearchEconomicsError
  );
});
