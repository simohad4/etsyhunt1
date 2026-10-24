\set ON_ERROR_STOP on
\set ECHO none
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';
SET LOCAL search_path = pg_catalog;
DO $preflight$
DECLARE
    signature TEXT;
    fn OID;
    table_name TEXT;
BEGIN
    IF pg_catalog.current_database() <> 'postgres' OR session_user <> 'postgres'
       OR pg_catalog.current_setting('transaction_read_only') <> 'on'
       OR current_setting('m36.client_tls_verified', true) IS DISTINCT FROM 'verify-full'
       OR COALESCE(current_setting('m36.connection_kind', true), '') NOT IN ('direct', 'session_pooler')
       OR (current_setting('m36.connection_kind', true) = 'direct'
           AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_stat_ssl WHERE pid = pg_catalog.pg_backend_pid() AND ssl)) THEN
        RAISE EXCEPTION 'M36 connection safety check failed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261011200000') THEN
        RAISE EXCEPTION 'M36 requires already-applied M2; harness never applies migrations';
    END IF;
    FOREACH signature IN ARRAY ARRAY[
        'reserve_research_job(uuid,uuid,text,integer,integer,text,text,text,text)',
        'begin_research_provider_attempt(uuid,uuid,uuid,text,text,integer,text)',
        'finish_research_provider_attempt(uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,text)',
        'mark_research_job_ambiguous(uuid,uuid,text)',
        'complete_research_job(uuid,uuid,uuid,uuid,text,jsonb,integer,timestamptz,text,jsonb,text,timestamptz)',
        'fail_research_job(uuid,uuid,text)'
    ] LOOP
        fn := pg_catalog.to_regprocedure('public.' || signature);
        IF fn IS NULL OR NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_proc
            WHERE oid = fn AND prosecdef AND prorettype = 'jsonb'::regtype
              AND proowner = 'postgres'::regrole
              AND proconfig @> ARRAY['search_path=pg_catalog']
        ) THEN
            RAISE EXCEPTION 'M36 RPC contract or definer drift';
        END IF;
        IF pg_catalog.has_function_privilege('anon', fn, 'EXECUTE')
           OR pg_catalog.has_function_privilege('authenticated', fn, 'EXECUTE')
           OR NOT pg_catalog.has_function_privilege('service_role', fn, 'EXECUTE') THEN
            RAISE EXCEPTION 'M36 RPC privilege drift';
        END IF;
    END LOOP;
    IF pg_catalog.has_function_privilege('service_role', 'public.reserve_research_credits(uuid,uuid,text,integer)', 'EXECUTE')
       OR pg_catalog.has_function_privilege('service_role', 'public.finalize_research_credits(uuid,uuid,text,integer,text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'M36 legacy RPC unexpectedly callable';
    END IF;
    FOREACH table_name IN ARRAY ARRAY[
        'research_provider_pricing', 'research_budget_windows', 'research_budget_liabilities',
        'research_jobs', 'research_budget_reservations', 'research_provider_attempts', 'research_results'
    ] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid = pg_catalog.to_regclass('public.' || table_name) AND relrowsecurity) THEN
            RAISE EXCEPTION 'M36 RLS disabled or table missing';
        END IF;
        IF pg_catalog.has_table_privilege('anon', 'public.' || table_name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
           OR pg_catalog.has_any_column_privilege('anon', 'public.' || table_name, 'SELECT,INSERT,UPDATE')
           OR pg_catalog.has_table_privilege('authenticated', 'public.' || table_name, 'INSERT,UPDATE,DELETE,TRUNCATE')
           OR pg_catalog.has_any_column_privilege('authenticated', 'public.' || table_name, 'INSERT,UPDATE') THEN
            RAISE EXCEPTION 'M36 browser mutation privilege drift';
        END IF;
        IF table_name IN ('research_jobs', 'research_results') THEN
            IF NOT pg_catalog.has_table_privilege('authenticated', 'public.' || table_name, 'SELECT') THEN
                RAISE EXCEPTION 'M36 browser read grant missing';
            END IF;
        ELSIF pg_catalog.has_any_column_privilege('authenticated', 'public.' || table_name, 'SELECT') THEN
            RAISE EXCEPTION 'M36 internal table exposed';
        END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM public.research_provider_pricing WHERE NOT activation_blocked)
       OR NOT EXISTS (
           SELECT 1 FROM public.research_provider_pricing
           WHERE version_key = '2026-10-11.unverified-v1' AND activation_blocked
             AND apify_micro_usd_per_billing_unit IS NULL AND apify_fixed_run_micro_usd IS NULL
             AND openrouter_input_micro_usd_per_million_tokens IS NULL
             AND openrouter_output_micro_usd_per_million_tokens IS NULL
       ) THEN
        RAISE EXCEPTION 'M36 pricing activation boundary changed';
    END IF;
END;
$preflight$;
ROLLBACK;
\echo M36_PREFLIGHT_OK
