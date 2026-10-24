\set ON_ERROR_STOP on
\set ECHO none
-- Session variables are local bookkeeping, not durable fixtures.
SELECT pg_catalog.gen_random_uuid() AS fixture_a, pg_catalog.gen_random_uuid() AS fixture_b,
       pg_catalog.gen_random_uuid() AS req_a, pg_catalog.gen_random_uuid() AS req_b,
       pg_catalog.gen_random_uuid() AS req_c, pg_catalog.gen_random_uuid() AS req_d,
       pg_catalog.gen_random_uuid() AS fresh_id, pg_catalog.gen_random_uuid() AS global_id,
       pg_catalog.gen_random_uuid() AS account_id
\gset
SELECT pg_catalog.set_config('m36.a', :'fixture_a', false),
       pg_catalog.set_config('m36.b', :'fixture_b', false),
       pg_catalog.set_config('m36.ra', :'req_a', false),
       pg_catalog.set_config('m36.rb', :'req_b', false),
       pg_catalog.set_config('m36.rc', :'req_c', false),
       pg_catalog.set_config('m36.rd', :'req_d', false),
       pg_catalog.set_config('m36.fresh', :'fresh_id', false),
       pg_catalog.set_config('m36.global', :'global_id', false),
       pg_catalog.set_config('m36.account', :'account_id', false);
SELECT pg_catalog.md5(COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) ORDER BY version_key)::text, '[]')) AS pricing_before
FROM public.research_provider_pricing p
\gset
BEGIN READ WRITE;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';
SET LOCAL search_path = pg_catalog;
DO $guard$
BEGIN
    IF session_user <> 'postgres' OR pg_catalog.current_database() <> 'postgres'
       OR current_setting('m36.client_tls_verified', true) IS DISTINCT FROM 'verify-full'
       OR COALESCE(current_setting('m36.connection_kind', true), '') NOT IN ('direct', 'session_pooler')
       OR (current_setting('m36.connection_kind', true) = 'direct'
           AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_stat_ssl WHERE pid = pg_catalog.pg_backend_pid() AND ssl))
       OR EXISTS (SELECT 1 FROM auth.users WHERE id IN (current_setting('m36.a')::uuid, current_setting('m36.b')::uuid))
       OR EXISTS (SELECT 1 FROM public.research_credit_operations WHERE request_id IN (
           current_setting('m36.ra')::uuid, current_setting('m36.rb')::uuid,
           current_setting('m36.rc')::uuid, current_setting('m36.rd')::uuid, current_setting('m36.fresh')::uuid))
       OR EXISTS (SELECT 1 FROM public.research_provider_pricing WHERE NOT activation_blocked) THEN
        RAISE EXCEPTION 'M36 fixture safety guard failed';
    END IF;
END;
$guard$;
-- Auth signup trigger initializes only these random, transaction-owned users.
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT id, 'm36-' || id::text || '@staging.invalid',
       '{"m36_synthetic":true,"project_ref":"iwqnyqaefovhvnunarfa"}'::jsonb,
       '{}'::jsonb, now(), now()
FROM (VALUES (current_setting('m36.a')::uuid), (current_setting('m36.b')::uuid)) u(id);
DO $initialization$
BEGIN
    IF (SELECT count(*) FROM public.research_credit_accounts WHERE user_id IN (current_setting('m36.a')::uuid,current_setting('m36.b')::uuid)) <> 2
       OR (SELECT count(*) FROM public.subscriptions WHERE user_id IN (current_setting('m36.a')::uuid,current_setting('m36.b')::uuid)) <> 2
       OR EXISTS (SELECT 1 FROM public.research_credit_accounts WHERE user_id IN (current_setting('m36.a')::uuid,current_setting('m36.b')::uuid) AND credits_remaining <> 0) THEN
        RAISE EXCEPTION 'Signup fixture initialization drift';
    END IF;
END;
$initialization$;
UPDATE public.subscriptions SET plan_tier = 'starter', status = 'active',
    current_period_start = now() - interval '1 day', current_period_end = now() + interval '1 day'
WHERE user_id = current_setting('m36.a')::uuid;
-- Synthetic balance after four historical reservations; never a real grant.
UPDATE public.research_credit_accounts SET credits_remaining = 16, monthly_allowance = 20,
    credit_period_start = now() - interval '1 day', credit_period_end = now() + interval '1 day', credit_generation = 1
