# M3.6 research staging integration

Infrastructure only. No staging connection or writing scenario has been executed for this change. Production behavior is unchanged; authenticated `/api/analyze-etsy` remains HTTP 503. M3.5 (`8e50807`) remains intact.

## Modes

`node tests/research-staging.integration.mjs --static`

Offline: reads local M2 SQL, the preflight/scenario scripts, server fail-closed behavior and pricing activation boundary. Checks all six RPC signatures, scenario presence, negative-test failure sentinels, absence of rate-card mutations and rollback/cleanup structure. Does not read credentials, resolve DNS, spawn psql, connect, execute migrations or invoke providers. Static checks do not prove SQL execution correctness.

`--preflight` is a future **read-only network operation**. It uses `BEGIN READ ONLY` plus a read-only session default, reads catalog/privilege metadata, already-applied migration version, TLS status and pricing flags. It never invokes research RPCs or reads customer research payloads, creates fixtures, changes credits or writes database rows. It fails if M2 is absent; it never installs it.

`--run` is default-denied and requires the separate exact M3.6 confirmation below. It first runs the same read-only preflight, then one explicit read-write transaction. Synthetic random Auth users and their trigger-created rows, subscriptions, historical credit/job/budget snapshots, attempts and results all remain in that transaction. No Auth HTTP API or external fixture is needed. Normal completion ends in `ROLLBACK`, then a separate read-only transaction verifies fixture absence and an unchanged pricing checksum before emitting a success marker. Failure, interruption, timeout or uncertain connection outcome never emits cleanup success and never automatically retries. PostgreSQL rolls back open transactions when its connection closes; after abnormal termination, an operator must separately verify absence before retrying. No compensating deletes of existing records are attempted.

## Target and secret controls

- Exactly two host/user pairs are accepted, both on port `5432`, database `postgres`: direct `db.iwqnyqaefovhvnunarfa.supabase.co` / `postgres`; or confirmed IPv4-compatible Session Pooler `aws-0-eu-west-1.pooler.supabase.com` / `postgres.iwqnyqaefovhvnunarfa`. Omitted port defaults to `5432`. Host and username must match as a pair. Exact staging project confirmation remains mandatory. Production `fdvnojlojtfiwhtchgdk`, arbitrary poolers, alternate regions/instances, IPs, mismatched usernames/databases, port `6543` and suffix attacks are rejected.
- URI must end with exactly `?sslmode=verify-full`. Duplicate/extra options, fragments, hostaddr/service overrides, missing passwords and control characters are rejected. TLS requires either an existing trusted CA file or the explicit `system` trust option, plus hostname validation for the selected host. No IP pinning, downgrade or automatic fallback is allowed.
- No dotenv loading or credential changes. The harness consumes only an already-provisioned staging DB URL and explicit certificate configuration. No service-role JWT is required. The database login must be independently approved for staging and able to assume test roles.
- Child environment is allowlisted. Inherited libpq service, hostaddr, options, TLS overrides, provider tokens and Supabase keys are excluded. Password goes only through the child environment, never command arguments. Local OS administrators/process inspection remain outside this boundary.
- `psql -X --no-psqlrc --no-password`, no shell interpolation, stdin SQL, connection/statement/lock/idle/wall-clock timeouts. Raw child output and errors are suppressed; only fixed status messages and exact success markers are used. Do not enable shell tracing or dump environment variables.

## CA configuration: file or system

`ETSYHUNTER_M36_SSLROOTCERT` accepts an existing trusted CA file path or the exact literal `system`. For `system`, the harness skips only the local `statSync(...).isFile()` check and forwards `PGSSLROOTCERT=system` to psql. It still forces `PGSSLMODE=verify-full`, retains the original hostname, and runs every target, authorization, session and SQL guard. Missing/blank/non-string/control-character settings fail locally. Other values remain file paths and must identify an existing file; they are not trimmed or converted into the special value. Local file validation does not establish CA contents or trust.

