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

interface WorkspaceMutationResult {
  success: boolean;
  error?: string;
}

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
  reloadWorkspace: () => Promise<void>;
  saveListing: (product: EtsyProductItem, notes?: string) => Promise<WorkspaceMutationResult>;
  removeSavedListing: (productId: string) => Promise<WorkspaceMutationResult>;
  isListingSaved: (productId: string) => boolean;
  clearHistory: () => Promise<WorkspaceMutationResult>;
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
  const privateStateLoadingRef = useRef(false);

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

  const fetchAndApplyPrivateState = async (
    currentUser: User,
    expectedVersion: number
  ): Promise<WorkspaceMutationResult> => {
    try {
      const { workspace: ws, savedListings: listings, searchHistory: history } = await fetchUserWorkspaceData(currentUser);
      if (!canApplyPrivateStateLoad(
        activeUserIdRef.current,
        privateStateVersionRef.current,
        currentUser.id,
        expectedVersion
      )) {
        return { success: false, error: 'The authenticated account changed before the workspace refresh completed.' };
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
      return { success: true };
    } catch (err: any) {
      if (!canApplyPrivateStateLoad(
        activeUserIdRef.current,
        privateStateVersionRef.current,
        currentUser.id,
        expectedVersion
      )) {
        return { success: false, error: 'The authenticated account changed before the workspace refresh completed.' };
      }
      console.error('Failed to load user workspace data:', err);
      return { success: false, error: err.message || 'Failed to initialize workspace data.' };
    }
  };

  const loadUserData = async (currentUser: User, expectedVersion: number) => {
    const result = await fetchAndApplyPrivateState(currentUser, expectedVersion);
    if (!canApplyPrivateStateLoad(
      activeUserIdRef.current,
      privateStateVersionRef.current,
      currentUser.id,
      expectedVersion
    )) {
      return;
    }

    setAuthError(result.success ? null : result.error || 'Failed to initialize workspace data.');
  };

  const invalidatePrivateStateAfterRefreshFailure = (
    currentUser: User,
    expectedVersion: number,
    message: string
  ) => {
    if (!canApplyPrivateStateLoad(
      activeUserIdRef.current,
      privateStateVersionRef.current,
      currentUser.id,
      expectedVersion
    )) {
      return;
    }

    clearPrivateState(currentUser.id);
    setAuthError(message);
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
        privateStateLoadingRef.current = false;
        clearPrivateState(null);
        if (!recoveryEventState && !recoveryRedirect.error) {
          setPasswordRecoveryState(EMPTY_PASSWORD_RECOVERY_STATE);
          setAuthError(null);
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
        privateStateLoadingRef.current = true;
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
            privateStateLoadingRef.current = false;
            setLoading(false);
          }
        });
        return;
      }

      if (!privateStateLoadingRef.current) {
        setLoading(false);
      }
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
    setUser(null);
    setSession(null);
    privateStateLoadingRef.current = false;
    clearPrivateState(null);
    setPasswordRecoveryState(EMPTY_PASSWORD_RECOVERY_STATE);
    setAuthError(null);

    if (!supabase) {
      setAuthError(SUPABASE_CONFIGURATION_ERROR);
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError('The local session was cleared, but the account service could not complete sign out.');
      }
    } catch {
      setAuthError('The local session was cleared, but the account service could not complete sign out.');
    }
  };

  const reloadWorkspace = async () => {
    if (!user) return;

    const expectedVersion = clearPrivateState(user.id);
    privateStateLoadingRef.current = true;
    setAuthError(null);
    setLoading(true);

    await loadUserData(user, expectedVersion);
    if (canApplyPrivateStateLoad(
      activeUserIdRef.current,
      privateStateVersionRef.current,
      user.id,
      expectedVersion
    )) {
      privateStateLoadingRef.current = false;
      setLoading(false);
    }
  };

  const isListingSaved = (productId: string): boolean => {
    return savedListings.some((item) => item.productId === productId);
  };

  const saveListing = async (
    product: EtsyProductItem,
    notes?: string
  ): Promise<WorkspaceMutationResult> => {
    if (!isLiveSupabaseConfigured || !supabase || !user || !workspace) {
      return { success: false, error: 'Sign in with a configured account to save listings.' };
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

    const mutationUser = user;
    const expectedVersion = privateStateVersionRef.current;

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

    const refreshResult = await fetchAndApplyPrivateState(mutationUser, expectedVersion);
    if (refreshResult.success) return { success: true };

    const refreshError = 'The listing was saved, but the workspace could not be refreshed. Reload before making more changes.';
    invalidatePrivateStateAfterRefreshFailure(mutationUser, expectedVersion, refreshError);
    return { success: false, error: refreshError };
  };

  const removeSavedListing = async (productId: string): Promise<WorkspaceMutationResult> => {
    if (!isLiveSupabaseConfigured || !supabase || !user || !workspace) {
      return { success: false, error: 'Sign in with a configured account to remove saved listings.' };
    }

    const mutationUser = user;
    const expectedVersion = privateStateVersionRef.current;

    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', user.id)
      .eq('product_identifier', productId);

    if (error) {
      return { success: false, error: 'Unable to remove this saved listing right now. Please try again.' };
    }

    const refreshResult = await fetchAndApplyPrivateState(mutationUser, expectedVersion);
    if (refreshResult.success) return { success: true };

    const refreshError = 'The listing was removed, but the workspace could not be refreshed. Reload before making more changes.';
    invalidatePrivateStateAfterRefreshFailure(mutationUser, expectedVersion, refreshError);
    return { success: false, error: refreshError };
  };

  const clearHistory = async (): Promise<WorkspaceMutationResult> => {
    if (!isLiveSupabaseConfigured || !supabase || !user || !workspace) {
      return { success: false, error: 'Sign in with a configured account to clear research history.' };
    }

    const mutationUser = user;
    const expectedVersion = privateStateVersionRef.current;

    const { error } = await supabase
      .from('research_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: 'Unable to clear research history right now. Please try again.' };
    }

    const refreshResult = await fetchAndApplyPrivateState(mutationUser, expectedVersion);
    if (refreshResult.success) return { success: true };

    const refreshError = 'Research history was cleared, but the workspace could not be refreshed. Reload before making more changes.';
    invalidatePrivateStateAfterRefreshFailure(mutationUser, expectedVersion, refreshError);
    return { success: false, error: refreshError };
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
        reloadWorkspace,
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
