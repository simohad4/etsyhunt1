# M4.2 offline provider adapters

These modules build immutable request **intents** and validate versioned, application-owned JSON projections. They contain no executor, credentials, environment reads, database access or retry mechanism. They are not wired into the route, reservation RPC or M4.1 planner. Authenticated analysis remains HTTP 503 and pricing activation stays blocked.

## Contracts and uncertainty

`buildApifyRequest` reuses the economics request validator and pinned actor. Its keyword, pages and maximumListings are internal intent fields, **not verified actor input names**. `validateApifyResponse(rawJson, requestInput, collectedAt)` accepts `etsy-listing-projection-v1` with a listings array. Each record requires a canonical HTTPS www.etsy.com/listing/numeric-id URL; title, shopName and price are optional/null. Price, when present, requires an unchanged decimal string amount and explicit three-letter uppercase currency code (syntax only, not currency verification). Unknown fields, duplicate IDs and unsafe URLs fail closed. Images, ratings, purchases, badges and trend metrics are not inferred or mapped.

The actor's actual dataset and input schemas have **not been verified** in this slice. Raw actor rows must not be passed off as this projection. A future separately reviewed mapping must establish exact field semantics, nullability, pagination, truncation, dataset completion and provenance from captured legitimate responses and pinned official schema evidence. No live provider compatibility is claimed. Empty arrays mean no supplied records, not proof that a niche has no listings.

`buildOpenRouterRequest(contextJson, maximumOutputTokens?)` accepts `{listings:[{listingId,title}]}`; title can be null. It creates a pinned-model intent with untrusted listing text isolated in a user message and a qualitative-only system instruction. This is not a wire request: model availability, endpoint, structured-output support and model tokenizer remain unverified. Its output cap defaults to the economics maximum, 2048.

`validateOpenRouterResponse(rawJson, contextJson, generatedAt, maximumOutputTokens?)` requires a `research-interpretation-v1` projection: pinned model, finishReason `stop`, usage `{inputTokens,outputTokens}`, and interpretations `[{listingId,interpretation}]`. References must belong to the supplied context and be unique. Missing interpretations may be represented by an empty array; no placeholder narrative is generated. Truncated, errored, unknown or extra fields are rejected. Both usage counts must be present, nonnegative safe integers. Provider-reported input tokens are bounded by `MAX_OPENROUTER_INPUT_TOKENS` (currently 33,280), independently of the local `estimatedInputTokens`; counts above that estimate are accepted within the economics hard limit. Output tokens remain bounded by the prepared request's output cap, which must be reused during validation. These are application-owned projection fields, unverified against the live OpenRouter wire schema.

The UTF-8 planning estimate is not an authoritative tokenizer or an actual billing measurement, and may undercount provider-reported usage. Accepting a usage count does not authorize execution or spending. Future admission must reserve sufficient budget against verified pricing and enforce hard limits independently of that estimate; actual provider usage and charges must be reconciled through separately reviewed accounting. Neither estimates nor accepted provider-reported counts alone establish actual billing. This slice makes no claim that an estimate-based reservation would cover actual costs.

## Provenance and limits

Normalized listing fields are labeled observed/reported or observed/unavailable, never modeled. This describes the supplied projection's claim, not independent verification of Etsy truth. Timestamps are caller-supplied canonical UTC metadata, not proof of provider observation time. Tests contain synthetic contract fixtures only; no real Etsy metrics are asserted. Offline/demo callers must retain their fixture classification and must not publish these observations as live research.

AI narratives carry modeled/OpenRouter/model/timestamp provenance. They cannot populate observed metrics. The validator checks structure and references, **not the truth of natural-language claims**; untrusted text and prompt injection remain risks. Future integration needs content policy and evidence review, safe text rendering, and must never promote model prose to verified evidence.

The economics module supplies page/listing bounds, input bytes, estimated tokens, model/actor pins and output token cap. Additional defensive projection caps are 512 KiB Apify and 32 KiB OpenRouter; fields are length-bounded. Byte limits are checked before JSON parsing. Unexpected fields, invalid values and malformed JSON produce fixed typed `ProviderAdapterError` codes without echoing payloads. JSON is consumed as text; callers must not render it as HTML. URLs are validated, never requested. This slice does not estimate or approve spend because prices remain unverified.

## Before activation

Verify provider schemas, terms, billing and model availability; implement bounded streaming/transport capture and strict raw-to-projection mappings; validate trustworthy provenance and usage; obtain verified pricing and budgets; enforce ownership, authoritative database attempt admission, idempotency, timeouts, ambiguous-outcome reconciliation and lifecycle accounting. Existing reservations alone never authorize providers. Separately review any executor and retry policy. No activation is authorized by these request intents.

## Offline verification

The adapter tests are imported by the existing research-service suite so package scripts remain unchanged. Run `npx tsc --noEmit`, `npm test`, and `node tests/research-staging.integration.mjs --static`. Never substitute live preflight or write mode for these checks.
