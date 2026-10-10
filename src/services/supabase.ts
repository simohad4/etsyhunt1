import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Retrieve Vite client environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isLiveSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== ''
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

// Live client or fallback client
export let supabase: SupabaseClient;

if (isLiveSupabaseConfigured) {
  // Real Supabase Production Client
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  // Local development fallback client adhering strictly to Supabase Auth specifications
  const LOCAL_STORAGE_SESSION_KEY = 'etsyhunter_sb_session';

  type AuthListener = (event: string, session: Session | null) => void;
  const listeners: Set<AuthListener> = new Set();

  const getStoredSession = (): Session | null => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  const setStoredSession = (session: Session | null) => {
    if (session) {
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    }
    listeners.forEach((cb) => cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session));
  };

  supabase = {
    auth: {
      getSession: async () => {
        const session = getStoredSession();
        return { data: { session }, error: null };
      },
      getUser: async () => {
        const session = getStoredSession();
        return { data: { user: session?.user || null }, error: null };
      },
      signUp: async ({ email, password, options }: any) => {
        if (!email || !password || password.length < 6) {
          return {
            data: { user: null, session: null },
            error: { message: 'Password must be at least 6 characters.' }
          };
        }

        const name = options?.data?.full_name || email.split('@')[0];
        const dummyUser: User = {
          id: `usr_${Date.now()}`,
          app_metadata: { provider: 'email' },
          user_metadata: { full_name: name, avatar_url: '' },
          aud: 'authenticated',
          email,
          created_at: new Date().toISOString()
        } as User;

        const dummySession: Session = {
          access_token: `sb_tok_${Date.now()}`,
          refresh_token: `sb_ref_${Date.now()}`,
          expires_in: 3600,
          token_type: 'bearer',
          user: dummyUser
        };

        setStoredSession(dummySession);
        return { data: { user: dummyUser, session: dummySession }, error: null };
      },
      signInWithPassword: async ({ email, password }: any) => {
        if (!email || !password) {
          return {
            data: { user: null, session: null },
            error: { message: 'Please provide both email and password.' }
          };
        }

        const name = email.split('@')[0];
        const dummyUser: User = {
          id: `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
          app_metadata: { provider: 'email' },
          user_metadata: {
            full_name: name.charAt(0).toUpperCase() + name.slice(1),
            avatar_url: ''
          },
          aud: 'authenticated',
          email,
          created_at: new Date().toISOString()
        } as User;

        const dummySession: Session = {
          access_token: `sb_tok_${Date.now()}`,
          refresh_token: `sb_ref_${Date.now()}`,
          expires_in: 3600,
          token_type: 'bearer',
          user: dummyUser
        };

        setStoredSession(dummySession);
        return { data: { user: dummyUser, session: dummySession }, error: null };
      },
      signInWithOAuth: async ({ provider }: any) => {
        const dummyUser: User = {
          id: `google_usr_${Date.now()}`,
          app_metadata: { provider: provider || 'google' },
          user_metadata: {
            full_name: 'Etsy Seller',
            avatar_url: ''
          },
          aud: 'authenticated',
          email: 'seller@example.com',
          created_at: new Date().toISOString()
        } as User;

        const dummySession: Session = {
          access_token: `sb_google_tok_${Date.now()}`,
          refresh_token: `sb_google_ref_${Date.now()}`,
          expires_in: 3600,
          token_type: 'bearer',
          user: dummyUser
        };

        setStoredSession(dummySession);
        return { data: { provider: 'google', url: null }, error: null };
      },
      resetPasswordForEmail: async ({ email }: any) => {
        if (!email || !email.includes('@')) {
          return { data: null, error: { message: 'A valid email address is required.' } };
        }
        return { data: {}, error: null };
      },
      updateUser: async ({ password }: any) => {
        if (!password || password.length < 6) {
          return { data: { user: null }, error: { message: 'Password must be at least 6 characters.' } };
        }
        return { data: { user: getStoredSession()?.user || null }, error: null };
      },
      signOut: async () => {
        setStoredSession(null);
        return { error: null };
      },
      onAuthStateChange: (callback: any) => {
        listeners.add(callback);
        const currentSession = getStoredSession();
        callback(currentSession ? 'INITIAL_SESSION' : 'SIGNED_OUT', currentSession);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners.delete(callback);
              }
            }
          }
        };
      }
    },
    // Mock database RPC call interface matching consume_research_credits schema
    rpc: async (functionName: string, params: any) => {
      if (functionName === 'consume_research_credits') {
        const pages = params?.p_pages || 1;
        const required = pages * 1;
        return {
          data: { success: true, credits_deducted: required },
          error: null
        };
      }
      return { data: null, error: { message: `Function ${functionName} not found` } };
    }
  } as unknown as SupabaseClient;
}

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
 * and research history from Supabase tables (or local fallback state).
 */
export async function fetchUserWorkspaceData(user: User): Promise<{
  workspace: WorkspaceData;
  savedListings: SavedListingItem[];
  searchHistory: ResearchHistoryRecord[];
}> {
  if (!isLiveSupabaseConfigured) {
    // Return empty defaults for new users:
    // No paid subscription, zero paid credits, zero saved listings, zero research history
    const defaultWs: WorkspaceData = {
      id: `ws-${user.id}`,
      name: `${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Personal'}'s Workspace`,
      slug: (user.email?.split('@')[0] || 'personal').toLowerCase(),
      plan: 'none', // No paid subscription without verified payment
      role: 'owner',
      creditsRemaining: 0, // Zero paid credits
      totalCredits: 0,
      savedListingsCount: 0,
      maxSavedListings: 50,
      createdAt: user.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    };
    return { workspace: defaultWs, savedListings: [], searchHistory: [] };
  }

  try {
    // 1. Fetch user_profile (with graceful handling if trigger has slight delay)
    let profileData: any = null;
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileErr && profile) {
      profileData = profile;
    } else {
      // Create profile row if not existing yet
      const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Personal';
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email || 'seller@example.com',
          full_name: fallbackName,
          workspace_name: `${fallbackName}'s Workspace`
        })
        .select('*')
        .maybeSingle();
      profileData = newProfile;
    }

    // 2. Fetch subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 3. Fetch credit account
    const { data: credits } = await supabase
      .from('research_credit_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 4. Fetch saved listings
    const { data: listings } = await supabase
      .from('saved_listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 5. Fetch previous research history
    const { data: history } = await supabase
      .from('research_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

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
    const workspace: WorkspaceData = {
      id: `ws-${user.id}`,
      name: profileData?.workspace_name || `${user.user_metadata?.full_name || 'Personal'}'s Workspace`,
      slug: user.id.slice(0, 8),
      plan: (sub?.plan_tier as any) || 'none',
      role: 'owner',
      creditsRemaining: credits?.credits_remaining ?? 0,
      totalCredits: credits?.monthly_allowance ?? 0,
      savedListingsCount: mappedListings.length,
      maxSavedListings: credits?.max_saved_listings ?? 50,
      createdAt: profileData?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    };

    return { workspace, savedListings: mappedListings, searchHistory: mappedHistory };
  } catch (err) {
    console.error('Error fetching Supabase workspace data:', err);
    throw err;
  }
}

