import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import { mock } from 'node:test';
import { buildParityManifest, buildReadOnlyParitySql, readParitySources, PARITY_TABLES, PARITY_TRIGGERS, AUTH_UID_PATTERN } from './research-staging.parity.mjs';
import {
  STAGING_REF, PRODUCTION_REF, SESSION_POOLER_HOST, sessionCompatibilitySql, RUN_CONFIRMATION, parseStagingTarget,
  authorizeMode, assertRootCertificateAvailable, assertClientTlsEvidence, psqlEnvironment, runStaticChecks, main
} from './research-staging.integration.mjs';

const url = `postgresql://postgres:synthetic-password@db.${STAGING_REF}.supabase.co:5432/postgres?sslmode=verify-full`;
const poolerUrl = `postgresql://postgres.${STAGING_REF}:synthetic-password@${SESSION_POOLER_HOST}:5432/postgres?sslmode=verify-full`;
const env = {
  ETSYHUNTER_M36_STAGING_PROJECT_REF: STAGING_REF,
  SUPABASE_STAGING_DB_URL: url,
  ETSYHUNTER_M36_SSLROOTCERT: 'synthetic-existing-cert.pem'
};

test('M3.6 static contracts match all six M2 RPCs and rollback scenarios', () => {
  assert.deepEqual(runStaticChecks(), { rpcContracts: 6, negativeScenarios: 6 });
});

test('M3.6 parity inventory includes the complete signup and lifecycle write surface', () => {
  const manifest = buildParityManifest();
  assert.equal(manifest.functions.length, 8);
  assert.equal(new Set(manifest.functions.map(f => f.signature)).size, 8);
  assert.equal(manifest.tables.length, 14);
  assert.ok(PARITY_TABLES.includes('auth.users'));
  assert.ok(PARITY_TABLES.includes('public.research_budget_liabilities'));
  assert.equal(PARITY_TRIGGERS.length, 2);
  assert.deepEqual(PARITY_TRIGGERS.map(t => [t.name,t.type]), [['on_auth_user_created',5],['set_user_profile_updated_at',19]]);
  const signup = manifest.functions.find(f => f.signature === 'public.handle_new_user_signup()');
  assert.ok(signup.definer);
  for (const table of ['user_profiles','subscriptions','research_credit_accounts']) assert.ok(signup.body.includes('INSERT INTO public.' + table));
});
test('M3.6 parity source pins reject changed signup, RPC and trigger definitions offline', () => {
  const sources = readParitySources();
  for (const [name, sql] of Object.entries(sources)) {
    assert.throws(() => buildParityManifest({ ...sources, [name]: sql + '\n-- changed source' }), /Reviewed migration source drift/);
    assert.throws(() => buildParityManifest({ ...sources, [name]: sql.replace('BEGIN', "BEGIN\nPERFORM net.http_post('https://invalid.example');") }), /Reviewed migration source drift/);
  }
});
test('M3.6 live parity SQL compares bodies and security metadata without executing inspected functions', () => {
  const sql = buildReadOnlyParitySql();
  assert.match(sql, /BEGIN READ ONLY;/);
  assert.match(sql, /p\.prosrc/);
  assert.match(sql, /IS DISTINCT FROM item->>'body'/);
  for (const key of ['prosecdef','proowner','prolang','proconfig','provolatile','prosupport','proargnames','pronargdefaults','proisstrict','proleakproof']) assert.ok(sql.includes(key));
  assert.doesNotMatch(sql, /^\s*(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|CALL|COPY|COMMIT|PERFORM|EXECUTE)\b/im);
  assert.match(sql, /ROLLBACK;\s*$/);
});
test('M3.6 parity rejects missing, extra, disabled and structurally altered application triggers', () => {
  const sql = buildReadOnlyParitySql();
  assert.match(sql, /FROM pg_trigger WHERE tgrelid=ANY\(watched\)/);
  for (const key of ['tgfoid','tgtype','tgenabled','tgnargs','tgargs','tgqual','tgattr','tgdeferrable','tginitdeferred','tgoldtable','tgnewtable']) assert.ok(sql.includes(key));
  assert.match(sql, /RAISE EXCEPTION 'M36 expected trigger missing'/);
  assert.match(sql, /RAISE EXCEPTION 'M36 unexpected or changed application trigger'/);
  assert.match(sql, /n\.nspname='pg_catalog' AND c\.contype='f'/);
});
test('M3.6 parity rejects executable schema dependencies and nontransactional sequence defaults', () => {
  const sql = buildReadOnlyParitySql();
  for (const catalog of ['pg_rewrite','pg_inherits','pg_attrdef','pg_constraint','pg_index','pg_policy','pg_depend','pg_operator','pg_type','pg_opclass']) assert.ok(sql.includes(catalog));
  assert.match(sql, /rel\.relkind='S'/);
  assert.match(sql, /relkind='r' AND NOT relispartition/);
  assert.match(sql, /f\.proname NOT IN/);
  assert.doesNotMatch(sql, /'http_post'|'pg_notify'|'nextval'|'dblink_exec'/);
  assert.match(sql, /RAISE EXCEPTION 'M36 executable schema dependency requires review'/);
});
test('M3.6 Auth UID parity permits only the reviewed expression and rejects additional calls', () => {
  const expected = "select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid";
  const pattern = new RegExp(AUTH_UID_PATTERN);
  assert.match(expected, pattern);
  assert.match(expected.replaceAll('select ', 'select\n  '), pattern);
  for (const body of [expected + '; select net.http_post();', expected.replace('current_setting', 'other_setting'), expected.replace('claim.sub', 'claim. sub'), 'select public.custom_uid()']) {
    assert.doesNotMatch(body, pattern);
  }
});
test('M3.6 read-only parity is mandatory in both remote modes before the write script', () => {
  const source = readFileSync(new URL('./research-staging.integration.mjs', import.meta.url), 'utf8');
  assert.match(source, /const preflight = buildReadOnlyParitySql\(\) \+ '\\n' \+ readFileSync\(preflightPath, 'utf8'\)/);
  assert.ok(source.indexOf("if (config.mode === '--static')") < source.lastIndexOf('buildReadOnlyParitySql()'));
  assert.match(source, /config.mode === '--preflight' \? preflight : preflight \+ '\\n' \+ readFileSync\(runPath, 'utf8'\)/);
  assert.match(source, /'ON_ERROR_STOP=1'/);
});

