# M4.8 B1 durable dispatch SQL/RPC design specification

Status: PROPOSED / OFFLINE ONLY. This is a review contract, not executable SQL, a migration, a worker or a provider billing schema. Static tests validate documentation coverage, not PostgreSQL runtime guarantees. No paid dispatch is authorized. activationBlocked=true; executionAuthorized=false; automaticRetryAllowed=false; requiresAuthoritativeDatabaseValidation=true. Existing pricing and the 120000 microUSD per-credit cap remain unchanged. Proposed grants below are future requirements, not current privileges.

## 1. Evidence and boundaries

Source baseline: branch feature/etsy-m1-m15-security, HEAD dad34d5. Paths and line references describe that baseline:

- M2: `supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql`: jobs 339, reservations 445, attempts 465, indexes 540–550, RLS/grants 608–637, reserve 642, begin 1070, finish 1297, ambiguous 1612, complete 1678, fail 1948, ownership/function grants 2178–2230.
- P1-B: `supabase/migrations/20261011160000_etsyhunter_m1_p1b_security.sql`: saved quota 104, legacy reserve 215, legacy finalize 374. M2 revokes service-role access to the two legacy credit RPCs at 25–28.
- Foundation: `supabase/migrations/20261010_etsyhunter_m1_foundation.sql`: signup 216, old consume 257. P1-B revokes browser execution of consume at 88.
- M1.5: `supabase/migrations/20261011180000_etsyhunter_m15_admin_rbac.sql`: permission catalog 18, audit 130, immutable audit trigger 227. research.view is not reconciliation authority; existing audit actions do not cover this protocol.
- `src/server/researchDispatchProtocol.ts`: synthetic identity, claim, arm, uncertainty, replay, billing and one-time execution reconciliation model. `src/server/researchExecutionSafety.ts` is advisory only. Neither enforces database ownership.
- `src/server/researchRpc.ts` gates reservation on pricing readiness and forbids unknown-outcome retries; `app/api/analyze-etsy/route.ts` remains HTTP 503 for authenticated requests.

Deployed definitions, complete provider billing semantics, production worker identity and concurrency behavior are UNKNOWN. Do not turn synthetic evidence into observed marketplace data or authoritative financial evidence.

## 2. Common schema rules

All columns below are NOT NULL unless marked nullable. UUID primary keys have no client-trusted identity implications. Database-generated IDs/timestamps are used for fresh records; callers supply operation/evidence IDs for deduplication. No raw credentials, headers, prompts or unrestricted provider bodies may be persisted here.

Local scalar rules (notation, not new SQL domains):

- `key`: text, 1–200 ASCII characters matching `[A-Za-z0-9._:/-]+`.
- `digest`: text matching exactly 64 lowercase hex characters; SHA-256 of versioned canonical data. Canonical encoding and full intent contents require separate review before migration. UNKNOWN until approved; never hash credentials into the intent.
- `money`: bigint, 0 through 9007199254740991 inclusive, in integer microUSD. `signed_money`: bigint, -9007199254740991 through +9007199254740991. SQL aggregates use NUMERIC before checking this shared TypeScript-safe range and converting.
- `count`: bigint, 0 through 9007199254740991; null means unavailable. Input/output token caps remain the existing 33280/2048 for attempt projections; raw billing discrepancies above those bounds must create a hold rather than be discarded or trusted as valid execution usage.
- Provider is text checked in (apify, openrouter). Identifier pair is checked against yumitori/etsy-listings-scraper or google/gemini-3.1-flash-lite respectively.
- All timestamptz values are finite. Database `clock_timestamp()` controls claims and received timestamps; client clocks cannot create or renew leases.

Security policy for EACH of the five tables: ENABLE ROW LEVEL SECURITY; no PUBLIC/anon/authenticated policies or grants; revoke ALL including TRUNCATE and column privileges from PUBLIC, anon, authenticated and service_role. Only reviewed SECURITY DEFINER routines access tables. Future routine owner is postgres with search_path=pg_catalog and schema-qualified names, matching M2; restrict schema CREATE and inspect executable dependencies. Owners/superusers can bypass these controls: administrator tamper resistance is not claimed.

Immutable columns are enforced by update guards as well as RPC checks. Append-only tables reject UPDATE, DELETE and TRUNCATE via privileges and mutation guards. No executable trigger/function is supplied in B1.

Retention for EACH table: no automatic TTL or Auth-delete cascade; retain while any acceptance, liability, dispute or invoice coverage is unresolved. Exact statutory retention duration and purge authority are UNKNOWN and block production. Retained identifiers are internal pseudonymous UUIDs; sensitive payloads stay outside this ledger behind a separately reviewed evidence-store policy.

## 3. Exact proposed tables

### research_dispatches

