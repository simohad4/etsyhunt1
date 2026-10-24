# M4.8 B3 — Durable provider admission contract

Status: PROPOSED, OFFLINE ONLY. No admission RPC, migration, worker or provider integration is implemented here. These are review requirements, not PostgreSQL runtime guarantees. Deployment identity and concurrency guarantees remain UNVERIFIED.

`activationBlocked=true`, `executionAuthorized=false`, `automaticRetryAllowed=false`; `requiresAuthoritativeDatabaseValidation=true`. The authenticated research endpoint remains HTTP 503. Reservation, successful static tests and advisory simulation never authorize paid execution.

## 1. Repository evidence and compatibility

Sources: `src/server/researchEconomics.ts`, `src/server/researchDispatchProtocol.ts`, the M2 migration `supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql`, and the authority, staging-verification and durable-SQL design documents in this directory. This contract supplements them; it does not silently grant the A5 admission capability currently marked future/missing and DENIED.

The M4.7 simulator has request/attempt/provider/intent identity and fencing, but no enforceable database ownership, accounting-subject linkage or admission generation. Its late-billing phase behavior differs from the independent execution/financial states proposed for M4.8. Neither is changed here.

Preserve M2 job statuses: reserved, apify_running, apify_complete, apify_failed, openrouter_running, openrouter_complete, openrouter_failed, ambiguous, succeeded, failed, rejected. New durable admission records supplement these statuses; a status alone proves neither ownership nor permission to send.

## 2. Immutable admission identity

The proposed identity tuple binds accounting_subject_id, active Auth mapping, request_id, reservation_id, credit-operation/account generation, provider, dispatch_generation and local attempt_id. IDs are canonical UUIDs. Validate all links against authoritative rows, never caller assertions. The accounting subject survives removal of the Auth mapping; deleted/missing mappings deny new admission. Retained evidence must not depend on Auth cascade deletion.

Database request identity, local attempt identity and external provider identity are distinct. An operation_id identifies one admission operation, not a provider request or authenticated worker. Provider identity initially has no external ID; first-write or identical replay only applies when a validated external ID becomes available. Null never clears a stored ID. Conflicts, cross-request/attempt/provider binding and conflicting global external-ID reuse reject without mutation.

Use dispatch_generation for a distinct intended submission, and claim_epoch only for monotonic ownership fencing of that same attempt. Proposed uniqueness: (request_id, provider, dispatch_generation), local attempt_id, and non-null (provider, external_provider_id). Generation 1 initially maps to M2 retry_number 1. Generations above 1 remain BLOCKED pending a separately approved retry/admission policy; the existing maximum of two economic attempts is a reserve, not retry permission. Never increment generation because a lease expired or a response was lost.

### Canonical payload and compatibility

Use B1 `dispatch-canonical-v1` typed encoding with domain `submission-intent-v1`, a zero-byte separator, UTF-8 and SHA-256 lowercase hex. Operation arguments use the separate `dispatch-operation-v1` domain. Null is N; booleans B0;/B1;; integers I followed by canonical decimal and semicolon; strings S followed by UTF-8 byte length, colon and bytes; arrays A followed by count, colon and encoded elements; objects O followed by count, colon and encoded key/value pairs sorted by ASCII key bytes. Strict bounded types only; reject duplicate/unknown keys, floats, unsafe integers, undefined, accessors, callbacks, lone surrogates, U+0000 and malformed UTF-8. Do not use JSON.stringify or jsonb::text as canonical equivalence. Do not silently normalize payload Unicode; upstream keyword normalization remains the existing research-request-v1 rule.

Intent includes schema/encoding version, accounting subject and request/reservation bindings, local attempt, provider and generation, original request fingerprint, exact immutable provider body or protected-body digest, actor/build or model/routing pin, prompt/input/projection versions and hashes, listing/token bounds, pricing version/snapshot and reserved exposure. Validate the body before hashing; compare canonical semantic fields AND digest, not a caller hash alone. Retain protected payload separately from minimally retained digest evidence.

