# M4.8 B10 — Final S1 read-only metadata worksheet

**OFFLINE REVIEW ONLY — NOT EXECUTED — FUTURE APPROVAL REQUIRED.** Verified workspace C:\Users\lenovo\Downloads\etsyhunt1-git; branch feature/etsy-m1-m15-security; HEAD ba4aa45f1507e3d8de799f9098654ad1acd36000 (B9). The owner provisionally accepted D1–D5 architecture, not access, SQL execution, DDL, credentials, deployment or activation. This document is NOT an execution harness, migration or authorization.

Sources reviewed first: docs/research-staging-implementation-plan.md; docs/research-staging-authority-verification-plan.md; docs/research-security-implementation-decisions.md. Existing templates remain historical; the corrected S1 candidate is below. It targets PostgreSQL 17 only and has NOT been parsed or executed by PostgreSQL. Static tests cannot prove syntax/runtime/managed-platform compatibility. activationBlocked=true; executionAuthorized=false; automaticRetryAllowed=false; requiresAuthoritativeDatabaseValidation=true; HTTP 503 unchanged.

Q7 is excluded entirely: no activity, blocking-PID, query-text or client-address diagnostic query is included. No executable migration or database harness is created. Explicit rollback is required on successful completion and every error path; it is not a commit-based inventory.

## 1. Review corrections

| ID | Prior risk | Correction / remaining limit |
| --- | --- | --- |
| I01 version/context | PG16+ membership options were implicit; original context omitted session default/engine/encoding/timeouts | Q1 gates PostgreSQL 17.x/UTF8 and BOTH read-only flags before version-dependent queries. SET membership checks and MAINTAIN are PG17-targeted; other versions STOP. No universal parser failure in the old SQL is claimed without execution. |
| I02 qualification | Unqualified functions/types and search-path-dependent reg* text resolution | pg_catalog-qualified catalogs/functions/casts; special SQL syntax such as CASE/COALESCE/session_user is not a schema-callable function. Q12 uses exact catalog joins, not supplied-text regprocedure casts. No dynamic SQL or identifier interpolation. |
| I03 ACL fanout | Effective rights crossed ACL entries and per-right rows, multiplying results; CROSS lateral hid explicit empty defaults | Separate metadata, effective privileges and flat ACL result sets; LEFT lateral preserves empty ACL. Wide table/column booleans avoid rights×ACL products. Every result set has sentinel LIMIT 1001. |
| I04 defaults | Absence of default-ACL row or NULL column ACL could be misread as no grants | Q6/Q6-BUILTIN distinguish global, schema-added and built-in defaults; Q10 separates column ACL from effective rights incorporating table grants. Owner/superuser/schema/RLS implications remain explicit. |
| I05 membership | Path enumeration multiplies branching graphs; ADMIN flag is not transitive administration | Q3 deduplicates (root,reached,depth) states with UNION, depth<=16; retains direct edge options/grantor and server MEMBER/USAGE/SET answers separately. Timeouts still bound work; LIMIT is not a CPU bound. |
| I06 missing objects | to_regprocedure can fail resolving missing/custom types/schema; filtered/NULL results mistaken for denial | Q1-CATALOGS proves only approved visibility prerequisites; Q12 reports NOT_FOUND/TYPE_UNRESOLVED/CATALOG_PRESENT. Operator must not infer MISSING from inaccessible metadata. Exact type-vector text avoids array lower-bound equality errors. |
| I07 trigger/index/FK gaps | Trigger event/type/internal/partition/transition context and FK deletion subsets not fully captured | Q11/M13/M14/M15 expose structure only, include internal/disabled triggers, incoming FKs, deferrability, index readiness/null uniqueness and expression presence. No sensitive expression or trigger arguments exported. |
| I08 dependency closure | One-hop pg_depend is not closure or a dynamic-code inventory | M16 validates frontier existence, returns both directions/subobjects and shared ownership/ACL dependencies in bounded batches; explicit reviewed-definition receipt required for each function. Dynamic/string-body calls remain unresolved until independently matched. |
| I09 unsafe parameters/coverage | Unreviewed arrays, name casts, scope changes and truncated outputs could silently look complete | Typed metadata manifest, mandatory P0, preapproved partitions, cumulative limits, exact result coverage and STOP on every unknown/truncation/error. No paging or broader/elevated retry after failure. |

## 2. Fixed execution boundary — documentation, not permission

Only staging project **iwqnyqaefovhvnunarfa**, database postgres. Explicitly reject production **fdvnojlojtfiwhtchgdk**. Approved existing operator login only: direct host db.iwqnyqaefovhvnunarfa.supabase.co:5432 with postgres, or session pooler aws-0-eu-west-1.pooler.supabase.com:5432 with postgres.iwqnyqaefovhvnunarfa. No wildcard login/host, alternate region, IP/suffix trick, transaction port 6543, URI override or new credential/role. Verify project identity independently from approved operator metadata before SQL; current_database/session_user/shared pooler host cannot establish project ref.

Require client TLS verify-full, approved trusted CA/system trust and hostname verification. Client→pooler evidence must be independent of backend pg_stat_ssl. Missing target/TLS/permission evidence -> STOP. No Supabase connection in B10. Do not expand M3.6 allowlists or automatically run its --preflight/--run; those have separate session/probe scope.

The exact initialization below is a FUTURE session-control exception, NOT part of a SELECT result set. No role switch, advisory/row lock, fixture, temporary object, function execution probe or write function. Existing approved operator must use a reviewed bind-capable client; $1/$2 are protocol parameters, never psql text substitution, shell interpolation, identifier concatenation or SQL PREPARE installed by this worksheet.

### CONTROL-OPEN — NOT EXECUTED

```sql
SET SESSION default_transaction_read_only = on;
SET SESSION statement_timeout = '30s';
SET SESSION lock_timeout = '3s';
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog;
```

Q1 must confirm both default_transaction_read_only=on and transaction_read_only=on, statement_timeout=30s, lock_timeout=3s, version 170000..179999, encoding UTF8. Mismatch -> rollback/close, not corrective experimentation. REPEATABLE READ reduces metadata snapshot drift but does not freeze concurrent DDL, role/ACL caches or prove identity acceptance. Keep the approval window bounded; never hold locks across network/provider work.

## 3. Typed parameter manifest and seed provenance

For statements referencing $1, bind ONE jsonb metadata object with exactly eight required array keys below. Empty arrays allowed when that query has no seeds; never NULL/missing. P0 must run against the SAME reviewed manifest before its dependent statements. Q1, Q1-CATALOGS and Q11-EVENT take NO parameters. Only Q5/Q8/Q9/Q10 take a second parameter $2::text, one exact role name present in manifest.roles and approved for that batch. Match statement arity; invalid/unknown $2 is INVALID_PARAMETERS, never an empty passing result.

| Key | Typed elements / maximum | Allowed source |
| --- | --- | --- |
| roles | text names, 1..200 characters, <=64 | Owner-approved existing operator, service_role/anon/authenticated and candidate labels, or reviewed Q3 metadata; missing principals recorded, never created. PUBLIC ACL is grantee 0, not a login seed. |
| function_names | unqualified exact text names, <=200 chars, <=64 | Six M2 RPC names, reviewed signup/profile/helper names and approved discovered dependencies; Q4 intentionally searches all namespaces for those names. No LIKE/wildcards or arbitrary user-supplied functions. |
| schemas | exact text names <=200 chars, <=32 | Approved public/auth/pg_catalog and reviewed discovered alternate schemas. Unexpected schema stops before expanding scope. |
| relation_oids | positive oid values, <=512 | Q12/Q11/M13/M14/M15-approved catalog results in this snapshot, never guessed/user data. |
| function_oids | positive oid values, <=512 | Q4/Q11/M16-reviewed function identities only. |
| owner_oids | positive role oid values, <=64 | Q4/Q8/Q9 reviewed owners, resolved using pg_roles only. |
| expected | <=512 strict objects {kind,schema_name,object_name,argument_types} | Versioned repository/approved expected inventory; kind schema/relation/function; schema string; object_name null ONLY for schema, otherwise exact string <=200. argument_types text[] <=100, empty except function; catalog typnames from reviewed pg_catalog types (uuid,text,int4,int8,jsonb,timestamptz), NOT SQL aliases. Each schema/function name must be in its approved seed array. |
| frontier | <=512 strict objects {class_name,objid,objsubid,depth} | Q11/M13/M14/M15/M16-reviewed graph addresses only. oid 1..4294967295, subid 0..2147483647, depth 0..16; nonzero subid only for pg_class columns. Catalog class allowlist is exact in P0. No secret catalog traversal or user/provider rows. |

