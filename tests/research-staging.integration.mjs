import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildParityManifest, buildReadOnlyParitySql } from './research-staging.parity.mjs';

export const STAGING_REF = 'iwqnyqaefovhvnunarfa';
export const PRODUCTION_REF = 'fdvnojlojtfiwhtchgdk';
export const SESSION_POOLER_HOST = 'aws-0-eu-west-1.pooler.supabase.com';
export const RUN_CONFIRMATION = `${STAGING_REF}:M36-TRANSACTION-ROLLBACK`;
const local = name => fileURLToPath(new URL(name, import.meta.url));
const migrationPath = local('../supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql');
const runPath = local('./research-staging.integration.sql');
const preflightPath = local('./research-staging.preflight.sql');

// Two exact host/user pairs only; never infer project identity from a shared host.
export function parseStagingTarget(value) {
  const reject = () => { throw new Error('Unsafe staging database target'); };
  if (typeof value !== 'string' || /[\s\x00-\x1f\x7f]/.test(value) || value.includes(PRODUCTION_REF)) reject();
  let url;
  try { url = new URL(value); } catch { reject(); }
  const direct = url.hostname === `db.${STAGING_REF}.supabase.co` && url.username === 'postgres';
  const sessionPooler = url.hostname === SESSION_POOLER_HOST && url.username === `postgres.${STAGING_REF}`;
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      (!direct && !sessionPooler) || (url.port && url.port !== '5432') ||
      url.pathname !== '/postgres' || url.hash ||
      url.search !== '?sslmode=verify-full') reject();
  let password;
  try { password = decodeURIComponent(url.password); } catch { reject(); }
  if (!password || /[\x00-\x1f\x7f]/.test(password)) reject();
  return { host: url.hostname, port: '5432', user: url.username, database: 'postgres', password };
}

export function authorizeMode(args, env) {
  if (args.length !== 1 || !['--static', '--preflight', '--run'].includes(args[0])) {
    throw new Error('Use exactly one mode: --static, --preflight or --run');
  }
  const mode = args[0];
  if (mode === '--static') return { mode };
  if (env.ETSYHUNTER_M36_STAGING_PROJECT_REF !== STAGING_REF) {
    throw new Error('Exact M3.6 staging project confirmation required');
  }
  if (mode === '--run' && env.ETSYHUNTER_M36_STAGING_RUN_CONFIRM !== RUN_CONFIRMATION) {
    throw new Error('Transactional staging execution is blocked without explicit M3.6 confirmation');
  }
  const target = parseStagingTarget(env.SUPABASE_STAGING_DB_URL);
  const rootCert = env.ETSYHUNTER_M36_SSLROOTCERT;
  assertRootCertificateSetting(rootCert);
  return { mode, target, rootCert };
}

function assertRootCertificateSetting(rootCert) {
  if (typeof rootCert !== 'string' || !rootCert.trim() || /[\x00-\x1f\x7f]/.test(rootCert)) {
    throw new Error('Staging TLS root certificate must be system or an existing trusted CA file');
  }
}

export function assertRootCertificateAvailable(rootCert) {
  assertRootCertificateSetting(rootCert);
  // libpq resolves the exact special value; skip only the local file check.
  if (rootCert === 'system') return;
  try {
    if (statSync(rootCert).isFile()) return;
  } catch {
    // Do not disclose certificate paths or filesystem error details.
  }
  throw new Error('TLS root certificate is not an existing file');
}

export function psqlEnvironment(config, env) {
  // An allowlist prevents inherited PGHOSTADDR/PGSERVICE/PGOPTIONS/TLS overrides,
  // NODE_OPTIONS, provider credentials or service-role tokens reaching psql.
  const child = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP']) {
    if (env[key]) child[key] = env[key];
  }
  return Object.assign(child, {
    PGHOST: config.target.host, PGPORT: '5432', PGDATABASE: 'postgres', PGUSER: config.target.user,
    PGPASSWORD: config.target.password, PGSSLMODE: 'verify-full', PGSSLROOTCERT: config.rootCert,
    PGCONNECT_TIMEOUT: '10', PGAPPNAME: 'etsyhunter-m36-staging-only', PGGSSENCMODE: 'disable',
    LC_ALL: 'C', LANG: 'C',
    PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=30000',
    PGPASSFILE: process.platform === 'win32' ? 'NUL' : '/dev/null',
    PGSERVICEFILE: process.platform === 'win32' ? 'NUL' : '/dev/null'
  });
}

