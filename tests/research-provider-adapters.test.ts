import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildApifyRequest, validateApifyResponse, APIFY_PROJECTION_VERSION, MAX_APIFY_RESPONSE_BYTES } from '../src/server/providers/apifyAdapter';
import { buildOpenRouterRequest, validateOpenRouterResponse, OPENROUTER_PROJECTION_VERSION, MAX_OPENROUTER_RESPONSE_BYTES } from '../src/server/providers/openrouterAdapter';
import { ProviderAdapterError } from '../src/server/providers/adapterContract';
import { PINNED_OPENROUTER_MODEL, MAX_OPENROUTER_INPUT_BYTES, MAX_OPENROUTER_INPUT_TOKENS, MAX_RESEARCH_LISTINGS } from '../src/server/researchEconomics';

// Synthetic contract fixtures only; not assertions about actual Etsy listings.
const request = { keyword: 'paper', pages: 1, maximumListings: 2 };
const at = '2026-10-24T10:00:00.000Z';
const listing = { listingUrl: 'https://www.etsy.com/listing/123/example', title: 'Contract fixture',
  shopName: 'Fixture', price: { amount: '10.50', currency: 'USD' } };
const apify = (listings: unknown[] = [listing]) => JSON.stringify({ schemaVersion: APIFY_PROJECTION_VERSION, listings });
const context = JSON.stringify({ listings: [{ listingId: '123', title: 'Contract fixture' }] });
const response = () => ({ schemaVersion: OPENROUTER_PROJECTION_VERSION, model: PINNED_OPENROUTER_MODEL,
  finishReason: 'stop', usage: { inputTokens: 10, outputTokens: 10 },
  interpretations: [{ listingId: '123', interpretation: 'Consider reviewing the design differences.' }] });
const rejects = (fn: () => unknown) => assert.throws(fn, ProviderAdapterError);