test('M3.6 static mode works with network and DNS denied and no credential access', async () => {
  const deny = () => { throw new Error('Unexpected network access'); };
  const mocks = [mock.method(net.Socket.prototype, 'connect', deny), mock.method(tls, 'connect', deny),
    mock.method(dns, 'lookup', deny), mock.method(dns.promises, 'lookup', deny), mock.method(globalThis, 'fetch', deny)];
  let reads = 0;
  const noCredentials = new Proxy({}, { get() { reads++; throw new Error('Credential access in static mode'); } });
  try {
    await main(['--static'], noCredentials);
    assert.equal(reads, 0);
    for (const entry of mocks) assert.equal(entry.mock.callCount(), 0);
  } finally { for (const entry of mocks) entry.mock.restore(); }
});

test('M3.6 permits only exact direct staging host and certificate-verified TLS', () => {
  assert.equal(parseStagingTarget(url).host, `db.${STAGING_REF}.supabase.co`);
  assert.equal(parseStagingTarget(url.replace('postgresql:', 'postgres:')).port, '5432');
});

test('M3.6 accepts exactly the confirmed staging Session Pooler pair', () => {
  assert.deepEqual(parseStagingTarget(poolerUrl), {
    host: SESSION_POOLER_HOST, port: '5432', user: `postgres.${STAGING_REF}`,
    database: 'postgres', password: 'synthetic-password'
  });
  assert.equal(parseStagingTarget(poolerUrl.replace(':5432/', '/')).port, '5432');
  assert.equal(parseStagingTarget(url).user, 'postgres');
});