Exclude secrets, authorization headers, credentials, email, raw Auth identity from retained intent, transport configuration, worker identity, claim_epoch, lease timestamps, operation_id, external provider ID and generated timestamps. Changes to any included field require a new reviewed intent, never in-place replacement. Unsupported versions reject; no implicit upgrades or rehashing historical intent. TypeScript/PostgreSQL golden vectors for Unicode, ordering, bounds and rejection cases are REQUIRED before implementation. Cross-language encoding is currently UNVERIFIED.

## 3. Proposed atomic admission transaction

This is a future transaction contract, not executable SQL. Proposed operation: admit_research_provider_attempt, version v1. Inputs: operation UUID, immutable identity tuple, supported canonical payload/version, expected generation/epoch/revision and economics snapshot identity. Return only an admission receipt (created or exact replay/matched existing), current identity/revision and hold/rejection codes; no send permission or reusable mayDispatch flag.

Required ordered checks and effects, atomically:

1. Authenticate Dispatcher from verified connection identity, not p_worker_id, caller principal UUID or current_user inside SECURITY DEFINER. Require narrow capability and active registry binding; recheck revocation even on replay. Unknown/inactive/revoked principals DENY. No shared service_role fallback. Session-pooler login identity support remains UNKNOWN.
2. Acquire the authority registry gate and accounting-subject/mapping gates with protected mutation serialization. Their exact placement relative to the B1 graph is BLOCKED: no migration may implement admission until all interacting paths and revocation/deletion lock ordering are resolved.
3. Under locks verify live account eligibility, subject mapping, subscription/credit period and generation, account ownership and principal capability scope. Caller IDs cannot substitute for authentication or ownership checks.
4. Match original request fingerprint and reservation; require correct provider stage, unconsumed eligible credit reservation, held budget, verified pricing, sufficient global/account exposure and no unresolved outcome. No double credit debit or double budget reservation on replay. Per-attempt allocation must fit the existing job reserve and remain atomically visible to budget admission.
5. Strictly validate provider body, pins, versions, authoritative economics snapshot, listing/token bounds, attempt count and cap. Unverified pricing, unknown exposure or missing evidence HOLD; no client estimate establishes budget availability.
6. Create or match immutable intent and allocate exactly one local attempt for this generation. New admission starts unclaimed with claim_epoch 0. New conflicting attempt ID/payload/generation rejects; stale expected epoch/revision rejects. Any existing unresolved submission prevents a replacement generation.
7. Persist admission receipt, linked attempt/dispatch, budget allocation and append-only audit event in the same transaction. Failure rolls back all local effects. Commit durable admission before claim/arm/external submission. Admission alone grants no lease and no external send.

Two-level replay: identical operation_id plus identical canonical arguments returns a receipt/current state with no new attempt, audit event, credit debit, budget allocation or send opportunity. Changed operation arguments reject OPERATION_CONFLICT. A new operation_id for an already admitted generation must match the entire immutable identity and intent; it may record an operation receipt only, never another admission event or financial effect. Changed identity/body rejects INTENT_CONFLICT. Authority checks precede all replay handling. A replay with original expected revision may return current state without restoring old ownership; fresh operations require current fencing/revision. An admission receipt lost after commit is recovered by replay, not by allocating another generation.

### Lock graph and validation blocker

B1 proposed order: R(request advisory) → J(job) → S(subscription) → A(sorted attempt UUIDs) → D(dispatch) → G(global budget advisory) → U(account budget advisory) → LG → LA → WG → WA → B(reservation) → O(credit operation) → C(credit account) → append-only evidence. LG/LA are global/account liability rows; WG/WA are global/account budget-window rows. Authority and subject gates must be integrated into ONE graph shared by all affected paths; placement UNKNOWN/BLOCKED, not an invitation to acquire them opportunistically.

Inventory implicit FK, unique-index, trigger, Auth deletion, subscription, credit, budget and registry locks before implementation. Existing M2 begin locks job before attempt, while finish locks attempt before job after the request lock; this observed inversion is not proof of deadlock or safety. Quiesce and drain affected transactions; atomically harden/revoke every affected lifecycle entry point, overload, helper and financial path. Staging concurrency, revocation, replay and deletion tests are REQUIRED under separate approval. Static documentation does not establish deadlock freedom.

## 4. Claim, arm and irreversible submission