| Columns | Type and constraint |
| --- | --- |
| attempt_id | uuid PRIMARY KEY |
| request_id, user_id | uuid; composite FK (attempt_id, request_id, user_id, provider) to M2 research_provider_attempts(id, request_id, user_id, provider), ON DELETE RESTRICT |
| provider, provider_identifier | text; pinned pair above |
| protocol_version | text CHECK equals durable-dispatch-v1 |
| intent_digest | digest; immutable before the first claim |
| epoch, revision | bigint CHECK 0..9007199254740991; initial 0; increments checked |
| owner_id | nullable key; backend-verified principal binding |
| lease_expires_at | nullable timestamptz |
| phase | text CHECK unclaimed / claimed / submission_armed / acceptance_unknown / provider_accepted / provider_completed / provider_failed / reconciliation_hold / reconciled |
| armed_at | nullable timestamptz; irreversible submission boundary |
| external_id | nullable key; first-write or identical replay only |
| unresolved_outcome | boolean, initial false; arm latches true |
| execution_outcome | nullable text CHECK completed / failed / not_submitted |
| execution_reconciled_at | nullable timestamptz; first resolution only |
| financial_status | text CHECK unknown / pending / verified_through_cutoff; initial unknown |
| billing_verified_through | nullable timestamptz; finite coverage cutoff, never universal invoice finality |
| created_at, updated_at | timestamptz; database supplied |

Additional CHECKs: owner_id and lease_expires_at are both null or both non-null; epoch=0 iff owner_id is null; unclaimed implies epoch=0 and armed_at null; claimed implies owner and armed_at null; other phases require armed_at. external_id requires armed_at. execution_outcome requires armed_at. execution_reconciled_at requires a non-null outcome and unresolved_outcome=false. financial_status=verified_through_cutoff iff billing_verified_through is non-null. These row checks do not replace cross-row transition validation.

Independent state CHECKs (predicate notation, not executable SQL):

- phase=provider_completed implies execution_outcome=completed and external_id IS NOT NULL.
- phase=provider_failed implies execution_outcome=failed and external_id IS NOT NULL.
- phase=reconciled iff execution_reconciled_at IS NOT NULL; that timestamp requires armed_at IS NOT NULL and unresolved_outcome=false.
- execution_outcome=not_submitted implies external_id IS NULL and execution_reconciled_at IS NOT NULL.
- financial_status IN (unknown,pending) implies billing_verified_through IS NULL; verified_through_cutoff requires a finite, non-null cutoff. No financial_status value constrains phase.

Transition invariants: execution phase and financial reconciliation status are independent. Both (phase=provider_completed, financial_status=pending) and (phase=reconciled, financial_status=pending) are valid. Fresh late billing changes only financial_status to pending and clears billing_verified_through; it preserves phase, execution_outcome, execution_reconciled_at and unresolved_outcome. Financial-only holds never relatch execution uncertainty. Execution reconciliation sets phase=reconciled while preserving any pending financial state. Execution-uncertainty holds may set reconciliation_hold only before execution reconciliation; a reconciled historical outcome cannot be reopened by a billing event. The existing offline model's shared hold phase is not a SQL CHECK requirement.

Indexes: UNIQUE partial (provider, external_id) WHERE external_id IS NOT NULL; UNIQUE (attempt_id, request_id, user_id, provider) for evidence scope FKs; recovery index (lease_expires_at, attempt_id) WHERE phase=claimed AND armed_at IS NULL; queue index (financial_status, updated_at) WHERE financial_status=pending.

Immutable: attempt_id/request_id/user_id/provider/provider_identifier/protocol_version/intent_digest/created_at; armed_at cannot be cleared or changed; external_id cannot change after binding; recorded execution outcome cannot be rewritten. Financial status can reopen on new evidence without changing execution history. Retention/RLS/grants follow section 2.

### research_dispatch_events

| Columns | Type and constraint |
| --- | --- |
| event_id | uuid PRIMARY KEY, database generated |
| operation_id | uuid UNIQUE, caller deduplication key |
| attempt_id, request_id, user_id, provider | exact dispatch composite FK, ON DELETE RESTRICT |
| operation_kind | text CHECK claim / renew / arm / bind / hold / reconcile / billing_evidence / billing_adjustment |
| argument_digest | digest; canonical operation arguments including immutable scope |
| canonical_arguments | jsonb object; exact validated RPC arguments in the versioned encoding, at most 16384 UTF-8 bytes, no unknown keys or secrets; retained for structural comparison, not digest-only equality |
| epoch, revision | bigint CHECK 0..9007199254740991 |
| actor_id | key; verified backend principal, not an unchecked caller label |
| result_code | text CHECK CLAIMED / RENEWED / ARMED / BOUND / HELD / RECONCILED / EVIDENCE_RECORDED / ADJUSTMENT_RECORDED / SOURCE_EVENT_DUPLICATE / ADJUSTMENT_DUPLICATE |
| created_at | timestamptz, database generated |

UNIQUE (attempt_id, revision); index (attempt_id, created_at, event_id). All columns immutable, append-only. Replay reads this record but returns current safe state, not an old send capability. No unauthenticated rejected-call payload is recorded; security rejection monitoring is a separate sanitized channel. Retention/RLS/grants follow section 2.

