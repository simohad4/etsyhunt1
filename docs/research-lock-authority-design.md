# M4.8 B5 — Lock ordering and authority design

PROPOSED, OFFLINE ONLY. This is documentation and static contract coverage, not implemented SQL or deployed locking guarantees. activationBlocked=true; executionAuthorized=false; automaticRetryAllowed=false; requiresAuthoritativeDatabaseValidation=true. HTTP 503 remains unchanged. No migration, role, grant, connection, worker or transport is created. No exactly-once external execution or deadlock freedom is claimed.

## 1. Evidence: existing behavior is not the proposed order

M2 below means `supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql`. References are repository evidence, not deployed parity. Read alongside B1/A2 durable SQL design, A5 authority, A6/A8 staging gates, B3 admission, B4 canonical intent and the M4.7 simulator. Earlier documents are not silently rewritten: the graph below is a candidate refinement of their still-BLOCKED authority/subject placement, not an approved replacement or migration-ready resolution.

| Existing RPC | Observed explicit and implicit locking | Gap / future disposition |
| --- | --- | --- |
| reserve_research_job | M2 709 request advisory hashtextextended(request_id,19042026); 717 job UPDATE; 757 subscription UPDATE; 782 pricing SHARE; 846–949 global/account advisory, liabilities, windows, credit account UPDATE; later operation/job/reservation inserts | Missing job row cannot be locked; request advisory and uniqueness serialize creation. No authenticated Dispatcher registry/subject gate. Revoke old signature; replacement reservation must follow candidate graph. |
| begin_research_provider_attempt | M2 1109 request advisory; 1117 job UPDATE; 1134 attempt UPDATE; 1242 reservation UPDATE; attempt insert/job update | Existing replay is not a claim. No immutable intent/admission generation or fencing. Replacement admission atomically creates/matches intent, attempt and dispatch. |
| finish_research_provider_attempt | M2 1358 request advisory; 1367 attempt UPDATE before 1396 job UPDATE; 1411 reservation UPDATE; overrun 1437–1481 global/account advisories, liabilities, windows UPDATE; later job/operation writes | A→J differs from begin/complete J→A. Both first-finish branches at 1522/1563 can replace external ID using COALESCE. Replace with narrowly authenticated outcome/binding operations and first-write immutability. |
| mark_research_job_ambiguous | M2 1632 request advisory; 1640 job UPDATE; subsequent UPDATE of credit operation then reservation | Preserve uncertainty/held budgets; coarse replay is not authenticated reconciliation. Replace with hold operation. |
| complete_research_job | M2 1727 request advisory; 1735 job UPDATE; 1791 Apify then 1807 OpenRouter attempt UPDATE; 1827 reservation UPDATE; 1853/1863 global/account windows UPDATE; result/history/operation updates | Provider-specific attempt order is not sorted UUID order. Estimates/reported usage used in settlement are not invoice finality. Replacement completion cannot release unknown liability. |
| fail_research_job | M2 1976 request advisory; 1984 job UPDATE; 2015 operation UPDATE; 2036 reservation UPDATE; 2061/2071 windows UPDATE; 2083 credit account UPDATE | O→B differs from other paths. Period/generation-bound refunds exist, but no new durable acceptance/financial evidence gate. Replacement failure cannot refund uncertain paid dispatch. |

Same-request R mitigates some same-request cycles; this is NOT proof that these differences cause a deadlock or that they are safe. B→G/U in finish differs from reservation financial ordering; implicit operation updates differ across completion/failure/hold. Different requests share budgets and account rows. M2 constraints/indexes at 430–600 include composite scope FKs, (request_id,provider,retry_number), unique non-null (provider,provider_attempt_id), one started attempt/request and unique result/request. Unique external IDs do NOT make IDs immutable.

M2 607–637 enables RLS on seven research tables, grants authenticated own-row SELECT on jobs/results only and revokes table privileges from PUBLIC/anon/authenticated/service_role. M2 2178–2230 sets all six definer functions to owner postgres, search_path=pg_catalog, revokes PUBLIC/anon/authenticated EXECUTE and grants service_role EXECUTE. That shared callable mutation surface is a future bypass, despite table revocation/RLS.

