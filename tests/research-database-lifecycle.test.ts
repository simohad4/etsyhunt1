import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  DEFAULT_RETRY_POLICY,
  MAX_OPENROUTER_INPUT_TOKENS
} from '../src/server/researchEconomics';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20261011200000_etsyhunter_m2_research_lifecycle.sql'
);
const previousMigrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20261011180000_etsyhunter_m15_admin_rbac.sql'
);
const migration = fs.readFileSync(migrationPath, 'utf8');

function functionSql(name: string, nextMarker: string): string {
  const start = migration.indexOf('CREATE FUNCTION public.' + name);
  const end = migration.indexOf(nextMarker, start);
  assert.ok(start >= 0, name + ' is missing');
  assert.ok(end > start, name + ' boundary is missing');
  return migration.slice(start, end);
}

function expectText(source: string, ...needles: string[]): void {
  for (const needle of needles) {
    assert.ok(source.includes(needle), 'Missing SQL contract: ' + needle);
  }
}

function expectOrder(source: string, ...needles: string[]): void {
  let previous = -1;
  for (const needle of needles) {
    const index = source.indexOf(needle);
    assert.ok(index > previous, 'SQL contract is missing or out of order: ' + needle);
    previous = index;
  }
}

test('Slice 4C is one additive migration ordered after M1.5', () => {
  assert.equal(
    path.basename(migrationPath),
    '20261011200000_etsyhunter_m2_research_lifecycle.sql'
  );
  assert.ok(path.basename(migrationPath) > path.basename(previousMigrationPath));
  assert.equal(fs.existsSync(previousMigrationPath), true);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM public\./);
});

test('legacy reservations fail the migration before legacy finalizers are revoked', () => {
  expectOrder(
    migration,
    "operation.status IN ('reserved', 'ambiguous')",
    'Slice 4C requires all legacy research credit operations to be terminal',
    'REVOKE ALL ON FUNCTION public.reserve_research_credits'
  );
  expectText(
    migration,
    'REVOKE ALL ON FUNCTION public.reserve_research_credits(UUID, UUID, TEXT, INTEGER)',
    'REVOKE ALL ON FUNCTION public.finalize_research_credits(UUID, UUID, TEXT, INTEGER, TEXT)',
    'FROM PUBLIC, anon, authenticated, service_role;'
  );
});

test('credit reservation requires a locked current subscription and matching allowance', () => {
  const reserve = functionSql(
    'reserve_research_job',
    'CREATE FUNCTION public.begin_research_provider_attempt'
  );

  expectText(
    reserve,
    'FROM public.subscriptions AS subscription',
    'FOR UPDATE;',
    "v_subscription.status <> 'active'",
    "v_subscription.plan_tier NOT IN ('starter', 'pro', 'agency')",
    'v_subscription.current_period_start IS NULL',
    'v_subscription.current_period_end IS NULL',
    'v_subscription.current_period_start >= v_subscription.current_period_end',
    'v_subscription.current_period_start > pg_catalog.now()',
    'v_subscription.current_period_end <= pg_catalog.now()',
    'v_monthly_allowance <> v_expected_allowance',
    "WHEN 'starter' THEN 20",
    "WHEN 'pro' THEN 60",
    "WHEN 'agency' THEN 120"
  );
});

