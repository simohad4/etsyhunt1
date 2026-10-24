import { buildApifyRequest, validateApifyResponse, APIFY_PROJECTION_VERSION, MAX_APIFY_RESPONSE_BYTES } from './apifyAdapter';
import { freeze, integer, json, object, reject, text } from './adapterContract';
import { block, guarded, WIRE_DRAFT_SAFETY } from './wireDraftContract';

/** Published input names, with deliberately fixed baseline policy. No endpoint or credentials. */
export function buildApifyWireDraft(input: unknown) {
  return guarded('INVALID_INPUT', () => {
    const request = buildApifyRequest(input);
    if (/https?:\/\/|www\./i.test(request.keyword)) reject();
    return freeze({ ...WIRE_DRAFT_SAFETY, actor: request.actor, actorBuild: null,
      body: { queries: [request.keyword], maxPages: request.pages, maxResults: request.maximumListings,
        sort: 'score' as const, country: 'US' as const, includeInDemand: false as const,
        includeAds: true as const, dedupeAcrossQueries: true as const } });
  });
}

/** completion is a synthetic harness assertion, NOT a documented actor response field.
 * Short/partial datasets are unsupported here even if a future actor could exhaust results.
 */
export function mapApifyWireDraft(rawJson: unknown, input: unknown, collectedAt: unknown, completion: unknown) {
  return guarded('INVALID_RESPONSE', () => {
    const draft = buildApifyWireDraft(input);
    if (completion !== 'complete') block('BLOCKED_OUTCOME');
    const rows = json(rawJson, MAX_APIFY_RESPONSE_BYTES);
    if (!Array.isArray(rows)) reject();
    if (rows.length > draft.body.maxResults) block('SIZE_LIMIT');
    if (rows.length !== draft.body.maxResults) block('BLOCKED_OUTCOME');
    const seen = new Set<number>();
    const listings = rows.map(value => {
      // This narrow subset intentionally rejects additional, unsupported raw fields.
      const row = object(value, ['listingId', 'listingUrl', 'title', 'shopName', 'price', 'currencyCode']);
      const id = integer(row.listingId, Number.MAX_SAFE_INTEGER, 1);
      const listingUrl = text(row.listingUrl, 2048);
      const match = /^https:\/\/www\.etsy\.com\/listing\/([1-9][0-9]{0,19})(?:\/[a-zA-Z0-9_-]+)?$/.exec(listingUrl);
      if (!match || match[1] !== String(id) || seen.has(id)) reject();
      seen.add(id);
      const priceMissing = row.price === undefined || row.price === null;
      const currencyMissing = row.currencyCode === undefined || row.currencyCode === null;
      if (priceMissing !== currencyMissing) reject();
      let price: { amount: string; currency: string } | null = null;
      if (!priceMissing) {
        if (typeof row.price !== 'number' || !Number.isFinite(row.price) || row.price < 0) reject();
        // No rounding, default currency, exponent expansion or inferred discount.
        const amount = String(row.price);
        const currency = text(row.currencyCode, 3);
        if (!/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,4})?$/.test(amount) || !/^[A-Z]{3}$/.test(currency)) reject();
        price = { amount, currency };
      }
      return { listingUrl, title: row.title ?? null, shopName: row.shopName ?? null, price };
    });
    const projection = validateApifyResponse(JSON.stringify({ schemaVersion: APIFY_PROJECTION_VERSION, listings }), input, collectedAt);
    return freeze({ ...WIRE_DRAFT_SAFETY, outcome: 'validated_fixture' as const, projection });
  });
}
