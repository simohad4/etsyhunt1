# M4.1 offline research execution architecture

This is a pure planning layer, not an executor or an activated research service. Neither API handler, M3.5 RPC implementation, pricing configuration nor database migration is changed. Authenticated analysis remains HTTP 503. This task makes no Supabase/provider calls and does not re-run the reported M3.6 staging integration.

## Interfaces and meaning

`src/server/researchExecutionPlan.ts` exports:

- `planResearchExecution(unknown)`: a frozen descriptive plan from a reservation JSON response, a projected job-status snapshot, an unknown transport outcome, or a sanitized database-error category.
- `describeResearchTransition(unknown)`: a frozen assessment of a proposed M2 job transition (`candidate`, `duplicate`, `blocked`). It does not apply state, dispatch a command, parse an attempt response as a job response, or grant permission.
- All 11 M2 job statuses and typed plan/transition contracts.

Every output has literal `executionAuthorized: false`, `automaticRetryAllowed: false`, and `requiresAuthoritativeDatabaseValidation: true`. No callback/client, HTTP API, database SDK, environment variable, clock, timer, random generator or credential is accepted or used. The only runtime dependency is the existing pure reservation-response parser. Input is JSON-like data; accessors and non-plain objects are rejected. Malformed observations produce a fixed reconciliation plan without echoing data/error details.

These functions are stateless and advisory. They do not establish authenticated ownership, freshness, serializability, a persistent unknown-outcome latch or durable execution ownership. A future coordinator must persist those separately. A later stale snapshot must never clear an unresolved transport/provider outcome. Candidate/duplicate labels cannot substitute for admission or reconciliation. No future executor should interpret these outputs as executable commands.

## Original M2 contract review

Source of truth: `supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql`. All six functions are SECURITY DEFINER with pinned search_path, service-role-only execution and request/user binding. The planner deliberately does not reproduce their transaction, locking, pricing or accounting implementation.

| RPC and parameters | Authoritative effect and future boundary |
| --- | --- |
| `reserve_research_job(request_id, user_id, keyword, pages, maximum_listings, request_fingerprint, pricing_version, apify_actor, openrouter_model)` | Exact idempotent request binding; locked subscription/credit period, verified current pricing, bounded worst-case costs, global/account budgets and liabilities. New requests reserve or reject; existing requests return their current job status. A reservation is **not** provider admission. |
| `begin_research_provider_attempt(attempt_id, request_id, user_id, provider, provider_identifier, retry_number, provider_attempt_id=NULL)` | Fresh attempt admission checks ownership, exact provider identity, legal stage/retry, one active attempt and cumulative budget. New response is attempt `started` and job becomes `apify_running` or `openrouter_running`. Duplicate attempt replies can be returned after the job has advanced; they do not permit re-dispatch. |
| `finish_research_provider_attempt(attempt_id, request_id, user_id, status, provider_version=NULL, error_category=NULL, input_tokens=NULL, output_tokens=NULL, billing_units=NULL, reported_cost_micro_usd=NULL, provider_attempt_id=NULL)` | Binds provider outcome/usage to the exact attempt. Success advances to the corresponding `*_complete`; definitive failure to `*_failed`; ambiguity/cost overrun holds the job as `ambiguous`. Its status is an **attempt status**, not a job status. Immutable duplicate outcome handling must be preserved. |
| `mark_research_job_ambiguous(request_id, user_id, failure_category)` | Nonterminal job/credit ambiguity and budget hold, without credit refund. No terminal rewrite; duplicate ambiguity is not permission to resume. |
| `complete_research_job(request_id, user_id, apify_attempt_id, openrouter_attempt_id, observed_schema_version, observed_payload, observed_record_count, source_collected_at, modeled_schema_version, modeled_payload, prompt_version, modeled_generated_at)` | Requires `openrouter_complete`, both exact successful attempts, bounded records, valid evidence timestamps/provenance and budgets. Atomically publishes result/history, settles budget and commits reserved credit. Completion replay must match the original data exactly. |
| `fail_research_job(request_id, user_id, failure_category)` | Definitive failure only: refuses ambiguity, incompatible terminal states and active attempts. Settles actual bookkeeping; refunds at most once and only into the matching original credit generation/period. A later generation is not granted a refund. |

The application parameter names use the database `p_` prefixes. Types/defaults remain defined by the unchanged migration. None of these functions is called by M4.1.

## Planning states

