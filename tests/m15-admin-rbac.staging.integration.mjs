import { createHash, randomUUID } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const STAGING_REF = 'iwqnyqaefovhvnunarfa'
const PRODUCTION_REF = 'fdvnojlojtfiwhtchgdk'
const STAGING_URL = `https://${STAGING_REF}.supabase.co`
const FOUNDER_ID = '6c05db98-e615-459f-8e17-cda584049d26'
const FOUNDER_EMAIL = '3imranom@gmail.com'
const FIXTURE_TYPE = 'etsyhunter-m15-rbac-integration'
const RUN_CONFIRMATION = `${STAGING_REF}:M15-RBAC-INTEGRATION`
const psqlExecutable = process.env.ETSYHUNTER_PSQL_PATH?.trim() || 'psql'
const SQL_PATH = fileURLToPath(
  new URL('./m15-admin-rbac.staging.integration.sql', import.meta.url),
)
const NEGATIVE_SQL_BLOCKS = [
  'authenticated_denial',
  'email_mismatch',
  'invalid_invitation_permissions',
  'replay_denial',
  'limited_invite_denial',
  'limited_promotion_denial',
  'invalid_permission_update',
  'founder_revocation_denial',
]

function parseStagingDatabaseUrl(value) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('Staging PostgreSQL URL is malformed')
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('Staging PostgreSQL URL must use postgres:// or postgresql://')
  }

  const host = parsed.hostname.toLowerCase()
  const user = decodeURIComponent(parsed.username).toLowerCase()
  const directHost = `db.${STAGING_REF}.supabase.co`
  const stagingPoolerUser = `postgres.${STAGING_REF}`
  const productionHost = `db.${PRODUCTION_REF}.supabase.co`
  const productionPoolerUser = `postgres.${PRODUCTION_REF}`
  const isDirect = host === directHost && user === 'postgres'
  const isPooler =
    /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(host) &&
    user === stagingPoolerUser

  if (host === productionHost || user === productionPoolerUser) {
    throw new Error('Production PostgreSQL identity detected')
  }
  if (!isDirect && !isPooler) {
    throw new Error(
      'PostgreSQL identity must use the exact staging direct host or pooler username',
    )
  }

  const databaseName = decodeURIComponent(parsed.pathname.slice(1))
  if (databaseName !== 'postgres') {
    throw new Error('Harness is restricted to the staging postgres database')
  }

  const sslMode = parsed.searchParams.get('sslmode')
  if (!['require', 'verify-ca', 'verify-full'].includes(sslMode)) {
    throw new Error('Staging PostgreSQL URL must require TLS')
  }
  if (!parsed.password) {
    throw new Error('Staging PostgreSQL URL must include its database password')
  }

  const port = parsed.port || '5432'
  if ((isDirect && port !== '5432') || (isPooler && !['5432', '6543'].includes(port))) {
    throw new Error('PostgreSQL port is not valid for the selected Supabase endpoint')
  }

  return { parsed, host, user, databaseName, sslMode, port }
}

function expectDatabaseUrlRejection(value) {
  try {
    parseStagingDatabaseUrl(value)
  } catch {
    return
  }
  throw new Error(`Static URL guard accepted an unsafe test case`)
}

