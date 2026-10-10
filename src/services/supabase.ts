import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Retrieve Vite client environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isLiveSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
);

export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'standard' | 'plus' | 'enterprise';
  role: 'owner' | 'admin' | 'member';
  creditsRemaining: number;
  totalCredits: number;
  productsCount: number;
  membersCount: number;
  maxMembers: number;
  storageUsedMb: number;
  storageLimitMb: number;
  createdAt: string;
}

export interface WatchlistItem {
  id: string;
  workspaceId: string;
  productId: string;
  identifier: string;
  title: string;
  shopName: string;
  price: number;
  estimatedMonthlyRevenue: number;
  stage: string;
  competition: string;
  imageUrl: string;
  addedAt: string;
  notes?: string;
  alertOnUpdate: boolean;
}

// Live or Local fallback client
export let supabase: SupabaseClient;

if (isLiveSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  // In-browser mock client adhering strictly to Supabase Auth specs
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

  // Build lightweight client matching SupabaseClient interface for auth
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
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
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
        // Fast, seamless simulated Google OAuth login
        const dummyUser: User = {
          id: `google_usr_${Date.now()}`,
          app_metadata: { provider: provider || 'google' },
          user_metadata: {
            full_name: 'Elena Rostova',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
          },
          aud: 'authenticated',
          email: 'elena.rostova@etsyhunter.ai',
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
    }
  } as unknown as SupabaseClient;
}