test('M3.6 Session Pooler uses validated libpq host/user with unchanged TLS and safety settings', () => {
  const config = authorizeMode(['--preflight'], { ...env, SUPABASE_STAGING_DB_URL: poolerUrl });
  const child = psqlEnvironment(config, {
    PGUSER: `postgres.${PRODUCTION_REF}`, PGHOSTADDR: '127.0.0.1', PGSSLMODE: 'disable',
    PGSERVICE: 'unsafe', PGOPTIONS: 'unsafe', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-secret'
  });
  assert.equal(child.PGHOST, SESSION_POOLER_HOST);
  assert.equal(child.PGUSER, `postgres.${STAGING_REF}`);
  assert.equal(child.PGPORT, '5432');
  assert.equal(child.PGDATABASE, 'postgres');
  assert.equal(child.PGSSLMODE, 'verify-full');
  assert.equal(child.PGSSLROOTCERT, env.ETSYHUNTER_M36_SSLROOTCERT);
  assert.match(child.PGOPTIONS, /default_transaction_read_only=on/);
  assert.match(child.PGOPTIONS, /statement_timeout=30000/);
  for (const key of ['PGHOSTADDR', 'PGSERVICE', 'SUPABASE_SERVICE_ROLE_KEY']) assert.equal(child[key], undefined);
});

test('M3.6 Session Pooler does not bypass project confirmation, CA or run consent', () => {
  const poolerEnv = { ...env, SUPABASE_STAGING_DB_URL: poolerUrl };
  assert.throws(() => authorizeMode(['--preflight'], { ...poolerEnv, ETSYHUNTER_M36_STAGING_PROJECT_REF: PRODUCTION_REF }));
  assert.throws(() => authorizeMode(['--preflight'], { ...poolerEnv, ETSYHUNTER_M36_SSLROOTCERT: undefined }));
  assert.throws(() => authorizeMode(['--run'], poolerEnv));
});

test('M3.6 session compatibility probe is read-only, checks role reset and spans rollback', () => {
  assert.doesNotMatch(sessionCompatibilitySql, /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|COMMIT|CALL|COPY)\b/i);
  assert.match(sessionCompatibilitySql, /set_config\('m36.session_pid', pg_catalog.pg_backend_pid\(\)::text, false\)/);
  assert.match(sessionCompatibilitySql, /SET LOCAL ROLE service_role;/);
  assert.match(sessionCompatibilitySql, /SET LOCAL ROLE authenticated;/);
  assert.match(sessionCompatibilitySql, /ROLLBACK;\s*BEGIN READ ONLY;\s*DO \$session_after\$/);
  assert.match(sessionCompatibilitySql, /current_user <> 'postgres'/);
  assert.match(sessionCompatibilitySql, /current_setting\('default_transaction_read_only'\) <> 'on'/);
  const source = readFileSync(new URL('./research-staging.integration.mjs', import.meta.url), 'utf8');
  assert.match(source, /const sql = sessionCompatibilitySql \+/);
});

test('M3.6 explicitly initializes read-only session defaults before queries or transactions', () => {
  const set = sessionCompatibilitySql.indexOf('SET SESSION default_transaction_read_only = on;');
  assert.ok(set >= 0);
  assert.ok(set < sessionCompatibilitySql.indexOf('SELECT '));
  assert.ok(set < sessionCompatibilitySql.indexOf('BEGIN READ ONLY;'));
  assert.ok(sessionCompatibilitySql.indexOf('\\set ON_ERROR_STOP on') < set);
  assert.doesNotMatch(sessionCompatibilitySql, /SET\s+(?:SESSION\s+)?default_transaction_read_only\s*=\s*off/i);
  for (const statement of ["SET SESSION statement_timeout = '30s';", "SET SESSION lock_timeout = '3s';", "SET SESSION idle_in_transaction_session_timeout = '30s';"]) {
    assert.ok(sessionCompatibilitySql.indexOf(statement) > set);
    assert.ok(sessionCompatibilitySql.indexOf(statement) < sessionCompatibilitySql.indexOf('SELECT '));
  }
});

