import { createHash } from 'node:crypto';

export const RESEARCH_REQUEST_SCHEMA_VERSION = 'research-request-v1';
export const RESEARCH_PRICING_VERSION = '2026-10-11.unverified-v1';
export const PINNED_APIFY_ACTOR = 'yumitori/etsy-listings-scraper';
export const PINNED_OPENROUTER_MODEL = 'google/gemini-3.1-flash-lite';

export const MAX_RESEARCH_PAGES = 3;
export const MAX_LISTINGS_PER_PAGE = 36;
export const MAX_RESEARCH_LISTINGS = MAX_RESEARCH_PAGES * MAX_LISTINGS_PER_PAGE;
export const MAX_KEYWORD_CHARACTERS = 200;
export const MAX_OPENROUTER_INPUT_BYTES = 96 * 1024;
export const MAX_OPENROUTER_OUTPUT_TOKENS = 2_048;
export const OPENROUTER_PROMPT_OVERHEAD_TOKENS = 512;
export const MAX_OPENROUTER_INPUT_TOKENS =
  OPENROUTER_PROMPT_OVERHEAD_TOKENS + Math.ceil(MAX_OPENROUTER_INPUT_BYTES / 3);
export const MICRO_USD_PER_USD = 1_000_000;
export const PROVIDER_BUDGET_MICRO_USD_PER_CREDIT = 120_000;

export const DEFAULT_RETRY_POLICY = Object.freeze({
  apifyMaxAttempts: 2,
  openRouterMaxAttempts: 2
});

export type PricingProvenance = 'estimated' | 'reported' | 'verified';
export type ResearchDataClass = 'observed' | 'modeled' | 'demo';

export interface PricingEvidence {
  provenance: PricingProvenance;
  sourceReference: string;
  verifiedAt: string | null;
}

export interface ApifyPricingConfiguration extends PricingEvidence {
  provider: 'apify';
  actor: typeof PINNED_APIFY_ACTOR;
  billingUnit: 'actor-result';
  billingUnitAssumption: string;
  billableUnitsPerRequestedListing: number;
  microUsdPerBillingUnit: number | null;
  fixedRunMicroUsd: number | null;
}

export interface OpenRouterPricingConfiguration extends PricingEvidence {
  provider: 'openrouter';
  model: typeof PINNED_OPENROUTER_MODEL;
  inputMicroUsdPerMillionTokens: number | null;
  outputMicroUsdPerMillionTokens: number | null;
}

export interface ResearchProviderPricingConfiguration {
  version: string;
  currency: 'USD';
  effectiveFrom: string;
  expiresAt: string | null;
  activationBlocked: boolean;
  apify: ApifyPricingConfiguration;
  openRouter: OpenRouterPricingConfiguration;
}

/**
 * The checked-in rate card deliberately contains no guessed provider prices.
 * Activation stays blocked until official terms for both providers are reviewed,
 * recorded, given an expiry, and marked verified in a later slice.
 */
export const CURRENT_RESEARCH_PROVIDER_PRICING: ResearchProviderPricingConfiguration = Object.freeze({
  version: RESEARCH_PRICING_VERSION,
  currency: 'USD',
  effectiveFrom: '2026-10-11T00:00:00.000Z',
  expiresAt: null,
  activationBlocked: true,
  apify: Object.freeze({
    provider: 'apify',
    actor: PINNED_APIFY_ACTOR,
    billingUnit: 'actor-result',
    billingUnitAssumption:
      'Assumes at most one billable actor result per requested listing plus a fixed run charge; official actor billing terms are unverified.',
    billableUnitsPerRequestedListing: 1,
    microUsdPerBillingUnit: null,
    fixedRunMicroUsd: null,
    provenance: 'estimated',
    sourceReference: 'Official Apify actor pricing has not been verified.',
    verifiedAt: null
  }),
  openRouter: Object.freeze({
    provider: 'openrouter',
    model: PINNED_OPENROUTER_MODEL,
    inputMicroUsdPerMillionTokens: null,
    outputMicroUsdPerMillionTokens: null,
    provenance: 'estimated',
    sourceReference: 'Official OpenRouter model pricing and availability have not been verified.',
    verifiedAt: null
  })
});

export interface BoundedResearchRequest {
  schemaVersion: typeof RESEARCH_REQUEST_SCHEMA_VERSION;
  keyword: string;
  canonicalKeyword: string;
  pages: number;
  maximumListings: number;
  apifyActor: typeof PINNED_APIFY_ACTOR;
  openRouterModel: typeof PINNED_OPENROUTER_MODEL;
}