Other paths: P1-B reserve/finalize credit routines use request→operation→credit account (revoked by M2); foundation consume uses credit account→ledger/history (browser grant revoked). Saved-listing quota uses separate account quota advisory→subscription, and must never call research while holding it. Signup/backfill inserts profile/subscription/zero-credit account; no paid entitlement is granted. Subscription resets, credit/admin writers, triggers, Auth cascades, FK key-share locks, unique-index waits, default expressions, extension calls and deployed helpers require a complete inventory. UNKNOWN writers must remain disabled from the controlled lifecycle, not assumed compliant.

## 2. Candidate total order, modes and absent rows

One transaction may own only ONE accounting subject and ONE request initially. Every participating operation uses the ordered subset below; never acquire an earlier lock after a later lock, even inside a helper, trigger or replay. No advisory session locks: advisories are transaction-scoped EXCLUSIVE pg_advisory_xact_lock. Row locks persist to commit/rollback. Lock upgrades are forbidden; decide strongest required mode before acquisition. Multiple rows at the same rank use ascending canonical UUID (windows use scope/period then UUID). No SKIP LOCKED/NOWAIT shortcut may turn contention into permission.

Candidate graph: AU0 → AU → AS → MP → R → J → S → P → A → I → D → G → U → LG → LA → WG → WA → B → O → C → E.

| Rank | Object / mode | Missing-row and scope rule |
| --- | --- | --- |
| AU0 | Proposed protected singleton authority/maintenance guard, FOR SHARE for ordinary transactions; FOR UPDATE for provisioning/cutover/deletion maintenance | Must preexist before capabilities are granted. Missing guard -> BLOCKED. Serializes registry creation and coordinates maintenance without runtime lock upgrades. New schema/design is not implemented. |
| AU | Protected authenticated principal registry row, FOR SHARE; revocation takes FOR UPDATE | Existing AU0 protects absence. Unknown/revoked identity denies; no lazy principal creation. Revocation checks cover operation/source replay. Multiple principal rows for operator maintenance sorted by UUID. |
| AS | Retained accounting-subject parent row, FOR UPDATE | Must exist before ordinary admission; no lazy creation. Account-wide serialization is deliberate conservative contention. Subject provisioning requires AU0 exclusive under separately approved operator procedure. |
| MP | Auth-to-subject mapping row, FOR UPDATE when present | AS protects absent/removable mapping. Missing mapping denies new reservation/admission/arm; independently authenticated retained billing/reconciliation is not erased by account deletion. Retained-scope lookup contract still BLOCKED. |
| R | Request advisory, exclusive transaction scope, existing request hash namespace | Serializes absent job/attempt/intent/dispatch/receipt for one request. Caller key is only a hint: revalidate persisted subject/request scope under AS and later rows. Hash collisions may over-serialize; never weaken exclusion. |
| J | Job FOR UPDATE | Existing M2 job or proposed retained request scope must match. New reservation inserts under AS/R. Detached post-deletion scope schema is BLOCKED, not invented from a missing job. |
| S | Subscription FOR UPDATE | AS guards absent account/subscription; missing eligibility rejects, never grants trial/credits. Subscription-only writers must acquire AS before S and cannot enter research later. |
| P | Immutable pricing-version row FOR SHARE | Missing/unverified price blocks admission/arm. Price writer maintenance acquires AU0 exclusive first; no mutable active snapshot or late P acquisition. Pricing rollout protocol remains BLOCKED. |
| A | Provider-attempt rows FOR UPDATE, sorted UUID | R serializes absent attempt and generation; uniqueness remains mandatory. Resolve all required attempt IDs before taking A, using only untrusted lookup hints then revalidation. |
| I | Proposed immutable intent row FOR SHARE; insert under R | Intent identity cannot be updated. R protects absent intent/generation. Insert FKs must reference already acquired parent locks. Exact canonical content AND digest must match. |
| D | Proposed dispatch row FOR UPDATE | R and A/I protect absence. One per attempt/generation; revision/epoch increments checked for overflow. No external call while locked. |
| G / U | Global then account budget advisory, exclusive transaction scope | Must retain M2's exact reviewed global/account key construction until a separately reviewed atomic namespace change. G protects missing global guards/windows, U account equivalents. Exact new guard namespaces are BLOCKED pending schema review. |
| LG / LA | Global then account liability rows FOR UPDATE | G/U protect absent rows; only approved creation path may initialize guards. Missing liability evidence never means zero exposure. |
| WG / WA | Global then account window rows FOR UPDATE | G/U protect period creation; lock all referenced periods in deterministic order within rank. Rollover cannot discard outstanding liabilities. |
| B | Budget reservation FOR UPDATE | AS/R and prior window locks protect initial insertion. Credit reservation is represented jointly by O/C and bound immutable period/generation. |
| O | Research credit operation FOR UPDATE | AS/R protect missing operation and its request uniqueness. Replay cannot double debit or refund. |
| C | Credit account FOR UPDATE | AS guards absence and prevents concurrent account reset/deletion. Missing account rejects new work. Generation/period checked against persisted operation. |
| E | Append-only operation receipts, dispatch audit, billing/reconciliation evidence, adjustments, credit ledger, result/history writes | R/D and semantic uniqueness guard missing rows. Parent locks must precede implicit FK/index locks. Unknown trigger/dependency ordering -> BLOCKED. Rejected operations cannot create unauthorized financial effects. |