System trust requires a compatible PostgreSQL 17 libpq/psql build and a configured trusted certificate store that validates the selected direct/pooler hostname. [PostgreSQL 17 documents `sslrootcert=system`](https://www.postgresql.org/docs/17/libpq-connect.html#LIBPQ-CONNECT-SSLROOTCERT) as using the SSL implementation's trusted roots; the actual store is platform/build dependent, so this does not assert that every Windows build uses the Windows certificate store. Client capability, trust-store availability and the remote certificate chain remain unverified offline. An unsupported client or untrusted certificate must fail closed; no automatic fallback or TLS downgrade is provided.

## Session Pooler compatibility

Supabase's [pool-mode specification](https://supabase.github.io/supavisor/configuration/pool_modes/) assigns a backend for the lifetime of a client in session mode. Its [hosted connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres) recommends the Session Pooler on port `5432` for IPv4-only networks. This matches the harness's single persistent psql connection: psql `\gset` values stay client-local; session `set_config(..., false)` survives transaction rollback; `SET LOCAL ROLE` and transaction-local JWT settings are reverted by rollback. Cleanup verification remains in that same session after the write transaction rolls back. Transaction pooling is not compatible and is never accepted.

Before either remote mode's existing SQL, a read-only compatibility probe checks stable backend PID and a session marker across transaction boundaries, the read-only session default, service_role/authenticated role switching, and restoration of postgres after rollback. ON_ERROR_STOP prevents reaching fixture creation if any check fails. This probe sets only ephemeral session/transaction state; it creates no database rows or objects and calls no research RPCs. RPC, RLS, pricing, accounting and session checks remain intact. Startup-parameter forwarding, session-user mapping, CA trust and actual backend affinity are not live-verified by this task. If the confirmed pooler rejects the fixed PGOPTIONS or any probe/assertion, fail closed: no retry through another endpoint, weaker TLS, role substitution or skipped assertion.

## TLS boundary: client versus backend

Through a pooler there are two connections: psql → pooler and pooler → PostgreSQL. `pg_stat_ssl` describes the PostgreSQL backend connection, not the client's connection to the pooler. A false backend value is not proof that client TLS failed; a true value is not proof of the client's CA/hostname verification. The live diagnostics reporting this mismatch were supplied by the user, not obtained during this task.

Before sending **any SQL**, the CLI requests `\conninfo` from the same psql process and waits for its completion marker. It requires a TLS 1.2/1.3 connection line and the exact allowlisted database/user/hostname/port, along with the isolated libpq environment's mandatory `PGSSLMODE=verify-full`, explicit CA setting and disabled GSS encryption. [PostgreSQL documents verify-full](https://www.postgresql.org/docs/17/libpq-ssl.html) as verifying both the certificate chain and requested hostname; conninfo proves encryption only, while the enforced libpq policy provides CA/hostname verification. CA file existence is still checked before spawn (or the exact `system` option is forwarded). The C locale is forced for strict conninfo parsing. Unrecognized/missing evidence, insecure configuration, process errors, interruption or timeout fail closed without sending SQL. Raw conninfo output is retained briefly in bounded process memory and never logged.

After the client gate succeeds, SQL receives fixed coordination markers indicating verified client TLS and either `direct` or `session_pooler`. Both preflight and transactional fixture guards reject missing/unknown markers. Direct connections additionally retain the existing backend `pg_stat_ssl` assertion. Only the exact approved Session Pooler path does not require backend `pg_stat_ssl=true`, because it describes the other leg. These SQL markers are **not independent cryptographic proof** and can be forged by an arbitrary SQL caller; execute through the CLI only. The approved managed pooler's internal transport security remains an infrastructure boundary: this harness neither proves backend TLS for that path nor changes Supabase SSL enforcement. No blanket TLS bypass flag or live database setting is introduced.

Client trust, actual conninfo formatting/streaming for the installed psql build, and success through the pooler remain live-unverified. A different/localized format fails closed. No second connection, reconnect, downgraded TLS or weakened SQL assertions are used to recover.

Session initialization does not rely on PGOPTIONS being forwarded. Before any probe query or transaction, the harness explicitly executes `SET SESSION default_transaction_read_only = on` and establishes the existing statement/lock/idle timeout values with session-level SETs. The first read-only transaction checks both `default_transaction_read_only=on` and `transaction_read_only=on` before role checks; both are checked again after rollback. ON_ERROR_STOP stops execution if a SET or assertion fails. These session settings are outside a transaction so probe rollback does not undo them. PGOPTIONS remains defense in depth.

Effect on `--run`: the same read-only initialization protects its mandatory preflight phase. The separately confirmed integration script still explicitly opens exactly one `BEGIN READ WRITE` transaction; it does not turn the session default off. Its existing rollback, subsequent read-only cleanup verification and success conditions remain unchanged. No write transaction or live probe was executed to verify this change; only offline structural regression tests were run. The reported pooler startup-option behavior is user-provided evidence, not a live observation from this task.

## Future commands — NOT executed in this task

First obtain separate authorization for the read-only connection. An operator must securely provision `SUPABASE_STAGING_DB_URL` and `ETSYHUNTER_M36_SSLROOTCERT` in the process environment without placing passwords in shell history. Do not edit `.env` or existing credentials to run this harness. The URL/certificate must already satisfy the controls above; `psql` must be installed on PATH.

For the Session Pooler, the pre-provisioned URI must have this shape (placeholder only; never paste a real password into a logged command): `postgresql://postgres.iwqnyqaefovhvnunarfa:<percent-encoded-password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=verify-full`. The selected trusted CA file or system roots must validate that pooler hostname. Require outbound IPv4 access to that hostname/port, a compatible libpq/psql, and staging postgres credentials with the existing read-only catalog access and role-switch permissions. Already-applied M2, blocked pricing, ACL and TLS assertions must all pass. No service-role JWT or run confirmation is needed for preflight. None of these live prerequisites has been checked during this offline change.

Read-only preflight (PowerShell):

```powershell
$env:ETSYHUNTER_M36_STAGING_PROJECT_REF = 'iwqnyqaefovhvnunarfa'
node tests/research-staging.integration.mjs --preflight
```

Only after separately authorizing transactional staging writes, with a reviewed maintenance window and no conflicting staging activity:

```powershell
$env:ETSYHUNTER_M36_STAGING_PROJECT_REF = 'iwqnyqaefovhvnunarfa'
$env:ETSYHUNTER_M36_STAGING_RUN_CONFIRM = 'iwqnyqaefovhvnunarfa:M36-TRANSACTION-ROLLBACK'
try {
  node tests/research-staging.integration.mjs --run
} finally {
  Remove-Item Env:ETSYHUNTER_M36_STAGING_RUN_CONFIRM -ErrorAction SilentlyContinue
}
```

Do not execute the SQL file independently: staging identity/confirmation, certificate verification, timeout and output controls belong to the CLI. No command applies a migration or changes provider pricing.

## Coverage and deliberate boundary

## Pre-write safety review: definition parity

The earlier read-only preflight passing is **not sufficient for write authorization**. It checked signatures, definer/owner/search_path, privileges, RLS flags and pricing, but did not compare function bodies, discover extra triggers or inspect executable schema dependencies. A changed signup trigger could invoke HTTP even if all ordinary writes later roll back. No live trigger/body parity was verified during this task.

Both remote modes now run a generated **read-only catalog parity gate before the existing table-reading preflight**, and therefore before the integration write transaction. It never executes the functions it inspects. Expected application bodies are extracted from the local M1 foundation, M1 P1-B and M2 migration files, pinned by SHA-256. Unexpected source changes (including line endings), missing definitions, body drift, argument/default/return/ownership/language/security/search_path drift fail closed. Body comparison preserves string literals and comments, normalizing only CRLF and outer whitespace. No migration is executed. Errors expose fixed labels, never source bodies or customer rows.

The gate inspects **all** triggers on the watched tables, including disabled triggers. Exactly two application triggers are permitted with exact function bindings, event/timing/row flags, enabled state, no arguments/WHEN/transition tables or deferral. Missing or extra triggers—including webhook hooks—fail. Internal triggers must be PostgreSQL FK constraint triggers; this is not a generic internal-trigger waiver. Views, foreign tables, partitions/inheritance, rewrite rules and identity/sequence defaults fail closed. Defaults, generated expressions, checks, indexes and policies are inspected for function/operator/type/opclass dependencies: only a small core builtin expression-function allowlist and the reviewed `auth.uid()` are permitted; extension/user code and sequence dependencies fail. This conservative inventory can reject legitimate but unreviewed hosted schema variations. Investigate and review those variations; never disable the gate to make a run pass.

`auth.uid()` is also reachable through authenticated RLS reads. It is restricted to the SQL/stable, non-definer expression from [Supabase Auth migration 20220224000811](https://github.com/supabase/auth/blob/master/migrations/20220224000811_update_auth_functions.up.sql), reading the two JWT settings and casting to UUID. Only inter-token whitespace/optional trailing semicolon may vary; quoted setting names are exact. Unknown helpers or changed implementations require a separate review. No provider/network call is allowed by that expression.

### Reachable inventory

| Table | Entry path and effects |
| --- | --- |
| `auth.users` | Two synthetic direct INSERTs; invokes `on_auth_user_created` → `public.handle_new_user_signup()` and applicable builtin FK constraints. This is SQL, not the Auth API: no Auth API email flow is requested. Unknown live hooks are rejected. |
| `public.user_profiles` | Signup function INSERT only. Its existing BEFORE UPDATE row trigger `set_user_profile_updated_at` → `public.touch_user_profile_updated_at()` is checked conservatively, although this suite does not update profiles. |
| `public.subscriptions` | Signup INSERT; fixture UPDATE to the synthetic period; reservation reads/locks. |
| `public.research_credit_accounts` | Signup INSERT at zero; synthetic balance/period setup; reservation/refund reads and UPDATEs. |
| `public.research_credit_operations` | Historical fixture INSERT; reserve/replay reads; lifecycle status/refund UPDATEs. |
| `public.research_credit_ledger` | Historical deduction INSERTs; fail/refund INSERT; no real customer credit grant. |
| `public.research_jobs` | Historical fixture INSERT; reservation and lifecycle reads/UPDATEs; deliberate synthetic budget test UPDATE; own/cross-user RLS SELECT. |
| `public.research_budget_windows` | Two isolated historical fixture INSERTs; lifecycle reservation/settlement UPDATEs; negative cap UPDATE inside a subtransaction. No active global window is intentionally edited. |
| `public.research_budget_liabilities` | Reachable INSERT/UPDATE in reservation/overrun RPC branches, even though normal blocked-admission/no-overrun scenarios should not enter them; included in the gate. |
| `public.research_budget_reservations` | Historical INSERTs; settlement/held status UPDATEs. |
| `public.research_provider_attempts` | Begin INSERT and finish UPDATE via SQL bookkeeping RPCs only. No actual provider requests. |
| `public.research_results` | Completion INSERT; own/cross-user RLS SELECT. |
| `public.research_history` | Completion INSERT and count assertions. |
| `public.research_provider_pricing` | Read-only blocked-price checks and checksum; never written. |

All six called lifecycle RPC bodies are checked: `reserve_research_job`, `begin_research_provider_attempt`, `finish_research_provider_attempt`, `mark_research_job_ambiguous`, `complete_research_job`, `fail_research_job`. The other application/managed functions are `handle_new_user_signup`, `touch_user_profile_updated_at`, and `auth.uid`. No saved-listing quota function, legacy credit RPC, M1.5 admin RPC/audit trigger or Auth HTTP endpoint is intentionally called. Inbound FK triggers on `auth.users` may refer to managed Auth/admin tables; their builtin DELETE/key-UPDATE actions are not reached by these INSERT-only Auth fixtures. No DELETE cleanup is performed.

The reviewed bodies use core SQL expressions and builtins: `split_part`, `coalesce`, `nullif`, `greatest`, `btrim`, `ceil`, `char_length`, `count`, `sum`, `jsonb_build_object`, `jsonb_typeof`, `now`, `timezone`, `gen_random_uuid`, `hashtextextended`, `pg_advisory_xact_lock`, and `current_setting`. The harness additionally uses session `set_config`, `unnest`, JSON conversion/aggregation, `repeat`, `md5`, backend identity and read-only catalog/deparser/privilege helpers. Ordinary builtin FK, uniqueness, index and CHECK enforcement also runs. Anonymous DO blocks are harness assertions, not newly installed database functions. No DDL means event triggers are not intentionally fired. The trusted PostgreSQL catalog/binary implementation is an infrastructure boundary, not reconstructed by this audit.

### Transactions, side effects and readiness

The same psql connection first proves client TLS, initializes read-only session defaults, checks affinity/roles, runs catalog parity and the existing preflight. The separately confirmed script then opens one explicit read-write transaction. Synthetic fixtures, RPCs and their database effects remain inside it; success requires rollback and subsequent read-only absence/pricing verification. Negative scenarios use subtransactions and sentinels that cannot catch their own unexpected-success failure. Session GUC bookkeeping and random UUID generation are ephemeral; no sequences are intentionally consumed. Transaction advisory locks release on rollback.

Rollback does **not** undo outbound HTTP/dblink/file writes, sequence increments or effects performed outside PostgreSQL's transaction. It also does not erase normal server logs, audit/extension hook observations or all WAL records. Body/trigger/dependency gates reduce executable SQL drift; they do not certify the hosted server, installed hooks, replication/audit consumers or concurrent administrator activity. The gate does not freeze definitions: privileged DDL could race between the read-only check and a write. Require an independently controlled no-DDL maintenance window/exclusive staging coordination before considering execution. Do not treat this check as protection against a malicious database superuser.

**Current decision: not ready to authorize writes based on the old preflight pass.** Re-run the new read-only preflight only under separate read-only authorization, reconcile every parity mismatch without weakening checks, and confirm maintenance/external-side-effect controls. Actual SQL execution of this new gate, hosted trigger parity and rollback behavior remain unverified. This task neither connects nor authorizes the integration run.

Prepared transactional scenarios cover fresh reservation rejection under blocked pricing without accounting changes; exact reservation replay and changed-request rejection; backend-only execution; provider begin/finish state transitions using synthetic bookkeeping only; in-flight refund refusal; completion and replay; one refund only; ambiguity holding credits; attempt budget rejection and budget-window cap constraints; owner/cross-user job and result visibility; browser RPC denial; post-rollback absence of Auth/profile/subscription/credit/ledger/job/attempt/result/history/budget fixtures and unchanged pricing.

The stored synthetic costs are historical-state arithmetic fixtures, not provider rates or verified usage. The harness does not insert, verify, enable or change any price card, and does not call Apify/OpenRouter. Positive fresh reservation admission is intentionally **not** exercised: it requires verified pricing, prohibited in this phase. Global/account admission under active verified pricing, concurrent sessions/locking races, durable overrun reconciliation, credit-generation rollover and PostgREST/JWT cryptographic behavior require separately designed/authorized staging work; existing local lifecycle tests remain useful static coverage.

Without a live staging connection, installed schema parity, actual SQL/PLpgSQL execution, role switching, RLS results, signup triggers, TLS/certificate trust, privileges, lifecycle/accounting outcomes, interruption rollback and cleanup are **unverified**. No staging readiness claim is implied by offline success.

## Local verification

```powershell
node tests/research-staging.integration.mjs --static
npx tsc --noEmit
npm test
```

The new offline safety tests are imported by the existing research database lifecycle test so `npm test` includes them without changing package scripts or dependencies. They test target rejection, default-denied run consent, environment isolation, static contracts and a credential/network-denied static invocation. They never execute preflight/run modes or contact any database.