Conservative combined per-batch caps: roles+function_names+owner_oids+function_oids entries <=64; relation_oids+function_oids+owner_oids+frontier entries <=512 (even duplicate addresses in different lists consume the conservative entry budget). This is stricter than separate array maxima. Whole traversal has <=512 distinct approved addresses and <=16 depth, not a fresh unlimited budget on each batch. Preplan role/owner/object partitions and required total coverage before access. No silent filtering or auto-pagination to make a truncated query pass.

Before binding: reviewed metadata-only JSON <=262144 UTF-8 bytes, exact types/ranges/keys, duplicate raw JSON keys rejected, no duplicate names/OIDs or expected semantic identities, no credentials or user text. jsonb cannot recover duplicate keys already discarded by a parser. No parser/client/harness is provided here. Record an approved parameter manifest checksum; do not log arbitrary parameters. P0 additionally checks structure, element shapes and conservative budgets; an invalid structure may raise a sanitized SQLSTATE rather than return false. Either is STOP, never partial success. Required P0 result: EXACTLY eight expected keys, every *_ok / duplicate flag true, no NULL. Inert JSON values are data, not executable SQL.

The approved client must suppress raw parameter and raw error logging before connection/binding. If its logging/redaction behavior cannot be established, stop before access; this worksheet does not implement or configure a client.

### Initial bootstrap manifest — metadata labels only

This exact candidate seed set comes from committed M1/M1.5/M2 and B8 D1–D5, not observed deployed objects. All OID/frontier lists start EMPTY; Q12/Q4/Q2 discover approved identifiers without guessing them. The three tp_research_* names and proposed research_* tables are expected-only labels, NOT logins/objects to create. Owner must review this exact manifest and partitions before future access. Additional helpers, overloads, schemas or object edges require reviewed provenance/parameter revision and P0, never an automatic expansion after a stop. No token, password or client connection value belongs here.

```json
{
  "roles": [
    "postgres",
    "service_role",
    "anon",
    "authenticated",
    "tp_research_dispatcher",
    "tp_research_reconciler",
    "tp_research_billing"
  ],
  "function_names": [
    "reserve_research_job",
    "begin_research_provider_attempt",
    "finish_research_provider_attempt",
    "mark_research_job_ambiguous",
    "complete_research_job",
    "fail_research_job",
    "handle_new_user_signup",
    "touch_user_profile_updated_at",
    "enforce_saved_listing_quota"
  ],
  "schemas": [
    "pg_catalog",
    "auth",
    "public"
  ],
  "relation_oids": [],
  "function_oids": [],
  "owner_oids": [],
  "expected": [
    {
      "kind": "schema",
      "schema_name": "pg_catalog",
      "object_name": null,
      "argument_types": []
    },
    {
      "kind": "schema",
      "schema_name": "auth",
      "object_name": null,
      "argument_types": []
    },
    {
      "kind": "schema",
      "schema_name": "public",
      "object_name": null,
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "auth",
      "object_name": "users",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "user_profiles",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "subscriptions",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_credit_accounts",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_credit_operations",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_credit_ledger",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_history",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "saved_listings",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_cache",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_provider_pricing",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_budget_windows",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_budget_liabilities",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_jobs",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_budget_reservations",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_provider_attempts",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_results",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "admin_permission_catalog",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "admin_memberships",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "admin_permissions",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "admin_invitations",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "admin_invitation_permissions",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "admin_audit_logs",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_authority_guard",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_authority_principals",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_accounting_subjects",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_accounting_auth_links",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_retained_request_scopes",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_provider_intents",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_dispatches",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_dispatch_events",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_reconciliation_evidence",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_billing_evidence",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_billing_adjustments",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_financial_holds",
      "argument_types": []
    },
    {
      "kind": "relation",
      "schema_name": "public",
      "object_name": "research_retained_liabilities",
      "argument_types": []
    },
    {
      "kind": "function",
      "schema_name": "public",
      "object_name": "reserve_research_job",
      "argument_types": [
        "uuid",
        "uuid",
        "text",
        "int4",
        "int4",
        "text",
        "text",
        "text",
        "text"
      ]
    },
    {
      "kind": "function",
      "schema_name": "public",
      "object_name": "begin_research_provider_attempt",
      "argument_types": [
        "uuid",
        "uuid",
        "uuid",
        "text",
        "text",
        "int4",
        "text"
      ]
    },
    {
      "kind": "function",
      "schema_name": "public",
      "object_name": "finish_research_provider_attempt",
      "argument_types": [
        "uuid",
        "uuid",
        "uuid",
        "text",
        "text",
        "text",
        "int8",
        "int8",
        "int8",
        "int8",
        "text"
      ]
    },
    {
      "kind": "function",
      "schema_name": "public",
      "object_name": "mark_research_job_ambiguous",
      "argument_types": [
        "uuid",
        "uuid",
        "text"
      ]
    },
    {
      "kind": "function",
      "schema_name": "public",
      "object_name": "complete_research_job",
      "argument_types": [
        "uuid",
        "uuid",
        "uuid",
        "uuid",
        "text",
        "jsonb",
        "int4",
        "timestamptz",
        "text",
        "jsonb",
        "text",
        "timestamptz"
      ]
    },
    {
      "kind": "function",
      "schema_name": "public",
      "object_name": "fail_research_job",
      "argument_types": [
        "uuid",
        "uuid",
        "text"
      ]
    },
    {
      "kind": "function",
      "schema_name": "public",
      "object_name": "handle_new_user_signup",
      "argument_types": []
    },
    {
      "kind": "function",
      "schema_name": "public",
      "object_name": "touch_user_profile_updated_at",
      "argument_types": []
    },
    {
      "kind": "function",
      "schema_name": "public",
      "object_name": "enforce_saved_listing_quota",
      "argument_types": []
    }
  ],
  "frontier": []
}
```

After a successful, non-truncated bootstrap, construct preapproved metadata-only batches from the returned OIDs/owners and evidence receipts, respecting combined 64/512 budgets. The bootstrap does not authorize selecting from any listed customer table: queries read ONLY pg_catalog structure. Missing proposed objects are recorded, not provisioned. Catalog/input type resolution uses the exact source signatures above; defaults on begin/finish do not create separate overloads.

## 4. Query/result contracts

All query blocks below are NOT EXECUTED — FUTURE APPROVAL REQUIRED. Each SELECT list is its exact output schema; the Expected columns line repeats it for review. Never add SELECT *, expression/body exports or diagnostics. First run CONTROL-OPEN then Q1, P0 and Q1-CATALOGS; later manifest revisions repeat P0. Q12 bootstraps names->OIDs; Q4 enumerates overloads; then validate approved OID batches before privilege/structure/dependency queries. Numerical section order is an inventory, not permission to run with unresolved dependencies.

### P0 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Before every unchanged manifest batch; no other query until all eight rows pass.

Expected columns: key,kind,cap,item_count,exact_manifest_keys,byte_limit_ok,total_oid_bound_ok,total_identity_seed_bound_ok,array_bound_ok,no_duplicate_items,element_shapes_ok.

JSON metadata manifest validity only. Invalid JSON/casts/shape may raise an error: stop and retain SQLSTATE only; no fallback or partial success.