This explicitly proposes authority/subject placement ahead of the B1 request graph, plus pricing P and intent I. Justification: SHARE on AU conflicts with registry status UPDATE; KEY SHARE alone would not prevent non-key revocation updates. AS conflicts with mapping removal and same-account mutations, including absent MP. AU0 exclusive maintenance waits for all ordinary AU0 SHARE holders before dependent changes. These are design arguments, NOT demonstrated compatibility with a schema that does not exist. Guard topology, retained scope/FKs, exact namespaces and implicit lock completeness remain BLOCKED. Do not generate executable SQL until approved and tested. Existing B1/B3 unresolved gates remain unresolved for implementation.

## 3. Transaction-class lock manifest

The JSON is a versioned static documentation inventory, NOT a runner or executable lock manager. Every listed rank uses section 2 mode, except revoke AU=FOR UPDATE and maintenance AU0=FOR UPDATE. All transactions authenticate and acquire AU0/AU before scope/replay lookup. Non-locking hints may locate scope, never authorize mutation; mismatch aborts instead of switching subjects while holding locks. Acquire entire declared subset before any effect or replay receipt. Deferred FK/constraint work must not introduce an earlier lock.

```json
{
  "version": "lock-authority-design-v1",
  "status": "PROPOSED_BLOCKED",
  "order": ["AU0","AU","AS","MP","R","J","S","P","A","I","D","G","U","LG","LA","WG","WA","B","O","C","E"],
  "transactions": {
    "reserve": ["AU0","AU","AS","MP","R","J","S","P","G","U","LG","LA","WG","WA","B","O","C","E"],
    "admit": ["AU0","AU","AS","MP","R","J","S","P","A","I","D","G","U","LG","LA","WG","WA","B","O","C","E"],
    "claim": ["AU0","AU","AS","MP","R","J","A","I","D","E"],
    "renew": ["AU0","AU","AS","MP","R","J","A","I","D","E"],
    "arm": ["AU0","AU","AS","MP","R","J","S","P","A","I","D","G","U","LG","LA","WG","WA","B","O","C","E"],
    "bind": ["AU0","AU","AS","MP","R","J","A","I","D","E"],
    "finish": ["AU0","AU","AS","MP","R","J","A","I","D","G","U","LG","LA","WG","WA","B","O","C","E"],
    "hold": ["AU0","AU","AS","MP","R","J","A","I","D","G","U","LG","LA","WG","WA","B","O","C","E"],
    "reconcile": ["AU0","AU","AS","MP","R","J","A","I","D","G","U","LG","LA","WG","WA","B","O","C","E"],
    "billing": ["AU0","AU","AS","MP","R","J","A","I","D","G","U","LG","LA","WG","WA","B","O","C","E"],
    "adjust": ["AU0","AU","AS","MP","R","J","A","I","D","G","U","LG","LA","WG","WA","B","O","C","E"],
    "complete": ["AU0","AU","AS","MP","R","J","A","I","D","G","U","LG","LA","WG","WA","B","O","C","E"],
    "fail": ["AU0","AU","AS","MP","R","J","A","I","D","G","U","LG","LA","WG","WA","B","O","C","E"],
    "subscription_credit_reset": ["AU0","AU","AS","MP","S","C","E"],
    "revoke": ["AU0","AU","E"],
    "delete_maintenance": ["AU0","AU","AS","MP","E"]
  },
  "activationBlocked": true,
  "executionAuthorized": false,
  "automaticRetryAllowed": false,
  "runtimeGuaranteesVerified": false
}
```

