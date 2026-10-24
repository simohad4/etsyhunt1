# M4.8 B2 A6 — Offline staging authority verification plan

OFFLINE / NON-EXECUTING. Repository branch feature/etsy-m1-m15-security, inspected HEAD 9f44d2d. This document is a future procedure, NOT authorization to connect or run its templates. No executable harness, migration, role, grant, revocation, fixture or worker is implemented. Static tests check structured coverage and repository signature consistency, not PostgreSQL runtime guarantees. activationBlocked=true; executionAuthorized=false; automaticRetryAllowed=false; authenticated HTTP 503 remains unchanged. There is no GO for paid execution in this plan.

## 1. Source of truth and existing limitations

Read together: `docs/research-authority-contract.md` (A5); `docs/research-durable-dispatch-sql-design.md` (B1/A2); `docs/research-dispatch-protocol.md` (M4.7 simulator); their static tests. SQL baseline is `supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql` (M2), particularly six definitions at 642/1070/1297/1612/1678/1948 and owner/grants at 2178–2230. M1/P1-B retire old credit execution; M1.5 grants research.view but not workload reconciliation authority.

`src/server/adminRbac.ts` initializes a Supabase JS service-role client; `src/server/m1Security.ts` authenticates customers. `src/server/researchRpc.ts` gates reservation before its injected RPC client is accessed. These do not prove workload authentication. Existing M4.7 model late billing uses a shared hold phase; M4.8 expects financial state independent of completed/reconciled execution. Do not use model outcomes as live SQL evidence.

`tests/research-staging.integration.mjs` implements separate --static/--preflight/--run modes with exact staging target validation, verify-full TLS, isolated environment, timeouts and default-denied writes. It admits only postgres/direct or postgres.project-ref/session-pooler identities. Its session compatibility SQL expects session_user=postgres. `tests/research-staging.preflight.sql` currently requires service_role EXECUTE on all six M2 functions, whereas future authority controls must close that bypass. `tests/research-staging.parity.mjs` pins existing reviewed bodies/triggers. Therefore an M3.6 PASS is NOT an M4.8 authority PASS. Do not expand the existing staging harness allowlist, reuse --run for authority tests, or automatically accept changed parity pins. Future harness/parity changes need separate review; nothing here modifies them.

## 2. Ordered approval gates and target verification

1. G0: offline plan review only (this task). Every live scenario starts BLOCKED/unexecuted.
2. G1: explicit authorization for read-only staging access, named operator, time window, exact target and approved metadata queries. No fixtures, role switching experiments, function invocation, credential generation or grants under this gate.
3. G2: separate approval for isolated synthetic fixture/privilege tests, exact reviewed SQL/function versions, authenticated principal provisioning by an authorized operator, side-effect inventory, cleanup and recovery procedure. Missing roles/functions -> BLOCKED; do not create them opportunistically.
4. G3: separate approval for multi-session races, revocation, active-session termination and any persistent role/registry changes. G2 approval alone does not authorize G3. Review migration/lock/authority-gate placement first; unresolved placement -> BLOCKED.
5. G4: independent evidence review. GO may permit only another separately approved validation phase. No approval here enables providers, closure, purge, pricing or production access.

Exact staging project ref: iwqnyqaefovhvnunarfa. Explicitly reject production fdvnojlojtfiwhtchgdk. Expected staging database postgres. Approved existing paths: direct db.iwqnyqaefovhvnunarfa.supabase.co:5432 or Supavisor session host aws-0-eu-west-1.pooler.supabase.com:5432. The future custom role username is approved-login.iwqnyqaefovhvnunarfa through the shared pooler, approved-login for direct; approved-login is a placeholder, not a provisioned identity. Verify each exact login against the approved principal inventory, not a wildcard or username suffix alone. Reject arbitrary hosts, alternate regions, IP literals, suffix attacks, transaction port 6543, production references and unreviewed URI parameters. Copy target identity from separately verified project metadata; a shared pooler host alone does not establish the project.

Before any future connection, cross-check authorized target/project identity using approved operator metadata and local target validation without logging credential values. Client TLS must use verify-full plus trusted CA/approved system trust and hostname verification; encryption alone is insufficient. For pooler connections pg_stat_ssl describes the database backend leg, not proof of client-to-pooler certificate verification. Preserve explicit client-side TLS evidence and target validation. SQL current_database/session_user cannot prove a Supabase project ref. Any identity/TLS discrepancy -> stop before scenarios.

