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
import { MOCK_ETSY_PRODUCTS } from './data/mockEtsyHunterData';
import { AlertCircle, X } from 'lucide-react';

function AppContent() {
  const { user, activeWorkspace, consumeCredit } = useAuth();

  // Navigation mode: 'landing' | 'workspace'
  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');

  // Active workspace tab
  const [workspaceTab, setWorkspaceTab] = useState<'board' | 'watchlist' | 'settings'>('board');

  // Etsy Products State (stored in memory & localStorage)
  const [products, setProducts] = useState<EtsyProductItem[]>(() => {
    const saved = localStorage.getItem('etsyhunter_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return MOCK_ETSY_PRODUCTS;
  });

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('signup');
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [isTagAnalyzerOpen, setIsTagAnalyzerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EtsyProductItem | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [creditAlert, setCreditAlert] = useState<string | null>(null);

  // Sync products to localStorage
  useEffect(() => {
    localStorage.setItem('etsyhunter_products', JSON.stringify(products));
  }, [products]);

  // Global Keyboard listener for Cmd+K and C (open tag analyzer)
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
      } else if (e.key.toLowerCase() === 'c' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsTagAnalyzerOpen(true);
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

  // Update product stage (Trending -> High Potential -> Optimized -> Tracked)
  const handleUpdateProductStage = (id: string, newStage: ResearchStage) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stage: newStage } : item))
    );
  };

  // Add new product from Tag Analyzer
  const handleAddProduct = (productData: Partial<EtsyProductItem>) => {
    if (activeWorkspace && activeWorkspace.creditsRemaining <= 0) {
      setCreditAlert(
        `Etsy API scan quota reached (${activeWorkspace.totalCredits} scans used). Upgrade plan in Shop Settings to perform more scans.`
      );
      return;
    }

    consumeCredit(1);

    const newIdNum = Math.floor(250 + Math.random() * 700);
    const newProduct: EtsyProductItem = {
      id: `prod-${Date.now()}`,
      identifier: `ETSY-${newIdNum}`,
      title: productData.title || 'Untitled Etsy Listing',
      shopName: productData.shopName || 'TrendingHuntShop',
      shopRating: productData.shopRating || 4.95,
      reviewsCount: productData.reviewsCount || 420,
      imageUrl:
        productData.imageUrl ||
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80',
      price: productData.price || 28.5,
      estimatedMonthlyRevenue: productData.estimatedMonthlyRevenue || 9800,
      monthlySales: productData.monthlySales || 340,
      monthlyViews: productData.monthlyViews || 18500,
      inCartCount: productData.inCartCount || 16,
      stage: productData.stage || 'trending',
      competition: productData.competition || 'low',
      category: productData.category || 'Home & Living',
      tags:
        productData.tags && productData.tags.length > 0
          ? productData.tags
          : ['handmade gift', 'personalized item', 'trending etsy'],
      estimatedMarginPct: productData.estimatedMarginPct || 70,
      etsyUrl: productData.etsyUrl || 'https://www.etsy.com',
      isBestseller: productData.isBestseller ?? true,
      notes: productData.notes || 'Added from Tag Analyzer.',
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

  // Seed sample products
  const handleSeedSampleProducts = () => {
    setProducts(MOCK_ETSY_PRODUCTS);
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
        workspaceName={activeWorkspace?.name}
        selectedProduct={selectedProduct}
      />

      {/* Credit alert banner */}
      {creditAlert && (
        <div className="fixed top-3 right-3 z-50 max-w-md p-3 rounded-xl bg-[#121216] border border-[#e5484d] text-xs text-[#f7f8f8] shadow-2xl flex items-start gap-2.5 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 text-[#e5484d] shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold text-[#e5484d]">Scan Quota Reached</span>
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

      {viewMode === 'workspace' ? (
        /* Full Etsy Hunter Workspace Dashboard */
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
          onSeedSampleProducts={handleSeedSampleProducts}
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
              onOpenTagAnalyzer={() => setIsTagAnalyzerOpen(true)}
            />

            {/* 3. Board Preview */}
            <EtsyHunterBoardPreview
              onOpenWorkspace={() => setViewMode('workspace')}
              onSelectProduct={(product) => {
                setSelectedProduct(product);
                setIsProductDetailOpen(true);
              }}
            />

            {/* 4. Power Sellers & Brands */}
            <EtsyHunterCustomers />

            {/* 5. Features Grid */}
            <EtsyHunterFeatures />

            {/* 6. The Etsy Hunter Method */}
            <EtsyHunterMethod />

            {/* 7. Pricing Section */}
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

      {/* Supabase Auth Modal (/signup & /login) */}
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