Admission persists intent; claim acquires one synthetic/future durable owner and monotonic fencing epoch; arm durably consumes the one-shot submission boundary; submission is the external action. A fresh arm requires current live claim, matching immutable identity/digest, eligibility and revocation checks. Exact arm replay never grants a second send. Crossing arm permanently forbids lease-based reassignment/resend for this attempt, even if the sender claims it never sent.

SQL cannot guarantee a paused sender will never issue an HTTP request. Fencing protects database mutations, not an already paused process at an external provider. Future workers must stop on uncertainty/revocation and require a separately reviewed dispatch architecture; no exactly-once external execution claim is made.

| Failure window | Required future behavior |
| --- | --- |
| Before admission commit | Roll back; no attempt/send; same operation replay verifies absence or receipt. |
| Admission committed, response lost | Exact receipt replay only; no second attempt/allocation. |
| Claimed, crash before arm | Reassign only after expiry and authoritative proof boundary remains unarmed; increment epoch; stale owner rejected. |
| Arm transaction rolled back | Only authoritative durable state can establish unarmed; lost reply alone cannot. |
| Arm committed, reply lost or crash before send | HOLD, unsafe to resend; preserve uncertainty and liabilities. |
| Send begun, timeout/disconnect/partial result/post-send crash | Acceptance unknown; latch uncertainty, retain holds, no automatic retry. |
| Lease expires or paused worker resumes after arm | No reassignment/resend; reject stale mutations; reconcile external acceptance. |
| Definitive provider rejection | Record authenticated matching evidence; execution failure does not prove zero charge or permit retry/refund. |
| External ID conflicts | Reject binding; hold and escalate; never replace identity. |
| Late charge after completed execution | Preserve execution outcome; independent financial pending/hold, no automatic liability release. |

Only a separately authenticated Reconciler may propose resolution using matching request/attempt/provider/intent identity and independently authenticated provider evidence. Timeout is never proof of rejection. Missing external ID after uncertain submission remains unresolved. Caller assertions and synthetic simulator reconciliation are not durable evidence. Exact reconciliation event replay has no new effect; conflicting second events reject, with corrections requiring a separately approved authoritative procedure. Billing authority is separate; execution reconciliation neither settles money nor authorizes retry.

## 5. Six M2 entry points and atomic bypass prevention

All six currently use SECURITY DEFINER with pg_catalog search_path, postgres ownership and service_role EXECUTE (M2 final grants); PUBLIC/anon/authenticated EXECUTE is revoked. This is not separated Dispatcher authority. Table/RLS and RPC guard checks do not establish durable ownership. Inventory alternate schemas, overloads, helpers, grants/default privileges and implicit mutation paths before cutover.

| Existing exact signature | Observed behavior and mandatory future boundary |
| --- | --- |
| reserve_research_job(uuid,uuid,text,integer,integer,text,text,text,text) | Reserves job/credits/budget and replays fingerprint; retain reservation semantics, never treat existing/new reservation as provider admission. |
| begin_research_provider_attempt(uuid,uuid,uuid,text,text,integer,text) | Inserts started attempt with stage/budget checks and retry_number; no durable intent, principal claim or fencing. Replace/guard admission atomically; existing attempt replay never grants send. |
| finish_research_provider_attempt(uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,text) | Finished replay compares fields, but normal and overrun FIRST finish use COALESCE(p_provider_attempt_id, provider_attempt_id), allowing replacement. Require first-write/identical identity, null retains stored value, conflict rejects BEFORE either branch mutates. |
| mark_research_job_ambiguous(uuid,uuid,text) | Holds job/reservation/budget; coarse existing-ambiguous replay is not reconciliation authority. Preserve unresolved latch and liabilities. |
| complete_research_job(uuid,uuid,uuid,uuid,text,jsonb,integer,timestamptz,text,jsonb,text,timestamptz) | Checks successful attempts and uses reported-or-estimated costs for settlement. Future controlled attempts require durable completion/evidence; no settlement or financial closure from estimates alone. |
| fail_research_job(uuid,uuid,text) | Blocks ambiguous/active jobs and may refund eligible credits; future failure must not bypass uncertain acceptance or release unknown financial liability. |

Test first finish with null→A, A→A, A→B, A→null and null→null in BOTH normal and overrun branches; finished exact replay is effect-free, conflicting replay rejects. Provider success without required identity remains blocked. Do not confuse global uniqueness with immutability.

