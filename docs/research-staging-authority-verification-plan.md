# M4.8 B2 A6 — Offline staging authority verification plan

OFFLINE / NON-EXECUTING. A8 clarification baseline: C:\Users\lenovo\Downloads\etsyhunt1-git, branch feature/etsy-m1-m15-security, HEAD 9fbebd3. This document is a future procedure, NOT authorization to connect or run its templates. No executable harness, migration, role, grant, revocation, fixture or worker is implemented. Static tests check structured coverage and repository signature consistency, not PostgreSQL runtime guarantees. activationBlocked=true; executionAuthorized=false; automaticRetryAllowed=false; authenticated HTTP 503 remains unchanged. There is no GO for paid execution in this plan.

## 1. Source of truth and existing limitations

Read together: `docs/research-authority-contract.md` (A5); `docs/research-durable-dispatch-sql-design.md` (B1/A2); `docs/research-dispatch-protocol.md` (M4.7 simulator); their static tests. SQL baseline is `supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql` (M2), particularly six definitions at 642/1070/1297/1612/1678/1948 and owner/grants at 2178–2230. M1/P1-B retire old credit execution; M1.5 grants research.view but not workload reconciliation authority.

`src/server/adminRbac.ts` initializes a Supabase JS service-role client; `src/server/m1Security.ts` authenticates customers. `src/server/researchRpc.ts` gates reservation before its injected RPC client is accessed. These do not prove workload authentication. Existing M4.7 model late billing uses a shared hold phase; M4.8 expects financial state independent of completed/reconciled execution. Do not use model outcomes as live SQL evidence.

`tests/research-staging.integration.mjs` implements separate --static/--preflight/--run modes with exact staging target validation, verify-full TLS, isolated environment, timeouts and default-denied writes. It admits only postgres/direct or postgres.project-ref/session-pooler identities. Its session compatibility SQL expects session_user=postgres. `tests/research-staging.preflight.sql` currently requires service_role EXECUTE on all six M2 functions, whereas future authority controls must close that bypass. `tests/research-staging.parity.mjs` pins existing reviewed bodies/triggers. Therefore an M3.6 PASS is NOT an M4.8 authority PASS. Do not expand the existing staging harness allowlist, reuse --run for authority tests, or automatically accept changed parity pins. Future harness/parity changes need separate review; nothing here modifies them.

## 2. Ordered approval gates and target verification

### Gate 1 — Baseline Read-Only Discovery

Inventory the deployed baseline without changing it. Existing service_role grants are observations, not failures merely because future M4.8 would deny them. Missing proposed principals, registry, admission or durable functions are recorded MISSING if absence is established, UNKNOWN if invisible/inaccessible; neither is silently provisioned. Baseline discovery does not require post-cutover authority guarantees. A baseline-complete result means the approved bounded inventory was collected and all omissions classified; it is NEVER successful M4.8 authority acceptance. Missing existing M2 objects or drift from the repository is an observed discrepancy requiring review, not proof of deployed correctness. No writes, role changes, grant changes, function execution or fixtures. G0/G1 below apply.

### Gate 2 — Post-Cutover Authority Acceptance

Separate acceptance approval requires implemented and approved durable SQL controls, a versioned cutover manifest, distinct provisioned principals, approved registry/admission contracts and reviewed probes/fixtures/cleanup. A8-P01 first verifies legacy bypass denial and approved controls using metadata; I01–I03 then test identity/privileges/financial boundaries under separate G2 authorization; C01–C03 require separate G3 concurrency/revocation authorization. Gate 1 completion is NOT a prerequisite substitute. Gate 2 remains BLOCKED until EVERY prerequisite is evidenced. No mutation or role provisioning is authorized by metadata access. Financial closure, purge, paid requests and production access remain denied even if Gate 2 passes.

1. G0: offline plan review only (this task). Every live scenario starts BLOCKED/unexecuted.
2. G1: explicit authorization for read-only staging access, named operator, time window, exact target and approved metadata queries. No fixtures, role switching experiments, function invocation, credential generation or grants under this gate.
3. G2: separate post-cutover acceptance approval and, independently scoped within it, isolated synthetic fixture/privilege tests, exact reviewed SQL/function versions, authenticated principal provisioning by an authorized operator, side-effect inventory, cleanup and recovery procedure. The acceptance metadata subset remains read-only. Missing roles/functions -> BLOCKED; do not create them opportunistically.
4. G3: separate approval for multi-session races, revocation, active-session termination and any persistent role/registry changes. G2 approval alone does not authorize G3. Review migration/lock/authority-gate placement first; unresolved placement -> BLOCKED.
5. G4: independent evidence review. GO may permit only another separately approved validation phase. No approval here enables providers, closure, purge, pricing or production access.

