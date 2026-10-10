import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, WorkspaceData, WatchlistItem, isLiveSupabaseConfigured } from '../services/supabase';
import { EtsyProductItem } from '../types/etsyHunter';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLiveSupabase: boolean;
  workspaces: WorkspaceData[];
  activeWorkspace: WorkspaceData | null;
  watchlist: WatchlistItem[];
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string, plan?: 'free' | 'standard' | 'plus') => WorkspaceData;
  updateWorkspacePlan: (plan: 'free' | 'standard' | 'plus' | 'enterprise') => void;
  consumeCredit: (amount?: number) => boolean;
  addToWatchlist: (product: EtsyProductItem, notes?: string) => void;
  removeFromWatchlist: (productId: string) => void;
  toggleWatchlist: (product: EtsyProductItem) => void;
  isInWatchlist: (productId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_WORKSPACES: WorkspaceData[] = [
  {
    id: 'ws-etsyhunter-core',
    name: 'AuraCraft Studios (Main)',
    slug: 'auracraft-studios',
    plan: 'plus',
    role: 'owner',
    creditsRemaining: 420,
    totalCredits: 500,
    productsCount: 48,
    membersCount: 4,
    maxMembers: 20,
    storageUsedMb: 1240,
    storageLimitMb: 5000,
    createdAt: '2026-01-15'
  },
  {
    id: 'ws-personal',
    name: 'POD Digital Lab',
    slug: 'pod-digital-lab',
    plan: 'free',
    role: 'owner',
    creditsRemaining: 45,
    totalCredits: 100,
    productsCount: 12,
    membersCount: 1,
    maxMembers: 3,
    storageUsedMb: 120,
    storageLimitMb: 500,
    createdAt: '2026-03-01'
  }
];

const INITIAL_WATCHLIST: WatchlistItem[] = [
  {
    id: 'watch-1',
    workspaceId: 'ws-etsyhunter-core',
    productId: 'etsy-prod-1',
    identifier: 'ETSY-101',
    title: 'Minimalist Affirmation Glass Cups with Bamboo Lid',
    shopName: 'AuraCraftStudios',
    price: 24.50,
    estimatedMonthlyRevenue: 14200,
    stage: 'trending',
    competition: 'low',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80',
    addedAt: '2 hours ago',
    notes: '22 buyers currently have this in cart. Daily sales velocity exceeding 18 units.',
    alertOnUpdate: true
  },
  {
    id: 'watch-2',
    workspaceId: 'ws-etsyhunter-core',
    productId: 'etsy-prod-3',
    identifier: 'ETSY-103',
    title: 'Custom Dog Ear Outline Embroidered Sweatshirt',
    shopName: 'PawsAndThreadCo',
    price: 46.00,
    estimatedMonthlyRevenue: 34500,
    stage: 'high_potential',
    competition: 'medium',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&auto=format&fit=crop&q=80',
    addedAt: 'Yesterday',
    notes: 'Bestseller in Pet Lover Gifts. Average gross profit margin ~72%.',
    alertOnUpdate: true
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Workspaces state
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>(() => {
    try {
      const saved = localStorage.getItem('etsyhunter_workspaces');
      return saved ? JSON.parse(saved) : DEFAULT_WORKSPACES;
    } catch {
      return DEFAULT_WORKSPACES;
    }
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('etsyhunter_active_workspace_id');
      return saved || 'ws-etsyhunter-core';
    } catch {
      return 'ws-etsyhunter-core';
    }
  });

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const saved = localStorage.getItem('etsyhunter_watchlist');
      return saved ? JSON.parse(saved) : INITIAL_WATCHLIST;
    } catch {
      return INITIAL_WATCHLIST;
    }
  });

  // Sync to storage
  useEffect(() => {
    localStorage.setItem('etsyhunter_workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    localStorage.setItem('etsyhunter_active_workspace_id', activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    localStorage.setItem('etsyhunter_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Listen to Supabase Auth state
  useEffect(() => {
    let mounted = true;

    // 1. Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // 2. Auth state subscription
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Auto-provision default Etsy Hunter workspace on first sign up if needed
        if (session?.user) {
          const userWorkspaces = workspaces.filter((w) => w.role === 'owner');
          if (userWorkspaces.length === 0) {
            const userName =
              session.user.user_metadata?.full_name ||
              session.user.email?.split('@')[0] ||
              'Personal';
            createWorkspace(`${userName}'s Etsy Hunter Shop`, 'plus');
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;

  // Supabase Auth Methods
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0]
          }
        }
      });

      if (!error && data.user) {
        // Automatically create a default Etsy Hunter Workspace
        const wsName = fullName ? `${fullName}'s Etsy Shop` : `${email.split('@')[0]}'s Etsy Shop`;
        createWorkspace(wsName, 'plus');
      }

      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // Workspace Multi-tenancy Methods
  const switchWorkspace = (workspaceId: string) => {
    if (workspaces.some((w) => w.id === workspaceId)) {
      setActiveWorkspaceId(workspaceId);
    }
  };

  const createWorkspace = (name: string, plan: 'free' | 'standard' | 'plus' = 'free'): WorkspaceData => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const newWs: WorkspaceData = {
      id: `ws-${Date.now()}`,
      name,
      slug,
      plan,
      role: 'owner',
      creditsRemaining: plan === 'plus' ? 500 : plan === 'standard' ? 250 : 100,
      totalCredits: plan === 'plus' ? 500 : plan === 'standard' ? 250 : 100,
      productsCount: 0,
      membersCount: 1,
      maxMembers: plan === 'plus' ? 20 : plan === 'standard' ? 10 : 3,
      storageUsedMb: 0,
      storageLimitMb: plan === 'plus' ? 5000 : plan === 'standard' ? 2000 : 500,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setWorkspaces((prev) => [newWs, ...prev]);
    setActiveWorkspaceId(newWs.id);
    return newWs;
  };

  const updateWorkspacePlan = (plan: 'free' | 'standard' | 'plus' | 'enterprise') => {
    if (!activeWorkspace) return;
    const additionalCredits = plan === 'enterprise' ? 2000 : plan === 'plus' ? 500 : plan === 'standard' ? 250 : 100;
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === activeWorkspace.id
          ? {
              ...w,
              plan,
              creditsRemaining: additionalCredits,
              totalCredits: additionalCredits,
              maxMembers: plan === 'enterprise' ? 100 : plan === 'plus' ? 20 : plan === 'standard' ? 10 : 3
            }
          : w
      )
    );
  };

  const consumeCredit = (amount: number = 1): boolean => {
    if (!activeWorkspace) return false;
    if (activeWorkspace.creditsRemaining < amount) return false;

    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === activeWorkspace.id
          ? { ...w, creditsRemaining: Math.max(0, w.creditsRemaining - amount) }
          : w
      )
    );
    return true;
  };

  // Watchlist Methods (Workspace specific)
  const activeWorkspaceWatchlist = watchlist.filter(
    (item) => item.workspaceId === activeWorkspaceId
  );

  const isInWatchlist = (productId: string): boolean => {
    return activeWorkspaceWatchlist.some((w) => w.productId === productId);
  };

  const addToWatchlist = (product: EtsyProductItem, notes?: string) => {
    if (isInWatchlist(product.id)) return;

    const newItem: WatchlistItem = {
      id: `watch-${Date.now()}`,
      workspaceId: activeWorkspaceId,
      productId: product.id,
      identifier: product.identifier,
      title: product.title,
      shopName: product.shopName,
      price: product.price,
      estimatedMonthlyRevenue: product.estimatedMonthlyRevenue,
      stage: product.stage,
      competition: product.competition,
      imageUrl: product.imageUrl,
      addedAt: 'Just now',
      notes: notes || 'Pinned to shop radar',
      alertOnUpdate: true
    };

    setWatchlist((prev) => [newItem, ...prev]);
  };

  const removeFromWatchlist = (productId: string) => {
    setWatchlist((prev) =>
      prev.filter((w) => !(w.workspaceId === activeWorkspaceId && w.productId === productId))
    );
  };

  const toggleWatchlist = (product: EtsyProductItem) => {
    if (isInWatchlist(product.id)) {
      removeFromWatchlist(product.id);
    } else {
      addToWatchlist(product);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isLiveSupabase: isLiveSupabaseConfigured,
        workspaces,
        activeWorkspace,
        watchlist: activeWorkspaceWatchlist,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        switchWorkspace,
        createWorkspace,
        updateWorkspacePlan,
        consumeCredit,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlist,
        isInWatchlist
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