```sql
WITH p AS (SELECT $1::pg_catalog.jsonb AS doc),
spec(key, kind, cap) AS (
  VALUES ('roles','name',64), ('function_names','name',64), ('schemas','name',32),
         ('relation_oids','oid',512), ('function_oids','oid',512),
         ('owner_oids','oid',64), ('expected','expected',512), ('frontier','frontier',512)
),
a AS (
  SELECT spec.key, spec.kind, spec.cap, p.doc,
         CASE WHEN pg_catalog.jsonb_typeof(p.doc -> key) = 'array'
              THEN p.doc -> key ELSE '[]'::pg_catalog.jsonb END AS vals,
         pg_catalog.jsonb_typeof(p.doc -> key) = 'array' AS is_array
  FROM spec CROSS JOIN p
)
SELECT key, kind, cap, pg_catalog.jsonb_array_length(vals) AS item_count,
       (pg_catalog.jsonb_typeof(doc) = 'object'
        AND ARRAY(SELECT k FROM pg_catalog.jsonb_object_keys(doc) AS t(k) ORDER BY k COLLATE pg_catalog."C")
          = ARRAY['expected','frontier','function_names','function_oids','owner_oids',
                  'relation_oids','roles','schemas']::pg_catalog.text[]) AS exact_manifest_keys,
       pg_catalog.octet_length(doc::pg_catalog.text) <= 262144 AS byte_limit_ok,
       pg_catalog.sum(CASE WHEN kind IN ('oid','frontier')
         THEN pg_catalog.jsonb_array_length(vals) ELSE 0 END) OVER () <= 512 AS total_oid_bound_ok,
       pg_catalog.sum(CASE WHEN key IN ('roles','function_names','owner_oids','function_oids')
         THEN pg_catalog.jsonb_array_length(vals) ELSE 0 END) OVER () <= 64 AS total_identity_seed_bound_ok,
       COALESCE(is_array, false)
         AND pg_catalog.jsonb_array_length(vals) <= cap AS array_bound_ok,
       (SELECT pg_catalog.count(*) = pg_catalog.count(DISTINCT v)
        FROM pg_catalog.jsonb_array_elements(vals) AS e(v)) AS no_duplicate_items,
       CASE WHEN pg_catalog.jsonb_array_length(vals) > cap THEN false ELSE
         NOT EXISTS (
           SELECT 1 FROM pg_catalog.jsonb_array_elements(vals) AS e(v)
           WHERE NOT COALESCE(CASE kind
             WHEN 'name' THEN pg_catalog.jsonb_typeof(v) = 'string'
               AND pg_catalog.length(v #>> '{}') BETWEEN 1 AND 200
               AND v #>> '{}' <> 'PUBLIC'
             WHEN 'oid' THEN CASE WHEN pg_catalog.jsonb_typeof(v) = 'number'
               AND (v #>> '{}') ~ '^[1-9][0-9]{0,9}$'
               THEN (v #>> '{}')::pg_catalog.numeric <= 4294967295 ELSE false END
             WHEN 'expected' THEN pg_catalog.jsonb_typeof(v) = 'object'
               AND ARRAY(SELECT k FROM pg_catalog.jsonb_object_keys(v) AS t(k) ORDER BY k COLLATE pg_catalog."C")
                 = ARRAY['argument_types','kind','object_name','schema_name']::pg_catalog.text[]
               AND v ->> 'kind' IN ('schema','relation','function')
               AND (doc -> 'schemas') ? (v ->> 'schema_name')
               AND (v ->> 'kind' <> 'function' OR (doc -> 'function_names') ? (v ->> 'object_name'))
               AND pg_catalog.jsonb_typeof(v -> 'schema_name') = 'string'
               AND pg_catalog.length(v ->> 'schema_name') BETWEEN 1 AND 200
               AND CASE WHEN v ->> 'kind' = 'schema'
                 THEN v -> 'object_name' = 'null'::pg_catalog.jsonb
                 ELSE pg_catalog.jsonb_typeof(v -> 'object_name') = 'string'
                   AND pg_catalog.length(v ->> 'object_name') BETWEEN 1 AND 200 END
               AND CASE WHEN pg_catalog.jsonb_typeof(v -> 'argument_types') = 'array'
                 THEN pg_catalog.jsonb_array_length(v -> 'argument_types') <= 100
                   AND (v ->> 'kind' = 'function' OR pg_catalog.jsonb_array_length(v -> 'argument_types') = 0)
                   AND NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(v -> 'argument_types') AS z(t)
                     WHERE pg_catalog.jsonb_typeof(t) <> 'string'
                       OR pg_catalog.length(t #>> '{}') NOT BETWEEN 1 AND 200)
                 ELSE false END
             WHEN 'frontier' THEN pg_catalog.jsonb_typeof(v) = 'object'
               AND ARRAY(SELECT k FROM pg_catalog.jsonb_object_keys(v) AS t(k) ORDER BY k COLLATE pg_catalog."C")
                 = ARRAY['class_name','depth','objid','objsubid']::pg_catalog.text[]
               AND v ->> 'class_name' IN ('pg_class','pg_proc','pg_constraint','pg_attrdef',
                 'pg_trigger','pg_type','pg_namespace','pg_policy','pg_rewrite','pg_extension',
                 'pg_operator','pg_cast','pg_collation','pg_language','pg_opclass','pg_opfamily',
                 'pg_am','pg_amop','pg_amproc','pg_event_trigger')
               AND CASE WHEN (v ->> 'objid') ~ '^[1-9][0-9]{0,9}$'
                 AND pg_catalog.jsonb_typeof(v -> 'objid') = 'number'
                 THEN (v ->> 'objid')::pg_catalog.numeric <= 4294967295 ELSE false END
               AND CASE WHEN (v ->> 'objsubid') ~ '^(0|[1-9][0-9]{0,9})$'
                 AND pg_catalog.jsonb_typeof(v -> 'objsubid') = 'number'
                 THEN (v ->> 'objsubid')::pg_catalog.numeric <= 2147483647 ELSE false END
               AND (v ->> 'class_name' = 'pg_class' OR v ->> 'objsubid' = '0')
               AND CASE WHEN (v ->> 'depth') ~ '^(0|[1-9][0-9]?)$'
                 AND pg_catalog.jsonb_typeof(v -> 'depth') = 'number'
                 THEN (v ->> 'depth')::pg_catalog.int4 BETWEEN 0 AND 16 ELSE false END
             ELSE false END, false)
         ) END AS element_shapes_ok
FROM a ORDER BY key LIMIT 1001;
```

### Q1 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: After initialization, before version-dependent queries.

Expected columns: database_name,login_identity,effective_identity,server_version_num,server_encoding,default_read_only,transaction_read_only,statement_timeout,lock_timeout.

Require PostgreSQL 17.x (170000..179999), UTF8, both read-only flags on, timeouts 30s/3s. This is not target/TLS proof or an inside-definer probe.

```sql
SELECT pg_catalog.current_database() AS database_name, session_user AS login_identity,
       current_user AS effective_identity,
       pg_catalog.current_setting('server_version_num') AS server_version_num,
       pg_catalog.current_setting('server_encoding') AS server_encoding,
       pg_catalog.current_setting('default_transaction_read_only') AS default_read_only,
       pg_catalog.current_setting('transaction_read_only') AS transaction_read_only,
       pg_catalog.current_setting('statement_timeout') AS statement_timeout,
       pg_catalog.current_setting('lock_timeout') AS lock_timeout
LIMIT 1001;
```

### Q1-CATALOGS — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q1/P0 before all catalog inventories; fixed reviewed metadata catalogs only.

Expected columns: catalog_name,catalog_oid,relkind,relrowsecurity,relforcerowsecurity,can_select,schema_usage.

Require every expected catalog/view present, readable, ordinary trusted pg_catalog definition and no unexpected RLS filtering. No permission -> INACCESSIBLE/UNKNOWN. SELECT privilege alone does not prove an adversarial owner has not altered a view; managed server/operator trust remains an explicit prerequisite.

```sql
SELECT wanted.name AS catalog_name,c.oid AS catalog_oid,c.relkind,c.relrowsecurity,c.relforcerowsecurity,
       CASE WHEN c.oid IS NOT NULL THEN pg_catalog.has_table_privilege(session_user,c.oid,'SELECT') END AS can_select,
       pg_catalog.has_schema_privilege(session_user,n.oid,'USAGE') AS schema_usage
FROM (VALUES ('pg_roles'),('pg_auth_members'),('pg_proc'),('pg_namespace'),('pg_default_acl'),('pg_class'),('pg_attribute'),('pg_trigger'),('pg_depend'),('pg_shdepend'),('pg_database'),('pg_constraint'),('pg_index'),('pg_attrdef'),('pg_type'),('pg_policy'),('pg_rewrite'),('pg_extension'),('pg_operator'),('pg_cast'),('pg_collation'),('pg_language'),('pg_event_trigger'),('pg_inherits'),('pg_opclass'),('pg_opfamily'),('pg_am'),('pg_amop'),('pg_amproc')) AS wanted(name)
JOIN pg_catalog.pg_namespace n ON n.nspname='pg_catalog'
LEFT JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid AND c.relname=wanted.name
ORDER BY wanted.name LIMIT 1001;
```

### Q2 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: P0/Q1; approved roles, including current operator and workload candidates.

Expected columns: role_name,role_oid,rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls,rolinherit,rolvaliduntil,catalog_state.

NOT_FOUND is provisional catalog evidence; see classification gate. Never select the password-shaped column from this view.

```sql
SELECT seed.role_name, r.oid AS role_oid, r.rolcanlogin, r.rolsuper, r.rolcreaterole,
       r.rolcreatedb, r.rolreplication, r.rolbypassrls, r.rolinherit, r.rolvaliduntil,
       CASE WHEN r.oid IS NULL THEN 'NOT_FOUND' ELSE 'CATALOG_PRESENT' END AS catalog_state
FROM pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'roles') AS seed(role_name)
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = seed.role_name
ORDER BY seed.role_name LIMIT 1001;
```

### Q3 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q2; existing approved root roles. Missing roots remain Q2 findings, not an empty-success result.

Expected columns: root_oid,root_name,reached_oid,reached_name,min_depth,member_reachable,inherits_now,can_set_role,edge_member,edge_role,grantor,admin_option,inherit_option,set_option,depth_limited.

Depth <=16; UNION deduplicates visit states instead of enumerating path arrays. Server MEMBER/USAGE/SET checks report effective membership/inheritance/switching separately. ADMIN is an edge privilege, not transitive authority. Superusers/owners need separate privilege interpretation. Any depth_limited or sentinel result stops; cycles may yield repeated depths but cannot grow beyond 16.

