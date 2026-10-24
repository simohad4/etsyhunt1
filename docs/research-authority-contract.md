# M4.8 B2 A5 — Offline authority contract

Status: PROPOSED, OFFLINE ONLY. Baseline feature/etsy-m1-m15-security at 5ca8bad. No executable SQL, migration, connection adapter, worker, credential or grant is created here. All deployment-dependent guarantees are UNVERIFIED. activationBlocked=true; executionAuthorized=false; automaticRetryAllowed=false; requiresAuthoritativeDatabaseValidation=true. Both analysis route implementations remain HTTP 503 for authenticated requests. A permission in this contract is not activation or permission to spend money.

## 1. Evidence and primary architecture

Repository facts: `src/server/adminRbac.ts` creates a Supabase JS service-role client and calls administrative RPCs; `src/server/m1Security.ts` verifies customer access tokens. `src/server/researchRpc.ts` gates reservation on pricing readiness. There is no implemented separated research workload authentication layer. M2 functions and grants are in `supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql` (M2 below). B1/A2 decisions are in `docs/research-durable-dispatch-sql-design.md`. The M4.7 protocol and execution safety assessor are synthetic models, not database authority.

Primary: distinct PostgreSQL LOGIN principals for Dispatcher, Reconciler and Billing, each with a dedicated NOLOGIN capability role. Supavisor session mode is the preferred pooled connection path for IPv4-only workloads, CONDITIONAL on staging verification. Direct connections are an alternative when reachable and independently verified. Transaction pooling is not approved by this contract; do not reuse session-affinity assumptions there. Do not expand the existing staging harness allowlist to test new principals.

No cross-authority membership, role administration, schema CREATE, direct table mutation, superuser, BYPASSRLS, object ownership or migration credentials for runtime logins. Capability memberships should expose only intended function EXECUTE permissions, with INHERIT TRUE and SET FALSE for those memberships, ADMIN FALSE, and no indirect escalation chain. NOINHERIT alone is not sufficient to prevent SET ROLE escalation. No membership in postgres, service_role, authenticator, migration roles or another authority. Audit effective inherited and PUBLIC privileges, not just explicit grants.

Protected SECURITY DEFINER functions use a pinned owner, search_path=pg_catalog and schema-qualified objects; current B1 specifies postgres ownership. Restrict dependencies and temporary-schema shadowing, inventory overloads, and revoke default PUBLIC EXECUTE within the same future transaction as function creation. Revoke protected research execution from PUBLIC, anon, authenticated, service_role and unintended roles; grant only the operation-specific capability. Runtime callers cannot replace functions or alter their owner. Existing ownership/DDL privileges of deployed operators are UNVERIFIED; no administrator-tamper resistance is claimed.

### Trust-boundary diagram

```text
Customer -> Auth token verification -> application request (HTTP 503 remains)
                  customer identity does not establish workload identity

Future isolated Dispatcher -> distinct authenticated DB login -> dispatch capability
Future isolated Reconciler -> distinct authenticated DB login -> reconciliation capability
Future isolated Billing    -> distinct authenticated DB login -> billing capability
                                      |
                         verify connection identity + registry
                         capability + revocation + immutable scope
                                      |
                         narrowly granted definer RPCs
                                      |
                         durable protocol/evidence/accounting

Existing admin backend -> existing admin RPCs only, no new research capability
Migration operator -> separately authorized DDL, never routine workload execution
```

Only Dispatcher may possess execution-provider credentials in a future runtime. Reconciler uses separately scoped evidence access; Billing uses separately scoped billing evidence access. Neither receives execution credentials. No runtime workload receives a project-wide JWT signing secret or unrestricted shared service_role credential. Customer tokens, research.view and caller-supplied worker IDs do not establish dispatch, reconciliation or billing authority.

A database login identifies the credential holder, not a particular process/container. Shared credentials within one workload cannot distinguish individual instances without an additional authenticated workload binding. Instance labels are audit assertions checked against permitted owner scope, not independent proof. Immutable submission intent, request/attempt/provider identity and operation identity remain separate from principal identity; an authorized principal still cannot mutate another scope or rewrite a digest/external ID.

## 2. Identity lookup and fail-closed rules

Required protected registry contract (proposed, not provisioned): immutable principal_id UUID; unique authenticated login name; capability enum dispatcher/reconciler/billing; status active/revoked; credential_generation safe positive integer; created_at and nullable revoked_at database timestamps. One login has exactly one authority. Capability assignment cannot be changed in place; use a newly provisioned principal for another authority. Role recreation under a retired login name is prohibited; retain tombstones and validate the approved database-role binding. Exact OID/name lifecycle and deployment provisioning are UNVERIFIED. Runtime principals cannot insert, activate, rebind, revoke or delete registry records. Registry administration needs a separately approved audited operator procedure; no such runtime RPC is granted here.