test('reservation derives worst-case cost from verified pricing and persists every cost driver', () => {
  const reserve = functionSql(
    'reserve_research_job',
    'CREATE FUNCTION public.begin_research_provider_attempt'
  );
  const signature = reserve.slice(0, reserve.indexOf('RETURNS JSONB'));

  assert.doesNotMatch(signature, /p_estimated_provider_cost_micro_usd/);
  expectText(
    reserve,
    'v_pricing.apify_verified_at > pg_catalog.now()',
    'v_pricing.openrouter_verified_at > pg_catalog.now()',
    'v_pricing.activation_blocked',
    "v_pricing.apify_provenance <> 'verified'",
    "v_pricing.openrouter_provenance <> 'verified'",
    'v_pricing.expires_at IS NULL',
    'v_apify_cost_numeric :=',
    '* p_maximum_listings',
    '* v_pricing.apify_billable_units_per_requested_listing',
    'v_estimated_cost_numeric :=',
    'v_apify_cost_numeric * v_pricing.apify_max_attempts',
    'v_openrouter_cost_numeric * v_pricing.openrouter_max_attempts',
    'v_per_job_limit := p_pages * v_pricing.hard_limit_micro_usd_per_credit',
    'estimated provider cost exceeds job budget',
    'apify_estimated_cost_per_attempt_micro_usd',
    'openrouter_max_input_tokens',
    'openrouter_max_output_tokens',
    'openrouter_estimated_cost_per_attempt_micro_usd'
  );

  assert.equal(MAX_OPENROUTER_INPUT_TOKENS, 33_280);
  expectText(
    migration,
    'openrouter_max_input_tokens = ' + MAX_OPENROUTER_INPUT_TOKENS,
    'apify_max_attempts INTEGER NOT NULL CHECK (apify_max_attempts = ' +
      DEFAULT_RETRY_POLICY.apifyMaxAttempts +
      ')',
    'openrouter_max_attempts INTEGER NOT NULL CHECK (openrouter_max_attempts = ' +
      DEFAULT_RETRY_POLICY.openRouterMaxAttempts +
      ')'
  );
});

test('reservation serializes idempotency, budget caps, and credits', () => {
  const reserve = functionSql(
    'reserve_research_job',
    'CREATE FUNCTION public.begin_research_provider_attempt'
  );

  expectText(
    reserve,
    'pg_catalog.pg_advisory_xact_lock(',
    'request_fingerprint <> p_request_fingerprint',
    'idempotency key was already used with different request data',
    'v_global_window.blocked_at IS NOT NULL',
    'v_account_window.blocked_at IS NOT NULL',
    '+ v_global_window.overrun_micro_usd',
    '> v_global_window.cap_micro_usd',
    '+ v_account_window.overrun_micro_usd',
    '> v_account_window.cap_micro_usd',
    'FROM public.research_credit_accounts AS account'
  );
  expectOrder(
    reserve,
    'FROM public.research_jobs AS job',
    "'idempotent', true",
    'UPDATE public.research_credit_accounts'
  );
});

test('attempt starts enforce one active call and an exact retry state machine', () => {
  expectText(
    migration,
    'CREATE UNIQUE INDEX research_provider_attempts_one_active_uidx',
    'ON public.research_provider_attempts (request_id)',
    "WHERE status = 'started'",
    "'apify_failed'",
    "'openrouter_failed'"
  );

  const begin = functionSql(
    'begin_research_provider_attempt',
    'CREATE FUNCTION public.finish_research_provider_attempt'
  );
  const signature = begin.slice(0, begin.indexOf('RETURNS JSONB'));

  assert.doesNotMatch(signature, /p_estimated_cost_micro_usd/);
  expectOrder(
    begin,
    'INTO v_attempt',
    "'idempotent', true",
    "v_job.status IN ('ambiguous', 'succeeded', 'failed', 'rejected')"
  );
  expectText(
    begin,
    'another provider attempt is active',
    'p_provider_attempt_id IS NOT NULL',
    'v_attempt.provider_attempt_id IS DISTINCT FROM p_provider_attempt_id',
    "v_job.status <> 'apify_failed'",
    "attempt.provider = 'apify'",
    'attempt.retry_number = 1',
    "attempt.status = 'failed'",
    "v_job.status <> 'openrouter_failed'",
    "attempt.provider = 'openrouter'",
    'v_attempt_cost := v_job.apify_estimated_cost_per_attempt_micro_usd',
    'v_attempt_cost := v_job.openrouter_estimated_cost_per_attempt_micro_usd',
    'provider attempt exceeds reserved budget'
  );
});


test('retry admission uses the greater of known actual cost and the reserved estimate', () => {
  const begin = functionSql(
    'begin_research_provider_attempt',
    'CREATE FUNCTION public.finish_research_provider_attempt'
  );

  expectText(
    begin,
    'GREATEST(',
    'attempt.estimated_cost_micro_usd',
    'attempt.reported_cost_micro_usd',
    '), 0) + v_attempt_cost',
    'v_projected_cost > v_budget.reserved_micro_usd',
    'v_projected_cost > v_job.provider_spending_limit_micro_usd'
  );

  const priorEstimated = 10_000;
  const priorReported = 115_000;
  const projectedRetry = 10_000;
  const hardCap = 120_000;
  const cumulativeKnownLiability =
    Math.max(priorEstimated, priorReported) + projectedRetry;

  assert.equal(cumulativeKnownLiability, 125_000);
  assert.equal(cumulativeKnownLiability > hardCap, true);
});