Reserve/admit allocate credits/budgets exactly once; admit includes validated B4 intent and one generation-1 attempt. Claim/renew are pre-arm ownership only. Arm rechecks eligibility, pricing, budgets, current owner/epoch and stores the irreversible boundary once. Finish/bind require first-write or identical external identity; late stale evidence goes through Reconciler, not an ownership bypass. Hold/reconcile preserve uncertainty until matching authenticated evidence; no retry permission follows resolution. Billing/adjust use separately authenticated attempt-attributable evidence and two-level deduplication. Complete/fail denote future narrowed internal operations, not permission to invoke old signatures or close financial liability.

delete_maintenance is ONLY initial admission disablement, mapping removal and retained subject tombstoning under AU0 exclusive. It must NOT execute Auth cascade deletion, operational-row purge or liability release. Full account deletion needs a separately reviewed retained-scope/FK transfer procedure and implicit lock manifest; it remains BLOCKED. It cannot simply follow this abbreviated subset into cascading deletes. Retention periods/legal policy remain UNKNOWN. Existing Auth-dependent FKs must not erase the future retained ledger.

## 4. Authority, grants and revocation

Primary: distinct non-superuser PostgreSQL LOGIN principals for Dispatcher, Reconciler and Billing; dedicated NOLOGIN capability roles. Authenticate verified session_user through protected registry plus role binding/credential generation. current_user inside SECURITY DEFINER is its owner, not the authenticated caller. SET ROLE does not establish a new login; a shared privileged session or SET SESSION AUTHORIZATION path cannot stand in for a workload. Caller role strings, p_worker_id, JWT-shaped text and mutable session settings alone are not authentication. Supavisor session-path identity/reset/revocation behavior remains UNVERIFIED; transaction-pool equivalence is not assumed.

Membership policy: INHERIT TRUE, SET FALSE, ADMIN FALSE for the exact capability membership; no direct/indirect membership in other authorities, postgres, service_role, authenticator, migration roles; no SUPERUSER, BYPASSRLS, CREATEROLE, schema CREATE, object ownership or direct table writes. Verify PUBLIC/inherited/effective privileges and default privileges. A protected broker is an explicitly separately approved fallback with independently authenticated workloads, fixed capability mapping and a restricted database identity; it cannot restore shared service_role access or possess execution-provider credentials.

Proposed exact capability surface (names, not executable GRANT statements):

| Capability | Exclusive intended entry points | Denials |
| --- | --- | --- |
| Dispatcher | admit_research_provider_attempt; claim_research_dispatch; renew_research_dispatch_claim; arm_research_submission; bind_research_provider_identity; hold_research_dispatch | No reconcile, billing, settlement, purge or direct old M2 calls. Admission remains unavailable pending B3 approval/implementation. Reserve and completion/failure publication authority are not granted by this table. |
| Reconciler | reconcile_research_dispatch | No claim/arm/provider send, billing correction, financial closure or purge. Evidence independently authenticated; synthetic flags insufficient. |
| Billing | record_research_billing_evidence; apply_research_billing_adjustment | No dispatch/reconcile, automatic refund, financial closure/liability release or historical purge. |

