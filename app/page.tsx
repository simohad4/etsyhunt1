'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, NavItem } from '@/src/components/Sidebar';
import { Header } from '@/src/components/Header';
import { SellerSpriteFilterBar } from '@/src/components/SellerSpriteFilterBar';
import { KPICards } from '@/src/components/KPICards';
import { AIMarketBriefing } from '@/src/components/AIMarketBriefing';
import { WinningProductCards } from '@/src/components/WinningProductCards';
import { CompetitorDataTable } from '@/src/components/CompetitorDataTable';
import { KeywordMiningView } from '@/src/components/KeywordMiningView';
import { MarginCalculatorModal } from '@/src/components/MarginCalculatorModal';
import { SettingsModal, HelpModal } from '@/src/components/SettingsModal';
import { LandingPage } from '@/src/components/LandingPage';
import { PricingPage } from '@/src/components/PricingPage';
import { AuthModal } from '@/src/components/AuthModal';
import { SavedSearchesModal } from '@/src/components/SavedSearchesModal';
import { MarketAnalysisResult, WinningIdea } from '@/src/types';
import { RefreshCw, AlertCircle, Layers, Bookmark } from 'lucide-react';

export default function EtsyHunterPage() {
  // Navigation View Mode: 'landing' (Public SaaS marketing page) | 'pricing' | 'workspace'
  const [viewMode, setViewMode] = useState<'landing' | 'pricing' | 'workspace'>('landing');

  // User Profile & Credits
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('Alex Rivera');
  const [userEmail, setUserEmail] = useState('alex.seller@gmail.com');
  const [creditsRemaining, setCreditsRemaining] = useState(450);
  const [totalCredits, setTotalCredits] = useState(500);

  // Workspace Layout
  const [currentTab, setCurrentTab] = useState<NavItem>('product-research');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState('US');

  // Search & Filtering
  const [keyword, setKeyword] = useState('ghost mug');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minCarts, setMinCarts] = useState('');
  const [bestsellerOnly, setBestsellerOnly] = useState(false);

  // Async Analysis State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MarketAnalysisResult | null>(null);

  // Saved Searches
  const [savedKeywords, setSavedKeywords] = useState<string[]>(['ghost mug', 'wedding gift', 'retro nurse sweatshirt']);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isSavedSearchesOpen, setIsSavedSearchesOpen] = useState(false);
  const [calcPresetIdea, setCalcPresetIdea] = useState<WinningIdea | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('etsyhunter_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setIsLoggedIn(true);
        setUserName(parsed.name || 'Alex Rivera');
        setUserEmail(parsed.email || 'alex.seller@gmail.com');
      } catch {}
    }

    const savedHistory = localStorage.getItem('etsyhunter_saved_searches');
    if (savedHistory) {
      try {
        setSavedKeywords(JSON.parse(savedHistory));
      } catch {}
    }
  }, []);

  const handleLoginSuccess = (email: string, name: string) => {
    setIsLoggedIn(true);
    setUserName(name);
    setUserEmail(email);
    localStorage.setItem('etsyhunter_user', JSON.stringify({ email, name }));
    setViewMode('workspace');
  };

  const handleSelectPlan = (planName: string, price: number) => {
    setIsLoggedIn(true);
    setCreditsRemaining(500);
    setTotalCredits(500);
    setViewMode('workspace');
  };

  const runAnalysis = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setKeyword(q);
    setLoadingStep(1);

    if (viewMode !== 'workspace') {
      setViewMode('workspace');
    }

    const t1 = setTimeout(() => setLoadingStep(2), 1100);
    const t2 = setTimeout(() => setLoadingStep(3), 2600);

    try {
      const response = await fetch('/api/analyze-etsy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keyword: q
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete market research.');
      }

      setAnalysisResult(data);
      setCreditsRemaining((prev) => Math.max(1, prev - 1));

      if (!savedKeywords.includes(q)) {
        const nextSaved = [q, ...savedKeywords].slice(0, 10);
        setSavedKeywords(nextSaved);
        localStorage.setItem('etsyhunter_saved_searches', JSON.stringify(nextSaved));
      }
    } catch (err: any) {
      console.error('Market analysis error:', err);
      setError(err.message || 'An error occurred during market research analysis.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
    }
  };

  const handleRemoveSavedItem = (kw: string) => {
    const updated = savedKeywords.filter((k) => k !== kw);
    setSavedKeywords(updated);
    localStorage.setItem('etsyhunter_saved_searches', JSON.stringify(updated));
  };

  const handleClearAllSaved = () => {
    setSavedKeywords([]);
    localStorage.removeItem('etsyhunter_saved_searches');
  };

  const filteredCompetitors = analysisResult?.competitors
    ? analysisResult.competitors.filter((c) => {
        if (minPrice && c.price < parseFloat(minPrice)) return false;
        if (maxPrice && c.price > parseFloat(maxPrice)) return false;
        if (minCarts && (c.inCartCount || 0) < parseInt(minCarts, 10)) return false;
        if (bestsellerOnly && !c.isBestseller) return false;
        return true;
      })
    : [];

  const handleResetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setMinCarts('');
    setBestsellerOnly(false);
    setCategoryFilter('All Categories');
  };

  const handleOpenCalculatorWithIdea = (idea: WinningIdea) => {
    setCalcPresetIdea(idea);
    setIsCalcOpen(true);
  };

  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage
          onGoToApp={(preset) => {
            setViewMode('workspace');
            if (preset) runAnalysis(preset);
            else if (!analysisResult) runAnalysis('ghost mug');
          }}
          onGoToPricing={() => setViewMode('pricing')}
          onOpenAuth={() => setIsAuthOpen(true)}
          isLoggedIn={isLoggedIn}
          userEmail={userEmail}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  if (viewMode === 'pricing') {
    return (
      <>
        <PricingPage
          onBackToHome={() => setViewMode('landing')}
          onSelectPlan={handleSelectPlan}
          onOpenAuth={() => setIsAuthOpen(true)}
          isLoggedIn={isLoggedIn}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex font-sans antialiased selection:bg-[#F97316] selection:text-white">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'profit-calc') setIsCalcOpen(true);
          if (tab === 'saved-searches') setIsSavedSearchesOpen(true);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        creditsRemaining={creditsRemaining}
        totalCredits={totalCredits}
        onOpenUpgrade={() => setViewMode('pricing')}
        onGoToLanding={() => setViewMode('landing')}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-200 min-w-0 ${
          isSidebarCollapsed ? 'pl-16' : 'pl-60'
        }`}
      >
        <Header
          onOpenSavedSearches={() => setIsSavedSearchesOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onGoToPricing={() => setViewMode('pricing')}
          onGoToLanding={() => setViewMode('landing')}
          selectedMarket={selectedMarket}
          onSelectMarket={setSelectedMarket}
          userName={userName}
          userEmail={userEmail}
          creditsRemaining={creditsRemaining}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  EtsyHunter • Demand Radar
                </h1>
                <span className="text-xs text-slate-400 font-mono">
                  · ETSY {selectedMarket} RADAR
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time buyer velocity, in-cart intelligence, and unit margin validation
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSavedSearchesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141B29] hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                <span>Saved ({savedKeywords.length})</span>
              </button>

              <button
                onClick={() => {
                  setCalcPresetIdea(null);
                  setIsCalcOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141B29] hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Margin Simulator</span>
              </button>
            </div>
          </div>

          <SellerSpriteFilterBar
            keyword={keyword}
            onChangeKeyword={setKeyword}
            onSearch={(term) => runAnalysis(term)}
            isLoading={loading}
            minPriceFilter={minPrice}
            maxPriceFilter={maxPrice}
            minCartsFilter={minCarts}
            onChangeMinPrice={setMinPrice}
            onChangeMaxPrice={setMaxPrice}
            onChangeMinCarts={setMinCarts}
            bestsellerOnly={bestsellerOnly}
            onToggleBestseller={() => setBestsellerOnly(!bestsellerOnly)}
            categoryFilter={categoryFilter}
            onChangeCategory={setCategoryFilter}
            onResetFilters={handleResetFilters}
          />

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-sm block">Analysis Error</span>
                <p>{error}</p>
                <p className="text-slate-400">
                  Tip: Confirm your network connection or try a different search phrase.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-[#0F1522] border border-slate-800 rounded-xl p-8 shadow-sm text-center space-y-6 max-w-xl mx-auto my-8">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-[#F97316] animate-spin" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  Extracting Marketplace Intelligence for &ldquo;{keyword}&rdquo;
                </h3>
                <p className="text-xs text-slate-400">
                  Tracking active buyer carts and calculating competition metrics
                </p>
              </div>

              <div className="space-y-2 text-left text-xs max-w-md mx-auto">
                <div
                  className={`p-2.5 rounded-lg border flex items-center gap-3 ${
                    loadingStep >= 1
                      ? 'bg-[#141B29] border-slate-700 text-white'
                      : 'border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-[#F97316] text-white font-bold flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Scanning active buyer cart additions &amp; live marketplace signals</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex items-center gap-3 ${
                    loadingStep >= 2
                      ? 'bg-[#141B29] border-slate-700 text-white'
                      : 'border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-[#F97316] text-white font-bold flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>Analyzing 24-hour transaction frequency &amp; saturation benchmarks</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex items-center gap-3 ${
                    loadingStep >= 3
                      ? 'bg-[#141B29] border-slate-700 text-white'
                      : 'border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-[#F97316] text-white font-bold flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>Synthesizing market patterns &amp; validated product opportunity angles</span>
                </div>
              </div>
            </div>
          )}

          {analysisResult && !loading && (
            <div className="space-y-6">
              <div className="bg-[#0F1522] border border-slate-800/90 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white capitalize">
                    Dataset for &ldquo;{analysisResult.keyword}&rdquo;
                  </span>
                  <span className="text-emerald-400 font-medium">
                    ● Real-Time Cart Radar Active
                  </span>
                </div>

                <div className="text-slate-400 flex items-center gap-2 text-[11px] font-mono">
                  <span>{filteredCompetitors.length} Listings Displayed</span>
                  <span>·</span>
                  <span>Updated: {new Date(analysisResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {(currentTab === 'product-research' || currentTab === 'market-overview') && (
                <KPICards
                  metrics={analysisResult.metrics}
                  isLiveScraped={analysisResult.isLiveScraped}
                  totalListings={analysisResult.totalListingsAnalyzed}
                  keyword={analysisResult.keyword}
                />
              )}

              {(currentTab === 'product-research' || currentTab === 'market-overview') && (
                <AIMarketBriefing
                  summary={analysisResult.marketSummary}
                  keyword={analysisResult.keyword}
                />
              )}

              {(currentTab === 'product-research' || currentTab === 'ai-blueprints') && (
                <WinningProductCards
                  ideas={analysisResult.winningIdeas}
                  onOpenCalculatorWithIdea={handleOpenCalculatorWithIdea}
                />
              )}

              {(currentTab === 'product-research' || currentTab === 'keyword-mining') && (
                <KeywordMiningView
                  keywords={analysisResult.highDemandKeywords}
                  onSelectKeyword={(kw) => {
                    setKeyword(kw);
                    runAnalysis(kw);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {(currentTab === 'product-research' || currentTab === 'competitor-spy') && (
                <CompetitorDataTable
                  competitors={filteredCompetitors}
                  keyword={analysisResult.keyword}
                />
              )}
            </div>
          )}
        </main>

        <footer className="border-t border-slate-800/80 bg-[#0E1420] py-6 px-4 text-center text-xs text-slate-500 space-y-1">
          <p>
            EtsyHunter • Market Intelligence &amp; Demand Radar
          </p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-1">
            <button onClick={() => setViewMode('landing')} className="hover:text-slate-300">
              Home
            </button>
            <span>·</span>
            <button onClick={() => setViewMode('pricing')} className="hover:text-slate-300">
              Pricing Plans
            </button>
            <span>·</span>
            <button onClick={() => setIsSavedSearchesOpen(true)} className="hover:text-slate-300">
              Saved Searches
            </button>
            <span>·</span>
            <button onClick={() => setIsHelpOpen(true)} className="hover:text-slate-300">
              Methodology
            </button>
          </div>
        </footer>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <SavedSearchesModal
        isOpen={isSavedSearchesOpen}
        onClose={() => setIsSavedSearchesOpen(false)}
        savedKeywords={savedKeywords}
        onSelectSearch={(kw) => {
          setKeyword(kw);
          runAnalysis(kw);
        }}
        onClearAll={handleClearAllSaved}
        onRemoveItem={handleRemoveSavedItem}
      />

      <MarginCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        presetIdea={calcPresetIdea}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userName={userName}
        userEmail={userEmail}
        creditsRemaining={creditsRemaining}
        totalCredits={totalCredits}
        onOpenPricing={() => setViewMode('pricing')}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