Primary identity is the verified authenticated database connection's session_user, resolved through that registry. current_user is unsuitable inside SECURITY DEFINER because it becomes the function owner. SET ROLE changes current_user but not session_user; SET SESSION AUTHORIZATION can change session identity from an initially superuser connection. Therefore reject pooled or direct sessions that originated as a shared privileged login; switching postgres into dispatcher is not Dispatcher authentication. Verify non-superuser login attributes, expected membership and actual identity through the selected connection path. Never trust arbitrary session variables or p_worker_id/p_authority_id as authentication. They must match verified principal/owner bindings. Public documentation supports custom roles but does not prove this project's session_user preservation or pool reset behavior: UNVERIFIED.

For EVERY operation, including exact idempotent replay and source-event duplicate receipts:

1. Authenticate the connection and obtain its registry identity through protected code.
2. Reject UNKNOWN_PRINCIPAL if missing or mismatched; reject INACTIVE_PRINCIPAL or REVOKED_PRINCIPAL for disabled/revoked authority. No implicit anonymous/service-role fallback.
3. Check exact capability, role attributes, direct/indirect memberships, credential generation and permitted scope. Cross-principal privilege denial returns CAPABILITY_DENIED; forbidden role switching must fail before a privileged operation can execute.
4. Check immutable accounting-subject/request/attempt/provider/intent scope, authoritative admission, ownership/fence and operation replay rules. A valid principal is necessary, never sufficient admission.
5. Check operation_id and canonical argument equality. Exact replay returns current safe state without repeating any effect; changed reuse rejects. Replay after revocation is REVOKED_PRINCIPAL, not a cached success. No prior operation receipt substitutes for current authority.

All codes are fixed sanitized contract codes, not newly implemented runtime errors. Do not expose raw errors, registry secrets or sensitive payloads. Unknown identity support or capability state means HOLD/DENY, never permission to dispatch.

Revocation semantics: serialize registry checks and revocation at a defined authority gate. Revocation committed before a new operation's gate must cause denial. Operations already admitted/in flight need quiescence/draining; a status flag does not retroactively cancel them. The gate's placement relative to the global lock order is UNVERIFIED and must be resolved before SQL implementation. Do not hold locks across HTTP. Check authority again in every database transaction, not merely when creating a pooled connection.

## 3. Exact capability matrix

Legend: P=proposed narrow permission, UNAVAILABLE now; F=future contract missing, DENIED; D=DENIED. No cell grants live execution in A5. Underlying budgets, intent, authoritative attempt admission and activation gates remain mandatory even for P.

| Operation | Dispatcher | Reconciler | Billing | Existing admin backend | Migration operator |
| --- | --- | --- | --- | --- | --- |
| Provider attempt admission | F | D | D | D | D |
| Claim | P | D | D | D | D |
| Renew | P | D | D | D | D |
| Arm | P | D | D | D | D |
| External identity binding | P | D | D | D | D |
| Uncertain acceptance hold | P | D | D | D | D |
| Execution reconciliation | D | P | D | D | D |
| Billing evidence ingestion | D | D | P | D | D |
| Billing correction | D | D | P | D | D |
| Financial closure/liability release | D | D | D | D | D |
| Historical evidence purge | D | D | D | D | D |

Provider attempt admission is intended for a future Dispatcher-only contract but remains F until the revised atomic attempt+intent admission contract is approved. Existing begin replay is not that contract. Billing correction P requires independently approved attributable evidence and a known baseline; it never authorizes financial closure. Financial closure/liability release and historical evidence purge are DENIED to all five authorities until separately approved contracts exist. Migration operator is administrative DDL authority under separate approval, not a business-operation override; database administrators may technically bypass protections, which is an acknowledged trust boundary, not an allowed application path.

Planned RPC mapping: Dispatcher only -> claim_research_dispatch, renew_research_dispatch_claim, arm_research_submission, bind_research_provider_identity, hold_research_dispatch. Reconciler only -> reconcile_research_dispatch. Billing only -> record_research_billing_evidence, apply_research_billing_adjustment. No current grants are changed. General service_role bypass denial applies to all protected operations, including old M2 routes. Existing admin backend retains its approved administrative surface but receives no new research authority; M1.5 permission names do not grant these capabilities.

## 4. Rotation, revocation and irreversible submission

Credential rotation must use a controlled principal-generation transition, protected mapping and separate secret scopes; no credentials are generated or inspected in this phase. Old and new logins may coexist only with independently approved capability/generation mappings. A claim bound to an old principal is not silently reassigned after arm. Distinguish planned rotation from emergency revocation. Supavisor can cache password authentication data; password rotation or NOLOGIN is not proof that existing pooled sessions have stopped. Ordinary PostgreSQL logins can change their own password, so registry revocation and session shutdown remain necessary.