```sql
WITH RECURSIVE seed AS (
 SELECT r.oid AS root FROM pg_catalog.pg_roles r
 WHERE r.rolname IN (SELECT v FROM
   pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'roles') AS s(v))
), walk(root,reached,depth) AS (
 SELECT root,root,0 FROM seed
 UNION
 SELECT w.root,m.roleid,w.depth+1
 FROM walk w JOIN pg_catalog.pg_auth_members m ON m.member=w.reached
 WHERE w.depth<16
), nodes AS (
 SELECT root,reached,pg_catalog.min(depth) AS min_depth
 FROM walk GROUP BY root,reached
)
SELECT x.root AS root_oid,root_role.rolname AS root_name,x.reached AS reached_oid,
       target.rolname AS reached_name,x.min_depth,
       pg_catalog.pg_has_role(x.root,x.reached,'MEMBER') AS member_reachable,
       pg_catalog.pg_has_role(x.root,x.reached,'USAGE') AS inherits_now,
       pg_catalog.pg_has_role(x.root,x.reached,'SET') AS can_set_role,
       edge.member AS edge_member,edge.roleid AS edge_role,edge.grantor,
       edge.admin_option,edge.inherit_option,edge.set_option,
       EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members next_edge
         WHERE next_edge.member=x.reached AND NOT EXISTS (
           SELECT 1 FROM nodes seen WHERE seen.root=x.root AND seen.reached=next_edge.roleid
         )) AS depth_limited
FROM nodes x
JOIN pg_catalog.pg_roles root_role ON root_role.oid=x.root
JOIN pg_catalog.pg_roles target ON target.oid=x.reached
LEFT JOIN pg_catalog.pg_auth_members edge ON edge.member=x.reached
ORDER BY x.root,x.reached,edge.roleid,edge.grantor LIMIT 1001;
```

### Q4 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: P0/Q1; approved function-name seeds across ALL schemas; do not filter away alternate schemas.

Expected columns: schema_name,function_oid,proname,prokind,proowner,owner_name,input_type_oids,pronargs,pronargdefaults,provariadic,prosecdef,prorettype,proretset,prolang,all_argument_type_oids,proargmodes,provolatile,proparallel,proisstrict,proleakproof,support_function_oid,search_path_entries,exact_safe_search_path,acl_uses_builtin_default.

No body/default-expression/argument-name/config values exported. Only search-path count and exact pg_catalog match. Check default-call arity and variadic forms offline; they are not separate stored overloads. Unexpected schema or support function -> unresolved review.

```sql
SELECT n.nspname AS schema_name, p.oid AS function_oid, p.proname, p.prokind,
       p.proowner, owner_role.rolname AS owner_name,
       p.proargtypes::pg_catalog.oid[] AS input_type_oids, p.pronargs, p.pronargdefaults,
       p.provariadic, p.prosecdef, p.prorettype, p.proretset, p.prolang,
       p.proallargtypes AS all_argument_type_oids,p.proargmodes,
       p.provolatile,p.proparallel,p.proisstrict,p.proleakproof,p.prosupport::pg_catalog.oid AS support_function_oid,
       (SELECT pg_catalog.count(*) FROM pg_catalog.unnest(p.proconfig) AS cfg(v)
         WHERE v LIKE 'search_path=%') AS search_path_entries,
       COALESCE('search_path=pg_catalog' = ANY(p.proconfig), false) AS exact_safe_search_path,
       p.proacl IS NULL AS acl_uses_builtin_default
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = p.proowner
WHERE p.proname IN (
  SELECT v FROM pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'function_names') AS s(v))
ORDER BY n.nspname, p.proname, p.oid LIMIT 1001;
```

### Q4-ACL — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q4-selected approved function OIDs; P0 rerun if manifest changes.

Expected columns: function_oid,grantor,grantee,privilege_type,is_grantable,builtin_default,explicit_empty.

Separate flat ACL rows avoid multiplying Q4 metadata/effective results. PUBLIC is grantee=0. NULL ACL means built-in defaults, explicit empty does not. LEFT lateral preserves empty ACL rows.

```sql
SELECT p.oid AS function_oid, acl.grantor, acl.grantee,
       acl.privilege_type, acl.is_grantable,
       p.proacl IS NULL AS builtin_default, pg_catalog.cardinality(p.proacl) = 0 AS explicit_empty
FROM pg_catalog.pg_proc p
LEFT JOIN LATERAL pg_catalog.aclexplode(
  COALESCE(p.proacl, pg_catalog.acldefault('f'::pg_catalog."char", p.proowner))) AS acl ON true
WHERE p.oid IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'function_oids') AS s(v))
ORDER BY p.oid, acl.grantee, acl.grantor, acl.privilege_type LIMIT 1001;
```

### Q5 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q2/Q3/Q4; $2 is one approved existing/reachable role name present in manifest.roles. Repeat only preapproved role/object batches.

Expected columns: requested_function_oid,function_oid,role_oid,object_execute,schema_usage.

Object EXECUTE is not namespace USAGE or proof of safe behavior. Null/missing role/function never means false/denied. Inspect every reachable role, not only inherited root rights; no SET ROLE execution.

```sql
SELECT seed.oid AS requested_function_oid, p.oid AS function_oid, r.oid AS role_oid,
       CASE WHEN r.oid IS NULL OR p.oid IS NULL THEN NULL
         ELSE pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE') END AS object_execute,
       CASE WHEN r.oid IS NULL OR p.oid IS NULL THEN NULL
         ELSE pg_catalog.has_schema_privilege(r.oid, p.pronamespace, 'USAGE') END AS schema_usage
FROM (SELECT v::pg_catalog.oid AS oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'function_oids') AS s(v)) seed
LEFT JOIN pg_catalog.pg_proc p ON p.oid = seed.oid
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = $2::pg_catalog.text
WHERE ($1::pg_catalog.jsonb -> 'roles') ? ($2::pg_catalog.text)
ORDER BY seed.oid LIMIT 1001;
```

### Q6 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q4/Q9 owners and approved owner_oids; all namespaces for those owners, including global namespace OID 0.

Expected columns: default_acl_oid,owner_oid,schema_oid,nspname,defaclobjtype,explicit_empty,grantor,grantee,privilege_type,is_grantable.

Schema OID 0 intentionally has no namespace row. LEFT lateral retains explicit empty defaults. Missing pg_default_acl rows never imply no PUBLIC EXECUTE. Global defaults replace built-ins; schema defaults add to applicable global defaults. Do not treat either as current function ACL.

```sql
SELECT d.oid AS default_acl_oid, d.defaclrole AS owner_oid,
       d.defaclnamespace AS schema_oid, n.nspname, d.defaclobjtype,
       pg_catalog.cardinality(d.defaclacl) = 0 AS explicit_empty,
       acl.grantor, acl.grantee, acl.privilege_type, acl.is_grantable
FROM pg_catalog.pg_default_acl d
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
LEFT JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) AS acl ON true
WHERE d.defaclrole IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'owner_oids') AS s(v))
ORDER BY d.defaclrole, d.defaclnamespace, d.defaclobjtype, acl.grantee, acl.grantor LIMIT 1001;
```

### Q6-BUILTIN — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q6 plus approved existing owner_oids.

Expected columns: owner_oid,kind,grantor,grantee,privilege_type,is_grantable.

Built-in f/n/r/S/T/L defaults shown separately. Reconcile with global/schema overrides; current ACL/effective checks remain authoritative for current objects. Sequences/types are structural/default evidence, not included implicitly in table privilege functions.

```sql
SELECT r.oid AS owner_oid, kinds.kind, acl.grantor, acl.grantee,
       acl.privilege_type, acl.is_grantable
FROM pg_catalog.pg_roles r
CROSS JOIN (VALUES ('f'),('n'),('r'),('S'),('T'),('L')) AS kinds(kind)
LEFT JOIN LATERAL pg_catalog.aclexplode(
  pg_catalog.acldefault(kinds.kind::pg_catalog."char", r.oid)) AS acl ON true
WHERE r.oid IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'owner_oids') AS s(v))
ORDER BY r.oid, kinds.kind, acl.grantee, acl.grantor LIMIT 1001;
```

### Q8 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q2/Q3; $2 single role from manifest; all approved schema seeds.

Expected columns: schema_name,schema_oid,role_oid,can_use,can_create.

Missing schema/role yields NULL, not deny proof. No ACL cross multiplication.

