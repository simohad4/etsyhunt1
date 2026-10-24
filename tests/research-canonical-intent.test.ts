import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canonicalizeResearchIntent as intent, canonicalizeResearchOperation as operation,
  encodeCanonicalResearchValue as encode, ResearchCanonicalIntentError, CANONICAL_LIMITS } from '../src/server/researchCanonicalIntent';

// Fixed expectations generated independently by CPython 3.14 hashlib and a standalone typed-tree encoder.
// This encoder was never imported into production or invoked by these tests.
// canonical is the exact UTF-8 text after the domain+NUL prefix, NOT JSON serialization.
// Fixture builds, prices and source references are synthetic, not verified provider observations.
const GOLDEN = {
  "apify": {
    "canonical": "O11:S9:attemptIdS36:55555555-5555-5555-5555-555555555555S18:dispatchGenerationI1;S9:economicsO6:S21:attemptBudgetMicroUsdI100000;S18:maximumInputTokensI33280;S19:maximumOutputTokensI2048;S21:pricingSnapshotDigestS64:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbS14:pricingVersionS10:fixture-v1S16:reservedMicroUsdI120000;S15:encodingVersionS21:dispatch-canonical-v1S15:maximumListingsI36;S13:operationTypeS9:actor_runS5:pagesI1;S7:payloadO5:S5:actorS30:yumitori/etsy-listings-scraperS4:bodyO8:S7:countryS2:USS19:dedupeAcrossQueriesB1;S10:includeAdsB1;S15:includeInDemandB0;S8:maxPagesI1;S10:maxResultsI36;S7:queriesA1:S8:wall artS4:sortS5:scoreS14:buildReferenceS17:fixture-build-001S13:schemaVersionS21:apify-intent-input-v1S6:sourceNS8:providerS5:apifyS13:schemaVersionS18:research-intent-v1S5:scopeO6:S19:accountingSubjectIdS36:11111111-1111-1111-1111-111111111111S15:creditAccountIdS36:22222222-2222-2222-2222-222222222222S16:creditGenerationI0;S18:requestFingerprintS64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaS9:requestIdS36:33333333-3333-3333-3333-333333333333S13:reservationIdS36:44444444-4444-4444-4444-444444444444",
    "digest": "8798a56adbd5b18e4c9926d6c2ef6c2ce8f82dd272e2c7705788724c30ddf97a"
  },
  "openrouter": {
    "canonical": "O11:S9:attemptIdS36:66666666-6666-6666-6666-666666666666S18:dispatchGenerationI1;S9:economicsO6:S21:attemptBudgetMicroUsdI100000;S18:maximumInputTokensI33280;S19:maximumOutputTokensI2048;S21:pricingSnapshotDigestS64:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbS14:pricingVersionS10:fixture-v1S16:reservedMicroUsdI120000;S15:encodingVersionS21:dispatch-canonical-v1S15:maximumListingsI36;S13:operationTypeS15:chat_completionS5:pagesI1;S7:payloadO8:S4:bodyO6:S21:max_completion_tokensI2048;S8:messagesA2:O2:S7:contentS27:Interpret supplied records.S4:roleS6:systemO2:S7:contentS23:Synthetic records only.S4:roleS4:userS5:modelS28:google/gemini-3.1-flash-liteS18:outputSchemaDigestS64:ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddS13:routingPolicyS36:google-ai-studio-only-no-fallback-v1S6:streamB0;S5:modelS28:google/gemini-3.1-flash-liteS18:outputSchemaDigestS64:ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddS19:outputSchemaVersionS9:schema-v1S12:promptDigestS64:ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccS13:promptVersionS9:prompt-v1S13:schemaVersionS26:openrouter-intent-input-v1S6:sourceO4:S9:attemptIdS36:55555555-5555-5555-5555-555555555555S10:listingIdsA2:S3:123S3:456S16:projectionDigestS64:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeS17:projectionVersionS13:projection-v1S8:providerS10:openrouterS13:schemaVersionS18:research-intent-v1S5:scopeO6:S19:accountingSubjectIdS36:11111111-1111-1111-1111-111111111111S15:creditAccountIdS36:22222222-2222-2222-2222-222222222222S16:creditGenerationI0;S18:requestFingerprintS64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaS9:requestIdS36:33333333-3333-3333-3333-333333333333S13:reservationIdS36:44444444-4444-4444-4444-444444444444",
    "digest": "58e1f4644ca3086232a6c1acbc752785992fc107834885c9ccdaaecb2e519dff"
  },
  "unicode": {
    "canonical": "O2:S1:aA3:S2:éS3:éS4:😀S1:bN",
    "digest": "c12e879e83ff637212d64f8d9a9bbb59be0c50c4509bac3c72a8e398d166212d"
  },
  "reversed": {
    "canonical": "O2:S1:aA3:S4:😀S3:éS2:éS1:bN",
    "digest": "0d3794f5494c97a2ac42c103e5eb9122358578fdc6683e7dec24b22557964d79"
  },
  "omitted": {
    "canonical": "O1:S1:aA3:S2:éS3:éS4:😀",
    "digest": "c243aa256f94795b496bbcd10a49488a571d030263787fc4c8252459e207df6f"
  },
  "operation": {
    "canonical": "O9:S9:attemptIdS36:55555555-5555-5555-5555-555555555555S10:claimEpochI1;S18:dispatchGenerationI1;S16:expectedRevisionI0;S12:intentDigestS64:8798a56adbd5b18e4c9926d6c2ef6c2ce8f82dd272e2c7705788724c30ddf97aS11:operationIdS36:77777777-7777-7777-7777-777777777777S13:operationTypeS3:armS13:schemaVersionS21:research-operation-v1S5:scopeO6:S19:accountingSubjectIdS36:11111111-1111-1111-1111-111111111111S15:creditAccountIdS36:22222222-2222-2222-2222-222222222222S16:creditGenerationI0;S18:requestFingerprintS64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaS9:requestIdS36:33333333-3333-3333-3333-333333333333S13:reservationIdS36:44444444-4444-4444-4444-444444444444",
    "digest": "5d658856618f96a1940b526bfce685afc6de5ba20eb1ee95df569d66cd9c5d81"
  },
  "keyword": {
    "canonical": "O11:S9:attemptIdS36:55555555-5555-5555-5555-555555555555S18:dispatchGenerationI1;S9:economicsO6:S21:attemptBudgetMicroUsdI100000;S18:maximumInputTokensI33280;S19:maximumOutputTokensI2048;S21:pricingSnapshotDigestS64:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbS14:pricingVersionS10:fixture-v1S16:reservedMicroUsdI120000;S15:encodingVersionS21:dispatch-canonical-v1S15:maximumListingsI36;S13:operationTypeS9:actor_runS5:pagesI1;S7:payloadO5:S5:actorS30:yumitori/etsy-listings-scraperS4:bodyO8:S7:countryS2:USS19:dedupeAcrossQueriesB1;S10:includeAdsB1;S15:includeInDemandB0;S8:maxPagesI1;S10:maxResultsI36;S7:queriesA1:S7:ceramicS4:sortS5:scoreS14:buildReferenceS17:fixture-build-001S13:schemaVersionS21:apify-intent-input-v1S6:sourceNS8:providerS5:apifyS13:schemaVersionS18:research-intent-v1S5:scopeO6:S19:accountingSubjectIdS36:11111111-1111-1111-1111-111111111111S15:creditAccountIdS36:22222222-2222-2222-2222-222222222222S16:creditGenerationI0;S18:requestFingerprintS64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaS9:requestIdS36:33333333-3333-3333-3333-333333333333S13:reservationIdS36:44444444-4444-4444-4444-444444444444",
    "digest": "07879c2e58f4d374e8fc942d76f4768281f6953014e6a9460e67532e72ec88c1"
  },
  "build": {
    "canonical": "O11:S9:attemptIdS36:55555555-5555-5555-5555-555555555555S18:dispatchGenerationI1;S9:economicsO6:S21:attemptBudgetMicroUsdI100000;S18:maximumInputTokensI33280;S19:maximumOutputTokensI2048;S21:pricingSnapshotDigestS64:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbS14:pricingVersionS10:fixture-v1S16:reservedMicroUsdI120000;S15:encodingVersionS21:dispatch-canonical-v1S15:maximumListingsI36;S13:operationTypeS9:actor_runS5:pagesI1;S7:payloadO5:S5:actorS30:yumitori/etsy-listings-scraperS4:bodyO8:S7:countryS2:USS19:dedupeAcrossQueriesB1;S10:includeAdsB1;S15:includeInDemandB0;S8:maxPagesI1;S10:maxResultsI36;S7:queriesA1:S8:wall artS4:sortS5:scoreS14:buildReferenceS17:fixture-build-002S13:schemaVersionS21:apify-intent-input-v1S6:sourceNS8:providerS5:apifyS13:schemaVersionS18:research-intent-v1S5:scopeO6:S19:accountingSubjectIdS36:11111111-1111-1111-1111-111111111111S15:creditAccountIdS36:22222222-2222-2222-2222-222222222222S16:creditGenerationI0;S18:requestFingerprintS64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaS9:requestIdS36:33333333-3333-3333-3333-333333333333S13:reservationIdS36:44444444-4444-4444-4444-444444444444",
    "digest": "77ed82dfce518d9d2125cebb46daae32fc613c8c0d15cf3a22cc3158eac3fc17"
  },
  "reservation": {
    "canonical": "O11:S9:attemptIdS36:55555555-5555-5555-5555-555555555555S18:dispatchGenerationI1;S9:economicsO6:S21:attemptBudgetMicroUsdI100000;S18:maximumInputTokensI33280;S19:maximumOutputTokensI2048;S21:pricingSnapshotDigestS64:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbS14:pricingVersionS10:fixture-v1S16:reservedMicroUsdI120000;S15:encodingVersionS21:dispatch-canonical-v1S15:maximumListingsI36;S13:operationTypeS9:actor_runS5:pagesI1;S7:payloadO5:S5:actorS30:yumitori/etsy-listings-scraperS4:bodyO8:S7:countryS2:USS19:dedupeAcrossQueriesB1;S10:includeAdsB1;S15:includeInDemandB0;S8:maxPagesI1;S10:maxResultsI36;S7:queriesA1:S8:wall artS4:sortS5:scoreS14:buildReferenceS17:fixture-build-001S13:schemaVersionS21:apify-intent-input-v1S6:sourceNS8:providerS5:apifyS13:schemaVersionS18:research-intent-v1S5:scopeO6:S19:accountingSubjectIdS36:11111111-1111-1111-1111-111111111111S15:creditAccountIdS36:22222222-2222-2222-2222-222222222222S16:creditGenerationI0;S18:requestFingerprintS64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaS9:requestIdS36:33333333-3333-3333-3333-333333333333S13:reservationIdS36:88888888-8888-8888-8888-888888888888",
    "digest": "84d52d25c53b8c2b2532c85935fcab295719e9fc66286a8a863a50809c80a679"
  },
  "prompt": {
    "canonical": "O11:S9:attemptIdS36:66666666-6666-6666-6666-666666666666S18:dispatchGenerationI1;S9:economicsO6:S21:attemptBudgetMicroUsdI100000;S18:maximumInputTokensI33280;S19:maximumOutputTokensI2048;S21:pricingSnapshotDigestS64:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbS14:pricingVersionS10:fixture-v1S16:reservedMicroUsdI120000;S15:encodingVersionS21:dispatch-canonical-v1S15:maximumListingsI36;S13:operationTypeS15:chat_completionS5:pagesI1;S7:payloadO8:S4:bodyO6:S21:max_completion_tokensI2048;S8:messagesA2:O2:S7:contentS27:Interpret supplied records.S4:roleS6:systemO2:S7:contentS23:Synthetic records only.S4:roleS4:userS5:modelS28:google/gemini-3.1-flash-liteS18:outputSchemaDigestS64:ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddS13:routingPolicyS36:google-ai-studio-only-no-fallback-v1S6:streamB0;S5:modelS28:google/gemini-3.1-flash-liteS18:outputSchemaDigestS64:ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddS19:outputSchemaVersionS9:schema-v1S12:promptDigestS64:ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccS13:promptVersionS9:prompt-v2S13:schemaVersionS26:openrouter-intent-input-v1S6:sourceO4:S9:attemptIdS36:55555555-5555-5555-5555-555555555555S10:listingIdsA2:S3:123S3:456S16:projectionDigestS64:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeS17:projectionVersionS13:projection-v1S8:providerS10:openrouterS13:schemaVersionS18:research-intent-v1S5:scopeO6:S19:accountingSubjectIdS36:11111111-1111-1111-1111-111111111111S15:creditAccountIdS36:22222222-2222-2222-2222-222222222222S16:creditGenerationI0;S18:requestFingerprintS64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaS9:requestIdS36:33333333-3333-3333-3333-333333333333S13:reservationIdS36:44444444-4444-4444-4444-444444444444",
    "digest": "8c7991f3544852e924f7733f4bc86f70b8eed41b4f32f6bca322aa9c6441c92e"
  },
  "projection": {
    "canonical": "O11:S9:attemptIdS36:66666666-6666-6666-6666-666666666666S18:dispatchGenerationI1;S9:economicsO6:S21:attemptBudgetMicroUsdI100000;S18:maximumInputTokensI33280;S19:maximumOutputTokensI2048;S21:pricingSnapshotDigestS64:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbS14:pricingVersionS10:fixture-v1S16:reservedMicroUsdI120000;S15:encodingVersionS21:dispatch-canonical-v1S15:maximumListingsI36;S13:operationTypeS15:chat_completionS5:pagesI1;S7:payloadO8:S4:bodyO6:S21:max_completion_tokensI2048;S8:messagesA2:O2:S7:contentS27:Interpret supplied records.S4:roleS6:systemO2:S7:contentS23:Synthetic records only.S4:roleS4:userS5:modelS28:google/gemini-3.1-flash-liteS18:outputSchemaDigestS64:ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddS13:routingPolicyS36:google-ai-studio-only-no-fallback-v1S6:streamB0;S5:modelS28:google/gemini-3.1-flash-liteS18:outputSchemaDigestS64:ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddS19:outputSchemaVersionS9:schema-v1S12:promptDigestS64:ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccS13:promptVersionS9:prompt-v1S13:schemaVersionS26:openrouter-intent-input-v1S6:sourceO4:S9:attemptIdS36:55555555-5555-5555-5555-555555555555S10:listingIdsA2:S3:123S3:456S16:projectionDigestS64:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffS17:projectionVersionS13:projection-v1S8:providerS10:openrouterS13:schemaVersionS18:research-intent-v1S5:scopeO6:S19:accountingSubjectIdS36:11111111-1111-1111-1111-111111111111S15:creditAccountIdS36:22222222-2222-2222-2222-222222222222S16:creditGenerationI0;S18:requestFingerprintS64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaS9:requestIdS36:33333333-3333-3333-3333-333333333333S13:reservationIdS36:44444444-4444-4444-4444-444444444444",
    "digest": "f1c56e9f39003a07696136ab14c59ffca0de083a3c2c4b7b5bf25ba1b48488bc"
  },
  "array": {
    "canonical": "O11:S9:attemptIdS36:66666666-6666-6666-6666-666666666666S18:dispatchGenerationI1;S9:economicsO6:S21:attemptBudgetMicroUsdI100000;S18:maximumInputTokensI33280;S19:maximumOutputTokensI2048;S21:pricingSnapshotDigestS64:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbS14:pricingVersionS10:fixture-v1S16:reservedMicroUsdI120000;S15:encodingVersionS21:dispatch-canonical-v1S15:maximumListingsI36;S13:operationTypeS15:chat_completionS5:pagesI1;S7:payloadO8:S4:bodyO6:S21:max_completion_tokensI2048;S8:messagesA2:O2:S7:contentS27:Interpret supplied records.S4:roleS6:systemO2:S7:contentS23:Synthetic records only.S4:roleS4:userS5:modelS28:google/gemini-3.1-flash-liteS18:outputSchemaDigestS64:ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddS13:routingPolicyS36:google-ai-studio-only-no-fallback-v1S6:streamB0;S5:modelS28:google/gemini-3.1-flash-liteS18:outputSchemaDigestS64:ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddS19:outputSchemaVersionS9:schema-v1S12:promptDigestS64:ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccS13:promptVersionS9:prompt-v1S13:schemaVersionS26:openrouter-intent-input-v1S6:sourceO4:S9:attemptIdS36:55555555-5555-5555-5555-555555555555S10:listingIdsA2:S3:456S3:123S16:projectionDigestS64:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeS17:projectionVersionS13:projection-v1S8:providerS10:openrouterS13:schemaVersionS18:research-intent-v1S5:scopeO6:S19:accountingSubjectIdS36:11111111-1111-1111-1111-111111111111S15:creditAccountIdS36:22222222-2222-2222-2222-222222222222S16:creditGenerationI0;S18:requestFingerprintS64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaS9:requestIdS36:33333333-3333-3333-3333-333333333333S13:reservationIdS36:44444444-4444-4444-4444-444444444444",
    "digest": "03f3f22d1da3170e9e53141296cb609e6e17d8f8e51749ed77be29916e27cf0a"
  },
  "fence": {
    "canonical": "O9:S9:attemptIdS36:55555555-5555-5555-5555-555555555555S10:claimEpochI2;S18:dispatchGenerationI1;S16:expectedRevisionI0;S12:intentDigestS64:8798a56adbd5b18e4c9926d6c2ef6c2ce8f82dd272e2c7705788724c30ddf97aS11:operationIdS36:77777777-7777-7777-7777-777777777777S13:operationTypeS3:armS13:schemaVersionS21:research-operation-v1S5:scopeO6:S19:accountingSubjectIdS36:11111111-1111-1111-1111-111111111111S15:creditAccountIdS36:22222222-2222-2222-2222-222222222222S16:creditGenerationI0;S18:requestFingerprintS64:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaS9:requestIdS36:33333333-3333-3333-3333-333333333333S13:reservationIdS36:44444444-4444-4444-4444-444444444444",
    "digest": "56444df174671b5c71f8f7ba187ac246e90f9fbcd86367f5975706c96035a37d"
  }
} as const;
const uuid = (n: number) => String(n).repeat(8) + '-' + String(n).repeat(4) + '-' +
  String(n).repeat(4) + '-' + String(n).repeat(4) + '-' + String(n).repeat(12);