Reserve, internal outcome finishing, completion/failure publication, cancellation, registry administration, retention and maintenance need exact approved replacement signatures/authority contracts before runtime grants: BLOCKED. Do not grant Dispatcher broad finish/settlement merely because section 3 inventories their lock needs. No dynamic overload grant is inferred from a function name; future typed signatures must match the approved manifest.

Revoke EXECUTE on all protected old/new functions and helpers from PUBLIC, anon, authenticated, service_role, existing admin and unintended workload roles; grant only the exact approved typed entry point to its NOLOGIN capability. All six OLD external signatures have no runtime direct callers per A8. Revoke default PUBLIC EXECUTE for the actual creating owner in every relevant schema, and perform explicit same-transaction revocation at function creation; defaults alone do not fix existing functions. Deny direct mutation/schema creation to runtime roles. RLS is defense in depth, not protection from a privileged owner.

SECURITY DEFINER owner is pinned postgres under existing B1 (privileged DDL/operator trust boundary, not a claim of administrator resistance); runtime logins own nothing. Use search_path=pg_catalog, schema-qualified references, no untrusted schema/temp shadowing/dynamic identifiers, controlled dependencies and non-callable private helpers. Ownership/effective grants/deployed overloads must be verified, not inferred from repository text.

Revocation transaction takes AU0 SHARE then target AU UPDATE, marks registry inactive/revoked and appends its audited event; no subject locks. Runtime holds AU SHARE to end of transaction and rechecks under it, including exact replay. If revocation commits first, the operation denies; if the operation already holds AU SHARE, it may commit before revocation obtains AU UPDATE. This is a linearization boundary, not retroactive cancellation. An emergency operator must separately stop workloads, revoke capabilities, drain/terminate active and pooled sessions and verify denial. Password rotation/NOLOGIN alone does not invalidate existing sessions. Do not upgrade a runtime AU SHARE lock into revocation; separate transactions/procedures only. No lock may be held across HTTP.

## 5. Atomic legacy cutover and schema invariants

All six exact M2 signatures requiring runtime direct denial:

- reserve_research_job(uuid,uuid,text,integer,integer,text,text,text,text)
- begin_research_provider_attempt(uuid,uuid,uuid,text,text,integer,text)
- finish_research_provider_attempt(uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,text)
- mark_research_job_ambiguous(uuid,uuid,text)
- complete_research_job(uuid,uuid,uuid,uuid,text,jsonb,integer,timestamptz,text,jsonb,text,timestamptz)
- fail_research_job(uuid,uuid,text)

Prepare offline schema/dependency/capability manifest; separately authorize migration writing. Before a future cutover, disable callers and quiesce/drain in-flight transactions, including prepared/pool-reused callers and external financial/credit writers. In ONE migration transaction install approved controls/private implementations, revoke all six old signatures/overloads and helper bypasses, harden replacement entry points and grants/defaults, and bind immutable protocol markers. Verify denial and coverage before callers resume. No mixed unsafe old/new window. If any participating writer cannot comply, revoke it or remain BLOCKED. CREATE OR REPLACE alone does not clear grants or secure already running old code. DDL locks and cutover rollback require their own reviewed inventory.

Keep legacy-disabled jobs non-dispatchable; do not fabricate intents, upgrade replay into admission or adopt historical unknown attempts. Old credit consume/reserve/finalize paths stay revoked. Missing controlled dispatch rows reject, never legacy fallback. Internal helpers are not independent privileged entry points. A migration rollback must disable capabilities/callers, not restore unsafe legacy access; armed state and external liability cannot be rolled back by database transaction rollback.