test('M3.6 fails closed on either read-only flag before roles and after rollback', () => {
  for (const blockName of ['session_before', 'session_after']) {
    const block = sessionCompatibilitySql.split(`DO $${blockName}$`)[1]?.split(`$${blockName}$;`)[0];
    assert.ok(block);
    assert.match(block, /current_setting\('default_transaction_read_only'\) <> 'on'/);
    assert.match(block, /current_setting\('transaction_read_only'\) <> 'on'/);
    assert.match(block, /RAISE EXCEPTION/);
    assert.doesNotMatch(block, /EXCEPTION WHEN/);
  }
  assert.ok(sessionCompatibilitySql.indexOf('$session_before$;') < sessionCompatibilitySql.indexOf('SET LOCAL ROLE service_role;'));
});

test('M3.6 shared initialization preserves separately authorized run write and rollback boundaries', () => {
  const source = readFileSync(new URL('./research-staging.integration.mjs', import.meta.url), 'utf8');
  const writeSql = readFileSync(new URL('./research-staging.integration.sql', import.meta.url), 'utf8');
  const readSql = readFileSync(new URL('./research-staging.preflight.sql', import.meta.url), 'utf8');
  assert.match(source, /const sql = sessionCompatibilitySql \+ '\\n' \+ transportSql \+ \(config.mode === '--preflight' \? preflight : preflight \+ '\\n' \+ readFileSync\(runPath, 'utf8'\)\)/);
  assert.match(readSql, /BEGIN READ ONLY;/);
  assert.doesNotMatch(readSql, /BEGIN READ WRITE|default_transaction_read_only\s*=\s*off/i);
  assert.equal(writeSql.match(/^BEGIN READ WRITE;/gm)?.length, 1);
  assert.match(writeSql, /RESET ROLE;\s*ROLLBACK;[\s\S]*BEGIN READ ONLY;[\s\S]*DO \$cleanup\$/);
  assert.doesNotMatch(writeSql, /\bCOMMIT\s*;|default_transaction_read_only\s*=\s*off/i);
  assert.throws(() => authorizeMode(['--run'], env));
});

function conninfo(child) {
  return `You are connected to database "postgres" as user "${child.PGUSER}" on host "${child.PGHOST}" (address "192.0.2.1") at port "5432".\nSSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, compression: off, ALPN: postgresql)\nM36_CLIENT_TLS_END\n`;
}
const tlsEnvironment = target => psqlEnvironment(authorizeMode(['--preflight'], {
  ...env, SUPABASE_STAGING_DB_URL: target, ETSYHUNTER_M36_SSLROOTCERT: 'system'
}), {});

