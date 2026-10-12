import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CURRENT_RESEARCH_PROVIDER_PRICING,
  MAX_OPENROUTER_INPUT_BYTES,
  MAX_OPENROUTER_INPUT_TOKENS,
  OPENROUTER_PROMPT_OVERHEAD_TOKENS,
  PINNED_APIFY_ACTOR,
  PINNED_OPENROUTER_MODEL,
  PROVIDER_BUDGET_MICRO_USD_PER_CREDIT,
  ResearchEconomicsError,
  ResearchProviderPricingConfiguration,
  aggregateRetryCostMicroUsd,
  assertProviderPricingReady,
  calculateTokenCostMicroUsd,
  createResearchRequestFingerprint,
  estimateOpenRouterInputTokens,
  estimateResearchJobCost,
  estimateTokenCountFromUtf8,
  validateResearchRequest
} from '../src/server/researchEconomics';

const NOW = new Date('2026-10-11T12:00:00.000Z');

function makeVerifiedPricing(
  overrides: Partial<ResearchProviderPricingConfiguration> = {}
): ResearchProviderPricingConfiguration {
  const base: ResearchProviderPricingConfiguration = {
    version: 'test-verified-v1',
    currency: 'USD',
    effectiveFrom: '2026-10-01T00:00:00.000Z',
    expiresAt: '2026-11-01T00:00:00.000Z',
    activationBlocked: false,
    apify: {
      provider: 'apify',
      actor: PINNED_APIFY_ACTOR,
      billingUnit: 'actor-result',
      billingUnitAssumption: 'Synthetic test assumption: one billed result per requested listing.',
      billableUnitsPerRequestedListing: 1,
      microUsdPerBillingUnit: 100,
      fixedRunMicroUsd: 1_000,
      provenance: 'verified',
      sourceReference: 'Synthetic deterministic test rate.',
      verifiedAt: '2026-10-10T00:00:00.000Z'
    },
    openRouter: {
      provider: 'openrouter',
      model: PINNED_OPENROUTER_MODEL,
      inputMicroUsdPerMillionTokens: 100_000,
      outputMicroUsdPerMillionTokens: 200_000,
      provenance: 'verified',
      sourceReference: 'Synthetic deterministic test rate.',
      verifiedAt: '2026-10-10T00:00:00.000Z'
    }
  };

  return {
    ...base,
    ...overrides,
    apify: { ...base.apify, ...(overrides.apify ?? {}) },
    openRouter: { ...base.openRouter, ...(overrides.openRouter ?? {}) }
  };
}

function expectEconomicsError(code: ResearchEconomicsError['code'], action: () => unknown): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof ResearchEconomicsError);
    assert.equal(error.code, code);
    return true;
  });
}

test('micro-USD token costs round upward without floating-point arithmetic', () => {
  assert.equal(calculateTokenCostMicroUsd(0, 100_000), 0);
  assert.equal(calculateTokenCostMicroUsd(1, 1), 1);
  assert.equal(calculateTokenCostMicroUsd(1_000_000, 123_456), 123_456);
  assert.equal(calculateTokenCostMicroUsd(1_500_000, 2), 3);
});

test('token estimation is deterministic and includes conservative prompt overhead', () => {
  assert.equal(estimateTokenCountFromUtf8(''), 0);
  assert.equal(estimateTokenCountFromUtf8('abcdef'), 2);
  assert.equal(estimateTokenCountFromUtf8('é'), 1);
  assert.equal(estimateOpenRouterInputTokens('abcdef'), OPENROUTER_PROMPT_OVERHEAD_TOKENS + 2);
  assert.equal(
    estimateOpenRouterInputTokens('x'.repeat(MAX_OPENROUTER_INPUT_BYTES)),
    MAX_OPENROUTER_INPUT_TOKENS
  );

  expectEconomicsError('INVALID_REQUEST', () =>
    estimateOpenRouterInputTokens('x'.repeat(MAX_OPENROUTER_INPUT_BYTES + 1))
  );
});

test('retry aggregation reserves the full bounded number of attempts', () => {
  assert.equal(aggregateRetryCostMicroUsd(1_234, 1), 1_234);
  assert.equal(aggregateRetryCostMicroUsd(1_234, 2), 2_468);
  expectEconomicsError('INVALID_REQUEST', () => aggregateRetryCostMicroUsd(1_234, 3));
});