Exact staging project ref: iwqnyqaefovhvnunarfa. Explicitly reject production fdvnojlojtfiwhtchgdk. Expected staging database postgres. Approved existing paths: direct db.iwqnyqaefovhvnunarfa.supabase.co:5432 or Supavisor session host aws-0-eu-west-1.pooler.supabase.com:5432. The future custom role username is approved-login.iwqnyqaefovhvnunarfa through the shared pooler, approved-login for direct; approved-login is a placeholder, not a provisioned identity. Verify each exact login against the approved principal inventory, not a wildcard or username suffix alone. Reject arbitrary hosts, alternate regions, IP literals, suffix attacks, transaction port 6543, production references and unreviewed URI parameters. Copy target identity from separately verified project metadata; a shared pooler host alone does not establish the project.

Before any future connection, cross-check authorized target/project identity using approved operator metadata and local target validation without logging credential values. Client TLS must use verify-full plus trusted CA/approved system trust and hostname verification; encryption alone is insufficient. For pooler connections pg_stat_ssl describes the database backend leg, not proof of client-to-pooler certificate verification. Preserve explicit client-side TLS evidence and target validation. SQL current_database/session_user cannot prove a Supabase project ref. Any identity/TLS discrepancy -> stop before scenarios.

Credentials must be provided through a separately approved secret mechanism; never paste into commands, URLs in reports, terminal transcripts, process arguments or artifacts. No .env inspection. No SELECT from pg_authid, password verifier extraction, JWT retrieval or secret-bearing registry fields. Query results below are sanitized in memory before export; do not capture raw pg_stat_activity.query, provider bodies or connection strings. No HTTP/provider calls from the verification harness; reviewed fixture functions/triggers must exclude webhooks, extension network calls and other nontransactional effects. SQL rollback does not undo provider calls, sequence increments or external effects.

## 3. Structured coverage inventory

The JSON below is documentation data parsed by offline tests, NOT an executable runner/configuration or a record of completed tests. Role labels represent approved future login identities; they are not credentials. Prerequisites must be evidenced, never assumed. Every case requires G0/G1; acceptance metadata and identity tests additionally G2; concurrency tests additionally G2/G3. All cases use the artifact and cleanup contracts in sections 7–8. currentServiceRoleExecute describes the repository SQL, NOT an observed deployed grant; targetDirectCallers describes Gate 2 only. M04 records the baseline; A8-P01 checks the post-cutover target.

Versioned expected-object inventory authority-objects-v1 separates existing repository M2 signatures (legacyRpcs) from proposed objects and UNKNOWN deployment state. Proposed login names/registry/admission signature are UNASSIGNED: do not invent concrete deployed names. Proposed durable tables are research_dispatches, research_dispatch_events, research_reconciliation_evidence, research_billing_evidence and research_billing_adjustments; retained accounting subject/mapping structures remain proposed too. Before Gate 2, replace placeholders with an approved versioned manifest of schema-qualified names/signatures, role-to-capability mappings, registry contract and reviewed body digests. Inventory changes require review/versioning, not automatic acceptance of whatever staging contains. All six hardening requirements remain mandatory despite baseline observations.

