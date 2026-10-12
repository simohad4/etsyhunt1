-- ==============================================================================
-- Etsy Hunter — Slice 4C Research Database Lifecycle & Credit Security
-- Additive, staging-first foundation. This migration defines storage and
-- backend-only state transitions; it does not activate or call paid providers.
-- ==============================================================================

-- Abort before changing permissions if an M1 P1-B reservation still needs its
-- legacy finalizer. This prevents held credits from becoming unreconcilable.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.research_credit_operations AS operation
        WHERE operation.status IN ('reserved', 'ambiguous')
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'Slice 4C requires all legacy research credit operations to be terminal';
    END IF;
END;
$$;

-- Retire the M1 P1-B entry points so no caller can reserve or finalize credits
-- without the subscription, pricing, budget, provenance, and job invariants below.
REVOKE ALL ON FUNCTION public.reserve_research_credits(UUID, UUID, TEXT, INTEGER)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.finalize_research_credits(UUID, UUID, TEXT, INTEGER, TEXT)
    FROM PUBLIC, anon, authenticated, service_role;

-- Bind every new credit reservation to the exact account generation and
-- subscription period that funded it. Future billing code must update the
-- account period and increment credit_generation atomically with each reset.
ALTER TABLE public.research_credit_accounts
    ADD COLUMN IF NOT EXISTS credit_period_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS credit_period_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS credit_generation BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.research_credit_accounts
    ADD CONSTRAINT research_credit_accounts_period_generation_check
        CHECK (
            (
                credit_generation = 0
                AND credit_period_start IS NULL
                AND credit_period_end IS NULL
            )
            OR (
                credit_generation > 0
                AND credit_period_start IS NOT NULL
                AND credit_period_end IS NOT NULL
                AND credit_period_start < credit_period_end
            )
        );

-- This establishes identity only for an already-valid active period and never
-- grants, resets, or otherwise changes a credit balance.
UPDATE public.research_credit_accounts AS account
SET credit_period_start = subscription.current_period_start,
    credit_period_end = subscription.current_period_end,
    credit_generation = 1,
    updated_at = pg_catalog.now()
FROM public.subscriptions AS subscription
WHERE subscription.user_id = account.user_id
  AND subscription.status = 'active'
  AND subscription.plan_tier IN ('starter', 'pro', 'agency')
  AND subscription.current_period_start IS NOT NULL
  AND subscription.current_period_end IS NOT NULL
  AND subscription.current_period_start < subscription.current_period_end
  AND account.credit_generation = 0
  AND account.credit_period_start IS NULL
  AND account.credit_period_end IS NULL;

ALTER TABLE public.research_credit_operations
    ADD COLUMN IF NOT EXISTS request_fingerprint TEXT,
    ADD COLUMN IF NOT EXISTS maximum_listings INTEGER,
    ADD COLUMN IF NOT EXISTS pricing_version TEXT,
    ADD COLUMN IF NOT EXISTS estimated_provider_cost_micro_usd BIGINT,
    ADD COLUMN IF NOT EXISTS credit_period_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS credit_period_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS credit_account_generation BIGINT,
    ADD COLUMN IF NOT EXISTS refund_disposition TEXT;

ALTER TABLE public.research_credit_operations
    ADD CONSTRAINT research_credit_operations_fingerprint_check
        CHECK (
            request_fingerprint IS NULL
            OR request_fingerprint ~ '^[0-9a-f]{64}$'
        ),
    ADD CONSTRAINT research_credit_operations_maximum_listings_check
        CHECK (
            maximum_listings IS NULL
            OR maximum_listings BETWEEN 1 AND pages_requested * 36
        ),
    ADD CONSTRAINT research_credit_operations_estimated_cost_check
        CHECK (
            estimated_provider_cost_micro_usd IS NULL
            OR estimated_provider_cost_micro_usd >= 0
        ),
    ADD CONSTRAINT research_credit_operations_period_generation_check
        CHECK (
            (
                credit_period_start IS NULL
                AND credit_period_end IS NULL
                AND credit_account_generation IS NULL
            )
            OR (
                credit_period_start IS NOT NULL
                AND credit_period_end IS NOT NULL
                AND credit_period_start < credit_period_end
                AND credit_account_generation IS NOT NULL
                AND credit_account_generation > 0
            )
        ),
    ADD CONSTRAINT research_credit_operations_refund_disposition_check
        CHECK (
            refund_disposition IS NULL
            OR refund_disposition IN (
                'pending', 'not_applicable', 'refunded', 'expired_generation'
            )
        );

-- Versioned pricing is owner-managed. The checked-in Slice 4B price card is
-- deliberately unverified and activation-blocked; no guessed rate is stored.
CREATE UNIQUE INDEX research_credit_operations_request_user_uidx
    ON public.research_credit_operations (request_id, user_id);
CREATE UNIQUE INDEX research_credit_operations_period_uidx
    ON public.research_credit_operations (
        request_id, user_id, credit_period_start,
        credit_period_end, credit_account_generation
    );

ALTER TABLE public.research_credit_ledger
    ADD COLUMN IF NOT EXISTS credit_period_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS credit_period_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS credit_account_generation BIGINT;

ALTER TABLE public.research_credit_ledger
    ADD CONSTRAINT research_credit_ledger_period_generation_check
        CHECK (
            (
                credit_period_start IS NULL
                AND credit_period_end IS NULL
                AND credit_account_generation IS NULL
            )
            OR (
                credit_period_start IS NOT NULL
                AND credit_period_end IS NOT NULL
                AND credit_period_start < credit_period_end
                AND credit_account_generation IS NOT NULL
                AND credit_account_generation > 0
            )
        ),
    ADD CONSTRAINT research_credit_ledger_operation_period_fkey
        FOREIGN KEY (
            request_id, user_id, credit_period_start,
            credit_period_end, credit_account_generation
        )
        REFERENCES public.research_credit_operations (
            request_id, user_id, credit_period_start,
            credit_period_end, credit_account_generation
        )
        ON DELETE CASCADE;

CREATE TABLE public.research_provider_pricing (
    version_key TEXT PRIMARY KEY,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
    apify_actor TEXT NOT NULL CHECK (apify_actor = 'yumitori/etsy-listings-scraper'),
    apify_billing_unit TEXT NOT NULL CHECK (apify_billing_unit = 'actor-result'),
    apify_micro_usd_per_billing_unit BIGINT CHECK (apify_micro_usd_per_billing_unit >= 0),
    apify_fixed_run_micro_usd BIGINT CHECK (apify_fixed_run_micro_usd >= 0),
    apify_billable_units_per_requested_listing INTEGER NOT NULL CHECK (
        apify_billable_units_per_requested_listing > 0
    ),
    apify_max_attempts INTEGER NOT NULL CHECK (apify_max_attempts = 2),
    apify_provenance TEXT NOT NULL CHECK (
        apify_provenance IN ('estimated', 'reported', 'verified')
    ),
    apify_source_reference TEXT NOT NULL,
    apify_verified_at TIMESTAMPTZ,
    openrouter_model TEXT NOT NULL CHECK (
        openrouter_model = 'google/gemini-3.1-flash-lite'
    ),
    openrouter_input_micro_usd_per_million_tokens BIGINT CHECK (
        openrouter_input_micro_usd_per_million_tokens >= 0
    ),
    openrouter_output_micro_usd_per_million_tokens BIGINT CHECK (
        openrouter_output_micro_usd_per_million_tokens >= 0
    ),
    openrouter_max_input_tokens INTEGER NOT NULL CHECK (
        openrouter_max_input_tokens = 33280
    ),
    openrouter_max_output_tokens INTEGER NOT NULL CHECK (
        openrouter_max_output_tokens = 2048
    ),
    openrouter_max_attempts INTEGER NOT NULL CHECK (openrouter_max_attempts = 2),
    openrouter_provenance TEXT NOT NULL CHECK (
        openrouter_provenance IN ('estimated', 'reported', 'verified')
    ),
    openrouter_source_reference TEXT NOT NULL,
    openrouter_verified_at TIMESTAMPTZ,
    hard_limit_micro_usd_per_credit BIGINT NOT NULL DEFAULT 120000 CHECK (
        hard_limit_micro_usd_per_credit = 120000
    ),
    activation_blocked BOOLEAN NOT NULL DEFAULT true,
    effective_from TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CHECK (
        activation_blocked
        OR (
            apify_provenance = 'verified'
            AND openrouter_provenance = 'verified'
            AND apify_micro_usd_per_billing_unit IS NOT NULL
            AND apify_fixed_run_micro_usd IS NOT NULL
            AND openrouter_input_micro_usd_per_million_tokens IS NOT NULL
            AND openrouter_output_micro_usd_per_million_tokens IS NOT NULL
            AND pg_catalog.btrim(apify_source_reference) <> ''
            AND pg_catalog.btrim(openrouter_source_reference) <> ''
            AND apify_verified_at IS NOT NULL
            AND openrouter_verified_at IS NOT NULL
            AND expires_at IS NOT NULL
            AND effective_from < expires_at
        )
    )
);

INSERT INTO public.research_provider_pricing (
    version_key,
    apify_actor,
    apify_billing_unit,
    apify_billable_units_per_requested_listing,
    apify_max_attempts,
    apify_provenance,
    apify_source_reference,
    openrouter_model,
    openrouter_max_input_tokens,
    openrouter_max_output_tokens,
    openrouter_max_attempts,
    openrouter_provenance,
    openrouter_source_reference,
    activation_blocked,
    effective_from,
    expires_at
) VALUES (
    '2026-10-11.unverified-v1',
    'yumitori/etsy-listings-scraper',
    'actor-result',
    1,
    2,
    'estimated',
    'Official Apify actor pricing has not been verified.',
    'google/gemini-3.1-flash-lite',
    33280,
    2048,
    2,
    'estimated',
    'Official OpenRouter model pricing and availability have not been verified.',
    true,
    '2026-10-11 00:00:00+00',
    NULL
);

