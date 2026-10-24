import { createHash } from 'node:crypto';
import { types } from 'node:util';
import { MAX_RESEARCH_PAGES, MAX_LISTINGS_PER_PAGE, MAX_RESEARCH_LISTINGS,
  MAX_KEYWORD_CHARACTERS, MAX_OPENROUTER_INPUT_BYTES, MAX_OPENROUTER_INPUT_TOKENS, MAX_OPENROUTER_OUTPUT_TOKENS,
  PROVIDER_BUDGET_MICRO_USD_PER_CREDIT, PINNED_APIFY_ACTOR, PINNED_OPENROUTER_MODEL } from './researchEconomics';

export const CANONICAL_INTENT_VERSION = 'research-intent-v1';
export const CANONICAL_ENCODING_VERSION = 'dispatch-canonical-v1';
export const CANONICAL_LIMITS = Object.freeze({ depth: 12, nodes: 4096, bytes: 196608 });
type Tree = null | boolean | number | string | Tree[] | { [key: string]: Tree };
type RecordTree = { [key: string]: Tree };
export class ResearchCanonicalIntentError extends Error {
  constructor(readonly code: 'INVALID_INPUT' | 'LIMIT_EXCEEDED' | 'IDENTITY_MISMATCH' | 'UNSUPPORTED_VERSION') {
    super(code); this.name = 'ResearchCanonicalIntentError';
  }
}
function fail(code: ResearchCanonicalIntentError['code'] = 'INVALID_INPUT'): never {
  throw new ResearchCanonicalIntentError(code);
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const FORBIDDEN = /^(?:__proto__|prototype|constructor|authorization|headers|credentials|apiKey|api_key|token|secret|password|access_token)$/i;

/** Clone data descriptors before schema checks: never invoke getters or toJSON. */
function snapshot(input: unknown): Tree {
  let nodes = 0, bytes = 0;
  const ancestors = new Set<object>();
  function take(value: unknown, depth: number): Tree {
    if (++nodes > CANONICAL_LIMITS.nodes || depth > CANONICAL_LIMITS.depth) fail('LIMIT_EXCEEDED');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value) || Object.is(value, -0)) fail();
      return value;
    }
    if (typeof value === 'string') {
      if (value.length > CANONICAL_LIMITS.bytes || /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) fail();
      bytes += Buffer.byteLength(value, 'utf8');
      if (bytes > CANONICAL_LIMITS.bytes) fail('LIMIT_EXCEEDED');
      return value;
    }
    if (typeof value !== 'object' || types.isProxy(value) || ancestors.has(value)) fail();
    const array = Array.isArray(value);
    if (!array && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail();
    const keys = Reflect.ownKeys(value);
    if (keys.length > CANONICAL_LIMITS.nodes) fail('LIMIT_EXCEEDED');
    ancestors.add(value);
    let result: Tree;
    if (array) {
      if (value.length > CANONICAL_LIMITS.nodes || keys.length !== value.length + 1) fail();
      result = [];
      for (let i = 0; i < value.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail();
        result.push(take(descriptor.value, depth + 1));
      }
    } else {
      const record: RecordTree = Object.create(null) as RecordTree;
      for (const key of keys) {
        if (typeof key !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) || FORBIDDEN.test(key)) fail();
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) fail();
        bytes += key.length;
        if (bytes > CANONICAL_LIMITS.bytes) fail('LIMIT_EXCEEDED');
        record[key] = take(descriptor.value, depth + 1);
      }
      result = record;
    }
    ancestors.delete(value);
    return result;
  }
  return take(input, 0);
}
function encode(value: Tree): string {
  if (value === null) return 'N';
  if (typeof value === 'boolean') return value ? 'B1;' : 'B0;';
  if (typeof value === 'number') return `I${value};`;
  if (typeof value === 'string') return `S${Buffer.byteLength(value, 'utf8')}:${value}`;
  if (Array.isArray(value)) return `A${value.length}:${value.map(encode).join('')}`;
  const keys = Object.keys(value).sort(); // ASCII-only keys: identical to unsigned UTF-8 order.
  return `O${keys.length}:${keys.map(key => encode(key) + encode(value[key])).join('')}`;
}
function boundedEncoding(value: Tree): string {
  const encoded = encode(value);
  if (Buffer.byteLength(encoded, 'utf8') > CANONICAL_LIMITS.bytes) fail('LIMIT_EXCEEDED');
  return encoded;
}
/** Encoding primitive only, not admission or a provider-wire parser. Accepts typed trees, never raw JSON. */
export function encodeCanonicalResearchValue(value: unknown): string {
  return boundedEncoding(snapshot(value));
}
function record(value: Tree | undefined, fields: readonly string[]): RecordTree {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  if (Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key))) fail();
  return value;
}
function integer(value: Tree | undefined, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) fail();
  return value;
}
function text(value: Tree | undefined, max = 128): string {
  if (typeof value !== 'string' || !value.length || Buffer.byteLength(value, 'utf8') > max) fail();
  return value;
}
function uuid(value: Tree | undefined): void { if (!UUID.test(text(value))) fail(); }
function digest(value: Tree | undefined): void { if (!DIGEST.test(text(value))) fail(); }
function version(value: Tree | undefined, expected: string): void {
  if (value !== expected) fail('UNSUPPORTED_VERSION');
}
const SCOPE = ['accountingSubjectId', 'creditAccountId', 'creditGeneration', 'requestId', 'reservationId', 'requestFingerprint'] as const;
function scope(value: Tree | undefined): RecordTree {
  const result = record(value, SCOPE);
  for (const key of SCOPE.slice(0, 2)) uuid(result[key]);
  uuid(result.requestId); uuid(result.reservationId); digest(result.requestFingerprint);
  integer(result.creditGeneration, 0, Number.MAX_SAFE_INTEGER);
  return result;
}
function freeze(value: Tree): void {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
}
function result(value: RecordTree, domain: 'submission-intent-v1' | 'dispatch-operation-v1') {
  const canonical = boundedEncoding(value);
  const hashInput = `${domain}\u0000${canonical}`;
  freeze(value);
  return Object.freeze({ canonical, hashInputHex: Buffer.from(hashInput, 'utf8').toString('hex'),
    digest: createHash('sha256').update(hashInput, 'utf8').digest('hex'),
    encodingVersion: CANONICAL_ENCODING_VERSION, domain,
    activationBlocked: true as const, executionAuthorized: false as const, automaticRetryAllowed: false as const,
    requiresAuthoritativeDatabaseValidation: true as const, provenance: 'synthetic_unverified' as const });
}