Emergency shutdown: revoke registry capability and function/membership access, stop workloads, terminate/drain relevant client and backend sessions using separately authorized operator access, prevent reconnects and verify denial. Do not reset the submission boundary, delete evidence or release liability. Exact pooler cache behavior, operator session-termination permissions and shutdown latency are UNVERIFIED. Authentication expiry is not a trusted lease expiry or retroactive cancellation. Audit registry/grant changes and retain old principal tombstones.

After irreversible submission intent is armed, lease expiry, revoked credentials, worker death, lost RPC response, timeout or missing external ID must preserve uncertainty until matching authoritative evidence exists. No second sender is authorized. A paused process may still send HTTP using provider credentials; database fencing cannot prevent that external action. There is no claim of exactly-once external provider execution. Revocation cannot undo provider acceptance or charges. Execution outcome remains separate from pending late billing; missing charges are UNKNOWN, never zero. No automatic financial release, refunds, retries or historical purge follows a successful identity check.

## 5. Legacy M2 bypass closure

Repository facts: all six functions below are SECURITY DEFINER with search_path=pg_catalog, owner postgres; EXECUTE is granted to service_role and revoked from PUBLIC/anon/authenticated (M2 2178–2230). These are current exposures, NOT approved future grants. One committed signature per function is present; defaults on begin/finish do not create separate overloads. Deployed overloads, inherited grants and defaults remain UNVERIFIED.

| Exact existing signature | Current privileged effect | Required controlled behavior | Historical legacy jobs |
| --- | --- | --- | --- |
| reserve_research_job(uuid,uuid,text,integer,integer,text,text,text,text) | credit and provider-budget reservation | harden/revoke old service_role path; persist immutable protocol version; scope and replay cannot activate legacy jobs | descriptive exact replay only through approved authority; no protocol upgrade or paid admission |
| begin_research_provider_attempt(uuid,uuid,uuid,text,text,integer,text) | provider-attempt admission and allowed retry-number transitions | harden/revoke; revised admission must atomically bind validated intent and dispatch record; existing reservation/begin replay is not ownership or send permission | no new paid attempt; do not fabricate historical intent/claims |
| finish_research_provider_attempt(uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,text) | outcome, usage and cost-overrun recording | harden/revoke; enforce dispatch identity, authoritative evidence and immutable external ID before BOTH first-finish branches | terminal outcomes immutable; unfinished cases need separate audited reconciliation, not new execution |
| mark_research_job_ambiguous(uuid,uuid,text) | job/credit/budget hold | harden/revoke; propagate durable uncertainty with operation/evidence binding, never clear latch | only separately authorized audited holds, no resume/retry |
| complete_research_job(uuid,uuid,uuid,uuid,text,jsonb,integer,timestamptz,text,jsonb,text,timestamptz) | publish result, commit credit and settle accounting | harden/revoke; deny completion around unresolved dispatch or unknown liabilities; no financial closure from estimated settlement | preserve existing terminal history; no manufactured success evidence |
| fail_research_job(uuid,uuid,text) | failure settlement and generation-bound credit refund | harden/revoke; no refunds when provider acceptance remains uncertain; failed snapshot is insufficient | no automatic refund/retry; retain unresolved evidence/liability |

First-finish provider identity immutability: reject any supplied non-null provider_attempt_id different from an already bound ID BEFORE both normal and cost-overrun updates (M2 1563 and 1522). Current COALESCE replacement can change the first-finish ID; finished-replay checks at 1373–1383 are insufficient. External binding is first-write or identical replay only; cross-request/attempt/provider replacement rejects.

Atomic cutover: all six lifecycle entry points, their helpers, new admission and durable controls, capability checks, grants and overloads must be hardened or revoked in ONE future migration transaction. No callable legacy bypass may coexist with a protected wrapper. Inventory pg_proc signatures/default arguments, PUBLIC/default privileges, role inheritance, table/column mutation and executable helpers/triggers. CREATE OR REPLACE alone does not clear existing grants. Keep old consume_research_credits and reserve_research_credits/finalize_research_credits execution revoked, including service_role. Check direct financial table paths as well as RPC names; RLS bypass is not a substitute for object privileges.

Quiesce callers and drain/terminate relevant in-flight transactions BEFORE cutover; replacing a function does not secure an already-running old transaction. Verify post-cutover grants, denial of every old entry point and function-body parity before callers resume. If atomic cutover, quiescence or identity cannot be established, remain disabled. No historical-job compatibility fallback may bypass durable controls. No SQL is authored or executed here.