function runStaticChecks() {
  const sql = readFileSync(SQL_PATH, 'utf8')

  for (const blockName of NEGATIVE_SQL_BLOCKS) {
    const match = sql.match(
      new RegExp(`DO \\$${blockName}\\$([\\s\\S]*?)\\$${blockName}\\$;`),
    )
    if (!match) throw new Error(`Missing negative SQL test block: ${blockName}`)
    const block = match[1]
    if (!block.includes("ERRCODE = 'ZX001'")) {
      throw new Error(`Negative SQL test lacks an unexpected-success sentinel: ${blockName}`)
    }
    if (/WHEN\s+OTHERS/i.test(block) || /WHEN\s+SQLSTATE\s+'ZX001'/i.test(block)) {
      throw new Error(`Negative SQL test catches its own failure sentinel: ${blockName}`)
    }
  }

  const guardEnd = sql.indexOf('$guard$;', sql.indexOf('DO $guard$'))
  const firstMutation = Math.min(
    ...[
      'PERFORM public.create_admin_invitation(',
      'PERFORM public.accept_admin_invitation(',
      'PERFORM public.set_limited_admin_permissions(',
      'PERFORM public.set_admin_role(',
      'PERFORM public.revoke_admin_access(',
    ].map(statement => sql.indexOf(statement)),
  )
  if (guardEnd < 0 || firstMutation < 0 || guardEnd >= firstMutation) {
    throw new Error('Founder fixture guard does not precede every RBAC mutation')
  }
  if (/\bCOMMIT\s*;/i.test(sql) || !/RESET ROLE;\s*ROLLBACK;\s*\\echo\s+'PASS:/i.test(sql)) {
    throw new Error('SQL harness must end successful execution with ROLLBACK before PASS')
  }
  if (/\\quit\b/i.test(sql)) {
    throw new Error('SQL harness must not bypass assertions with a psql quit command')
  }

  parseStagingDatabaseUrl(
    `postgresql://postgres:test-password@db.${STAGING_REF}.supabase.co:5432/postgres?sslmode=require`,
  )
  parseStagingDatabaseUrl(
    `postgresql://postgres.${STAGING_REF}:test-password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`,
  )
  for (const unsafeUrl of [
    `postgresql://postgres:test-password@db.${PRODUCTION_REF}.supabase.co:5432/postgres?sslmode=require`,
    `postgresql://postgres.${PRODUCTION_REF}:test-password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`,
    `postgresql://postgres:test-password@db.${STAGING_REF}.evil.supabase.co:5432/postgres?sslmode=require`,
    `postgresql://postgres.${STAGING_REF}.attacker:test-password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`,
    `postgresql://postgres:test-password@contains-${STAGING_REF}.supabase.com:5432/postgres?sslmode=require`,
  ]) {
    expectDatabaseUrlRejection(unsafeUrl)
  }
}

const mode = process.argv[2]
if (!['--static', '--preflight', '--run'].includes(mode)) {
  throw new Error(
    'Usage: node tests/m15-admin-rbac.staging.integration.mjs --static|--preflight|--run',
  )
}

runStaticChecks()
if (mode === '--static') {
  console.log('PASS: local SQL assertion and staging URL guard checks succeeded')
  process.exit(0)
}

if (process.env.ETSYHUNTER_M15_STAGING_PROJECT_REF !== STAGING_REF) {
  throw new Error('Staging project confirmation is missing or incorrect')
}

if (new URL(STAGING_URL).hostname !== `${STAGING_REF}.supabase.co`) {
  throw new Error('Hardcoded staging URL guard failed')
}

if (
  mode === '--run' &&
  process.env.ETSYHUNTER_M15_STAGING_RUN_CONFIRM !== RUN_CONFIRMATION
) {
  throw new Error('Remote staging test confirmation is missing or incorrect')
}

const serviceRoleKey = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY
if (!serviceRoleKey) throw new Error('Missing staging service-role key')

const jwtParts = serviceRoleKey.split('.')
if (jwtParts.length !== 3) {
  throw new Error('Use the staging legacy service_role JWT for this harness')
}

let serviceRoleClaims
try {
  serviceRoleClaims = JSON.parse(
    Buffer.from(jwtParts[1], 'base64url').toString('utf8'),
  )
} catch {
  throw new Error('Unable to inspect service-role JWT claims')
}

// This claim check is a local guard, not cryptographic verification. The
// hardcoded staging Auth endpoint must still validate the credential remotely.
if (
  serviceRoleClaims.role !== 'service_role' ||
  serviceRoleClaims.ref !== STAGING_REF
) {
  throw new Error('Credential claims do not identify the staging service_role')
}
if (
  serviceRoleClaims.ref === PRODUCTION_REF ||
  STAGING_URL.includes(PRODUCTION_REF)
) {
  throw new Error('Production credential or URL detected')
}
if (
  typeof serviceRoleClaims.exp === 'number' &&
  serviceRoleClaims.exp <= Math.floor(Date.now() / 1000)
) {
  throw new Error('Staging service-role JWT is expired')
}