/** binding is a second synthetic local snapshot, NOT authenticated database evidence. */
export function canonicalizeResearchIntent(input: unknown, binding: unknown) {
  const root = record(snapshot(input), ['schemaVersion', 'encodingVersion', 'provider', 'operationType', 'scope',
    'attemptId', 'dispatchGeneration', 'pages', 'maximumListings', 'economics', 'payload']);
  version(root.schemaVersion, CANONICAL_INTENT_VERSION); version(root.encodingVersion, CANONICAL_ENCODING_VERSION);
  const ownScope = scope(root.scope), expectedScope = scope(snapshot(binding));
  if (SCOPE.some(key => ownScope[key] !== expectedScope[key])) fail('IDENTITY_MISMATCH');
  uuid(root.attemptId);
  // B3 has no approved later-generation admission policy.
  integer(root.dispatchGeneration, 1, 1);
  const pages = integer(root.pages, 1, MAX_RESEARCH_PAGES);
  const listings = integer(root.maximumListings, 1, Math.min(MAX_RESEARCH_LISTINGS, pages * MAX_LISTINGS_PER_PAGE));
  const economics = record(root.economics, ['pricingVersion', 'pricingSnapshotDigest', 'reservedMicroUsd', 'attemptBudgetMicroUsd',
    'maximumInputTokens', 'maximumOutputTokens']);
  text(economics.pricingVersion); digest(economics.pricingSnapshotDigest);
  const reserved = integer(economics.reservedMicroUsd, 1, pages * PROVIDER_BUDGET_MICRO_USD_PER_CREDIT);
  integer(economics.attemptBudgetMicroUsd, 1, reserved);
  integer(economics.maximumInputTokens, 1, MAX_OPENROUTER_INPUT_TOKENS);
  const outputCap = integer(economics.maximumOutputTokens, 1, MAX_OPENROUTER_OUTPUT_TOKENS);
  if (root.provider === 'apify') {
    if (root.operationType !== 'actor_run') fail();
    const p = record(root.payload, ['schemaVersion', 'actor', 'buildReference', 'body', 'source']);
    version(p.schemaVersion, 'apify-intent-input-v1');
    if (p.actor !== PINNED_APIFY_ACTOR || p.source !== null) fail();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(text(p.buildReference)) || p.buildReference === 'latest') fail();
    const body = record(p.body, ['queries', 'maxPages', 'maxResults', 'sort', 'country', 'includeAds', 'dedupeAcrossQueries', 'includeInDemand']);
    if (!Array.isArray(body.queries) || body.queries.length !== 1) fail();
    if (text(body.queries[0], 800).length > MAX_KEYWORD_CHARACTERS) fail();
    if (body.maxPages !== pages || body.maxResults !== listings || body.sort !== 'score' || body.country !== 'US' ||
      body.includeAds !== true || body.dedupeAcrossQueries !== true || body.includeInDemand !== false) fail();
  } else if (root.provider === 'openrouter') {
    if (root.operationType !== 'chat_completion') fail();
    const p = record(root.payload, ['schemaVersion', 'model', 'promptVersion', 'promptDigest', 'outputSchemaVersion',
      'outputSchemaDigest', 'source', 'body']);
    version(p.schemaVersion, 'openrouter-intent-input-v1');
    if (p.model !== PINNED_OPENROUTER_MODEL) fail();
    text(p.promptVersion); digest(p.promptDigest); text(p.outputSchemaVersion); digest(p.outputSchemaDigest);
    const source = record(p.source, ['attemptId', 'projectionVersion', 'projectionDigest', 'listingIds']);
    uuid(source.attemptId); if (source.attemptId === root.attemptId) fail('IDENTITY_MISMATCH');
    text(source.projectionVersion); digest(source.projectionDigest);
    if (!Array.isArray(source.listingIds) || source.listingIds.length < 1 || source.listingIds.length > listings) fail();
    const ids = source.listingIds.map(id => text(id, 20));
    if (ids.some(id => !/^[1-9][0-9]{0,19}$/.test(id)) || new Set(ids).size !== ids.length) fail();
    const body = record(p.body, ['model', 'messages', 'stream', 'max_completion_tokens', 'routingPolicy', 'outputSchemaDigest']);
    if (body.model !== p.model || body.stream !== false || body.max_completion_tokens !== outputCap ||
      body.routingPolicy !== 'google-ai-studio-only-no-fallback-v1' || body.outputSchemaDigest !== p.outputSchemaDigest) fail();
    if (!Array.isArray(body.messages) || body.messages.length !== 2) fail();
    for (let i = 0; i < 2; i++) {
      const message = record(body.messages[i], ['role', 'content']);
      if (message.role !== (i === 0 ? 'system' : 'user')) fail();
      text(message.content, MAX_OPENROUTER_INPUT_BYTES);
    }
    if (Buffer.byteLength(boundedEncoding(body), 'utf8') > MAX_OPENROUTER_INPUT_BYTES) fail('LIMIT_EXCEEDED');
  } else fail();
  return result(root, 'submission-intent-v1');
}

/** Separate draft operation identity: fencing changes this hash, never immutable intent. */
export function canonicalizeResearchOperation(input: unknown) {
  const root = record(snapshot(input), ['schemaVersion', 'operationType', 'operationId', 'intentDigest',
    'scope', 'attemptId', 'dispatchGeneration', 'claimEpoch', 'expectedRevision']);
  version(root.schemaVersion, 'research-operation-v1');
  if (root.operationType !== 'arm') fail();
  uuid(root.operationId); uuid(root.attemptId); digest(root.intentDigest); scope(root.scope);
  integer(root.dispatchGeneration, 1, 1); integer(root.claimEpoch, 1, Number.MAX_SAFE_INTEGER);
  integer(root.expectedRevision, 0, Number.MAX_SAFE_INTEGER);
  return result(root, 'dispatch-operation-v1');
}