test('attempt finish fails closed without its exact live budget reservation', () => {
  const finish = functionSql(
    'finish_research_provider_attempt',
    'CREATE FUNCTION public.mark_research_job_ambiguous'
  );
  const budgetGuard = finish.slice(
    finish.indexOf('FROM public.research_budget_reservations AS reservation')
  );

  expectOrder(
    budgetGuard,
    'FROM public.research_budget_reservations AS reservation',
    'IF NOT FOUND',
    'provider budget reservation is missing or invalid',
    'SELECT COALESCE(pg_catalog.sum('
  );
  expectText(
    finish,
    'v_budget.user_id <> p_user_id',
    "v_budget.status <> 'reserved'",
    'v_budget.reserved_micro_usd <> v_job.estimated_provider_cost_micro_usd',
    "v_attempt.provider = 'apify' AND v_job.status <> 'apify_running'",
    "v_attempt.provider = 'openrouter' AND v_job.status <> 'openrouter_running'",
    "WHEN 'apify' THEN 'apify_failed'",
    "ELSE 'openrouter_failed'"
  );
});

test('known cost overruns are recorded in both scopes and block new reservations', () => {
  expectText(
    migration,
    'overrun_micro_usd BIGINT NOT NULL DEFAULT 0',
    "blocked_reason = 'provider_cost_overrun'"
  );

  const finish = functionSql(
    'finish_research_provider_attempt',
    'CREATE FUNCTION public.mark_research_job_ambiguous'
  );
  expectOrder(
    finish,
    'v_projected_cost > v_budget.reserved_micro_usd',
    'INTO v_global_budget',
    'INTO v_account_budget',
    'SET overrun_micro_usd = overrun_micro_usd + v_overrun',
    "SET status = 'held'"
  );
  expectText(
    finish,
    'v_projected_cost > v_job.provider_spending_limit_micro_usd',
    'v_overrun := v_projected_cost - v_budget.reserved_micro_usd',
    'blocked_at = COALESCE(blocked_at, pg_catalog.now())',
    "blocked_reason = 'provider_cost_overrun'"
  );
  assert.doesNotMatch(finish, /credits_remaining\s*=|action_type[\s\S]*?'refund'/);
});


test('durable liability guards block rollover and serialize concurrent reservations', () => {
  expectText(
    migration,
    'CREATE TABLE public.research_budget_liabilities',
    'outstanding_micro_usd BIGINT NOT NULL DEFAULT 0',
    'CREATE UNIQUE INDEX research_budget_liabilities_global_uidx',
    'CREATE UNIQUE INDEX research_budget_liabilities_account_uidx',
    "VALUES ('global', NULL)"
  );

  const reserve = functionSql(
    'reserve_research_job',
    'CREATE FUNCTION public.begin_research_provider_attempt'
  );
  expectOrder(
    reserve,
    "pg_catalog.hashtextextended('research-budget-global', 19042026)",
    'pg_catalog.hashtextextended(p_user_id::TEXT, 19042027)',
    "VALUES ('account', p_user_id)",
    'INTO v_global_liability',
    'INTO v_account_liability',
    'research budget is blocked by unreconciled liability',
    "budget.scope_type = 'global'",
    "budget.scope_type = 'account'"
  );

  const finish = functionSql(
    'finish_research_provider_attempt',
    'CREATE FUNCTION public.mark_research_job_ambiguous'
  );
  expectOrder(
    finish,
    'v_projected_cost > v_budget.reserved_micro_usd',
    "pg_catalog.hashtextextended('research-budget-global', 19042026)",
    'pg_catalog.hashtextextended(p_user_id::TEXT, 19042027)',
    'INTO v_global_liability',
    'INTO v_account_liability',
    'INTO v_global_budget',
    'INTO v_account_budget',
    'UPDATE public.research_budget_liabilities',
    'GET DIAGNOSTICS v_liability_guard_count = ROW_COUNT',
    'UPDATE public.research_budget_windows'
  );
  expectText(
    finish,
    'outstanding_micro_usd = outstanding_micro_usd + v_overrun',
    'v_liability_guard_count <> 2'
  );
});