### research_reconciliation_evidence

| Columns | Type and constraint |
| --- | --- |
| evidence_id | uuid PRIMARY KEY |
| operation_id | uuid UNIQUE FK to dispatch_events(operation_id), ON DELETE RESTRICT |
| attempt_id, request_id, user_id, provider | exact dispatch composite FK, ON DELETE RESTRICT |
| intent_digest | digest matching persisted dispatch |
| external_id | nullable key; must match dispatch |
| decision | text CHECK not_submitted / completed / failed |
| evidence_digest, quiescence_digest | digest; retained sanitized evidence references |
| authority_id | key, independently verified reconciliation principal |
| expected_revision | bigint CHECK 0..9007199254740991 |
| recorded_at | timestamptz, database generated |

UNIQUE (attempt_id): exactly one initial execution reconciliation. CHECK decision=not_submitted requires external_id null; completed/failed require external_id non-null. Index (recorded_at, evidence_id). All columns immutable, append-only. Authoritative evidence verification and sender quiescence cannot be established from a digest alone. No correction RPC exists in this set; corrections require a future separate authorized, audited procedure that preserves the original decision. Retention/RLS/grants follow section 2.

### research_billing_evidence

| Columns | Type and constraint |
| --- | --- |
| evidence_id | uuid PRIMARY KEY |
| operation_id | uuid UNIQUE FK to dispatch_events(operation_id), ON DELETE RESTRICT |
| attempt_id, request_id, user_id, provider | exact dispatch composite FK, ON DELETE RESTRICT |
| source_namespace, source_account_key, source_event_id | key; normalized non-secret source identities |
| external_id | nullable key; estimates may omit, paid evidence requires exact binding or remains held/unmatched |
| kind | text CHECK estimate / reported_usage / billing_event / invoice |
| currency | text CHECK USD |
| amount_micro_usd | nullable money; absence means UNKNOWN |
| requested_listings, returned_listings, billed_listings | nullable count, distinct semantics |
| input_tokens, output_tokens | nullable count, provider-reported only; never local estimates disguised as usage |
| coverage_start, coverage_end | nullable timestamptz pair; both null or start < end |
| coverage_complete | boolean; false unless independently verified for that finite scope |
| evidence_digest | digest |
| verification_class | text CHECK synthetic / unverified / externally_verified |
| verified_by | nullable key; non-null iff externally_verified |
| received_at | timestamptz, database generated |

UNIQUE (provider, source_namespace, source_account_key, source_event_id); index (attempt_id, received_at, evidence_id). All columns immutable, append-only; later verification needs a separately designed procedure/evidence identity, not mutation or reuse of a source key with changed verification content. Nonnegative amounts only: refunds use adjustments. Synthetic/unverified evidence cannot release liabilities. Invoices describe coverage and are not additive charges on top of corresponding billing events. Conflicting duplicate source events reject. Retention/RLS/grants follow section 2.

### research_billing_adjustments

| Columns | Type and constraint |
| --- | --- |
| adjustment_id | uuid PRIMARY KEY |
| operation_id | uuid UNIQUE FK to dispatch_events(operation_id), ON DELETE RESTRICT |
| attempt_id, request_id, user_id, provider | exact dispatch composite FK, ON DELETE RESTRICT |
| evidence_id | uuid FK to research_billing_evidence(evidence_id), ON DELETE RESTRICT; RPC verifies identical dispatch scope |
| source_namespace, source_account_key, source_adjustment_id | key |
| delta_micro_usd | signed_money; explicit zero allowed, not inferred |
| currency | text CHECK USD |
| accounting_period_start, accounting_period_end | timestamptz CHECK start < end |
| reason | text CHECK late_charge / refund / correction |
| evidence_digest | digest |
| authority_id | key, independently verified billing principal |
| recorded_at | timestamptz, database generated |

UNIQUE (provider, source_namespace, source_account_key, source_adjustment_id); index (attempt_id, recorded_at, adjustment_id). All columns immutable, append-only; adjustment corrections append compensating records, never rewrite. No automatic credit/subscription grant follows a negative financial adjustment. Retention/RLS/grants follow section 2.

## 4. RPC common contract

The following signatures are notation, NOT CREATE FUNCTION statements. All eight return the same bounded JSONB envelope: disposition (fresh/replay/source_replay), code (table-specific result_code), operation_id uuid, attempt_id uuid, revision bigint, epoch bigint, phase text, unresolved_outcome boolean, execution_outcome text|null, financial_status text, activationBlocked=true, executionAuthorized=false, automaticRetryAllowed=false, requiresAuthoritativeDatabaseValidation=true. No mayDispatch/sendAuthorized field and no credentials or raw evidence. A fresh arm is a persisted boundary only, not an execution capability in B1.

