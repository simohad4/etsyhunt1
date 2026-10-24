import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Reviewed local sources. Drift (including line endings) requires explicit review,
// never automatic acceptance of changed local or remote function implementations.
export const PARITY_SOURCES = Object.freeze({
  '20261010_etsyhunter_m1_foundation.sql': 'd22c75e8d07d85b7ad4b85a3e57b7174cf6d72ade75e9e51967b22ca065e47db',
  '20261011160000_etsyhunter_m1_p1b_security.sql': '20cf0a4b538326b7da7b1ea746e3b8c41165f8977ee4c1eb9920a175837984da',
  '20261011200000_etsyhunter_m2_research_lifecycle.sql': 'e914170e39aa9c0b4ed5e57eaff55e47dfe9b5968a50202d18628068ac216fbb'
});
export const PARITY_TABLES = Object.freeze([
  'auth.users', 'public.user_profiles', 'public.subscriptions', 'public.research_credit_accounts',
  'public.research_credit_operations', 'public.research_credit_ledger', 'public.research_jobs',
  'public.research_budget_windows', 'public.research_budget_liabilities', 'public.research_budget_reservations',
  'public.research_provider_attempts', 'public.research_results', 'public.research_history', 'public.research_provider_pricing'
]);
export const PARITY_TRIGGERS = Object.freeze([
  { table: 'auth.users', name: 'on_auth_user_created', fn: 'public.handle_new_user_signup()', type: 5 },
  { table: 'public.user_profiles', name: 'set_user_profile_updated_at', fn: 'public.touch_user_profile_updated_at()', type: 19 }
]);
export function readParitySources() {
  return Object.fromEntries(Object.keys(PARITY_SOURCES).map(name => [name,
    readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')]));
}
export function buildParityManifest(sources = readParitySources()) {
  for (const [name, hash] of Object.entries(PARITY_SOURCES)) {
    assert.equal(createHash('sha256').update(sources[name] ?? '').digest('hex'), hash, 'Reviewed migration source drift');
  }
  const functions = [];
  for (const sql of Object.values(sources)) {
    for (const match of sql.matchAll(/CREATE(?: OR REPLACE)? FUNCTION public\.(\w+)\(([\s\S]*?)\)\s*RETURNS (TRIGGER|JSONB)\s*([\s\S]*?)AS \$\$([\s\S]*?)\$\$;/g)) {
      const [, name, args, result, attributes, body] = match;
      if (!['handle_new_user_signup', 'touch_user_profile_updated_at', 'reserve_research_job',
        'begin_research_provider_attempt', 'finish_research_provider_attempt', 'mark_research_job_ambiguous',
        'complete_research_job', 'fail_research_job'].includes(name)) continue;
      const parameters = args.trim() ? args.split(',').map(p => p.trim().split(/\s+/)) : [];
      functions.push({ signature: `public.${name}(${parameters.map(p => p[1].toLowerCase()).join(',')})`,
        names: parameters.map(p => p[0]), defaults: parameters.filter(p => p.includes('DEFAULT')).length,
        result: result.toLowerCase(), definer: /SECURITY DEFINER/.test(attributes),
        body: body.replace(/\r\n/g, '\n').trim() });
    }
  }
  assert.equal(functions.length, 8, 'Incomplete function parity inventory');
  return { tables: PARITY_TABLES, triggers: PARITY_TRIGGERS, functions };
}

// Upstream Supabase Auth migration 20220224000811_update_auth_functions.up.sql.
// Only whitespace BETWEEN tokens may vary; quoted GUC names remain exact.
const uidExpression = "select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid";
const uidTokens = uidExpression.match(/'(?:''|[^'])*'|[a-z_]+|->>|::|[(),]/g);
export const AUTH_UID_PATTERN = '^\\s*' + uidTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*') + '\\s*;?\\s*$';

export function buildReadOnlyParitySql() {
  const manifest = JSON.stringify(buildParityManifest());
  assert.ok(!manifest.includes('$m36_manifest$'));
  const uidPattern = AUTH_UID_PATTERN.replaceAll("'", "''");
  return String.raw`
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog;
DO $m36_parity$
DECLARE
    expected jsonb := $m36_manifest$${manifest}$m36_manifest$::jsonb;
    item jsonb;
    t oid;
    p pg_catalog.pg_proc%ROWTYPE;
    trig pg_catalog.pg_trigger%ROWTYPE;
    expected_names text[];
    watched oid[] := ARRAY[]::oid[];
BEGIN
    IF current_setting('transaction_read_only') <> 'on' OR current_setting('default_transaction_read_only') <> 'on' THEN
        RAISE EXCEPTION 'M36 parity requires read-only mode';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(expected->'tables') LOOP
        t := to_regclass(item #>> '{}');
        IF t IS NULL OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=t AND relkind='r' AND NOT relispartition)
           OR EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid=t OR inhparent=t)
           OR EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class=t)
           OR EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=t AND NOT attisdropped AND attidentity <> '') THEN
            RAISE EXCEPTION 'M36 table shape or executable rule drift';
        END IF;
        watched := array_append(watched,t);
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(expected->'functions') LOOP
        SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure(item->>'signature');
        SELECT COALESCE(array_agg(value ORDER BY ord), ARRAY[]::text[]) INTO expected_names
            FROM jsonb_array_elements_text(item->'names') WITH ORDINALITY a(value,ord);
        IF p.oid IS NULL OR p.prokind <> 'f' OR p.proretset OR p.prosupport <> 0 OR p.proisstrict OR p.proleakproof
           OR p.proparallel <> 'u' OR p.protrftypes IS NOT NULL OR p.proargmodes IS NOT NULL
           OR p.prolang <> (SELECT oid FROM pg_language WHERE lanname='plpgsql')
           OR p.proowner <> 'postgres'::regrole OR p.prosecdef IS DISTINCT FROM (item->>'definer')::boolean
           OR p.provolatile <> 'v' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog']
           OR p.prorettype <> to_regtype(item->>'result') OR p.pronargdefaults <> (item->>'defaults')::integer
           OR COALESCE(p.proargnames,ARRAY[]::text[]) IS DISTINCT FROM expected_names
           OR btrim(replace(p.prosrc,E'\r\n',E'\n'),E' \t\r\n') IS DISTINCT FROM item->>'body'
           OR (p.pronargdefaults > 0 AND pg_get_expr(p.proargdefaults,0) !~ '^NULL::[a-z ]+(, NULL::[a-z ]+)*$') THEN
            RAISE EXCEPTION 'M36 reviewed function parity failed';
        END IF;
    END LOOP;
    SELECT * INTO p FROM pg_proc WHERE oid=to_regprocedure('auth.uid()');
    IF p.oid IS NULL OR p.prokind <> 'f' OR p.proretset OR p.prosupport <> 0 OR p.proisstrict OR p.proleakproof
       OR p.protrftypes IS NOT NULL OR p.proargmodes IS NOT NULL
       OR p.prolang <> (SELECT oid FROM pg_language WHERE lanname='sql') OR p.prosecdef
       OR p.provolatile <> 's' OR p.prorettype <> 'uuid'::regtype OR p.pronargdefaults <> 0
       OR p.proconfig IS NOT NULL OR p.proowner NOT IN ('postgres'::regrole,'supabase_auth_admin'::regrole)
       OR p.prosrc !~ '${uidPattern}' THEN
        RAISE EXCEPTION 'M36 Auth UID expression requires review';
    END IF;
    -- Reject extra triggers even if disabled; never waive unknown webhook hooks.
    FOR trig IN SELECT * FROM pg_trigger WHERE tgrelid=ANY(watched) LOOP
        IF trig.tgisinternal THEN
            IF NOT EXISTS (SELECT 1 FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace
                JOIN pg_constraint c ON c.oid=trig.tgconstraint
                WHERE f.oid=trig.tgfoid AND n.nspname='pg_catalog' AND c.contype='f'
                  AND f.proname ~ '^RI_FKey_' AND trig.tgconstrrelid <> 0) THEN
                RAISE EXCEPTION 'M36 unknown internal trigger';
            END IF;
        ELSIF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(expected->'triggers') e
            WHERE trig.tgrelid=to_regclass(e->>'table') AND trig.tgname=e->>'name'
              AND trig.tgfoid=to_regprocedure(e->>'fn') AND trig.tgtype=(e->>'type')::smallint
              AND trig.tgenabled='O' AND trig.tgnargs=0 AND octet_length(trig.tgargs)=0
              AND trig.tgqual IS NULL AND trig.tgattr::text='' AND NOT trig.tgdeferrable
              AND NOT trig.tginitdeferred AND trig.tgconstraint=0
              AND trig.tgoldtable IS NULL AND trig.tgnewtable IS NULL) THEN
            RAISE EXCEPTION 'M36 unexpected or changed application trigger';
        END IF;
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(expected->'triggers') LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(item->>'table')
            AND tgname=item->>'name' AND NOT tgisinternal) THEN
            RAISE EXCEPTION 'M36 expected trigger missing';
        END IF;
    END LOOP;
    -- DDL expressions (including defaults, generated columns, checks, indexes,
    -- and RLS) must not reach extension/user code, sequences or custom operators.
    IF EXISTS (
        WITH objects AS (
            SELECT 'pg_attrdef'::regclass AS cls, oid AS obj FROM pg_attrdef WHERE adrelid=ANY(watched)
            UNION ALL SELECT 'pg_constraint'::regclass,oid FROM pg_constraint WHERE conrelid=ANY(watched)
            UNION ALL SELECT 'pg_class'::regclass,indexrelid FROM pg_index WHERE indrelid=ANY(watched)
            UNION ALL SELECT 'pg_policy'::regclass,oid FROM pg_policy WHERE polrelid=ANY(watched)
        )
        SELECT 1 FROM objects o JOIN pg_depend d ON d.classid=o.cls AND d.objid=o.obj
        LEFT JOIN pg_proc f ON d.refclassid='pg_proc'::regclass AND f.oid=d.refobjid
        LEFT JOIN pg_operator op ON d.refclassid='pg_operator'::regclass AND op.oid=d.refobjid
        LEFT JOIN pg_class rel ON d.refclassid='pg_class'::regclass AND rel.oid=d.refobjid
        WHERE (f.oid IS NOT NULL AND f.oid <> to_regprocedure('auth.uid()') AND
            (f.pronamespace <> 'pg_catalog'::regnamespace
             OR f.prolang <> (SELECT oid FROM pg_language WHERE lanname='internal') OR f.probin IS NOT NULL OR f.proname NOT IN
                ('gen_random_uuid','now','timezone','current_setting','jsonb_typeof','char_length','length','btrim','lower')))
           OR (op.oid IS NOT NULL AND (op.oprnamespace <> 'pg_catalog'::regnamespace
               OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=op.oprcode AND pronamespace='pg_catalog'::regnamespace)))
           OR rel.relkind='S'
    ) OR EXISTS (SELECT 1 FROM pg_attribute a JOIN pg_type ty ON ty.oid=a.atttypid
        WHERE a.attrelid=ANY(watched) AND a.attnum>0 AND NOT a.attisdropped AND ty.typnamespace <> 'pg_catalog'::regnamespace)
      OR EXISTS (SELECT 1 FROM pg_index i JOIN pg_opclass oc ON oc.oid=ANY(i.indclass)
        JOIN pg_am am ON am.oid=oc.opcmethod WHERE i.indrelid=ANY(watched)
          AND (oc.opcnamespace <> 'pg_catalog'::regnamespace OR am.amname NOT IN ('btree','hash','gist','spgist','gin','brin'))) THEN
        RAISE EXCEPTION 'M36 executable schema dependency requires review';
    END IF;
END;
$m36_parity$;
ROLLBACK;
`;
}