```sql
SELECT seed.schema_name, n.oid AS schema_oid, r.oid AS role_oid,
       CASE WHEN n.oid IS NULL OR r.oid IS NULL THEN NULL
         ELSE pg_catalog.has_schema_privilege(r.oid,n.oid,'USAGE') END AS can_use,
       CASE WHEN n.oid IS NULL OR r.oid IS NULL THEN NULL
         ELSE pg_catalog.has_schema_privilege(r.oid,n.oid,'CREATE') END AS can_create
FROM pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'schemas') AS seed(schema_name)
LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = seed.schema_name
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = $2::pg_catalog.text
WHERE ($1::pg_catalog.jsonb -> 'roles') ? ($2::pg_catalog.text)
ORDER BY seed.schema_name LIMIT 1001;
```

### Q8-ACL — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q8-approved schema names.

Expected columns: schema_oid,owner_oid,builtin_default,explicit_empty,grantor,grantee,privilege_type,is_grantable.

Flat schema ACL independent of the per-role effective check.

```sql
SELECT n.oid AS schema_oid, n.nspowner AS owner_oid,
       n.nspacl IS NULL AS builtin_default, pg_catalog.cardinality(n.nspacl) = 0 AS explicit_empty,
       acl.grantor, acl.grantee, acl.privilege_type, acl.is_grantable
FROM pg_catalog.pg_namespace n
LEFT JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,
  pg_catalog.acldefault('n'::pg_catalog."char",n.nspowner))) AS acl ON true
WHERE n.nspname IN (SELECT v FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'schemas') AS s(v))
ORDER BY n.oid, acl.grantee, acl.grantor, acl.privilege_type LIMIT 1001;
```

### Q9 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q2/Q3 plus Q12-approved relation OIDs; $2 one approved role.

Expected columns: requested_relation_oid,relation_oid,relkind,relnamespace,relowner,relispartition,relrowsecurity,relforcerowsecurity,role_oid,schema_usage,can_select,can_insert,can_update,can_delete,can_truncate,can_reference,can_trigger,can_maintain.

Wide per-relation booleans avoid rights×ACL products. MAINTAIN is PostgreSQL 17-specific. Unsupported relkind yields NULL flags, not a false safe result. RLS/owner/BYPASSRLS and views/triggers constrain actual behavior; no runtime mutation is attempted.

```sql
SELECT seed.oid AS requested_relation_oid, c.oid AS relation_oid, c.relkind,
       c.relnamespace, c.relowner, c.relispartition, c.relrowsecurity, c.relforcerowsecurity, r.oid AS role_oid,
       CASE WHEN c.oid IS NOT NULL AND r.oid IS NOT NULL AND c.relkind IN ('r','p','v','m','f') THEN
         pg_catalog.has_schema_privilege(r.oid,c.relnamespace,'USAGE') END AS schema_usage,
       CASE WHEN c.oid IS NOT NULL AND r.oid IS NOT NULL AND c.relkind IN ('r','p','v','m','f') THEN
         pg_catalog.has_table_privilege(r.oid,c.oid,'SELECT') END AS can_select,
       CASE WHEN c.oid IS NOT NULL AND r.oid IS NOT NULL AND c.relkind IN ('r','p','v','m','f') THEN
         pg_catalog.has_table_privilege(r.oid,c.oid,'INSERT') END AS can_insert,
       CASE WHEN c.oid IS NOT NULL AND r.oid IS NOT NULL AND c.relkind IN ('r','p','v','m','f') THEN
         pg_catalog.has_table_privilege(r.oid,c.oid,'UPDATE') END AS can_update,
       CASE WHEN c.oid IS NOT NULL AND r.oid IS NOT NULL AND c.relkind IN ('r','p','v','m','f') THEN
         pg_catalog.has_table_privilege(r.oid,c.oid,'DELETE') END AS can_delete,
       CASE WHEN c.oid IS NOT NULL AND r.oid IS NOT NULL AND c.relkind IN ('r','p','v','m','f') THEN
         pg_catalog.has_table_privilege(r.oid,c.oid,'TRUNCATE') END AS can_truncate,
       CASE WHEN c.oid IS NOT NULL AND r.oid IS NOT NULL AND c.relkind IN ('r','p','v','m','f') THEN
         pg_catalog.has_table_privilege(r.oid,c.oid,'REFERENCES') END AS can_reference,
       CASE WHEN c.oid IS NOT NULL AND r.oid IS NOT NULL AND c.relkind IN ('r','p','v','m','f') THEN
         pg_catalog.has_table_privilege(r.oid,c.oid,'TRIGGER') END AS can_trigger,
       CASE WHEN c.oid IS NOT NULL AND r.oid IS NOT NULL AND c.relkind IN ('r','p','v','m','f') THEN
         pg_catalog.has_table_privilege(r.oid,c.oid,'MAINTAIN') END AS can_maintain
FROM (SELECT v::pg_catalog.oid AS oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v)) seed
LEFT JOIN pg_catalog.pg_class c ON c.oid = seed.oid
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = $2::pg_catalog.text
WHERE ($1::pg_catalog.jsonb -> 'roles') ? ($2::pg_catalog.text)
ORDER BY seed.oid LIMIT 1001;
```

### Q9-ACL — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q9; approved relation OIDs only.

Expected columns: relation_oid,relkind,builtin_default,explicit_empty,grantor,grantee,privilege_type,is_grantable.

Sequence defaults use S, not table r. Q9 does not evaluate sequence-specific USAGE/SELECT/UPDATE: any sequence privilege dependency remains unresolved until separately scoped; do not pass unsupported kinds.

```sql
SELECT c.oid AS relation_oid, c.relkind, c.relacl IS NULL AS builtin_default,
       pg_catalog.cardinality(c.relacl) = 0 AS explicit_empty,
       acl.grantor, acl.grantee, acl.privilege_type, acl.is_grantable
FROM pg_catalog.pg_class c
LEFT JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,
  pg_catalog.acldefault(CASE WHEN c.relkind = 'S' THEN 'S'::pg_catalog."char"
    ELSE 'r'::pg_catalog."char" END,c.relowner))) AS acl ON true
WHERE c.oid IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
  AND c.relkind IN ('r','p','v','m','f','S')
ORDER BY c.oid, acl.grantee, acl.grantor, acl.privilege_type LIMIT 1001;
```

### Q10 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q2/Q3/Q9; $2 one approved role.

Expected columns: relation_oid,attnum,attname,role_oid,can_select,can_insert,can_update,can_reference.

has_column_privilege includes applicable table grants, not only column ACLs. Do not AND it with table-level privilege and accidentally hide column-only grants. Namespace USAGE is separate Q8/Q9 evidence.

```sql
SELECT c.oid AS relation_oid, a.attnum, a.attname, r.oid AS role_oid,
       CASE WHEN r.oid IS NOT NULL THEN pg_catalog.has_column_privilege(r.oid,c.oid,a.attnum,'SELECT') END AS can_select,
       CASE WHEN r.oid IS NOT NULL THEN pg_catalog.has_column_privilege(r.oid,c.oid,a.attnum,'INSERT') END AS can_insert,
       CASE WHEN r.oid IS NOT NULL THEN pg_catalog.has_column_privilege(r.oid,c.oid,a.attnum,'UPDATE') END AS can_update,
       CASE WHEN r.oid IS NOT NULL THEN pg_catalog.has_column_privilege(r.oid,c.oid,a.attnum,'REFERENCES') END AS can_reference
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
LEFT JOIN pg_catalog.pg_roles r ON r.rolname=$2::pg_catalog.text
WHERE c.oid IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
  AND c.relkind IN ('r','p','v','m','f')
  AND ($1::pg_catalog.jsonb -> 'roles') ? ($2::pg_catalog.text)
ORDER BY c.oid,a.attnum LIMIT 1001;
```

### Q10-ACL — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q10-approved relation OIDs.

Expected columns: relation_oid,attnum,attname,no_column_acl,explicit_empty,grantor,grantee,privilege_type,is_grantable.

Column ACL is shown separately, with NULL not expanded into an invented column default. Table grants remain relevant through Q10.

```sql
SELECT a.attrelid AS relation_oid,a.attnum,a.attname,
       a.attacl IS NULL AS no_column_acl, pg_catalog.cardinality(a.attacl)=0 AS explicit_empty,
       acl.grantor,acl.grantee,acl.privilege_type,acl.is_grantable
FROM pg_catalog.pg_attribute a
LEFT JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS acl ON true
WHERE a.attrelid IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
  AND a.attnum>0 AND NOT a.attisdropped
ORDER BY a.attrelid,a.attnum,acl.grantee,acl.grantor,acl.privilege_type LIMIT 1001;
```

### Q11 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: P0/Q12-approved relation OIDs, including partition/inheritance-related tables when explicitly approved.

Expected columns: trigger_oid,tgrelid,tgname,tgfoid,tgtype,tgenabled,tgisinternal,tgconstraint,tgparentid,tgnargs,tgconstrrelid,tgconstrindid,tgdeferrable,tginitdeferred,has_when_expression,has_old_transition_table,has_new_transition_table.