Credentials must be provided through a separately approved secret mechanism; never paste into commands, URLs in reports, terminal transcripts, process arguments or artifacts. No .env inspection. No SELECT from pg_authid, password verifier extraction, JWT retrieval or secret-bearing registry fields. Query results below are sanitized in memory before export; do not capture raw pg_stat_activity.query, provider bodies or connection strings. No HTTP/provider calls from the verification harness; reviewed fixture functions/triggers must exclude webhooks, extension network calls and other nontransactional effects. SQL rollback does not undo provider calls, sequence increments or external effects.

## 3. Structured coverage inventory

The JSON below is documentation data parsed by offline tests, NOT an executable runner/configuration or a record of completed tests. Role labels represent approved future login identities; they are not credentials. Prerequisites must be evidenced, never assumed. Every case requires G0/G1; identity tests additionally G2; concurrency tests additionally G2/G3. All cases use the artifact and cleanup contracts in sections 7–8.

```json
{
  "schemaVersion": "authority-verification-plan-v1",
  "execution": {"mode": "offline-plan-only", "activationBlocked": true, "executionAuthorized": false, "automaticRetryAllowed": false, "databaseAccessAuthorized": false, "paidExecutionGoAllowed": false},
  "target": {"stagingRef": "iwqnyqaefovhvnunarfa", "rejectedProductionRef": "fdvnojlojtfiwhtchgdk", "database": "postgres", "sessionHost": "aws-0-eu-west-1.pooler.supabase.com", "port": 5432, "sslmode": "verify-full", "expandM36Allowlist": false},
  "stages": [
    {"id": "metadata", "gates": ["G0", "G1"], "fixtures": false, "writes": false},
    {"id": "identity", "gates": ["G0", "G1", "G2"], "fixtures": true, "writes": true},
    {"id": "concurrency", "gates": ["G0", "G1", "G2", "G3"], "fixtures": true, "writes": true}
  ],
  "legacyRpcs": [
    {"signature": "reserve_research_job(uuid,uuid,text,integer,integer,text,text,text,text)", "effect": "credit_budget_reservation", "currentServiceRoleExecute": true, "targetDirectCallers": [], "check": "A6-M04"},
    {"signature": "begin_research_provider_attempt(uuid,uuid,uuid,text,text,integer,text)", "effect": "attempt_admission", "currentServiceRoleExecute": true, "targetDirectCallers": [], "check": "A6-M04"},
    {"signature": "finish_research_provider_attempt(uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,text)", "effect": "outcome_usage_overrun", "currentServiceRoleExecute": true, "targetDirectCallers": [], "check": "A6-M04"},
    {"signature": "mark_research_job_ambiguous(uuid,uuid,text)", "effect": "uncertainty_hold", "currentServiceRoleExecute": true, "targetDirectCallers": [], "check": "A6-M04"},
    {"signature": "complete_research_job(uuid,uuid,uuid,uuid,text,jsonb,integer,timestamptz,text,jsonb,text,timestamptz)", "effect": "publish_credit_settlement", "currentServiceRoleExecute": true, "targetDirectCallers": [], "check": "A6-M04"},
    {"signature": "fail_research_job(uuid,uuid,text)", "effect": "failure_refund", "currentServiceRoleExecute": true, "targetDirectCallers": [], "check": "A6-M04"}
  ],
  "checks": [
    {"id":"A6-M01","stage":"metadata","prerequisites":["approved_target","client_tls"],"coverage":["staging_identity","production_exclusion","tls"],"queries":["Q1"],"expected":"exact_target_read_only","evidence":["target_tls_receipt"],"cleanup":"read_only_rollback","initialStatus":"BLOCKED"},
    {"id":"A6-M02","stage":"metadata","prerequisites":["M01_pass","approved_principal_inventory"],"coverage":["role_attributes","membership","inheritance","forbidden_switching"],"queries":["Q2","Q3"],"expected":"narrow_nonprivileged_roles","evidence":["role_membership_matrix"],"cleanup":"read_only_rollback","initialStatus":"BLOCKED"},
    {"id":"A6-M03","stage":"metadata","prerequisites":["M02_pass","approved_function_inventory"],"coverage":["definer_owner","search_path","public_defaults","effective_execute","overloads","helpers"],"queries":["Q4","Q5","Q6"],"expected":"reviewed_effective_privileges","evidence":["function_acl_matrix"],"cleanup":"read_only_rollback","initialStatus":"BLOCKED"},
    {"id":"A6-M04","stage":"metadata","prerequisites":["M03_pass","approved_cutover_manifest"],"coverage":["six_m2_rpcs","service_role_bypass","alternate_paths","atomic_cutover"],"queries":["Q4","Q5","Q6"],"expected":"legacy_direct_execute_denied","evidence":["legacy_bypass_matrix"],"cleanup":"read_only_rollback","initialStatus":"BLOCKED"},
    {"id":"A6-I01","stage":"identity","prerequisites":["metadata_pass","provisioned_test_principals","reviewed_definer_probe"],"coverage":["dispatcher_identity","reconciler_identity","billing_identity","session_user","current_user","definer_identity","session_pooling"],"queries":["Q1"],"expected":"authenticated_login_preserved","evidence":["identity_matrix"],"cleanup":"isolated_fixture_cleanup","initialStatus":"BLOCKED"},
    {"id":"A6-I02","stage":"identity","prerequisites":["I01_pass","reviewed_synthetic_fixtures"],"coverage":["cross_principal_denial","unknown_revoked_principals","scope_isolation","registry_protection","role_switching","old_rpc_denial"],"queries":[],"expected":"authorized_only_or_unavailable","evidence":["allow_deny_matrix"],"cleanup":"isolated_fixture_cleanup","initialStatus":"BLOCKED"},
    {"id":"A6-I03","stage":"identity","prerequisites":["I02_pass","approved_side_effect_inventory"],"coverage":["provider_id_immutability","uncertain_acceptance","incomplete_finance","financial_closure_denied","purge_denied","audit_evidence","pricing_blocks"],"queries":[],"expected":"holds_and_gates_preserved","evidence":["state_audit_diff"],"cleanup":"isolated_fixture_cleanup","initialStatus":"BLOCKED"},
    {"id":"A6-C01","stage":"concurrency","prerequisites":["identity_pass","approved_lock_graph","approved_registry_gate"],"coverage":["competing_claims","stale_fences","reconciler_dispatcher_race","paused_sender","lost_arm_response"],"queries":["Q7"],"expected":"one_owner_no_resend","evidence":["barrier_schedule","state_audit_diff"],"cleanup":"multi_session_cleanup","initialStatus":"BLOCKED"},
    {"id":"A6-C02","stage":"concurrency","prerequisites":["identity_pass","approved_revocation_procedure","operator_shutdown_authority"],"coverage":["grant_revocation","active_sessions","pool_reuse","reconnect","cached_execution","concurrent_role_change","replay_after_revocation"],"queries":["Q2","Q3","Q5","Q7"],"expected":"revocation_gate_denies_new_operations","evidence":["barrier_schedule","revocation_receipt","allow_deny_matrix"],"cleanup":"multi_session_cleanup","initialStatus":"BLOCKED"},
    {"id":"A6-C03","stage":"concurrency","prerequisites":["identity_pass","approved_lock_graph","approved_cutover_manifest"],"coverage":["billing_closure_race","late_billing","source_dedup","legacy_boundary_race","deadlock_detection","lock_order","mapping_deletion"],"queries":["Q7"],"expected":"no_duplicate_effect_no_financial_release","evidence":["barrier_schedule","state_audit_diff","legacy_bypass_matrix"],"cleanup":"multi_session_cleanup","initialStatus":"BLOCKED"}
  ],
  "failureModes": ["collapsed_identity","service_role_bypass","definer_escalation","unrevoked_legacy","incomplete_finance","lock_inversion","stale_identity","missing_audit","provider_pricing_unknown"],
  "decisions": {"missingEvidence":"BLOCKED","unknownDeployment":"BLOCKED","securityMismatch":"FAIL","paidExecution":"NO-GO","productionAccess":"NO-GO"}
}
```