WHERE user_id = current_setting('m36.a')::uuid;
DO $pricing_denial$
BEGIN
    BEGIN
        PERFORM public.reserve_research_job(current_setting('m36.fresh')::uuid, current_setting('m36.a')::uuid,
            'M36 synthetic', 1, 1, repeat('a',64), '2026-10-11.unverified-v1',
            'yumitori/etsy-listings-scraper', 'google/gemini-3.1-flash-lite');
        RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'Blocked pricing unexpectedly admitted research';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM <> 'provider pricing is not verified' THEN RAISE; END IF;
    END;
    IF EXISTS (SELECT 1 FROM public.research_credit_operations WHERE request_id = current_setting('m36.fresh')::uuid)
       OR (SELECT credits_remaining FROM public.research_credit_accounts WHERE user_id = current_setting('m36.a')::uuid) IS DISTINCT FROM 16 THEN
        RAISE EXCEPTION 'Pricing denial changed credits or operation state';
    END IF;
END;
$pricing_denial$;
-- Historical-state fixtures only. No rate card is inserted, updated or activated.
INSERT INTO public.research_credit_operations (
    request_id, user_id, keyword, pages_requested, credits_amount, status, balance_after_reservation,
    request_fingerprint, maximum_listings, pricing_version, estimated_provider_cost_micro_usd,
    credit_period_start, credit_period_end, credit_account_generation, refund_disposition
)
SELECT r, current_setting('m36.a')::uuid, 'M36 synthetic', 1, 1, 'reserved', 16,
    repeat('a',64), 1, '2026-10-11.unverified-v1', 200,
    now()-interval '1 day', now()+interval '1 day', 1, 'pending'
FROM unnest(ARRAY[current_setting('m36.ra')::uuid,current_setting('m36.rb')::uuid,
    current_setting('m36.rc')::uuid,current_setting('m36.rd')::uuid]) r;
INSERT INTO public.research_jobs (
    request_id,user_id,request_schema_version,request_fingerprint,keyword,pages_requested,maximum_listings,credits_reserved,
    credit_period_start,credit_period_end,credit_account_generation,apify_actor,openrouter_model,pricing_version,
    apify_billable_units_per_requested_listing,apify_max_attempts,apify_estimated_cost_per_attempt_micro_usd,
    openrouter_max_input_tokens,openrouter_max_output_tokens,openrouter_max_attempts,openrouter_estimated_cost_per_attempt_micro_usd,
    estimated_provider_cost_micro_usd,provider_spending_limit_micro_usd,status
)
SELECT request_id,user_id,'research-request-v1',request_fingerprint,keyword,1,1,1,
    credit_period_start,credit_period_end,1,'yumitori/etsy-listings-scraper','google/gemini-3.1-flash-lite',pricing_version,
    1,2,50,33280,2048,2,50,200,120000,'reserved'
FROM public.research_credit_operations WHERE user_id=current_setting('m36.a')::uuid;
INSERT INTO public.research_credit_ledger (
    user_id,amount,balance_after,action_type,description,request_id,credit_period_start,credit_period_end,credit_account_generation
)
SELECT user_id,-1,16,'deduction_query','M36 rollback-only synthetic reservation',request_id,
       credit_period_start,credit_period_end,credit_account_generation
FROM public.research_credit_operations WHERE user_id=current_setting('m36.a')::uuid;
-- Unique historical windows avoid touching any active global budget.
INSERT INTO public.research_budget_windows (id,scope_type,user_id,period_start,period_end,cap_micro_usd,reserved_micro_usd)
VALUES (current_setting('m36.global')::uuid,'global',NULL,now()-interval '100 years',now()-interval '99 years',1000,800),
       (current_setting('m36.account')::uuid,'account',current_setting('m36.a')::uuid,now()-interval '100 years',now()-interval '99 years',1000,800);
INSERT INTO public.research_budget_reservations (request_id,user_id,global_window_id,account_window_id,reserved_micro_usd,status)
SELECT request_id,user_id,current_setting('m36.global')::uuid,current_setting('m36.account')::uuid,200,'reserved'
FROM public.research_jobs WHERE user_id=current_setting('m36.a')::uuid;
DO $idempotency$
DECLARE result jsonb;
BEGIN
    result := public.reserve_research_job(current_setting('m36.ra')::uuid,current_setting('m36.a')::uuid,
        'M36 synthetic',1,1,repeat('a',64),'2026-10-11.unverified-v1','yumitori/etsy-listings-scraper','google/gemini-3.1-flash-lite');
    IF result->>'idempotent' IS DISTINCT FROM 'true' OR result->>'status' IS DISTINCT FROM 'reserved'
       OR (SELECT credits_remaining FROM public.research_credit_accounts WHERE user_id=current_setting('m36.a')::uuid) IS DISTINCT FROM 16
       OR (SELECT count(*) FROM public.research_credit_ledger WHERE user_id=current_setting('m36.a')::uuid) <> 4 THEN
        RAISE EXCEPTION 'Reservation replay changed accounting';
    END IF;
