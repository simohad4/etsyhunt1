import { MAX_RESEARCH_LISTINGS, PINNED_APIFY_ACTOR, validateResearchRequest } from '../researchEconomics';
import { freeze, integer, json, object, reject, text, timestamp } from './adapterContract';
export { ProviderAdapterError } from './adapterContract';

export const APIFY_PROJECTION_VERSION = 'etsy-listing-projection-v1';
export const MAX_APIFY_RESPONSE_BYTES = 512 * 1024;

/** Intent only: actor input/output schema must be verified before mapping to a wire request. */
export function buildApifyRequest(input: unknown) {
  try {
    object(input, ['keyword', 'pages', 'maximumListings', 'apifyActor', 'openRouterModel']);
    const request = validateResearchRequest(input);
    return freeze({ actor: PINNED_APIFY_ACTOR, keyword: request.keyword, pages: request.pages,
      maximumListings: request.maximumListings, wireSchemaVerified: false as const,
      executionAuthorized: false as const, automaticRetryAllowed: false as const });
  } catch { return reject('INVALID_INPUT'); }
}

function listingUrl(value: unknown): string {
  const raw = text(value, 2048);
  // Deliberately narrow canonical URL grammar; no redirects, credentials, queries or ports.
  if (!/^https:\/\/www\.etsy\.com\/listing\/[1-9][0-9]{0,19}(?:\/[a-zA-Z0-9_-]+)?$/.test(raw)) reject('UNSAFE_URL');
  return raw;
}
function observed<T>(value: T | null, observedAt: string) {
  return { dataClass: 'observed' as const, sourceProvider: 'apify' as const,
    observationStatus: value === null ? 'unavailable' as const : 'reported' as const,
    value, observedAt };
}

/** Accepts a reviewed projection, NOT arbitrary actor dataset rows. No raw-field guessing. */
export function validateApifyResponse(raw: unknown, requestInput: unknown, collectedAt: unknown) {
  const request = buildApifyRequest(requestInput);
  const observedAt = timestamp(collectedAt);
  const envelope = object(json(raw, MAX_APIFY_RESPONSE_BYTES), ['schemaVersion', 'listings']);
  if (envelope.schemaVersion !== APIFY_PROJECTION_VERSION || !Array.isArray(envelope.listings)) reject();
  if (envelope.listings.length > request.maximumListings || envelope.listings.length > MAX_RESEARCH_LISTINGS) reject('SIZE_LIMIT');
  const ids = new Set<string>();
  const listings = envelope.listings.map(row => {
    const item = object(row, ['listingUrl', 'title', 'shopName', 'price']);
    const url = listingUrl(item.listingUrl);
    const id = url.split('/')[4];
    if (ids.has(id)) reject();
    ids.add(id);
    const optionalText = (value: unknown, limit: number) => value === undefined || value === null ? null : text(value, limit);
    let price: { amount: string; currency: string } | null = null;
    if (item.price !== undefined && item.price !== null) {
      const p = object(item.price, ['amount', 'currency']);
      const amount = text(p.amount, 24);
      const currency = text(p.currency, 3);
      if (!/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,4})?$/.test(amount) || !/^[A-Z]{3}$/.test(currency)) reject();
      price = { amount, currency };
    }
    return { id, listingUrl: observed(url, observedAt), title: observed(optionalText(item.title, 500), observedAt),
      shopName: observed(optionalText(item.shopName, 200), observedAt), price: observed(price, observedAt) };
  });
  integer(listings.length, request.maximumListings);
  return freeze({ schemaVersion: APIFY_PROJECTION_VERSION, provider: 'apify' as const,
    actor: PINNED_APIFY_ACTOR, wireSchemaVerified: false as const, listings });
}
