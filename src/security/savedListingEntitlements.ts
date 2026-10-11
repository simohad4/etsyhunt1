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

function isValidPeriodBoundary(value: string | null | undefined): boolean {
  return value == null || Number.isFinite(Date.parse(value));
}

export function getSavedListingLimit(
  subscription: SavedListingSubscription | null | undefined,
  now = Date.now()
): number {
  if (!subscription || subscription.status !== 'active') return 0;
  if (!isValidPeriodBoundary(subscription.current_period_start)) return 0;
  if (!isValidPeriodBoundary(subscription.current_period_end)) return 0;

  const periodStart = subscription.current_period_start
    ? Date.parse(subscription.current_period_start)
    : null;
  const periodEnd = subscription.current_period_end
    ? Date.parse(subscription.current_period_end)
    : null;

  if (periodStart !== null && periodStart > now) return 0;
  if (periodEnd !== null && periodEnd <= now) return 0;

  return PLAN_LIMITS[subscription.plan_tier ?? ''] ?? 0;
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