test('checked-in provider pricing contains no invented rates and blocks activation', () => {
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.activationBlocked, true);
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.apify.microUsdPerBillingUnit, null);
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.apify.fixedRunMicroUsd, null);
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.openRouter.inputMicroUsdPerMillionTokens, null);
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.openRouter.outputMicroUsdPerMillionTokens, null);
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.apify.provenance, 'estimated');
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.openRouter.provenance, 'estimated');

  const request = validateResearchRequest({ keyword: 'ghost mug', pages: 1, maximumListings: 36 });
  expectEconomicsError('PRICING_MISSING', () =>
    estimateResearchJobCost({
      request,
      openRouterInput: 'bounded payload',
      pricing: CURRENT_RESEARCH_PROVIDER_PRICING,
      now: NOW
    })
  );
});

test('pricing readiness rejects missing, unverified, blocked, and expired configurations', () => {
  expectEconomicsError('PRICING_MISSING', () => assertProviderPricingReady(null, NOW));

  const missingRate = makeVerifiedPricing({
    openRouter: {
      ...makeVerifiedPricing().openRouter,
      inputMicroUsdPerMillionTokens: null
    }
  });
  expectEconomicsError('PRICING_MISSING', () => assertProviderPricingReady(missingRate, NOW));

  const unverified = makeVerifiedPricing({
    apify: {
      ...makeVerifiedPricing().apify,
      provenance: 'reported'
    }
  });
  expectEconomicsError('PRICING_UNVERIFIED', () => assertProviderPricingReady(unverified, NOW));

  const blocked = makeVerifiedPricing({ activationBlocked: true });
  expectEconomicsError('ACTIVATION_BLOCKED', () => assertProviderPricingReady(blocked, NOW));

  const expired = makeVerifiedPricing({ expiresAt: '2026-10-11T11:59:59.000Z' });
  expectEconomicsError('PRICING_EXPIRED', () => assertProviderPricingReady(expired, NOW));

  const futureApifyVerification = makeVerifiedPricing({
    apify: {
      ...makeVerifiedPricing().apify,
      verifiedAt: '2026-10-11T12:00:01.000Z'
    }
  });
  expectEconomicsError('PRICING_NOT_EFFECTIVE', () =>
    assertProviderPricingReady(futureApifyVerification, NOW)
  );

  const futureOpenRouterVerification = makeVerifiedPricing({
    openRouter: {
      ...makeVerifiedPricing().openRouter,
      verifiedAt: '2026-10-11T12:00:01.000Z'
    }
  });
  expectEconomicsError('PRICING_NOT_EFFECTIVE', () =>
    assertProviderPricingReady(futureOpenRouterVerification, NOW)
  );
});

test('bounded request validation normalizes one keyword and enforces page listing limits', () => {
  const request = validateResearchRequest({
    keyword: '  Ghost   Mug  ',
    pages: 2,
    maximumListings: 72
  });

  assert.equal(request.keyword, 'Ghost Mug');
  assert.equal(request.canonicalKeyword, 'ghost mug');
  assert.equal(request.apifyActor, PINNED_APIFY_ACTOR);
  assert.equal(request.openRouterModel, PINNED_OPENROUTER_MODEL);

  expectEconomicsError('INVALID_REQUEST', () =>
    validateResearchRequest({ keyword: ['ghost mug'], pages: 1, maximumListings: 36 })
  );
  expectEconomicsError('INVALID_REQUEST', () =>
    validateResearchRequest({ keyword: 'ghost\nmug', pages: 1, maximumListings: 36 })
  );
  expectEconomicsError('INVALID_REQUEST', () =>
    validateResearchRequest({ keyword: 'ghost mug', pages: 4, maximumListings: 36 })
  );
  expectEconomicsError('INVALID_REQUEST', () =>
    validateResearchRequest({ keyword: 'ghost mug', pages: 1, maximumListings: 37 })
  );
  expectEconomicsError('INVALID_REQUEST', () =>
    validateResearchRequest({ keyword: 'ghost mug', pages: 1, maximumListings: 36, extra: true })
  );
});

