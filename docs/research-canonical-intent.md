# M4.8 B4 — Canonical intent and golden vectors

Offline implementation only. No SQL, admission, dispatch, transport or authority validation is implemented. All results retain activationBlocked=true, executionAuthorized=false, automaticRetryAllowed=false and requiresAuthoritativeDatabaseValidation=true, with synthetic_unverified provenance. The research route remains unchanged.

## Contract and compatibility

This implements the B1/B3 dispatch-canonical-v1 typed grammar, not a new lifecycle state machine. It does not modify M2 statuses, M4.7 phases, fencing, economic caps, adapters or M3.6 allowlists. B1's TypeScript/PostgreSQL equivalence prerequisite remains BLOCKED until a separately implemented PostgreSQL encoder passes these vectors; TypeScript/Python agreement is not PostgreSQL certification.

APIs in src/server/researchCanonicalIntent.ts:

- encodeCanonicalResearchValue(value): bounded typed-tree encoding primitive, not a wire parser or admission API.
- canonicalizeResearchIntent(input, binding): strict versioned application-owned intent and separate local scope consistency check; returns canonical text, domain-prefixed bytes as hex, SHA-256 digest and frozen safety flags.
- canonicalizeResearchOperation(input): a deliberately narrow offline arm-operation hash draft illustrating separate fencing identity. It is NOT a complete RPC argument, authority or replay implementation. A future RPC must include ALL its actual arguments and authority evidence as B1 requires; this draft cannot substitute for that contract.

These APIs accept plain data trees, not JSON strings or byte streams. Duplicate JSON keys cannot be recovered after a caller's JSON parser overwrites them: raw JSON input is rejected, and future ingestion MUST reject duplicate names before constructing the tree. Multiple aliases for the same semantic field are unsupported; exact schema keys only. Do not feed lossy parsed untrusted JSON into an admission path and claim duplicates were validated.

## Exact bytes and hash

Hash input: UTF-8(domain), one zero byte, UTF-8(canonical typed text). Intent domain submission-intent-v1; operation domain dispatch-operation-v1. SHA-256 lowercase hex. The NUL is only a framing separator, never permitted inside data.

| Type | Encoding |
| --- | --- |
| Null | N |
| Boolean | B0; or B1; |
| Safe integer | I, canonical signed decimal, semicolon |
| String | S, UTF-8 byte length in decimal, colon, exact bytes |
| Array | A, element count, colon, encoded elements in original order |
| Object | O, field count, colon, encoded string-key/value pairs |

ASCII-only field names are sorted by unsigned UTF-8 bytes (equivalent to JavaScript lexical ordering for this restricted alphabet). Object insertion order is irrelevant; array order is significant. Lengths/counts use unsigned decimal without leading zeroes. Integers forbid fractions, nonfinite values, unsafe values and negative zero. Exponent notation is not a wire syntax: typed numbers have no original lexical spelling; no text-to-number coercion occurs.

Preserve Unicode scalar values exactly; no NFC/NFKC, trimming, case-folding or surrogate repair. Reject lone surrogates and U+0000 before UTF-8 encoding. Existing research keyword normalization remains a separate upstream contract. Valid UTF-8 is produced from validated scalar strings; malformed external UTF-8 must be rejected at a future strict decoder, which this tree API does not implement.

Null and omitted fields differ at the encoding layer; strict schemas require all fields. Apify source is explicitly null, never omitted; OpenRouter source must be an object. Undefined, sparse arrays, cycles, getters/setters, hidden properties, symbols, functions, classes, proxies, bigint and prototype-sensitive/credential field names reject. No toJSON hooks are invoked. Unknown fields reject at every intent/operation object level. Unsupported encoding/schema versions reject without implicit upgrade or historical rehashing.

