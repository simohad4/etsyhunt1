import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { calculateResearchEconomicsScenario as job, auditEconomicsScenarioCatalog as catalog,
  calculateEconomicsScenarioTrial as trial, PROVISIONAL_ECONOMICS_SCENARIO, EconomicsScenarioError } from '../src/server/researchEconomicsScenario';
import { MAX_OPENROUTER_INPUT_TOKENS, MAX_OPENROUTER_OUTPUT_TOKENS, MAX_OPENROUTER_INPUT_BYTES,
  OPENROUTER_PROMPT_OVERHEAD_TOKENS, CURRENT_RESEARCH_PROVIDER_PRICING } from '../src/server/researchEconomics';

test('scenario uses exact economics token ceilings and provisional non-activatable rates', () => {
  assert.equal(MAX_OPENROUTER_INPUT_TOKENS, OPENROUTER_PROMPT_OVERHEAD_TOKENS + Math.ceil(MAX_OPENROUTER_INPUT_BYTES / 3));
  assert.equal(MAX_OPENROUTER_INPUT_TOKENS, 33280);
  assert.equal(MAX_OPENROUTER_OUTPUT_TOKENS, 2048);
  const result = job({ pages: 1 });
  assert.equal(result.inputCostMicroUsd, 8320);
  assert.equal(result.outputCostMicroUsd, 3072);
  assert.equal(result.assumptions.provenance, 'provisional-user-supplied');
  assert.equal(result.assumptions.activationBlocked, true);
  assert.equal(result.assumptions.nonActivatable, true);
  assert.equal(result.assumptions.includeInDemand, false);
  assert.equal(result.assumptions.totalCostComplete, false);
  for (const unknown of result.assumptions.excludedUnknownCosts) assert.equal(unknown.costMicroUsd, null);
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.activationBlocked, true);
  assert.equal(CURRENT_RESEARCH_PROVIDER_PRICING.apify.microUsdPerBillingUnit, null);
});
for (const pages of [1, 2, 3]) for (const apifyAttempts of [1, 2]) for (const openrouterAttempts of [1, 2]) {
  test(`scenario ${pages} pages, independent attempts ${apifyAttempts}/${openrouterAttempts}`, () => {
    const result = job({ pages, apifyAttempts, openrouterAttempts });
    const a = pages * 36 * 8000 + 50;
    assert.equal(result.apifyPerAttemptMicroUsd, a);
    assert.equal(result.openrouterPerAttemptMicroUsd, 11392);
    assert.equal(result.singleAttemptCostMicroUsd, [299442, 587442, 875442][pages - 1]);
    assert.equal(result.fullReservedCostMicroUsd, a * apifyAttempts + 11392 * openrouterAttempts);
    assert.equal(result.retryReserveMicroUsd, a * (apifyAttempts - 1) + 11392 * (openrouterAttempts - 1));
    assert.equal(result.existingCapMicroUsd, pages * 120000);
    assert.equal(result.reservedCapViolated, true);
    assert.equal(result.singleAttemptCapViolated, true);
  });
}
test('scenario rounding is per token component, with zero and lower-listing boundaries', () => {
  const r = job({ pages: 1, requestedListings: 1, inputTokens: 1, outputTokens: 1 });
  assert.equal(r.inputCostMicroUsd, 1);
  assert.equal(r.outputCostMicroUsd, 2);
  assert.equal(r.singleAttemptCostMicroUsd, 8053);
  assert.equal(r.reservedCapViolated, false);
  assert.equal(job({ pages: 1, inputTokens: 0, outputTokens: 0 }).openrouterPerAttemptMicroUsd, 0);
  assert.equal(job({ pages: 3, requestedListings: 1 }).credits, 3);
});
test('all full-redemption mixes and all retry combinations match independent integer formulas', () => {
  const expectedCosts = [[2925768, 2994420], [7302978, 7486050], [16057398, 16469310], [26263260, 26949780]];
  for (const a of [1, 2]) for (const o of [1, 2]) {
    const report = catalog({ apifyAttempts: a, openrouterAttempts: o });
    report.plans.forEach((plan, index) => {
      let count = 0;
      for (let n1 = 0; n1 <= plan.credits; n1++) for (let n2 = 0; n2 <= plan.credits / 2; n2++) {
        const remainder = plan.credits - n1 - 2 * n2;
        if (remainder < 0 || remainder % 3 !== 0) continue;
        count++;
        const n3 = remainder / 3;
        const mix = plan.mixes.find(m => m.onePageSearches === n1 && m.twoPageSearches === n2 && m.threePageSearches === n3);
        assert.ok(mix);
        const searches = n1 + n2 + n3;
        assert.equal(mix.costMicroUsd, 288000 * plan.credits * a + searches * (50 * a + 11392 * o));
        assert.equal(mix.meets70PercentForIncludedCostsOnly, BigInt(plan.revenueMicroUsd - mix.costMicroUsd) * 10n >= BigInt(plan.revenueMicroUsd) * 7n);
      }
      assert.equal(plan.mixes.length, count);
      assert.equal(plan.bestCase.costMicroUsd, Math.min(...plan.mixes.map(m => m.costMicroUsd)));
      assert.equal(plan.worstCase.costMicroUsd, Math.max(...plan.mixes.map(m => m.costMicroUsd)));
      if (a === 1 && o === 1) {
        assert.deepEqual([plan.bestCase.costMicroUsd, plan.worstCase.costMicroUsd], expectedCosts[index]);
        assert.equal(plan.allMixesMeet70PercentForIncludedCostsOnly, true);
      }
      if (a === 2) assert.equal(plan.allMixesMeet70PercentForIncludedCostsOnly, false);
    });
  }
});
test('trial costs, exact floor capacities and budget remainders', () => {
  const result = trial({ eligibleUsers: 1000, globalBudgetMicroUsd: 100000000, apifyAttempts: 2, openrouterAttempts: 2 });
  assert.equal(result.singleAttemptTotalMicroUsd, 299442000);
  assert.equal(result.fullReservedTotalMicroUsd, 598884000);
  assert.equal(result.singleAttemptCapacityExcludingUnknownCosts, 333);
  assert.equal(result.reservedCapacityExcludingUnknownCosts, 166);
  for (const budget of [0, 299441, 299442, 299443, 598884, Number.MAX_SAFE_INTEGER]) {
    const r = trial({ eligibleUsers: 0, globalBudgetMicroUsd: budget });
    const capacity = BigInt(r.singleAttemptCapacityExcludingUnknownCosts);
    assert.ok(capacity * 299442n <= BigInt(budget));
    assert.ok((capacity + 1n) * 299442n > BigInt(budget));
  }
});
for (const scenario of [
  { name: 'eligible users fewer than budget capacity', users: 10, budget: 100000000, single: 10, reserved: 10 },
  { name: 'budget capacity fewer than eligible users', users: 1000, budget: 100000000, single: 333, reserved: 166 },
  { name: 'zero eligible users', users: 0, budget: 100000000, single: 0, reserved: 0 },
  { name: 'zero budget', users: 10, budget: 0, single: 0, reserved: 0 }
]) {
  test(`trial eligible capacities: ${scenario.name}`, () => {
    const result = trial({ eligibleUsers: scenario.users, globalBudgetMicroUsd: scenario.budget,
      apifyAttempts: 2, openrouterAttempts: 2 });
    assert.equal(result.singleAttemptEligibleCapacity, scenario.single);
    assert.equal(result.reservedEligibleCapacity, scenario.reserved);
    assert.equal(result.singleAttemptCapacityExcludingUnknownCosts, scenario.budget === 0 ? 0 : 333);
    assert.equal(result.reservedCapacityExcludingUnknownCosts, scenario.budget === 0 ? 0 : 166);
  });
}
test('invalid negative, fractional, missing, extra and oversized inputs reject without echoing input', () => {
  const rejects = (fn: () => unknown) => assert.throws(fn, EconomicsScenarioError);
  for (const input of [null, [], {}, { pages: 0 }, { pages: 4 }, { pages: 1.5 }, { pages: '1' },
    { pages: -1 }, { pages: 1, requestedListings: 37 }, { pages: 2, requestedListings: 73 },
    { pages: 3, requestedListings: 109 }, { pages: 1, requestedListings: 0 },
    { pages: 1, inputTokens: 33281 }, { pages: 1, outputTokens: 2049 },
    { pages: 1, inputTokens: -1 }, { pages: 1, inputTokens: NaN }, { pages: 1, inputTokens: Infinity },
    { pages: 1, outputTokens: 1.5 }, { pages: 1, apifyAttempts: 3 }, { pages: 1, openrouterAttempts: 0 },
    { pages: 1, apifyAttempts: undefined }, { pages: 1, inputTokens: null },
    { pages: 1, includeInDemand: false }, { pages: 1, secret: 'sensitive-sentinel' }]) rejects(() => job(input));
  rejects(() => catalog({ credits: 1000000000 }));
  rejects(() => catalog({ apifyAttempts: -1 }));
  for (const input of [{}, { eligibleUsers: -1, globalBudgetMicroUsd: 1 },
    { eligibleUsers: 1, globalBudgetMicroUsd: -1 }, { eligibleUsers: 1.5, globalBudgetMicroUsd: 1 },
    { eligibleUsers: 1, globalBudgetMicroUsd: Number.MAX_SAFE_INTEGER + 1 }]) rejects(() => trial(input));
  let calls = 0;
  rejects(() => job({ get pages() { calls++; return 1; } }));
  assert.equal(calls, 0);
  rejects(() => job({ pages: 1, transport: () => { calls++; } }));
  assert.equal(calls, 0);
});
test('trial aggregate overflow fails closed with a typed fixed error', () => {
  assert.throws(() => trial({ eligibleUsers: Number.MAX_SAFE_INTEGER, globalBudgetMicroUsd: 0 }),
    (error: unknown) => error instanceof EconomicsScenarioError && error.code === 'OVERFLOW');
});
test('outputs are deeply frozen, deterministic, isolated from execution and contain no authorization', () => {
  function frozen(value: unknown) {
    if (value && typeof value === 'object') {
      assert.ok(Object.isFrozen(value));
      assert.equal(Object.hasOwn(value, 'executionAuthorized'), false);
      Object.values(value).forEach(frozen);
    }
  }
  frozen(PROVISIONAL_ECONOMICS_SCENARIO);
  frozen(job({ pages: 1 })); frozen(catalog()); frozen(trial({ eligibleUsers: 1, globalBudgetMicroUsd: 1000000 }));
  const input = Object.freeze({ pages: 1 });
  assert.deepEqual(job(input), job(input));
  const source = readFileSync('src/server/researchEconomicsScenario.ts', 'utf8');
  assert.deepEqual([...source.matchAll(/from '([^']+)'/g)].map(m => m[1]), ['./researchEconomics']);
  assert.doesNotMatch(source, /\bfetch\s*\(|process\.|console\.|\.rpc\s*\(|setTimeout|Date\.now|Math\.random/);
});