```json
{
  "schemaVersion": "authority-verification-plan-v2",
  "verificationGates": {
    "baseline": {"requiresImplementedControls":false,"serviceRoleGrants":"observe","missingProposedObjects":"record_missing_or_unknown","authorityAcceptance":false,"writes":false},
    "postCutover": {"requiresImplementedControls":true,"requiresProvisionedPrincipals":true,"requiresSeparateApproval":true,"legacyBypass":"deny","initialStatus":"BLOCKED"}
  },
  "execution": {"mode": "offline-plan-only", "activationBlocked": true, "executionAuthorized": false, "automaticRetryAllowed": false, "databaseAccessAuthorized": false, "paidExecutionGoAllowed": false},
  "target": {"stagingRef": "iwqnyqaefovhvnunarfa", "rejectedProductionRef": "fdvnojlojtfiwhtchgdk", "database": "postgres", "sessionHost": "aws-0-eu-west-1.pooler.supabase.com", "port": 5432, "sslmode": "verify-full", "expandM36Allowlist": false},
  "stages": [
    {"id": "metadata", "gates": ["G0", "G1"], "fixtures": false, "writes": false},
    {"id": "acceptance_metadata", "gates": ["G0", "G1", "G2"], "fixtures": false, "writes": false},
    {"id": "identity", "gates": ["G0", "G1", "G2"], "fixtures": true, "writes": true},
    {"id": "concurrency", "gates": ["G0", "G1", "G2", "G3"], "fixtures": true, "writes": true}
  ],
  "expectedInventory": {
    "version":"authority-objects-v1",
    "repositoryBaseline":"9fbebd3",
    "existingRpcInventory":"legacyRpcs",
    "deployedState":"UNKNOWN",
    "proposed":[
      {"id":"dispatcher","kind":"login_principal","name":"UNASSIGNED","repositoryState":"proposed","deployedState":"UNKNOWN"},
      {"id":"reconciler","kind":"login_principal","name":"UNASSIGNED","repositoryState":"proposed","deployedState":"UNKNOWN"},
      {"id":"billing","kind":"login_principal","name":"UNASSIGNED","repositoryState":"proposed","deployedState":"UNKNOWN"},
      {"id":"authority_registry","kind":"protected_registry","name":"UNASSIGNED","repositoryState":"proposed","deployedState":"UNKNOWN"},
      {"id":"attempt_admission","kind":"atomic_attempt_intent_boundary","name":"UNASSIGNED","repositoryState":"contract_missing","deployedState":"UNKNOWN"},
      {"id":"dispatch_controls","kind":"rpc_group","names":["claim_research_dispatch","renew_research_dispatch_claim","arm_research_submission","bind_research_provider_identity","hold_research_dispatch"],"repositoryState":"proposed","deployedState":"UNKNOWN"},
      {"id":"reconciliation_controls","kind":"rpc_group","names":["reconcile_research_dispatch"],"repositoryState":"proposed","deployedState":"UNKNOWN"},
      {"id":"billing_controls","kind":"rpc_group","names":["record_research_billing_evidence","apply_research_billing_adjustment"],"repositoryState":"proposed","deployedState":"UNKNOWN"}
    ],
    "legacyHardening":["reserve_protocol_scope","begin_atomic_intent","finish_first_write_both_branches","ambiguous_durable_hold","complete_unresolved_denial","fail_uncertain_refund_denial"]
  },
  "firstFinishCases": {
    "prerequisites":["Gate2_approval","approved_replacement_or_internal_test_boundary","synthetic_nonbillable_fixture","reviewed_normal_and_overrun_paths"],
    "branches":["normal","overrun"],
    "cases":[
      {"stored":"null","supplied":"A","expected":"bind_first_write"},
      {"stored":"A","supplied":"A","expected":"retain_A"},
      {"stored":"A","supplied":"B","expected":"reject_preserve_A"},
      {"stored":"A","supplied":"null","expected":"retain_A"},
      {"stored":"null","supplied":"null","expected":"block_success_keep_acceptance_unresolved"}
    ],
    "finishedReplay":["identical_no_second_effect","changed_id_rejected","null_retains_binding","changed_outcome_or_usage_rejected"],
    "oldSignatureDenialProvesInternalSafety":false
  },
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
    {"id":"A6-M02","stage":"metadata","prerequisites":["M01_pass","approved_principal_inventory"],"coverage":["role_attributes","membership","inheritance","forbidden_switching","recursive_reachability","admin_set_inherit","missing_objects"],"queries":["Q2","Q3","Q12"],"expected":"record_roles_memberships_and_absences","evidence":["role_membership_matrix"],"cleanup":"read_only_rollback","initialStatus":"BLOCKED"},
    {"id":"A6-M03","stage":"metadata","prerequisites":["M02_complete","approved_function_inventory"],"coverage":["definer_owner","search_path","public_defaults","effective_execute","overloads","helpers","alternate_schemas","schema_mutation","table_mutation","column_mutation","triggers","dependencies","inaccessible_metadata"],"queries":["Q4","Q5","Q6","Q8","Q9","Q10","Q11","Q12"],"expected":"record_effective_privileges_and_visibility_gaps","evidence":["function_acl_matrix"],"cleanup":"read_only_rollback","initialStatus":"BLOCKED"},
    {"id":"A6-M04","stage":"metadata","prerequisites":["M03_complete","approved_repository_inventory"],"coverage":["six_m2_rpcs","service_role_bypass","alternate_paths","atomic_cutover"],"queries":["Q4","Q5","Q6","Q11","Q12"],"expected":"record_legacy_grants_as_baseline","evidence":["legacy_baseline_matrix"],"cleanup":"read_only_rollback","initialStatus":"BLOCKED"},
    {"id":"A8-P01","stage":"acceptance_metadata","prerequisites":["implemented_approved_controls","provisioned_distinct_principals","approved_cutover_manifest","approved_registry_and_admission"],"coverage":["postcutover_legacy_denial","postcutover_expected_objects"],"queries":["Q2","Q3","Q4","Q5","Q6","Q8","Q9","Q10","Q11","Q12"],"expected":"legacy_direct_execute_denied","evidence":["legacy_bypass_matrix","cutover_object_matrix"],"cleanup":"read_only_rollback","initialStatus":"BLOCKED"},
    {"id":"A6-I01","stage":"identity","prerequisites":["acceptance_metadata_pass","provisioned_test_principals","reviewed_definer_probe"],"coverage":["dispatcher_identity","reconciler_identity","billing_identity","session_user","current_user","definer_identity","session_pooling"],"queries":["Q1"],"expected":"authenticated_login_preserved","evidence":["identity_matrix"],"cleanup":"isolated_fixture_cleanup","initialStatus":"BLOCKED"},
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

DO NOT EXECUTE in A8. These SELECT-only templates are not a connection script. Under G1, an approved operator would use a separately reviewed read-only transaction, statement_timeout=30s, lock_timeout=3s and explicit rollback. Substitute only validated approved role/object names via typed parameters, never string-built SQL. Do not invoke a lifecycle/definer function to discover its privileges. Lack of metadata permission -> BLOCKED, not elevated access. Catalog matches do not prove runtime denial or absence of side effects.

Bounds: at most 64 role seeds/function names, 32 approved schema names and 512 object OIDs per worksheet batch; each name at most 200 characters. Result sentinel LIMIT 1001 means at most 1000 usable rows; reaching 1001 is TRUNCATED/BLOCKED, not a complete inventory. Recursive depth limit 16 with unexplored edges is DEPTH_LIMIT/BLOCKED. Stop on permission errors/timeouts and record SQLSTATE only; do not elevate or export error details. Limits do not guarantee query work is cheap; reviewed scopes plus timeouts remain mandatory. Parameter lists must be built from the approved manifest and discovered bounded dependencies, never arbitrary user input. Record per-batch coverage so omitted schemas/roles cannot silently pass.

Q1 — session context; combine with client target/TLS evidence, never treat it as project-ref proof:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT current_database(), session_user, current_user,
       current_setting('transaction_read_only') AS transaction_read_only,
       pg_backend_pid();
```

