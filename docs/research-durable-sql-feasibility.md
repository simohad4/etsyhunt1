# M4.8 B6 — Durable SQL feasibility decision

Decision: BLOCKED FOR SQL AUTHORING. Offline decision record and static tests only. No executable migration was created. Workspace C:\Users\lenovo\Downloads\etsyhunt1-git; branch feature/etsy-m1-m15-security; reviewed HEAD 89f73871cd89a14ec7928a2a23db94ec187934e7. Existing unrelated working-tree changes are outside this deliverable.

activationBlocked=true; executionAuthorized=false; automaticRetryAllowed=false; requiresAuthoritativeDatabaseValidation=true. Authenticated HTTP 503, active pricing/caps, M2 SQL, runtime modules and M3.6 allowlists/parity remain unchanged. No SQL execution, database/network/provider access, credentials inspection or deployment is authorized. Static tests establish coverage only, not transactional safety or deployed parity.

## 1. Mandatory feasibility gate

RESOLVED means established from repository evidence, not deployed verification. PROPOSED means a design exists but still needs explicit review/approval. BLOCKED means required evidence or a precise implementable contract is missing. A safety-critical gate must be RESOLVED before migration authoring; either PROPOSED or BLOCKED forbids executable SQL. Approval of a documentation task does not approve its proposed architecture.

| Gate | Status | Repository facts and decision | Evidence needed before authoring |
| --- | --- | --- | --- |
| F01 guard/subject schema and deletion | BLOCKED | B1 section 2C proposes retained subject/removable Auth mapping; B5 sections 2–3 propose AU0/AU/AS/MP guards, but guard DDL, provisioning, detached request scope and full Auth-cascade transfer are unresolved. Mapping removal alone is not account deletion. | Approved exact guard/registry/retained-scope schema, FK actions, provisioning/tombstone/maintenance procedure and privacy/retention policy. Do not invent an absent guard or retained scope. |
| F02 global lock graph | PROPOSED | B5 proposes AU0→AU→AS→MP→R→J→S→P→A→I→D→G→U→LG→LA→WG→WA→B→O→C→E, refining B1/B3 unresolved gate placement; it explicitly is not an approved replacement. Current M2 order differs. | Approve one reconciled schema-specific graph and every participating writer/implicit dependency; otherwise BLOCKED for implementation. No assertion of deadlock freedom. |
| F03 authority authentication/grants | BLOCKED | A5 proposes distinct LOGIN/capability roles and verified session_user; actual login/registry provisioning, role OID lifecycle and Supavisor session identity/reset/revocation are UNVERIFIED. B5 leaves reservation, finishing/publication, cancellation and maintenance replacement authority/signatures unresolved. | Exact typed replacement allow/deny manifest, registry/owner/default grants, revocation serialization and verified connection-path trust boundary. current_user in SECURITY DEFINER and caller worker IDs cannot authenticate a workload. |
| F04 atomic legacy cutover | PROPOSED | A8/B5 require no runtime direct callers for all six old external signatures, atomic hardening/revocation and quiescence. Existing SQL still grants service_role EXECUTE. | Approved complete replacement/private-helper signatures, effective grants/dependency manifest, caller/transaction draining and atomic rollback/disablement plan. No mixed unsafe old/new mutation window. |
| F05 immutable intent/provider identity | PROPOSED | B3 specifies atomic attempt+intent+dispatch admission; B4 implements offline encoding only. M4.7 is synthetic. M2 first finish permits ID replacement before finished replay protections apply. | Approve durable generation-1 admission, row/constraint/replay/fencing contracts, validated source reconstruction and first-write external ID checks before BOTH finish branches. B4 local binding and hashes prove neither DB ownership nor provider acceptance. |
| F06 holds/billing/retention | BLOCKED | B1/B5 preserve independent financial holds and retained accounting evidence; actual billing authentication/coverage, late-liability allocation, deletion and retention authority remain incomplete. M2 settled<=reserved cannot store late excess charges directly. | Approved attempt-attributable evidence/baseline/dedup rules, atomic global/account liability accounting and retained-scope access. Missing charges UNKNOWN, never zero. Financial closure/liability release and historical purge remain denied. |
| F07 PostgreSQL canonical compatibility | BLOCKED | B4 provides 13 fixed independently generated Python vectors and TypeScript checks, not a PostgreSQL encoder/certification. The B4 arm hash is not complete RPC arguments or authority. | Approve exact typed RPC/schema contracts and an independently reviewed PostgreSQL byte/digest and rejection-vector certification plan. No JSON.stringify/jsonb::text equivalence or Unicode normalization. SQL/PG validation needs separate authorization; do not waive this gate to write a migration now. |
| F08 staging-only validation | PROPOSED | A6/A8 separates Gate 1 baseline discovery from Gate 2 post-cutover acceptance; B5 defines 12 races. No identity/concurrency acceptance evidence is established by those static tests. | Approved staged validation plan: exact identities/target/TLS, independently authorized fixture provisioning, barriers/reverse arrival orders, lock waits/rollback/cleanup, revocation/pool reuse and cutover denial. Read-only discovery cannot stand in for acceptance. |