END;
$idempotency$;
DO $idempotency_mismatch$
BEGIN
    BEGIN
        PERFORM public.reserve_research_job(current_setting('m36.ra')::uuid,current_setting('m36.a')::uuid,
            'changed',1,1,repeat('b',64),'2026-10-11.unverified-v1','yumitori/etsy-listings-scraper','google/gemini-3.1-flash-lite');
        RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='Changed replay accepted';
    EXCEPTION WHEN SQLSTATE '22023' THEN
        IF SQLERRM <> 'idempotency key was already used with different request data' THEN RAISE; END IF;
    END;
END;
$idempotency_mismatch$;
-- Actual service-role privileges exercise RPCs; fixture DML remains owner-only.
SET LOCAL ROLE service_role;
SELECT public.begin_research_provider_attempt(current_setting('m36.ra')::uuid,current_setting('m36.ra')::uuid,
    current_setting('m36.a')::uuid,'apify','yumitori/etsy-listings-scraper',1,'m36-apify-'||current_setting('m36.ra'));
DO $inflight_denial$
BEGIN
    BEGIN
        PERFORM public.fail_research_job(current_setting('m36.ra')::uuid,current_setting('m36.a')::uuid,'timeout');
        RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='In-flight research refunded';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM <> 'in-flight provider attempt requires ambiguous reconciliation' THEN RAISE; END IF;
    END;
END;
$inflight_denial$;
SELECT public.finish_research_provider_attempt(current_setting('m36.ra')::uuid,current_setting('m36.ra')::uuid,
    current_setting('m36.a')::uuid,'succeeded','m36-synthetic',NULL,NULL,NULL,1,50,'m36-apify-'||current_setting('m36.ra'));
SELECT public.begin_research_provider_attempt(current_setting('m36.rb')::uuid,current_setting('m36.ra')::uuid,
    current_setting('m36.a')::uuid,'openrouter','google/gemini-3.1-flash-lite',1,'m36-model-'||current_setting('m36.ra'));
SELECT public.finish_research_provider_attempt(current_setting('m36.rb')::uuid,current_setting('m36.ra')::uuid,
    current_setting('m36.a')::uuid,'succeeded','m36-synthetic',NULL,1,1,NULL,50,'m36-model-'||current_setting('m36.ra'));
DO $completion$
DECLARE result jsonb;
BEGIN
    result := public.complete_research_job(current_setting('m36.ra')::uuid,current_setting('m36.a')::uuid,
        current_setting('m36.ra')::uuid,current_setting('m36.rb')::uuid,'m36-synthetic',
        '{"synthetic":true}'::jsonb,1,now(),'m36-synthetic','{"synthetic":true}'::jsonb,'m36-synthetic',now());
    IF result->>'status' IS DISTINCT FROM 'succeeded' THEN RAISE EXCEPTION 'Completion failed'; END IF;
    result := public.complete_research_job(current_setting('m36.ra')::uuid,current_setting('m36.a')::uuid,
        current_setting('m36.ra')::uuid,current_setting('m36.rb')::uuid,'m36-synthetic',
        '{"synthetic":true}'::jsonb,1,now(),'m36-synthetic','{"synthetic":true}'::jsonb,'m36-synthetic',now());
    IF result->>'idempotent' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Completion replay failed'; END IF;
END;
$completion$;
SELECT public.fail_research_job(current_setting('m36.rb')::uuid,current_setting('m36.a')::uuid,'timeout');
SELECT public.fail_research_job(current_setting('m36.rb')::uuid,current_setting('m36.a')::uuid,'timeout');
SELECT public.mark_research_job_ambiguous(current_setting('m36.rc')::uuid,current_setting('m36.a')::uuid,'timeout');
DO $ambiguity_denial$
BEGIN
    BEGIN
        PERFORM public.fail_research_job(current_setting('m36.rc')::uuid,current_setting('m36.a')::uuid,'timeout');
        RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='Ambiguous credits refunded';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM <> 'ambiguous research outcome requires audited reconciliation' THEN RAISE; END IF;
    END;
END;
$ambiguity_denial$;
RESET ROLE;
UPDATE public.research_jobs SET apify_estimated_cost_per_attempt_micro_usd=201
WHERE request_id=current_setting('m36.rd')::uuid;
SET LOCAL ROLE service_role;
DO $budget_denial$
BEGIN
    BEGIN
        PERFORM public.begin_research_provider_attempt(current_setting('m36.rd')::uuid,current_setting('m36.rd')::uuid,
            current_setting('m36.a')::uuid,'apify','yumitori/etsy-listings-scraper',1);
        RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='Oversized attempt admitted';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM <> 'provider attempt exceeds reserved budget' THEN RAISE; END IF;
    END;
