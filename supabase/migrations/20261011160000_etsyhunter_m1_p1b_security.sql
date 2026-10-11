-- ==============================================================================
-- Etsy Hunter — M1 P1-B Database Security (2026-10-11 16:00 UTC)
-- Additive hardening for browser authorization, saved-listing quotas, and
-- idempotent backend-only research-credit reservations.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Browser role least privilege
-- ------------------------------------------------------------------------------

-- Profiles are created by handle_new_user_signup(), not by the browser.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
REVOKE ALL PRIVILEGES ON TABLE public.user_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_profiles TO authenticated;
GRANT UPDATE (full_name, workspace_name) ON public.user_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_user_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    NEW.updated_at := pg_catalog.timezone('utc'::text, pg_catalog.now());
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_user_profile_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_user_profile_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profile_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_user_profile_updated_at();

-- Subscription and credit state can be read by its owner through RLS, but only
-- trusted backend/database code may mutate it.
REVOKE ALL PRIVILEGES ON TABLE public.subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.research_credit_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.research_credit_accounts TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.research_credit_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.research_credit_ledger TO authenticated;

-- Successful history is backend-authored only. Users retain read/delete access
-- to their own rows through the existing ownership policies.
DROP POLICY IF EXISTS "Users can insert own research history" ON public.research_history;
REVOKE ALL PRIVILEGES ON TABLE public.research_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.research_history TO authenticated;

-- Saved listings remain browser-managed, but only through explicitly approved
-- columns and the existing auth.uid() ownership policy.
REVOKE ALL PRIVILEGES ON TABLE public.saved_listings FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.saved_listings TO authenticated;
GRANT INSERT (
    user_id,
    product_identifier,
    title,
    shop_name,
    image_url,
    category,
    observed_price,
    estimated_monthly_revenue,
    competition_level,
    stage,
    tags,
    notes
) ON public.saved_listings TO authenticated;
GRANT UPDATE (
    title,
    shop_name,
    image_url,
    category,
    observed_price,
    estimated_monthly_revenue,
    competition_level,
    stage,
    tags,
    notes
) ON public.saved_listings TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.research_cache FROM PUBLIC, anon, authenticated;

-- The M1 browser-callable RPC is retired. It mixed deduction and successful
-- history creation before provider success and had no idempotency key.
REVOKE ALL ON FUNCTION public.consume_research_credits(TEXT, INTEGER, INTEGER)
    FROM PUBLIC, anon, authenticated, service_role;

-- Harden the existing signup trigger function. Trigger execution does not
-- require browser EXECUTE permission.
ALTER FUNCTION public.handle_new_user_signup() SET search_path = pg_catalog;
REVOKE ALL ON FUNCTION public.handle_new_user_signup()
    FROM PUBLIC, anon, authenticated, service_role;

ALTER FUNCTION public.consume_research_credits(TEXT, INTEGER, INTEGER)
    SET search_path = pg_catalog;

-- ------------------------------------------------------------------------------
-- Concurrency-safe saved-listing quota enforcement
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_saved_listing_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_limit INTEGER := 0;
    v_current_count INTEGER := 0;
BEGIN
    -- Serialize all inserts for one user, including the no-subscription case.
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(NEW.user_id::text, 19012026)
    );

    -- Lock the authoritative entitlement row so a concurrent billing update
    -- cannot race this quota decision.
    SELECT CASE
        WHEN s.status <> 'active' THEN 0
        WHEN s.current_period_start IS NOT NULL
             AND s.current_period_start > pg_catalog.now() THEN 0
        WHEN s.current_period_end IS NOT NULL
             AND s.current_period_end <= pg_catalog.now() THEN 0
        WHEN s.plan_tier = 'starter' THEN 50
        WHEN s.plan_tier = 'pro' THEN 250
        WHEN s.plan_tier = 'agency' THEN 1000
        ELSE 0
    END
    INTO v_limit
    FROM public.subscriptions AS s
    WHERE s.user_id = NEW.user_id
    FOR UPDATE;

    v_limit := COALESCE(v_limit, 0);

    SELECT count(*)::INTEGER
    INTO v_current_count
    FROM public.saved_listings AS sl
    WHERE sl.user_id = NEW.user_id;

    IF v_current_count >= v_limit THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'saved listing quota exceeded',
            DETAIL = pg_catalog.format(
                'The active subscription permits %s saved listings.',
                v_limit
            );
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_saved_listing_quota()
    FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_saved_listing_quota_before_insert
    ON public.saved_listings;
CREATE TRIGGER enforce_saved_listing_quota_before_insert
    BEFORE INSERT ON public.saved_listings
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_saved_listing_quota();