Common arguments C expand IN ORDER to: p_operation_id uuid, p_request_id uuid, p_user_id uuid, p_attempt_id uuid, p_expected_revision bigint. Worker arguments W expand IN ORDER to: p_worker_id text, p_epoch bigint. No defaults or overloaded signatures. All required inputs reject NULL; only explicitly nullable arguments below accept it.

Every RPC is SECURITY DEFINER, owner postgres, SET search_path=pg_catalog, schema-qualified. Revoke EXECUTE from PUBLIC/anon/authenticated; grant only service_role. Direct table writes remain revoked. Service-role possession alone is insufficient worker/reconciler identity: trusted backend must independently authenticate principal and bind operation scope. Caller-provided identity or authority booleans are not proof. Exact deployment mechanism is UNKNOWN and blocks activation. Reconciliation and financial adjustments require separate backend permission checks; research.view is insufficient.

Transaction algorithm: authenticate/validate bounded arguments; determine persisted immutable scope without trusting supplied user; acquire section 5 locks; read operation_id first for replay; compare canonical argument digest including expected revision; exact replay returns CURRENT state without repeating effects, even if the original expected revision is now stale. Changed operation replay rejects CONFLICTING_REPLAY. For fresh operations check expected revision, epoch/owner when applicable, all FKs and current invariants; mutate, increment revision, append audit/evidence in the SAME transaction. No HTTP while locks are held. Cross-user/job/provider mismatch rejects IDENTITY_MISMATCH. Stale revision/epoch rejects STALE_REVISION/STALE_EPOCH without mutation. All rejection codes/messages are fixed and sanitized; no raw payloads or connection information. SQL errors abort the whole transaction. No automatic retries, even on timeout or unknown commit outcome.

### Two-level idempotency

Operation identity is operation_id plus RPC kind and ALL canonical arguments, including scope, evidence/adjustment UUID, expected revision, authority and evidence digests. Compare both argument_digest and canonical_arguments structural equality; digest equality alone is insufficient. Canonicalization preserves explicit null versus zero, uses exact integers and normalized UTC timestamps, and does not trim/lowercase provider IDs. JSON key order is irrelevant; unknown fields reject. The versioned byte encoding still requires certification before migration.

Provider semantic identity is the unique (provider, source_namespace, source_account_key, source_event_id), or source_adjustment_id for adjustments. Compare every persisted semantic field: dispatch scope, external identity, kind, currency, amounts, counts, coverage, verification class/verified_by, or adjustment evidence_id, signed delta, period, reason and authority_id. Compare evidence_digest exactly as well; changed digest is conflicting content even if amounts agree. Exclude operation_id, proposed new evidence/adjustment UUID, expected revision, generated timestamps, event ID and audit revision from source semantic equality. Do not trust a caller-supplied semantic hash in place of typed field equality. A source key bound to another attempt rejects rather than becoming a duplicate in that attempt.

| Case | Result and exact effect |
| --- | --- |
| Same operation_id, identical canonical arguments | disposition=replay; no new audit event, ledger row, revision or financial effect; return CURRENT state |
| Same operation_id, changed canonical arguments or RPC kind | CONFLICTING_REPLAY; no new audit event, ledger row, revision or financial effect |
| NEW operation_id, same provider source event and identical semantic content/evidence_digest | disposition=source_replay, code=SOURCE_EVENT_DUPLICATE; one audit receipt in research_dispatch_events binds the NEW operation_id, with one revision increment; no new billing ledger row or financial effect |
| NEW operation_id, same provider source event but changed semantic content/evidence_digest | BILLING_EVENT_CONFLICT; no new audit event, ledger row, revision or financial effect |
| NEW operation_id, repeated adjustment source key and identical semantic content/evidence_digest | disposition=source_replay, code=ADJUSTMENT_DUPLICATE; one audit receipt binds NEW operation_id, one revision increment; no new adjustment row or financial effect |
| NEW operation_id, repeated adjustment source key but changed semantic content/evidence_digest | BILLING_EVENT_CONFLICT; no new audit event, ledger row, revision or financial effect |

The duplicate receipt is necessary so that subsequent reuse of that NEW operation_id can itself be checked. Replaying the receipt produces no further audit event or revision. Fresh source replay requires current expected revision and authorization; exact operation replay is checked first and tolerates its original stale revision. Source duplicate checks precede ledger UUID insertion; a new unused proposed UUID is ignored on source replay, never aliases or replaces the original row. Reusing a UUID already bound to a different source rejects IDENTITY_MISMATCH. Receipts contain only bounded validated canonical arguments, not raw provider responses. Unique source constraints and dispatch locks serialize concurrent duplicates; rollback includes receipt and revision. No evidence or financial totals are updated on source replay.

### claim_research_dispatch(C, p_worker_id text, p_expected_epoch bigint, p_lease_seconds integer, p_intent_digest text) -> jsonb