export type ResearchDataPoint<T> =
  | {
      dataClass: 'observed';
      value: T;
      observationStatus: 'reported';
      sourceProvider: 'apify';
      observedAt: string;
    }
  | {
      dataClass: 'observed';
      value: null;
      observationStatus: 'unavailable';
      sourceProvider: 'apify';
      observedAt: string;
    }
  | {
      dataClass: 'modeled';
      value: T;
      sourceProvider: 'openrouter';
      model: typeof PINNED_OPENROUTER_MODEL;
      generatedAt: string;
    }
  | {
      dataClass: 'demo';
      value: T;
      demoDatasetId: string;
    };

export interface ResearchRetryPolicy {
  apifyMaxAttempts: number;
  openRouterMaxAttempts: number;
}

export interface ProviderCostBreakdown {
  provider: 'apify' | 'openrouter';
  pricingVersion: string;
  provenance: PricingProvenance;
  attempts: number;
  perAttemptMicroUsd: number;
  retryReserveMicroUsd: number;
  totalMicroUsd: number;
  assumptions: readonly string[];
}

export interface ResearchJobCostEstimate {
  pricingVersion: string;
  currency: 'USD';
  creditsRequired: number;
  providerBudgetMicroUsd: number;
  estimatedProviderCostMicroUsd: number;
  openRouterInputTokens: number;
  openRouterMaximumOutputTokens: number;
  breakdown: {
    apify: ProviderCostBreakdown;
    openRouter: ProviderCostBreakdown;
  };
}

export type ResearchEconomicsErrorCode =
  | 'INVALID_REQUEST'
  | 'PROVIDER_MISMATCH'
  | 'PRICING_MISSING'
  | 'PRICING_UNVERIFIED'
  | 'PRICING_NOT_EFFECTIVE'
  | 'PRICING_EXPIRED'
  | 'ACTIVATION_BLOCKED'
  | 'BUDGET_EXCEEDED'
  | 'ARITHMETIC_OVERFLOW';

export class ResearchEconomicsError extends Error {
  constructor(
    public readonly code: ResearchEconomicsErrorCode,
    message: string,
    public readonly details: Readonly<Record<string, number | string>> = {}
  ) {
    super(message);
    this.name = 'ResearchEconomicsError';
  }
}

const REQUEST_KEYS = new Set([
  'keyword',
  'pages',
  'maximumListings',
  'apifyActor',
  'openRouterModel'
]);