Q2 — non-secret attributes for approved role names only:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT wanted.role_name, r.oid, r.rolcanlogin, r.rolsuper, r.rolcreaterole,
       r.rolcreatedb, r.rolreplication, r.rolbypassrls, r.rolinherit, r.rolvaliduntil,
       CASE WHEN r.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS object_state
FROM unnest($1::text[]) AS wanted(role_name)
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = wanted.role_name
ORDER BY wanted.role_name LIMIT 1001;
```

Q3 — bounded recursive PostgreSQL 17 membership/reachable-role inventory. set_path/inherit_path are AND across the path; admin_option is an EDGE permission, not assumed transitive administration. Include all discovered paths and outgoing depth-limit indicators; do not stop after immediate memberships:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
WITH RECURSIVE walk AS (
  SELECT r.oid AS root, r.oid AS reached, ARRAY[r.oid] AS path,
         0 AS depth, true AS set_path, true AS inherit_path,
         NULL::boolean AS admin_option
  FROM pg_catalog.pg_roles r WHERE r.rolname = ANY($1::text[])
  UNION ALL
  SELECT w.root, m.roleid, w.path || m.roleid, w.depth + 1,
         w.set_path AND m.set_option, w.inherit_path AND m.inherit_option,
         m.admin_option
  FROM walk w JOIN pg_catalog.pg_auth_members m ON m.member = w.reached
  WHERE w.depth < 16 AND NOT m.roleid = ANY(w.path)
)
SELECT root_role.rolname AS root, reached_role.rolname AS reached,
       w.path, w.depth, w.set_path, w.inherit_path, w.admin_option,
       (w.depth = 16 AND EXISTS (
         SELECT 1 FROM pg_catalog.pg_auth_members next_edge
         WHERE next_edge.member = w.reached
           AND NOT next_edge.roleid = ANY(w.path))) AS depth_limited
FROM walk w
JOIN pg_catalog.pg_roles root_role ON root_role.oid = w.root
JOIN pg_catalog.pg_roles reached_role ON reached_role.oid = w.reached
ORDER BY w.root, w.depth, w.path LIMIT 1001;
```