Future constraints: immutable request/subject/reservation/period/generation; unique local attempt and (request,provider,dispatch_generation); unique dispatch per attempt; one permitted active attempt/request; immutable canonical intent/version/hash; monotonically checked epoch/revision; irreversible armed_at; first-write non-null external identity and unique (provider,external_id); immutable terminal execution outcome; operation ID plus exact canonical argument comparison; source semantic identity plus evidence digest deduplication. Changed operation replay rejects; exact replay returns current state without another audit/financial effect. A new operation for a duplicate billing source may create only its specified receipt, no duplicate charge. First-finish ID validation must precede BOTH normal and overrun branches; A→B rejects, A→null retains A, null→A binds, exact finished replay has no second effect. Same operation changing A to null is conflicting replay, not identical omission.

## 6. Concrete concurrency acceptance matrix — NOT EXECUTED

Winner means first serialized valid transaction, not wall-clock arrival or an unfairness guarantee. Reverse arrival schedules must also be tested using independent sessions and explicit barriers. Every row is a FUTURE approval-dependent test, not a static lock simulation.

| ID / race | Winner and loser | Lock dependency | Invariant / fail-closed result |
| --- | --- | --- | --- |
| C01 admission vs admission | First valid admission wins; exact duplicate gets receipt, conflicting body/attempt loses | AU0/AU→AS/MP→R→J→A/I/D→financial subset | One attempt/generation, one allocation; no second send. |
| C02 admission vs revocation | AU UPDATE committed first -> admission denied; existing AU SHARE holder may finish before revoke | AU0→AU SHARE vs UPDATE | Revocation checked on replay; no retroactive cancellation claim; stop/drain armed senders separately. |
| C03 admission vs credit reservation | First AS/R owner wins; second revalidates balance/generation/exposure | AS→MP→R→J/S/P→G/U→LG/LA→WG/WA→B/O/C | Atomic credits/global/account budgets; insufficient/stale state rejects, no double debit. |
| C04 claim expiry vs stale worker | Current valid epoch wins; old owner loses after pre-arm reclaim | AS/R→J→A/I/D | Database clock and epoch checked; post-arm expiry never permits reclaim/resend. |
| C05 arm vs cancellation | If arm commits first, cancellation cannot erase boundary; pre-arm approved stop wins otherwise | AS/R→J→A/I/D then financial locks | Cancellation interface is BLOCKED until specified; uncertainty holds, no invented cancel RPC or refund. |
| C06 provider binding vs conflicting finish | First non-null immutable ID wins; differing ID loses | AS/R→J→A/I/D | Both finish branches reject replacement before mutation; unique index is secondary guard. |
| C07 Reconciler vs Dispatcher | First revision-valid event wins; stale/conflicting evidence loses | Separate AU rows, shared AS/R→J→A/I/D→financial locks | No outcome rewrite; exact replay safe; missing ID/uncertain acceptance retains hold. |
| C08 billing evidence vs refund/closure | Valid evidence may append; closure is denied to ALL three principals; unresolved refund loses | AS/R→J→A/I/D→G/U→LG/LA→WG/WA→B/O/C→E | Missing charges unknown; independently authenticated evidence; no liability release or duplicate source effect. |
| C09 completion vs financial hold | Either arrival order preserves liability; late charge may reopen financial pending | AS/R→J→A/I/D→financial locks | Historical execution outcome separate from financial status; completion cannot erase late hold. |
| C10 deletion vs retained subject | AU0 exclusive maintenance waits for ordinary holders; new admission after mapping removal loses | AU0→AU→AS→MP; full cascade transfer BLOCKED | Retain accounting subject/evidence; no raw Auth cascade into ledger, no permanent deletion block assumed. |
| C11 legacy RPC vs new admission | Old direct runtime call always denied before mutation; new call still needs every gate | Atomic cutover + same graph for all private implementations | No coexistence bypass; missing grants/overload inventory blocks release. |
| C12 database abort vs irreversible submission | No send occurs inside retried transaction; uncertain arm commit remains held | Whole declared subset, rollback before release | 40001/40P01 require safe reviewed database-only restart policy; timeout/lost commit never means provider rejection. |