test('adapters produce deterministic pinned offline intents and immutable observations', () => {
  assert.deepEqual(buildApifyRequest(request), buildApifyRequest(request));
  assert.equal(buildApifyRequest(request).executionAuthorized, false);
  assert.equal(buildOpenRouterRequest(context).automaticRetryAllowed, false);
  const out = validateApifyResponse(apify(), request, at);
  assert.equal(out.listings[0].price.value?.amount, '10.50');
  assert.equal(out.listings[0].title.dataClass, 'observed');
  assert.equal(Object.isFrozen(out.listings[0].price.value), true);
  assert.equal(out.wireSchemaVerified, false);
});
test('missing observations remain unavailable, including zero and empty result handling', () => {
  const out = validateApifyResponse(apify([{ listingUrl: listing.listingUrl }]), request, at);
  assert.equal(out.listings[0].price.value, null);
  assert.equal(out.listings[0].title.observationStatus, 'unavailable');
  assert.equal(validateApifyResponse(apify([]), request, at).listings.length, 0);
  assert.equal(validateApifyResponse(apify([{ ...listing, price: { amount: '0', currency: 'USD' } }]), request, at).listings[0].price.value?.amount, '0');
});
for (const change of [{ keyword: '' }, { pages: 4 }, { maximumListings: 37 }, { apifyActor: 'other/actor' },
  { openRouterModel: 'other' }, { extra: true }]) {
  test(`invalid Apify request ${JSON.stringify(change)}`, () => rejects(() => buildApifyRequest({ ...request, ...change })));
}
for (const url of ['http://www.etsy.com/listing/123', 'https://www.etsy.com.evil.test/listing/123',
  'https://user:secret@www.etsy.com/listing/123', 'https://127.0.0.1/listing/123',
  'https://www.etsy.com:443/listing/123', 'https://www.etsy.com/listing/123?secret=x',
  'javascript:alert(1)', 'https://www.etsy.com/listing/123#fragment']) {
  test(`unsafe listing URL rejected: ${url.split(':')[0]} ${url.length}`, () => rejects(() => validateApifyResponse(apify([{ ...listing, listingUrl: url }]), request, at)));
}
for (const row of [{ ...listing, price: 10 }, { ...listing, price: { amount: '-1', currency: 'USD' } },
  { ...listing, price: { amount: '10', currency: null } }, { ...listing, rating: 5 },
  { ...listing, title: '' }, { ...listing, title: 'x'.repeat(501) }, { ...listing, title: 2 }]) {
  test(`malformed listing ${JSON.stringify(row).slice(-75)}`, () => rejects(() => validateApifyResponse(apify([row]), request, at)));
}
test('Apify rejects duplicate rows, response/count limits, unknown envelope and invalid timestamps', () => {
  rejects(() => validateApifyResponse(apify([listing, listing]), request, at));
  rejects(() => validateApifyResponse(apify([listing, listing, listing]), request, at));
  rejects(() => validateApifyResponse(' '.repeat(MAX_APIFY_RESPONSE_BYTES + 1), request, at));
  rejects(() => validateApifyResponse('{"schemaVersion":"raw-actor","listings":[]}', request, at));
  rejects(() => validateApifyResponse(apify(), request, '2026-02-30T00:00:00.000Z'));
});
test('modeled provenance and listing references remain separate from observations', () => {
  const out = validateOpenRouterResponse(JSON.stringify(response()), context, at);
  assert.equal(out.interpretations[0].interpretation.dataClass, 'modeled');
  assert.equal(out.interpretations[0].interpretation.model, PINNED_OPENROUTER_MODEL);
  assert.equal(Object.isFrozen(out.interpretations[0]), true);
  assert.deepEqual(buildOpenRouterRequest(context), buildOpenRouterRequest(context));
});
test('provider-reported input tokens may exceed the estimate up to the economics hard limit', () => {
  const intent = buildOpenRouterRequest(context);
  assert.ok(intent.estimatedInputTokens < MAX_OPENROUTER_INPUT_TOKENS);
  for (const inputTokens of [intent.estimatedInputTokens + 1, MAX_OPENROUTER_INPUT_TOKENS]) {
    const raw = JSON.stringify({ ...response(), usage: { inputTokens, outputTokens: 10 } });
    assert.equal(validateOpenRouterResponse(raw, context, at).usage.inputTokens, inputTokens);
  }
  assert.equal(intent.executionAuthorized, false);
  assert.equal(intent.automaticRetryAllowed, false);
});
test('provider-reported input tokens above the economics hard limit are rejected', () => {
  rejects(() => validateOpenRouterResponse(JSON.stringify({ ...response(),
    usage: { inputTokens: MAX_OPENROUTER_INPUT_TOKENS + 1, outputTokens: 10 } }), context, at));
});
test('provider-reported input usage must be present and a nonnegative safe integer', () => {
  for (const inputTokens of [undefined, null, -1, 1.5, '10', Number.MAX_SAFE_INTEGER + 1]) {
    rejects(() => validateOpenRouterResponse(JSON.stringify({ ...response(),
      usage: { inputTokens, outputTokens: 10 } }), context, at));
  }
  assert.equal(validateOpenRouterResponse(JSON.stringify({ ...response(),
    usage: { inputTokens: 0, outputTokens: 0 } }), context, at).usage.inputTokens, 0);
});
for (const change of [{ model: 'other' }, { finishReason: 'length' }, { finishReason: 'error' },
  { usage: null }, { usage: { inputTokens: -1, outputTokens: 1 } },
  { usage: { inputTokens: 1, outputTokens: 2049 } }, { usage: { inputTokens: 1.5, outputTokens: 1 } },
  { revenue: 1 }, { interpretations: [{ listingId: '999', interpretation: 'Unknown' }] },
  { interpretations: [{ listingId: '123', interpretation: 'Text', sales: 1 }] }]) {
  test(`OpenRouter rejects ${JSON.stringify(change)}`, () => rejects(() => validateOpenRouterResponse(JSON.stringify({ ...response(), ...change }), context, at)));
}
test('OpenRouter rejects duplicate references, missing text, size/token limits and unsafe context', () => {
  const r = response(); r.interpretations.push(r.interpretations[0]);
  rejects(() => validateOpenRouterResponse(JSON.stringify(r), context, at));
  rejects(() => validateOpenRouterResponse('x'.repeat(MAX_OPENROUTER_RESPONSE_BYTES + 1), context, at));
  rejects(() => buildOpenRouterRequest('x'.repeat(MAX_OPENROUTER_INPUT_BYTES + 1)));
  for (const max of [0, -1, 2049, 1.1, NaN, Infinity, '10']) rejects(() => buildOpenRouterRequest(context, max));
  rejects(() => buildOpenRouterRequest(JSON.stringify({ listings: Array(MAX_RESEARCH_LISTINGS + 1).fill({ listingId: '1', title: null }) })));
  rejects(() => buildOpenRouterRequest('{"listings":[],"secret":"do-not-log"}'));
  rejects(() => validateOpenRouterResponse(JSON.stringify({ ...response(), interpretations: [{ listingId: '123' }] }), context, at));
  assert.equal(validateOpenRouterResponse(JSON.stringify({ ...response(), interpretations: [] }), context, at).interpretations.length, 0);
});
test('malformed envelopes fail closed with fixed error messages', () => {
  for (const raw of [null, {}, '', '{', 'null', '[]', '{"__proto__":{}}']) {
    rejects(() => validateApifyResponse(raw, request, at));
    rejects(() => validateOpenRouterResponse(raw, context, at));
  }
  let accessed = false;
  rejects(() => buildApifyRequest({ get keyword() { accessed = true; return 'secret'; } }));
  assert.equal(accessed, false);
  try { buildApifyRequest({ ...request, secret: 'secret-token' }); } catch (error) {
    assert.equal((error as Error).message.includes('secret'), false);
  }
});
test('adapter modules have no execution, credential, legacy analyzer or RPC dependencies', () => {
  for (const name of ['adapterContract', 'apifyAdapter', 'openrouterAdapter']) {
    const source = readFileSync(`src/server/providers/${name}.ts`, 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|process\.env|console\.|supabase|services\/analyzer|researchRpc|axios|node:(?:http|https|child_process)/);
  }
});