Q4 — all overloads for approved lifecycle/helper names across ALL schemas, including relevant alternate exposed/non-exposed schemas. Name filtering is bounded; repeat for discovered helper names. No function body or default-expression values are collected. Only search_path entries from proconfig are exported:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT n.nspname AS schema_name, p.oid, p.oid::regprocedure::text AS signature,
       owner_role.rolname AS owner, p.prosecdef, p.pronargdefaults,
       ARRAY(SELECT setting FROM unnest(p.proconfig) AS c(setting)
             WHERE setting LIKE 'search_path=%') AS pinned_search_path,
       acl.grantee, acl.privilege_type, acl.is_grantable
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = p.proowner
LEFT JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl ON true
WHERE p.proname = ANY($1::text[])
ORDER BY n.nspname, p.oid, acl.grantee, acl.privilege_type LIMIT 1001;
```

Q5 — effective EXECUTE for each approved role/signature pair, including service_role, anon, authenticated, dispatcher/reconciler/billing and admin login. Run for every discovered overload. PUBLIC is represented by grantee=0 in ACLs, not passed as a login:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT r.oid AS role_oid, p.oid AS function_oid,
       CASE WHEN r.oid IS NULL OR p.oid IS NULL THEN NULL
            ELSE pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE') END
            AS effective_execute
FROM (SELECT $1::text AS role_name, $2::oid AS function_oid) wanted
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = wanted.role_name
LEFT JOIN pg_catalog.pg_proc p ON p.oid = wanted.function_oid;
```

Q6 — defaults for approved object owners, all object classes (functions, schemas, relations, sequences, types), including global and schema defaults. Absence of a row does NOT mean no default PUBLIC EXECUTE; combine with built-in defaults and Q4. Defaults affect future objects, not replacements' existing ACLs:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT defaclrole::regrole::text AS owner, defaclnamespace,
       defaclobjtype, a.grantee, a.privilege_type, a.is_grantable
FROM pg_catalog.pg_default_acl d
CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
WHERE d.defaclrole = ANY($1::oid[])
ORDER BY d.defaclrole, d.defaclnamespace, d.defaclobjtype, a.grantee LIMIT 1001;
```

Q7 — bounded diagnostic snapshot during separately approved concurrency tests; redact PIDs/role labels if needed and never export query text/client addresses:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT pid, usename, state, wait_event_type, wait_event,
       pg_catalog.pg_blocking_pids(pid) AS blockers
FROM pg_catalog.pg_stat_activity
WHERE datname = current_database() AND usename = ANY($1::text[])
ORDER BY pid LIMIT 1001;
```

Q8 — schema USAGE/CREATE and direct/PUBLIC ACLs, per approved role and schema set. A NULL effective result means unknown/missing role, never denial proof:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT n.oid, n.nspname, r.rolname,
       CASE WHEN r.oid IS NOT NULL THEN pg_catalog.has_schema_privilege(r.oid, n.oid, 'USAGE') END AS can_use,
       CASE WHEN r.oid IS NOT NULL THEN pg_catalog.has_schema_privilege(r.oid, n.oid, 'CREATE') END AS can_create,
       a.grantee, a.privilege_type, a.is_grantable