## 4. Documentation-only SQL inspection templates

DO NOT EXECUTE in A6. These SELECT-only templates are not a connection script. Under G1, an approved operator would use a separately reviewed read-only transaction, bounded statement/lock timeouts and explicit rollback. Substitute only validated approved role names via typed parameters, never string-built SQL. Do not invoke a lifecycle/definer function to discover its privileges. Lack of metadata permission -> BLOCKED, not elevated access. Q4–Q6 inventory privileges but do not prove runtime denial or absence of side effects.

Q1 — session context; combine with client target/TLS evidence, never treat it as project-ref proof:

```sql
SELECT current_database(), session_user, current_user,
       current_setting('transaction_read_only') AS transaction_read_only,
       pg_backend_pid();
```

Q2 — non-secret attributes for approved role names only:

```sql
SELECT rolname, rolcanlogin, rolsuper, rolcreaterole, rolcreatedb,
       rolreplication, rolbypassrls, rolinherit, rolvaliduntil
FROM pg_catalog.pg_roles WHERE rolname = ANY($1::text[]);
```

Q3 — PostgreSQL 17 membership edges; approved inventory must include the entire reachable chain, not only immediate roles:

```sql
SELECT member_role.rolname AS member, granted_role.rolname AS granted_role,
       m.admin_option, m.inherit_option, m.set_option
FROM pg_catalog.pg_auth_members m
JOIN pg_catalog.pg_roles member_role ON member_role.oid = m.member
JOIN pg_catalog.pg_roles granted_role ON granted_role.oid = m.roleid
WHERE member_role.rolname = ANY($1::text[]);
```