CREATE TABLE public.research_budget_windows (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'account')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    cap_micro_usd BIGINT NOT NULL CHECK (cap_micro_usd >= 0),
    reserved_micro_usd BIGINT NOT NULL DEFAULT 0 CHECK (reserved_micro_usd >= 0),
    settled_micro_usd BIGINT NOT NULL DEFAULT 0 CHECK (settled_micro_usd >= 0),
    overrun_micro_usd BIGINT NOT NULL DEFAULT 0 CHECK (overrun_micro_usd >= 0),
    blocked_at TIMESTAMPTZ,
    blocked_reason TEXT CHECK (blocked_reason IS NULL OR blocked_reason = 'provider_cost_overrun'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CHECK (period_start < period_end),
    CHECK (
        (scope_type = 'global' AND user_id IS NULL)
        OR (scope_type = 'account' AND user_id IS NOT NULL)
    ),
    CHECK (reserved_micro_usd + settled_micro_usd <= cap_micro_usd),
    CHECK (
        (blocked_at IS NULL AND blocked_reason IS NULL)
        OR (blocked_at IS NOT NULL AND blocked_reason IS NOT NULL)
    )
);

CREATE UNIQUE INDEX research_budget_windows_global_uidx
    ON public.research_budget_windows (period_start, period_end)
    WHERE scope_type = 'global';
CREATE UNIQUE INDEX research_budget_windows_account_uidx
    ON public.research_budget_windows (user_id, period_start, period_end)
    WHERE scope_type = 'account';

-- Overrun liabilities outlive individual budget windows. A scope remains
-- blocked across period rollover until a future audited reconciliation clears
-- the liability; Slice 4C intentionally provides no automatic clear path.
CREATE TABLE public.research_budget_liabilities (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'account')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    outstanding_micro_usd BIGINT NOT NULL DEFAULT 0 CHECK (
        outstanding_micro_usd >= 0
    ),
    blocked_at TIMESTAMPTZ,
    blocked_reason TEXT CHECK (
        blocked_reason IS NULL OR blocked_reason = 'provider_cost_overrun'
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CHECK (
        (scope_type = 'global' AND user_id IS NULL)
        OR (scope_type = 'account' AND user_id IS NOT NULL)
    ),
    CHECK (
        (
            outstanding_micro_usd = 0
            AND blocked_at IS NULL
            AND blocked_reason IS NULL
        )
        OR (
            outstanding_micro_usd > 0
            AND blocked_at IS NOT NULL
            AND blocked_reason IS NOT NULL
        )
    )
);

CREATE UNIQUE INDEX research_budget_liabilities_global_uidx
    ON public.research_budget_liabilities (scope_type)
    WHERE scope_type = 'global';
CREATE UNIQUE INDEX research_budget_liabilities_account_uidx
    ON public.research_budget_liabilities (user_id)
    WHERE scope_type = 'account';

INSERT INTO public.research_budget_liabilities (scope_type, user_id)
VALUES ('global', NULL);