-- ------------------------------------------------------------------------------
-- Backend-only idempotent research-credit state machine
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.research_credit_operations (
    request_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL CHECK (
        char_length(btrim(keyword)) BETWEEN 1 AND 200
    ),
    pages_requested INTEGER NOT NULL CHECK (pages_requested BETWEEN 1 AND 3),
    credits_amount INTEGER NOT NULL CHECK (credits_amount BETWEEN 1 AND 3),
    status TEXT NOT NULL CHECK (
        status IN ('reserved', 'committed', 'failed', 'ambiguous', 'rejected')
    ),
    balance_after_reservation INTEGER NOT NULL CHECK (balance_after_reservation >= 0),
    listings_found INTEGER CHECK (listings_found >= 0),
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    finalized_at TIMESTAMPTZ
);

ALTER TABLE public.research_credit_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.research_credit_operations
    FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.research_credit_operations TO service_role;

CREATE INDEX IF NOT EXISTS research_credit_operations_user_created_idx
    ON public.research_credit_operations (user_id, created_at DESC);

ALTER TABLE public.research_credit_ledger
    ADD COLUMN IF NOT EXISTS request_id UUID
    REFERENCES public.research_credit_operations(request_id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS research_credit_ledger_request_action_uidx
    ON public.research_credit_ledger (request_id, action_type)
    WHERE request_id IS NOT NULL;

ALTER TABLE public.research_history
    ADD COLUMN IF NOT EXISTS request_id UUID
    REFERENCES public.research_credit_operations(request_id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS research_history_request_uidx
    ON public.research_history (request_id)
    WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reserve_research_credits(
    p_request_id UUID,
    p_user_id UUID,
    p_keyword TEXT,
    p_pages INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_keyword TEXT;
    v_required_credits INTEGER;
    v_current_credits INTEGER;
    v_new_balance INTEGER;
    v_existing public.research_credit_operations%ROWTYPE;
BEGIN
    IF p_request_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'request_id and user_id are required';
    END IF;

    v_keyword := pg_catalog.btrim(COALESCE(p_keyword, ''));
    IF v_keyword = '' OR pg_catalog.char_length(v_keyword) > 200 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'keyword must contain 1 to 200 characters';
    END IF;

    IF p_pages IS NULL OR p_pages < 1 OR p_pages > 3 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'pages must be between 1 and 3';
    END IF;
    v_required_credits := p_pages;

    -- A global request lock makes simultaneous retries wait for the first
    -- transaction and then return its persisted result.
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_request_id::text, 19022026)
    );

    SELECT *
    INTO v_existing
    FROM public.research_credit_operations AS operation
    WHERE operation.request_id = p_request_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing.user_id <> p_user_id
           OR v_existing.keyword <> v_keyword
           OR v_existing.pages_requested <> p_pages THEN
            RAISE EXCEPTION USING
                ERRCODE = '22023',
                MESSAGE = 'idempotency key was already used with different request data';
        END IF;

        RETURN pg_catalog.jsonb_build_object(
            'success', v_existing.status IN ('reserved', 'committed', 'ambiguous'),
            'idempotent', true,
            'status', v_existing.status,
            'credits_reserved', v_existing.credits_amount,
            'credits_remaining', v_existing.balance_after_reservation
        );
    END IF;

    -- Different request IDs for the same user serialize on the account row.
    SELECT account.credits_remaining
    INTO v_current_credits
    FROM public.research_credit_accounts AS account
    WHERE account.user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'credit account not found';
    END IF;

    IF v_current_credits < v_required_credits THEN
        INSERT INTO public.research_credit_operations (
            request_id,
            user_id,
            keyword,
            pages_requested,
            credits_amount,
            status,
            balance_after_reservation,
            failure_reason
        ) VALUES (
            p_request_id,
            p_user_id,
            v_keyword,
            p_pages,
            v_required_credits,
            'rejected',
            v_current_credits,
            'Insufficient research credits'
        );

        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'idempotent', false,
            'status', 'rejected',
            'required', v_required_credits,
            'credits_remaining', v_current_credits
        );
    END IF;

    v_new_balance := v_current_credits - v_required_credits;

    UPDATE public.research_credit_accounts
    SET credits_remaining = v_new_balance,
        updated_at = pg_catalog.now()
    WHERE user_id = p_user_id;

    INSERT INTO public.research_credit_operations (
        request_id,
        user_id,
        keyword,
        pages_requested,
        credits_amount,
        status,
        balance_after_reservation
    ) VALUES (
        p_request_id,
        p_user_id,
        v_keyword,
        p_pages,
        v_required_credits,
        'reserved',
        v_new_balance
    );

    INSERT INTO public.research_credit_ledger (
        user_id,
        amount,
        balance_after,
        action_type,
        description,
        request_id
    ) VALUES (
        p_user_id,
        -v_required_credits,
        v_new_balance,
        'deduction_query',
        'Research credit reservation',
        p_request_id
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'status', 'reserved',
        'credits_reserved', v_required_credits,
        'credits_remaining', v_new_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_research_credits(UUID, UUID, TEXT, INTEGER)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_research_credits(UUID, UUID, TEXT, INTEGER)
    TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_research_credits(
    p_request_id UUID,
    p_user_id UUID,
    p_outcome TEXT,
    p_listings_count INTEGER DEFAULT 0,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_operation public.research_credit_operations%ROWTYPE;
    v_balance INTEGER;
BEGIN
    IF p_request_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'request_id and user_id are required';
    END IF;

    IF p_outcome IS NULL OR p_outcome NOT IN ('commit', 'failure', 'ambiguous') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid research outcome';
    END IF;

    IF p_listings_count IS NULL OR p_listings_count < 0 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'listings_count cannot be negative';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_request_id::text, 19022026)
    );

    SELECT *
    INTO v_operation
    FROM public.research_credit_operations AS operation
    WHERE operation.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_operation.user_id <> p_user_id THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'research credit operation not found';
    END IF;

    IF v_operation.status = 'rejected' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'idempotent', true,
            'status', 'rejected'
        );
    END IF;

    IF v_operation.status = 'committed' THEN
        IF p_outcome <> 'commit' THEN
            RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'committed operation cannot change outcome';
        END IF;
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent', true,
            'status', 'committed'
        );
    END IF;

    IF v_operation.status = 'failed' THEN
        IF p_outcome <> 'failure' THEN
            RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'failed operation cannot change outcome';
        END IF;
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'idempotent', true,
            'status', 'failed'
        );
    END IF;

    IF p_outcome = 'ambiguous' THEN
        UPDATE public.research_credit_operations
        SET status = 'ambiguous',
            failure_reason = pg_catalog.left(COALESCE(p_failure_reason, 'Provider outcome requires reconciliation'), 1000),
            updated_at = pg_catalog.now()
        WHERE request_id = p_request_id;

        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'idempotent', v_operation.status = 'ambiguous',
            'status', 'ambiguous'
        );
    END IF;

    IF p_outcome = 'commit' THEN
        -- Successful history is created only after the provider result is
        -- definitively accepted. The unique request index is defense in depth.
        INSERT INTO public.research_history (
            user_id,
            keyword,
            pages_requested,
            credits_consumed,
            listings_found,
            request_id
        ) VALUES (
            v_operation.user_id,
            v_operation.keyword,
            v_operation.pages_requested,
            v_operation.credits_amount,
            p_listings_count,
            p_request_id
        );

        UPDATE public.research_credit_operations
        SET status = 'committed',
            listings_found = p_listings_count,
            failure_reason = NULL,
            updated_at = pg_catalog.now(),
            finalized_at = pg_catalog.now()
        WHERE request_id = p_request_id;

        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent', false,
            'status', 'committed'
        );
    END IF;

    -- Definitive failure atomically refunds the reservation and never creates
    -- research_history. A repeated failure returns above without a second refund.
    SELECT account.credits_remaining
    INTO v_balance
    FROM public.research_credit_accounts AS account
    WHERE account.user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'credit account not found';
    END IF;

    v_balance := v_balance + v_operation.credits_amount;

    UPDATE public.research_credit_accounts
    SET credits_remaining = v_balance,
        updated_at = pg_catalog.now()
    WHERE user_id = p_user_id;

    INSERT INTO public.research_credit_ledger (
        user_id,
        amount,
        balance_after,
        action_type,
        description,
        request_id
    ) VALUES (
        p_user_id,
        v_operation.credits_amount,
        v_balance,
        'refund',
        'Failed research reservation refund',
        p_request_id
    );

    UPDATE public.research_credit_operations
    SET status = 'failed',
        failure_reason = pg_catalog.left(COALESCE(p_failure_reason, 'Research provider failed'), 1000),
        updated_at = pg_catalog.now(),
        finalized_at = pg_catalog.now()
    WHERE request_id = p_request_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', false,
        'idempotent', false,
        'status', 'failed',
        'credits_remaining', v_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_research_credits(UUID, UUID, TEXT, INTEGER, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_research_credits(UUID, UUID, TEXT, INTEGER, TEXT)
    TO service_role;

-- M2 lifecycle contract:
--   1. Backend verifies the caller JWT, generates one UUID request_id, and calls
--      reserve_research_credits before invoking any paid provider.
--   2. A definitive provider success calls finalize(..., 'commit', ...), which
--      alone creates research_history.
--   3. A definitive provider failure calls finalize(..., 'failure', ...), which
--      atomically refunds once and creates no successful history.
--   4. A timeout/disconnect with an unknown provider result calls
--      finalize(..., 'ambiguous', ...). Credits remain reserved and no history
--      is created until M2 reconciliation determines commit or failure.
--   5. Every retry reuses the original request_id. Advisory locks, row locks,
--      primary/unique keys, and terminal-state checks prevent double deduction,
--      double refund, and duplicate successful history under concurrency.