Machine-readable decision inventory below is documentation data, NOT an execution configuration:

```json
{
  "version": "durable-sql-feasibility-v1",
  "reviewedHead": "89f73871cd89a14ec7928a2a23db94ec187934e7",
  "decision": "BLOCKED_FOR_SQL_AUTHORING",
  "sqlAuthoringAllowed": false,
  "migrationCreated": false,
  "gates": [
    {"id":"F01","status":"BLOCKED","topic":"guard_subject_deletion"},
    {"id":"F02","status":"PROPOSED","topic":"global_explicit_implicit_locks"},
    {"id":"F03","status":"BLOCKED","topic":"authenticated_authority_grants"},
    {"id":"F04","status":"PROPOSED","topic":"atomic_legacy_cutover"},
    {"id":"F05","status":"PROPOSED","topic":"immutable_intent_provider_identity"},
    {"id":"F06","status":"BLOCKED","topic":"financial_holds_billing_retention"},
    {"id":"F07","status":"BLOCKED","topic":"postgresql_canonical_certification"},
    {"id":"F08","status":"PROPOSED","topic":"staging_only_validation"}
  ],
  "activationBlocked": true,
  "executionAuthorized": false,
  "automaticRetryAllowed": false,
  "requiresAuthoritativeDatabaseValidation": true
}
```

RESOLVED repository facts: the six committed signatures/grants, explicit row/advisory locks and first-finish expressions are inspectable; local M4.7/B4 outputs stay synthetic and execution-disabled; M3.6 implements isolated static/preflight/run modes. These facts do not resolve any complete migration gate above. No deployment authority or missing policy is inferred from them.

## 2. Existing SQL surface and lock inventory

M2 source: supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql. Existing protected tables: research_provider_pricing, research_budget_windows, research_budget_liabilities, research_jobs, research_budget_reservations, research_provider_attempts and research_results; credit operations/accounts originate in M1 and are extended by M2. M2 430–600 establishes composite scope FKs, reservation settled_micro_usd<=reserved_micro_usd, attempt (request_id,provider,retry_number) uniqueness, non-null external provider ID uniqueness, one active attempt/request and unique result/request. None implements the proposed authority registry, retained guards or durable dispatch intent.

All six functions are SECURITY DEFINER/search_path=pg_catalog, owner postgres, service_role EXECUTE; PUBLIC/anon/authenticated EXECUTE is revoked (M2 2178–2230). Seven research tables use RLS with authenticated own-row SELECT only on jobs/results and privileged direct mutations revoked (607–637). RLS/direct table denial does not remove callable definer bypass.

| Exact committed signature | Observed order / safety gap | Required future boundary |
| --- | --- | --- |
| reserve_research_job(uuid,uuid,text,integer,integer,text,text,text,text) | 709 request advisory R; 717 job J; 757 subscription S; 782 pricing SHARE P; 846–949 G/U→LG/LA→WG/WA→credit C, then inserts. Missing row is not locked. | Authenticated reservation contract, retained scope and immutable protocol version; existing replay is not provider admission. |
| begin_research_provider_attempt(uuid,uuid,uuid,text,text,integer,text) | 1109 R→1117 J→1134 attempt A→1242 reservation B; inserts started attempt. No durable intent/claim/fence. | Atomic attempt+intent+dispatch admission; one attempt/generation; replay never grants send; generation>1 stays blocked. |
| finish_research_provider_attempt(uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,text) | 1358 R→1367 A→1396 J→1411 B; overrun later G/U→LG/LA→WG/WA. COALESCE(p_provider_attempt_id, provider_attempt_id) at 1522/1563 permits first-finish replacement. | Immutable provider binding BEFORE normal and overrun mutation. Test null→A, A→A, A→B, A→null, null→null plus finished replay and changed-operation conflicts. |
| mark_research_job_ambiguous(uuid,uuid,text) | 1632 R→1640 J→credit operation O→B via updates; coarse ambiguous replay. | Authenticated hold/evidence and durable latch, no financial release. |
| complete_research_job(uuid,uuid,uuid,uuid,text,jsonb,integer,timestamptz,text,jsonb,text,timestamptz) | 1727 R→1735 J→1791 Apify A→1807 OpenRouter A→1827 B→1853/1863 windows; result/history/credit updates. Reported-or-estimated settlement is not billing finality. | Approved publication/settlement authority and independently retained liabilities; no estimate-only closure. |
| fail_research_job(uuid,uuid,text) | 1976 R→1984 J→2015 O→2036 B→2061/2071 windows→2083 C; generation-bound refund. | No refund/retry on unknown acceptance or unknown financial liability; independently approved failure contract. |