Include internal, disabled, replica and partition triggers. No trigger arguments, WHEN expressions or transition-table names. Inspect tgfoid under separately approved Q4/Q11 dependency seeds; missing reviewed definition is unresolved.

```sql
SELECT t.oid AS trigger_oid,t.tgrelid,t.tgname,t.tgfoid,t.tgtype,
       t.tgenabled,t.tgisinternal,t.tgconstraint,t.tgparentid,t.tgnargs,
       t.tgconstrrelid,t.tgconstrindid,t.tgdeferrable,t.tginitdeferred,
       t.tgqual IS NOT NULL AS has_when_expression,
       t.tgoldtable IS NOT NULL AS has_old_transition_table,
       t.tgnewtable IS NOT NULL AS has_new_transition_table
FROM pg_catalog.pg_trigger t
WHERE t.tgrelid IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
ORDER BY t.tgrelid,t.oid LIMIT 1001;
```

### Q11-EVENT — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q1-CATALOGS/P0; fixed database-wide structural event-trigger inventory, NOT DDL execution.

Expected columns: event_trigger_oid,evtname,evtevent,evtowner,evtfoid,evtenabled,has_tag_filter,tag_count.

DDL hooks relevant to future cutover may not depend on an M2 table. Include disabled/replica hooks too; no tags/body execution/export. Unknown event-trigger definition or unapproved evtfoid stops for review.

```sql
SELECT e.oid AS event_trigger_oid,e.evtname,e.evtevent,e.evtowner,e.evtfoid,e.evtenabled,
       e.evttags IS NOT NULL AS has_tag_filter,pg_catalog.cardinality(e.evttags) AS tag_count
FROM pg_catalog.pg_event_trigger e
ORDER BY e.oid LIMIT 1001;
```

### Q11-DEPEND — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q11 and approved function/relation OIDs.

Expected columns: classid,objid,objsubid,refclassid,refobjid,refobjsubid,deptype.

One-hop dependencies both directions, including column subobjects. Q11 structural edges supplement catalog dependencies; this query alone is not closure.

```sql
SELECT d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype
FROM pg_catalog.pg_depend d
WHERE (d.classid='pg_catalog.pg_class'::pg_catalog.regclass AND d.objid IN (
    SELECT v::pg_catalog.oid FROM pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v)))
   OR (d.refclassid='pg_catalog.pg_class'::pg_catalog.regclass AND d.refobjid IN (
    SELECT v::pg_catalog.oid FROM pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v)))
   OR (d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid IN (
    SELECT v::pg_catalog.oid FROM pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'function_oids') AS s(v)))
   OR (d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.refobjid IN (
    SELECT v::pg_catalog.oid FROM pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'function_oids') AS s(v)))
ORDER BY d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype LIMIT 1001;
```

### Q12 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: P0 expected-object descriptors and approved schemas/function names.

Expected columns: seed_id,kind,schema_name,object_name,argument_types,schema_oid,relation_oid,relkind,function_oid,operator_schema_usage,catalog_state.

No to_regclass/to_regprocedure on supplied text. Resolve exact schema/name and ordered built-in type OIDs. Use catalog typnames int4/int8, not SQL aliases integer/bigint. proargtypes text comparison avoids oidvector 0-based vs ARRAY 1-based equality traps. Unresolved/custom type is TYPE_UNRESOLVED, never function MISSING. Relation kind and function prokind still require Q9/Q4 review.

```sql
WITH wanted AS (
 SELECT e.kind,e.schema_name,e.object_name,e.argument_types,
        pg_catalog.row_number() OVER (ORDER BY e.kind,e.schema_name,e.object_name,e.argument_types) AS seed_id
 FROM pg_catalog.jsonb_to_recordset($1::pg_catalog.jsonb -> 'expected')
 AS e(kind pg_catalog.text,schema_name pg_catalog.text,object_name pg_catalog.text,argument_types pg_catalog.text[])
), types AS (
 SELECT w.seed_id,pg_catalog.count(t.oid) AS resolved_count,
        COALESCE(pg_catalog.string_agg(t.oid::pg_catalog.text,' ' ORDER BY a.ord),'') AS input_oid_vector
 FROM wanted w
 LEFT JOIN LATERAL pg_catalog.unnest(w.argument_types) WITH ORDINALITY AS a(type_name,ord) ON true
 LEFT JOIN pg_catalog.pg_type t ON t.typname=a.type_name
   AND t.typnamespace='pg_catalog'::pg_catalog.regnamespace
 GROUP BY w.seed_id
)
SELECT w.seed_id,w.kind,w.schema_name,w.object_name,w.argument_types,
       n.oid AS schema_oid,c.oid AS relation_oid,c.relkind,p.oid AS function_oid,
       CASE WHEN n.oid IS NULL THEN NULL
         ELSE pg_catalog.has_schema_privilege(session_user,n.oid,'USAGE') END AS operator_schema_usage,
       CASE WHEN w.kind='function' AND ty.resolved_count<>pg_catalog.cardinality(w.argument_types)
         THEN 'TYPE_UNRESOLVED'
         WHEN n.oid IS NULL THEN 'NOT_FOUND'
         WHEN w.kind='schema' OR c.oid IS NOT NULL OR p.oid IS NOT NULL THEN 'CATALOG_PRESENT'
         ELSE 'NOT_FOUND' END AS catalog_state
FROM wanted w
JOIN types ty ON ty.seed_id=w.seed_id
LEFT JOIN pg_catalog.pg_namespace n ON n.nspname=w.schema_name
LEFT JOIN pg_catalog.pg_class c ON w.kind='relation' AND c.relnamespace=n.oid AND c.relname=w.object_name
LEFT JOIN pg_catalog.pg_proc p ON w.kind='function' AND p.pronamespace=n.oid AND p.proname=w.object_name
 AND p.proargtypes::pg_catalog.text=ty.input_oid_vector
 AND ty.resolved_count=pg_catalog.cardinality(w.argument_types)
ORDER BY w.seed_id,p.oid LIMIT 1001;
```

### M13 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q12-approved relation OIDs; includes BOTH outbound and inbound foreign references.

Expected columns: constraint_oid,conname,contype,conrelid,confrelid,conindid,conparentid,conkey,confkey,confupdtype,confdeltype,confmatchtype,condeferrable,condeferred,convalidated,conislocal,coninhcount,connoinherit,contypid,confdelsetcols,has_check_expression,local_columns,referenced_columns.

Preserve ordered key columns, partition parent, referenced index and FK SET NULL/DEFAULT target subset. FK action codes a/r/c/n/d mean NO ACTION/RESTRICT/CASCADE/SET NULL/SET DEFAULT; do not conflate a and r. Missing attribute labels or unknown code is unresolved; never export CHECK expression.

```sql
SELECT c.oid AS constraint_oid,c.conname,c.contype,c.conrelid,c.confrelid,
       c.conindid,c.conparentid,c.conkey,c.confkey,c.confupdtype,c.confdeltype,c.confmatchtype,
       c.condeferrable,c.condeferred,c.convalidated,c.conislocal,c.coninhcount,c.connoinherit,
       c.contypid,c.confdelsetcols,c.conbin IS NOT NULL AS has_check_expression,
       ARRAY(SELECT a.attname::pg_catalog.text FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY AS k(num,ord)
         LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY k.ord) AS local_columns,
       ARRAY(SELECT a.attname::pg_catalog.text FROM pg_catalog.unnest(c.confkey) WITH ORDINALITY AS k(num,ord)
         LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num ORDER BY k.ord) AS referenced_columns
FROM pg_catalog.pg_constraint c
WHERE c.conrelid IN (SELECT v::pg_catalog.oid FROM
    pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
   OR c.confrelid IN (SELECT v::pg_catalog.oid FROM
    pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
ORDER BY c.conrelid,c.oid LIMIT 1001;
```

### M14 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q12-approved relation OIDs; follow referenced index OIDs from M13.

Expected columns: indexrelid,indrelid,relnamespace,index_name,relkind,indnatts,indnkeyatts,attribute_numbers,operator_classes,collations,index_options,indisunique,indnullsnotdistinct,indisprimary,indisexclusion,indimmediate,indisvalid,indisready,indislive,has_predicate,has_expression.

Zero attribute slot denotes expression; first indnkeyatts slots are keys, remaining INCLUDE columns. Valid uniqueness cannot be inferred from indisunique alone, nor from predicate/expression presence. Defer predicate/operator/extension semantics to reviewed parity. indnullsnotdistinct requires PG15+, covered by PG17 gate.

