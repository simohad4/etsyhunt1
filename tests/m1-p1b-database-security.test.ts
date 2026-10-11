import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20261011160000_etsyhunter_m1_p1b_security.sql'
);
const foundationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20261010_etsyhunter_m1_foundation.sql'
);
const migration = fs.readFileSync(migrationPath, 'utf8');
const foundation = fs.readFileSync(foundationPath, 'utf8');

function expectSql(pattern: RegExp, message: string) {
  assert.match(migration, pattern, message);
}

test('P1-B migration has a unique version ordered after the foundation', () => {
  assert.equal(path.basename(migrationPath), '20261011160000_etsyhunter_m1_p1b_security.sql');
  assert.ok(path.basename(migrationPath) > path.basename(foundationPath));
  assert.equal(
    fs.existsSync(
      path.resolve(
        process.cwd(),
        'supabase/migrations/20261010_etsyhunter_m1_p1b_security.sql'
      )
    ),
    false
  );
});

test('browser roles cannot mutate billing, credits, ledger, or successful history', () => {
  expectSql(
    /DROP POLICY IF EXISTS "Users can insert own research history" ON public\.research_history;/,
    'the browser research-history insert policy must be removed'
  );

  for (const table of [
    'subscriptions',
    'research_credit_accounts',
    'research_credit_ledger',
    'research_history'
  ]) {
    expectSql(
      new RegExp(
        `REVOKE ALL PRIVILEGES ON TABLE public\\.${table}[\\s\\S]*?FROM PUBLIC, anon, authenticated;`
      ),
      `${table} must revoke browser mutation privileges`
    );
  }

  expectSql(
    /REVOKE ALL ON FUNCTION public\.consume_research_credits\(TEXT, INTEGER, INTEGER\)[\s\S]*?FROM PUBLIC, anon, authenticated, service_role;/,
    'the legacy credit RPC must not remain callable through the API'
  );
  assert.doesNotMatch(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.consume_research_credits[\s\S]*?TO authenticated;/
  );
});

test('profile writes are limited to approved display fields', () => {
  expectSql(
    /DROP POLICY IF EXISTS "Users can insert own profile" ON public\.user_profiles;/,
    'profiles must be initialized by the signup trigger, not the browser'
  );
  expectSql(
    /GRANT UPDATE \(full_name, workspace_name\) ON public\.user_profiles TO authenticated;/,
    'only full_name and workspace_name may be updated by authenticated users'
  );
  assert.doesNotMatch(migration, /GRANT (?:ALL|UPDATE) ON TABLE public\.user_profiles TO authenticated;/);
});