// conninfo confirms this psql connection's TLS, not the pooler's backend leg.
// Certificate/hostname verification is supplied by libpq's mandatory verify-full.
export function assertClientTlsEvidence(childEnv, conninfo) {
  const direct = childEnv.PGHOST === `db.${STAGING_REF}.supabase.co` && childEnv.PGUSER === 'postgres';
  const pooler = childEnv.PGHOST === SESSION_POOLER_HOST && childEnv.PGUSER === `postgres.${STAGING_REF}`;
  assertRootCertificateSetting(childEnv.PGSSLROOTCERT);
  if ((!direct && !pooler) || childEnv.PGPORT !== '5432' || childEnv.PGDATABASE !== 'postgres' ||
      childEnv.PGSSLMODE !== 'verify-full' || childEnv.PGGSSENCMODE !== 'disable' ||
      typeof conninfo !== 'string' ||
      !conninfo.includes(`database "postgres" as user "${childEnv.PGUSER}" on host "${childEnv.PGHOST}"`) ||
      !conninfo.includes('at port "5432".') ||
      !/^SSL connection \(protocol: TLSv1\.[23], cipher: [^,\r\n]+, compression: off(?:, [^\r\n]*)?\)\r?$/m.test(conninfo)) {
    throw new Error('Client TLS verification failed');
  }
}

// Read-only session-affinity gate, in the SAME psql connection as all later SQL.
// Session SET survives rollback; transaction-local roles must not. Failure stops
// before any integration fixture. No reconnect, fallback or transaction pooler.
export const sessionCompatibilitySql = String.raw`
\set ON_ERROR_STOP on
\set ECHO none
-- Poolers may not forward PGOPTIONS. Establish the session defaults explicitly
-- outside any transaction so they survive the probe's rollback.
SET SESSION default_transaction_read_only = on;
SET SESSION statement_timeout = '30s';
SET SESSION lock_timeout = '3s';
SET SESSION idle_in_transaction_session_timeout = '30s';
SELECT pg_catalog.set_config('m36.session_pid', pg_catalog.pg_backend_pid()::text, false),
       pg_catalog.set_config('m36.session_marker', 'm36-session-affinity', false);
BEGIN READ ONLY;
DO $session_before$
BEGIN
    IF session_user <> 'postgres' OR current_user <> 'postgres'
       OR current_setting('default_transaction_read_only') <> 'on'
       OR current_setting('transaction_read_only') <> 'on'
       OR current_setting('m36.session_pid') <> pg_catalog.pg_backend_pid()::text
       OR current_setting('m36.session_marker') <> 'm36-session-affinity' THEN
        RAISE EXCEPTION 'M36 session compatibility gate failed';
    END IF;
END;
$session_before$;
SET LOCAL ROLE service_role;
DO $session_role$
BEGIN
    IF current_user <> 'service_role' OR session_user <> 'postgres'
       OR current_setting('m36.session_pid') <> pg_catalog.pg_backend_pid()::text THEN
        RAISE EXCEPTION 'M36 session role gate failed';
    END IF;
END;
$session_role$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $session_browser_role$
BEGIN
    IF current_user <> 'authenticated' OR session_user <> 'postgres' THEN
        RAISE EXCEPTION 'M36 session browser role gate failed';
    END IF;
END;
$session_browser_role$;
ROLLBACK;
BEGIN READ ONLY;
DO $session_after$
BEGIN
    IF current_user <> 'postgres' OR session_user <> 'postgres'
       OR current_setting('default_transaction_read_only') <> 'on'
       OR current_setting('m36.session_pid') <> pg_catalog.pg_backend_pid()::text
       OR current_setting('m36.session_marker') <> 'm36-session-affinity'
       OR current_setting('transaction_read_only') <> 'on' THEN
        RAISE EXCEPTION 'M36 session rollback affinity gate failed';
    END IF;
END;
$session_after$;
ROLLBACK;
`;