## 6. Fallback broker contract

Fallback only after separate approval: separately authenticated Dispatcher/Reconciler/Billing workloads -> protected internal broker -> dedicated restricted database principal -> fixed guarded RPCs. Broker verifies workload identity (e.g. approved workload identity or mTLS), issuer/audience/expiry as applicable, active capability, revocation, operation scope and replay binding. The exact authentication mechanism is UNVERIFIED; an arbitrary header, JWT claim or worker ID is not proof.

Broker accepts a fixed operation allowlist with typed bounded arguments. No arbitrary SQL/RPC forwarding, caller-selected database role, raw transport clients or forwarded database credentials. No fallback to unrestricted shared service_role. Other runtimes have no broker database credential and no direct protected mutation path. Database session_user identifies the broker, NOT the upstream workload; upstream identity requires this explicitly different verified boundary and cannot be inferred from caller-set session variables. Broker compromise affects its granted capabilities; it does not provide database-enforced three-login isolation. A revised broker-specific contract is required before replacing the primary login contract.

Broker still performs capability/revocation checks before mutation and replay, has no financial closure/purge operation, and uses immutable intent and operation identity. Broker must not possess execution-provider credentials. Unknown identity or broker availability means HOLD/DENY, not routing through the existing admin service-role client. Emergency revocation stops workloads/broker and revokes dedicated access while retaining armed/evidence state.

## 7. Future staging verification checklist — NOT EXECUTED

### A. Read-only metadata inspection — separate explicit approval

- Verify exact staging target, TLS verify-full and no production access; never print credentials or connection strings.
- Inspect role attributes, memberships including SET/INHERIT/ADMIN, effective function/table/column privileges, PUBLIC/default privileges, schema CREATE and protected registry access.
- Inventory all six M2 signatures, overloads/default arguments, helpers/triggers, SECURITY DEFINER owner/search_path and deployed parity.
- Confirm support for custom LOGINs through the selected Supavisor session path, registry/principal binding and separately managed credential scopes. Existing postgres harness checks are not evidence of custom-principal compatibility.
- Record UNKNOWNs without provisioning roles, changing credentials or expanding the existing staging harness allowlist.

### B. Isolated identity/privilege tests — separate explicit approval

- In a dedicated approved harness/environment, verify session_user outside/inside definer RPCs for each real authenticated principal; postgres SET ROLE is not a substitute.
- Assert cross-principal privilege denial, unknown/inactive/revoked rejection, direct table and registry mutation denial, forbidden role switching and general service_role bypass denial.
- Assert immutable provider identity, scope mismatch rejection, uncertain acceptance hold, unavailable financial closure and denied purge.
- Verify fixed errors and no secret-bearing logs; no providers or real paid dispatch. Fixture provisioning and cleanup require their own reviewed authorization.

### C. Multi-session concurrency and revocation — separate explicit approval

- Independent sessions with explicit barriers: duplicate workers; pre-arm reclaim versus stale sender; arm/replay/lost response; same source-event deduplication; old/new principal rotation; revocation before replay and during in-flight operations.
- Verify capability gate ordering, committed revocation denial, pooled reconnect/reset identity isolation, session shutdown and no post-arm replacement send. Record admissible in-flight transaction outcomes rather than claiming retroactive revocation.
- Race old M2 entry points against new controls, billing after execution completion, budget/account rollover and mapping deletion versus admission; include implicit locks and reverse arrival order.
- Check bounded waits/rollback, no duplicate financial effects and durable holds. Runtime deadlock freedom and pool isolation remain UNVERIFIED; static tests cannot establish them.

## 8. Evidence and release limits

Public-documentation findings from A4 support custom roles and pooling mechanisms, not deployed compatibility: Supabase role guide https://supabase.com/docs/guides/database/postgres/roles ; connection guide https://supabase.com/docs/guides/database/connecting-to-postgres ; PostgreSQL 17 identity https://www.postgresql.org/docs/17/functions-info.html ; role switching https://www.postgresql.org/docs/17/sql-set-role.html ; definer security https://www.postgresql.org/docs/17/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY . These are references to prior public research, not network retrieval in A5.

UNVERIFIED/UNKNOWN blockers: connection identity preservation; principal registry provisioning/role lifecycle; revocation gate lock placement; effective deployed grants; pooled session cleanup and shutdown; workload credential isolation; revised admission/canonical intent golden vectors; authoritative evidence access; billing baseline/coverage; retention/purge policy and accounting-subject deletion workflow. Future grants cannot activate providers or bypass incomplete pricing/caps. Paid execution and automatic retries remain disabled. This document and its tests are static contract coverage only, not PostgreSQL runtime guarantees or verified live authority.