CREATE TABLE public.research_jobs (
    request_id UUID PRIMARY KEY
        REFERENCES public.research_credit_operations(request_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_schema_version TEXT NOT NULL CHECK (
        request_schema_version = 'research-request-v1'
    ),
    request_fingerprint TEXT NOT NULL CHECK (
        request_fingerprint ~ '^[0-9a-f]{64}$'
    ),
    keyword TEXT NOT NULL CHECK (
        pg_catalog.char_length(pg_catalog.btrim(keyword)) BETWEEN 1 AND 200
        AND keyword !~ '[[:cntrl:]]'
    ),
    pages_requested INTEGER NOT NULL CHECK (pages_requested BETWEEN 1 AND 3),
    maximum_listings INTEGER NOT NULL CHECK (
        maximum_listings BETWEEN 1 AND pages_requested * 36
    ),
    credits_reserved INTEGER NOT NULL CHECK (
        credits_reserved = pages_requested AND credits_reserved BETWEEN 1 AND 3
    ),
    credit_period_start TIMESTAMPTZ NOT NULL,
    credit_period_end TIMESTAMPTZ NOT NULL CHECK (
        credit_period_start < credit_period_end
    ),
    credit_account_generation BIGINT NOT NULL CHECK (
        credit_account_generation > 0
    ),
    apify_actor TEXT NOT NULL CHECK (
        apify_actor = 'yumitori/etsy-listings-scraper'
    ),
    openrouter_model TEXT NOT NULL CHECK (
        openrouter_model = 'google/gemini-3.1-flash-lite'
    ),
    pricing_version TEXT NOT NULL
        REFERENCES public.research_provider_pricing(version_key),
    apify_billable_units_per_requested_listing INTEGER NOT NULL CHECK (
        apify_billable_units_per_requested_listing > 0
    ),
    apify_max_attempts INTEGER NOT NULL CHECK (apify_max_attempts = 2),
    apify_estimated_cost_per_attempt_micro_usd BIGINT NOT NULL CHECK (
        apify_estimated_cost_per_attempt_micro_usd >= 0
    ),
    openrouter_max_input_tokens INTEGER NOT NULL CHECK (
        openrouter_max_input_tokens = 33280
    ),
    openrouter_max_output_tokens INTEGER NOT NULL CHECK (
        openrouter_max_output_tokens = 2048
    ),
    openrouter_max_attempts INTEGER NOT NULL CHECK (openrouter_max_attempts = 2),
    openrouter_estimated_cost_per_attempt_micro_usd BIGINT NOT NULL CHECK (
        openrouter_estimated_cost_per_attempt_micro_usd >= 0
    ),
    estimated_provider_cost_micro_usd BIGINT NOT NULL CHECK (
        estimated_provider_cost_micro_usd >= 0
    ),
    provider_spending_limit_micro_usd BIGINT NOT NULL CHECK (
        provider_spending_limit_micro_usd = credits_reserved * 120000::BIGINT
    ),
    status TEXT NOT NULL CHECK (
        status IN (
            'reserved',
            'apify_running',
            'apify_complete',
            'apify_failed',
            'openrouter_running',
            'openrouter_complete',
            'openrouter_failed',
            'ambiguous',
            'succeeded',
            'failed',
            'rejected'
        )
    ),
    failure_category TEXT CHECK (
        failure_category IS NULL
        OR failure_category IN (
            'insufficient_credits',
            'rate_limited',
            'timeout',
            'provider_4xx',
            'provider_5xx',
            'invalid_response',
            'budget_rejected',
            'cost_overrun',
            'unknown'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    finalized_at TIMESTAMPTZ,
    UNIQUE (request_id, user_id),
    FOREIGN KEY (
        request_id, user_id, credit_period_start,
        credit_period_end, credit_account_generation
    )
        REFERENCES public.research_credit_operations (
            request_id, user_id, credit_period_start,
            credit_period_end, credit_account_generation
        )
        ON DELETE CASCADE
);

CREATE INDEX research_jobs_user_created_idx
    ON public.research_jobs (user_id, created_at DESC);

CREATE TABLE public.research_budget_reservations (
    request_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    global_window_id UUID NOT NULL
        REFERENCES public.research_budget_windows(id),
    account_window_id UUID NOT NULL
        REFERENCES public.research_budget_windows(id),
    reserved_micro_usd BIGINT NOT NULL CHECK (reserved_micro_usd >= 0),
    settled_micro_usd BIGINT NOT NULL DEFAULT 0 CHECK (
        settled_micro_usd >= 0 AND settled_micro_usd <= reserved_micro_usd
    ),
    status TEXT NOT NULL CHECK (
        status IN ('reserved', 'held', 'settled')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    settled_at TIMESTAMPTZ,
    FOREIGN KEY (request_id, user_id)
        REFERENCES public.research_jobs(request_id, user_id) ON DELETE CASCADE
);

CREATE TABLE public.research_provider_attempts (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    request_id UUID NOT NULL,
    user_id UUID NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('apify', 'openrouter')),
    provider_identifier TEXT NOT NULL,
    provider_version TEXT CHECK (
        provider_version IS NULL
        OR pg_catalog.char_length(pg_catalog.btrim(provider_version)) BETWEEN 1 AND 200
    ),
    provider_attempt_id TEXT CHECK (
        provider_attempt_id IS NULL
        OR provider_attempt_id ~ '^[A-Za-z0-9._:/-]{1,200}$'
    ),
    retry_number INTEGER NOT NULL CHECK (retry_number BETWEEN 1 AND 2),
    status TEXT NOT NULL CHECK (
        status IN ('started', 'succeeded', 'failed', 'ambiguous')
    ),
    error_category TEXT CHECK (
        error_category IS NULL
        OR error_category IN (
            'rate_limited',
            'timeout',
            'provider_4xx',
            'provider_5xx',
            'invalid_response',
            'budget_rejected',
            'cost_overrun',
            'unknown'
        )
    ),
    input_tokens BIGINT CHECK (input_tokens >= 0),
    output_tokens BIGINT CHECK (output_tokens >= 0),
    billing_units BIGINT CHECK (billing_units >= 0),
    estimated_cost_micro_usd BIGINT NOT NULL CHECK (
        estimated_cost_micro_usd >= 0
    ),
    reported_cost_micro_usd BIGINT CHECK (reported_cost_micro_usd >= 0),
    cost_provenance TEXT NOT NULL CHECK (
        cost_provenance IN ('estimated', 'reported')
    ),
    started_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    finished_at TIMESTAMPTZ,
    FOREIGN KEY (request_id, user_id)
        REFERENCES public.research_jobs(request_id, user_id) ON DELETE CASCADE,
    CHECK (
        (provider = 'apify' AND provider_identifier = 'yumitori/etsy-listings-scraper')
        OR (
            provider = 'openrouter'
            AND provider_identifier = 'google/gemini-3.1-flash-lite'
        )
    ),
    CHECK (
        (
            status = 'started'
            AND finished_at IS NULL
            AND error_category IS NULL
            AND provider_version IS NULL
        )
        OR (
            status = 'succeeded'
            AND finished_at IS NOT NULL
            AND error_category IS NULL
            AND provider_version IS NOT NULL
        )
        OR (
            status IN ('failed', 'ambiguous')
            AND finished_at IS NOT NULL
            AND error_category IS NOT NULL
        )
    ),
    CHECK (
        (cost_provenance = 'estimated' AND reported_cost_micro_usd IS NULL)
        OR (cost_provenance = 'reported' AND reported_cost_micro_usd IS NOT NULL)
    ),
    UNIQUE (request_id, provider, retry_number),
    UNIQUE (id, request_id, user_id, provider)
);

CREATE UNIQUE INDEX research_provider_attempts_external_uidx
    ON public.research_provider_attempts (provider, provider_attempt_id)
    WHERE provider_attempt_id IS NOT NULL;

CREATE UNIQUE INDEX research_provider_attempts_one_active_uidx
    ON public.research_provider_attempts (request_id)
    WHERE status = 'started';

CREATE TABLE public.research_results (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    request_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    apify_attempt_id UUID NOT NULL,
    openrouter_attempt_id UUID NOT NULL,
    observed_data_class TEXT NOT NULL DEFAULT 'observed' CHECK (
        observed_data_class = 'observed'
    ),
    observed_source_provider TEXT NOT NULL CHECK (
        observed_source_provider = 'apify'
    ),
    observed_provider_identifier TEXT NOT NULL CHECK (
        observed_provider_identifier = 'yumitori/etsy-listings-scraper'
    ),
    observed_provider_version TEXT NOT NULL CHECK (
        pg_catalog.char_length(pg_catalog.btrim(observed_provider_version)) BETWEEN 1 AND 200
    ),
    observed_schema_version TEXT NOT NULL,
    observed_payload JSONB NOT NULL CHECK (
        pg_catalog.jsonb_typeof(observed_payload) = 'object'
    ),
    observed_record_count INTEGER NOT NULL CHECK (observed_record_count >= 0),
    source_collected_at TIMESTAMPTZ NOT NULL,
    modeled_data_class TEXT NOT NULL DEFAULT 'modeled' CHECK (
        modeled_data_class = 'modeled'
    ),
    modeled_source_provider TEXT NOT NULL CHECK (
        modeled_source_provider = 'openrouter'
    ),
    modeled_provider_identifier TEXT NOT NULL CHECK (
        modeled_provider_identifier = 'google/gemini-3.1-flash-lite'
    ),
    modeled_provider_version TEXT NOT NULL CHECK (
        pg_catalog.char_length(pg_catalog.btrim(modeled_provider_version)) BETWEEN 1 AND 200
    ),
    modeled_schema_version TEXT NOT NULL,
    modeled_payload JSONB NOT NULL CHECK (
        pg_catalog.jsonb_typeof(modeled_payload) = 'object'
    ),
    prompt_version TEXT NOT NULL CHECK (pg_catalog.btrim(prompt_version) <> ''),
    modeled_generated_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    FOREIGN KEY (request_id, user_id)
        REFERENCES public.research_jobs(request_id, user_id) ON DELETE CASCADE,
    FOREIGN KEY (apify_attempt_id, request_id, user_id, observed_source_provider)
        REFERENCES public.research_provider_attempts(id, request_id, user_id, provider),
    FOREIGN KEY (openrouter_attempt_id, request_id, user_id, modeled_source_provider)
        REFERENCES public.research_provider_attempts(id, request_id, user_id, provider),
    CHECK (apify_attempt_id <> openrouter_attempt_id),
    CHECK (source_collected_at <= published_at),
    CHECK (modeled_generated_at <= published_at)
);

-- RLS is defense in depth even though browser roles receive read-only access
-- only to their own durable job and published result records.
ALTER TABLE public.research_provider_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_budget_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_budget_liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_budget_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_provider_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research jobs"
    ON public.research_jobs
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view own research results"
    ON public.research_results
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

REVOKE ALL PRIVILEGES ON TABLE public.research_provider_pricing,
    public.research_budget_windows,
    public.research_budget_liabilities,
    public.research_jobs,
    public.research_budget_reservations,
    public.research_provider_attempts,
    public.research_results
    FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.research_jobs, public.research_results
    TO authenticated;

-- Reserve credit and both financial budgets in one transaction. The first
-- request_id wins; exact retries return the persisted state, while a changed
-- fingerprint or request contract fails.
CREATE FUNCTION public.reserve_research_job(
    p_request_id UUID,
    p_user_id UUID,
    p_keyword TEXT,
    p_pages INTEGER,
    p_maximum_listings INTEGER,
    p_request_fingerprint TEXT,
    p_pricing_version TEXT,
    p_apify_actor TEXT,
    p_openrouter_model TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_keyword TEXT;
    v_expected_allowance INTEGER;
    v_current_credits INTEGER;
    v_monthly_allowance INTEGER;
    v_new_balance INTEGER;
    v_existing public.research_jobs%ROWTYPE;
    v_subscription public.subscriptions%ROWTYPE;
    v_pricing public.research_provider_pricing%ROWTYPE;
    v_global_liability public.research_budget_liabilities%ROWTYPE;
    v_account_liability public.research_budget_liabilities%ROWTYPE;
    v_global_window public.research_budget_windows%ROWTYPE;
    v_account_window public.research_budget_windows%ROWTYPE;
    v_credit_account public.research_credit_accounts%ROWTYPE;
    v_window_count INTEGER;
    v_apify_cost_numeric NUMERIC;
    v_openrouter_cost_numeric NUMERIC;
    v_estimated_cost_numeric NUMERIC;
    v_apify_cost BIGINT;
    v_openrouter_cost BIGINT;
    v_estimated_provider_cost BIGINT;
    v_per_job_limit BIGINT;
BEGIN
    IF p_request_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'request_id and user_id are required';
    END IF;

    v_keyword := pg_catalog.btrim(COALESCE(p_keyword, ''));
    IF v_keyword = ''
       OR pg_catalog.char_length(v_keyword) > 200
       OR v_keyword ~ '[[:cntrl:]]' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid keyword';
    END IF;
    IF p_pages IS NULL OR p_pages NOT BETWEEN 1 AND 3 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'pages must be between 1 and 3';
    END IF;
    IF p_maximum_listings IS NULL
       OR p_maximum_listings NOT BETWEEN 1 AND p_pages * 36 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid maximum listings';
    END IF;
    IF p_request_fingerprint IS NULL
       OR p_request_fingerprint !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid request fingerprint';
    END IF;
    IF p_apify_actor IS NULL
       OR p_openrouter_model IS NULL
       OR p_apify_actor <> 'yumitori/etsy-listings-scraper'
       OR p_openrouter_model <> 'google/gemini-3.1-flash-lite' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'provider or model mismatch';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_request_id::TEXT, 19042026)
    );

    SELECT *
    INTO v_existing
    FROM public.research_jobs AS job
    WHERE job.request_id = p_request_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing.user_id <> p_user_id
           OR v_existing.keyword <> v_keyword
           OR v_existing.pages_requested <> p_pages
           OR v_existing.maximum_listings <> p_maximum_listings
           OR v_existing.request_fingerprint <> p_request_fingerprint
           OR v_existing.pricing_version <> p_pricing_version
           OR v_existing.apify_actor <> p_apify_actor
           OR v_existing.openrouter_model <> p_openrouter_model THEN
            RAISE EXCEPTION USING
                ERRCODE = '22023',
                MESSAGE = 'idempotency key was already used with different request data';
        END IF;

        RETURN pg_catalog.jsonb_build_object(
            'success', v_existing.status NOT IN ('failed', 'rejected'),
            'idempotent', true,
            'status', v_existing.status,
            'credits_reserved', v_existing.credits_reserved,
            'provider_budget_reserved_micro_usd',
                v_existing.estimated_provider_cost_micro_usd
        );
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.research_credit_operations AS operation
        WHERE operation.request_id = p_request_id
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'idempotency key belongs to a legacy credit operation';
    END IF;

    SELECT *
    INTO v_subscription
    FROM public.subscriptions AS subscription
    WHERE subscription.user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_subscription.status <> 'active'
       OR v_subscription.plan_tier NOT IN ('starter', 'pro', 'agency')
       OR v_subscription.current_period_start IS NULL
       OR v_subscription.current_period_end IS NULL
       OR v_subscription.current_period_start >= v_subscription.current_period_end
       OR v_subscription.current_period_start > pg_catalog.now()
       OR v_subscription.current_period_end <= pg_catalog.now() THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'active subscription with a current billing period required';
    END IF;

    v_expected_allowance := CASE v_subscription.plan_tier
        WHEN 'starter' THEN 20
        WHEN 'pro' THEN 60
        WHEN 'agency' THEN 120
    END;

    SELECT *
    INTO v_pricing
    FROM public.research_provider_pricing AS pricing
    WHERE pricing.version_key = p_pricing_version
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'provider pricing missing';
    END IF;
    IF v_pricing.activation_blocked
       OR v_pricing.apify_provenance <> 'verified'
       OR v_pricing.openrouter_provenance <> 'verified'
       OR v_pricing.apify_verified_at IS NULL
       OR v_pricing.openrouter_verified_at IS NULL
       OR v_pricing.apify_verified_at > pg_catalog.now()
       OR v_pricing.openrouter_verified_at > pg_catalog.now()
       OR pg_catalog.btrim(v_pricing.apify_source_reference) = ''
       OR pg_catalog.btrim(v_pricing.openrouter_source_reference) = ''
       OR v_pricing.apify_micro_usd_per_billing_unit IS NULL
       OR v_pricing.apify_fixed_run_micro_usd IS NULL
       OR v_pricing.openrouter_input_micro_usd_per_million_tokens IS NULL
       OR v_pricing.openrouter_output_micro_usd_per_million_tokens IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'provider pricing is not verified';
    END IF;
    IF v_pricing.effective_from > pg_catalog.now()
       OR v_pricing.expires_at IS NULL
       OR v_pricing.expires_at <= pg_catalog.now() THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'provider pricing is not currently effective';
    END IF;
    IF v_pricing.apify_actor <> p_apify_actor
       OR v_pricing.openrouter_model <> p_openrouter_model THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'pricing provider mismatch';
    END IF;

    -- All arithmetic is performed from the verified database rate card. NUMERIC
    -- intermediates avoid BIGINT overflow before the hard limit is checked.
    v_apify_cost_numeric :=
        v_pricing.apify_fixed_run_micro_usd::NUMERIC
        + v_pricing.apify_micro_usd_per_billing_unit::NUMERIC
          * p_maximum_listings
          * v_pricing.apify_billable_units_per_requested_listing;
    v_openrouter_cost_numeric :=
        pg_catalog.ceil(
            v_pricing.openrouter_max_input_tokens::NUMERIC
            * v_pricing.openrouter_input_micro_usd_per_million_tokens
            / 1000000
        )
        + pg_catalog.ceil(
            v_pricing.openrouter_max_output_tokens::NUMERIC
            * v_pricing.openrouter_output_micro_usd_per_million_tokens
            / 1000000
        );
    v_estimated_cost_numeric :=
        v_apify_cost_numeric * v_pricing.apify_max_attempts
        + v_openrouter_cost_numeric * v_pricing.openrouter_max_attempts;
    v_per_job_limit := p_pages * v_pricing.hard_limit_micro_usd_per_credit;

    IF v_apify_cost_numeric > 9223372036854775807::NUMERIC
       OR v_openrouter_cost_numeric > 9223372036854775807::NUMERIC
       OR v_estimated_cost_numeric > v_per_job_limit
       OR v_estimated_cost_numeric > 9223372036854775807::NUMERIC THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'estimated provider cost exceeds job budget';
    END IF;

    v_apify_cost := v_apify_cost_numeric::BIGINT;
    v_openrouter_cost := v_openrouter_cost_numeric::BIGINT;
    v_estimated_provider_cost := v_estimated_cost_numeric::BIGINT;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('research-budget-global', 19042026)
    );
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_user_id::TEXT, 19042027)
    );

    -- Create the per-account durable liability guard while both scope locks are
    -- held, then lock global before account in every lifecycle path.
    INSERT INTO public.research_budget_liabilities (scope_type, user_id)
    VALUES ('account', p_user_id)
    ON CONFLICT (user_id) WHERE scope_type = 'account' DO NOTHING;

    SELECT *
    INTO v_global_liability
    FROM public.research_budget_liabilities AS liability
    WHERE liability.scope_type = 'global'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'global budget liability guard is missing';
    END IF;

    SELECT *
    INTO v_account_liability
    FROM public.research_budget_liabilities AS liability
    WHERE liability.scope_type = 'account'
      AND liability.user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account budget liability guard is missing';
    END IF;

    IF v_global_liability.outstanding_micro_usd > 0
       OR v_global_liability.blocked_at IS NOT NULL
       OR v_account_liability.outstanding_micro_usd > 0
       OR v_account_liability.blocked_at IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'research budget is blocked by unreconciled liability';
    END IF;

    SELECT pg_catalog.count(*)::INTEGER
    INTO v_window_count
    FROM public.research_budget_windows AS budget
    WHERE budget.scope_type = 'global'
      AND budget.period_start <= pg_catalog.now()
      AND budget.period_end > pg_catalog.now();

    IF v_window_count <> 1 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'one active global budget window required';
    END IF;

    SELECT *
    INTO v_global_window
    FROM public.research_budget_windows AS budget
    WHERE budget.scope_type = 'global'
      AND budget.period_start <= pg_catalog.now()
      AND budget.period_end > pg_catalog.now()
    FOR UPDATE;

    SELECT pg_catalog.count(*)::INTEGER
    INTO v_window_count
    FROM public.research_budget_windows AS budget
    WHERE budget.scope_type = 'account'
      AND budget.user_id = p_user_id
      AND budget.period_start = v_subscription.current_period_start
      AND budget.period_end = v_subscription.current_period_end;

    IF v_window_count <> 1 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'one current account budget window required';
    END IF;

    SELECT *
    INTO v_account_window
    FROM public.research_budget_windows AS budget
    WHERE budget.scope_type = 'account'
      AND budget.user_id = p_user_id
      AND budget.period_start = v_subscription.current_period_start
      AND budget.period_end = v_subscription.current_period_end
    FOR UPDATE;

    IF v_global_window.blocked_at IS NOT NULL
       OR v_account_window.blocked_at IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'research budget is blocked for reconciliation';
    END IF;

    IF v_global_window.reserved_micro_usd
            + v_global_window.settled_micro_usd
            + v_global_window.overrun_micro_usd
            + v_estimated_provider_cost
            > v_global_window.cap_micro_usd
       OR v_account_window.reserved_micro_usd
            + v_account_window.settled_micro_usd
            + v_account_window.overrun_micro_usd
            + v_estimated_provider_cost
            > v_account_window.cap_micro_usd THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'research spending cap exceeded';
    END IF;

    SELECT *
    INTO v_credit_account
    FROM public.research_credit_accounts AS account
    WHERE account.user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'credit account not found';
    END IF;

    v_current_credits := v_credit_account.credits_remaining;
    v_monthly_allowance := v_credit_account.monthly_allowance;

    IF v_monthly_allowance <> v_expected_allowance THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'credit allowance is inconsistent with active subscription';
    END IF;
    IF v_credit_account.credit_generation <= 0
       OR v_credit_account.credit_period_start IS NULL
       OR v_credit_account.credit_period_end IS NULL
       OR v_credit_account.credit_period_start <> v_subscription.current_period_start
       OR v_credit_account.credit_period_end <> v_subscription.current_period_end THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'credit account generation does not match the active subscription period';
    END IF;

    INSERT INTO public.research_credit_operations (
        request_id, user_id, keyword, pages_requested, credits_amount,
        status, balance_after_reservation, failure_reason,
        request_fingerprint, maximum_listings, pricing_version,
        estimated_provider_cost_micro_usd, credit_period_start,
        credit_period_end, credit_account_generation, refund_disposition
    ) VALUES (
        p_request_id, p_user_id, v_keyword, p_pages, p_pages,
        CASE WHEN v_current_credits < p_pages THEN 'rejected' ELSE 'reserved' END,
        CASE WHEN v_current_credits < p_pages THEN v_current_credits ELSE v_current_credits - p_pages END,
        CASE WHEN v_current_credits < p_pages THEN 'insufficient_credits' ELSE NULL END,
        p_request_fingerprint, p_maximum_listings, p_pricing_version,
        v_estimated_provider_cost, v_credit_account.credit_period_start,
        v_credit_account.credit_period_end, v_credit_account.credit_generation,
        CASE WHEN v_current_credits < p_pages THEN 'not_applicable' ELSE 'pending' END
    );

    INSERT INTO public.research_jobs (
        request_id, user_id, request_schema_version, request_fingerprint,
        keyword, pages_requested, maximum_listings, credits_reserved,
        credit_period_start, credit_period_end, credit_account_generation,
        apify_actor, openrouter_model, pricing_version,
        apify_billable_units_per_requested_listing,
        apify_max_attempts, apify_estimated_cost_per_attempt_micro_usd,
        openrouter_max_input_tokens, openrouter_max_output_tokens,
        openrouter_max_attempts, openrouter_estimated_cost_per_attempt_micro_usd,
        estimated_provider_cost_micro_usd,
        provider_spending_limit_micro_usd, status, failure_category
    ) VALUES (
        p_request_id, p_user_id, 'research-request-v1', p_request_fingerprint,
        v_keyword, p_pages, p_maximum_listings, p_pages,
        v_credit_account.credit_period_start, v_credit_account.credit_period_end,
        v_credit_account.credit_generation,
        p_apify_actor, p_openrouter_model, p_pricing_version,
        v_pricing.apify_billable_units_per_requested_listing,
        v_pricing.apify_max_attempts, v_apify_cost,
        v_pricing.openrouter_max_input_tokens,
        v_pricing.openrouter_max_output_tokens,
        v_pricing.openrouter_max_attempts, v_openrouter_cost,
        v_estimated_provider_cost, v_per_job_limit,
        CASE WHEN v_current_credits < p_pages THEN 'rejected' ELSE 'reserved' END,
        CASE WHEN v_current_credits < p_pages THEN 'insufficient_credits' ELSE NULL END
    );

    IF v_current_credits < p_pages THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'idempotent', false,
            'status', 'rejected',
            'required', p_pages,
            'credits_remaining', v_current_credits
        );
    END IF;

    v_new_balance := v_current_credits - p_pages;

    UPDATE public.research_credit_accounts
    SET credits_remaining = v_new_balance,
        updated_at = pg_catalog.now()
    WHERE user_id = p_user_id;

    UPDATE public.research_budget_windows
    SET reserved_micro_usd = reserved_micro_usd + v_estimated_provider_cost,
        updated_at = pg_catalog.now()
    WHERE id IN (v_global_window.id, v_account_window.id);

    INSERT INTO public.research_budget_reservations (
        request_id, user_id, global_window_id, account_window_id,
        reserved_micro_usd, status
    ) VALUES (
        p_request_id, p_user_id, v_global_window.id, v_account_window.id,
        v_estimated_provider_cost, 'reserved'
    );

    INSERT INTO public.research_credit_ledger (
        user_id, amount, balance_after, action_type, description, request_id,
        credit_period_start, credit_period_end, credit_account_generation
    ) VALUES (
        p_user_id, -p_pages, v_new_balance, 'deduction_query',
        'Research credit reservation', p_request_id,
        v_credit_account.credit_period_start, v_credit_account.credit_period_end,
        v_credit_account.credit_generation
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'status', 'reserved',
        'credits_reserved', p_pages,
        'credits_remaining', v_new_balance,
        'provider_budget_reserved_micro_usd', v_estimated_provider_cost
    );