Fresh: existing eligible M2 admission, matching immutable intent, armed_at null, current owner absent or expired by database clock, expected epoch matches. Lease 1..30 seconds (proposed local bound, not provider timeout). Increment epoch once, set owner and database expiry, phase claimed. Audit claim/CLAIMED. Active claim -> OWNER_CONFLICT; boundary crossed -> SUBMISSION_BOUNDARY_CROSSED. Expiry permits reassignment ONLY before arm; exact replay never extends the lease. No current synthetic status substitutes for database admission or verified pricing/budgets.

### renew_research_dispatch_claim(C, W, p_lease_seconds integer) -> jsonb

Fresh: phase claimed, armed_at null, same current owner/epoch, lease still live; lease 1..30 seconds from database clock. Audit renew/RENEWED. Expired lease -> LEASE_EXPIRED; cannot revive. Post-arm renewal is unsupported, not a resend route. Exact replay does not extend again.

### arm_research_submission(C, W, p_intent_digest text) -> jsonb

Fresh: same live pre-arm claim, immutable digest, matching admitted attempt, current nonblocked global/account liability and reserved exposure, verified complete pricing and ownership. Persist armed_at once, phase submission_armed, unresolved_outcome true. Audit arm/ARMED. Boundary irreversible. Replayed submission intent never grants a second send; lost response requires HOLD/reconciliation. No reusable dispatch authorization is returned. B1 does not enable a sender.

### bind_research_provider_identity(C, W, p_external_id text) -> jsonb

Fresh: matching current owner/epoch, armed boundary, no incompatible recorded outcome. Bind first ID or accept identical binding; uniqueness across provider IDs applies. Audit bind/BOUND. Changed ID -> PROVIDER_ID_CONFLICT; never replace it. An expired post-arm lease alone does not erase ownership evidence, but no new submission is possible. Stale-worker evidence requires reconciliation, not bypassing fencing. Binding never clears a latched uncertainty hold.

### hold_research_dispatch(C, W, p_cause text) -> jsonb

Cause checked in unknown_acceptance / timeout / disconnect / partial_result / post_send_crash / lost_arm_response / identity_conflict / billing_unknown. Matching owner/epoch and armed boundary required; no new execution reconciliation may be undone. Latch unresolved outcome for execution uncertainty, set phase acceptance_unknown or reconciliation_hold, retain financial exposure and relevant M2 held state atomically. Financial-only uncertainty must not change historical execution outcome. Audit hold/HELD. Repeated new hold may preserve a hold, never clear it; exact operation replay has no second effect.

### reconcile_research_dispatch(C, p_evidence_id uuid, p_decision text, p_external_id text nullable, p_evidence_digest text, p_quiescence_digest text, p_authority_id text) -> jsonb

Decision checked in not_submitted / completed / failed. Independent reconciliation authority, externally verified matching evidence, current revision, armed dispatch and no prior execution reconciliation required. not_submitted needs independently established sender quiescence plus negative acceptance evidence; null ID alone is not proof. Other decisions require matching bound ID. Unknown billing remains held. Record original outcome once and clear execution latch only from matching evidence; pending financial state survives. Audit reconcile/RECONCILED and evidence row atomically. New second reconciliation -> RECONCILIATION_CONFLICT, including same decision/new evidence. Exact original event replay is safe. Corrections need a separate future authoritative procedure, not this RPC. No retry authorization or automatic refund.

### record_research_billing_evidence(C, p_evidence_id uuid, p_source_namespace text, p_source_account_key text, p_source_event_id text, p_external_id text nullable, p_kind text, p_currency text, p_amount_micro_usd bigint nullable, p_requested_listings bigint nullable, p_returned_listings bigint nullable, p_billed_listings bigint nullable, p_input_tokens bigint nullable, p_output_tokens bigint nullable, p_coverage_start timestamptz nullable, p_coverage_end timestamptz nullable, p_coverage_complete boolean, p_evidence_digest text, p_verification_class text, p_verified_by text nullable) -> jsonb

Validate exact schema/types and immutable scope; verify authority before accepting externally_verified or coverage_complete. Estimates may precede arm; paid evidence needs boundary and matching external binding, otherwise reject PROVIDER_ID_MISSING/IDENTITY_MISMATCH without discarding the operational need for separate held/unmatched ingestion. That future unmatched queue is NOT specified/implemented here. Duplicate source key under a new operation ID follows Two-level idempotency: source_replay with SOURCE_EVENT_DUPLICATE audit receipt only; no ledger or financial effect. Changed semantic content or evidence_digest -> BILLING_EVENT_CONFLICT. Audit billing_evidence/EVIDENCE_RECORDED for fresh evidence. Missing fields remain null. New paid evidence reopens pending financial review, preserves execution phase and clears only the financial coverage cutoff; it never rewrites execution history. Multiple partial/cumulative usage or invoice records are unsupported until provider coverage/deduplication semantics are certified; ambiguous overlap -> COVERAGE_UNRESOLVED. No inference of zero remaining liability.

