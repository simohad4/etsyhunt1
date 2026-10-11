-- ==============================================================================
-- Etsy Hunter — M1 Existing Auth User Backfill
-- Must run after:
--   1. 20261010_etsyhunter_m1_foundation.sql
--   2. 20261011160000_etsyhunter_m1_p1b_security.sql
--
-- This migration is additive and idempotent. It creates only missing rows and
-- never changes an existing profile, subscription, or credit account.
-- ==============================================================================

-- The M1 profile schema and signup trigger require an email address. Fail closed
-- instead of inventing one for phone-only or anonymous Auth users.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM auth.users AS auth_user
        WHERE auth_user.email IS NULL
           OR pg_catalog.btrim(auth_user.email) = ''
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23502',
            MESSAGE = 'Etsy Hunter backfill requires every auth user to have a non-empty email';
    END IF;
END;
$$;

-- Missing display profiles only. ON CONFLICT protects rows created concurrently
-- by the signup trigger and preserves every existing profile unchanged.
INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    workspace_name
)
SELECT
    auth_user.id,
    auth_user.email,
    COALESCE(
        NULLIF(pg_catalog.btrim(auth_user.raw_user_meta_data->>'full_name'), ''),
        pg_catalog.split_part(auth_user.email, '@', 1)
    ),
    COALESCE(
        NULLIF(pg_catalog.btrim(auth_user.raw_user_meta_data->>'full_name'), ''),
        pg_catalog.split_part(auth_user.email, '@', 1)
    ) || '''s Workspace'
FROM auth.users AS auth_user
ON CONFLICT (id) DO NOTHING;

-- Missing subscriptions only. Historical users receive no paid entitlement.
INSERT INTO public.subscriptions (
    user_id,
    plan_tier,
    status
)
SELECT
    auth_user.id,
    'none',
    'inactive'
FROM auth.users AS auth_user
ON CONFLICT (user_id) DO NOTHING;

-- Missing credit accounts only. Historical users receive zero credits and zero
-- monthly allowance. The legacy capacity value matches new-user initialization;
-- P1-B quota enforcement derives the actual entitlement from subscriptions.
INSERT INTO public.research_credit_accounts (
    user_id,
    credits_remaining,
    monthly_allowance,
    max_saved_listings
)
SELECT
    auth_user.id,
    0,
    0,
    50
FROM auth.users AS auth_user
ON CONFLICT (user_id) DO NOTHING;