test('M3.6 client TLS evidence validates exact direct and pooler endpoints independently of backend TLS', () => {
  for (const target of [url, poolerUrl]) {
    const child = tlsEnvironment(target);
    assert.doesNotThrow(() => assertClientTlsEvidence(child, conninfo(child)));
    assert.doesNotThrow(() => assertClientTlsEvidence(child, conninfo(child).replace('TLSv1.3', 'TLSv1.2')));
    assert.equal(child.LC_ALL, 'C');
  }
});
for (const mode of [undefined, '', 'disable', 'allow', 'prefer', 'require', 'verify-ca']) {
  test(`M3.6 client TLS gate rejects sslmode=${String(mode)} even with a TLS conninfo line`, () => {
    const child = tlsEnvironment(poolerUrl);
    assert.throws(() => assertClientTlsEvidence({ ...child, PGSSLMODE: mode }, conninfo(child)), /Client TLS verification failed/);
  });
}
test('M3.6 client TLS gate rejects missing CA or alternate encryption and endpoint overrides', () => {
  const child = tlsEnvironment(poolerUrl);
  for (const overrides of [
    { PGSSLROOTCERT: undefined }, { PGSSLROOTCERT: '' }, { PGSSLROOTCERT: '\n' },
    { PGGSSENCMODE: 'prefer' }, { PGHOST: 'other.pooler.supabase.com' },
    { PGUSER: `postgres.${PRODUCTION_REF}` }, { PGPORT: '6543' }, { PGDATABASE: 'other' }
  ]) assert.throws(() => assertClientTlsEvidence({ ...child, ...overrides }, conninfo(child)));
});
test('M3.6 client TLS evidence fails closed for plaintext, absent, malformed or mismatched conninfo', () => {
  const child = tlsEnvironment(poolerUrl);
  const valid = conninfo(child);
  for (const evidence of [undefined, '', valid.split('SSL connection')[0],
    valid.replace('SSL connection', 'not SSL connection'), valid.replace('TLSv1.3', 'TLSv1.0'),
    valid.replace(child.PGHOST, 'other.pooler.supabase.com'), valid.replace(child.PGUSER, 'postgres.other'),
    valid.replace('at port "5432"', 'at port "6543"')]) {
    assert.throws(() => assertClientTlsEvidence(child, evidence), error => {
      assert.equal(error.message, 'Client TLS verification failed');
      return true;
    });
  }
});
test('M3.6 sends SQL only after client TLS evidence and requires it for success', () => {
  const source = readFileSync(new URL('./research-staging.integration.mjs', import.meta.url), 'utf8');
  assert.match(source, /assertClientTlsEvidence\(childEnv, output\);\s*tlsVerified = true;\s*output = '';\s*child.stdin.end\(sql\)/);
  assert.match(source, /!interrupted && tlsVerified && code === 0/);
  assert.match(source, /child.stdin.write\('\\\\conninfo\\n\\\\echo M36_CLIENT_TLS_END\\n'\)/);
  assert.match(source, /catch \{\s*interrupt\(\);/);
});
test('M3.6 SQL requires client TLS coordination and retains backend TLS verification for direct connections', () => {
  for (const name of ['research-staging.preflight.sql', 'research-staging.integration.sql']) {
    const sql = readFileSync(new URL(name, import.meta.url), 'utf8');
    assert.match(sql, /current_setting\('m36.client_tls_verified', true\) IS DISTINCT FROM 'verify-full'/);
    assert.match(sql, /COALESCE\(current_setting\('m36.connection_kind', true\), ''\) NOT IN \('direct', 'session_pooler'\)/);
    assert.match(sql, /\(current_setting\('m36.connection_kind', true\) = 'direct'\s*AND NOT EXISTS \(SELECT 1 FROM pg_catalog.pg_stat_ssl WHERE pid = pg_catalog.pg_backend_pid\(\) AND ssl\)\)/);
  }
});

const unsafe = [
  ['production', url.replace(STAGING_REF, PRODUCTION_REF)],
  ['suffix attack', url.replace('.supabase.co:', '.supabase.co.evil.test:')],
  ['IP target', url.replace(`db.${STAGING_REF}.supabase.co`, '127.0.0.1')],
  ['pooler with direct username', url.replace(`db.${STAGING_REF}.supabase.co`, SESSION_POOLER_HOST)],
  ['wrong user', url.replace('postgres:', 'postgres.other:')],
  ['wrong database', url.replace('/postgres?', '/template1?')],
  ['wrong port', url.replace(':5432/', ':6543/')],
  ['TLS disabled', url.replace('verify-full', 'disable')],
  ['TLS without identity verification', url.replace('verify-full', 'require')],
  ['missing TLS', url.replace('?sslmode=verify-full', '')],
  ['duplicate TLS', url + '&sslmode=disable'],
  ['hostaddr bypass', url + '&hostaddr=127.0.0.1'],
  ['service override', url + '&service=production'],
  ['options override', url + '&options=-csearch_path=public'],
  ['fragment', url + '#extra'],
  ['no password', url.replace(':synthetic-password', '')],
  ['malformed password', url.replace('synthetic-password', '%ZZ')],
  ['control character', url.replace('synthetic-password', '%0A')],
  ['malformed URL', 'not a URL'],
  ['absent URL', undefined]
];
unsafe.push(
  ['pooler production username', poolerUrl.replace(STAGING_REF, PRODUCTION_REF)],
  ['pooler alternate region', poolerUrl.replace('eu-west-1', 'eu-west-2')],
  ['pooler alternate instance', poolerUrl.replace('aws-0-', 'aws-1-')],
  ['pooler suffix attack', poolerUrl.replace(SESSION_POOLER_HOST, SESSION_POOLER_HOST + '.evil.test')],
  ['pooler IP', poolerUrl.replace(SESSION_POOLER_HOST, '127.0.0.1')],
  ['pooler transaction port', poolerUrl.replace(':5432/', ':6543/')],
  ['pooler other database', poolerUrl.replace('/postgres?', '/template1?')],
  ['pooler missing project', poolerUrl.replace(`postgres.${STAGING_REF}`, 'postgres')],
  ['pooler other project', poolerUrl.replace(STAGING_REF, 'aaaaaaaaaaaaaaaaaaaa')],
  ['pooler username suffix', poolerUrl.replace(STAGING_REF, STAGING_REF + '.evil')],
  ['pooler username prefix', poolerUrl.replace('postgres.', 'attacker.postgres.')],
  ['direct host with pooler username', poolerUrl.replace(SESSION_POOLER_HOST, `db.${STAGING_REF}.supabase.co`)],
  ['pooler plaintext TLS', poolerUrl.replace('verify-full', 'disable')],
  ['pooler TLS downgrade', poolerUrl.replace('verify-full', 'require')],
  ['pooler missing TLS', poolerUrl.replace('?sslmode=verify-full', '')],
  ['pooler duplicate TLS', poolerUrl + '&sslmode=disable'],
  ['pooler hostaddr', poolerUrl + '&hostaddr=127.0.0.1'],
  ['pooler extra URI option', poolerUrl + '&application_name=unsafe'],
  ['pooler service override', poolerUrl + '&service=production'],
  ['pooler fragment', poolerUrl + '#unsafe'],
  ['pooler empty password', poolerUrl.replace(':synthetic-password', '')],
  ['pooler password control character', poolerUrl.replace('synthetic-password', '%00')]
);
for (const [name, target] of unsafe) {
  test(`M3.6 rejects ${name} without disclosing target`, () => {
    assert.throws(() => parseStagingTarget(target), error => {
      assert.equal(error.message, 'Unsafe staging database target');
      assert.doesNotMatch(error.message, /synthetic-password|postgresql:|%ZZ/);
      return true;
    });
  });
}

test('M3.6 modes reject missing, extra or unknown flags before credentials', () => {
  for (const args of [[], ['--run', '--static'], ['--preflight', '--force'], ['--force']]) {
    assert.throws(() => authorizeMode(args, {}));
  }
});
test('M3.6 preflight requires exact dedicated project confirmation', () => {
  for (const ref of [undefined, '', PRODUCTION_REF, STAGING_REF + ' ']) {
    assert.throws(() => authorizeMode(['--preflight'], { ...env, ETSYHUNTER_M36_STAGING_PROJECT_REF: ref }));
  }
  assert.equal(authorizeMode(['--preflight'], env).mode, '--preflight');
});
test('M3.6 run authorization is default-denied and cannot reuse M1.5 consent', () => {
  for (const value of [undefined, 'true', `${STAGING_REF}:M15-RBAC-INTEGRATION`, RUN_CONFIRMATION + ' ']) {
    assert.throws(() => authorizeMode(['--run'], { ...env, ETSYHUNTER_M36_STAGING_RUN_CONFIRM: value }));
  }
  // Pure configuration check only. No execution or connection is invoked.
  assert.equal(authorizeMode(['--run'], { ...env, ETSYHUNTER_M36_STAGING_RUN_CONFIRM: RUN_CONFIRMATION }).mode, '--run');
});
test('M3.6 rejects missing certificate configuration locally', () => {
  assert.throws(() => authorizeMode(['--preflight'], { ...env, ETSYHUNTER_M36_SSLROOTCERT: undefined }));
});
test('M3.6 explicit system CA skips the file check for either allowed target without changing TLS', () => {
  assert.doesNotThrow(() => assertRootCertificateAvailable('system'));
  for (const target of [url, poolerUrl]) {
    const config = authorizeMode(['--preflight'], { ...env, SUPABASE_STAGING_DB_URL: target, ETSYHUNTER_M36_SSLROOTCERT: 'system' });
    const child = psqlEnvironment(config, { PGSSLROOTCERT: 'unsafe-inherited-file', PGSSLMODE: 'disable' });
    assert.equal(child.PGSSLROOTCERT, 'system');
    assert.equal(child.PGSSLMODE, 'verify-full');
    assert.equal(child.PGHOST, parseStagingTarget(target).host);
    assert.throws(() => authorizeMode(['--run'], { ...env, ETSYHUNTER_M36_SSLROOTCERT: 'system' }));
  }
});
test('M3.6 CA file mode retains real existing-file validation and unchanged forwarding', () => {
  // The local source file tests filesystem semantics only, not CA contents/trust.
  // Certificate validation remains libpq's responsibility during a future connection.
  const file = fileURLToPath(import.meta.url);
  assert.doesNotThrow(() => assertRootCertificateAvailable(file));
  const config = authorizeMode(['--preflight'], { ...env, ETSYHUNTER_M36_SSLROOTCERT: file });
  assert.equal(psqlEnvironment(config, {}).PGSSLROOTCERT, file);
  assert.equal(psqlEnvironment(config, {}).PGSSLMODE, 'verify-full');
});
test('M3.6 certificate validation rejects directories and missing files without path disclosure', () => {
  for (const path of [fileURLToPath(new URL('.', import.meta.url)), fileURLToPath(new URL('./missing-m36-ca-file.pem', import.meta.url))]) {
    assert.throws(() => assertRootCertificateAvailable(path), error => {
      assert.equal(error.message, 'TLS root certificate is not an existing file');
      assert.equal('cause' in error, false);
      return true;
    });
  }
});
test('M3.6 invalid certificate settings fail locally; only exact system bypasses file validation', () => {
  for (const rootCert of [undefined, null, 17, '', ' ', '\t', 'system\n', 'system\x00', 'file\x7f.pem']) {
    assert.throws(() => authorizeMode(['--preflight'], { ...env, ETSYHUNTER_M36_SSLROOTCERT: rootCert }));
    assert.throws(() => assertRootCertificateAvailable(rootCert));
  }
  // These are ordinary file paths, not aliases for the special value.
  for (const rootCert of [' system ', 'SYSTEM']) {
    assert.throws(() => assertRootCertificateAvailable(rootCert), /not an existing file/);
  }
});
test('M3.6 psql environment rejects inherited connection and credential overrides', () => {
  const config = authorizeMode(['--preflight'], env);
  const child = psqlEnvironment(config, {
    PATH: 'synthetic-path', PGHOSTADDR: '127.0.0.1', PGHOST: 'production', PGSSLMODE: 'disable',
    PGSERVICE: 'production', PGOPTIONS: 'unsafe', NODE_OPTIONS: '--inspect',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-secret', APIFY_API_TOKEN: 'synthetic-secret',
    OPENROUTER_API_KEY: 'synthetic-secret', PGSSLROOTCERT: 'wrong-cert'
  });
  assert.equal(child.PGHOST, `db.${STAGING_REF}.supabase.co`);
  assert.equal(child.PGSSLMODE, 'verify-full');
  assert.equal(child.PGSSLROOTCERT, env.ETSYHUNTER_M36_SSLROOTCERT);
  assert.match(child.PGOPTIONS, /default_transaction_read_only=on/);
  for (const key of ['PGHOSTADDR', 'PGSERVICE', 'NODE_OPTIONS', 'SUPABASE_SERVICE_ROLE_KEY', 'APIFY_API_TOKEN', 'OPENROUTER_API_KEY']) {
    assert.equal(child[key], undefined);
  }
});
test('M3.6 no external fixture, SDK, migration execution or provider implementation is imported', () => {
  const source = readFileSync(new URL('./research-staging.integration.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /@supabase|dotenv|createUser|deleteUser|fetch\(/);
  assert.match(source, /console\.error\('FAIL: M3\.6 safety/);
  assert.match(source, /child\.stderr\.on\('data', \(\) => \{\}\)/);
  assert.match(source, /shell: false/);
});