export function runStaticChecks() {
  assert.equal(buildParityManifest().functions.length, 8);
  const parity = buildReadOnlyParitySql();
  assert.match(parity, /^BEGIN READ ONLY;/m);
  assert.match(parity, /RAISE EXCEPTION 'M36 reviewed function parity failed'/);
  assert.doesNotMatch(parity, /^\s*(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|CALL|COPY|COMMIT)\b/im);
  const migration = readFileSync(migrationPath, 'utf8');
  const preflight = readFileSync(preflightPath, 'utf8');
  const sql = readFileSync(runPath, 'utf8');
  assert.doesNotMatch(sessionCompatibilitySql, /\b(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|CREATE|ALTER|DROP|CALL|COPY|COMMIT)\b/i);
  assert.match(sessionCompatibilitySql, /SET LOCAL ROLE authenticated;/);
  assert.match(sessionCompatibilitySql, /ROLLBACK;\s*BEGIN READ ONLY;/);
  assert.ok(sessionCompatibilitySql.indexOf('SET SESSION default_transaction_read_only = on;') < sessionCompatibilitySql.indexOf('SELECT pg_catalog.set_config('));
  for (const flag of ['default_transaction_read_only', 'transaction_read_only']) {
    assert.equal(sessionCompatibilitySql.match(new RegExp(`current_setting\\('${flag}'\\) <> 'on'`, 'g'))?.length, 2);
  }
  const functions = [...migration.matchAll(/CREATE FUNCTION public\.(\w+)\(([\s\S]*?)\)\s*RETURNS JSONB/g)];
  assert.equal(functions.length, 6, 'M2 must expose exactly six lifecycle contracts');
  for (const [, name, parameters] of functions) {
    const types = parameters.split(',').map(p => p.trim().split(/\s+/)[1].toLowerCase());
    assert.ok(preflight.includes(`${name}(${types.join(',')})`), `Preflight signature drift: ${name}`);
    assert.ok(sql.includes(`public.${name}(`), `Missing lifecycle scenario: ${name}`);
  }
  assert.match(preflight, /BEGIN READ ONLY;/);
  assert.doesNotMatch(preflight, /^\s*(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|CREATE|ALTER|DROP|CALL|COPY|COMMIT)\b/im);
  assert.doesNotMatch(preflight, /public\.(?:reserve_research_job|begin_research_provider_attempt|finish_research_provider_attempt|mark_research_job_ambiguous|complete_research_job|fail_research_job)\s*\(/);
  assert.match(sql, /^BEGIN READ WRITE;/m);
  assert.match(sql, /RESET ROLE;\s*ROLLBACK;[\s\S]*DO \$cleanup\$/);
  assert.match(sql, /END;\s*\$cleanup\$;\s*ROLLBACK;\s*\\echo M36_RUN_ROLLBACK_OK\s*$/);
  assert.doesNotMatch(sql, /\b(?:COMMIT|TRUNCATE|ALTER|DROP|COPY|CREATE)\b/i);
  assert.doesNotMatch(sql, /(?:INSERT INTO|UPDATE|DELETE FROM) public\.research_provider_pricing/i);
  assert.doesNotMatch(sql, /WHEN\s+OTHERS|WHEN\s+SQLSTATE\s+'ZX001'|\\(?:i|ir|include|quit|q|!|o|gexec)\b/i);
  const guard = sql.indexOf('$guard$;');
  assert.ok(guard > 0 && guard < sql.indexOf('INSERT INTO auth.users'), 'Guard must precede fixtures');
  for (const name of ['pricing_denial', 'idempotency_mismatch', 'inflight_denial', 'budget_denial', 'ambiguity_denial', 'rls_denial']) {
    const block = sql.match(new RegExp(`DO \\$${name}\\$([\\s\\S]*?)\\$${name}\\$;`))?.[1];
    assert.ok(block && /ERRCODE\s*=\s*'ZX001'/.test(block), `Negative scenario missing sentinel: ${name}`);
    assert.doesNotMatch(block, /WHEN\s+OTHERS|WHEN\s+SQLSTATE\s+'ZX001'/i);
  }
  const server = readFileSync(local('../server.ts'), 'utf8');
  assert.match(server, /return res\.status\(503\)\.json\(\{ error: ANALYSIS_UNAVAILABLE_MESSAGE \}\)/);
  const economics = readFileSync(local('../src/server/researchEconomics.ts'), 'utf8');
  assert.match(economics, /activationBlocked: true/);
  assert.match(economics, /microUsdPerBillingUnit: null/);
  return { rpcContracts: functions.length, negativeScenarios: 6 };
}

// No import-time connections. Static exits before reading credentials or spawning psql.
export async function main(args = process.argv.slice(2), env = process.env) {
  const config = authorizeMode(args, env);
  const checked = runStaticChecks();
  if (config.mode === '--static') {
    console.log(`PASS: offline M3.6 contracts (${checked.rpcContracts} RPCs, ${checked.negativeScenarios} negative scenarios); no connection attempted`);
    return;
  }
  assertRootCertificateAvailable(config.rootCert);
  const preflight = buildReadOnlyParitySql() + '\n' + readFileSync(preflightPath, 'utf8');
  // These are coordination markers, not independent SQL proof of client TLS.
  // Only set after the client-side gate succeeds; never interpolate credentials.
  const connectionKind = config.target.host === SESSION_POOLER_HOST ? 'session_pooler' : 'direct';
  const transportSql = `SELECT pg_catalog.set_config('m36.client_tls_verified', 'verify-full', false), pg_catalog.set_config('m36.connection_kind', '${connectionKind}', false);\n`;
  const sql = sessionCompatibilitySql + '\n' + transportSql + (config.mode === '--preflight' ? preflight : preflight + '\n' + readFileSync(runPath, 'utf8'));
  const expected = config.mode === '--preflight' ? 'M36_PREFLIGHT_OK' : 'M36_RUN_ROLLBACK_OK';
  const childEnv = psqlEnvironment(config, env);
  await new Promise((resolve, reject) => {
    const child = spawn('psql', ['-X', '--no-psqlrc', '--no-password', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=terse', '-v', 'SHOW_CONTEXT=never', '-f', '-'], {
      env: childEnv, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], shell: false
    });
    let output = '', interrupted = false, tlsVerified = false;
    const interrupt = () => { interrupted = true; child.kill(); };
    const timer = setTimeout(interrupt, 90000);
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    child.stdout.on('data', chunk => {
      output = (output + chunk.toString()).slice(-8192);
      if (!tlsVerified && !interrupted && output.split(/\r?\n/).includes('M36_CLIENT_TLS_END')) {
        try {
          assertClientTlsEvidence(childEnv, output);
          tlsVerified = true;
          output = '';
          child.stdin.end(sql);
        } catch {
          interrupt();
        }
      }
    });
    // Never forward raw PostgreSQL output, NOTICEs, errors, SQL context or credentials.
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => {});
    child.on('error', () => {});
    child.once('close', code => {
      clearTimeout(timer);
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
      if (!interrupted && tlsVerified && code === 0 && output.split(/\r?\n/).includes(expected)) resolve();
      else reject(new Error('Staging verification failed or was interrupted; no success or cleanup claim. Review privately; do not retry an ambiguous run automatically.'));
    });
    // No SQL (including fixtures) is sent until this same client's TLS is proven.
    child.stdin.write('\\conninfo\n\\echo M36_CLIENT_TLS_END\n');
  });
  console.log(config.mode === '--preflight'
    ? 'PASS: read-only staging catalog/TLS/ACL preflight; no fixtures or research execution'
    : 'PASS: transactional staging scenarios rolled back; fixture absence verified');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    // Fixed output even for parser, filesystem, spawn and database errors.
    console.error('FAIL: M3.6 safety or verification gate failed. No live research enabled. No cleanup success is implied.');
    process.exitCode = 1;
  });
}