test('canonical request fingerprints are stable and bind cost-relevant inputs', () => {
  const first = validateResearchRequest({ keyword: ' Ghost   Mug ', pages: 1, maximumListings: 36 });
  const equivalent = validateResearchRequest({ keyword: 'ghost mug', pages: 1, maximumListings: 36 });
  const differentLimit = validateResearchRequest({ keyword: 'ghost mug', pages: 1, maximumListings: 35 });

  const firstFingerprint = createResearchRequestFingerprint(first, 'pricing-v1');
  assert.equal(firstFingerprint, createResearchRequestFingerprint(equivalent, 'pricing-v1'));
  assert.match(firstFingerprint, /^[0-9a-f]{64}$/);
  assert.notEqual(firstFingerprint, createResearchRequestFingerprint(differentLimit, 'pricing-v1'));
  assert.notEqual(firstFingerprint, createResearchRequestFingerprint(first, 'pricing-v2'));
  assert.notEqual(
    firstFingerprint,
    createResearchRequestFingerprint(first, 'pricing-v1', {
      apifyMaxAttempts: 1,
      openRouterMaxAttempts: 2
    })
  );
});

test('provider and model mismatches fail closed', () => {
  expectEconomicsError('PROVIDER_MISMATCH', () =>
    validateResearchRequest({
      keyword: 'ghost mug',
      pages: 1,
      maximumListings: 36,
      openRouterModel: 'openrouter/auto'
    })
  );
  expectEconomicsError('PROVIDER_MISMATCH', () =>
    validateResearchRequest({
      keyword: 'ghost mug',
      pages: 1,
      maximumListings: 36,
      apifyActor: 'another/actor'
    })
  );

  const mismatchedPricing = makeVerifiedPricing({
    openRouter: {
      ...makeVerifiedPricing().openRouter,
      model: 'different/model' as typeof PINNED_OPENROUTER_MODEL
    }
  });
  expectEconomicsError('PROVIDER_MISMATCH', () =>
    assertProviderPricingReady(mismatchedPricing, NOW)
  );
});

test('per-job estimate returns retry-inclusive provider breakdown in micro-USD', () => {
  const request = validateResearchRequest({ keyword: 'ghost mug', pages: 1, maximumListings: 36 });
  const estimate = estimateResearchJobCost({
    request,
    openRouterInput: 'abcdef',
    maximumOutputTokens: 1_000,
    pricing: makeVerifiedPricing(),
    now: NOW
  });

  assert.equal(estimate.openRouterInputTokens, OPENROUTER_PROMPT_OVERHEAD_TOKENS + 2);
  assert.equal(estimate.breakdown.apify.perAttemptMicroUsd, 4_600);
  assert.equal(estimate.breakdown.apify.retryReserveMicroUsd, 4_600);
  assert.equal(estimate.breakdown.apify.totalMicroUsd, 9_200);
  assert.equal(estimate.breakdown.openRouter.perAttemptMicroUsd, 252);
  assert.equal(estimate.breakdown.openRouter.retryReserveMicroUsd, 252);
  assert.equal(estimate.breakdown.openRouter.totalMicroUsd, 504);
  assert.equal(estimate.estimatedProviderCostMicroUsd, 9_704);
  assert.equal(estimate.providerBudgetMicroUsd, PROVIDER_BUDGET_MICRO_USD_PER_CREDIT);
});

test('worst-case provider estimate rejects a per-job budget overrun', () => {
  const request = validateResearchRequest({ keyword: 'ghost mug', pages: 1, maximumListings: 36 });
  const expensivePricing = makeVerifiedPricing({
    apify: {
      ...makeVerifiedPricing().apify,
      microUsdPerBillingUnit: 10_000
    }
  });

  assert.throws(
    () =>
      estimateResearchJobCost({
        request,
        openRouterInput: 'bounded payload',
        pricing: expensivePricing,
        now: NOW
      }),
    (error: unknown) => {
      assert.ok(error instanceof ResearchEconomicsError);
      assert.equal(error.code, 'BUDGET_EXCEEDED');
      assert.ok(
        Number(error.details.estimatedProviderCostMicroUsd) >
          Number(error.details.providerBudgetMicroUsd)
      );
      return true;
    }
  );
});