END;
$$;

-- A provider call may begin only while the job and reserved budget are usable.
-- Retry numbers are bounded and unique, and OpenRouter cannot precede Apify.
CREATE FUNCTION public.begin_research_provider_attempt(
    p_attempt_id UUID,
    p_request_id UUID,
    p_user_id UUID,
    p_provider TEXT,
    p_provider_identifier TEXT,
    p_retry_number INTEGER,
    p_provider_attempt_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_job public.research_jobs%ROWTYPE;
    v_attempt public.research_provider_attempts%ROWTYPE;
    v_budget public.research_budget_reservations%ROWTYPE;
    v_attempt_cost BIGINT;
    v_projected_cost BIGINT;
BEGIN
    IF p_attempt_id IS NULL OR p_request_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'attempt, request, and user IDs are required';
    END IF;
    IF p_provider IS NULL
       OR p_provider NOT IN ('apify', 'openrouter')
       OR p_provider_identifier IS NULL
       OR p_retry_number IS NULL
       OR p_retry_number NOT BETWEEN 1 AND 2 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid provider attempt';
    END IF;
    IF (p_provider = 'apify' AND p_provider_identifier <> 'yumitori/etsy-listings-scraper')
       OR (
           p_provider = 'openrouter'
           AND p_provider_identifier <> 'google/gemini-3.1-flash-lite'
       ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'provider or model mismatch';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_request_id::TEXT, 19042026)
    );

    SELECT *
    INTO v_job
    FROM public.research_jobs AS job
    WHERE job.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_job.user_id <> p_user_id THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'research job not found';
    END IF;

    -- Resolve duplicate calls before checking current job state so a retry of a
    -- successful begin remains idempotent after the job advances.
    SELECT *
    INTO v_attempt
    FROM public.research_provider_attempts AS attempt
    WHERE attempt.id = p_attempt_id
       OR (
           attempt.request_id = p_request_id
           AND attempt.provider = p_provider
           AND attempt.retry_number = p_retry_number
       )
    FOR UPDATE;

    IF FOUND THEN
        IF v_attempt.id <> p_attempt_id
           OR v_attempt.request_id <> p_request_id
           OR v_attempt.user_id <> p_user_id
           OR v_attempt.provider <> p_provider
           OR v_attempt.provider_identifier <> p_provider_identifier
           OR v_attempt.retry_number <> p_retry_number
           OR (
               p_provider_attempt_id IS NOT NULL
               AND v_attempt.provider_attempt_id IS DISTINCT FROM p_provider_attempt_id
           ) THEN
            RAISE EXCEPTION USING
                ERRCODE = '22023',
                MESSAGE = 'attempt idempotency key was reused with different data';
        END IF;
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent', true,
            'status', v_attempt.status,
            'attempt_id', v_attempt.id
        );
    END IF;

    IF v_job.status IN ('ambiguous', 'succeeded', 'failed', 'rejected') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'research job cannot start another attempt';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.research_provider_attempts AS attempt
        WHERE attempt.request_id = p_request_id
          AND attempt.status = 'started'
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'another provider attempt is active';
    END IF;

    IF p_provider = 'apify' THEN
        IF p_retry_number > v_job.apify_max_attempts
           OR (p_retry_number = 1 AND v_job.status <> 'reserved')
           OR (
               p_retry_number = 1
               AND EXISTS (
                   SELECT 1
                   FROM public.research_provider_attempts AS attempt
                   WHERE attempt.request_id = p_request_id
                     AND attempt.provider = 'apify'
               )
           )
           OR (
               p_retry_number = 2
               AND (
                   v_job.status <> 'apify_failed'
                   OR NOT EXISTS (
                       SELECT 1
                       FROM public.research_provider_attempts AS attempt
                       WHERE attempt.request_id = p_request_id
                         AND attempt.provider = 'apify'
                         AND attempt.retry_number = 1
                         AND attempt.status = 'failed'
                   )
               )
           ) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid Apify attempt transition';
        END IF;
        v_attempt_cost := v_job.apify_estimated_cost_per_attempt_micro_usd;
    ELSE
        IF p_retry_number > v_job.openrouter_max_attempts
           OR NOT EXISTS (
               SELECT 1
               FROM public.research_provider_attempts AS attempt
               WHERE attempt.request_id = p_request_id
                 AND attempt.provider = 'apify'
                 AND attempt.status = 'succeeded'
           )
           OR (p_retry_number = 1 AND v_job.status <> 'apify_complete')
           OR (
               p_retry_number = 1
               AND EXISTS (
                   SELECT 1
                   FROM public.research_provider_attempts AS attempt
                   WHERE attempt.request_id = p_request_id
                     AND attempt.provider = 'openrouter'
               )
           )
           OR (
               p_retry_number = 2
               AND (
                   v_job.status <> 'openrouter_failed'
                   OR NOT EXISTS (
                       SELECT 1
                       FROM public.research_provider_attempts AS attempt
                       WHERE attempt.request_id = p_request_id
                         AND attempt.provider = 'openrouter'
                         AND attempt.retry_number = 1
                         AND attempt.status = 'failed'
                   )
               )
           ) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid OpenRouter attempt transition';
        END IF;
        v_attempt_cost := v_job.openrouter_estimated_cost_per_attempt_micro_usd;
    END IF;

    SELECT *
    INTO v_budget
    FROM public.research_budget_reservations AS reservation
    WHERE reservation.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_budget.user_id <> p_user_id OR v_budget.status <> 'reserved' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'provider budget is not available';
    END IF;

    -- Count each prior attempt once at the greater of its reserved estimate
    -- and known reported liability. Missing provider usage remains charged at
    -- the conservative estimate before adding this projected attempt.
    SELECT COALESCE(pg_catalog.sum(
        GREATEST(
            attempt.estimated_cost_micro_usd,
            COALESCE(
                attempt.reported_cost_micro_usd,
                attempt.estimated_cost_micro_usd
            )
        )
    ), 0) + v_attempt_cost
    INTO v_projected_cost
    FROM public.research_provider_attempts AS attempt
    WHERE attempt.request_id = p_request_id;

    IF v_projected_cost > v_budget.reserved_micro_usd
       OR v_projected_cost > v_job.provider_spending_limit_micro_usd THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'provider attempt exceeds reserved budget';
    END IF;

    INSERT INTO public.research_provider_attempts (
        id, request_id, user_id, provider, provider_identifier,
        provider_attempt_id, retry_number, status,
        estimated_cost_micro_usd, cost_provenance
    ) VALUES (
        p_attempt_id, p_request_id, p_user_id, p_provider,
        p_provider_identifier, p_provider_attempt_id, p_retry_number,
        'started', v_attempt_cost, 'estimated'
    );

    UPDATE public.research_jobs
    SET status = CASE p_provider
            WHEN 'apify' THEN 'apify_running'
            ELSE 'openrouter_running'
        END,
        updated_at = pg_catalog.now()
    WHERE request_id = p_request_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'status', 'started',
        'attempt_id', p_attempt_id,
        'estimated_cost_micro_usd', v_attempt_cost
    );
