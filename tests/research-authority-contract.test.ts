import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Offline documentation checks only; no runtime modules, clients or environment access.
const contract = readFileSync('docs/research-authority-contract.md', 'utf8');
function includes(...requirements: string[]): void {
  for (const requirement of requirements) assert.ok(contract.includes(requirement), `Missing authority contract: ${requirement}`);
}
function between(start: string, end: string): string {
  const from = contract.indexOf(start), to = contract.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return contract.slice(from, to);
}

test('authority contract is offline and explicitly does not verify deployment or enable execution', () => {
  includes('PROPOSED, OFFLINE ONLY', 'All deployment-dependent guarantees are UNVERIFIED',
    'activationBlocked=true', 'executionAuthorized=false', 'automaticRetryAllowed=false',
    'HTTP 503', 'not PostgreSQL runtime guarantees');
  assert.doesNotMatch(contract, /CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|TABLE)\s+(?:public\.)?research_/i);
});

test('primary model requires isolated LOGIN identities and verified session pooling support', () => {
  includes('distinct PostgreSQL LOGIN principals', 'dedicated NOLOGIN capability role',
    'Supavisor session mode', 'CONDITIONAL on staging verification', 'No cross-authority membership',
    'session_user preservation or pool reset behavior: UNVERIFIED',
    'Do not expand the existing staging harness allowlist');
});

test('identity is derived from authenticated connection and never caller assertions or definer current_user', () => {
  includes('current_user is unsuitable inside SECURITY DEFINER', 'session_user',
    'switching postgres into dispatcher is not Dispatcher authentication',
    'Never trust arbitrary session variables or p_worker_id/p_authority_id',
    'database login identifies the credential holder, not a particular process/container',
    'Customer tokens, research.view and caller-supplied worker IDs do not establish');
});

test('unknown inactive revoked identities and replay after revocation fail closed', () => {
  includes('UNKNOWN_PRINCIPAL', 'INACTIVE_PRINCIPAL', 'REVOKED_PRINCIPAL',
    'including exact idempotent replay and source-event duplicate receipts',
    'Replay after revocation is REVOKED_PRINCIPAL', 'not a cached success',
    'No prior operation receipt substitutes for current authority', 'HOLD/DENY');
});

test('membership restrictions prevent forbidden switching and require protected registry revocation', () => {
  includes('INHERIT TRUE and SET FALSE', 'ADMIN FALSE', 'NOINHERIT alone is not sufficient',
    'No membership in postgres, service_role, authenticator',
    'forbidden role switching must fail', 'Runtime principals cannot insert, activate, rebind, revoke or delete',
    'Role recreation under a retired login name is prohibited');
});

test('matrix explicitly denies cross-authority capabilities financial closure and purge', () => {
  const matrix = between('| Operation |', 'Planned RPC mapping:');
  for (const row of [
    '| Provider attempt admission | F | D | D | D | D |',
    '| Claim | P | D | D | D | D |', '| Renew | P | D | D | D | D |',
    '| Arm | P | D | D | D | D |', '| External identity binding | P | D | D | D | D |',
    '| Uncertain acceptance hold | P | D | D | D | D |',
    '| Execution reconciliation | D | P | D | D | D |',
    '| Billing evidence ingestion | D | D | P | D | D |', '| Billing correction | D | D | P | D | D |',
    '| Financial closure/liability release | D | D | D | D | D |',
    '| Historical evidence purge | D | D | D | D | D |'
  ]) assert.ok(matrix.includes(row), `Missing capability row: ${row}`);
  includes('P=proposed narrow permission, UNAVAILABLE now', 'F=future contract missing, DENIED',
    'Migration operator is administrative DDL authority', 'No automatic financial release');
});

test('all six exact M2 signatures are covered and shared service-role bypass must close atomically', () => {
  const legacy = between('## 5.', '## 6.');
  const signatures = [
    'reserve_research_job(uuid,uuid,text,integer,integer,text,text,text,text)',
    'begin_research_provider_attempt(uuid,uuid,uuid,text,text,integer,text)',
    'finish_research_provider_attempt(uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,text)',
    'mark_research_job_ambiguous(uuid,uuid,text)',
    'complete_research_job(uuid,uuid,uuid,uuid,text,jsonb,integer,timestamptz,text,jsonb,text,timestamptz)',
    'fail_research_job(uuid,uuid,text)'
  ];
  for (const signature of signatures) assert.ok(legacy.includes(signature), signature);
  includes('EXECUTE is granted to service_role', 'ONE future migration transaction',
    'No callable legacy bypass', 'overloads/default arguments', 'PUBLIC/default privileges',
    'drain/terminate relevant in-flight transactions BEFORE cutover',
    'CREATE OR REPLACE alone does not clear existing grants', 'no protocol upgrade or paid admission');
});

test('provider identity immutable first finish and uncertain outcomes prevent settlement bypass', () => {
  includes('BEFORE both normal and cost-overrun updates', 'M2 1563 and 1522',
    'External binding is first-write or identical replay only',
    'deny completion around unresolved dispatch', 'no refunds when provider acceptance remains uncertain',
    'No second sender is authorized', 'missing charges are UNKNOWN, never zero',
    'no claim of exactly-once external provider execution');
});

test('rotation does not masquerade as immediate revocation or reverse an armed submission', () => {
  includes('password rotation or NOLOGIN is not proof that existing pooled sessions have stopped',
    'Ordinary PostgreSQL logins can change their own password', 'terminate/drain relevant client and backend sessions',
    'Operations already admitted/in flight need quiescence/draining',
    'Do not hold locks across HTTP', 'Revocation cannot undo provider acceptance or charges');
});

test('broker fallback requires separately authenticated workloads and restricted fixed operations', () => {
  const broker = between('## 6.', '## 7.');
  for (const requirement of ['separately authenticated Dispatcher/Reconciler/Billing workloads',
    'dedicated restricted database principal', 'fixed operation allowlist', 'No arbitrary SQL/RPC forwarding',
    'No fallback to unrestricted shared service_role', 'session_user identifies the broker, NOT the upstream workload',
    'broker-specific contract', 'Broker must not possess execution-provider credentials',
    'no financial closure/purge operation']) assert.ok(broker.includes(requirement), requirement);
});

test('future metadata privilege and concurrency checks are separately gated and unexecuted', () => {
  includes('Future staging verification checklist — NOT EXECUTED',
    'A. Read-only metadata inspection — separate explicit approval',
    'B. Isolated identity/privilege tests — separate explicit approval',
    'C. Multi-session concurrency and revocation — separate explicit approval',
    'Independent sessions with explicit barriers', 'revocation before replay',
    'Runtime deadlock freedom', 'static tests cannot establish them');
});
