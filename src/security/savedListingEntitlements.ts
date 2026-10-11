export interface SavedListingSubscription {
  plan_tier?: string | null;
  status?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
}

const PLAN_LIMITS: Record<string, number> = {
  starter: 50,
  pro: 250,
  agency: 1000
};

export type ActiveSubscriptionPlan = 'starter' | 'pro' | 'agency';

export interface ResearchCreditAccount {
  credits_remaining?: number | null;
  monthly_allowance?: number | null;
}

function isValidPeriodBoundary(value: string | null | undefined): boolean {
  return value == null || Number.isFinite(Date.parse(value));
}

export function getActiveSubscriptionPlan(
  subscription: SavedListingSubscription | null | undefined,
  now = Date.now()
): ActiveSubscriptionPlan | null {
  if (!subscription || subscription.status !== 'active') return null;
  if (!isValidPeriodBoundary(subscription.current_period_start)) return null;
  if (!isValidPeriodBoundary(subscription.current_period_end)) return null;

  const periodStart = subscription.current_period_start
    ? Date.parse(subscription.current_period_start)
    : null;
  const periodEnd = subscription.current_period_end
    ? Date.parse(subscription.current_period_end)
    : null;

  if (periodStart !== null && periodStart > now) return null;
  if (periodEnd !== null && periodEnd <= now) return null;

  return subscription.plan_tier === 'starter' ||
    subscription.plan_tier === 'pro' ||
    subscription.plan_tier === 'agency'
    ? subscription.plan_tier
    : null;
}

export function getSavedListingLimit(
  subscription: SavedListingSubscription | null | undefined,
  now = Date.now()
): number {
  const plan = getActiveSubscriptionPlan(subscription, now);
  return plan ? PLAN_LIMITS[plan] : 0;
}

function authoritativeNonNegativeInteger(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

export function getResearchCreditEntitlement(
  subscription: SavedListingSubscription | null | undefined,
  creditAccount: ResearchCreditAccount | null | undefined,
  now = Date.now()
): { creditsRemaining: number; totalCredits: number } {
  if (!getActiveSubscriptionPlan(subscription, now) || !creditAccount) {
    return { creditsRemaining: 0, totalCredits: 0 };
  }

  const totalCredits = authoritativeNonNegativeInteger(creditAccount.monthly_allowance);
  const creditsRemaining = Math.min(
    authoritativeNonNegativeInteger(creditAccount.credits_remaining),
    totalCredits
  );
  return { creditsRemaining, totalCredits };
}

export function getSavedListingQuotaMessage(currentCount: number, limit: number): string {
  if (limit <= 0) {
    return 'Saved listings require an active subscription.';
  }

  return `Saved listings quota reached (${currentCount}/${limit}). Remove a saved listing before adding another.`;
}

export function getSavedListingInsertErrorMessage(
  error: { code?: string | null; message?: string | null } | null | undefined,
  currentCount: number,
  limit: number
): string {
  const message = error?.message?.toLowerCase() ?? '';

  if (error?.code === 'P0001' || message.includes('saved listing quota exceeded')) {
    return getSavedListingQuotaMessage(currentCount, limit);
  }

  if (error?.code === '23505' || message.includes('duplicate key')) {
    return 'This listing is already saved in your workspace.';
  }

  return 'Unable to save this listing right now. Please try again.';
}