### apply_research_billing_adjustment(C, p_adjustment_id uuid, p_evidence_id uuid, p_source_namespace text, p_source_account_key text, p_source_adjustment_id text, p_delta_micro_usd bigint, p_currency text, p_accounting_period_start timestamptz, p_accounting_period_end timestamptz, p_reason text, p_evidence_digest text, p_authority_id text) -> jsonb

Fresh: independently verified billing authority and evidence, original scope/period match, supported currency and checked signed amount; source identity deduplicated. Atomically append adjustment, update global/account financial holds/liabilities and audit billing_adjustment/ADJUSTMENT_RECORDED. A repeated adjustment under a new operation ID follows Two-level idempotency: source_replay with ADJUSTMENT_DUPLICATE audit receipt only; no second adjustment or financial effect. Conflicting source replay -> BILLING_EVENT_CONFLICT. Late charge/refund sets financial_status pending, clears coverage cutoff and retains historical execution outcome, phase, execution_reconciled_at and unresolved_outcome. No automatic credit refund, no weakening of M2 cap. Refund cannot reduce outstanding exposure below substantiated remaining liability. Exact liability allocation for provider-level invoices is UNKNOWN and blocks application of overlapping adjustments. Safe failure is hold/reject, not guessed accounting.

## 5. Global lock graph

Notation: R=request advisory (existing hashtextextended(request_id,19042026)); J=job; A=attempt; D=dispatch; S=subscription; G=global budget advisory; U=account budget advisory; LG/LA=global/account liability rows; WG/WA=global/account window rows; B=reservation; O=credit operation; C=credit account. Arrows describe acquisition order, including implicit UPDATE locks. Existing routines are NOT rewritten by this document.

| Existing operation | Observed current order / reference |
| --- | --- |
| reserve_research_job | R -> J -> S -> G -> U -> LG -> LA -> WG -> WA -> C; operation/job/reservation inserts afterward (M2 709–1044). Pricing read is not an explicit row lock |
| begin_research_provider_attempt | R -> J -> A -> B (M2 1109–1242); admission replay is not a claim |
| finish_research_provider_attempt | R -> A -> J -> B; overrun branch then G -> U -> LG -> LA -> WG -> WA, then credit operation/job writes (M2 1358–1578) |
| mark_research_job_ambiguous | R -> J -> O -> B through updates (M2 1632–1668) |
| complete_research_job | R -> J -> A(apify) -> A(openrouter) -> B -> WG -> WA, followed by result/history/credit-operation updates (M2 1727–1928) |
| fail_research_job | R -> J -> O -> B -> WG -> WA -> C (M2 1976–2153) |
| reserve_research_credits (P1-B legacy, revoked by M2) | request advisory -> O -> C; ledger/operation writes (P1-B 249–343) |
| finalize_research_credits (P1-B legacy, revoked by M2) | request advisory -> O -> C on refund; history/operation writes (P1-B 402–529) |
| consume_research_credits (foundation legacy, browser revoked by P1-B) | C -> ledger/history writes (foundation 283–335); no durable dispatch guard |
| enforce_saved_listing_quota | account quota advisory -> S (P1-B 115–135), then saved-listing insert; no budget/dispatch locks |
| handle_new_user_signup / existing-user backfill | profile -> subscription -> credit-account inserts; zero credits/inactive subscription, no paid dispatch (foundation 216–252; backfill 8–80) |
| subscription grants/resets/admin credit adjustment | no implemented subscription/credit mutation RPC in M1.5; catalog permissions are not implementations. External writers/triggers and their lock order UNKNOWN |

Known ordering differences/inversions: J->A in begin/complete versus A->J in finish; B->G/U/LG/LA in finish versus financial guards before reservation creation in reserve; O->B/windows in fail/ambiguous versus later O updates in complete/finish; fixed provider attempt ordering in complete versus unconstrained attempt selection in begin. All same-request M2 paths use R, mitigating those same-request cycles; differences are NOT proof of an exploitable deadlock. Legacy key namespaces, implicit FK/unique-index locks, Auth cascades, triggers and external subscription/credit writers need full validation. UNKNOWN: complete deployed lock graph and runtime deadlock freedom.

One proposed future total order (all participating paths must adopt before coexistence):

`R -> J -> S -> A(sorted UUID) -> D -> G -> U -> LG -> LA -> WG -> WA -> B -> O -> C -> evidence/audit/ledger append`

Missing rows are serialized by R and unique constraints; do not invent a lock on a nonexistent row. Multi-request transactions are unsupported initially. Batch financial ingestion must process one request per transaction and must not take G before R. Subscription/credit writers may take S then C but must never subsequently acquire R or earlier locks; account deletion must follow a separately reviewed maintenance protocol. Saved quota may take its advisory then S but must not enter research operations while holding it. Pricing changes require separate serialization/version immutability design: UNKNOWN, not permission to mutate active rates.

No mixed old/new financial path may be enabled before its order is reviewed. Renew/bind without financial effects use the ordered subset R/J/A/D; arm, hold and financial reconciliation use applicable full financial order. Use lock_timeout 3s, statement_timeout 30s as proposed bounded defaults; no automatic retries on abort/unknown commit. Database-only transaction rollback does not undo an external request. Concurrency assumptions remain UNKNOWN until isolated staging tests pass.

