import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  getActiveSubscriptionPlan,
  getResearchCreditEntitlement,
  getSavedListingInsertErrorMessage,
  getSavedListingLimit,
  getSavedListingQuotaMessage
} from '../src/security/savedListingEntitlements';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

test('browser code does not call retired or backend-only credit functions', () => {
  const browserSource = [
    readSource('src/context/AuthContext.tsx'),
    readSource('src/services/supabase.ts'),
    readSource('src/components/EtsyTagAnalyzerModal.tsx')
  ].join('\n');

  assert.doesNotMatch(browserSource, /\.rpc\s*\(/);
  assert.doesNotMatch(browserSource, /consume_research_credits/);
  assert.doesNotMatch(browserSource, /reserve_research_credits/);
  assert.doesNotMatch(browserSource, /finalize_research_credits/);
  assert.match(browserSource, /No credits were consumed/);
});

test('browser workspace loading never creates a profile fallback', () => {
  const serviceSource = readSource('src/services/supabase.ts');

  assert.doesNotMatch(serviceSource, /\.upsert\s*\(/);
  assert.match(serviceSource, /Workspace profile initialization is incomplete/);
});

test('saved-listing entitlement matches the database active-subscription rules', () => {
  const now = Date.parse('2026-10-11T12:00:00Z');

  assert.equal(getSavedListingLimit({ plan_tier: 'starter', status: 'inactive' }, now), 0);
  assert.equal(getSavedListingLimit({ plan_tier: 'pro', status: 'past_due' }, now), 0);
  assert.equal(getSavedListingLimit({ plan_tier: 'agency', status: 'canceled' }, now), 0);
  assert.equal(getSavedListingLimit({ plan_tier: 'starter', status: 'active' }, now), 50);
  assert.equal(getSavedListingLimit({ plan_tier: 'pro', status: 'active' }, now), 250);
  assert.equal(getSavedListingLimit({ plan_tier: 'agency', status: 'active' }, now), 1000);
  assert.equal(
    getSavedListingLimit(
      { plan_tier: 'starter', status: 'active', current_period_start: '2026-10-12T00:00:00Z' },
      now
    ),
    0
  );
  assert.equal(
    getSavedListingLimit(
      { plan_tier: 'starter', status: 'active', current_period_end: '2026-10-11T12:00:00Z' },
      now
    ),
    0
  );
  assert.equal(
    getSavedListingLimit(
      { plan_tier: 'starter', status: 'active', current_period_end: 'not-a-date' },
      now
    ),
    0
  );
});

test('research credit display is gated by the same active subscription period', () => {
  const now = Date.parse('2026-10-11T12:00:00Z');
  const fundedAccount = { credits_remaining: 25, monthly_allowance: 100 };

  assert.equal(getActiveSubscriptionPlan({ plan_tier: 'pro', status: 'active' }, now), 'pro');
  assert.equal(getActiveSubscriptionPlan({ plan_tier: 'pro', status: 'inactive' }, now), null);
  assert.deepEqual(
    getResearchCreditEntitlement({ plan_tier: 'pro', status: 'inactive' }, fundedAccount, now),
    { creditsRemaining: 0, totalCredits: 0 }
  );
  assert.deepEqual(
    getResearchCreditEntitlement(
      { plan_tier: 'starter', status: 'active', current_period_end: '2026-10-11T12:00:00Z' },
      fundedAccount,
      now
    ),
    { creditsRemaining: 0, totalCredits: 0 }
  );
  assert.deepEqual(
    getResearchCreditEntitlement(
      { plan_tier: 'pro', status: 'active' },
      { credits_remaining: 120, monthly_allowance: 100 },
      now
    ),
    { creditsRemaining: 100, totalCredits: 100 }
  );
});

test('saved-listing quota and uniqueness failures become safe user-facing messages', () => {
  assert.equal(
    getSavedListingQuotaMessage(0, 0),
    'Saved listings require an active subscription.'
  );
  assert.equal(
    getSavedListingInsertErrorMessage(
      { code: 'P0001', message: 'saved listing quota exceeded' },
      50,
      50
    ),
    'Saved listings quota reached (50/50). Remove a saved listing before adding another.'
  );
  assert.equal(
    getSavedListingInsertErrorMessage({ code: '23505', message: 'duplicate key' }, 1, 50),
    'This listing is already saved in your workspace.'
  );
  assert.equal(
    getSavedListingInsertErrorMessage({ code: '42501', message: 'sensitive database detail' }, 1, 50),
    'Unable to save this listing right now. Please try again.'
  );
});

test('saved-listing callers surface asynchronous database failures', () => {
  const authSource = readSource('src/context/AuthContext.tsx');
  const workspaceSource = readSource('src/components/EtsyHunterWorkspace.tsx');
  const detailSource = readSource('src/components/EtsyProductDetailModal.tsx');
  const watchlistSource = readSource('src/components/EtsyHunterWatchlist.tsx');

  assert.match(workspaceSource, /const result = await saveListing\(product\)/);
  assert.match(workspaceSource, /role="alert"/);
  assert.match(detailSource, /const result = await saveListing\(product\)/);
  assert.match(detailSource, /role="alert"/);
  assert.match(watchlistSource, /workspace\?\.maxSavedListings \?\? 0/);
  assert.doesNotMatch(watchlistSource, /maxSavedListings \|\| 50/);
  assert.match(authSource, /const \{ error \} = await supabase[\s\S]*?\.from\('saved_listings'\)[\s\S]*?\.delete\(\)/);
  assert.match(authSource, /fetchAndApplyPrivateState\(mutationUser, expectedVersion\)/);
  assert.doesNotMatch(authSource, /id: `saved-\$\{Date\.now\(\)\}`/);
});

test('research UI cannot invoke providers or save sample keyword metrics into customer state', () => {
  const modalSource = readSource('src/components/EtsyTagAnalyzerModal.tsx');

  assert.doesNotMatch(modalSource, /consumeCredits/);
  assert.doesNotMatch(modalSource, /onAddProduct/);
  assert.match(modalSource, /Research providers are disabled/);
  assert.match(modalSource, /Demo preview/);
});
