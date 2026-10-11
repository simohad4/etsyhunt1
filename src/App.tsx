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
import { AlertCircle, X } from 'lucide-react';
import { canAccessPrivateWorkspace } from './security/workspaceAccess';

function AppContent() {
  const { user, workspace, isLiveSupabase, passwordRecoveryStatus } = useAuth();
  const hasPrivateWorkspaceAccess = canAccessPrivateWorkspace({
    isSupabaseConfigured: isLiveSupabase,
    user,
    workspace
  });

  // Navigation mode: 'landing' | 'workspace'
  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');

  // Active workspace tab
  const [workspaceTab, setWorkspaceTab] = useState<'board' | 'watchlist' | 'settings'>('board');

  // Authenticated product-board state is session-only and never shared with the public demo.
  const [products, setProducts] = useState<EtsyProductItem[]>([]);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<
    'login' | 'signup' | 'forgot_password' | 'update_password'
  >('signup');
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [isTagAnalyzerOpen, setIsTagAnalyzerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EtsyProductItem | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [creditAlert, setCreditAlert] = useState<string | null>(null);

  // Clear all private board state whenever the authenticated identity changes or expires.
  useEffect(() => {
    setProducts([]);
    setSelectedProduct(null);
    setIsProductDetailOpen(false);
    setIsTagAnalyzerOpen(false);
    setIsCommandMenuOpen(false);
    setCreditAlert(null);
    if (!user) setViewMode('landing');
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

  // Add new candidate product
  const handleAddProduct = (productData: Partial<EtsyProductItem>) => {
    const newIdNum = Math.floor(200 + Math.random() * 800);
    const newProduct: EtsyProductItem = {
      id: `prod-${Date.now()}`,
      identifier: `ETSY-${newIdNum}`,
      title: productData.title || 'Candidate Listing',
      shopName: productData.shopName || 'EvaluatedShop',
      imageUrl:
        productData.imageUrl ||
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80',
      category: productData.category || 'Home & Living',
      tags: productData.tags || ['personalized gift', 'custom item'],
      observedPrice: productData.observedPrice || 28.5,
      observedShopRating: 4.9,
      observedReviewsCount: 120,
      observedInCartCount: 8,
      observedIsBestseller: false,
      observedIsSponsored: false,
      estimatedMonthlyRevenue: productData.estimatedMonthlyRevenue || 9120,
      estimatedMonthlySales: productData.estimatedMonthlySales || 320,
      estimatedMonthlyViews: 14200,
      estimatedMarginPct: productData.estimatedMarginPct || 70,
      opportunityScore: productData.opportunityScore || 85,
      competition: productData.competition || 'low',
      stage: productData.stage || 'trending',
      notes: productData.notes || 'Added from Product Research Explorer.',
      createdAt: 'Just now'
    };

    setProducts((prev) => [newProduct, ...prev]);
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
    setViewMode('workspace');
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-[#f7f8f8] selection:bg-[#5e6ad2] selection:text-white font-sans antialiased">
      {/* Dynamic SEO Document Title & Meta Updater */}
      <EtsyHunterSEO
        viewMode={viewMode}
        activeTab={workspaceTab}
        workspaceName={workspace?.name}
        selectedProduct={selectedProduct}
      />

      {/* Credit alert banner */}
      {creditAlert && (
        <div className="fixed top-3 right-3 z-50 max-w-md p-3 rounded-xl bg-[#121216] border border-[#e5484d] text-xs text-[#f7f8f8] shadow-2xl flex items-start gap-2.5 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 text-[#e5484d] shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold text-[#e5484d]">Research Credits Exhausted</span>
            <p className="text-[#8a8f98] mt-0.5">{creditAlert}</p>
          </div>
          <button
            onClick={() => setCreditAlert(null)}
            className="p-1 text-[#8a8f98] hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {viewMode === 'workspace' && hasPrivateWorkspaceAccess ? (
        /* Authenticated Personal Workspace */
        <EtsyHunterWorkspace
          onBackToLanding={() => setViewMode('landing')}
          onOpenTagAnalyzer={() => setIsTagAnalyzerOpen(true)}
          onOpenCommandMenu={() => setIsCommandMenuOpen(true)}
          onSelectProduct={(product) => {
            setSelectedProduct(product);
            setIsProductDetailOpen(true);
          }}
          products={products}
          onUpdateProductStage={handleUpdateProductStage}
          activeTab={workspaceTab}
          onTabChange={setWorkspaceTab}
          onSeedSampleProducts={handleSeedDemoData}
        />
      ) : (
        /* Public Landing Page */
        <div className="flex flex-col min-h-screen">
          {/* 1. Header */}
          <EtsyHunterHeader
            onOpenAuth={(mode = 'signup') => {
              setAuthInitialMode(mode);
              setIsAuthOpen(true);
            }}
            onOpenWorkspace={() => setViewMode('workspace')}
            onOpenCommandMenu={() => setIsCommandMenuOpen(true)}
          />

          <main className="flex-1">
            {/* 2. Hero Section */}
            <EtsyHunterHero
              onOpenAuth={(mode = 'signup') => {
                setAuthInitialMode(mode);
                setIsAuthOpen(true);
              }}
              onOpenWorkspace={() => setViewMode('workspace')}
              onOpenResearch={() => setIsTagAnalyzerOpen(true)}
            />

            {/* 3. Board Preview */}
            <EtsyHunterBoardPreview
              onOpenWorkspace={() => setViewMode('workspace')}
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
              onOpenWorkspace={() => setViewMode('workspace')}
            />
          </main>

          {/* 8. Footer */}
          <EtsyHunterFooter />
        </div>
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
        onNavigateWorkspace={() => setViewMode('workspace')}
        onNavigateHome={() => setViewMode('landing')}
      />

      {/* Etsy Tag Analyzer / Keyword Explorer Modal */}
      <EtsyTagAnalyzerModal
        isOpen={isTagAnalyzerOpen}
        onClose={() => setIsTagAnalyzerOpen(false)}
        onAddProduct={handleAddProduct}
      />

      {/* Etsy Product Detail Modal */}
      <EtsyProductDetailModal
        isOpen={isProductDetailOpen}
        product={selectedProduct}
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
