import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Documentation coverage only: no SQL execution, runtime dispatch or external access.
const contract = readFileSync('docs/research-provider-admission-contract.md', 'utf8');
const migration = readFileSync('supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql', 'utf8');
function includes(...requirements: string[]): void {
  for (const requirement of requirements) assert.ok(contract.includes(requirement), `Missing admission requirement: ${requirement}`);
}
function section(start: string, end: string): string {
  const from = contract.indexOf(start), to = contract.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return contract.slice(from, to);
}

test('admission specification remains offline and cannot establish deployed guarantees', () => {
  includes('PROPOSED, OFFLINE ONLY', 'not PostgreSQL runtime guarantees', 'HTTP 503',
    'activationBlocked=true', 'executionAuthorized=false', 'automaticRetryAllowed=false',
    'requiresAuthoritativeDatabaseValidation=true', 'No admission RPC, migration, worker or provider integration is implemented');
  assert.doesNotMatch(contract, /CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|TABLE)\b/i);
});

test('admission identity binds account reservation and distinct local and external identities', () => {
  includes('accounting_subject_id', 'active Auth mapping', 'request_id', 'reservation_id',
    'credit-operation/account generation', 'local attempt_id', 'Database request identity, local attempt identity and external provider identity are distinct',
    'deleted/missing mappings deny new admission', 'Retained evidence must not depend on Auth cascade deletion',
    'operation_id identifies one admission operation');
});

test('intent encoding is versioned domain separated strict and cross-language unverified', () => {
  includes('dispatch-canonical-v1', 'submission-intent-v1', 'dispatch-operation-v1', 'SHA-256',
    'UTF-8 byte length', 'sorted by ASCII key bytes', 'duplicate/unknown keys', 'lone surrogates',
    'Do not use JSON.stringify or jsonb::text', 'compare canonical semantic fields AND digest',
    'Unsupported versions reject', 'TypeScript/PostgreSQL golden vectors', 'Cross-language encoding is currently UNVERIFIED');
});

test('immutable payload includes provider and economics pins but excludes mutable ownership and secrets', () => {
  includes('exact immutable provider body', 'actor/build or model/routing pin', 'pricing version/snapshot',
    'Exclude secrets, authorization headers, credentials', 'claim_epoch, lease timestamps, operation_id',
    'Changes to any included field require a new reviewed intent', 'Retain protected payload separately');
});

test('generation is distinct from fencing and economic retries never allocate permission', () => {
  includes('(request_id, provider, dispatch_generation)', 'claim_epoch only for monotonic ownership fencing',
    'Generations above 1 remain BLOCKED', 'reserve, not retry permission',
    'Never increment generation because a lease expired', 'New admission starts unclaimed with claim_epoch 0');
});

test('atomic admission requires authenticated authority revocation eligibility and budget evidence', () => {
  const transaction = section('## 3.', '### Lock graph');
  for (const requirement of ['verified connection identity', 'recheck revocation even on replay',
    'No shared service_role fallback', 'authority registry gate', 'accounting-subject/mapping gates',
    'live account eligibility', 'Match original request fingerprint and reservation', 'held budget',
    'verified pricing', 'no unresolved outcome', 'exactly one local attempt',
    'stale expected epoch/revision rejects', 'same transaction', 'Commit durable admission before']) {
    assert.ok(transaction.includes(requirement), requirement);
  }
});

test('admission replay cannot duplicate attempts allocation audit effects or ownership', () => {
  includes('Two-level replay', 'no new attempt, audit event, credit debit, budget allocation or send opportunity',
    'OPERATION_CONFLICT', 'INTENT_CONFLICT', 'operation receipt only',
    'Authority checks precede all replay handling', 'without restoring old ownership',
    'receipt lost after commit is recovered by replay');
});

test('unresolved authority locks and implicit locks explicitly block implementation', () => {
  includes('placement UNKNOWN/BLOCKED', 'R(request advisory) → J(job)', 'implicit FK, unique-index, trigger',
    'Quiesce and drain', 'Staging concurrency, revocation, replay and deletion tests are REQUIRED',
    'Static documentation does not establish deadlock freedom');
});

