import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

// Static text/lexical contracts only. This file never parses with PostgreSQL, connects or runs SQL.
const doc = readFileSync('docs/research-s1-final-readonly-worksheet.md', 'utf8');
const entries = [...doc.matchAll(/^### ([A-Z0-9-]+) — [^\n]*\n([\s\S]*?)\x60\x60\x60sql\n([\s\S]*?)\n\x60\x60\x60/gm)];
const blocks = new Map(entries.map(match => [match[1], { context: match[2], sql: match[3] }]));
const QUERY_IDS = ["P0","Q1","Q1-CATALOGS","Q2","Q3","Q4","Q4-ACL","Q5","Q6","Q6-BUILTIN","Q8","Q8-ACL","Q9","Q9-ACL","Q10","Q10-ACL","Q11","Q11-EVENT","Q11-DEPEND","Q12","M13","M14","M15-COLUMNS","M15-POLICIES","M16-INHERITANCE","M16-FRONTIER","M16","M16-SHARED","M16-UNRESOLVED"] as const;
function query(id: string): string {
  const block = blocks.get(id); assert.ok(block, `Missing worksheet block ${id}`); return block.sql;
}
function includes(...requirements: string[]): void {
  for (const requirement of requirements) assert.ok(doc.includes(requirement), `Missing worksheet rule: ${requirement}`);
}
function literalsRemoved(sql: string): string {
  return sql.replace(/'(?:''|[^'])*'/gs, "''").replace(/"(?:""|[^"])*"/gs, '""');
}

test('B10 inventory contains exactly the approved SELECT IDs and explicit session controls, excluding Q7', () => {
  assert.deepEqual([...blocks.keys()], ['CONTROL-OPEN', ...QUERY_IDS, 'CONTROL-CLOSE']);
  assert.equal(entries.length, blocks.size);
  assert.equal(QUERY_IDS.length, 29);
  assert.equal(blocks.has('Q7'), false);
  includes('Q7 is excluded entirely', 'NOT EXECUTED — FUTURE APPROVAL REQUIRED',
    'ba4aa45f1507e3d8de799f9098654ad1acd36000', 'has NOT been parsed or executed by PostgreSQL',
    'activationBlocked=true', 'executionAuthorized=false', 'automaticRetryAllowed=false',
    'requiresAuthoritativeDatabaseValidation=true', 'HTTP 503 unchanged');
});

test('B10 catalog statements are single SELECT/WITH statements with no writes locks execution or dynamic SQL', () => {
  for (const id of QUERY_IDS) {
    const sql = query(id), stripped = literalsRemoved(sql);
    assert.match(sql, /^(?:SELECT|WITH)\b/, id);
    assert.equal((stripped.match(/;/g) ?? []).length, 1, id);
    assert.ok(stripped.trimEnd().endsWith(';'), id);
    assert.doesNotMatch(stripped, /\b(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|CREATE|ALTER|DROP|CALL|DO|COPY|GRANT|REVOKE|COMMIT|EXECUTE|PREPARE|RESET|SET)\b/i, id);
    assert.doesNotMatch(stripped, /\bSELECT\s+(?:\w+\.)?\*|\bSELECT\b[\s\S]*?\bINTO\b|\bFOR\s+(?:UPDATE|SHARE)\b/i, id);
    assert.match(sql, /LIMIT 1001;$/, id);
    assert.ok(blocks.get(id)!.context.includes('Expected columns:'), id);
    assert.ok(blocks.get(id)!.context.includes('Dependencies/parameters:'), id);
  }
});

test('B10 controls only initialize read-only and timeouts, begin repeatable read and roll back', () => {
  assert.equal(query('CONTROL-OPEN'), [
    'SET SESSION default_transaction_read_only = on;',
    "SET SESSION statement_timeout = '30s';",
    "SET SESSION lock_timeout = '3s';",
    'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;',
    'SET LOCAL search_path = pg_catalog;'
  ].join('\n'));
  assert.equal(query('CONTROL-CLOSE'), 'ROLLBACK;');
  includes('no unsafe reset to writable mode', 'In a failed transaction, do not continue SELECTs',
    'No automatic elevation, SQL/transport retry', 'cleanup UNKNOWN');
});

test('B10 metadata reads and builtin calls are schema-qualified and never reference customer relations', () => {
  const local = new Set(['p', 'spec', 'a', 'seed', 'walk', 'nodes', 'wanted', 'types', 'frontier', 'edges']);
  const builtin = new Set(['jsonb_typeof', 'jsonb_object_keys', 'jsonb_array_length', 'jsonb_array_elements',
    'jsonb_array_elements_text', 'cardinality', 'count', 'length', 'octet_length', 'sum', 'current_database',
    'current_setting', 'has_table_privilege', 'has_schema_privilege', 'pg_has_role', 'unnest', 'aclexplode',
    'acldefault', 'has_function_privilege', 'has_column_privilege', 'jsonb_to_recordset', 'row_number',
    'string_agg', 'min']);
  for (const id of QUERY_IDS) {
    const sql = query(id);
    for (const match of sql.matchAll(/\b(?:FROM|JOIN)\s+(?:LATERAL\s+)?([a-z_][a-z0-9_]*)(?:\.([a-z_][a-z0-9_]*))?/gi)) {
      assert.ok(match[1] === 'pg_catalog' || local.has(match[1]), `${id}: unexpected source ${match[0]}`);
    }
    for (const match of sql.matchAll(/pg_catalog\.([a-z_]+)\s*\(/g)) {
      assert.ok(builtin.has(match[1]), `${id}: unreviewed builtin ${match[1]}`);
    }
    assert.doesNotMatch(sql, /::(?!pg_catalog\.)[a-z_]/i, id);
    assert.doesNotMatch(sql, /\b(?:public|auth)\./i, id);
  }
});

test('B10 P0 enforces exact metadata keys explicit types duplicate flags and aggregate budgets', () => {
  const p0 = query('P0');
  for (const key of ['roles', 'function_names', 'schemas', 'relation_oids', 'function_oids', 'owner_oids', 'expected', 'frontier']) {
    assert.ok(p0.includes(`'${key}'`));
  }
  for (const fragment of ['exact_manifest_keys', 'byte_limit_ok', 'total_oid_bound_ok', 'total_identity_seed_bound_ok',
    'array_bound_ok', 'no_duplicate_items', 'element_shapes_ok', '<= 262144', '<= 512', '<= 64',
    '4294967295', '2147483647', 'BETWEEN 0 AND 16', 'COLLATE pg_catalog."C"']) assert.ok(p0.includes(fragment), fragment);
  includes('duplicate raw JSON keys rejected', 'no duplicate names/OIDs or expected semantic identities',
    'P0 must run against the SAME reviewed manifest', 'EXACTLY eight expected keys',
    'No parser/client/harness is provided here', 'total_identity_seed_bound_ok', 'no NULL');
});

test('B10 scalar role binding cannot escape manifest and missing roles produce unknown not denial', () => {
  for (const id of ['Q5', 'Q8', 'Q9', 'Q10']) {
    assert.ok(query(id).includes("($1::pg_catalog.jsonb -> 'roles') ? ($2::pg_catalog.text)"));
    assert.match(query(id), /LEFT JOIN pg_catalog\.pg_roles/);
    assert.match(query(id), /CASE WHEN/);
  }
  includes('invalid/unknown $2 is INVALID_PARAMETERS', 'Missing role/function cannot yield a deny PASS',
    'Match statement arity', 'protocol parameters', 'never psql text substitution');
});

test('B10 bootstrap is bounded metadata-only with empty OIDs and exact committed M2 input signatures', () => {
  const block = /```json\n([\s\S]*?)\n```/.exec(doc); assert.ok(block);
  const seed = JSON.parse(block[1]) as { roles: string[]; function_names: string[]; schemas: string[];
    relation_oids: number[]; function_oids: number[]; owner_oids: number[]; frontier: unknown[];
    expected: { kind: string; schema_name: string; object_name: string | null; argument_types: string[] }[] };
  assert.equal(seed.roles.length + seed.function_names.length <= 64, true);
  assert.ok(seed.schemas.length <= 32 && seed.expected.length <= 512);
  for (const list of [seed.relation_oids, seed.function_oids, seed.owner_oids, seed.frontier]) assert.deepEqual(list, []);
  const migration = readFileSync('supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql', 'utf8');
  const aliases: Record<string, string> = { integer: 'int4', bigint: 'int8' };
  const definitions = [...migration.matchAll(/CREATE FUNCTION public\.(\w+)\(([\s\S]*?)\)\s*RETURNS JSONB/g)];
  assert.equal(definitions.length, 6);
  for (const [, name, args] of definitions) {
    const expected = seed.expected.find(row => row.kind === 'function' && row.schema_name === 'public' && row.object_name === name);
    assert.ok(expected, name);
    assert.deepEqual(expected.argument_types, args.split(',').map(arg => {
      const type = arg.trim().split(/\s+/)[1].toLowerCase(); return aliases[type] ?? type;
    }));
  }
  includes('NOT logins/objects to create', 'queries read ONLY pg_catalog structure');
});

test('B10 PG17 version and recursive membership use bounded visit states and separate SET INHERIT ADMIN semantics', () => {
  const q3 = query('Q3');
  assert.match(q3, /WITH RECURSIVE/); assert.match(q3, /w\.depth<16/);
  assert.match(q3, /\bUNION\b/); assert.doesNotMatch(q3, /UNION ALL|w\.path/);
  for (const flag of ['admin_option', 'inherit_option', 'set_option', "'MEMBER'", "'USAGE'", "'SET'", 'depth_limited']) {
    assert.ok(q3.includes(flag), flag);
  }
  includes('version 170000..179999', 'encoding UTF8', 'ADMIN is an edge privilege, not transitive authority',
    'LIMIT is not a CPU bound', '17 only');
  assert.ok(query('Q9').includes("'MAINTAIN'"));
});

test('B10 ACL metadata is separate from effective booleans and preserves empty/default grants', () => {
  for (const id of ['Q4-ACL', 'Q6', 'Q6-BUILTIN', 'Q8-ACL', 'Q9-ACL', 'Q10-ACL']) {
    assert.match(query(id), /LEFT JOIN LATERAL pg_catalog\.aclexplode/);
  }
  for (const id of ['Q5', 'Q8', 'Q9', 'Q10']) assert.doesNotMatch(query(id), /aclexplode|CROSS JOIN/);
  includes('schema defaults add to applicable global defaults', 'PUBLIC is grantee=0',
    'has_column_privilege includes applicable table grants', 'Schema OID 0 intentionally',
    'Missing pg_default_acl rows never imply no PUBLIC EXECUTE');
  assert.ok(query('Q6-BUILTIN').includes("('L')"));
});

test('B10 exact object resolution avoids supplied reg casts and prevents unresolved type/array-dimension false absence', () => {
  const q12 = query('Q12');
  assert.doesNotMatch(q12, /to_regclass|to_regprocedure|::pg_catalog\.regprocedure/);
  for (const fragment of ['TYPE_UNRESOLVED', 'NOT_FOUND', 'CATALOG_PRESENT', 'operator_schema_usage',
    'p.proargtypes::pg_catalog.text=ty.input_oid_vector']) assert.ok(q12.includes(fragment));
  includes('int4/int8, not SQL aliases integer/bigint', '0-based vs ARRAY 1-based',
    'INACCESSIBLE/UNKNOWN', 'CATALOG_PRESENT with no schema USAGE', 'Existing required M2 drift stops');
});

test('B10 trigger constraints index and policy queries include structural safety fields without expression contents', () => {
  for (const field of ['tgtype', 'tgenabled', 'tgisinternal', 'tgconstraint', 'tgparentid', 'tgnargs',
    'tgconstrrelid', 'tgconstrindid', 'tgdeferrable', 'tginitdeferred']) assert.ok(query('Q11').includes(field));
  assert.doesNotMatch(query('Q11'), /WHERE[\s\S]*(?:NOT\s+t\.tgisinternal|t\.tgenabled\s*=)/);
  for (const field of ['conkey', 'confkey', 'confupdtype', 'confdeltype', 'confdelsetcols', 'convalidated',
    'condeferrable', 'condeferred', 'conindid', 'conparentid']) assert.ok(query('M13').includes(field));
  assert.ok(query('M13').includes('OR c.confrelid IN'));
  for (const field of ['indisunique', 'indnullsnotdistinct', 'indisvalid', 'indisready', 'indislive',
    'indnkeyatts', 'has_predicate', 'has_expression']) assert.ok(query('M14').includes(field));
  assert.ok(query('M15-COLUMNS').includes('attnotnull'));
  assert.ok(query('M15-POLICIES').includes('polroles'));
  assert.ok(query('Q11-EVENT').includes('pg_catalog.pg_event_trigger'));
  assert.ok(query('Q11-EVENT').includes('evtfoid'));
  assert.ok(query('M16-INHERITANCE').includes('pg_catalog.pg_inherits'));
  assert.ok(query('M16-INHERITANCE').includes('OR i.inhparent IN'));
  assert.ok(query('M16-INHERITANCE').includes('inhdetachpending'));
});

test('B10 dependency closure is existence-checked one-hop both directions with shared edges and unresolved receipts', () => {
  assert.ok(query('M16-FRONTIER').includes('AS object_present'));
  assert.ok(query('M16-FRONTIER').includes('NOT a.attisdropped'));
  const closure = query('M16');
  for (const fragment of ["'outgoing'", "'incoming'", 'objsubid', 'refobjsubid', 'depth=16 AS at_depth_limit']) {
    assert.ok(closure.includes(fragment), fragment);
  }
  assert.ok(query('M16-SHARED').includes('pg_catalog.pg_shdepend'));
  assert.ok(query('M16-SHARED').includes('d.dbid=0 OR'));
  assert.ok(query('M16-UNRESOLVED').includes('REQUIRES_APPROVED_DEFINITION_AND_DYNAMIC_DEPENDENCY_MANIFEST'));
  includes('cumulative <=512 addresses', 'never queue depth 17', 'No function body or expression is returned',
    'namespace is pg_catalog', 'explicit prior approved manifest receipt', 'DEPTH_LIMIT/BLOCKED',
    'DEPENDENCY_UNRESOLVED');
});

test('B10 no query exports secret catalogs bodies expressions trigger args or activity diagnostics', () => {
  for (const id of QUERY_IDS) {
    const sql = query(id);
    assert.doesNotMatch(sql, /pg_authid|pg_stat_activity|pg_blocking_pids|rolpassword|prosrc|probin|tgargs|pg_get_expr|pg_get_functiondef|pg_get_triggerdef|set_config|pg_read_file|pg_sleep|dblink|http_/i, id);
    for (const match of sql.matchAll(/\b(?:polqual|polwithcheck|conbin|adbin|indpred|indexprs|tgqual)\b/gi)) {
      assert.match(sql.slice(match.index! + match[0].length), /^\s+IS NOT NULL/, `${id}: raw expression export`);
    }
  }
  includes('Escape metadata names as inert JSON/text', 'No passwords, connection strings', 'raw database errors',
    'No credential catalog or large-object content access');
});

test('B10 output completeness stop rules and rollback cannot turn unknown or truncation into a passing baseline', () => {
  includes('A 1001st row', 'TRUNCATED/BLOCKED', 'at most 1000 usable rows',
    '1 MiB/query and 16 KiB/row', 'No silent filtering or auto-pagination',
    'STOP. No automatic elevation', 'Explicit rollback', 'Discovery is not M4.8 authority acceptance',
    'No query result proves locks/deadlock freedom', 'No Supabase connection in B10');
});

test('B10 adds only documentation/test coverage and no migration or runtime behavior claims', () => {
  const files = readdirSync('supabase/migrations', { withFileTypes: true });
  assert.ok(files.every(file => file.isFile()));
  assert.deepEqual(files.map(file => file.name).sort(), [
    '20261010_etsyhunter_m1_foundation.sql', '20261011160000_etsyhunter_m1_p1b_security.sql',
    '20261011170000_etsyhunter_m1_existing_users_backfill.sql', '20261011180000_etsyhunter_m15_admin_rbac.sql',
    '20261011200000_etsyhunter_m2_research_lifecycle.sql'
  ].sort());
  includes('No executable migration', 'no SQL parser/runtime certification', 'separate exact S1 execution approval');
});
