# M4.3 offline research orchestration simulator

`simulateResearchOrchestration(observation, fixtures?)` is stateless and deterministic. It composes the M4.1 planner and M4.2 strict projection validators. It does not execute a workflow, advance a job, connect to a database, call providers, inspect credentials or enable research. The API route and pricing activation block remain unchanged.

## Observation and review contract

Pass an M4.1 observation (`reservation_response`, `job_snapshot`, `transport_unknown` or `database_error`). Every observation is revalidated by `planResearchExecution`; a caller-supplied plan or admission flag is not accepted as authority. The result copies the exact planner classification, databaseStatus, review and providerPrerequisites. Invalid observations retain the planner's `invalid_observation` and reconciliation boundary. The result and all nested output data are frozen.

| Validated planner observation | Advisory candidateNextStage | Boundary |
| --- | --- | --- |
| New reserved | apify | attempt_admission_review |
| Existing reserved, including replay | apify | inspect_existing_job_and_attempts |
| apify_complete | openrouter | attempt_admission_review |
| openrouter_complete | completion_review | completion_evidence_review |
| Running, intermediate failure, ambiguous, terminal, transport unknown, database error, invalid | none | Exact planner review boundary |

Candidates describe what a human or future authoritative system might review, **never an instruction to execute**. Existing reservations never restart a provider. A last-known completed status on a transport-unknown observation remains blocked. No job status proves attempt admission, ownership, available budget, completion evidence or payment. Every result fixes `executionAuthorized:false`, `automaticRetryAllowed:false` and `requiresAuthoritativeDatabaseValidation:true`.

## Optional fixtures

The fixture envelope is an application-owned simulator input, not a new provider wire schema:

```ts
{
  apify: { responseJson, request, collectedAt },
  openrouter?: { responseJson, generatedAt, maximumOutputTokens? }
}
```

Apify request and projection validation delegate to M4.2. The simulator derives OpenRouter context only from validated listing IDs and titles (including unavailable/null titles), then delegates model projection validation to M4.2. Model-only fixtures, unrelated references, unknown fields, callbacks and credential/client/transport fields are rejected. Empty listing results remain empty; a model fixture requiring a nonempty context then fails closed. Both wire contracts remain explicitly **unverified** against live providers. No mappings, rates or marketplace data are invented here.

Fixtures are atomic: any validation error discards both projections, sets `fixtureValidation:invalid` and suppresses the candidate to `none`, without changing the planner's classification or review. Raw errors, responses and request metadata are not echoed. Omitted fixtures are `not_supplied`; successful validation is `validated`, meaning structural checks only. Adapter byte, field, token and listing limits bound the retained data; no fixture history or unbounded event log is retained.

All fixtures carry the enclosing `fixtureTrust:synthetic_unverified`. Nested observed/reported or observed/unavailable fields and modeled interpretations preserve M4.2 provenance exactly; their labels describe the projection's assertion, not independently verified marketplace evidence. Never detach these fields from the synthetic trust boundary and publish them as live observations. Fixture timestamps are caller-supplied metadata. Valid fixtures may be attached to any observation for inspection but never change its status, candidate or review boundary; their relationship to a real job, owner or attempt is not established. Missing values stay unavailable and narratives are not synthesized.

Inputs are inert JSON-like records and bounded JSON projection strings, not a sandbox for hostile JavaScript Proxy objects. Ordinary accessors are rejected before reading their values. Structurally valid natural language may still contain false claims, prompt injection or sensitive information; callers must handle validated fixture content as untrusted, avoid logging it, and render it safely as text.

## Before any live integration

Separately verify actual actor/model input and response schemas, provenance, availability, pricing and usage semantics. Provider-reported tokens are distinct from estimates; future admission must reserve sufficient budget and reconcile actual usage and charges. Add authenticated owner/request binding, authoritative database attempt admission, durable exclusive claims, current credit/budget checks, lifecycle accounting, bounded transports, timeout handling and audited unknown-outcome reconciliation. Review completion evidence and nontransactional provider risks before enabling any executor. This simulator authorizes none of those operations and makes no live compatibility claim.

## Verification

The existing research-service test entry imports the simulator tests without package-script changes. Run `npx tsc --noEmit`, `npm test` and `node tests/research-staging.integration.mjs --static`. Live staging preflight and write-mode integration are outside this slice.