Known inversions: J→A versus A→J, B→financial guards versus guards before B, O→B versus later O updates, fixed provider attempt order versus proposed sorted UUID. Same-request advisory R mitigates some schedules, not global deadlock proof. Different requests/accounts share financial rows. B5's authority/subject guards are only proposed; do not pretend the existing SQL already follows them.

Implicit paths needing resolution: FK key-share checks, cascading Auth deletion, unique-index waits, trigger/default/check-function dependencies, result/history inserts, subscription/credit resets, signup/backfill, saved quota locks, owner/default grants and effective overload/helper privileges. M1 legacy consume/reserve/finalize and independent financial/admin writers must be inventoried and denied or aligned atomically. pg_depend alone cannot enumerate dynamic SQL/string-body calls. This is a known-path inventory with explicit UNKNOWN edges, NOT a complete deployed implicit-lock graph. Missing/inaccessible dependency evidence remains BLOCKED, never assumed side-effect-free.

## 3. M3.6 cannot certify the future authority model

tests/research-staging.integration.mjs retains exact staging direct/Session Pooler allowlists, production rejection, verify-full trusted CA/hostname checks, isolated environment/timeouts and default-denied --run. Session-level read-only initialization precedes preflight SQL. --static has no network; --preflight is read-only; --run requires separate staging-specific authorization and is NOT executed here.

Current session probe expects postgres and preflight expects all six service_role grants, while proposed M4.8 acceptance must deny old runtime signatures and authenticate distinct principals. Existing parity pins cover current reviewed functions/triggers, not approved future bodies. Do not widen allowlists, weaken parity, auto-accept new hashes or reinterpret M3.6 PASS as M4.8 authority PASS. Future harness changes require separate review and approval.

## 4. Decision dependencies and staging plan

First obtain offline approval of exact guard/retained-subject topology, detached billing scope and immutable pricing/authority schemas. Then reconcile B1/B3/B5 into a single approved lock/implicit-dependency graph and complete typed replacement/capability manifest. Review atomic cutover and all six denials together, not wrapper-by-wrapper beside callable legacy functions. Keep financial closure/purge unavailable, unverified pricing blocked and cap $0.12/credit unchanged.

PostgreSQL certification has an explicit sequencing blocker: existing contracts require it before implementation, but there is no approved standalone SQL certification artifact or permission to execute SQL. A separately scoped decision must approve a non-migration certification design and later isolated validation; this task cannot silently relax the prerequisite or invent a successful PostgreSQL test. Certification must compare exact bytes and SHA-256 digests, as well as rejection/version/Unicode/numeric cases. Independent TypeScript/Python vector agreement is insufficient.

Future staging work requires separate approval: Gate 1 bounded metadata discovery records current grants and missing/UNKNOWN proposed objects; Gate 2 needs implemented approved controls and actual provisioned principals. Independent-session tests must cover B5 C01–C12, both arrival orders, shared global/account budgets, revocation before replay, prepared/pool-reused callers, pre/post-arm crashes, first-finish conflicts, mapping deletion, late billing and cleanup. No provider/HTTP calls in fixtures; rollback cannot undo external side effects. Baseline metadata and finite schedules do not prove runtime deadlock freedom or exactly-once external execution.

CRITICAL blockers: F01/F02 exact guards/deletion/implicit locks; F03/F04 authenticated authority and atomic legacy denial; F05 durable one-way admission and immutable identity; F06 independent liabilities/evidence/retention. HIGH blockers: F07 PostgreSQL certification, F08 approved runtime validation, actor/build/wire evidence and verified billing/pricing. Approval of SQL authoring, staging access, fixtures/concurrency and paid activation are separate decisions. No automatic retries or paid dispatch is enabled by resolving a documentation issue.

## 5. Offline verification boundary

The new static tests check eight decisions, all six actual signatures/grants, explicit no-authoring gates, unknown dependencies, current harness safeguards and the unchanged five-file migration inventory. The inventory test deliberately fails on added/removed migration entries until separately reviewed; it neither parses PostgreSQL nor proves body immutability/deployed absence. Existing lifecycle/parity tests continue to cover reviewed SQL bodies. No migration file or executable SQL function is added to this deliverable. The only runner change is one import.