FROM pg_catalog.pg_namespace n
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = $1::text
LEFT JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(n.nspacl, pg_catalog.acldefault('n', n.nspowner))) a ON true
WHERE n.nspname = ANY($2::text[])
ORDER BY n.oid, a.grantee, a.privilege_type LIMIT 1001;
```

Q9 — table/view mutation privileges, owner, RLS flags and direct/PUBLIC ACLs for approved relation OIDs. Repeat for root login and every SET-reachable role; inherited effective checks alone do not cover role switching:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT c.oid, n.nspname, c.relname, c.relowner, c.relrowsecurity, c.relforcerowsecurity,
       rights.privilege, a.grantee, a.privilege_type,
       CASE WHEN r.oid IS NOT NULL THEN
         pg_catalog.has_table_privilege(r.oid, c.oid, rights.privilege) END AS effective_privilege
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = $1::text
CROSS JOIN unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) rights(privilege)
LEFT JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a ON true
WHERE c.oid = ANY($2::oid[]) AND c.relkind IN ('r','p','v','m','f')
ORDER BY c.oid, rights.privilege, a.grantee, a.privilege_type LIMIT 1001;
```

Q10 — column-specific and effective mutation rights, including column ACL grants missed by table-level checks. A table-level grant also affects effective column rights:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT c.oid, att.attnum, att.attname, rights.privilege,
       acl.grantee, acl.privilege_type,
       CASE WHEN r.oid IS NOT NULL THEN pg_catalog.has_column_privilege(
         r.oid, c.oid, att.attnum, rights.privilege) END AS effective_privilege
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_attribute att ON att.attrelid = c.oid
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = $1::text
CROSS JOIN unnest(ARRAY['INSERT','UPDATE','REFERENCES']) rights(privilege)
LEFT JOIN LATERAL pg_catalog.aclexplode(att.attacl) acl ON true
WHERE c.oid = ANY($2::oid[]) AND att.attnum > 0 AND NOT att.attisdropped
ORDER BY c.oid, att.attnum, rights.privilege, acl.grantee LIMIT 1001;
```

Q11 — structural trigger/helper and dependency edges for approved relation/function OIDs; no trigger arguments, function bodies, default expressions or provider/user payloads. Parameter 1 is relation OIDs, parameter 2 function OIDs. Dependencies are inspected in BOTH directions; repeat bounded traversal for newly discovered approved objects:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT 'trigger' AS edge_kind, 'pg_class'::regclass::oid AS classid,
       t.tgrelid AS objid, 'pg_proc'::regclass::oid AS refclassid,
       t.tgfoid AS refobjid, t.tgenabled::text AS detail
FROM pg_catalog.pg_trigger t WHERE t.tgrelid = ANY($1::oid[])
UNION ALL
SELECT 'dependency', d.classid, d.objid, d.refclassid, d.refobjid, d.deptype::text
FROM pg_catalog.pg_depend d
WHERE (d.classid = 'pg_class'::regclass AND d.objid = ANY($1::oid[]))
   OR (d.refclassid = 'pg_class'::regclass AND d.refobjid = ANY($1::oid[]))
   OR (d.classid = 'pg_proc'::regclass AND d.objid = ANY($2::oid[]))
   OR (d.refclassid = 'pg_proc'::regclass AND d.refobjid = ANY($2::oid[]))
ORDER BY edge_kind, classid, objid, refclassid, refobjid LIMIT 1001;
```

Q12 — expected-object absence reporting, not implicit provisioning. Pass only explicit approved names from the inventory (never UNASSIGNED). Known empty result versus invisible catalog access is classified separately:

**NOT EXECUTED — FUTURE APPROVAL REQUIRED**

```sql
SELECT 'schema' AS kind, wanted.name, n.oid,
       CASE WHEN n.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS object_state
FROM unnest($1::text[]) wanted(name)
LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = wanted.name
UNION ALL
SELECT 'relation', wanted.name, c.oid,
       CASE WHEN c.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END
FROM unnest($2::text[]) wanted(name)
LEFT JOIN pg_catalog.pg_class c ON c.oid = pg_catalog.to_regclass(wanted.name)
UNION ALL
SELECT 'function', wanted.name, p.oid,
       CASE WHEN p.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END
FROM unnest($3::text[]) wanted(name)
LEFT JOIN pg_catalog.pg_proc p ON p.oid = pg_catalog.to_regprocedure(wanted.name)
ORDER BY kind, name LIMIT 1001;
```

