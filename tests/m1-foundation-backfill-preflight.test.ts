import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const migrationsDirectory = path.resolve(process.cwd(), 'supabase/migrations');
const foundationName = '20261010_etsyhunter_m1_foundation.sql';
const securityName = '20261011160000_etsyhunter_m1_p1b_security.sql';
const backfillName = '20261011170000_etsyhunter_m1_existing_users_backfill.sql';

const foundation = fs.readFileSync(path.join(migrationsDirectory, foundationName), 'utf8');
const security = fs.readFileSync(path.join(migrationsDirectory, securityName), 'utf8');
const backfill = fs.readFileSync(path.join(migrationsDirectory, backfillName), 'utf8');

test('migration filenames enforce foundation, P1-B, then backfill ordering', () => {
  assert.ok(foundationName < securityName);
  assert.ok(securityName < backfillName);
});

test('foundation creates all seven tables before defining dependent triggers', () => {
  const expectedTables = [
    'user_profiles',
    'subscriptions',
    'research_credit_accounts',
    'research_credit_ledger',
    'saved_listings',
    'research_history',
    'research_cache'
  ];

  for (const table of expectedTables) {
    assert.match(foundation, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
    assert.match(foundation, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  }

  assert.match(foundation, /AFTER INSERT ON auth\.users[\s\S]*?EXECUTE FUNCTION public\.handle_new_user_signup\(\)/);
});

test('foundation uses core schema-qualified UUID generation without uuid-ossp', () => {
  assert.equal(
    foundation.match(/DEFAULT pg_catalog\.gen_random_uuid\(\)/g)?.length,
    6
  );
  assert.doesNotMatch(foundation, /uuid_generate_v4|uuid-ossp/i);
});

test('P1-B closes privileged browser writes before backfill execution', () => {
  assert.match(
    security,
    /REVOKE ALL ON FUNCTION public\.consume_research_credits\(TEXT, INTEGER, INTEGER\)[\s\S]*?FROM PUBLIC, anon, authenticated, service_role;/
  );
  assert.match(
    security,
    /REVOKE ALL PRIVILEGES ON TABLE public\.subscriptions FROM PUBLIC, anon, authenticated;/
  );
  assert.match(
    security,
    /REVOKE ALL PRIVILEGES ON TABLE public\.research_credit_accounts FROM PUBLIC, anon, authenticated;/
  );
});

test('backfill fails closed for Auth users incompatible with the email profile schema', () => {
  assert.match(backfill, /auth_user\.email IS NULL/);
  assert.match(backfill, /pg_catalog\.btrim\(auth_user\.email\) = ''/);
  assert.match(backfill, /RAISE EXCEPTION[\s\S]*?requires every auth user to have a non-empty email/);
});

test('backfill inserts only the three missing initialization rows', () => {
  const insertTargets = Array.from(
    backfill.matchAll(/INSERT INTO public\.([a-z_]+)/g),
    (match) => match[1]
  );

  assert.deepEqual(insertTargets, [
    'user_profiles',
    'subscriptions',
    'research_credit_accounts'
  ]);
  assert.equal(backfill.match(/ON CONFLICT \((?:id|user_id)\) DO NOTHING;/g)?.length, 3);
  assert.doesNotMatch(backfill, /\bUPDATE\s+public\.|\bDELETE\s+FROM\s+public\.|\bTRUNCATE\b/i);
});

test('backfilled users receive no plan and no research credits', () => {
  assert.match(
    backfill,
    /INSERT INTO public\.subscriptions[\s\S]*?'none',[\s\S]*?'inactive'[\s\S]*?ON CONFLICT \(user_id\) DO NOTHING;/
  );
  assert.match(
    backfill,
    /INSERT INTO public\.research_credit_accounts[\s\S]*?SELECT[\s\S]*?auth_user\.id,[\s\S]*?0,[\s\S]*?0,[\s\S]*?50[\s\S]*?ON CONFLICT \(user_id\) DO NOTHING;/
  );
  assert.doesNotMatch(backfill, /'starter'|'pro'|'agency'|'active'/);
});

test('backfill is sourced only from auth.users and grants no new privileges', () => {
  assert.equal(backfill.match(/FROM auth\.users AS auth_user/g)?.length, 4);
  assert.doesNotMatch(backfill, /\bGRANT\b|SECURITY DEFINER|CREATE POLICY/i);
});