```sql
SELECT i.indexrelid,i.indrelid,idx.relnamespace,idx.relname AS index_name,idx.relkind,
       i.indnatts,i.indnkeyatts,i.indkey::pg_catalog.int2[] AS attribute_numbers,
       i.indclass::pg_catalog.oid[] AS operator_classes,
       i.indcollation::pg_catalog.oid[] AS collations,
       i.indoption::pg_catalog.int2[] AS index_options,
       i.indisunique,i.indnullsnotdistinct,i.indisprimary,i.indisexclusion,
       i.indimmediate,i.indisvalid,i.indisready,i.indislive,
       i.indpred IS NOT NULL AS has_predicate,i.indexprs IS NOT NULL AS has_expression
FROM pg_catalog.pg_index i
JOIN pg_catalog.pg_class idx ON idx.oid=i.indexrelid
WHERE i.indrelid IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
ORDER BY i.indrelid,i.indexrelid LIMIT 1001;
```

### M15-COLUMNS — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q12-approved relation OIDs.

Expected columns: attrelid,attnum,attname,atttypid,atttypmod,attnotnull,attidentity,attgenerated,attcollation,typnamespace,typname,typtype,typbasetype,has_default_or_generation_expression.

No dropped/system columns or expression/default values. Domains, generated/default functions and custom types need M16 plus reviewed definitions; column metadata alone does not prove no side effects.

```sql
SELECT a.attrelid,a.attnum,a.attname,a.atttypid,a.atttypmod,a.attnotnull,
       a.attidentity,a.attgenerated,a.attcollation,ty.typnamespace,ty.typname,ty.typtype,ty.typbasetype,
       def.oid IS NOT NULL AS has_default_or_generation_expression
FROM pg_catalog.pg_attribute a
LEFT JOIN pg_catalog.pg_type ty ON ty.oid=a.atttypid
LEFT JOIN pg_catalog.pg_attrdef def ON def.adrelid=a.attrelid AND def.adnum=a.attnum
WHERE a.attrelid IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
  AND a.attnum>0 AND NOT a.attisdropped
ORDER BY a.attrelid,a.attnum LIMIT 1001;
```

### M15-POLICIES — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q9 RLS flags and approved relation OIDs.

Expected columns: policy_oid,polrelid,polname,polcmd,polpermissive,polroles,has_using,has_with_check,relrowsecurity,relforcerowsecurity.

No USING/WITH CHECK expressions exported. polroles OID 0 is PUBLIC. No rows means no stored policy, NOT unrestricted access; RLS/default-deny/owner bypass require separate interpretation. Structural equality cannot verify policy correctness.

```sql
SELECT p.oid AS policy_oid,p.polrelid,p.polname,p.polcmd,p.polpermissive,p.polroles,
       p.polqual IS NOT NULL AS has_using,p.polwithcheck IS NOT NULL AS has_with_check,
       c.relrowsecurity,c.relforcerowsecurity
FROM pg_catalog.pg_policy p
JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
WHERE p.polrelid IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
ORDER BY p.polrelid,p.oid LIMIT 1001;
```

### M16-INHERITANCE — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Q12-approved relation OIDs; supplement dependency closure before following partitions.

Expected columns: inhrelid,inhparent,inhseqno,inhdetachpending.

Both child and parent directions, including pending detach. Partition/inheritance edges are not inferred solely from pg_depend. Add approved opposite relation endpoints to closure or stop unresolved; do not inspect partition expressions/data.

```sql
SELECT i.inhrelid,i.inhparent,i.inhseqno,i.inhdetachpending
FROM pg_catalog.pg_inherits i
WHERE i.inhrelid IN (SELECT v::pg_catalog.oid FROM
    pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
   OR i.inhparent IN (SELECT v::pg_catalog.oid FROM
    pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'relation_oids') AS s(v))
ORDER BY i.inhparent,i.inhrelid,i.inhseqno LIMIT 1001;
```

### M16-FRONTIER — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: P0 validated approved frontier; BEFORE M16 for each iteration.

Expected columns: class_name,objid,objsubid,depth,object_present.

Every seed/subobject must still exist. Missing address cannot be certified as a leaf. All static catalog lookups are metadata-only; unsupported class or non-column subobject is rejected by P0. Compare count to input frontier, require every object_present=true.

```sql
SELECT f.class_name,f.objid,f.objsubid,f.depth,
       CASE f.class_name
         WHEN 'pg_proc' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_proc x WHERE x.oid=f.objid)
         WHEN 'pg_namespace' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_namespace x WHERE x.oid=f.objid)
         WHEN 'pg_class' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_class x WHERE x.oid=f.objid)
         WHEN 'pg_trigger' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_trigger x WHERE x.oid=f.objid)
         WHEN 'pg_constraint' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_constraint x WHERE x.oid=f.objid)
         WHEN 'pg_attrdef' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_attrdef x WHERE x.oid=f.objid)
         WHEN 'pg_type' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_type x WHERE x.oid=f.objid)
         WHEN 'pg_policy' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_policy x WHERE x.oid=f.objid)
         WHEN 'pg_rewrite' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite x WHERE x.oid=f.objid)
         WHEN 'pg_extension' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_extension x WHERE x.oid=f.objid)
         WHEN 'pg_operator' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_operator x WHERE x.oid=f.objid)
         WHEN 'pg_cast' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_cast x WHERE x.oid=f.objid)
         WHEN 'pg_collation' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_collation x WHERE x.oid=f.objid)
         WHEN 'pg_language' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_language x WHERE x.oid=f.objid)
         WHEN 'pg_opclass' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_opclass x WHERE x.oid=f.objid)
         WHEN 'pg_opfamily' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_opfamily x WHERE x.oid=f.objid)
         WHEN 'pg_am' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_am x WHERE x.oid=f.objid)
         WHEN 'pg_amop' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_amop x WHERE x.oid=f.objid)
         WHEN 'pg_amproc' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_amproc x WHERE x.oid=f.objid)
         WHEN 'pg_event_trigger' THEN EXISTS (SELECT 1 FROM pg_catalog.pg_event_trigger x WHERE x.oid=f.objid)
         ELSE false END
       AND (f.objsubid=0 OR (f.class_name='pg_class' AND EXISTS (
         SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=f.objid
           AND a.attnum=f.objsubid AND NOT a.attisdropped))) AS object_present
FROM pg_catalog.jsonb_to_recordset($1::pg_catalog.jsonb -> 'frontier')
AS f(class_name pg_catalog.text,objid pg_catalog.oid,objsubid pg_catalog.int4,depth pg_catalog.int4)
ORDER BY f.class_name,f.objid,f.objsubid LIMIT 1001;
```

### M16 — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: P0 approved frontier object addresses with depth labels; procedure below controls closure.

Expected columns: seed_classid,seed_objid,seed_subid,depth,direction,classid,objid,objsubid,refclassid,refobjid,refobjsubid,deptype,at_depth_limit.

Both directions, exact subobjects or all columns when seed subid=0. One hop ONLY; operator manages visited set and depth <=16, cumulative <=512 addresses. Boundary edges are returned with at_depth_limit, not silently discarded. Query output is not itself a closure certificate.

```sql
WITH frontier AS (
 SELECT cls.oid AS classid,f.objid,f.objsubid,f.depth
 FROM pg_catalog.jsonb_to_recordset($1::pg_catalog.jsonb -> 'frontier')
 AS f(class_name pg_catalog.text,objid pg_catalog.oid,objsubid pg_catalog.int4,depth pg_catalog.int4)
 JOIN pg_catalog.pg_class cls ON cls.relname=f.class_name
   AND cls.relnamespace='pg_catalog'::pg_catalog.regnamespace
), edges AS (
 SELECT f.classid AS seed_classid,f.objid AS seed_objid,f.objsubid AS seed_subid,f.depth,
        'outgoing'::pg_catalog.text AS direction,d.classid,d.objid,d.objsubid,
        d.refclassid,d.refobjid,d.refobjsubid,d.deptype
 FROM frontier f JOIN pg_catalog.pg_depend d ON d.classid=f.classid AND d.objid=f.objid
   AND (f.objsubid=0 OR d.objsubid=f.objsubid)
 UNION ALL
 SELECT f.classid,f.objid,f.objsubid,f.depth,'incoming'::pg_catalog.text,
        d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype
 FROM frontier f JOIN pg_catalog.pg_depend d ON d.refclassid=f.classid AND d.refobjid=f.objid
   AND (f.objsubid=0 OR d.refobjsubid=f.objsubid)
)
SELECT DISTINCT seed_classid,seed_objid,seed_subid,depth,direction,
       classid,objid,objsubid,refclassid,refobjid,refobjsubid,deptype,
       depth=16 AS at_depth_limit
FROM edges
ORDER BY seed_classid,seed_objid,seed_subid,depth,direction,classid,objid,objsubid,
         refclassid,refobjid,refobjsubid,deptype LIMIT 1001;
```

### M16-SHARED — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: Same approved frontier; scoped current database or shared-object dependencies.

Expected columns: dbid,classid,objid,objsubid,refclassid,refobjid,deptype.