const databaseUrlValue = process.env.SUPABASE_STAGING_DB_URL
if (!databaseUrlValue) throw new Error('Missing staging PostgreSQL URL')
const {
  parsed: databaseUrl,
  host: databaseHost,
  user: databaseUser,
  databaseName,
  sslMode,
  port: databasePort,
} = parseStagingDatabaseUrl(databaseUrlValue)

const psqlCheck = spawnSync(psqlExecutable, ['--version'], {
  encoding: 'utf8',
  windowsHide: true,
})
if (psqlCheck.error || psqlCheck.status !== 0) {
  throw new Error('psql is required and was not found on PATH')
}

if (mode === '--preflight') {
  console.log('PASS: local staging guards and psql preflight succeeded; no network request was made')
  process.exit(0)
}

const runId = randomUUID()
const runStartedAt = Date.now()
const fixtures = [
  {
    label: 'fixture-a',
    id: randomUUID(),
    email: `etsyhunter-m15-rbac-${runId}-a@staging.invalid`,
  },
  {
    label: 'fixture-b',
    id: randomUUID(),
    email: `etsyhunter-m15-rbac-${runId}-b@staging.invalid`,
  },
]
const fixtureMetadata = Object.freeze({
  etsyhunter_fixture: FIXTURE_TYPE,
  etsyhunter_fixture_environment: 'staging-only',
  etsyhunter_fixture_project_ref: STAGING_REF,
  etsyhunter_fixture_run_id: runId,
  etsyhunter_synthetic_staging_fixture: true,
})

const supabase = createClient(STAGING_URL, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

const cleanupCandidates = new Map()
const manualInspection = new Set()
const cleanupProblems = []
let activePsql = null
let interrupted = false

const isNotFound = error =>
  error?.status === 404 || error?.code === 'user_not_found'

const isUuid = value =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )

const redact = value =>
  String(value ?? 'unknown error')
    .replaceAll(serviceRoleKey, '[REDACTED]')
    .replaceAll(databaseUrlValue, '[REDACTED]')
    .replaceAll(decodeURIComponent(databaseUrl.password), '[REDACTED]')

const safeError = (label, error) =>
  new Error(
    `${label}: ${redact(error?.message)} [${error?.code ?? error?.status ?? 'unknown'}]`,
  )

const hasExactFixtureMetadata = user =>
  Object.entries(fixtureMetadata).every(
    ([key, value]) => user?.app_metadata?.[key] === value,
  )

const matchesFixture = (user, expectedId, expectedEmail) => {
  if (
    user?.id !== expectedId ||
    user?.email !== expectedEmail ||
    !user?.email_confirmed_at ||
    !user?.confirmed_at ||
    !hasExactFixtureMetadata(user)
  ) {
    return false
  }

  const createdAt = Date.parse(user.created_at ?? '')
  return Number.isFinite(createdAt) && createdAt >= runStartedAt - 60_000
}

async function getUser(id, label) {
  try {
    return await supabase.auth.admin.getUserById(id)
  } catch (error) {
    throw safeError(label, error)
  }
}

async function verifyFounderFixture() {
  const result = await getUser(FOUNDER_ID, 'Founder fixture verification failed')
  if (result.error) throw safeError('Founder fixture verification failed', result.error)

  const user = result.data?.user
  if (
    user?.id !== FOUNDER_ID ||
    user?.email !== FOUNDER_EMAIL ||
    !user?.email_confirmed_at ||
    user?.app_metadata?.etsyhunter_fixture_environment !== 'staging-only' ||
    user?.app_metadata?.etsyhunter_fixture_project_ref !== STAGING_REF ||
    user?.app_metadata?.etsyhunter_synthetic_staging_fixture !== true
  ) {
    throw new Error('Founder identity is not the verified staging-only fixture')
  }
}