Q4 — all public overloads for approved lifecycle/helper names, owner, definer/search_path and direct ACL (do not collect source bodies or data payloads by default):

```sql
SELECT p.oid::regprocedure::text AS signature, owner_role.rolname AS owner,
       p.prosecdef, p.proconfig, p.pronargdefaults,
       acl.grantee, acl.privilege_type, acl.is_grantable
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = p.proowner
LEFT JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl ON true
WHERE n.nspname = 'public' AND p.proname = ANY($1::text[]);
```

Q5 — effective EXECUTE for each approved role/signature pair, including service_role, anon, authenticated, dispatcher/reconciler/billing and admin login. Run for every discovered overload. PUBLIC is represented by grantee=0 in ACLs, not passed as a login:

```sql
SELECT pg_catalog.to_regprocedure($2::text) AS function_oid,
       pg_catalog.has_function_privilege(
         $1::name, pg_catalog.to_regprocedure($2::text), 'EXECUTE') AS effective_execute;
```

Q6 — default privilege grants (absence of a row does NOT mean no default PUBLIC EXECUTE; combine with PostgreSQL built-in defaults and Q4):

```sql
SELECT defaclrole::regrole::text AS owner, defaclnamespace,
       defaclobjtype, a.grantee, a.privilege_type, a.is_grantable
FROM pg_catalog.pg_default_acl d
CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
WHERE d.defaclobjtype = 'f';
```

Q7 — bounded diagnostic snapshot during separately approved concurrency tests; redact PIDs/role labels if needed and never export query text/client addresses:

```sql
SELECT pid, usename, state, wait_event_type, wait_event,
       pg_catalog.pg_blocking_pids(pid) AS blockers
FROM pg_catalog.pg_stat_activity
WHERE datname = current_database() AND usename = ANY($1::text[]);
```

Review dependencies/triggers, schema/table/column rights, registry status and default arguments against the approved migration manifest through separately approved metadata templates; no generic function-body dump or secret-bearing registry query. The new registry/schema/probe names are not known deployed objects. Missing approved templates or visibility is BLOCKED. No probe function is created here. For I01, only an independently reviewed, approved synthetic definer probe can report its internal identity; Q1 outside a function cannot prove definer identity.

## 5. Legacy RPC target and identity/privilege procedure

The structured legacyRpcs inventory contains all six exact committed signatures; defaults on begin/finish are arguments, not extra signatures. Each currently grants service_role EXECUTE, uses SECURITY DEFINER/search_path=pg_catalog and owner postgres. M04 is a FUTURE cutover target: all six old external signatures have NO authorized runtime direct callers (Dispatcher, Reconciler, Billing, existing admin login, service_role, authenticated, anon all denied). Reviewed replacement admission/operations use new narrow entry points and non-callable private helpers. If an alternative hardened legacy wrapper is later chosen, revise/approve this plan first; do not silently mark it PASS. Database owner authority is a maintenance trust boundary, not a valid runtime negative-test identity.

| Existing RPC | Required evidence beyond common ACL/overload checks |
| --- | --- |
| reserve_research_job | no old credit/budget reservation path around protocol version or subject/admission checks |
| begin_research_provider_attempt | old begin/replay/retry number cannot grant dispatch or create an unbound intent |
| finish_research_provider_attempt | both normal and overrun first-finish branches reject replacement provider ID; finished replay alone insufficient |
| mark_research_job_ambiguous | no legacy operation can clear a durable uncertainty/financial hold or substitute for authoritative reconciliation |
| complete_research_job | no result publication/settlement around unresolved dispatch or incomplete financial liability |
| fail_research_job | uncertain acceptance cannot trigger refunds/release; preserve credit generation rules |

