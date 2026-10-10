-- ==============================================================================
-- Etsy Hunter — Production Supabase Schema & Security Migration (M1)
-- One User = One Personal Workspace Architecture
-- Tables:
--   1. user_profiles
--   2. subscriptions
--   3. research_credit_accounts
--   4. research_credit_ledger
--   5. saved_listings
--   6. research_history
--   7. research_cache
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- Table 1: user_profiles
-- Represents the personal profile and workspace settings for an authenticated user
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    workspace_name TEXT NOT NULL DEFAULT 'Personal Workspace',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile workspace name or full name"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- Table 2: subscriptions
-- Stores the verified subscription status for the personal workspace.
-- Crucial: Users CANNOT self-insert or update subscription records directly!
-- Only service role / webhook RPCs can update paid status.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_tier TEXT NOT NULL DEFAULT 'none' CHECK (plan_tier IN ('none', 'starter', 'pro', 'agency')),
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'past_due', 'canceled')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
    ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Explicitly NO INSERT or UPDATE policy for authenticated users on subscriptions.
-- Updates must happen via backend service role or privileged SECURITY DEFINER RPC.

-- ==============================================================================
-- Table 3: research_credit_accounts
-- Stores the authoritative research credit balance.
-- New users start with 0 credits until granted or paid.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.research_credit_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    credits_remaining INTEGER NOT NULL DEFAULT 0 CHECK (credits_remaining >= 0),
    monthly_allowance INTEGER NOT NULL DEFAULT 0 CHECK (monthly_allowance >= 0),
    max_saved_listings INTEGER NOT NULL DEFAULT 50 CHECK (max_saved_listings >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.research_credit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit account"
    ON public.research_credit_accounts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Explicitly NO direct user UPDATE or INSERT. Credit modifications go through ledger / RPC.

-- ==============================================================================
-- Table 4: research_credit_ledger
-- Audit log of all credit grants, renewals, and deductions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.research_credit_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- negative for deductions, positive for grants
    balance_after INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('deduction_query', 'subscription_grant', 'manual_adjustment', 'refund')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.research_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit ledger history"
    ON public.research_credit_ledger
    FOR SELECT
    USING (auth.uid() = user_id);

-- ==============================================================================
-- Table 5: saved_listings
-- User's saved product listings in their personal library
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saved_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_identifier TEXT NOT NULL,
    title TEXT NOT NULL,
    shop_name TEXT NOT NULL,
    image_url TEXT,
    category TEXT,
    observed_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    estimated_monthly_revenue NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    competition_level TEXT NOT NULL DEFAULT 'low' CHECK (competition_level IN ('low', 'medium', 'high')),
    stage TEXT NOT NULL DEFAULT 'tracked' CHECK (stage IN ('trending', 'high_potential', 'optimized', 'tracked')),
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, product_identifier)
);

ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved listings"
    ON public.saved_listings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- Table 6: research_history
-- Record of previous research keyword executions and credit usage
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.research_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    pages_requested INTEGER NOT NULL DEFAULT 1 CHECK (pages_requested >= 1 AND pages_requested <= 3),
    credits_consumed INTEGER NOT NULL DEFAULT 1 CHECK (credits_consumed >= 1),
    listings_found INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.research_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research history"
    ON public.research_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own research history"
    ON public.research_history
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research history"
    ON public.research_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- Table 7: research_cache
-- Server-side research cache to avoid duplicate expensive API / scraping queries
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.research_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key TEXT NOT NULL UNIQUE,
    keyword TEXT NOT NULL,
    data_payload JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.research_cache ENABLE ROW LEVEL SECURITY;

-- Ordinary users do not access research_cache directly; server backend reads/writes cache.
CREATE POLICY "Service role manages research cache"
    ON public.research_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- Stored Procedures & Triggers with SECURITY DEFINER and Safe Search Paths
-- ==============================================================================

-- Trigger: Automatically handle new user registration
-- Ensures new users start with:
--   - User profile
--   - Inactive subscription (plan_tier = 'none')
--   - 0 paid credits (credits_remaining = 0)
--   - Default saved listing capacity (50)
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- 1. Create personal profile
    INSERT INTO public.user_profiles (id, email, full_name, workspace_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Create inactive subscription (Zero paid plan without verified payment)
    INSERT INTO public.subscriptions (user_id, plan_tier, status)
    VALUES (NEW.id, 'none', 'inactive')
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Create research credit account (Zero paid credits)
    INSERT INTO public.research_credit_accounts (user_id, credits_remaining, monthly_allowance, max_saved_listings)
    VALUES (NEW.id, 0, 0, 50)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_signup();

-- Authoritative RPC: Deduct Research Credits
-- Authoritative server-side transaction for credit consumption.
-- Verifies user has sufficient balance before decrementing and records ledger entry.
CREATE OR REPLACE FUNCTION public.consume_research_credits(
    p_keyword TEXT,
    p_pages INTEGER,
    p_listings_count INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_required_credits INTEGER;
    v_current_credits INTEGER;
    v_new_balance INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Standard Credit Formula: 1 keyword * pages (bounded 1 to 3)
    p_pages := GREATEST(1, LEAST(3, COALESCE(p_pages, 1)));
    v_required_credits := p_pages * 1;

    -- Lock and check account
    SELECT credits_remaining INTO v_current_credits
    FROM public.research_credit_accounts
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_current_credits IS NULL THEN
        RAISE EXCEPTION 'Credit account not found';
    END IF;

    IF v_current_credits < v_required_credits THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient research credits',
            'required', v_required_credits,
            'available', v_current_credits
        );
    END IF;

    v_new_balance := v_current_credits - v_required_credits;

    -- Decrement balance
    UPDATE public.research_credit_accounts
    SET credits_remaining = v_new_balance,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id;

    -- Write audit ledger
    INSERT INTO public.research_credit_ledger (
        user_id,
        amount,
        balance_after,
        action_type,
        description
    ) VALUES (
        v_user_id,
        -v_required_credits,
        v_new_balance,
        'deduction_query',
        'Research query: ' || p_keyword || ' (' || p_pages || ' pages)'
    );

    -- Log research history
    INSERT INTO public.research_history (
        user_id,
        keyword,
        pages_requested,
        credits_consumed,
        listings_found
    ) VALUES (
        v_user_id,
        p_keyword,
        p_pages,
        v_required_credits,
        p_listings_count
    );

    RETURN jsonb_build_object(
        'success', true,
        'credits_deducted', v_required_credits,
        'credits_remaining', v_new_balance
    );
END;
$$;

-- Restrict RPC execution to authenticated users
REVOKE ALL ON FUNCTION public.consume_research_credits(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_research_credits(TEXT, INTEGER, INTEGER) TO authenticated;
