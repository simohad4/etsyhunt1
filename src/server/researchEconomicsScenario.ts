import {
  MAX_RESEARCH_PAGES, MAX_LISTINGS_PER_PAGE, MAX_OPENROUTER_INPUT_TOKENS,
  MAX_OPENROUTER_OUTPUT_TOKENS, MICRO_USD_PER_USD, PROVIDER_BUDGET_MICRO_USD_PER_CREDIT,
  PINNED_APIFY_ACTOR, PINNED_OPENROUTER_MODEL, calculateTokenCostMicroUsd,
  aggregateRetryCostMicroUsd
} from './researchEconomics';

function immutable<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(child => immutable(child));
    Object.freeze(value);
  }
  return value;
}

/** User-supplied scenario, intentionally not a ResearchProviderPricingConfiguration. */
export const PROVISIONAL_ECONOMICS_SCENARIO = immutable({
  mode: 'offline-scenario-only' as const, provenance: 'provisional-user-supplied' as const,
  activationBlocked: true as const, nonActivatable: true as const, totalCostComplete: false as const,
  currency: 'USD' as const, includeInDemand: false as const,
  apify: { actor: PINNED_APIFY_ACTOR, microUsdPerBilledListing: 8_000, microUsdPerStart: 50,
    billedUnitsPerRequestedListingAssumption: 1 },
  openrouter: { model: PINNED_OPENROUTER_MODEL,
    inputMicroUsdPerMillionTokens: 250_000, outputMicroUsdPerMillionTokens: 1_500_000 },
  excludedUnknownCosts: ['demand_enrichment', 'failed_run_billing', 'provider_surcharges'].map(category => ({
    category, status: 'unknown' as const, costMicroUsd: null, excludedFromTotals: true as const
  })),
  otherExclusions: ['infrastructure', 'payment_fees', 'support', 'taxes', 'acquisition']
});

export class EconomicsScenarioError extends Error {
  constructor(public readonly code: 'INVALID_INPUT' | 'OVERFLOW') {
    super(`Offline economics scenario rejected: ${code}.`);
    this.name = 'EconomicsScenarioError';
  }
}
function invalid(): never { throw new EconomicsScenarioError('INVALID_INPUT'); }
function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) invalid();
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!descriptor.enumerable || !('value' in descriptor)) invalid();
  }
  return value as Record<string, unknown>;
}
function integer(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) invalid();
  return value as number;
}
function safe(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new EconomicsScenarioError('OVERFLOW');
  return Number(value);
}
function sum(...values: number[]): number { return safe(values.reduce((a, b) => a + BigInt(b), 0n)); }
const optionKeys = ['inputTokens', 'outputTokens', 'apifyAttempts', 'openrouterAttempts'] as const;
function options(input: Record<string, unknown>) {
  const get = (key: string, fallback: number, min: number, max: number) =>
    integer(Object.hasOwn(input, key) ? input[key] : fallback, min, max);
  return {
    inputTokens: get('inputTokens', MAX_OPENROUTER_INPUT_TOKENS, 0, MAX_OPENROUTER_INPUT_TOKENS),
    outputTokens: get('outputTokens', MAX_OPENROUTER_OUTPUT_TOKENS, 0, MAX_OPENROUTER_OUTPUT_TOKENS),
    apifyAttempts: get('apifyAttempts', 1, 1, 2), openrouterAttempts: get('openrouterAttempts', 1, 1, 2)
  };
}

/** Explicit token-count scenarios, not tokenizer estimates, usage measurements or admission. */
export function calculateResearchEconomicsScenario(input: unknown) {
  const value = record(input, ['pages', 'requestedListings', ...optionKeys]);
  const pages = integer(value.pages, 1, MAX_RESEARCH_PAGES);
  const requestedListings = Object.hasOwn(value, 'requestedListings')
    ? integer(value.requestedListings, 1, pages * MAX_LISTINGS_PER_PAGE) : pages * MAX_LISTINGS_PER_PAGE;
  const settings = options(value);
  const rates = PROVISIONAL_ECONOMICS_SCENARIO;
  const apifyPerAttemptMicroUsd = sum(rates.apify.microUsdPerStart,
    safe(BigInt(requestedListings) * BigInt(rates.apify.microUsdPerBilledListing)));
  const inputCostMicroUsd = calculateTokenCostMicroUsd(settings.inputTokens, rates.openrouter.inputMicroUsdPerMillionTokens);
  const outputCostMicroUsd = calculateTokenCostMicroUsd(settings.outputTokens, rates.openrouter.outputMicroUsdPerMillionTokens);
  const openrouterPerAttemptMicroUsd = sum(inputCostMicroUsd, outputCostMicroUsd);
  const apifyReservedMicroUsd = aggregateRetryCostMicroUsd(apifyPerAttemptMicroUsd, settings.apifyAttempts);
  const openrouterReservedMicroUsd = aggregateRetryCostMicroUsd(openrouterPerAttemptMicroUsd, settings.openrouterAttempts);
  const singleAttemptCostMicroUsd = sum(apifyPerAttemptMicroUsd, openrouterPerAttemptMicroUsd);
  const fullReservedCostMicroUsd = sum(apifyReservedMicroUsd, openrouterReservedMicroUsd);
  const existingCapMicroUsd = pages * PROVIDER_BUDGET_MICRO_USD_PER_CREDIT;
  return immutable({ assumptions: rates, pages, credits: pages, requestedListings, ...settings,
    apifyPerAttemptMicroUsd, inputCostMicroUsd, outputCostMicroUsd, openrouterPerAttemptMicroUsd,
    apifyReservedMicroUsd, openrouterReservedMicroUsd, singleAttemptCostMicroUsd,
    apifyRetryReserveMicroUsd: apifyReservedMicroUsd - apifyPerAttemptMicroUsd,
    openrouterRetryReserveMicroUsd: openrouterReservedMicroUsd - openrouterPerAttemptMicroUsd,
    retryReserveMicroUsd: fullReservedCostMicroUsd - singleAttemptCostMicroUsd, fullReservedCostMicroUsd,
    existingCapMicroUsd, singleAttemptCapViolated: singleAttemptCostMicroUsd > existingCapMicroUsd,
    reservedCapViolated: fullReservedCostMicroUsd > existingCapMicroUsd,
    reservedCapExcessMicroUsd: Math.max(0, fullReservedCostMicroUsd - existingCapMicroUsd)
  });
}