function fail(code: ResearchEconomicsErrorCode, message: string): never {
  throw new ResearchEconomicsError(code, message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireSafeInteger(value: unknown, name: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    fail('INVALID_REQUEST', `${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value as number;
}

function requirePricingInteger(value: number | null, name: string): number {
  if (value === null || !Number.isSafeInteger(value) || value < 0) {
    fail('PRICING_MISSING', `${name} must be configured as a non-negative integer micro-USD value.`);
  }
  return value;
}

function requirePositivePricingInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    fail('PRICING_MISSING', `${name} must be configured as a positive integer.`);
  }
  return value;
}

function parseTimestamp(value: string | null, name: string): number {
  if (!value) fail('PRICING_MISSING', `${name} is required.`);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) fail('PRICING_MISSING', `${name} must be a valid timestamp.`);
  return timestamp;
}

function safeBigIntToNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail('ARITHMETIC_OVERFLOW', 'The calculated micro-USD amount exceeds the safe integer range.');
  }
  return Number(value);
}

function multiplySafeIntegers(value: number, multiplier: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || !Number.isSafeInteger(multiplier) || multiplier < 0) {
    fail('INVALID_REQUEST', 'Micro-USD multiplication requires non-negative safe integers.');
  }
  return safeBigIntToNumber(BigInt(value) * BigInt(multiplier));
}

export function calculateTokenCostMicroUsd(
  tokenCount: number,
  rateMicroUsdPerMillionTokens: number
): number {
  requireSafeInteger(tokenCount, 'tokenCount', 0, Number.MAX_SAFE_INTEGER);
  requireSafeInteger(
    rateMicroUsdPerMillionTokens,
    'rateMicroUsdPerMillionTokens',
    0,
    Number.MAX_SAFE_INTEGER
  );
  if (tokenCount === 0 || rateMicroUsdPerMillionTokens === 0) return 0;

  const numerator = BigInt(tokenCount) * BigInt(rateMicroUsdPerMillionTokens);
  return safeBigIntToNumber((numerator + 999_999n) / 1_000_000n);
}

/** Conservative deterministic estimate; provider-reported tokens remain authoritative after a call. */
export function estimateTokenCountFromUtf8(value: string): number {
  if (typeof value !== 'string') fail('INVALID_REQUEST', 'Token estimation input must be a string.');
  const byteLength = Buffer.byteLength(value, 'utf8');
  return byteLength === 0 ? 0 : Math.ceil(byteLength / 3);
}

export function estimateOpenRouterInputTokens(value: string): number {
  const estimatedTokens = estimateTokenCountFromUtf8(value);
  const byteLength = Buffer.byteLength(value, 'utf8');
  if (byteLength > MAX_OPENROUTER_INPUT_BYTES) {
    fail('INVALID_REQUEST', `OpenRouter input must not exceed ${MAX_OPENROUTER_INPUT_BYTES} UTF-8 bytes.`);
  }
  return OPENROUTER_PROMPT_OVERHEAD_TOKENS + estimatedTokens;
}

export function aggregateRetryCostMicroUsd(perAttemptMicroUsd: number, maximumAttempts: number): number {
  requireSafeInteger(perAttemptMicroUsd, 'perAttemptMicroUsd', 0, Number.MAX_SAFE_INTEGER);
  requireSafeInteger(maximumAttempts, 'maximumAttempts', 1, 2);
  return multiplySafeIntegers(perAttemptMicroUsd, maximumAttempts);
}

export function validateResearchRequest(value: unknown): BoundedResearchRequest {
  if (!isPlainObject(value)) fail('INVALID_REQUEST', 'Research request must be a JSON object.');

  for (const key of Object.keys(value)) {
    if (!REQUEST_KEYS.has(key)) fail('INVALID_REQUEST', `Unexpected research request field: ${key}.`);
  }

  if (typeof value.keyword !== 'string') fail('INVALID_REQUEST', 'keyword must be a string.');
  if (/[\u0000-\u001f\u007f]/u.test(value.keyword)) {
    fail('INVALID_REQUEST', 'keyword must not contain control characters.');
  }

  const keyword = value.keyword.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  const keywordLength = Array.from(keyword).length;
  if (keywordLength < 1 || keywordLength > MAX_KEYWORD_CHARACTERS) {
    fail('INVALID_REQUEST', `keyword must contain 1 to ${MAX_KEYWORD_CHARACTERS} characters.`);
  }

  const pages = requireSafeInteger(value.pages, 'pages', 1, MAX_RESEARCH_PAGES);
  const maximumListings = requireSafeInteger(
    value.maximumListings,
    'maximumListings',
    1,
    pages * MAX_LISTINGS_PER_PAGE
  );

  if (value.apifyActor !== undefined && value.apifyActor !== PINNED_APIFY_ACTOR) {
    fail('PROVIDER_MISMATCH', `Apify actor must be ${PINNED_APIFY_ACTOR}.`);
  }
  if (value.openRouterModel !== undefined && value.openRouterModel !== PINNED_OPENROUTER_MODEL) {
    fail('PROVIDER_MISMATCH', `OpenRouter model must be ${PINNED_OPENROUTER_MODEL}.`);
  }

  return Object.freeze({
    schemaVersion: RESEARCH_REQUEST_SCHEMA_VERSION,
    keyword,
    canonicalKeyword: keyword.toLowerCase(),
    pages,
    maximumListings,
    apifyActor: PINNED_APIFY_ACTOR,
    openRouterModel: PINNED_OPENROUTER_MODEL
  });
}

function validateRetryPolicy(policy: ResearchRetryPolicy): ResearchRetryPolicy {
  return Object.freeze({
    apifyMaxAttempts: requireSafeInteger(policy.apifyMaxAttempts, 'apifyMaxAttempts', 1, 2),
    openRouterMaxAttempts: requireSafeInteger(
      policy.openRouterMaxAttempts,
      'openRouterMaxAttempts',
      1,
      2
    )
  });
}

export function createResearchRequestFingerprint(
  request: BoundedResearchRequest,
  pricingVersion: string,
  retryPolicy: ResearchRetryPolicy = DEFAULT_RETRY_POLICY
): string {
  if (!pricingVersion.trim()) fail('PRICING_MISSING', 'pricingVersion is required for idempotency.');
  const validatedRetryPolicy = validateRetryPolicy(retryPolicy);
  const canonicalPayload = JSON.stringify([
    request.schemaVersion,
    request.canonicalKeyword,
    request.pages,
    request.maximumListings,
    request.apifyActor,
    request.openRouterModel,
    pricingVersion,
    validatedRetryPolicy.apifyMaxAttempts,
    validatedRetryPolicy.openRouterMaxAttempts
  ]);
  return createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
}

export function assertProviderPricingReady(
  pricing: ResearchProviderPricingConfiguration | null | undefined,
  now = new Date()
): asserts pricing is ResearchProviderPricingConfiguration {
  if (!pricing) fail('PRICING_MISSING', 'Research provider pricing is not configured.');
  if (!pricing.version.trim() || pricing.currency !== 'USD') {
    fail('PRICING_MISSING', 'Pricing version and USD currency are required.');
  }
  if (pricing.apify.provider !== 'apify' || pricing.apify.billingUnit !== 'actor-result') {
    fail('PROVIDER_MISMATCH', 'Apify pricing provider or billing unit is unsupported.');
  }
  if (pricing.openRouter.provider !== 'openrouter') {
    fail('PROVIDER_MISMATCH', 'OpenRouter pricing provider is unsupported.');
  }
  if (pricing.apify.actor !== PINNED_APIFY_ACTOR) {
    fail('PROVIDER_MISMATCH', `Pricing must target Apify actor ${PINNED_APIFY_ACTOR}.`);
  }
  if (pricing.openRouter.model !== PINNED_OPENROUTER_MODEL) {
    fail('PROVIDER_MISMATCH', `Pricing must target OpenRouter model ${PINNED_OPENROUTER_MODEL}.`);
  }

  requirePricingInteger(pricing.apify.microUsdPerBillingUnit, 'Apify billing-unit price');
  requirePricingInteger(pricing.apify.fixedRunMicroUsd, 'Apify fixed run price');
  requirePositivePricingInteger(
    pricing.apify.billableUnitsPerRequestedListing,
    'Apify billable units per requested listing'
  );
  requirePricingInteger(
    pricing.openRouter.inputMicroUsdPerMillionTokens,
    'OpenRouter input-token price'
  );
  requirePricingInteger(
    pricing.openRouter.outputMicroUsdPerMillionTokens,
    'OpenRouter output-token price'
  );

  if (pricing.activationBlocked) {
    fail('ACTIVATION_BLOCKED', 'Research activation is blocked by the pricing configuration.');
  }
  if (pricing.apify.provenance !== 'verified' || pricing.openRouter.provenance !== 'verified') {
    fail('PRICING_UNVERIFIED', 'Both provider prices must have verified provenance.');
  }
  if (!pricing.apify.sourceReference.trim() || !pricing.openRouter.sourceReference.trim()) {
    fail('PRICING_UNVERIFIED', 'Verified provider pricing must include source references.');
  }

  const nowTimestamp = now.getTime();
  if (!Number.isFinite(nowTimestamp)) fail('INVALID_REQUEST', 'now must be a valid date.');
  const effectiveFrom = parseTimestamp(pricing.effectiveFrom, 'pricing effectiveFrom');
  const expiresAt = parseTimestamp(pricing.expiresAt, 'pricing expiresAt');
  const apifyVerifiedAt = parseTimestamp(pricing.apify.verifiedAt, 'Apify verifiedAt');
  const openRouterVerifiedAt = parseTimestamp(pricing.openRouter.verifiedAt, 'OpenRouter verifiedAt');

  if (effectiveFrom > nowTimestamp || apifyVerifiedAt > nowTimestamp || openRouterVerifiedAt > nowTimestamp) {
    fail('PRICING_NOT_EFFECTIVE', 'Research provider pricing is not yet effective.');
  }
  if (expiresAt <= effectiveFrom) {
    fail('PRICING_EXPIRED', 'Research provider pricing expires before or when it becomes effective.');
  }
  if (expiresAt <= nowTimestamp) fail('PRICING_EXPIRED', 'Research provider pricing has expired.');
}

export function estimateResearchJobCost(input: {
  request: BoundedResearchRequest;
  openRouterInput: string;
  maximumOutputTokens?: number;
  retryPolicy?: ResearchRetryPolicy;
  pricing: ResearchProviderPricingConfiguration | null | undefined;
  now?: Date;
}): ResearchJobCostEstimate {
  const retryPolicy = validateRetryPolicy(input.retryPolicy ?? DEFAULT_RETRY_POLICY);
  assertProviderPricingReady(input.pricing, input.now);
  const pricing = input.pricing;

  if (
    input.request.apifyActor !== pricing.apify.actor ||
    input.request.openRouterModel !== pricing.openRouter.model
  ) {
    fail('PROVIDER_MISMATCH', 'Research request providers do not match the verified price configuration.');
  }

  const maximumOutputTokens = requireSafeInteger(
    input.maximumOutputTokens ?? MAX_OPENROUTER_OUTPUT_TOKENS,
    'maximumOutputTokens',
    1,
    MAX_OPENROUTER_OUTPUT_TOKENS
  );
  const openRouterInputTokens = estimateOpenRouterInputTokens(input.openRouterInput);

  const apifyUnitPrice = requirePricingInteger(
    pricing.apify.microUsdPerBillingUnit,
    'Apify billing-unit price'
  );
  const apifyFixedRunPrice = requirePricingInteger(
    pricing.apify.fixedRunMicroUsd,
    'Apify fixed run price'
  );
  const billableUnits = multiplySafeIntegers(
    input.request.maximumListings,
    pricing.apify.billableUnitsPerRequestedListing
  );
  const apifyPerAttempt = safeBigIntToNumber(
    BigInt(apifyFixedRunPrice) + BigInt(apifyUnitPrice) * BigInt(billableUnits)
  );
  const apifyTotal = aggregateRetryCostMicroUsd(apifyPerAttempt, retryPolicy.apifyMaxAttempts);

  const openRouterInputCost = calculateTokenCostMicroUsd(
    openRouterInputTokens,
    requirePricingInteger(
      pricing.openRouter.inputMicroUsdPerMillionTokens,
      'OpenRouter input-token price'
    )
  );
  const openRouterOutputCost = calculateTokenCostMicroUsd(
    maximumOutputTokens,
    requirePricingInteger(
      pricing.openRouter.outputMicroUsdPerMillionTokens,
      'OpenRouter output-token price'
    )
  );
  const openRouterPerAttempt = safeBigIntToNumber(
    BigInt(openRouterInputCost) + BigInt(openRouterOutputCost)
  );
  const openRouterTotal = aggregateRetryCostMicroUsd(
    openRouterPerAttempt,
    retryPolicy.openRouterMaxAttempts
  );

  const estimatedProviderCostMicroUsd = safeBigIntToNumber(
    BigInt(apifyTotal) + BigInt(openRouterTotal)
  );
  const creditsRequired = input.request.pages;
  const providerBudgetMicroUsd = multiplySafeIntegers(
    creditsRequired,
    PROVIDER_BUDGET_MICRO_USD_PER_CREDIT
  );

  if (estimatedProviderCostMicroUsd > providerBudgetMicroUsd) {
    throw new ResearchEconomicsError(
      'BUDGET_EXCEEDED',
      'Worst-case retry-inclusive provider cost exceeds the per-job spending limit.',
      { estimatedProviderCostMicroUsd, providerBudgetMicroUsd }
    );
  }

  return Object.freeze({
    pricingVersion: pricing.version,
    currency: 'USD',
    creditsRequired,
    providerBudgetMicroUsd,
    estimatedProviderCostMicroUsd,
    openRouterInputTokens,
    openRouterMaximumOutputTokens: maximumOutputTokens,
    breakdown: Object.freeze({
      apify: Object.freeze({
        provider: 'apify',
        pricingVersion: pricing.version,
        provenance: pricing.apify.provenance,
        attempts: retryPolicy.apifyMaxAttempts,
        perAttemptMicroUsd: apifyPerAttempt,
        retryReserveMicroUsd: apifyTotal - apifyPerAttempt,
        totalMicroUsd: apifyTotal,
        assumptions: Object.freeze([
          pricing.apify.billingUnitAssumption,
          `Estimate uses ${billableUnits} maximum ${pricing.apify.billingUnit} units per attempt.`
        ])
      }),
      openRouter: Object.freeze({
        provider: 'openrouter',
        pricingVersion: pricing.version,
        provenance: pricing.openRouter.provenance,
        attempts: retryPolicy.openRouterMaxAttempts,
        perAttemptMicroUsd: openRouterPerAttempt,
        retryReserveMicroUsd: openRouterTotal - openRouterPerAttempt,
        totalMicroUsd: openRouterTotal,
        assumptions: Object.freeze([
          'Input tokens use a conservative UTF-8 byte estimate plus fixed prompt overhead.',
          'Output cost reserves the configured maximum output token count.'
        ])
      })
    })
  });
}