| Database status / observation | Planning classification and next review |
| --- | --- |
| New `reserved` response (`idempotent=false`) | New reservation; review future Apify attempt admission. Execution stays disabled. |
| Existing `reserved` response or snapshot | Inspect existing job and attempts; never automatically start or retry. |
| `apify_running`, `openrouter_running` | Processing; reconcile the in-flight attempt. Do not issue another provider call or infer it failed from a timeout. |
| `apify_complete` | Stage complete; review separate OpenRouter attempt admission with fresh authoritative checks. |
| `openrouter_complete` | Stage complete; review completion evidence and exact attempt provenance, not another provider call. |
| `apify_failed`, `openrouter_failed` | Intermediate stage failure; review definitive finalization or an explicitly authorized retry. Not terminal `failed`. |
| `succeeded`, `failed`, `rejected` | Terminal; no automatic next work, provider retry, refund or outcome rewrite. |
| `ambiguous` | Audited reconciliation; no automatic retry, publication, refund or progression. |
| Unknown transport outcome | Preserve only diagnostic last-known status, require reconciliation by original request/attempt identity. No assumption of reservation failure and no re-reservation. |
| Database error | Block and inspect authoritative state; no raw database details are propagated. |
| Invalid/unknown response | Fail closed to reconciliation; never guess a missing state or grant work. |

The shared reservation parser recognizes all M2 job statuses, including `apify_failed`/`openrouter_failed`, and classifies both intermediate failures as `stage_failed`. M4.1 parses the original response directly, without substituting another status. M2 reservation replays use `success=true` for every status except terminal `failed`/`rejected`, including intermediate failure and ambiguity. Finish/mark RPC responses have different flags and are not accepted as reservation envelopes. Replays require M2's positive reserved-credit and nonnegative budget fields. Present numeric fields must be safe nonnegative integers; null, undefined, fractional, negative and unsafe values are rejected, as are unknown response fields. Existing fresh reservation/rejection required-field rules remain intact, and M4.1 additionally keeps credit counts bounded to 1–3.

The intermediate-failure parser interoperability gap is repaired and covered across shared parsing, pure RPC interpretation and M4.1 planning. A `stage_failed` decision grants no retry or provider execution permission. Pricing and every other activation prerequisite below remain blocking boundaries; no route or executor is activated by this repair.

## Candidate transitions and duplicates

Fresh reservation → `reserved`/`rejected`; admitted Apify attempt → `apify_running`; admitted OpenRouter attempt after Apify success → `openrouter_running`; finish → corresponding complete/failed stage or ambiguity; completed evidence → `succeeded`; definitive settlement → `failed`. The transition descriptor covers these six RPC boundaries but cannot validate payloads or the underlying database state. Retry candidates from `*_failed` require retry number 2, a definitive matching failed attempt, provider eligibility and a new database admission; they are never automatic.

Replays describe no-change snapshots only. Begin/finish duplicate replies may coexist with a later terminal job state, so they cannot be used to reconstruct or rewind that state. Every proposed progression out of `ambiguous` is blocked, even a replay proposal. Terminal changes and invalid/unknown events are blocked. Fail candidates from running states are conservatively blocked pending inspection; the DB additionally checks for actual active attempts. This descriptor is a conservative planning subset, not a replacement for SQL guards or a provider response reducer.

## Activation prerequisites and integration boundaries

Before any separately reviewed activation:

1. Keep authentication and authoritative request/user/fingerprint binding outside the planner. Reuse bounded request preparation; preserve exact idempotency keys and M3.5 ambiguous-outcome handling.
2. Verify official provider prices, identifiers, provenance, effective/expiry dates and retry assumptions through a separate approved pricing process. Current checked-in pricing remains unverified/blocked. No rates are introduced here.
3. Revalidate subscriptions, original credit generation/period, durable liabilities, global/account caps, reservation and cumulative retry budgets in authoritative database transactions.
4. Obtain a **fresh** `begin_research_provider_attempt` admission and a durable exclusive execution claim before a provider adapter can dispatch. A reservation, duplicate begin response, planner output or caller-supplied `verified` flag is insufficient. Exactly-once external execution is not supplied by these SQL functions or this plan layer.
5. Implement bounded adapters and durable provider idempotency/reconciliation records separately. Network failures must preserve uncertainty; never automatically retry an ambiguous reservation, dispatch, finish, completion or refund. A timeout is not a definitive failure.
6. Finish through exact attempt identity, truthful observed/modeled provenance and authoritative cost handling. Only the database may settle, publish or refund. Cost overruns remain held for audited reconciliation.
7. Design a persistent coordinator/worker lifecycle, cancellation/crash recovery, concurrency and explicit retry authorization. An approved staging rollback test is useful evidence but does not verify paid-provider behavior or permit production activation.
8. Review and test any future route wiring separately. Neither the Next handler nor Express handler imports this planner; both retain their authenticated HTTP 503 behavior.

## Offline verification

The tests are included by the existing research service test, without changing package scripts/dependencies. They cover all statuses, new/existing/terminal distinctions, malformed/inconsistent responses, protected unknown outcomes, duplicate events, a six-boundary discovery-to-publication journey, and exhaustive fresh/replay transition matrices. They verify frozen deterministic output, unchanged input, no execution dependencies and no authorization flags that can become true.

Run `node tests/run-tsx.cjs --test tests/research-execution-plan.test.ts`, `npx tsc --noEmit`, `npm test`, and the existing M3.6 `--static` check. No live integration or provider execution is part of this verification.