For EACH: under M03/M04 compare owner/config and direct ACL (Q4), effective rights (Q5), full membership chain (Q3), defaults (Q6), all overloads/default-call forms, exposed schemas and helper dependencies. Under I02 test actual denied invocation ONLY against approved synthetic fixtures after G2; inspect before/after rows/audit. Permission denial is required for old external signatures, not merely a later pricing/input-validation error. No application owner/superuser is used to claim runtime denial. New intended entry points allow only their exact capability; the other two principals, general service_role/admin/browser callers must be denied before mutation/replay. Missing principals/new functions -> BLOCKED. Never call current write RPCs under G1.

I01 uses genuinely authenticated Dispatcher, Reconciler and Billing connections, separately pooled; postgres SET ROLE is not equivalent. Check session_user equals the approved login both outside/inside reviewed definer probe; current_user outside equals expected login context and inside equals pinned function owner. Forbid authority-changing SET ROLE chains and arbitrary session-variable impersonation in I02 (G2 only). Verify protected registry active status and exact subject/request/attempt/provider/fence binding. Customer Auth tokens and arbitrary JWT claims do not establish this direct-login authority.

I03 uses approved synthetic records only. Test changed external ID at both first-finish branches, missing ID/timeout/unknown acceptance, stale evidence, cross-request/attempt/provider binding, missing usage/invoice evidence, failed snapshot with uncertain acceptance and late billing after completed/reconciled execution. Expect immutable execution history, financial pending/unknown and no refund, closure, purge or retry. Provider/billing/pricing uncertainty remains BLOCKED for activation even if authority tests pass. No real request is submitted. Existing public-documentation findings are mechanism evidence, not evidence of deployed compatibility.

## 6. Controlled concurrency, revocation and cached paths

Documented PostgreSQL behavior from prior A4: SET ROLE changes current_user, not session_user; definer execution uses owner authority; membership SET/INHERIT options differ; default PUBLIC EXECUTE needs explicit revocation. Supabase documents session-mode affinity and password-cache rotation delays. Project-specific behavior is UNVERIFIED: all pooling identity/reset, revocation gate ordering, prepared-plan privilege behavior, shutdown latency and actual role memberships must be observed. Do not infer immediate revocation from password rotation, NOLOGIN or a successful metadata query.

C01: two authenticated dispatcher sessions contend for one synthetic attempt with explicit barriers before/after claim and arm. One fresh owner/epoch only; losing or stale sender denied; pre-arm expiry may fence/reassign, post-arm expiry never allows resend. Pause a sender, lose an arm reply and replay exact operation: current safe state only, never a second send. Reconciler races binding/outcome: stale revision/epoch or mismatched evidence rejects; no rewrite of original identity/outcome. No network sender exists in tests.

C02: only with approved reversible fixture principal/grant/registry changes. Establish an active session and prepare/cache a permitted synthetic operation before revocation. In another session commit capability/grant revocation at the reviewed authority gate; then attempt ordinary, prepared/cached, exact replay, pooled reuse and fresh reconnect paths. Revocation before the operation gate must deny; already-admitted transactions have explicitly documented possible completion/rollback and must be drained, not falsely claimed canceled. Attempt forbidden cross-authority switching before/after change. Re-run context checks on every pool checkout/reconnect. Log ordering with database revisions/barrier IDs, not wall-clock guesses. Unknown gate placement or inability to test prepared execution -> BLOCKED. No automatic retry on deadlock/transport uncertainty. Do not restore old capability merely to clear a test failure.

C03: race source duplicates with different operation IDs and assert exactly one ledger/financial effect (audit duplicate receipts follow B1). Race billing evidence against attempted financial closure: closure is UNAVAILABLE and must be denied, not successfully settled. Future positive closure tests remain BLOCKED pending a separate contract. Late evidence preserves execution phase/outcome and leaves pending financial review. Race each old M2 external path with new operations: old signature denied, no bypass during cutover. Include shared-account/global budgets, rollover, retained-subject mapping deletion/admission and registry revocation. Required total lock order comes from approved B1 plus still-unresolved subject/authority gate placement; inventory implicit FK/index/trigger/financial locks. Run reverse arrival orders and forced pauses, inspect Q7 and sanitized SQLSTATE outcomes (including 40P01 deadlock/55P03 timeout), and verify bounded rollback/no partial effects. Unexpected deadlock or inverted ordering is FAIL; deliberately injected timeout passes only its specified rollback assertion. Finite test schedules do not prove deadlock freedom.