## 7. Database retry, external uncertainty and financial holds

Default remains NO automatic retries, including database errors, consistent with existing B1/A6. A separately approved future database-only retry policy may permit bounded whole-transaction restarts after a CONFIRMED server abort with SQLSTATE 40001 or 40P01, reusing immutable operation identity and revalidating authority, versions and budget. No retry inside the failed transaction, no partial statement retry and no HTTP/SDK/callback inside it. Bound attempts/backoff/timeouts must be reviewed separately: UNKNOWN/BLOCKED, not implemented here. 55P03 timeout is not implicit retry permission. Deadlocks caused by inverted ordering fail acceptance, even if a hypothetical restart could succeed.

Lost commit/arm response, disconnect, timeout, partial output or missing provider ID require operation-status reconciliation, not a new submission. A lost arm response can only recover a descriptive receipt; exact arm replay never grants a second send. Database fencing cannot stop an already paused external sender. Lease expiry is not proof of non-acceptance. Automatic provider retry remains forbidden even if a SQL transaction was rolled back.

Execution phase and financial_status are independent. Missing costs remain UNKNOWN, never zero; invoices are evidence, not extra duplicate charges. Provisional scenarios and local token estimates cannot verify billing. Global/account liabilities and historical periods survive rollover; signed late adjustments append with checked integer microUSD arithmetic and deduplication, never rewrite execution. Preserve $0.12/credit cap and unverified-price activation block. Financial closure/liability release and historical purge are denied to Dispatcher, Reconciler and Billing; negative adjustments do not release a hold. Partial/pooled/overlapping invoice allocation remains unsupported. Safe failure is HOLD/BLOCKED, never guessed settlement.

## 8. B4 interoperability and release gates

PostgreSQL must independently reconstruct dispatch-canonical-v1 UTF-8 bytes and SHA-256 using submission-intent-v1 versus dispatch-operation-v1 domains, NUL framing, sorted ASCII object keys, ordered arrays, exact Unicode scalars, explicit null and strict supported schemas. No NFC/NFKC or implicit numeric coercion; JSON/jsonb parsing may discard duplicate keys and lexical distinctions, so validate before lossy conversion and forbid unsupported fractional/unsafe/-0 inputs. Do not hash jsonb::text or JSON.stringify as canonical equivalence. Typed-tree and PostgreSQL numeric acceptance/rejection vectors must align, not merely coincidentally hash valid strings.

B4 has 13 fixed Python-derived golden vectors and 16 focused TypeScript tests at this baseline. PostgreSQL certification is BLOCKED until independently reviewed SQL matches exact bytes AND digests for every fixed vector and all rejection/version/Unicode/numeric cases; operation fencing must not alter immutable intent. The B4 arm hash is NOT a complete RPC argument/authority contract. No activation until cross-runtime vectors match; TypeScript/Python success is not PostgreSQL compatibility.

CRITICAL: guard/registry/retained-subject schema and placement approval; exact replacement authority/signature manifest; atomic legacy/grant cutover; complete implicit lock/writer inventory and isolated staging schedules; durable admission and uncertainty/billing reconciliation. HIGH: session identity/pooler revocation proof, PostgreSQL vectors, pricing/billing and actor build evidence, retention/deletion and maintenance policy. Every missing object, inaccessible metadata or unresolved dependency is UNKNOWN/BLOCKED, not a successful acceptance.

Next phase stays offline: review this candidate graph against exact future schema/FKs and authority contracts, reconcile B1/B3/A5/A6 documents through separate approval, and prepare bounded concurrency schedules. Gate 1 baseline read-only discovery is NOT Gate 2 post-cutover authority acceptance. Future staging privilege/concurrency tests require separate approval, independent sessions, barriers in both arrival orders, timeout/rollback/cleanup verification, and sanitized lock/revision evidence. Finite schedules do not prove all schedules safe. No database runtime verification occurred in B5.