test('arm and crash boundaries forbid resend after lost replies expiry or paused senders', () => {
  includes('Admission persists intent; claim acquires', 'arm durably consumes', 'Exact arm replay never grants a second send',
    'SQL cannot guarantee a paused sender will never issue an HTTP request',
    'Arm committed, reply lost or crash before send', 'Acceptance unknown',
    'No reassignment/resend', 'Timeout is never proof of rejection', 'no automatic retry');
});

test('reconciliation and provider binding cannot replace identities or settle unknown charges', () => {
  includes('first-write or identical replay only', 'Null never clears a stored ID',
    'cross-request/attempt/provider binding', 'separately authenticated Reconciler',
    'Missing external ID after uncertain submission remains unresolved',
    'conflicting second events reject', 'separately approved authoritative procedure',
    'execution reconciliation neither settles money nor authorizes retry');
});

test('all six actual M2 lifecycle entry points have explicit bypass prevention requirements', () => {
  const signatures = [
    'reserve_research_job(uuid,uuid,text,integer,integer,text,text,text,text)',
    'begin_research_provider_attempt(uuid,uuid,uuid,text,text,integer,text)',
    'finish_research_provider_attempt(uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,text)',
    'mark_research_job_ambiguous(uuid,uuid,text)',
    'complete_research_job(uuid,uuid,uuid,uuid,text,jsonb,integer,timestamptz,text,jsonb,text,timestamptz)',
    'fail_research_job(uuid,uuid,text)'
  ];
  for (const signature of signatures) {
    includes(signature);
    const name = signature.slice(0, signature.indexOf('('));
    assert.ok(migration.includes(`FUNCTION public.${name}(`), `Missing actual M2 definition: ${name}`);
  }
  includes('service_role EXECUTE', 'atomically', 'no callable legacy service_role path',
    'overloads, helpers, grants/default privileges', 'no manufactured durable intent', 'Existing M2 SQL is unchanged');
});

test('first finish identity replacement risk covers both branches nulls and replay', () => {
  includes('COALESCE(p_provider_attempt_id, provider_attempt_id)', 'allowing replacement',
    'BEFORE either branch mutates', 'null→A, A→A, A→B, A→null and null→null',
    'BOTH normal and overrun branches', 'finished exact replay is effect-free');
});

test('Apify admission binds versioned input but never assumes live idempotency', () => {
  const apify = section('### Apify', '### OpenRouter');
  for (const requirement of ['yumitori/etsy-listings-scraper', 'build/version remains UNVERIFIED',
    'includeInDemand', 'includeDemand', 'Demand enrichment disabled', 'run ID first-write',
    'acceptance_unknown', 'no guaranteed provider idempotency', 'not live-wire certified']) {
    assert.ok(apify.includes(requirement), requirement);
  }
});

test('OpenRouter intent cannot precede validated Apify data or imply retry safety', () => {
  const openrouter = section('### OpenRouter', '## 7.');
  for (const requirement of ['google/gemini-3.1-flash-lite', 'ONLY AFTER validated Apify output exists',
    'projection digest/listing IDs', 'no-fallback routing', 'separate from external completion response ID',
    'missing response ID/usage', 'does not permit another paid completion', 'No invented idempotency header']) {
    assert.ok(openrouter.includes(requirement), requirement);
  }
});

test('financial exposure retains actual code bounds and independent unknown liabilities', () => {
  includes('120000 microUSD per credit ($0.12)', '33280 tokens', 'output cap 2048', 'maximum 108 listings',
    'Integer microUSD arithmetic must reject overflow', 'Unverified pricing', 'unknown, never zero',
    'independently authenticated Billing authority', 'No duplicate ledger effects',
    'No financial closure, liability release', 'independently of execution phase',
    'Synthetic evidence cannot be promoted');
});

test('legacy statuses and separate acceptance gates remain explicit', () => {
  includes('reserved, apify_running, apify_complete, apify_failed, openrouter_running, openrouter_complete, openrouter_failed, ambiguous, succeeded, failed, rejected',
    'Baseline read-only discovery is NOT post-cutover authority acceptance',
    'CRITICAL', 'HIGH', 'separate approval', 'Static tests establish documentation coverage only');
});
