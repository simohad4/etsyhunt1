import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import {
  hasValidSupabaseConfiguration,
  SUPABASE_CONFIGURATION_ERROR
} from '../security/supabaseConfiguration';
import {
  getActiveSubscriptionPlan,
  getResearchCreditEntitlement,
  getSavedListingLimit
} from '../security/savedListingEntitlements';

// Retrieve Vite client environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isLiveSupabaseConfigured = hasValidSupabaseConfiguration(
  supabaseUrl,
  supabaseAnonKey
);

export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  plan: 'none' | 'starter' | 'pro' | 'agency';
  role: 'owner';
  creditsRemaining: number;
  totalCredits: number;
  savedListingsCount: number;
  maxSavedListings: number;
  createdAt: string;
}

export interface SavedListingItem {
  id: string;
  workspaceId: string;
  productId: string;
  identifier: string;
  title: string;
  shopName: string;
  observedPrice: number;
  estimatedMonthlyRevenue: number;
  stage: string;
  competition: string;
  imageUrl: string;
  addedAt: string;
  notes?: string;
}

// Missing or invalid configuration deliberately produces no client.
export const supabase: SupabaseClient | null = isLiveSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export interface ResearchHistoryRecord {
  id: string;
  keyword: string;
  pagesRequested: number;
  creditsConsumed: number;
  listingsFound: number;
  timestamp: string;
}

/**
 * Updates the user's password using the active Supabase client.
 */
export async function updateUserPassword(newPassword: string): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error(SUPABASE_CONFIGURATION_ERROR) };
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Loads the user's personal profile, subscription, credit account, saved listings,
 * and research history from Supabase tables.
 */
export async function fetchUserWorkspaceData(user: User): Promise<{
  workspace: WorkspaceData;
  savedListings: SavedListingItem[];
  searchHistory: ResearchHistoryRecord[];
}> {
  if (!supabase) {
    throw new Error(SUPABASE_CONFIGURATION_ERROR);
  }

  const client = supabase;

  try {
    // Profiles are initialized only by the database trigger/backfill. Browser
    // clients deliberately have no INSERT privilege after P1-B.
    const { data: profile, error: profileErr } = await client
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) throw new Error('Unable to load the workspace profile.');
    if (!profile) throw new Error('Workspace profile initialization is incomplete. Please sign out and try again.');
    const profileData = profile;

    // 2. Fetch subscription
    const { data: sub, error: subscriptionError } = await client
      .from('subscriptions')
      .select('plan_tier, status, current_period_start, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    if (subscriptionError) throw new Error('Unable to load subscription entitlements.');
    if (!sub) throw new Error('Workspace subscription data is unavailable. Please sign out and try again.');

    // 3. Fetch credit account
    const { data: credits, error: creditError } = await client
      .from('research_credit_accounts')
      .select('credits_remaining, monthly_allowance')
      .eq('user_id', user.id)
      .maybeSingle();
    if (creditError) throw new Error('Unable to load the research credit account.');
    if (!credits) throw new Error('Workspace credit data is unavailable. Please sign out and try again.');

    // 4. Fetch saved listings
    const { data: listings, error: listingsError } = await client
      .from('saved_listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (listingsError) throw new Error('Unable to load saved listings.');

    // 5. Fetch previous research history
    const { data: history, error: historyError } = await client
      .from('research_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (historyError) throw new Error('Unable to load research history.');

    const mappedListings: SavedListingItem[] = (listings || []).map((l: any) => ({
      id: l.id,
      workspaceId: `ws-${user.id}`,
      productId: l.product_identifier,
      identifier: l.product_identifier,
      title: l.title,
      shopName: l.shop_name,
      observedPrice: parseFloat(l.observed_price) || 0,
      estimatedMonthlyRevenue: parseFloat(l.estimated_monthly_revenue) || 0,
      stage: l.stage,
      competition: l.competition_level,
      imageUrl: l.image_url || '',
      addedAt: new Date(l.created_at).toLocaleDateString(),
      notes: l.notes || ''
    }));

    const mappedHistory: ResearchHistoryRecord[] = (history || []).map((h: any) => ({
      id: h.id,
      keyword: h.keyword,
      pagesRequested: h.pages_requested,
      creditsConsumed: h.credits_consumed,
      listingsFound: h.listings_found,
      timestamp: new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    // Authoritative workspace state:
    // User starts with plan_tier 'none' and 0 credits until granted or paid.
    const activePlan = getActiveSubscriptionPlan(sub);
    const creditEntitlement = getResearchCreditEntitlement(sub, credits);
    const maxSavedListings = getSavedListingLimit(sub);
    const workspace: WorkspaceData = {
      id: `ws-${user.id}`,
      name: profileData.workspace_name || 'Personal Workspace',
      slug: user.id.slice(0, 8),
      plan: activePlan ?? 'none',
      role: 'owner',
      creditsRemaining: creditEntitlement.creditsRemaining,
      totalCredits: creditEntitlement.totalCredits,
      savedListingsCount: mappedListings.length,
      maxSavedListings,
      createdAt: profileData.created_at?.split('T')[0] || ''
    };

    return { workspace, savedListings: mappedListings, searchHistory: mappedHistory };
  } catch (err) {
    console.error('Error fetching Supabase workspace data:', err);
    throw err;
  }
}