Atomic cutover MUST harden or revoke all six entry points and affected financial operations together; no callable legacy service_role path may bypass new controls. Preserve safe read-only/history compatibility for legacy jobs; no manufactured durable intent, inherited dispatch permission or backfilled authorization. Legacy unfinished/unattributed attempts remain held for approved reconciliation, not silently retried or refunded. Existing M2 SQL is unchanged by B3.

## 6. Provider-specific admission

### Apify

Pin yumitori/etsy-listings-scraper and supported application input schema; exact actor build/version remains UNVERIFIED and blocks live compatibility. Bind canonical keyword/queries, maxPages, maxResults, sort, country, includeAds, dedupeAcrossQueries and includeInDemand to the immutable validated body. Demand enrichment disabled; naming/schema/billing evidence must be resolved against the published contract and verified fixtures before execution. Never silently substitute includeDemand. Existing offline drafts are not live-wire certified.

Deterministic local operation identity does not prove provider-side idempotency. Bind a returned run ID first-write only after strict validation. Run creation timeout or missing response is acceptance_unknown, not a safe new run. Available run lookup, credential scope, deduplication, build stability and billing/reconciliation APIs are UNVERIFIED; no guaranteed provider idempotency is assumed. Partial/ambiguous datasets cannot become successful authoritative input.

### OpenRouter

Pin google/gemini-3.1-flash-lite, versioned prompt, structured output schema, no-fallback routing and bounded nonstreaming body. Create OpenRouter intent ONLY AFTER validated Apify output exists; bind its immutable projection digest/listing IDs, exact prompt/input versions and token bounds. Do not precompute an empty placeholder intent or accept unvalidated raw provider text as authoritative instructions.

Use deterministic local operation identity, separate from external completion response ID. Unknown completion acceptance, timeout, missing response ID/usage or truncated output remains blocked and does not permit another paid completion. Provider-side idempotency, routing/billing finality and reconciliation availability remain UNVERIFIED. No invented idempotency header, billing endpoint or guaranteed token consumption.

## 7. Financial and activation gates

Preserve cap 120000 microUSD per credit ($0.12), 1–3 pages, up to 36 requested listings/page, maximum 108 listings, input cap 512 + ceil(98304/3) = 33280 tokens and output cap 2048. Existing maximum two attempts per provider is exposure reservation only. Integer microUSD arithmetic must reject overflow and round costs upward as existing economics requires. Requested/returned/billed listings and estimated/provider-reported/invoice evidence are different quantities.

Current active rates are unverified/null and activationBlocked remains true. Provisional scenario assumptions are NOT verified production prices. No cap increase, verified flag substitution or passing scenario authorizes admission. The local input token estimate is not a tokenizer or actual billing; authoritative admission must reserve sufficient bounded exposure and reconcile actual usage. Unknown failure/demand/surcharge costs remain unknown, never zero.

Financial holds survive uncertainty and late evidence independently of execution phase. Billing evidence requires independently authenticated Billing authority and matching attempt attribution, semantic source-event deduplication and conflict rejection. No duplicate ledger effects on operation or source replay. Pooled/overlapping/unattributable invoices remain unsupported. No financial closure, liability release, refund of unresolved liabilities or final invoice assertion without separately approved and verified evidence/policy. Synthetic evidence cannot be promoted into verified provider observations.

## 8. Remaining blockers and review gates

CRITICAL: authority/subject lock placement and atomic legacy cutover; provisioned isolated identities with verified pooler behavior; implemented durable admission/fencing/intent with runtime concurrency tests; independent reconciliation and unknown-liability controls. All remain BLOCKED for implementation/activation until reviewed.

HIGH: cross-language canonical golden vectors; actor build and wire contract verification; authoritative pricing/billing evidence and sufficient budgets within unchanged cap; deletion/retention policy; crash/paused-sender control and revocation/session draining. Financial closure remains unavailable. Baseline read-only discovery is NOT post-cutover authority acceptance.

Smallest next phase: review this contract and resolve the lock/authority/generation decisions offline; then separately authorize encoding vectors and bounded schema/RPC design updates. Migration authoring, staging identity/concurrency verification, provider transport and activation each require separate approval. Static tests establish documentation coverage only, not deployed enforcement or external exactly-once behavior.