END;
$budget_denial$;
RESET ROLE;
DO $accounting$
BEGIN
    IF (SELECT credits_remaining FROM public.research_credit_accounts WHERE user_id=current_setting('m36.a')::uuid) IS DISTINCT FROM 17
       OR (SELECT count(*) FROM public.research_credit_ledger WHERE user_id=current_setting('m36.a')::uuid AND action_type='refund') <> 1
       OR (SELECT status FROM public.research_credit_operations WHERE request_id=current_setting('m36.ra')::uuid) IS DISTINCT FROM 'committed'
       OR (SELECT status FROM public.research_budget_reservations WHERE request_id=current_setting('m36.rc')::uuid) IS DISTINCT FROM 'held'
       OR (SELECT count(*) FROM public.research_history WHERE user_id=current_setting('m36.a')::uuid) <> 1
       OR EXISTS (SELECT 1 FROM public.research_budget_windows WHERE id IN (current_setting('m36.global')::uuid,current_setting('m36.account')::uuid)
           AND (reserved_micro_usd <> 400 OR settled_micro_usd <> 100)) THEN
        RAISE EXCEPTION 'Credit or budget accounting invariant failed';
    END IF;
    BEGIN
        UPDATE public.research_budget_windows SET cap_micro_usd=0 WHERE id=current_setting('m36.global')::uuid;
        RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='Budget cap constraint absent';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
END;
$accounting$;
SELECT pg_catalog.set_config('request.jwt.claim.sub',current_setting('m36.a'),true);
SELECT pg_catalog.set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('m36.a'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $own_rows$
BEGIN
    IF (SELECT count(*) FROM public.research_jobs WHERE user_id=current_setting('m36.a')::uuid) <> 4
       OR (SELECT count(*) FROM public.research_results WHERE user_id=current_setting('m36.a')::uuid) <> 1 THEN
        RAISE EXCEPTION 'Own-row RLS visibility failed';
    END IF;
END;
$own_rows$;
DO $rls_denial$
BEGIN
    BEGIN
        PERFORM public.reserve_research_job(current_setting('m36.ra')::uuid,current_setting('m36.a')::uuid,
            'M36 synthetic',1,1,repeat('a',64),'2026-10-11.unverified-v1','yumitori/etsy-listings-scraper','google/gemini-3.1-flash-lite');
        RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='Browser RPC executed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END;
$rls_denial$;
RESET ROLE;
SELECT pg_catalog.set_config('request.jwt.claim.sub',current_setting('m36.b'),true);
SELECT pg_catalog.set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('m36.b'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $cross_rows$
BEGIN
    IF EXISTS (SELECT 1 FROM public.research_jobs WHERE user_id=current_setting('m36.a')::uuid)
       OR EXISTS (SELECT 1 FROM public.research_results WHERE user_id=current_setting('m36.a')::uuid) THEN
        RAISE EXCEPTION 'Cross-user RLS leak';
    END IF;
END;
$cross_rows$;
RESET ROLE;
ROLLBACK;
-- Same connection, read-only verification after rollback. No external fixtures.
BEGIN READ ONLY;
SELECT pg_catalog.set_config('m36.pricing_before', :'pricing_before', true);
DO $cleanup$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id IN (current_setting('m36.a')::uuid,current_setting('m36.b')::uuid))
       OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id IN (current_setting('m36.a')::uuid,current_setting('m36.b')::uuid))
       OR EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id IN (current_setting('m36.a')::uuid,current_setting('m36.b')::uuid))
       OR EXISTS (SELECT 1 FROM public.research_credit_accounts WHERE user_id IN (current_setting('m36.a')::uuid,current_setting('m36.b')::uuid))
       OR EXISTS (SELECT 1 FROM public.research_credit_operations WHERE user_id=current_setting('m36.a')::uuid)
       OR EXISTS (SELECT 1 FROM public.research_credit_ledger WHERE user_id=current_setting('m36.a')::uuid)
       OR EXISTS (SELECT 1 FROM public.research_jobs WHERE user_id=current_setting('m36.a')::uuid)
       OR EXISTS (SELECT 1 FROM public.research_results WHERE user_id=current_setting('m36.a')::uuid)
       OR EXISTS (SELECT 1 FROM public.research_provider_attempts WHERE user_id=current_setting('m36.a')::uuid)
       OR EXISTS (SELECT 1 FROM public.research_budget_reservations WHERE user_id=current_setting('m36.a')::uuid)
       OR EXISTS (SELECT 1 FROM public.research_history WHERE user_id=current_setting('m36.a')::uuid)
       OR EXISTS (SELECT 1 FROM public.research_budget_windows WHERE id IN (current_setting('m36.global')::uuid,current_setting('m36.account')::uuid))
       OR (SELECT pg_catalog.md5(COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) ORDER BY version_key)::text,'[]')) FROM public.research_provider_pricing p)
           IS DISTINCT FROM current_setting('m36.pricing_before') THEN
        RAISE EXCEPTION 'Rollback or pricing preservation could not be verified';
    END IF;
END;
$cleanup$;
ROLLBACK;
\echo M36_RUN_ROLLBACK_OK