Inspect ownership/ACL shared edges without reading credential catalogs. Resolve role IDs through pg_roles only (Q2/Q3). No project-wide reverse-role fanout is silently queried; unapproved reverse/shared object traversal remains unresolved.

```sql
WITH frontier AS (
 SELECT cls.oid AS classid,f.objid,f.objsubid
 FROM pg_catalog.jsonb_to_recordset($1::pg_catalog.jsonb -> 'frontier')
 AS f(class_name pg_catalog.text,objid pg_catalog.oid,objsubid pg_catalog.int4,depth pg_catalog.int4)
 JOIN pg_catalog.pg_class cls ON cls.relname=f.class_name
   AND cls.relnamespace='pg_catalog'::pg_catalog.regnamespace
)
SELECT DISTINCT d.dbid,d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.deptype
FROM pg_catalog.pg_shdepend d
JOIN frontier f ON d.classid=f.classid AND d.objid=f.objid
  AND (f.objsubid=0 OR d.objsubid=f.objsubid)
WHERE d.dbid=0 OR d.dbid=(SELECT db.oid FROM pg_catalog.pg_database db
              WHERE db.datname=pg_catalog.current_database())
ORDER BY d.dbid,d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.deptype LIMIT 1001;
```

### M16-UNRESOLVED — NOT EXECUTED — FUTURE APPROVAL REQUIRED

Dependencies/parameters: All approved function OIDs, including trigger/helper functions discovered through closure.

Expected columns: function_oid,pronamespace,prolang,lanname,disposition.

Every function requires an approved reviewed-definition/dynamic-dependency manifest receipt. No body, expression or source digest computed here. No invented boolean says its dynamic SQL/webhooks/network effects are safe; unmatched receipt -> DEPENDENCY_UNRESOLVED/STOP.

```sql
SELECT p.oid AS function_oid,p.pronamespace,p.prolang,l.lanname,
       'REQUIRES_APPROVED_DEFINITION_AND_DYNAMIC_DEPENDENCY_MANIFEST'::pg_catalog.text AS disposition
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_language l ON l.oid=p.prolang
WHERE p.oid IN (SELECT v::pg_catalog.oid FROM
  pg_catalog.jsonb_array_elements_text($1::pg_catalog.jsonb -> 'function_oids') AS s(v))
ORDER BY p.oid LIMIT 1001;
```

## 5. Coverage, interpretation and bounded closure

1. Q1-CATALOGS: every expected catalog/view must be present/readable, no unexpected RLS or altered visibility assumption. Trusted managed PostgreSQL/system catalog definitions and operator provenance are prerequisites, not demonstrated tamper resistance. An ordinary SELECT grant alone cannot prove an adversarial owner has not replaced a view. Permission errors -> INACCESSIBLE/UNKNOWN, not no rows. A missing required catalog/version feature -> BLOCKED, never a version-specific broader retry.
2. Q2 missing role plus Q12 NOT_FOUND become MISSING only when exact approved seed, complete unfiltered catalog visibility, valid resolved types, schema visibility interpretation and non-truncated snapshot are evidenced. Otherwise INACCESSIBLE/UNKNOWN. TYPE_UNRESOLVED is never MISSING. CATALOG_PRESENT with no schema USAGE is present-but-inaccessible to that role, not absent. Existing required M2 drift stops; proposed future objects may be recorded MISSING without requiring them to exist. Discovery is not M4.8 authority acceptance.
3. Do not derive effective privilege by adding ACL rows or assuming owner/superuser denial from revoked ACL. Q5/Q8/Q9/Q10 report current object rights separately from schema USAGE, RLS, owner/BYPASSRLS and effective SET-reachable roles. Q3 exposes membership edges; ADMIN is not transitive administration; superuser/CREATEROLE potential remains separate risk. No role switching or capability test is executed. Missing role/function cannot yield a deny PASS.
4. Every result set: sentinel LIMIT 1001; at most 1000 usable rows. A 1001st row, incomplete/oversized output or timeout means TRUNCATED/BLOCKED; do not retain first 1000 as complete. Conservative export ceiling 1 MiB/query and 16 KiB/row: oversized rows stop, never trim into accepted evidence. LIMIT does not bound sort/join/recursive work; statement/lock timeouts remain mandatory.
5. Coverage reconciliation: Q1-CATALOGS fixed list count must match; Q2 count must equal roles; Q5 one row per requested function OID for valid $2; Q8 one per schema; M16-FRONTIER one per input address, all object_present=true. Q9 every input relation must appear (unsupported kind flags remain NULL). Compare Q10 column identities with M15-COLUMNS, and Q4/Q4-ACL OIDs with Q12. ACL/evidence absence can be legitimate but cannot silently hide missing parent/unknown role. Keep explicit approved batch-to-total coverage ledger; no result-set multiplication masquerades as multiple objects.
6. Seed graph depth 0 from validated relations/functions and structural constraint/index/trigger/default/policy/type addresses. Maintain a reviewed visited set keyed (classid,objid,objsubid), lowest depth only. For each preapproved batch run P0 and M16-FRONTIER, then M16/M16-SHARED and applicable structural queries. Column subobject 0 covers all columns but does not erase dependency subids. Add opposite-endpoint addresses at parent depth+1 only after scope/class review; no automatic broadening.
7. Edges seen at depth 16 are returned, not discarded. If they introduce any unvisited endpoint, STOP DEPTH_LIMIT/BLOCKED; never queue depth 17. More than 512 cumulative addresses or 1000 usable rows -> STOP. Cycles close through visited addresses, not infinite walks. Q3's separate recursive CTE also caps depth at 16, deduplicates visit states, and depth_limited requires STOP. Shared-role ownership/ACL IDs are interpreted via approved Q2/Q3; reverse role fanout, other-database shared edges or unsupported catalog classes are not silently omitted as safe—record UNRESOLVED and stop before new scope.
8. M16-UNRESOLVED lists every inspected function regardless of language; match its exact identity/version to an independently approved reviewed-definition/side-effect manifest receipt. pg_depend does NOT prove all PL/pgSQL string-body/dynamic SQL, extension, webhook, check/default, RLS expression or trigger effects. No function body or expression is returned or executed here. A terminal dependency is closed only by an explicit prior approved manifest receipt covering exact object identity/version and boundary reason; record it in the coverage ledger. Do not blindly expand incoming core-type/function fanout, or label an object safe merely because its namespace is pg_catalog. Without that receipt, any unmatched helper/expression/predicate/extension dependency -> DEPENDENCY_UNRESOLVED/STOP, never an operator assertion of safety. Required definition parity is a separate explicit approval; no automatic new checksum acceptance.
9. Completion receipt distinguishes complete bounded METADATA_BASELINE from dependency-unresolved/inaccessible/truncated BLOCKED and actual security mismatch FAIL. Existing service_role EXECUTE is a baseline observation, not future authority approval. No query result proves locks/deadlock freedom, deletion behavior, financial accounting, provider capability or deployed least privilege.

## 6. Evidence sanitization and cleanup

Export only the exact metadata columns above into an approved protected evidence location. Record approval ID, query ID, repository/query/parameter-manifest checksums, PostgreSQL version/encoding, expected/actual counts, sanitized SQLSTATE, classification/reviewer and cleanup receipt. Escape metadata names as inert JSON/text (including controls/newlines); never execute/render them as HTML/commands. No passwords, connection strings, token/role secrets, raw parameter dumps, customer/provider records, function bodies, default/CHECK/predicate/policy/WHEN expressions, trigger args, comments, full proconfig or SQL activity/client-address exports. No credential catalog or large-object content access. Defaults/ACL metadata is not permission to inspect its values.

On any error, missing visibility, truncation, unresolved dependency, target/TLS/identity discrepancy or timeout: STOP. No automatic elevation, SQL/transport retry, role/grant/credential modification, broader query or alternate target. Do not print raw database errors; retain SQLSTATE and fixed check ID only. In a failed transaction, do not continue SELECTs. Roll back and close the approved client/session; do not terminate unrelated sessions or modify the pooler. Session read-only remains on; no unsafe reset to writable mode.

### CONTROL-CLOSE — NOT EXECUTED

```sql
ROLLBACK;
```

After future approved execution, record transaction rollback/connection closure and absence of intentionally created fixtures/DDL/grants; this worksheet creates none. Any required independent cleanup inspection needs approved read-only scope. If the connection is lost, record cleanup UNKNOWN and let the authorized operator verify transaction/session closure; never retry automatically or claim a rollback observation that was not made.

Remaining risks: PostgreSQL syntax/catalog/privilege behavior has not been runtime-verified; managed permissions, catalog snapshots/cache/concurrent DDL and pooler identity remain unverified. B10 adds no SQL parser/runtime certification, harness, schema change or live safety claim. Static tests cover query structure, IDs, bounds and forbidden operations only. Human review and a separate exact S1 execution approval are required before any connection or SQL.
