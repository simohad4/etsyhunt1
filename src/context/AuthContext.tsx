import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  supabase,
  WorkspaceData,
  SavedListingItem,
  isLiveSupabaseConfigured,
  fetchUserWorkspaceData,
  updateUserPassword
} from '../services/supabase';
import { EtsyProductItem, ResearchSearchHistoryItem } from '../types/etsyHunter';
import { PRICING_PLANS } from '../config/pricing';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLiveSupabase: boolean;
  workspace: WorkspaceData | null;
  savedListings: SavedListingItem[];
  searchHistory: ResearchSearchHistoryItem[];
  authError: string | null;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ data: any; error: Error | null; needsEmailVerification?: boolean }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePlan: (plan: 'starter' | 'pro' | 'agency') => void;
  consumeCredits: (amount: number, metadata?: { keyword: string; pages: number; listingsFound: number }) => Promise<boolean>;
  saveListing: (product: EtsyProductItem, notes?: string) => Promise<{ success: boolean; error?: string }>;
  removeSavedListing: (productId: string) => Promise<void>;
  isListingSaved: (productId: string) => boolean;
  clearHistory: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Single Personal Workspace (1 user = 1 personal workspace)
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(() => {
    try {
      const saved = localStorage.getItem('etsyhunter_personal_workspace');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Saved Listings state (zero for new users)
  const [savedListings, setSavedListings] = useState<SavedListingItem[]>(() => {
    try {
      const saved = localStorage.getItem('etsyhunter_saved_listings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Research History state (zero for new users)
  const [searchHistory, setSearchHistory] = useState<ResearchSearchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('etsyhunter_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync to local storage
  useEffect(() => {
    if (workspace) {
      localStorage.setItem('etsyhunter_personal_workspace', JSON.stringify(workspace));
    } else {
      localStorage.removeItem('etsyhunter_personal_workspace');
    }
  }, [workspace]);

  useEffect(() => {
    localStorage.setItem('etsyhunter_saved_listings', JSON.stringify(savedListings));
  }, [savedListings]);

  useEffect(() => {
    localStorage.setItem('etsyhunter_search_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const loadUserData = async (currentUser: User) => {
    try {
      const { workspace: ws, savedListings: listings, searchHistory: history } = await fetchUserWorkspaceData(currentUser);
      setWorkspace(ws);
      setSavedListings(listings);
      if (history && history.length > 0) {
        setSearchHistory(history);
      }
    } catch (err: any) {
      console.error('Failed to load user workspace data:', err);
      setAuthError(err.message || 'Failed to initialize workspace data.');
    }
  };

  // Handle Supabase Auth state changes
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthError(error.message);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setWorkspace(null);
        setSavedListings([]);
        setLoading(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setWorkspace(null);
        setSavedListings([]);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) setAuthError(error.message);
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      setAuthError(err?.message || 'Google authentication failed.');
      return { error: err };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed.');
      return { error: err };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || email.split('@')[0] },
          emailRedirectTo: window.location.origin
        }
      });
      if (error) {
        setAuthError(error.message);
        return { data: null, error: new Error(error.message) };
      }
      // If user created but session is null, email verification is required by Supabase project
      const needsEmailVerification = Boolean(data?.user && !data?.session);
      return { data, error: null, needsEmailVerification };
    } catch (err: any) {
      setAuthError(err?.message || 'Sign up failed.');
      return { data: null, error: err };
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      const { error } = await (supabase.auth as any).resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#reset-password`
      });
      if (error) {
        setAuthError(error.message);
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: any) {
      setAuthError(err?.message || 'Password reset request failed.');
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    setAuthError(null);
    const result = await updateUserPassword(newPassword);
    if (result.error) {
      setAuthError(result.error.message);
    }
    return result;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setWorkspace(null);
    setSavedListings([]);
    setSearchHistory([]);
    setAuthError(null);
  };

  // Client-side simulation of plan upgrade in non-live demo environments only
  const updatePlan = (planId: 'starter' | 'pro' | 'agency') => {
    const planConfig = PRICING_PLANS[planId];
    if (!planConfig) return;

    if (isLiveSupabaseConfigured) {
      // In production live session, client cannot self-assign paid tiers directly
      console.warn('Direct plan updates must be executed via verified payment gateway.');
      return;
    }

    setWorkspace((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        plan: planId,
        creditsRemaining: planConfig.creditsPerMonth,
        totalCredits: planConfig.creditsPerMonth,
        maxSavedListings: planConfig.maxSavedListings
      };
    });
  };

  // Authoritative credit deduction
  const consumeCredits = async (
    amount: number,
    metadata?: { keyword: string; pages: number; listingsFound: number }
  ): Promise<boolean> => {
    if (!workspace) return false;
    if (workspace.creditsRemaining < amount) return false;

    if (isLiveSupabaseConfigured && user) {
      // Authoritative Supabase RPC call
      try {
        const { data, error } = await (supabase as any).rpc('consume_research_credits', {
          p_keyword: metadata?.keyword || 'Query',
          p_pages: metadata?.pages || 1,
          p_listings_count: metadata?.listingsFound || 0
        });

        if (error || !data?.success) {
          console.error('RPC consume_research_credits failed:', error);
          return false;
        }

        setWorkspace((prev) =>
          prev ? { ...prev, creditsRemaining: data.credits_remaining } : null
        );
      } catch (err) {
        console.error('Failed to consume credits via RPC:', err);
        return false;
      }
    } else {
      // Local fallback deduction
      setWorkspace((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          creditsRemaining: Math.max(0, prev.creditsRemaining - amount)
        };
      });
    }

    if (metadata) {
      const historyItem: ResearchSearchHistoryItem = {
        id: `hist-${Date.now()}`,
        keyword: metadata.keyword,
        pagesRequested: metadata.pages,
        creditsConsumed: amount,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        listingsFound: metadata.listingsFound
      };
      setSearchHistory((prev) => [historyItem, ...prev.slice(0, 49)]);
    }

    return true;
  };

  const isListingSaved = (productId: string): boolean => {
    return savedListings.some((item) => item.productId === productId);
  };

  const saveListing = async (
    product: EtsyProductItem,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isListingSaved(product.id)) {
      return { success: false, error: 'Listing is already saved in your library.' };
    }

    const currentLimit = workspace?.maxSavedListings || 50;
    if (savedListings.length >= currentLimit) {
      return {
        success: false,
        error: `Saved listings quota reached (${savedListings.length}/${currentLimit}). Upgrade your plan in Settings to save more listings.`
      };
    }

    const newItem: SavedListingItem = {
      id: `saved-${Date.now()}`,
      workspaceId: workspace?.id || 'ws-personal',
      productId: product.id,
      identifier: product.identifier,
      title: product.title,
      shopName: product.shopName,
      observedPrice: product.observedPrice,
      estimatedMonthlyRevenue: product.estimatedMonthlyRevenue,
      stage: product.stage,
      competition: product.competition,
      imageUrl: product.imageUrl,
      addedAt: 'Just now',
      notes: notes || ''
    };

    if (isLiveSupabaseConfigured && user) {
      const { error } = await supabase.from('saved_listings').insert({
        user_id: user.id,
        product_identifier: product.identifier,
        title: product.title,
        shop_name: product.shopName,
        image_url: product.imageUrl,
        category: product.category,
        observed_price: product.observedPrice,
        estimated_monthly_revenue: product.estimatedMonthlyRevenue,
        competition_level: product.competition,
        stage: product.stage,
        tags: product.tags,
        notes: notes || null
      });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    setSavedListings((prev) => [newItem, ...prev]);
    setWorkspace((prev) =>
      prev ? { ...prev, savedListingsCount: prev.savedListingsCount + 1 } : null
    );

    return { success: true };
  };

  const removeSavedListing = async (productId: string) => {
    if (isLiveSupabaseConfigured && user) {
      await supabase
        .from('saved_listings')
        .delete()
        .eq('user_id', user.id)
        .eq('product_identifier', productId);
    }

    setSavedListings((prev) => prev.filter((item) => item.productId !== productId));
    setWorkspace((prev) =>
      prev ? { ...prev, savedListingsCount: Math.max(0, prev.savedListingsCount - 1) } : null
    );
  };

  const clearHistory = async () => {
    if (isLiveSupabaseConfigured && user) {
      await supabase
        .from('research_history')
        .delete()
        .eq('user_id', user.id);
    }
    setSearchHistory([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isLiveSupabase: isLiveSupabaseConfigured,
        workspace,
        savedListings,
        searchHistory,
        authError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        updatePassword,
        signOut,
        updatePlan,
        consumeCredits,
        saveListing,
        removeSavedListing,
        isListingSaved,
        clearHistory
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