Q2 handles missing roles, Q12 schemas/relations/exact function signatures. Q5 uses an observed function OID from Q4 plus role name; absent role/function yields NULL. Required identifier resolution/schema USAGE can itself fail: record INACCESSIBLE/UNKNOWN with sanitized SQLSTATE, not MISSING or PASS. UNASSIGNED proposed names are UNKNOWN/name-unresolved. Under Gate 1, observed MISSING proposed objects do not prevent baseline-complete classification if approved coverage is complete and absence is evidenced; under Gate 2 they are BLOCKED. Missing required existing objects is drift requiring review. Truncation, inaccessible required metadata or incomplete dependency traversal -> baseline incomplete/BLOCKED, never infer absence from filtered views.

Do not inspect secret-bearing registry rows or generic function source. Future registry semantics/probe/body parity require exact reviewed, separately approved evidence templates; no known deployed registry/probe is assumed. pg_depend does NOT enumerate every PL/pgSQL string-body or dynamic-SQL call. Such edges, external effects, extension calls, SQL bodies and webhooks require bounded offline reviewed-definition parity and an explicit dependency manifest; no dynamic dependency is silently treated safe. Record DEPENDENCY_UNRESOLVED until that manifest can be matched. Catalog discovery alone cannot prove definer safety, cleanup or side-effect absence. No probe is created here; Q1 outside a function cannot prove internal definer identity. Inaccessible non-secret metadata does not authorize elevation or broader queries.

## 5. Legacy RPC target and identity/privilege procedure

The structured legacyRpcs inventory contains all six exact committed signatures; defaults on begin/finish are arguments, not extra signatures. Each currently grants service_role EXECUTE, uses SECURITY DEFINER/search_path=pg_catalog and owner postgres in repository SQL. Gate 1 M04 records actual grants, differences and missing proposed objects; it does not require revocation. Gate 2 A8-P01 is the FUTURE cutover target: all six old external signatures have NO authorized runtime direct callers (Dispatcher, Reconciler, Billing, existing admin login, service_role, authenticated, anon all denied). Reviewed replacement admission/operations use new narrow entry points and non-callable private helpers. If an alternative hardened legacy wrapper is later chosen, revise/approve this plan first; do not silently mark it PASS. Database owner authority is a maintenance trust boundary, not a valid runtime negative-test identity.

| Existing RPC | Required evidence beyond common ACL/overload checks |
| --- | --- |
| reserve_research_job | no old credit/budget reservation path around protocol version or subject/admission checks |
| begin_research_provider_attempt | old begin/replay/retry number cannot grant dispatch or create an unbound intent |
| finish_research_provider_attempt | both normal and overrun first-finish branches reject replacement provider ID; finished replay alone insufficient |
| mark_research_job_ambiguous | no legacy operation can clear a durable uncertainty/financial hold or substitute for authoritative reconciliation |
| complete_research_job | no result publication/settlement around unresolved dispatch or incomplete financial liability |
| fail_research_job | uncertain acceptance cannot trigger refunds/release; preserve credit generation rules |

For EACH: under M03/M04 record owner/config and direct ACL (Q4), effective rights (Q5) for login AND every SET-reachable role from Q3, defaults (Q6), all overloads/default-call forms, alternate exposed schemas and helper dependencies. A8-P01 evaluates that evidence against the approved denial manifest. Under I02 test actual denied invocation ONLY against approved synthetic fixtures after G2; inspect before/after rows/audit. Permission denial is required for old external signatures, not merely a later pricing/input-validation error. No application owner/superuser is used to claim runtime denial. New intended entry points allow only their exact capability; the other two principals, general service_role/admin/browser callers must be denied before mutation/replay. Missing principals/new functions -> BLOCKED in Gate 2. Never call current write RPCs under G1.

### First-finish identity worksheet — Gate 2 only

Known M2 risk: finish_research_provider_attempt checks finished replay at migration lines 1373–1383, but first-finish assignments at 1522 (overrun) and 1563 (normal) use COALESCE(p_provider_attempt_id, provider_attempt_id). A conflicting non-null supplied ID can overwrite a stored one. No SQL/runtime change is made here.

Run every firstFinishCases case in BOTH normal and overrun branches, under a separately approved replacement/internal test boundary with correct capability and synthetic non-billable records. Denial of the retired external signature proves only bypass closure, NOT internal first-finish safety. Do not re-grant a private helper merely to test it; require a reviewed reachable replacement/probe before execution.

