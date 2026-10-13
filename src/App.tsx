import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EtsyHunterHeader } from './components/EtsyHunterHeader';
import { EtsyHunterHero } from './components/EtsyHunterHero';
import { EtsyHunterBoardPreview } from './components/EtsyHunterBoardPreview';
import { EtsyHunterCustomers } from './components/EtsyHunterCustomers';
import { EtsyHunterFeatures } from './components/EtsyHunterFeatures';
import { EtsyHunterMethod } from './components/EtsyHunterMethod';
import { EtsyHunterPricing } from './components/EtsyHunterPricing';
import { EtsyHunterFooter } from './components/EtsyHunterFooter';
import { EtsyHunterWorkspace } from './components/EtsyHunterWorkspace';
import { EtsyHunterCommandMenu } from './components/EtsyHunterCommandMenu';
import { EtsyHunterAuthModal } from './components/EtsyHunterAuthModal';
import { EtsyHunterSEO } from './components/EtsyHunterSEO';
import { EtsyTagAnalyzerModal } from './components/EtsyTagAnalyzerModal';
import { EtsyProductDetailModal } from './components/EtsyProductDetailModal';
import { EtsyProductItem, ResearchStage } from './types/etsyHunter';
import { DEMO_ETSY_PRODUCTS } from './data/mockEtsyHunterData';
import { canAccessPrivateWorkspace } from './security/workspaceAccess';
import {
  customerPathForPage,
  resolveAppRoute,
  useBrowserPath
} from './appRoutes';
import { EtsyHunterAdminRoute } from './components/EtsyHunterAdminShell';
import {
  RouteAccessState,
  RouteLoadingState,
  RouteNotFoundState
} from './components/AppRouteStates';

const DEMO_PRODUCT_IDS = new Set(DEMO_ETSY_PRODUCTS.map((product) => product.id));