test('results bind observed and modeled data to exact successful attempts', () => {
  expectText(
    migration,
    'apify_attempt_id UUID NOT NULL',
    'openrouter_attempt_id UUID NOT NULL',
    'FOREIGN KEY (apify_attempt_id, request_id, user_id, observed_source_provider)',
    'FOREIGN KEY (openrouter_attempt_id, request_id, user_id, modeled_source_provider)',
    'REFERENCES public.research_provider_attempts(id, request_id, user_id, provider)',
    "observed_data_class TEXT NOT NULL DEFAULT 'observed'",
    "modeled_data_class TEXT NOT NULL DEFAULT 'modeled'"
  );

  const complete = functionSql(
    'complete_research_job',
    'CREATE FUNCTION public.fail_research_job'
  );
  expectText(
    complete,
    'p_apify_attempt_id UUID',
    'p_openrouter_attempt_id UUID',
    "v_job.status IN ('ambiguous', 'failed', 'rejected')",
    "v_job.status <> 'openrouter_complete'",
    'p_observed_record_count > v_job.maximum_listings',
    'attempt.id = p_apify_attempt_id',
    "v_apify_attempt.status <> 'succeeded'",
    'attempt.id = p_openrouter_attempt_id',
    "v_openrouter_attempt.status <> 'succeeded'",
    'v_apify_attempt.provider_version',
    'v_openrouter_attempt.provider_version',
    'result timestamps do not match provider attempts'
  );
  assert.doesNotMatch(complete, /status IN \('succeeded', 'ambiguous'\)/);
  assert.doesNotMatch(migration, /demo_payload|observed_or_modeled|raw_credentials?|api_key|secret_key/i);
});

test('completion remains atomic and only commits a reserved credit', () => {
  const complete = functionSql(
    'complete_research_job',
    'CREATE FUNCTION public.fail_research_job'
  );
  expectOrder(
    complete,
    'INSERT INTO public.research_results',
    'INSERT INTO public.research_history',
    'UPDATE public.research_budget_windows',
    'UPDATE public.research_budget_reservations',
    'UPDATE public.research_credit_operations',
    'UPDATE public.research_jobs'
  );
  expectText(
    complete,
    "SET status = 'committed'",
    "refund_disposition = 'not_applicable'",
    "AND status = 'reserved'",
    "AND refund_disposition = 'pending'",
    'credit reservation cannot be committed',
    'completion idempotency key was reused with different data'
  );
  assert.doesNotMatch(complete, /EXCEPTION\s+WHEN|ON CONFLICT DO NOTHING/);
});

test('definitive failures refund the matching generation at most once while ambiguity remains held', () => {
  const fail = functionSql(
    'fail_research_job',
    '-- Pin ownership and expose only the narrow backend state-transition API.'
  );
  expectText(
    fail,
    "v_job.status = 'failed'",
    "'idempotent', true",
    "v_job.status = 'ambiguous'",
    'ambiguous research outcome requires audited reconciliation',
    "'Failed research reservation refund'",
    "v_operation.status <> 'reserved'",
    "v_reservation.status <> 'reserved'",
    "AND status = 'reserved'",
    'in-flight provider attempt requires ambiguous reconciliation'
  );
  assert.equal(fail.match(/INSERT INTO public\.research_credit_ledger/g)?.length, 1);

  const ambiguous = functionSql(
    'mark_research_job_ambiguous',
    'CREATE FUNCTION public.complete_research_job'
  );
  expectText(ambiguous, 'UPDATE public.research_budget_reservations', "SET status = 'held'");
  assert.doesNotMatch(ambiguous, /research_credit_accounts|research_credit_ledger|research_history/);
});