END;
$$;

CREATE FUNCTION public.finish_research_provider_attempt(
    p_attempt_id UUID,
    p_request_id UUID,
    p_user_id UUID,
    p_status TEXT,
    p_provider_version TEXT DEFAULT NULL,
    p_error_category TEXT DEFAULT NULL,
    p_input_tokens BIGINT DEFAULT NULL,
    p_output_tokens BIGINT DEFAULT NULL,
    p_billing_units BIGINT DEFAULT NULL,
    p_reported_cost_micro_usd BIGINT DEFAULT NULL,
    p_provider_attempt_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_attempt public.research_provider_attempts%ROWTYPE;
    v_job public.research_jobs%ROWTYPE;
    v_budget public.research_budget_reservations%ROWTYPE;
    v_global_liability public.research_budget_liabilities%ROWTYPE;
    v_account_liability public.research_budget_liabilities%ROWTYPE;
    v_global_budget public.research_budget_windows%ROWTYPE;
    v_account_budget public.research_budget_windows%ROWTYPE;
    v_projected_cost BIGINT;
    v_overrun BIGINT;
    v_liability_guard_count INTEGER;
BEGIN
    IF p_status IS NULL OR p_status NOT IN ('succeeded', 'failed', 'ambiguous') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid provider attempt outcome';
    END IF;
    IF (p_status = 'succeeded' AND (
            p_error_category IS NOT NULL
            OR pg_catalog.char_length(pg_catalog.btrim(COALESCE(p_provider_version, ''))) NOT BETWEEN 1 AND 200
            OR pg_catalog.char_length(pg_catalog.btrim(COALESCE(p_provider_attempt_id, ''))) NOT BETWEEN 1 AND 200
       ))
       OR (
           p_status IN ('failed', 'ambiguous')
           AND (
               p_error_category IS NULL
               OR p_error_category NOT IN (
                   'rate_limited', 'timeout', 'provider_4xx', 'provider_5xx',
                   'invalid_response', 'budget_rejected', 'cost_overrun', 'unknown'
               )
           )
       )
       OR (
           p_provider_version IS NOT NULL
           AND pg_catalog.char_length(pg_catalog.btrim(p_provider_version)) NOT BETWEEN 1 AND 200
       ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid provider outcome provenance';
    END IF;
    IF COALESCE(p_input_tokens, 0) < 0
       OR COALESCE(p_output_tokens, 0) < 0
       OR COALESCE(p_billing_units, 0) < 0
       OR COALESCE(p_reported_cost_micro_usd, 0) < 0 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'provider usage cannot be negative';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_request_id::TEXT, 19042026)
    );

    SELECT *
    INTO v_attempt
    FROM public.research_provider_attempts AS attempt
    WHERE attempt.id = p_attempt_id
      AND attempt.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_attempt.user_id <> p_user_id THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'provider attempt not found';
    END IF;

    IF v_attempt.status <> 'started' THEN
        IF v_attempt.status <> p_status
           OR v_attempt.provider_version IS DISTINCT FROM p_provider_version
           OR v_attempt.error_category IS DISTINCT FROM p_error_category
           OR v_attempt.input_tokens IS DISTINCT FROM p_input_tokens
           OR v_attempt.output_tokens IS DISTINCT FROM p_output_tokens
           OR v_attempt.billing_units IS DISTINCT FROM p_billing_units
           OR v_attempt.reported_cost_micro_usd IS DISTINCT FROM p_reported_cost_micro_usd
           OR v_attempt.provider_attempt_id IS DISTINCT FROM
                COALESCE(p_provider_attempt_id, v_attempt.provider_attempt_id) THEN
            RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'provider attempt outcome cannot change';
        END IF;
        RETURN pg_catalog.jsonb_build_object(
            'success', v_attempt.status = 'succeeded',
            'idempotent', true,
            'status', v_attempt.status
        );
    END IF;

    SELECT *
    INTO v_job
    FROM public.research_jobs AS job
    WHERE job.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_job.user_id <> p_user_id THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'research job not found';
    END IF;
    IF v_job.status IN ('ambiguous', 'succeeded', 'failed', 'rejected')
       OR (v_attempt.provider = 'apify' AND v_job.status <> 'apify_running')
       OR (v_attempt.provider = 'openrouter' AND v_job.status <> 'openrouter_running') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'provider attempt is not active for this job';
    END IF;

    SELECT *
    INTO v_budget
    FROM public.research_budget_reservations AS reservation
    WHERE reservation.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_budget.user_id <> p_user_id
       OR v_budget.status <> 'reserved'
       OR v_budget.reserved_micro_usd <> v_job.estimated_provider_cost_micro_usd
       OR v_budget.reserved_micro_usd > v_job.provider_spending_limit_micro_usd THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'provider budget reservation is missing or invalid';
    END IF;

    SELECT COALESCE(pg_catalog.sum(
        CASE
            WHEN attempt.id = p_attempt_id
                THEN COALESCE(p_reported_cost_micro_usd, attempt.estimated_cost_micro_usd)
            ELSE COALESCE(attempt.reported_cost_micro_usd, attempt.estimated_cost_micro_usd)
        END
    ), 0)
    INTO v_projected_cost
    FROM public.research_provider_attempts AS attempt
    WHERE attempt.request_id = p_request_id;

    IF v_projected_cost > v_budget.reserved_micro_usd
       OR v_projected_cost > v_job.provider_spending_limit_micro_usd THEN
        -- Serialize both durable scopes before touching either the liability
        -- guards or the historical windows. Reservation uses this same global-
        -- then-account order, preventing a concurrent rollover bypass.
        PERFORM pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended('research-budget-global', 19042026)
        );
        PERFORM pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(p_user_id::TEXT, 19042027)
        );

        SELECT *
        INTO v_global_liability
        FROM public.research_budget_liabilities AS liability
        WHERE liability.scope_type = 'global'
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'global budget liability guard is missing';
        END IF;

        SELECT *
        INTO v_account_liability
        FROM public.research_budget_liabilities AS liability
        WHERE liability.scope_type = 'account'
          AND liability.user_id = p_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account budget liability guard is missing';
        END IF;

        -- Keep the original period windows for accounting evidence while the
        -- durable guards carry the block into every later period.
        SELECT *
        INTO v_global_budget
        FROM public.research_budget_windows AS budget
        WHERE budget.id = v_budget.global_window_id
        FOR UPDATE;

        IF NOT FOUND OR v_global_budget.scope_type <> 'global' THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'global budget window is missing or invalid';
        END IF;

        SELECT *
        INTO v_account_budget
        FROM public.research_budget_windows AS budget
        WHERE budget.id = v_budget.account_window_id
        FOR UPDATE;

        IF NOT FOUND
           OR v_account_budget.scope_type <> 'account'
           OR v_account_budget.user_id <> p_user_id THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account budget window is missing or invalid';
        END IF;

        v_overrun := v_projected_cost - v_budget.reserved_micro_usd;

        UPDATE public.research_budget_liabilities
        SET outstanding_micro_usd = outstanding_micro_usd + v_overrun,
            blocked_at = COALESCE(blocked_at, pg_catalog.now()),
            blocked_reason = 'provider_cost_overrun',
            updated_at = pg_catalog.now()
        WHERE id IN (v_global_liability.id, v_account_liability.id);

        GET DIAGNOSTICS v_liability_guard_count = ROW_COUNT;
        IF v_liability_guard_count <> 2 THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'budget liability guards cannot be updated';
        END IF;

        UPDATE public.research_budget_windows
        SET overrun_micro_usd = overrun_micro_usd + v_overrun,
            blocked_at = COALESCE(blocked_at, pg_catalog.now()),
            blocked_reason = 'provider_cost_overrun',
            updated_at = pg_catalog.now()
        WHERE id IN (v_budget.global_window_id, v_budget.account_window_id);

        UPDATE public.research_provider_attempts
        SET status = 'ambiguous',
            provider_version = p_provider_version,
            error_category = 'cost_overrun',
            input_tokens = p_input_tokens,
            output_tokens = p_output_tokens,
            billing_units = p_billing_units,
            reported_cost_micro_usd = p_reported_cost_micro_usd,
            cost_provenance = CASE
                WHEN p_reported_cost_micro_usd IS NULL THEN 'estimated'
                ELSE 'reported'
            END,
            provider_attempt_id = COALESCE(p_provider_attempt_id, provider_attempt_id),
            finished_at = pg_catalog.now()
        WHERE id = p_attempt_id;

        UPDATE public.research_jobs
        SET status = 'ambiguous',
            failure_category = 'cost_overrun',
            updated_at = pg_catalog.now()
        WHERE request_id = p_request_id;

        UPDATE public.research_credit_operations
        SET status = 'ambiguous',
            failure_reason = 'cost_overrun',
            updated_at = pg_catalog.now()
        WHERE request_id = p_request_id;

        UPDATE public.research_budget_reservations
        SET status = 'held'
        WHERE request_id = p_request_id;

        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'idempotent', false,
            'status', 'ambiguous',
            'reason', 'cost_overrun',
            'overrun_micro_usd', v_overrun
        );
    END IF;

    UPDATE public.research_provider_attempts
    SET status = p_status,
        provider_version = p_provider_version,
        error_category = p_error_category,
        input_tokens = p_input_tokens,
        output_tokens = p_output_tokens,
        billing_units = p_billing_units,
        reported_cost_micro_usd = p_reported_cost_micro_usd,
        cost_provenance = CASE
            WHEN p_reported_cost_micro_usd IS NULL THEN 'estimated'
            ELSE 'reported'
        END,
        provider_attempt_id = COALESCE(p_provider_attempt_id, provider_attempt_id),
        finished_at = pg_catalog.now()
    WHERE id = p_attempt_id;

    IF p_status = 'ambiguous' THEN
        UPDATE public.research_jobs
        SET status = 'ambiguous',
            failure_category = p_error_category,
            updated_at = pg_catalog.now()
        WHERE request_id = p_request_id;

        UPDATE public.research_credit_operations
        SET status = 'ambiguous',
            failure_reason = p_error_category,
            updated_at = pg_catalog.now()
        WHERE request_id = p_request_id;

        UPDATE public.research_budget_reservations
        SET status = 'held'
        WHERE request_id = p_request_id;
    ELSIF p_status = 'succeeded' THEN
        UPDATE public.research_jobs
        SET status = CASE v_attempt.provider
                WHEN 'apify' THEN 'apify_complete'
                ELSE 'openrouter_complete'
            END,
            failure_category = NULL,
            updated_at = pg_catalog.now()
        WHERE request_id = p_request_id;
    ELSE
        UPDATE public.research_jobs
        SET status = CASE v_attempt.provider
                WHEN 'apify' THEN 'apify_failed'
                ELSE 'openrouter_failed'
            END,
            failure_category = p_error_category,
            updated_at = pg_catalog.now()
        WHERE request_id = p_request_id;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', p_status = 'succeeded',
        'idempotent', false,
        'status', p_status
    );