| Stored ID | Supplied ID | Expected future behavior |
| --- | --- | --- |
| null | A | bind A once, preserve original request/attempt/provider scope |
| A | A | retain A, no replacement |
| A | B | reject conflict before BOTH normal and overrun writes; A/outcome/usage/liability/audit unchanged by rejected transition |
| A | null | preserve A; null is not identity removal or a new authorization |
| null | null | success remains blocked; unknown acceptance remains unresolved, no fabricated ID or zero billing |

For finished outcomes, exact canonical operation replay must have no second outcome, billing, liability or audit effect. Changed provider ID, outcome or usage rejects; a null omission must never erase an existing binding. If a prior canonical command supplied A, resubmitting that SAME operation_id with null is changed operation content and rejects, even where a separately specified compatibility path preserves A. First-write immutability also applies across concurrency and the overrun hold path. Capture before/after identity, revision, execution status, held budget/liability and audit evidence. Missing replacement contract, fixture branch control or evidence -> BLOCKED, not PASS from old-signature denial. These tests may not enable pricing or make paid requests.

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
| Complete Gate 1 baseline discovery only | approved bounded inventory complete, M01 target/TLS valid, existing grants recorded, proposed absences/UNKNOWNs explicitly classified | incomplete/inaccessible required metadata, target mismatch, truncation; never authority acceptance |
| Begin Gate 2 acceptance metadata | separate approval, implemented/approved controls, distinct principals, exact cutover/registry/admission manifest | missing controls/principals or unapproved manifest; baseline completion alone is insufficient |
| Proceed to separately approved isolated validation | A8-P01 PASS, approved probe/fixtures/cleanup and G2 scope | any acceptance FAIL/BLOCKED; legacy bypass still present |
| Proceed from isolated tests to separately approved concurrency validation | I01–I03 PASS, probe/fixtures reviewed and cleaned, future G3 approval | identity collapse, cross-authority access, missing evidence or cleanup |
| Consider authority validation complete for the tested version | C01–C03 PASS, independent review, cleanup/rollback verified | unresolved gate placement, bypass, deadlock, stale identity or unverified pool behavior |
| Paid execution / production / financial closure / purge | NEVER authorized by this plan | ALWAYS NO-GO; separate contracts, provider/pricing evidence and approvals required |

## 8. Cleanup, rollback and failure response

read_only_rollback: rollback/close approved read-only sessions, verify no fixtures/role/grant/counter changes. isolated_fixture_cleanup: use a dedicated disposable synthetic scope, rollback transactional fixtures and verify from a separate authorized session that no rows/audit/counters persist. If append-only audit or multi-session tests require committed fixtures, obtain an explicit lifecycle/cleanup exception before G2/G3; do not delete immutable evidence with ad-hoc SQL. Without an approved disposal/retention procedure, test is BLOCKED.

multi_session_cleanup: rollback ALL test sessions, close prepared statements/pools, restore only specifically approved temporary test grants/registry states and verify restored ACL/role inventory, no live sessions/fixtures/liabilities and reviewed audit disposition from a separate session. Persistent role provisioning, grant/revocation, termination or deletion requires separate explicit approval; transaction rollback cannot undo another session's commit. Never reset an armed real record, erase financial evidence, drop shared roles or restore a known insecure baseline to make cleanup pass. Failure to restore safely -> NO-GO and operator incident review, no automatic repair. No sequence or external side effect is assumed transactional.

Failure register: collapsed_identity (all logins look like postgres/shared login) -> FAIL identity, stop; service_role_bypass/unrevoked_legacy -> FAIL, stop; definer_escalation or writable lookup path -> FAIL; incomplete_finance/provider_pricing_unknown -> BLOCKED release/activation, retain liability; lock_inversion -> FAIL concurrency; stale_identity -> FAIL if mutation accepted, expected denial otherwise; missing_audit -> FAIL successful mutation acceptance; missing privileges/evidence -> BLOCKED, never escalate opportunistically. No credential or grant changes are performed as incident recovery without separate approval. The broker fallback requires a distinct approved verification contract; do not silently route failed login tests through a service-role broker.

No database, network, provider or deployment operation is performed in A6. No .env or credentials are inspected. This plan does not authorize its next phase.