## 7. Evidence, classification and acceptance

Every check must produce: test ID; approval references; repository/migration versions; role label and connection mode; prerequisites verified; sanitized query/template ID or reviewed synthetic operation ID; expected/actual allow-deny/SQLSTATE; before/after immutable scope/revisions/counters; gate/barrier order; result PASS/FAIL/BLOCKED; reviewer; cleanup verification. Artifact names in the inventory are logical records, not files created in A6. Store in an access-controlled approved location with no tokens, passwords, URLs containing credentials, customer payloads, raw provider text or full SQL query logs. Evidence collection must not expose other sessions' sensitive data.

PASS requires observed expected behavior with complete prerequisites and verified cleanup. FAIL means an observed mismatch, leakage, escalation, duplicate effect, bypass, broken invariant or missing audit on a successful mutation. BLOCKED means not executed, unavailable roles/functions/visibility, unknown semantics, absent approval or insufficient evidence. Unknown deployment behavior is never PASS. Metadata matches alone do not pass runtime tests. A successful fixture transition without its required immutable audit is FAIL; lack of permission to inspect the audit is BLOCKED. Rejected calls must not create unauthorized ledger/financial effects; do not demand mutation audit events where the approved contract specifies none.

| Final gate | GO condition | NO-GO condition |
| --- | --- | --- |
| Proceed from metadata to separately approved isolated validation | M01–M04 PASS, exact target/TLS, signed prerequisite review | any FAIL/BLOCKED; current service_role grants still present |
| Proceed from isolated tests to separately approved concurrency validation | I01–I03 PASS, probe/fixtures reviewed and cleaned, future G3 approval | identity collapse, cross-authority access, missing evidence or cleanup |
| Consider authority validation complete for the tested version | C01–C03 PASS, independent review, cleanup/rollback verified | unresolved gate placement, bypass, deadlock, stale identity or unverified pool behavior |
| Paid execution / production / financial closure / purge | NEVER authorized by this plan | ALWAYS NO-GO; separate contracts, provider/pricing evidence and approvals required |

## 8. Cleanup, rollback and failure response

read_only_rollback: rollback/close approved read-only sessions, verify no fixtures/role/grant/counter changes. isolated_fixture_cleanup: use a dedicated disposable synthetic scope, rollback transactional fixtures and verify from a separate authorized session that no rows/audit/counters persist. If append-only audit or multi-session tests require committed fixtures, obtain an explicit lifecycle/cleanup exception before G2/G3; do not delete immutable evidence with ad-hoc SQL. Without an approved disposal/retention procedure, test is BLOCKED.

multi_session_cleanup: rollback ALL test sessions, close prepared statements/pools, restore only specifically approved temporary test grants/registry states and verify restored ACL/role inventory, no live sessions/fixtures/liabilities and reviewed audit disposition from a separate session. Persistent role provisioning, grant/revocation, termination or deletion requires separate explicit approval; transaction rollback cannot undo another session's commit. Never reset an armed real record, erase financial evidence, drop shared roles or restore a known insecure baseline to make cleanup pass. Failure to restore safely -> NO-GO and operator incident review, no automatic repair. No sequence or external side effect is assumed transactional.

Failure register: collapsed_identity (all logins look like postgres/shared login) -> FAIL identity, stop; service_role_bypass/unrevoked_legacy -> FAIL, stop; definer_escalation or writable lookup path -> FAIL; incomplete_finance/provider_pricing_unknown -> BLOCKED release/activation, retain liability; lock_inversion -> FAIL concurrency; stale_identity -> FAIL if mutation accepted, expected denial otherwise; missing_audit -> FAIL successful mutation acceptance; missing privileges/evidence -> BLOCKED, never escalate opportunistically. No credential or grant changes are performed as incident recovery without separate approval. The broker fallback requires a distinct approved verification contract; do not silently route failed login tests through a service-role broker.

No database, network, provider or deployment operation is performed in A6. No .env or credentials are inspected. This plan does not authorize its next phase.