Required runtime lock validation: separately authorized isolated staging tests must use independent sessions and explicit barriers, not sequential calls in one transaction. Exercise same-request begin/finish/complete/fail/ambiguous races; different requests for the same account contending on shared budgets; different accounts contending on global budgets; billing ingestion/adjustment versus reservation and rollover; subscription reset/refund; claim/renew/reclaim/arm; duplicate source events and adjustments with distinct operation IDs; and deletion versus retained evidence. Run reversed arrival orders and force pauses at lock acquisition boundaries. Assert bounded completion or documented timeout rollback, no unexpected deadlock, one source ledger effect, consistent global/account liabilities and no callable legacy bypass. Capture lock waits and rollback state without sensitive payloads. UNKNOWN writers/triggers and implicit FK/index locks must be included before claiming coverage. Static documentation cannot establish deadlock freedom; even passing bounded staging schedules does not prove all possible schedules safe. Runtime validation is a release gate, not performed in B1.

## 6. Legacy bypass prevention and identity hardening

Future additive prerequisite: add research_jobs.dispatch_protocol_version text with historical rows tagged legacy-disabled and new controlled jobs tagged durable-dispatch-v1. Check permits only those values. Immutable marker; absence of a dispatch row for controlled jobs is an error, never legacy fallback. New attempt admission creates its dispatch row in the SAME transaction with immutable intent. How the canonical intent is supplied is a reviewed extension/replacement of admission; old begin signature cannot invent one.

- begin_research_provider_attempt: legacy signature must reject admission for controlled jobs unless called through a reviewed internal durable admission routine; exact begin replay is descriptive only, never dispatch ownership. Existing retry_number=2 capacity does not permit automatic retries.
- finish_research_provider_attempt: controlled jobs require bound dispatch identity, appropriate outcome evidence and latch handling; cannot clear uncertainty from a caller outcome alone. FIRST_FINISH_ID_IMMUTABILITY: reject a supplied non-null ID distinct from an already-bound ID BEFORE both normal and cost-overrun first-finish updates. Replace COALESCE replacement semantics at M2 1522 and 1563; finished replay checks alone at 1373–1383 are insufficient.
- complete_research_job: controlled completion requires exact successful dispatch identities, resolved execution evidence, bounded validated observations and sufficient retained financial liability. Estimated settlement is not invoice-final settlement. No completion bypass via old service-role signature.
- fail_research_job: reject potentially accepted/armed unresolved dispatches even when attempt status says failed; do not release exposure or refund based only on an intermediate failure or missing provider ID. Preserve period/generation refund checks.
- mark_research_job_ambiguous: propagate durable uncertainty and held liability; never clear a latch. New operation must bind reason/evidence; legacy coarse replay cannot substitute for reconciliation.
- reserve_research_job: set immutable protocol version for future controlled requests; exact replay preserves original version and cannot activate a historical request.

All mutation paths must share hardened private implementations or have execution revoked; a new wrapper alongside an old callable bypass is unacceptable. Historical legacy attempts remain non-dispatchable, retained and read-only except separately authorized audited liability holds; do not fabricate intents/claims for them. Existing terminal outcomes remain immutable. Unfinished legacy records need explicit review, not automatic adoption or retry. Old consume/reserve/finalize privileges stay revoked. This is a future migration requirement, not an implementation in B1.

Atomic legacy bypass prevention: all six affected M2 lifecycle entry points (reserve_research_job, begin_research_provider_attempt, finish_research_provider_attempt, mark_research_job_ambiguous, complete_research_job, fail_research_job), their internal implementations, grants and new durable controls must be hardened atomically in one future migration transaction. Revoke any path that cannot enforce the same controls. Do not commit callable new controls alongside old unguarded signatures, including alternate overloads. Quiesce existing callers and drain/terminate relevant in-flight transactions before cutover; replacing a function does not retroactively secure a transaction already using old code. Verify all entry points and grants after commit and before any caller resumes. If atomic cutover/quiescence cannot be established, remain blocked; no staged compatibility window with a bypass. All controls stay disabled during the migration. This specifies a future gate only, not migration execution.

## 7. Financial and retention invariants

Reserved exposure is a safety bound, not expenditure. Estimates, reported cost, billing events, invoices and signed late adjustments have separate provenance. Local token estimates are not billed usage. Requested/returned/billed listings remain distinct. Unknown costs and unresolved liabilities stay UNKNOWN, never zero. A reported-versus-invoiced difference requires reconciliation, not automatically a confirmed conflict. Explicit contradictory identity/event evidence rejects.

Deduplication: operation IDs bind canonical arguments; provider source IDs bind immutable semantic events; invoices must not be added to the same charges already represented by billing events. Multiple partial or cumulative events/invoices require verified coverage semantics; otherwise hold. Synthetic evidence is never promoted by caller assertion. Verification needs external authority, not boolean flags.