END;
$$;

-- Unknown provider outcomes keep both credit and budget reservations held.
CREATE FUNCTION public.mark_research_job_ambiguous(
    p_request_id UUID,
    p_user_id UUID,
    p_failure_category TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_job public.research_jobs%ROWTYPE;
BEGIN
    IF p_failure_category NOT IN (
        'rate_limited', 'timeout', 'provider_4xx', 'provider_5xx',
        'invalid_response', 'budget_rejected', 'cost_overrun', 'unknown'
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid failure category';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_request_id::TEXT, 19042026)
    );

    SELECT *
    INTO v_job
    FROM public.research_jobs AS job
    WHERE job.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_job.user_id <> p_user_id THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'research job not found';
    END IF;
    IF v_job.status IN ('succeeded', 'failed', 'rejected') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'terminal research outcome cannot change';
    END IF;
    IF v_job.status = 'ambiguous' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 'idempotent', true, 'status', 'ambiguous'
        );
    END IF;

    UPDATE public.research_jobs
    SET status = 'ambiguous',
        failure_category = p_failure_category,
        updated_at = pg_catalog.now()
    WHERE request_id = p_request_id;

    UPDATE public.research_credit_operations
    SET status = 'ambiguous',
        failure_reason = p_failure_category,
        updated_at = pg_catalog.now()
    WHERE request_id = p_request_id;

    UPDATE public.research_budget_reservations
    SET status = 'held'
    WHERE request_id = p_request_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', false, 'idempotent', false, 'status', 'ambiguous'
    );