test('saved-listing quota is subscription-derived and concurrency safe', () => {
  expectSql(/CREATE OR REPLACE FUNCTION public\.enforce_saved_listing_quota\(\)/, 'quota trigger function missing');
  expectSql(/SECURITY DEFINER\s+SET search_path = pg_catalog/, 'quota function must use a fixed safe search path');
  expectSql(/pg_advisory_xact_lock\([\s\S]*?NEW\.user_id/, 'same-user inserts must serialize');
  expectSql(/FROM public\.subscriptions AS s[\s\S]*?FOR UPDATE;/, 'the entitlement row must be locked');

  for (const [plan, limit] of [
    ['starter', 50],
    ['pro', 250],
    ['agency', 1000]
  ] as const) {
    expectSql(new RegExp(`s\\.plan_tier = '${plan}' THEN ${limit}`), `${plan} quota is incorrect`);
  }

  expectSql(/WHEN s\.status <> 'active' THEN 0/, 'inactive subscriptions must have no paid entitlement');
  expectSql(
    /s\.current_period_start IS NOT NULL[\s\S]*?s\.current_period_start > pg_catalog\.now\(\) THEN 0/,
    'future subscription periods must not grant an early entitlement'
  );
  expectSql(
    /CREATE TRIGGER enforce_saved_listing_quota_before_insert[\s\S]*?BEFORE INSERT ON public\.saved_listings/,
    'quota must be enforced inside PostgreSQL before insert'
  );
});

test('credit reservation is atomic and retries are idempotent', () => {
  expectSql(/request_id UUID PRIMARY KEY/, 'request IDs must be globally unique');
  expectSql(
    /CREATE UNIQUE INDEX IF NOT EXISTS research_credit_ledger_request_action_uidx/,
    'ledger writes require a request/action uniqueness guard'
  );
  expectSql(
    /CREATE UNIQUE INDEX IF NOT EXISTS research_history_request_uidx/,
    'successful history requires a request uniqueness guard'
  );

  const reserveStart = migration.indexOf('CREATE OR REPLACE FUNCTION public.reserve_research_credits');
  const finalizeStart = migration.indexOf('CREATE OR REPLACE FUNCTION public.finalize_research_credits');
  assert.ok(reserveStart >= 0 && finalizeStart > reserveStart);
  const reserveSql = migration.slice(reserveStart, finalizeStart);

  assert.match(reserveSql, /pg_advisory_xact_lock\([\s\S]*?p_request_id/);
  assert.match(reserveSql, /FROM public\.research_credit_operations[\s\S]*?FOR UPDATE;/);
  assert.match(reserveSql, /FROM public\.research_credit_accounts[\s\S]*?FOR UPDATE;/);
  assert.match(reserveSql, /'idempotent', true/);

  const balanceUpdate = reserveSql.indexOf('UPDATE public.research_credit_accounts');
  const existingReturn = reserveSql.indexOf("'idempotent', true");
  assert.ok(existingReturn >= 0 && existingReturn < balanceUpdate, 'retry must return before deduction');
});

test('only service_role can execute the new credit state machine', () => {
  for (const signature of [
    'reserve_research_credits\\(UUID, UUID, TEXT, INTEGER\\)',
    'finalize_research_credits\\(UUID, UUID, TEXT, INTEGER, TEXT\\)'
  ]) {
    expectSql(
      new RegExp(`REVOKE ALL ON FUNCTION public\\.${signature}[\\s\\S]*?FROM PUBLIC, anon, authenticated;`),
      `${signature} must be revoked from browser roles`
    );
    expectSql(
      new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${signature}[\\s\\S]*?TO service_role;`),
      `${signature} must be backend-only`
    );
  }
});

test('all SECURITY DEFINER functions use fixed safe search paths', () => {
  for (const functionName of [
    'enforce_saved_listing_quota',
    'reserve_research_credits',
    'finalize_research_credits'
  ]) {
    expectSql(
      new RegExp(
        `CREATE OR REPLACE FUNCTION public\\.${functionName}\\([\\s\\S]*?SECURITY DEFINER\\s+SET search_path = pg_catalog`
      ),
      `${functionName} must have a fixed pg_catalog search path`
    );
  }

  expectSql(/ALTER FUNCTION public\.handle_new_user_signup\(\) SET search_path = pg_catalog;/, 'signup trigger search path must be hardened');
  expectSql(
    /ALTER FUNCTION public\.consume_research_credits\(TEXT, INTEGER, INTEGER\)[\s\S]*?SET search_path = pg_catalog;/,
    'retired legacy function must retain a safe search path'
  );
});

test('commit alone creates history while failure refunds once and ambiguity holds', () => {
  const finalizeStart = migration.indexOf('CREATE OR REPLACE FUNCTION public.finalize_research_credits');
  const finalizeEnd = migration.indexOf(
    'REVOKE ALL ON FUNCTION public.finalize_research_credits',
    finalizeStart
  );
  const finalizeSql = migration.slice(finalizeStart, finalizeEnd);
  const commitStart = finalizeSql.indexOf("IF p_outcome = 'commit' THEN");
  const historyInsert = finalizeSql.indexOf('INSERT INTO public.research_history');
  const failureRefund = finalizeSql.indexOf("'Failed research reservation refund'");

  assert.ok(commitStart >= 0 && historyInsert > commitStart, 'history insert must be inside commit');
  assert.equal(finalizeSql.match(/INSERT INTO public\.research_history/g)?.length, 1);
  assert.ok(failureRefund > historyInsert, 'failure path must follow the commit-only return path');
  assert.match(finalizeSql, /v_operation\.status = 'failed'[\s\S]*?'idempotent', true/);
  assert.match(finalizeSql, /p_outcome = 'ambiguous'[\s\S]*?status = 'ambiguous'/);
  assert.match(
    finalizeSql,
    /p_outcome IS NULL OR p_outcome NOT IN \('commit', 'failure', 'ambiguous'\)/,
    'a NULL outcome must not fall through to the refund path'
  );
  assert.doesNotMatch(
    finalizeSql,
    /ON CONFLICT DO NOTHING/,
    'integrity conflicts must abort instead of marking an inconsistent operation terminal'
  );
});

test('existing over-quota records remain removable but all new inserts are blocked', () => {
  expectSql(/IF v_current_count >= v_limit THEN/, 'an at-limit or over-limit account must reject inserts');
  expectSql(/GRANT SELECT, DELETE ON TABLE public\.saved_listings TO authenticated;/, 'users must retain cleanup access');
  assert.doesNotMatch(migration, /DELETE FROM public\.saved_listings|TRUNCATE (?:TABLE )?public\.saved_listings/);
});

test('credit operation foreign keys preserve auth-user deletion cascades', () => {
  const requestReferences = migration.match(
    /REFERENCES public\.research_credit_operations\(request_id\) ON DELETE CASCADE/g
  );
  assert.equal(requestReferences?.length, 2);
});

test('foundation still initializes one inactive subscription and zero credits', () => {
  assert.match(foundation, /VALUES \(NEW\.id, 'none', 'inactive'\)/);
  assert.match(
    foundation,
    /VALUES \(NEW\.id, 0, 0, 50\)/,
    'new users must still receive zero credits and zero monthly allowance'
  );
  assert.match(foundation, /user_id UUID NOT NULL UNIQUE REFERENCES auth\.users/);
});