Overflow: NUMERIC intermediates for every subtotal, signed delta, epoch/revision increment and cap calculation; range-check before bigint/TypeScript conversion. Reject OVERFLOW atomically even if another category could offset the overflowing subtotal. Non-USD billing unsupported; unknown FX, tax, demand surcharge and failed-run charges are not zero.

M2 research_budget_reservations CHECK settled_micro_usd <= reserved_micro_usd (453–454) cannot represent late excess charges directly. Do not enlarge caps or rewrite terminal historical settlement. New adjustments need an additive ledger and durable global/account liability accounting under the shared locks. Positive excess holds both scopes across rollover; negative evidence releases only verified allocable liability. Existing overrun guards are retained. Exact allocation/release policy is UNKNOWN; until reviewed, financial operations remain blocked and held. No new liability-clearing authority is assumed among the eight RPCs.

Account deletion: new dispatch FK RESTRICT intentionally prevents existing Auth/job cascades from erasing referenced evidence. Retain original internal user UUID without a new cascading Auth FK. A separately reviewed deletion workflow must anonymize user-facing profile data and preserve required ledger references; it must not disable triggers or delete liabilities. Policy/legal retention, orphan handling, backups and privileged purge authority remain UNKNOWN. Blocking deletion is a deliberate safety consequence until that workflow exists.

## 8. Failure/recovery matrix

| Case | Required recovery and durable result |
| --- | --- |
| duplicate workers | one owner/epoch; active claimant conflict; exact replay has no additional effect |
| lease expiration before arm | database-time reclaim increments epoch; old owner fenced |
| lease expiration after arm | no reassignment for submission, never resend |
| lost arm response | crossed boundary persists; HOLD, reconcile; replay gives current state only |
| crash before external send, after arm | indistinguishable from possible submission without external/quiescence evidence; HOLD |
| crash after external send | unknown acceptance latched, preserve budget/liability |
| stale worker / paused sender | reject stale database mutation; fencing cannot stop already-paused HTTP; no replacement sender |
| provider-ID conflict | reject replacement, hold for investigation, preserve original identity |
| timeout / unknown acceptance | no failure-to-zero inference; no automatic retries |
| definitive provider failure | preserve execution failure separately from unknown billing; no automatic refund/retry |
| late charges or refunds | append signed adjustment, pending financial reconciliation; historical execution outcome unchanged |
| conflicting reconciliation | reject new second resolution, including same decision/new event; exact replay safe; separate future correction procedure |
| partial invoice coverage | UNKNOWN residual liability, no inferred zero or finality; unsupported overlapping coverage held |
| missing external ID | unresolved, never infer not_submitted |
| malformed billing / overflow | reject transaction with fixed code, do not silently drop a charge or raw payload into logs |

Exactly-once external execution is NOT claimed. A database fencing token cannot prevent an already-paused worker from issuing HTTP. Even a lease expiring or an empty provider lookup is insufficient proof of non-acceptance. No reusable send permission or worker/transport is part of this specification.

## 9. Rollout and rollback limits

1. B1 now: documentation and OFFLINE STATIC CONTRACT TESTS ONLY. They check coverage/regression language, not SQL syntax, privileges, locking or PostgreSQL runtime guarantees.
2. Separate B2 approval: additive migration files and SQL contract tests, not applied. Resolve UNKNOWN authority, digest, billing allocation/coverage, retention and lock-graph decisions before executable contracts are considered complete. Include bypass hardening and first-finish ID fix together.
3. Static validation: parse/review SQL, diff privileges, inventory dependencies/triggers, extend M3.6 parity deliberately; never automatically accept changed function hashes.
4. Isolated staging approval: explicit target/TLS checks, read-only parity first, then separately authorized transactional tests. Race duplicate claims/renew/reclaim/arm; lost response; stale epoch; concurrent bind/reconcile; duplicate billing; late charges versus rollover; refund generation; account deletion. Test old entry points cannot bypass. No real provider call is covered by rollback.
5. Security/concurrency approval: service-role-only grants, cross-user isolation, search_path/owner drift, append-only/truncate denial, trigger drift, lock_timeout/deadlock injection, nontransactional side-effect inventory. Live guarantees remain UNKNOWN before this.
6. Provider contract and billing certification, verified complete pricing and cap-compatible economics, durable worker/reconciler authority and operational incident recovery require separate review. Do not activate by simply raising caps.
7. Separate activation approval; keep HTTP 503, activationBlocked=true, executionAuthorized=false and automaticRetryAllowed=false meanwhile.

Rollback: before any irreversible submission/evidence, rollback feasibility still requires dependency review. Once submission records, billing events or liabilities exist, do not drop the ledger, erase boundaries or restore old bypasses. Disable dispatch, retain records and use forward corrective migrations. SQL rollback cannot undo external acceptance, charges or delayed invoices. Historical execution reconciliation cannot be silently corrected by a second event.