function AppContent() {
  const {
    user,
    session,
    workspace,
    loading,
    authError,
    isLiveSupabase,
    reloadWorkspace,
    passwordRecoveryStatus
  } = useAuth();
  const { pathname, navigate } = useBrowserPath();
  const route = resolveAppRoute(pathname);
  const hasPrivateWorkspaceAccess = canAccessPrivateWorkspace({
    isSupabaseConfigured: isLiveSupabase,
    user,
    workspace
  });

  const workspaceTab = route.scope === 'customer' && route.page === 'saved'
    ? 'watchlist'
    : route.scope === 'customer' && route.page === 'settings'
      ? 'settings'
      : 'board';

  // Authenticated product-board state is session-only and never shared with the public demo.
  const [products, setProducts] = useState<EtsyProductItem[]>([]);
  const boardDataSource = products.length === 0
    ? 'empty'
    : products.every((product) => DEMO_PRODUCT_IDS.has(product.id))
      ? 'demo'
      : products.some((product) => DEMO_PRODUCT_IDS.has(product.id))
        ? 'mixed'
        : 'session';

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<
    'login' | 'signup' | 'forgot_password' | 'update_password'
  >('signup');
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [isTagAnalyzerOpen, setIsTagAnalyzerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EtsyProductItem | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  // Clear all private board state whenever the authenticated identity changes or expires.
  useEffect(() => {
    setProducts([]);
    setSelectedProduct(null);
    setIsProductDetailOpen(false);
    setIsTagAnalyzerOpen(false);
    setIsCommandMenuOpen(false);
  }, [user?.id]);

  useEffect(() => {
    if (passwordRecoveryStatus === 'ready') {
      setAuthInitialMode('update_password');
      setIsAuthOpen(true);
    } else if (passwordRecoveryStatus === 'invalid') {
      setAuthInitialMode('login');
      setIsAuthOpen(true);
    }
  }, [passwordRecoveryStatus]);

  // Global Keyboard listener for Cmd+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandMenuOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandMenuOpen(false);
        setIsTagAnalyzerOpen(false);
        setIsProductDetailOpen(false);
        setIsAuthOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update product stage
  const handleUpdateProductStage = (id: string, newStage: ResearchStage) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stage: newStage } : item))
    );
  };

  // Update existing product
  const handleUpdateProduct = (updated: EtsyProductItem) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  // Delete product
  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
  };

  // Seed sample demonstration listings
  const handleSeedDemoData = () => {
    setProducts(DEMO_ETSY_PRODUCTS);
  };

  const handleLoginSuccess = () => {
    navigate('/app/board');
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-[#f7f8f8] selection:bg-[#5e6ad2] selection:text-white font-sans antialiased">
      {/* Dynamic SEO Document Title & Meta Updater */}
      <EtsyHunterSEO
        viewMode={route.scope === 'public' ? 'landing' : route.scope === 'admin' ? 'admin' : 'workspace'}
        activeTab={workspaceTab}
        adminPage={route.scope === 'admin' ? route.page : undefined}
        workspaceName={workspace?.name}
        selectedProduct={selectedProduct}
      />

      {route.scope === 'customer' ? (
        loading ? (
          <RouteLoadingState dashboard />
        ) : !isLiveSupabase ? (
          <RouteAccessState kind="unavailable" message={authError ? 'Account services are currently unavailable.' : 'Account services are not configured.'} onHome={() => navigate('/')} />
        ) : !user || !session ? (
          <RouteAccessState kind="unauthorized" message="Sign in with your Etsy Hunter account to open this private workspace." onHome={() => navigate('/')} onLogin={() => { setAuthInitialMode('login'); setIsAuthOpen(true); }} />
        ) : !hasPrivateWorkspaceAccess ? (
          <RouteAccessState kind="unavailable" message={authError || 'Your private workspace could not be loaded.'} onHome={() => navigate('/')} onRetry={() => void reloadWorkspace()} />
        ) : route.page === 'not_found' ? (
          <RouteNotFoundState onHome={() => navigate('/')} onWorkspace={() => navigate('/app/board')} />
        ) : (
          <EtsyHunterWorkspace
            onBackToLanding={() => navigate('/')}
            onOpenTagAnalyzer={() => setIsTagAnalyzerOpen(true)}
            onOpenCommandMenu={() => setIsCommandMenuOpen(true)}
            onSelectProduct={(product) => {
              setSelectedProduct(product);
              setIsProductDetailOpen(true);
            }}
            products={products}
            boardDataSource={boardDataSource}
            demoProductIds={DEMO_PRODUCT_IDS}
            onUpdateProductStage={handleUpdateProductStage}
            activeTab={workspaceTab}
            onTabChange={(tab) => navigate(customerPathForPage(tab === 'watchlist' ? 'saved' : tab))}
            onSeedSampleProducts={handleSeedDemoData}
            onSignedOut={() => navigate('/')}
          />
        )
      ) : route.scope === 'admin' ? (
        loading ? (
          <RouteLoadingState />
        ) : !isLiveSupabase ? (
          <RouteAccessState kind="unavailable" message={authError || 'Supabase authentication is not configured.'} onHome={() => navigate('/')} />
        ) : !user || !session ? (
          <RouteAccessState kind="unauthorized" message="Sign in with an authorized Etsy Hunter admin account." onHome={() => navigate('/')} onLogin={() => { setAuthInitialMode('login'); setIsAuthOpen(true); }} />
        ) : (
          <EtsyHunterAdminRoute page={route.page} pathname={pathname} session={session} user={user} navigate={navigate} />
        )
      ) : route.scope === 'public' ? (
        /* Public Landing Page */
        <div className="flex flex-col min-h-screen">
          {/* 1. Header */}
          <EtsyHunterHeader
            onOpenAuth={(mode = 'signup') => {
              setAuthInitialMode(mode);
              setIsAuthOpen(true);
            }}
            onOpenWorkspace={() => navigate('/app/board')}
            onOpenCommandMenu={() => setIsCommandMenuOpen(true)}
          />

          <main className="flex-1">
            {/* 2. Hero Section */}
            <EtsyHunterHero
              onOpenAuth={(mode = 'signup') => {
                setAuthInitialMode(mode);
                setIsAuthOpen(true);
              }}
              onOpenWorkspace={() => navigate('/app/board')}
              onOpenResearch={() => setIsTagAnalyzerOpen(true)}
            />

            {/* 3. Board Preview */}
            <EtsyHunterBoardPreview
              onOpenWorkspace={() => navigate('/app/board')}
              onSelectProduct={(product) => {
                setSelectedProduct(product);
                setIsProductDetailOpen(true);
              }}
            />

            {/* 4. Supported Categories & Workflows */}
            <EtsyHunterCustomers />

            {/* 5. Features Grid */}
            <EtsyHunterFeatures />

            {/* 6. Research Method */}
            <EtsyHunterMethod />

            {/* 7. Centralized Pricing Section */}
            <EtsyHunterPricing
              onOpenAuth={(mode = 'signup') => {
                setAuthInitialMode(mode);
                setIsAuthOpen(true);
              }}
              onOpenWorkspace={() => navigate('/app/board')}
            />
          </main>

          {/* 8. Footer */}
          <EtsyHunterFooter />
        </div>
      ) : (
        <RouteNotFoundState onHome={() => navigate('/')} onWorkspace={user && workspace ? () => navigate('/app/board') : undefined} />
      )}

      {/* Global Overlays */}

      {/* Cmd+K Command Palette */}
      <EtsyHunterCommandMenu
        isOpen={isCommandMenuOpen}
        onClose={() => setIsCommandMenuOpen(false)}
        products={products}
        onSelectProduct={(product) => {
          setSelectedProduct(product);
          setIsProductDetailOpen(true);
        }}
        onOpenTagAnalyzer={() => setIsTagAnalyzerOpen(true)}
        onNavigateWorkspace={() => navigate('/app/board')}
        onNavigateHome={() => navigate('/')}
      />

      {/* Etsy Tag Analyzer / Keyword Explorer Modal */}
      <EtsyTagAnalyzerModal
        isOpen={isTagAnalyzerOpen}
        onClose={() => setIsTagAnalyzerOpen(false)}
      />

      {/* Etsy Product Detail Modal */}
      <EtsyProductDetailModal
        isOpen={isProductDetailOpen}
        product={selectedProduct}
        isDemoProduct={selectedProduct ? DEMO_PRODUCT_IDS.has(selectedProduct.id) : false}
        onClose={() => {
          setIsProductDetailOpen(false);
          setSelectedProduct(null);
        }}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
      />

      {/* Auth Modal (/signup, /login, /forgot_password) */}
      <EtsyHunterAuthModal
        isOpen={isAuthOpen}
        initialMode={authInitialMode}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