async function createFixture(fixture) {
  const before = await getUser(fixture.id, `${fixture.label} preflight failed`)
  if (!before.error) {
    throw new Error(
      `Refused to overwrite existing Auth user ${fixture.id}; it is not owned by this run`,
    )
  }
  if (!isNotFound(before.error)) {
    throw safeError(`${fixture.label} preflight failed`, before.error)
  }

  cleanupCandidates.set(fixture.id, fixture.email)
  let creation
  let createFailure
  try {
    creation = await supabase.auth.admin.createUser({
      id: fixture.id,
      email: fixture.email,
      email_confirm: true,
      app_metadata: fixtureMetadata,
    })
    createFailure = creation.error
  } catch (error) {
    createFailure = error
  }

  const returnedId = creation?.data?.user?.id
  if (isUuid(returnedId) && returnedId !== fixture.id) {
    cleanupCandidates.set(returnedId, fixture.email)
  }

  const persisted = await getUser(
    fixture.id,
    `${fixture.label} creation reconciliation failed`,
  )
  if (persisted.error) {
    if (createFailure && isNotFound(persisted.error)) {
      throw safeError(`${fixture.label} was not created`, createFailure)
    }
    throw safeError(`${fixture.label} creation reconciliation failed`, persisted.error)
  }
  if (!matchesFixture(persisted.data?.user, fixture.id, fixture.email)) {
    throw new Error(
      `Persisted Auth user ${fixture.id} is not the exact marked fixture for this run`,
    )
  }
  if (returnedId && returnedId !== fixture.id) {
    throw new Error(
      `Auth UUID mismatch: requested ${fixture.id}, returned ${returnedId}`,
    )
  }

  if (createFailure) {
    console.warn(
      `WARN: ${fixture.label} create response was ambiguous; persisted identity verification succeeded`,
    )
  }
}

async function reconcileAndDelete(id, expectedEmail) {
  if (id === FOUNDER_ID) {
    manualInspection.add(id)
    cleanupProblems.push('Refused cleanup because a candidate matched the founder UUID')
    return
  }

  let lookup
  try {
    lookup = await supabase.auth.admin.getUserById(id)
  } catch (error) {
    manualInspection.add(id)
    cleanupProblems.push(safeError(`Cleanup lookup failed for ${id}`, error).message)
    return
  }

  if (lookup.error) {
    if (isNotFound(lookup.error)) return
    manualInspection.add(id)
    cleanupProblems.push(safeError(`Cleanup lookup failed for ${id}`, lookup.error).message)
    return
  }

  if (!matchesFixture(lookup.data?.user, id, expectedEmail)) {
    manualInspection.add(id)
    cleanupProblems.push(
      `Refused to delete ${id}: identity, timestamp, email, or fixture metadata did not match`,
    )
    return
  }

  let deleteFailure
  try {
    const deletion = await supabase.auth.admin.deleteUser(id)
    deleteFailure = deletion.error
  } catch (error) {
    deleteFailure = error
  }

  let afterDelete
  try {
    afterDelete = await supabase.auth.admin.getUserById(id)
  } catch (error) {
    manualInspection.add(id)
    cleanupProblems.push(
      safeError(`Post-delete verification failed for ${id}`, error).message,
    )
    return
  }

  if (afterDelete.error && isNotFound(afterDelete.error)) return

  manualInspection.add(id)
  if (afterDelete.error) {
    cleanupProblems.push(
      safeError(`Post-delete verification failed for ${id}`, afterDelete.error).message,
    )
  } else {
    cleanupProblems.push(`Cleanup could not be confirmed for ${id}; Auth user remains`)
  }
  if (deleteFailure) {
    cleanupProblems.push(safeError(`Delete request failed for ${id}`, deleteFailure).message)
  }
}