END;
$$;

-- Publish result, write history, settle both budgets, and commit the already
-- deducted credit in this single database transaction.
CREATE FUNCTION public.complete_research_job(
    p_request_id UUID,
    p_user_id UUID,
    p_apify_attempt_id UUID,
    p_openrouter_attempt_id UUID,
    p_observed_schema_version TEXT,
    p_observed_payload JSONB,
    p_observed_record_count INTEGER,
    p_source_collected_at TIMESTAMPTZ,
    p_modeled_schema_version TEXT,
    p_modeled_payload JSONB,
    p_prompt_version TEXT,
    p_modeled_generated_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_job public.research_jobs%ROWTYPE;
    v_apify_attempt public.research_provider_attempts%ROWTYPE;
    v_openrouter_attempt public.research_provider_attempts%ROWTYPE;
    v_existing_result public.research_results%ROWTYPE;
    v_reservation public.research_budget_reservations%ROWTYPE;
    v_global_budget public.research_budget_windows%ROWTYPE;
    v_account_budget public.research_budget_windows%ROWTYPE;
    v_actual_cost BIGINT;
BEGIN
    IF p_apify_attempt_id IS NULL
       OR p_openrouter_attempt_id IS NULL
       OR p_apify_attempt_id = p_openrouter_attempt_id
       OR pg_catalog.btrim(COALESCE(p_observed_schema_version, '')) = ''
       OR pg_catalog.btrim(COALESCE(p_modeled_schema_version, '')) = ''
       OR pg_catalog.btrim(COALESCE(p_prompt_version, '')) = ''
       OR p_observed_payload IS NULL
       OR pg_catalog.jsonb_typeof(p_observed_payload) <> 'object'
       OR p_modeled_payload IS NULL
       OR pg_catalog.jsonb_typeof(p_modeled_payload) <> 'object'
       OR p_observed_record_count IS NULL
       OR p_observed_record_count < 0
       OR p_source_collected_at IS NULL
       OR p_modeled_generated_at IS NULL
       OR p_source_collected_at > pg_catalog.now()
       OR p_modeled_generated_at > pg_catalog.now()
       OR p_modeled_generated_at < p_source_collected_at THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid research result provenance';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_request_id::TEXT, 19042026)
    );

    SELECT *
    INTO v_job
    FROM public.research_jobs AS job
    WHERE job.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_job.user_id <> p_user_id THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'research job not found';
    END IF;

    IF v_job.status = 'succeeded' THEN
        SELECT *
        INTO v_existing_result
        FROM public.research_results AS result
        WHERE result.request_id = p_request_id;

        IF NOT FOUND
           OR v_existing_result.user_id <> p_user_id
           OR v_existing_result.apify_attempt_id <> p_apify_attempt_id
           OR v_existing_result.openrouter_attempt_id <> p_openrouter_attempt_id
           OR v_existing_result.observed_schema_version <> p_observed_schema_version
           OR v_existing_result.observed_payload <> p_observed_payload
           OR v_existing_result.observed_record_count <> p_observed_record_count
           OR v_existing_result.source_collected_at <> p_source_collected_at
           OR v_existing_result.modeled_schema_version <> p_modeled_schema_version
           OR v_existing_result.modeled_payload <> p_modeled_payload
           OR v_existing_result.prompt_version <> p_prompt_version
           OR v_existing_result.modeled_generated_at <> p_modeled_generated_at THEN
            RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'completion idempotency key was reused with different data';
        END IF;

        RETURN pg_catalog.jsonb_build_object(
            'success', true, 'idempotent', true, 'status', 'succeeded'
        );
    END IF;
    IF v_job.status IN ('ambiguous', 'failed', 'rejected') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'terminal research outcome cannot change';
    END IF;
    IF v_job.status <> 'openrouter_complete' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'research providers have not completed';
    END IF;
    IF p_observed_record_count > v_job.maximum_listings THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'observed listing count exceeds the requested limit';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.research_provider_attempts AS attempt
        WHERE attempt.request_id = p_request_id
          AND attempt.status = 'started'
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'provider attempts are incomplete';
    END IF;

    SELECT *
    INTO v_apify_attempt
    FROM public.research_provider_attempts AS attempt
    WHERE attempt.id = p_apify_attempt_id
      AND attempt.request_id = p_request_id
      AND attempt.user_id = p_user_id
      AND attempt.provider = 'apify'
    FOR UPDATE;

    IF NOT FOUND
       OR v_apify_attempt.status <> 'succeeded'
       OR v_apify_attempt.provider_version IS NULL
       OR v_apify_attempt.finished_at IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'successful Apify evidence is required';
    END IF;

    SELECT *
    INTO v_openrouter_attempt
    FROM public.research_provider_attempts AS attempt
    WHERE attempt.id = p_openrouter_attempt_id
      AND attempt.request_id = p_request_id
      AND attempt.user_id = p_user_id
      AND attempt.provider = 'openrouter'
    FOR UPDATE;

    IF NOT FOUND
       OR v_openrouter_attempt.status <> 'succeeded'
       OR v_openrouter_attempt.provider_version IS NULL
       OR v_openrouter_attempt.finished_at IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'successful OpenRouter evidence is required';
    END IF;

    IF p_source_collected_at < v_apify_attempt.started_at
       OR p_source_collected_at > v_apify_attempt.finished_at
       OR p_modeled_generated_at < v_openrouter_attempt.started_at
       OR p_modeled_generated_at > v_openrouter_attempt.finished_at THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'result timestamps do not match provider attempts';
    END IF;

    SELECT *
    INTO v_reservation
    FROM public.research_budget_reservations AS reservation
    WHERE reservation.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_reservation.user_id <> p_user_id
       OR v_reservation.status <> 'reserved'
       OR v_reservation.reserved_micro_usd <> v_job.estimated_provider_cost_micro_usd THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'budget reservation is unavailable';
    END IF;

    SELECT COALESCE(pg_catalog.sum(
        COALESCE(attempt.reported_cost_micro_usd, attempt.estimated_cost_micro_usd)
    ), 0)
    INTO v_actual_cost
    FROM public.research_provider_attempts AS attempt
    WHERE attempt.request_id = p_request_id;

    IF v_actual_cost > v_reservation.reserved_micro_usd
       OR v_actual_cost > v_job.provider_spending_limit_micro_usd THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'provider cost requires reconciliation';
    END IF;

    -- Lock global then account budget in the same order as reservation.
    SELECT *
    INTO v_global_budget
    FROM public.research_budget_windows AS budget
    WHERE budget.id = v_reservation.global_window_id
    FOR UPDATE;

    IF NOT FOUND OR v_global_budget.scope_type <> 'global' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'global budget window is missing or invalid';
    END IF;

    SELECT *
    INTO v_account_budget
    FROM public.research_budget_windows AS budget
    WHERE budget.id = v_reservation.account_window_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_account_budget.scope_type <> 'account'
       OR v_account_budget.user_id <> p_user_id THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account budget window is missing or invalid';
    END IF;

    INSERT INTO public.research_results (
        request_id, user_id, apify_attempt_id, openrouter_attempt_id,
        observed_source_provider, observed_provider_identifier,
        observed_provider_version, observed_schema_version,
        observed_payload, observed_record_count, source_collected_at,
        modeled_source_provider, modeled_provider_identifier,
        modeled_provider_version, modeled_schema_version,
        modeled_payload, prompt_version,
        modeled_generated_at
    ) VALUES (
        p_request_id, p_user_id, p_apify_attempt_id, p_openrouter_attempt_id,
        'apify', v_job.apify_actor,
        v_apify_attempt.provider_version, p_observed_schema_version,
        p_observed_payload, p_observed_record_count, p_source_collected_at,
        'openrouter', v_job.openrouter_model,
        v_openrouter_attempt.provider_version, p_modeled_schema_version,
        p_modeled_payload, p_prompt_version,
        p_modeled_generated_at
    );

    INSERT INTO public.research_history (
        user_id, keyword, pages_requested, credits_consumed,
        listings_found, request_id
    ) VALUES (
        p_user_id, v_job.keyword, v_job.pages_requested,
        v_job.credits_reserved, p_observed_record_count, p_request_id
    );

    UPDATE public.research_budget_windows
    SET reserved_micro_usd = reserved_micro_usd - v_reservation.reserved_micro_usd,
        settled_micro_usd = settled_micro_usd + v_actual_cost,
        updated_at = pg_catalog.now()
    WHERE id IN (
        v_reservation.global_window_id,
        v_reservation.account_window_id
    );

    UPDATE public.research_budget_reservations
    SET status = 'settled',
        settled_micro_usd = v_actual_cost,
        settled_at = pg_catalog.now()
    WHERE request_id = p_request_id;

    UPDATE public.research_credit_operations
    SET status = 'committed',
        listings_found = p_observed_record_count,
        failure_reason = NULL,
        refund_disposition = 'not_applicable',
        updated_at = pg_catalog.now(),
        finalized_at = pg_catalog.now()
    WHERE request_id = p_request_id
      AND status = 'reserved'
      AND refund_disposition = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'credit reservation cannot be committed';
    END IF;

    UPDATE public.research_jobs
    SET status = 'succeeded',
        failure_category = NULL,
        updated_at = pg_catalog.now(),
        finalized_at = pg_catalog.now()
    WHERE request_id = p_request_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'status', 'succeeded',
        'provider_cost_micro_usd', v_actual_cost
    );