Bounds: depth <=12 (root depth zero), <=4096 visited nodes, <=196608 UTF-8 bytes of keys/string data AND canonical encoding. Arrays/object key counts are bounded before traversal. OpenRouter application body canonical bytes <=98304; its future expanded wire body must independently pass the existing adapter bounds. Errors expose fixed INVALID_INPUT, LIMIT_EXCEEDED, IDENTITY_MISMATCH or UNSUPPORTED_VERSION codes only, never input values.

## Identity and economic schema

Required intent fields: schemaVersion=research-intent-v1, encodingVersion=dispatch-canonical-v1, provider, operationType, scope, attemptId, dispatchGeneration, pages, maximumListings, economics, payload.

scope contains accountingSubjectId, creditAccountId, creditGeneration, requestId, reservationId and requestFingerprint. IDs are lowercase canonical UUID text; fingerprints/digests are exactly 64 lowercase hex characters. Scope must match the separately supplied binding exactly. Local matching is NOT authentication, database ownership, reservation existence, credit availability or eligibility. Auth UUIDs, email, worker identity, timestamps, operation ID, claim epoch and external IDs are excluded from immutable intent.

Generation 1 only is supported, consistent with B3's blocked later-generation policy. Changed generation is rejected, not allocated. Claim epochs belong to operation hashing: a changed epoch changes the operation digest and cannot change or renew immutable intent. No reusable send flag exists.

economics contains pricingVersion, pricingSnapshotDigest, reservedMicroUsd, attemptBudgetMicroUsd, maximumInputTokens and maximumOutputTokens. Safe positive integer exposure must fit the unchanged 120000 microUSD/credit cap times 1–3 pages; attempt allocation <= job reserve. Limits remain <=36 requested listings/page, <=108 total, <=33280 input tokens, <=2048 output tokens. These are declared bounded snapshots, NOT verified rates, tokenization, actual billing, a full multi-attempt allocation proof or budget admission. Missing unknown charges remain UNKNOWN; accepting a supplied pricing digest cannot activate null/unverified production prices.

### Apify

provider=apify; operationType=actor_run; payload schema apify-intent-input-v1. Pin yumitori/etsy-listings-scraper. buildReference is a required opaque 1–128 ASCII alphanumeric/underscore/hyphen immutable-build reference; latest and missing references reject. This syntax does NOT verify existence, immutability or provider provenance. Live build resolution is BLOCKED.

The exact application-owned body contains queries (one nonempty keyword <=200 UTF-16 code units), maxPages/maxResults matching outer limits, sort=score, country=US, includeAds=true, dedupeAcrossQueries=true, includeInDemand=false. source=null. These reuse the current offline draft's baseline choices without modifying it; they do not certify a complete live actor schema. Actor/build changes must change identity or reject unsupported pins. No provider-side idempotency guarantee follows from deterministic local hashing.

### OpenRouter

provider=openrouter; operationType=chat_completion; payload schema openrouter-intent-input-v1. Pin google/gemini-3.1-flash-lite. Bind promptVersion/promptDigest, outputSchemaVersion/outputSchemaDigest, source and body. Source requires a distinct Apify attemptId, projectionVersion, projectionDigest and nonempty unique ordered listingIds bounded by the request.

A missing source reference or digest rejects. Supplying them is only a synthetic local assertion: this module CANNOT establish that an Apify attempt succeeded or that its output was validated. Future admission must independently load the exact successfully validated projection, reconstruct its digest, check IDs and scope, and verify provenance under database locks. Until that exists, real OpenRouter admission remains BLOCKED.

Body contains exact pinned model, two ordered system/user messages, stream=false, bounded max_completion_tokens equal to the declared output cap, routingPolicy=google-ai-studio-only-no-fallback-v1 and outputSchemaDigest matching payload. This is an application-owned execution-affecting tree, NOT a new provider wire schema. It requires future reviewed mapping to existing strict adapters and the full structured-output schema. No fallback routing, prompt, schema or source substitution is allowed. Text is untrusted data, never executed; a hash does not neutralize prompt injection.

## Golden-vector provenance