function scope() {
  return { accountingSubjectId: uuid(1), creditAccountId: uuid(2), creditGeneration: 0,
    requestId: uuid(3), reservationId: uuid(4), requestFingerprint: 'a'.repeat(64) };
}
function apify() {
  return { schemaVersion: 'research-intent-v1', encodingVersion: 'dispatch-canonical-v1',
    provider: 'apify', operationType: 'actor_run', scope: scope(), attemptId: uuid(5), dispatchGeneration: 1,
    pages: 1, maximumListings: 36,
    economics: { pricingVersion: 'fixture-v1', pricingSnapshotDigest: 'b'.repeat(64),
      reservedMicroUsd: 120000, attemptBudgetMicroUsd: 100000, maximumInputTokens: 33280, maximumOutputTokens: 2048 },
    payload: { schemaVersion: 'apify-intent-input-v1', actor: 'yumitori/etsy-listings-scraper',
      buildReference: 'fixture-build-001', body: { queries: ['wall art'], maxPages: 1, maxResults: 36,
        sort: 'score', country: 'US', includeAds: true, dedupeAcrossQueries: true, includeInDemand: false }, source: null } };
}
function openrouter() {
  return { ...apify(), provider: 'openrouter', operationType: 'chat_completion', attemptId: uuid(6),
    payload: { schemaVersion: 'openrouter-intent-input-v1', model: 'google/gemini-3.1-flash-lite',
      promptVersion: 'prompt-v1', promptDigest: 'c'.repeat(64), outputSchemaVersion: 'schema-v1',
      outputSchemaDigest: 'd'.repeat(64), source: { attemptId: uuid(5), projectionVersion: 'projection-v1',
        projectionDigest: 'e'.repeat(64), listingIds: ['123', '456'] },
      body: { model: 'google/gemini-3.1-flash-lite', messages: [
        { role: 'system', content: 'Interpret supplied records.' }, { role: 'user', content: 'Synthetic records only.' }],
        stream: false, max_completion_tokens: 2048, routingPolicy: 'google-ai-studio-only-no-fallback-v1',
        outputSchemaDigest: 'd'.repeat(64) } } };
}
function arm() {
  return { schemaVersion: 'research-operation-v1', operationType: 'arm', operationId: uuid(7),
    intentDigest: GOLDEN.apify.digest, scope: scope(), attemptId: uuid(5), dispatchGeneration: 1,
    claimEpoch: 1, expectedRevision: 0 };
}
function check(result: ReturnType<typeof intent>, vector: { canonical: string; digest: string }) {
  assert.equal(result.canonical, vector.canonical);
  assert.equal(result.hashInputHex, Buffer.from(result.domain + '\0' + vector.canonical, 'utf8').toString('hex'));
  assert.equal(result.digest, vector.digest);
  assert.ok(Object.isFrozen(result));
  assert.equal(result.activationBlocked, true); assert.equal(result.executionAuthorized, false);
  assert.equal(result.automaticRetryAllowed, false); assert.equal(result.requiresAuthoritativeDatabaseValidation, true);
  assert.equal(result.provenance, 'synthetic_unverified');
}
function rejects(input: unknown, code?: string) {
  assert.throws(() => intent(input, scope()), (error: unknown) => error instanceof ResearchCanonicalIntentError &&
    (!code || error.code === code) && error.message === error.code);
}