function tokenHash(label) {
  return createHash('sha256')
    .update(`${runId}:${label}:${randomUUID()}`, 'utf8')
    .digest('hex')
}

async function runSqlTests() {
  const childEnvironment = { ...process.env }
  for (const key of Object.keys(childEnvironment)) {
    if (/^PG/i.test(key) || /^SUPABASE_/i.test(key)) delete childEnvironment[key]
  }
  Object.assign(childEnvironment, {
    PGHOST: databaseHost,
    PGPORT: databasePort,
    PGDATABASE: databaseName,
    PGUSER: databaseUser,
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
    PGSSLMODE: sslMode,
    PGCONNECT_TIMEOUT: '10',
    PGAPPNAME: 'etsyhunter-m15-staging-rbac-integration',
  })

  const args = [
    '-X',
    '--no-psqlrc',
    '-v',
    'ON_ERROR_STOP=1',
    '-v',
    `staging_ref=${STAGING_REF}`,
    '-v',
    `founder_id=${FOUNDER_ID}`,
    '-v',
    `founder_email=${FOUNDER_EMAIL}`,
    '-v',
    `fixture_type=${FIXTURE_TYPE}`,
    '-v',
    `run_id=${runId}`,
    '-v',
    `fixture_a_id=${fixtures[0].id}`,
    '-v',
    `fixture_a_email=${fixtures[0].email}`,
    '-v',
    `fixture_b_id=${fixtures[1].id}`,
    '-v',
    `fixture_b_email=${fixtures[1].email}`,
    '-v',
    `mismatch_hash=${tokenHash('mismatch')}`,
    '-v',
    `replay_hash=${tokenHash('replay')}`,
    '-v',
    `invalid_hash=${tokenHash('invalid-permissions')}`,
    '-v',
    `limited_hash=${tokenHash('limited-invite')}`,
    '-f',
    SQL_PATH,
  ]

  await new Promise((resolve, reject) => {
    activePsql = spawn(psqlExecutable, args, {
      env: childEnvironment,
      stdio: 'inherit',
      windowsHide: true,
    })
    activePsql.once('error', error => reject(safeError('Unable to start psql', error)))
    activePsql.once('exit', (code, signal) => {
      activePsql = null
      if (interrupted || signal) {
        reject(new Error(`Transactional PostgreSQL tests were interrupted${signal ? ` by ${signal}` : ''}`))
      } else if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Transactional PostgreSQL tests failed with exit code ${code}`))
      }
    })
  })
}

const handleInterruption = () => {
  interrupted = true
  try {
    activePsql?.kill('SIGINT')
  } catch {
    // The exit handler still rejects because interrupted remains true.
  }
}
process.on('SIGINT', handleInterruption)
process.on('SIGTERM', handleInterruption)

const assertNotInterrupted = () => {
  if (interrupted) throw new Error('Harness was interrupted')
}

let primaryFailure
try {
  await verifyFounderFixture()
  assertNotInterrupted()
  for (const fixture of fixtures) {
    await createFixture(fixture)
    assertNotInterrupted()
  }
  await runSqlTests()
  assertNotInterrupted()
  console.log('PASS: all transactional M1.5 staging RBAC tests passed and rolled back')
} catch (error) {
  primaryFailure = error
} finally {
  for (const [id, expectedEmail] of cleanupCandidates) {
    await reconcileAndDelete(id, expectedEmail)
  }
  process.removeListener('SIGINT', handleInterruption)
  process.removeListener('SIGTERM', handleInterruption)
}

if (manualInspection.size > 0) {
  console.error(
    `MANUAL INSPECTION REQUIRED for staging UUID(s): ${[...manualInspection].join(', ')}`,
  )
  for (const problem of cleanupProblems) console.error(`- ${redact(problem)}`)
  throw new Error('Marked staging fixture cleanup could not be safely verified')
}

if (primaryFailure) throw primaryFailure
console.log(`PASS: verified cleanup for staging fixture run ${runId}`)