END;
$$;

-- Definitive failure settles recorded provider cost and releases unused
-- budget. It refunds only the still-current credit generation; a reservation
-- from an expired generation is finalized without changing the newer balance.
CREATE FUNCTION public.fail_research_job(
    p_request_id UUID,
    p_user_id UUID,
    p_failure_category TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_job public.research_jobs%ROWTYPE;
    v_operation public.research_credit_operations%ROWTYPE;
    v_reservation public.research_budget_reservations%ROWTYPE;
    v_global_budget public.research_budget_windows%ROWTYPE;
    v_account_budget public.research_budget_windows%ROWTYPE;
    v_credit_account public.research_credit_accounts%ROWTYPE;
    v_actual_cost BIGINT;
    v_balance INTEGER;
    v_refund_disposition TEXT;
BEGIN
    IF p_failure_category IS NULL OR p_failure_category NOT IN (
        'rate_limited', 'timeout', 'provider_4xx', 'provider_5xx',
        'invalid_response', 'budget_rejected', 'unknown'
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid failure category';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_request_id::TEXT, 19042026)
    );

    SELECT *
    INTO v_job
    FROM public.research_jobs AS job
    WHERE job.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_job.user_id <> p_user_id THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'research job not found';
    END IF;
    IF v_job.status = 'failed' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 'idempotent', true, 'status', 'failed'
        );
    END IF;
    IF v_job.status = 'ambiguous' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ambiguous research outcome requires audited reconciliation';
    END IF;
    IF v_job.status IN ('succeeded', 'rejected') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'terminal research outcome cannot change';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.research_provider_attempts AS attempt
        WHERE attempt.request_id = p_request_id
          AND attempt.status = 'started'
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'in-flight provider attempt requires ambiguous reconciliation';
    END IF;

    SELECT *
    INTO v_operation
    FROM public.research_credit_operations AS operation
    WHERE operation.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_operation.user_id <> p_user_id
       OR v_operation.status <> 'reserved'
       OR v_operation.credits_amount <> v_job.credits_reserved
       OR v_operation.credit_period_start IS NULL
       OR v_operation.credit_period_end IS NULL
       OR v_operation.credit_account_generation IS NULL
       OR v_operation.credit_account_generation <= 0
       OR v_operation.refund_disposition IS DISTINCT FROM 'pending'
       OR v_operation.credit_period_start <> v_job.credit_period_start
       OR v_operation.credit_period_end <> v_job.credit_period_end
       OR v_operation.credit_account_generation <> v_job.credit_account_generation THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'credit reservation is unavailable or has inconsistent period identity';
    END IF;

    SELECT *
    INTO v_reservation
    FROM public.research_budget_reservations AS reservation
    WHERE reservation.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_reservation.user_id <> p_user_id
       OR v_reservation.status <> 'reserved'
       OR v_reservation.reserved_micro_usd <> v_job.estimated_provider_cost_micro_usd THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'budget reservation is unavailable';
    END IF;

    SELECT COALESCE(pg_catalog.sum(
        COALESCE(attempt.reported_cost_micro_usd, attempt.estimated_cost_micro_usd)
    ), 0)
    INTO v_actual_cost
    FROM public.research_provider_attempts AS attempt
    WHERE attempt.request_id = p_request_id;

    IF v_actual_cost > v_reservation.reserved_micro_usd
       OR v_actual_cost > v_job.provider_spending_limit_micro_usd THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'provider cost requires reconciliation';
    END IF;

    SELECT *
    INTO v_global_budget
    FROM public.research_budget_windows AS budget
    WHERE budget.id = v_reservation.global_window_id
    FOR UPDATE;

    IF NOT FOUND OR v_global_budget.scope_type <> 'global' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'global budget window is missing or invalid';
    END IF;

    SELECT *
    INTO v_account_budget
    FROM public.research_budget_windows AS budget
    WHERE budget.id = v_reservation.account_window_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_account_budget.scope_type <> 'account'
       OR v_account_budget.user_id <> p_user_id THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account budget window is missing or invalid';
    END IF;

    SELECT *
    INTO v_credit_account
    FROM public.research_credit_accounts AS account
    WHERE account.user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_credit_account.credit_generation <= 0
       OR v_credit_account.credit_period_start IS NULL
       OR v_credit_account.credit_period_end IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'credit account period identity is missing or invalid';
    END IF;

    v_balance := v_credit_account.credits_remaining;

    IF v_credit_account.credit_generation = v_operation.credit_account_generation
       AND v_credit_account.credit_period_start = v_operation.credit_period_start
       AND v_credit_account.credit_period_end = v_operation.credit_period_end THEN
        v_balance := v_balance + v_operation.credits_amount;
        v_refund_disposition := 'refunded';

        UPDATE public.research_credit_accounts
        SET credits_remaining = v_balance,
            updated_at = pg_catalog.now()
        WHERE user_id = p_user_id
          AND credit_generation = v_operation.credit_account_generation
          AND credit_period_start = v_operation.credit_period_start
          AND credit_period_end = v_operation.credit_period_end;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'credit account generation changed during refund';
        END IF;

        INSERT INTO public.research_credit_ledger (
            user_id, amount, balance_after, action_type, description, request_id,
            credit_period_start, credit_period_end, credit_account_generation
        ) VALUES (
            p_user_id, v_operation.credits_amount, v_balance, 'refund',
            'Failed research reservation refund', p_request_id,
            v_operation.credit_period_start, v_operation.credit_period_end,
            v_operation.credit_account_generation
        );
    ELSIF v_credit_account.credit_generation > v_operation.credit_account_generation THEN
        -- A later credit reset owns the current balance. The expired reservation
        -- remains auditable but cannot mint credits into the newer generation.
        v_refund_disposition := 'expired_generation';
    ELSE
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'credit account period identity is inconsistent with the reservation';
    END IF;

    UPDATE public.research_budget_windows
    SET reserved_micro_usd = reserved_micro_usd - v_reservation.reserved_micro_usd,
        settled_micro_usd = settled_micro_usd + v_actual_cost,
        updated_at = pg_catalog.now()
    WHERE id IN (
        v_reservation.global_window_id,
        v_reservation.account_window_id
    );

    UPDATE public.research_budget_reservations
    SET status = 'settled',
        settled_micro_usd = v_actual_cost,
        settled_at = pg_catalog.now()
    WHERE request_id = p_request_id;

    UPDATE public.research_credit_operations
    SET status = 'failed',
        failure_reason = p_failure_category,
        refund_disposition = v_refund_disposition,
        updated_at = pg_catalog.now(),
        finalized_at = pg_catalog.now()
    WHERE request_id = p_request_id
      AND status = 'reserved';

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'credit reservation cannot be refunded';
    END IF;

    UPDATE public.research_jobs
    SET status = 'failed',
        failure_category = p_failure_category,
        updated_at = pg_catalog.now(),
        finalized_at = pg_catalog.now()
    WHERE request_id = p_request_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', false,
        'idempotent', false,
        'status', 'failed',
        'credits_remaining', v_balance,
        'credit_refund_disposition', v_refund_disposition,
        'provider_cost_micro_usd', v_actual_cost
    );
END;
$$;

-- Pin ownership and expose only the narrow backend state-transition API.
ALTER FUNCTION public.reserve_research_job(
    UUID, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT
) OWNER TO postgres;
ALTER FUNCTION public.begin_research_provider_attempt(
    UUID, UUID, UUID, TEXT, TEXT, INTEGER, TEXT
) OWNER TO postgres;
ALTER FUNCTION public.finish_research_provider_attempt(
    UUID, UUID, UUID, TEXT, TEXT, TEXT, BIGINT, BIGINT, BIGINT, BIGINT, TEXT
) OWNER TO postgres;
ALTER FUNCTION public.mark_research_job_ambiguous(UUID, UUID, TEXT)
    OWNER TO postgres;
ALTER FUNCTION public.complete_research_job(
    UUID, UUID, UUID, UUID, TEXT, JSONB, INTEGER, TIMESTAMPTZ,
    TEXT, JSONB, TEXT, TIMESTAMPTZ
) OWNER TO postgres;
ALTER FUNCTION public.fail_research_job(UUID, UUID, TEXT)
    OWNER TO postgres;

REVOKE ALL ON FUNCTION public.reserve_research_job(
    UUID, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.begin_research_provider_attempt(
    UUID, UUID, UUID, TEXT, TEXT, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_research_provider_attempt(
    UUID, UUID, UUID, TEXT, TEXT, TEXT, BIGINT, BIGINT, BIGINT, BIGINT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_research_job_ambiguous(UUID, UUID, TEXT)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_research_job(
    UUID, UUID, UUID, UUID, TEXT, JSONB, INTEGER, TIMESTAMPTZ,
    TEXT, JSONB, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_research_job(UUID, UUID, TEXT)
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_research_job(
    UUID, UUID, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_research_provider_attempt(
    UUID, UUID, UUID, TEXT, TEXT, INTEGER, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_research_provider_attempt(
    UUID, UUID, UUID, TEXT, TEXT, TEXT, BIGINT, BIGINT, BIGINT, BIGINT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_research_job_ambiguous(UUID, UUID, TEXT)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_research_job(
    UUID, UUID, UUID, UUID, TEXT, JSONB, INTEGER, TIMESTAMPTZ,
    TEXT, JSONB, TEXT, TIMESTAMPTZ
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_research_job(UUID, UUID, TEXT)
    TO service_role;