test('canonical fixed full Apify, OpenRouter and arm vectors match independent bytes and SHA-256', () => {
  check(intent(apify(), scope()), GOLDEN.apify);
  check(intent(openrouter(), scope()), GOLDEN.openrouter);
  check(operation(arm()), GOLDEN.operation);
});
test('canonical reordering object keys preserves full golden identity without mutating caller data', () => {
  const a = apify();
  const reordered: Record<string, unknown> = Object.fromEntries(Object.entries(a).reverse());
  reordered.scope = Object.fromEntries(Object.entries(a.scope).reverse());
  reordered.payload = { ...a.payload, body: Object.fromEntries(Object.entries(a.payload.body).reverse()) };
  check(intent(reordered, scope()), GOLDEN.apify);
  assert.equal(Object.isFrozen(a), false);
  assert.deepEqual(a, apify());
});
test('canonical meaningful keyword and immutable build changes match independent vectors', () => {
  const keyword = apify(); keyword.payload.body.queries = ['ceramic'];
  check(intent(keyword, scope()), GOLDEN.keyword);
  const build = apify(); build.payload.buildReference = 'fixture-build-002';
  check(intent(build, scope()), GOLDEN.build);
  for (const ref of ['', 'latest', 'build/unsafe']) {
    const x = apify(); x.payload.buildReference = ref; rejects(x);
  }
});
test('canonical Unicode preserves exact scalars and array order with fixed independent vectors', () => {
  const values = [
    { value: { a: ['é', 'e\u0301', '😀'], b: null }, vector: GOLDEN.unicode },
    { value: { a: ['😀', 'e\u0301', 'é'], b: null }, vector: GOLDEN.reversed },
    { value: { a: ['é', 'e\u0301', '😀'] }, vector: GOLDEN.omitted }
  ];
  for (const { value, vector } of values) {
    const canonical = encode(value);
    assert.equal(canonical, vector.canonical);
    assert.equal(createHash('sha256').update('submission-intent-v1\0' + canonical).digest('hex'), vector.digest);
  }
  assert.notEqual(encode('é'), encode('e\u0301'));
  for (const bad of ['\uD800', '\uDC00', 'x\0y']) assert.throws(() => encode(bad), ResearchCanonicalIntentError);
});
test('canonical explicit null differs from omission; required null cannot be omitted or undefined', () => {
  assert.notEqual(GOLDEN.unicode.digest, GOLDEN.omitted.digest);
  const { source: _source, ...payload } = apify().payload;
  rejects({ ...apify(), payload });
  rejects({ ...apify(), payload: { ...apify().payload, source: undefined } });
  rejects({ ...apify(), payload: { ...apify().payload, source: 0 } });
});
test('canonical schema versions reject forward compatibility rather than silently upgrading', () => {
  rejects({ ...apify(), schemaVersion: 'research-intent-v2' }, 'UNSUPPORTED_VERSION');
  rejects({ ...apify(), encodingVersion: 'dispatch-canonical-v2' }, 'UNSUPPORTED_VERSION');
  rejects({ ...apify(), payload: { ...apify().payload, schemaVersion: 'apify-intent-input-v2' } }, 'UNSUPPORTED_VERSION');
  assert.throws(() => operation({ ...arm(), schemaVersion: 'research-operation-v2' }), ResearchCanonicalIntentError);
});
test('canonical invalid numbers, unsafe monetary values and economics cap violations fail closed', () => {
  for (const value of [NaN, Infinity, -Infinity, 1.1, -0, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => encode(value), ResearchCanonicalIntentError);
    rejects({ ...apify(), pages: value });
  }
  for (const [field, value] of [['reservedMicroUsd', 120001], ['reservedMicroUsd', -1], ['attemptBudgetMicroUsd', 120001],
    ['maximumInputTokens', 33281], ['maximumOutputTokens', 2049], ['maximumInputTokens', 0]] as const) {
    rejects({ ...apify(), economics: { ...apify().economics, [field]: value } });
  }
  rejects({ ...apify(), pages: 4 }); rejects({ ...apify(), maximumListings: 37 });
  const query = apify(); query.payload.body.queries = ['x'.repeat(201)]; rejects(query);
});
test('canonical provider and operation separation cannot reclassify a payload or change the pin', () => {
  assert.notEqual(GOLDEN.apify.digest, GOLDEN.openrouter.digest);
  rejects({ ...apify(), provider: 'openrouter' });
  rejects({ ...apify(), operationType: 'chat_completion' });
  rejects({ ...apify(), provider: 'other' });
  const a = apify(); a.payload.actor = 'other/actor'; rejects(a);
  const o = openrouter(); o.payload.model = 'other/model'; rejects(o);
  const mismatch = openrouter(); mismatch.payload.body.model = 'other/model'; rejects(mismatch);
  assert.notEqual(createHash('sha256').update('dispatch-operation-v1\0' + GOLDEN.apify.canonical).digest('hex'), GOLDEN.apify.digest);
});
test('canonical account reservation and fingerprint linkage must match a separate local snapshot', () => {
  for (const field of ['accountingSubjectId', 'creditAccountId', 'requestId', 'reservationId'] as const) {
    rejects({ ...apify(), scope: { ...scope(), [field]: uuid(8) } }, 'IDENTITY_MISMATCH');
  }
  rejects({ ...apify(), scope: { ...scope(), creditGeneration: 1 } }, 'IDENTITY_MISMATCH');
  rejects({ ...apify(), scope: { ...scope(), requestFingerprint: 'f'.repeat(64) } }, 'IDENTITY_MISMATCH');
  const a = apify(); a.scope.reservationId = uuid(8);
  check(intent(a, a.scope), GOLDEN.reservation); // matching synthetic binding, never proof of DB ownership.
  rejects({ ...apify(), attemptId: 'NOT-UUID' });
  rejects({ ...apify(), scope: { ...scope(), requestId: uuid(3).toUpperCase() + ' ' } });
});
test('canonical generation cannot imply retries and mutable fencing belongs only to operation identity', () => {
  for (const generation of [0, 2, -1]) rejects({ ...apify(), dispatchGeneration: generation });
  rejects({ ...apify(), claimEpoch: 1 });
  rejects({ ...apify(), operationId: uuid(7) });
  check(operation({ ...arm(), claimEpoch: 2 }), GOLDEN.fence);
  check(intent(apify(), scope()), GOLDEN.apify);
  assert.throws(() => operation({ ...arm(), claimEpoch: 0 }), ResearchCanonicalIntentError);
});
test('canonical prompt, projection digest and listing-array changes match independent vectors', () => {
  const prompt = openrouter(); prompt.payload.promptVersion = 'prompt-v2';
  check(intent(prompt, scope()), GOLDEN.prompt);
  const projection = openrouter(); projection.payload.source.projectionDigest = 'f'.repeat(64);
  check(intent(projection, scope()), GOLDEN.projection);
  const array = openrouter(); array.payload.source.listingIds.reverse();
  check(intent(array, scope()), GOLDEN.array);
});
test('canonical OpenRouter rejects missing or inconsistent source prerequisite references', () => {
  for (const source of [null, undefined, {}, { ...openrouter().payload.source, projectionDigest: '' },
    { ...openrouter().payload.source, listingIds: ['123', '123'] },
    { ...openrouter().payload.source, attemptId: uuid(6) }]) {
    rejects({ ...openrouter(), payload: { ...openrouter().payload, source } });
  }
  const o = openrouter(); o.payload.body.stream = true; rejects(o);
  rejects({ ...openrouter(), payload: { ...openrouter().payload, source: {
    ...openrouter().payload.source, validated: true } } });
});
test('canonical unknown secret-bearing and prototype-sensitive fields are rejected without leaking values', () => {
  for (const field of ['Authorization', 'apiKey', 'headers', 'secret', 'constructor', '__proto__', 'unexpected']) {
    const a = { ...apify(), [field]: 'synthetic-sensitive-value' };
    rejects(a);
    assert.throws(() => intent(a, scope()), error => error instanceof Error && !error.message.includes('synthetic-sensitive-value'));
  }
  rejects(JSON.parse('{"schemaVersion":"v1","schemaVersion":"v2"}')); // wrong shape; never accepts raw JSON as a parser.
  rejects('{"schemaVersion":"v1","schemaVersion":"v1"}');
  rejects({ ...apify(), payload: { ...apify().payload, body: { ...apify().payload.body, includeDemand: false } } });
});
test('canonical unsupported objects accessors symbols sparse arrays and cycles fail without invoking callbacks', () => {
  let invoked = false;
  const getter = Object.defineProperty({}, 'x', { enumerable: true, get() { invoked = true; return 1; } });
  const hidden = Object.defineProperty({}, 'x', { enumerable: false, value: 1 });
  const cycle: { self?: unknown } = {}; cycle.self = cycle;
  for (const value of [undefined, () => 1, 1n, Symbol('x'), new Date(), new Map(), getter, hidden,
    { [Symbol('x')]: 1 }, Array(2), cycle, new Proxy({}, { ownKeys() { invoked = true; return []; } }),
    { toJSON() { invoked = true; return {}; } }]) {
    assert.throws(() => encode(value), ResearchCanonicalIntentError);
  }
  assert.equal(invoked, false);
});
test('canonical bounded depth nodes text and total encoding prevent oversized payload hashes', () => {
  let nested: unknown = null;
  for (let i = 0; i < CANONICAL_LIMITS.depth + 1; i++) nested = { nested };
  assert.throws(() => encode(nested), ResearchCanonicalIntentError);
  assert.throws(() => encode(Array(CANONICAL_LIMITS.nodes + 1).fill(0)), ResearchCanonicalIntentError);
  assert.throws(() => encode('x'.repeat(CANONICAL_LIMITS.bytes + 1)), ResearchCanonicalIntentError);
  const o = openrouter(); o.payload.body.messages[1].content = 'x'.repeat(98304); rejects(o, 'LIMIT_EXCEEDED');
});
test('canonical module contains no transports side effects credentials environment or runtime protocol wiring', () => {
  const source = readFileSync('src/server/researchCanonicalIntent.ts', 'utf8');
  assert.doesNotMatch(source, /\b(?:fetch|setTimeout|setInterval)\s*\(|process\.env|from\s+['"][^'"]*(?:supabase|analyzer|researchRpc|researchDispatchProtocol|http|https)['"]/);
  assert.match(source, /from 'node:crypto'/);
});
