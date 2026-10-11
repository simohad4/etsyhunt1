import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
import { SUPABASE_CONFIGURATION_ERROR } from '../security/supabaseConfiguration';
import {
  canApplyPrivateStateLoad,
  createAuthoritativeUserPrivateState,
  createEmptyUserPrivateState,
  didAuthenticatedUserChange
} from '../security/privateWorkspaceState';
import {
  EMPTY_PASSWORD_RECOVERY_STATE,
  inspectPasswordRecoveryRedirect,
  PasswordRecoveryState,
  PasswordRecoveryStatus,
  passwordRecoveryStateFromAuthEvent,
  updateRecoveredPasswordWithSupabase
} from '../security/passwordRecovery';
import {
  getSavedListingInsertErrorMessage,
  getSavedListingQuotaMessage
} from '../security/savedListingEntitlements';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLiveSupabase: boolean;
  workspace: WorkspaceData | null;
  savedListings: SavedListingItem[];
  searchHistory: ResearchSearchHistoryItem[];
  authError: string | null;
  passwordRecoveryStatus: PasswordRecoveryStatus;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ data: any; error: Error | null; needsEmailVerification?: boolean }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  updateRecoveredPassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePlan: (plan: 'starter' | 'pro' | 'agency') => void;
  consumeCredits: (amount: number, metadata?: { keyword: string; pages: number; listingsFound: number }) => Promise<boolean>;
  saveListing: (product: EtsyProductItem, notes?: string) => Promise<{ success: boolean; error?: string }>;
  removeSavedListing: (productId: string) => Promise<void>;
  isListingSaved: (productId: string) => boolean;
  clearHistory: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const configurationError = () => new Error(SUPABASE_CONFIGURATION_ERROR);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passwordRecoveryState, setPasswordRecoveryState] = useState<PasswordRecoveryState>(
    EMPTY_PASSWORD_RECOVERY_STATE
  );
  const activeUserIdRef = useRef<string | null>(null);
  const privateStateVersionRef = useRef(0);

  // Supabase is authoritative for all private workspace data.
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [savedListings, setSavedListings] = useState<SavedListingItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<ResearchSearchHistoryItem[]>([]);

  const clearPrivateState = (ownerUserId: string | null): number => {
    const emptyState = createEmptyUserPrivateState<
      WorkspaceData,
      SavedListingItem,
      ResearchSearchHistoryItem
    >(ownerUserId);
    activeUserIdRef.current = emptyState.ownerUserId;
    privateStateVersionRef.current += 1;
    setWorkspace(emptyState.workspace);
    setSavedListings(emptyState.savedListings);
    setSearchHistory(emptyState.searchHistory);
    return privateStateVersionRef.current;
  };

  const loadUserData = async (currentUser: User, expectedVersion: number) => {
    try {
      const { workspace: ws, savedListings: listings, searchHistory: history } = await fetchUserWorkspaceData(currentUser);
      if (!canApplyPrivateStateLoad(
        activeUserIdRef.current,
        privateStateVersionRef.current,
        currentUser.id,
        expectedVersion
      )) {
        return;
      }

      const authoritativeState = createAuthoritativeUserPrivateState(
        currentUser.id,
        ws,
        listings,
        history
      );
      setWorkspace(authoritativeState.workspace);
      setSavedListings(authoritativeState.savedListings);
      setSearchHistory(authoritativeState.searchHistory);
    } catch (err: any) {
      if (!canApplyPrivateStateLoad(
        activeUserIdRef.current,
        privateStateVersionRef.current,
        currentUser.id,
        expectedVersion
      )) {
        return;
      }
      console.error('Failed to load user workspace data:', err);
      setAuthError(err.message || 'Failed to initialize workspace data.');
    }
  };

  // Handle Supabase Auth state changes
  useEffect(() => {
    let mounted = true;
    const recoveryRedirect =
      typeof window === 'undefined'
        ? { hasRecoveryIntent: false, error: null }
        : inspectPasswordRecoveryRedirect(window.location.search, window.location.hash);

    if (recoveryRedirect.error) {
      setPasswordRecoveryState({
        status: 'invalid',
        recoveryUserId: null,
        error: recoveryRedirect.error
      });
      setAuthError(recoveryRedirect.error);
    }

    if (!supabase) {
      setUser(null);
      setSession(null);
      clearPrivateState(null);
      setAuthError(SUPABASE_CONFIGURATION_ERROR);
      setLoading(false);
      return;
    }

    const client = supabase;

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      const nextUser = nextSession?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const recoveryEventState = passwordRecoveryStateFromAuthEvent(event, nextUserId);

      if (recoveryEventState) {
        setPasswordRecoveryState(recoveryEventState);
        setAuthError(recoveryEventState.error);
      } else if (
        event === 'INITIAL_SESSION' &&
        recoveryRedirect.hasRecoveryIntent &&
        !recoveryRedirect.error &&
        !nextSession
      ) {
        const error = 'This password recovery link is invalid or has expired.';
        setPasswordRecoveryState({ status: 'invalid', recoveryUserId: null, error });
        setAuthError(error);
      }

      setSession(nextSession);
      setUser(nextUser);

      if (!nextUser) {
        clearPrivateState(null);
        if (!recoveryEventState && !recoveryRedirect.error) {
          setPasswordRecoveryState(EMPTY_PASSWORD_RECOVERY_STATE);
        }
        setLoading(false);
        return;
      }

      const identityChanged = didAuthenticatedUserChange(
        activeUserIdRef.current,
        nextUser.id
      );
      if (identityChanged || event === 'INITIAL_SESSION') {
        const expectedVersion = clearPrivateState(nextUser.id);
        setLoading(true);
        void loadUserData(nextUser, expectedVersion).finally(() => {
          if (
            mounted &&
            canApplyPrivateStateLoad(
              activeUserIdRef.current,
              privateStateVersionRef.current,
              nextUser.id,
              expectedVersion
            )
          ) {
            setLoading(false);
          }
        });
        return;
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
    setPasswordRecoveryState(EMPTY_PASSWORD_RECOVERY_STATE);
    if (!supabase) {
      const error = configurationError();
      setAuthError(error.message);
      return { error };
    }

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
    setPasswordRecoveryState(EMPTY_PASSWORD_RECOVERY_STATE);
    if (!supabase) {
      const error = configurationError();
      setAuthError(error.message);
      return { error };
    }

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
    setPasswordRecoveryState(EMPTY_PASSWORD_RECOVERY_STATE);
    if (!supabase) {
      const error = configurationError();
      setAuthError(error.message);
      return { data: null, error };
    }

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
    setPasswordRecoveryState(EMPTY_PASSWORD_RECOVERY_STATE);
    if (!supabase) {
      const error = configurationError();
      setAuthError(error.message);
      return { error };
    }

    try {
      const { error } = await (supabase.auth as any).resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?recovery=1`
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

  const updateRecoveredPassword = async (newPassword: string) => {
    setAuthError(null);
    if (!supabase) {
      const error = configurationError();
      setAuthError(error.message);
      return { error };
    }

    const result = await updateRecoveredPasswordWithSupabase(
      passwordRecoveryState,
      session?.user?.id ?? null,
      supabase.auth,
      newPassword
    );
    if (result.error) {
      setAuthError(result.error.message);
      setPasswordRecoveryState({
        status: 'invalid',
        recoveryUserId: null,
        error: result.error.message
      });
      return result;
    }

    setPasswordRecoveryState(EMPTY_PASSWORD_RECOVERY_STATE);
    return result;
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    clearPrivateState(null);
    setPasswordRecoveryState(EMPTY_PASSWORD_RECOVERY_STATE);
    setAuthError(supabase ? null : SUPABASE_CONFIGURATION_ERROR);
  };

  const updatePlan = (_planId: 'starter' | 'pro' | 'agency') => {
    console.warn('Direct plan updates require verified billing and are unavailable in M1.');
  };

  // M1 paid research is disabled. Credit mutations are backend-only in P1-B,
  // so the browser must not call any credit RPC.
  const consumeCredits = async (
    _amount: number,
    _metadata?: { keyword: string; pages: number; listingsFound: number }
  ): Promise<boolean> => {
    return false;
  };

  const isListingSaved = (productId: string): boolean => {
    return savedListings.some((item) => item.productId === productId);
  };

  const saveListing = async (
    product: EtsyProductItem,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isLiveSupabaseConfigured || !supabase || !user || !workspace) {
      return { success: false, error: 'Sign in with a configured Supabase account to save listings.' };
    }

    if (isListingSaved(product.id)) {
      return { success: false, error: 'Listing is already saved in your library.' };
    }

    const currentLimit = workspace.maxSavedListings;
    if (savedListings.length >= currentLimit) {
      return {
        success: false,
        error: getSavedListingQuotaMessage(savedListings.length, currentLimit)
      };
    }

    const newItem: SavedListingItem = {
      id: `saved-${Date.now()}`,
      workspaceId: workspace.id,
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
      return {
        success: false,
        error: getSavedListingInsertErrorMessage(
          error,
          savedListings.length,
          currentLimit
        )
      };
    }

    setSavedListings((prev) => [newItem, ...prev]);
    setWorkspace((prev) =>
      prev ? { ...prev, savedListingsCount: prev.savedListingsCount + 1 } : null
    );

    return { success: true };
  };

  const removeSavedListing = async (productId: string) => {
    if (!isLiveSupabaseConfigured || !supabase || !user || !workspace) return;

    await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', user.id)
      .eq('product_identifier', productId);

    setSavedListings((prev) => prev.filter((item) => item.productId !== productId));
    setWorkspace((prev) =>
      prev ? { ...prev, savedListingsCount: Math.max(0, prev.savedListingsCount - 1) } : null
    );
  };

  const clearHistory = async () => {
    if (!isLiveSupabaseConfigured || !supabase || !user || !workspace) return;

    await supabase
      .from('research_history')
      .delete()
      .eq('user_id', user.id);
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
        passwordRecoveryStatus: passwordRecoveryState.status,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        updatePassword,
        updateRecoveredPassword,
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