export const PROPOSED_SCENARIO_CATALOG = immutable([
  { name: 'Starter', revenueMicroUsd: 12 * MICRO_USD_PER_USD, credits: 10 },
  { name: 'Growth', revenueMicroUsd: 29 * MICRO_USD_PER_USD, credits: 25 },
  { name: 'Pro', revenueMicroUsd: 59 * MICRO_USD_PER_USD, credits: 55 },
  { name: 'Business', revenueMicroUsd: 99 * MICRO_USD_PER_USD, credits: 90 }
]);

/** Exhaustively enumerate unordered 1/2/3-page mixes; order cannot change additive cost. */
export function auditEconomicsScenarioCatalog(input: unknown = {}) {
  const value = record(input, optionKeys);
  const settings = options(value);
  const jobs = Array.from({ length: MAX_RESEARCH_PAGES }, (_, i) =>
    calculateResearchEconomicsScenario({ pages: i + 1, ...settings }));
  const plans = PROPOSED_SCENARIO_CATALOG.map(plan => {
    const mixes = [];
    for (let threePageSearches = 0; threePageSearches <= Math.floor(plan.credits / 3); threePageSearches++) {
      for (let twoPageSearches = 0; twoPageSearches <= Math.floor((plan.credits - 3 * threePageSearches) / 2); twoPageSearches++) {
        const onePageSearches = plan.credits - 3 * threePageSearches - 2 * twoPageSearches;
        const counts = [onePageSearches, twoPageSearches, threePageSearches];
        const costMicroUsd = safe(counts.reduce((total, count, index) =>
          total + BigInt(count) * BigInt(jobs[index].fullReservedCostMicroUsd), 0n));
        const profitMicroUsd = plan.revenueMicroUsd - costMicroUsd;
        mixes.push({ onePageSearches, twoPageSearches, threePageSearches, costMicroUsd,
          // Exact ratio, not a rounded percentage. Cross-multiply for the 70% decision.
          margin: { numeratorMicroUsd: profitMicroUsd, denominatorMicroUsd: plan.revenueMicroUsd },
          meets70PercentForIncludedCostsOnly: BigInt(profitMicroUsd) * 100n >= BigInt(plan.revenueMicroUsd) * 70n,
          existingCapViolated: counts.some((count, index) => count > 0 && jobs[index].reservedCapViolated) });
      }
    }
    const worstCase = mixes.reduce((a, b) => a.costMicroUsd >= b.costMicroUsd ? a : b);
    const bestCase = mixes.reduce((a, b) => a.costMicroUsd <= b.costMicroUsd ? a : b);
    return { ...plan, mixes, worstCase, bestCase,
      allMixesMeet70PercentForIncludedCostsOnly: mixes.every(m => m.meets70PercentForIncludedCostsOnly) };
  });
  return immutable({ assumptions: PROVISIONAL_ECONOMICS_SCENARIO, settings, plans });
}

/** One full one-page search per eligible user. Capacity excludes all unknown charges. */
export function calculateEconomicsScenarioTrial(input: unknown) {
  const value = record(input, ['eligibleUsers', 'globalBudgetMicroUsd', ...optionKeys]);
  const eligibleUsers = integer(value.eligibleUsers, 0);
  const globalBudgetMicroUsd = integer(value.globalBudgetMicroUsd, 0);
  const job = calculateResearchEconomicsScenario({ pages: 1, ...options(value) });
  const singleAttemptCapacityExcludingUnknownCosts = safe(BigInt(globalBudgetMicroUsd) / BigInt(job.singleAttemptCostMicroUsd));
  const reservedCapacityExcludingUnknownCosts = safe(BigInt(globalBudgetMicroUsd) / BigInt(job.fullReservedCostMicroUsd));
  return immutable({ assumptions: PROVISIONAL_ECONOMICS_SCENARIO, eligibleUsers, globalBudgetMicroUsd, job,
    singleAttemptTotalMicroUsd: safe(BigInt(eligibleUsers) * BigInt(job.singleAttemptCostMicroUsd)),
    fullReservedTotalMicroUsd: safe(BigInt(eligibleUsers) * BigInt(job.fullReservedCostMicroUsd)),
    singleAttemptCapacityExcludingUnknownCosts,
    reservedCapacityExcludingUnknownCosts,
    singleAttemptEligibleCapacity: Math.min(eligibleUsers, singleAttemptCapacityExcludingUnknownCosts),
    reservedEligibleCapacity: Math.min(eligibleUsers, reservedCapacityExcludingUnknownCosts)
  });
}