13 fixed positive vectors are checked into tests/research-canonical-intent.test.ts with exact canonical text and SHA-256 digests. They were generated independently using CPython 3.14.0, hashlib.sha256 and a standalone encoder, without importing or executing the TypeScript implementation. Tests do not invoke Python or derive expected values from the encoder under test. Each asserts canonical UTF-8 text and digest; complete intent/operation cases also compare domain-prefixed bytes as hex.

Independent reference algorithm used (Python documentation, not runtime wiring):

```python
def enc(x):
    if x is None: return 'N'
    if type(x) == bool: return 'B1;' if x else 'B0;'
    if type(x) == int: return 'I' + str(x) + ';'
    if type(x) == str: return 'S' + str(len(x.encode('utf-8'))) + ':' + x
    if type(x) == list: return 'A' + str(len(x)) + ':' + ''.join(enc(v) for v in x)
    return 'O' + str(len(x)) + ':' + ''.join(enc(k) + enc(x[k]) for k in sorted(x))
# hashlib.sha256((domain + chr(0) + enc(fixture)).encode('utf-8')).hexdigest()
```

The reference only encodes fixed valid fixtures; production rejection policy is tested separately. Fixture actor builds, scope bindings, pricing and projection hashes are synthetic and have no external authority.

| Vector | Independent expected SHA-256 |
| --- | --- |
| apify | `8798a56adbd5b18e4c9926d6c2ef6c2ce8f82dd272e2c7705788724c30ddf97a` |
| openrouter | `58e1f4644ca3086232a6c1acbc752785992fc107834885c9ccdaaecb2e519dff` |
| unicode | `c12e879e83ff637212d64f8d9a9bbb59be0c50c4509bac3c72a8e398d166212d` |
| reversed | `0d3794f5494c97a2ac42c103e5eb9122358578fdc6683e7dec24b22557964d79` |
| omitted | `c243aa256f94795b496bbcd10a49488a571d030263787fc4c8252459e207df6f` |
| operation | `5d658856618f96a1940b526bfce685afc6de5ba20eb1ee95df569d66cd9c5d81` |
| keyword | `07879c2e58f4d374e8fc942d76f4768281f6953014e6a9460e67532e72ec88c1` |
| build | `77ed82dfce518d9d2125cebb46daae32fc613c8c0d15cf3a22cc3158eac3fc17` |
| reservation | `84d52d25c53b8c2b2532c85935fcab295719e9fc66286a8a863a50809c80a679` |
| prompt | `8c7991f3544852e924f7733f4bc86f70b8eed41b4f32f6bca322aa9c6441c92e` |
| projection | `f1c56e9f39003a07696136ab14c59ffca0de083a3c2c4b7b5bf25ba1b48488bc` |
| array | `03f3f22d1da3170e9e53141296cb609e6e17d8f8e51749ed77be29916e27cf0a` |
| fence | `56444df174671b5c71f8f7ba187ac246e90f9fbcd86367f5975706c96035a37d` |

Coverage also includes reordered object keys; payload/build/prompt/source changes; NFC versus decomposed text; astral Unicode; arrays and null/omission; wrong versions; unsafe numbers; provider/domain separation; scope mismatches; forbidden generation changes and fencing changes; missing source evidence; secrets/aliases; malformed objects; depth/node/byte bounds. Wrong model pins reject rather than producing an admissible new model intent.

## Remaining release gates

CRITICAL: authoritative scope/principal/revocation checks, authority/subject lock placement, atomic legacy cutover, durable admission and paused-sender/uncertainty controls are not implemented. A digest is not durable ownership or permission to retry.

HIGH: PostgreSQL golden-vector certification, verified actor build/wire mapping, validated-source reconstruction, approved immutable routing/prompt schema versions, verified pricing/billing and unknown-liability policy remain unresolved. A4/A6/A8 deployment acceptance is separate; baseline discovery is not authority acceptance. No migration, network, credentials, provider execution, SQL or runtime dispatch wiring is part of B4.