test('credit refunds are bound to the reservation period and account generation', () => {
  expectText(
    migration,
    'ADD COLUMN IF NOT EXISTS credit_period_start TIMESTAMPTZ',
    'ADD COLUMN IF NOT EXISTS credit_period_end TIMESTAMPTZ',
    'ADD COLUMN IF NOT EXISTS credit_generation BIGINT NOT NULL DEFAULT 0',
    'ADD COLUMN IF NOT EXISTS credit_account_generation BIGINT',
    'research_credit_operations_period_generation_check',
    'research_credit_ledger_operation_period_fkey',
    "'pending', 'not_applicable', 'refunded', 'expired_generation'"
  );

  const reserve = functionSql(
    'reserve_research_job',
    'CREATE FUNCTION public.begin_research_provider_attempt'
  );
  expectText(
    reserve,
    'v_credit_account.credit_period_start <> v_subscription.current_period_start',
    'v_credit_account.credit_period_end <> v_subscription.current_period_end',
    'v_credit_account.credit_generation',
    "CASE WHEN v_current_credits < p_pages THEN 'not_applicable' ELSE 'pending' END"
  );

  const fail = functionSql(
    'fail_research_job',
    '-- Pin ownership and expose only the narrow backend state-transition API.'
  );
  expectOrder(
    fail,
    'INTO v_credit_account',
    'v_credit_account.credit_generation = v_operation.credit_account_generation',
    "v_refund_disposition := 'refunded'",
    'UPDATE public.research_credit_accounts',
    'INSERT INTO public.research_credit_ledger',
    'v_credit_account.credit_generation > v_operation.credit_account_generation',
    "v_refund_disposition := 'expired_generation'",
    'UPDATE public.research_budget_windows',
    'refund_disposition = v_refund_disposition'
  );
  expectText(
    fail,
    'credit account period identity is missing or invalid',
    'credit account period identity is inconsistent with the reservation',
    'credit_generation = v_operation.credit_account_generation',
    'credit_period_start = v_operation.credit_period_start',
    'credit_period_end = v_operation.credit_period_end',
    "'credit_refund_disposition', v_refund_disposition"
  );

  assert.equal(
    fail.match(/INSERT INTO public\.research_credit_ledger/g)?.length,
    1,
    'only the exact original generation may receive a refund ledger entry'
  );
});

test('browser reads are own-row only and all mutations remain service-role only', () => {
  for (const table of [
    'research_provider_pricing',
    'research_budget_windows',
    'research_budget_liabilities',
    'research_jobs',
    'research_budget_reservations',
    'research_provider_attempts',
    'research_results'
  ]) {
    expectText(migration, 'ALTER TABLE public.' + table + ' ENABLE ROW LEVEL SECURITY;');
  }

  expectText(
    migration,
    'CREATE POLICY "Users can view own research jobs"',
    'CREATE POLICY "Users can view own research results"',
    'USING ((SELECT auth.uid()) = user_id);',
    'REVOKE ALL PRIVILEGES ON TABLE public.research_provider_pricing,',
    'GRANT SELECT ON TABLE public.research_jobs, public.research_results'
  );
  assert.doesNotMatch(migration, /GRANT (?:INSERT|UPDATE|DELETE|ALL).*TO authenticated/);

  for (const name of [
    'reserve_research_job',
    'begin_research_provider_attempt',
    'finish_research_provider_attempt',
    'mark_research_job_ambiguous',
    'complete_research_job',
    'fail_research_job'
  ]) {
    const sql = functionSql(
      name,
      name === 'fail_research_job'
        ? '-- Pin ownership and expose only the narrow backend state-transition API.'
        : 'CREATE FUNCTION public.' +
            [
              'begin_research_provider_attempt',
              'finish_research_provider_attempt',
              'mark_research_job_ambiguous',
              'complete_research_job',
              'fail_research_job'
            ][
              [
                'reserve_research_job',
                'begin_research_provider_attempt',
                'finish_research_provider_attempt',
                'mark_research_job_ambiguous',
                'complete_research_job'
              ].indexOf(name)
            ]
    );
    expectText(sql, 'SECURITY DEFINER', 'SET search_path = pg_catalog');
  }

  assert.equal(
    migration.match(/FROM PUBLIC, anon, authenticated;/g)?.length,
    6,
    'all six lifecycle RPCs must be revoked from browser roles'
  );
  assert.equal(
    migration.match(/\)\s+TO service_role;/g)?.length,
    6,
    'only service_role should execute the six lifecycle RPCs'
  );
});
