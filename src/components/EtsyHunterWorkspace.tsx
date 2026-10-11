import React, { useState } from 'react';
import {
  Columns,
  Search,
  Plus,
  ChevronRight,
  Bookmark,
  Zap,
  LogOut,
  ArrowLeft,
  Settings,
  Tag,
  TrendingUp,
  Percent,
  Layers,
  Menu,
  X
} from 'lucide-react';
import { EtsyProductItem, ResearchStage } from '../types/etsyHunter';
import { EtsyHunterWorkspaceSwitcher } from './EtsyHunterWorkspaceSwitcher';
import { EtsyHunterWatchlist } from './EtsyHunterWatchlist';
import { EtsyHunterWorkspaceSettings } from './EtsyHunterWorkspaceSettings';
import { EtsyHunterStatusBanner } from './EtsyHunterStatusBanner';
import { useAuth } from '../context/AuthContext';
import {
  DashboardEmptyState,
  DashboardFilterBar,
  DashboardPageHeader,
  DashboardStatCard,
  DashboardStatusIndicator
} from './dashboard/DashboardUI';

interface EtsyHunterWorkspaceProps {
  onBackToLanding: () => void;
  onOpenTagAnalyzer: () => void;
  onOpenCommandMenu: () => void;
  onSelectProduct: (product: EtsyProductItem) => void;
  products: EtsyProductItem[];
  boardDataSource: 'empty' | 'session' | 'demo' | 'mixed';
  demoProductIds: ReadonlySet<string>;
  onUpdateProductStage: (id: string, newStage: ResearchStage) => void;
  activeTab?: 'board' | 'watchlist' | 'settings';
  onTabChange?: (tab: 'board' | 'watchlist' | 'settings') => void;
  onSeedSampleProducts?: () => void;
  onSignedOut?: () => void;
}

export const EtsyHunterWorkspace: React.FC<EtsyHunterWorkspaceProps> = ({
  onBackToLanding,
  onOpenTagAnalyzer,
  onOpenCommandMenu,
  onSelectProduct,
  products,
  boardDataSource,
  demoProductIds,
  onUpdateProductStage,
  activeTab: externalActiveTab,
  onTabChange,
  onSeedSampleProducts,
  onSignedOut
}) => {
  const { user, workspace, savedListings, isListingSaved, saveListing, removeSavedListing, signOut } = useAuth();

  const [internalActiveTab, setInternalActiveTab] = useState<'board' | 'watchlist' | 'settings'>('board');
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const [sidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleTabSelect = (tab: 'board' | 'watchlist' | 'settings') => {
    setMobileSidebarOpen(false);
    if (onTabChange) onTabChange(tab);
    else setInternalActiveTab(tab);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [minMarginFilter, setMinMarginFilter] = useState<number>(0);
  const [savedListingError, setSavedListingError] = useState<string | null>(null);

  const handleSavedListingToggle = async (product: EtsyProductItem) => {
    setSavedListingError(null);
    if (isListingSaved(product.id)) {
      await removeSavedListing(product.id);
      return;
    }

    if (demoProductIds.has(product.id)) {
      setSavedListingError('Demo listings are for interface exploration and cannot be saved to your Supabase workspace.');
      return;
    }

    const result = await saveListing(product);
    if (!result.success) {
      setSavedListingError(result.error || 'Unable to save this listing right now.');
    }
  };

  // Group columns for Kanban board
  const STAGES: { key: ResearchStage; title: string; color: string }[] = [
    { key: 'trending', title: 'Trending Ideas', color: '#5e6ad2' },
    { key: 'high_potential', title: 'High Potential', color: '#30a46c' },
    { key: 'optimized', title: 'Optimized Listings', color: '#f5d90a' },
    { key: 'tracked', title: 'Saved Listings', color: '#8a8f98' }
  ];

  const filteredProducts = products.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.shopName.toLowerCase().includes(q) ||
        p.identifier.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (competitionFilter !== 'all' && p.competition !== competitionFilter) return false;
    if (minMarginFilter > 0 && p.estimatedMarginPct < minMarginFilter) return false;

    return true;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const averageOpportunity = products.length > 0
    ? Math.round(products.reduce((total, product) => total + product.opportunityScore, 0) / products.length)
    : null;
  const averageMargin = products.length > 0
    ? Math.round(products.reduce((total, product) => total + product.estimatedMarginPct, 0) / products.length)
    : null;
  const boardSourceIndicator = boardDataSource === 'demo'
    ? <DashboardStatusIndicator label="Demo data" tone="warning" title="These are sample listings loaded for product exploration." />
    : boardDataSource === 'mixed'
      ? <DashboardStatusIndicator label="Mixed session + demo" tone="warning" title="This board contains both sample listings and entries added during this session." />
      : boardDataSource === 'empty'
        ? <DashboardStatusIndicator label="No board data" tone="neutral" title="No listing records are loaded on this board." />
        : <DashboardStatusIndicator label="Session data" tone="info" title="Research board entries are kept for this signed-in session and are not Supabase records." />;

  return (
    <div className="flex h-dvh w-full bg-[#0b0b0f] text-[#f7f8f8] overflow-hidden">
      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/65 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close workspace navigation overlay"
        />
      )}
      {/* 1. Left Minimalist Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 lg:static shrink-0 border-r border-[#22222b] bg-[#0b0b0f] flex flex-col justify-between transition-all duration-200 z-50 lg:z-30 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarCollapsed ? 'w-64 lg:w-16' : 'w-72 lg:w-64'
        }`}
        aria-label="Customer workspace navigation"
      >
        <div className="p-3 space-y-4">
          {/* Personal Workspace Switcher/Badge */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <EtsyHunterWorkspaceSwitcher
                collapsed={sidebarCollapsed}
                onOpenSettings={() => handleTabSelect('settings')}
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg text-[#8a8f98] hover:text-white hover:bg-[#18181f]"
              aria-label="Close workspace navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action: Search Keywords & Listings */}
          <button
            onClick={onOpenTagAnalyzer}
            className={`w-full py-2 px-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold flex items-center transition-all shadow-[0_0_14px_rgba(94,106,210,0.3)] cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'justify-between'
            }`}
            title="Start Product Research (1 credit / page)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Product Research</span>}
            </div>
            {!sidebarCollapsed && (
              <span className="eh-kbd text-[9px] bg-white/20 border-white/30 text-white">
                ⌘K
              </span>
            )}
          </button>

          {/* Navigation Section */}
          <nav className="space-y-1 pt-2 border-t border-[#22222b]">
            <button
              onClick={() => handleTabSelect('board')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'board'
                  ? 'bg-[#18181f] text-[#f7f8f8] border border-[#282835]'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#121216]'
              } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Columns className="w-4 h-4 text-[#5e6ad2] shrink-0" />
              {!sidebarCollapsed && <span>Research Board</span>}
            </button>

            <button
              onClick={() => handleTabSelect('watchlist')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'watchlist'
                  ? 'bg-[#18181f] text-[#f7f8f8] border border-[#282835]'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#121216]'
              } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-4 h-4 text-[#30a46c] shrink-0" />
                {!sidebarCollapsed && <span>Saved Listings</span>}
              </div>
              {!sidebarCollapsed && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#18181f] text-[#8a8f98]">
                  {savedListings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabSelect('settings')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#18181f] text-[#f7f8f8] border border-[#282835]'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#121216]'
              } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Settings className="w-4 h-4 text-[#f5d90a] shrink-0" />
              {!sidebarCollapsed && <span>Plan &amp; Quotas</span>}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#22222b] space-y-2">
          {/* Return to Public Landing Page */}
          <button
            onClick={onBackToLanding}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#121216] transition-colors cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            {!sidebarCollapsed && <span>Landing Page</span>}
          </button>

          {/* User Profile / Logout */}
          <div
            className={`flex items-center justify-between p-1.5 rounded-lg bg-[#121216] border border-[#22222b] text-xs ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[#5e6ad2] flex items-center justify-center text-white font-bold text-xs shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 truncate">
                  <div className="text-[11px] font-semibold text-[#f7f8f8] truncate">
                    {user?.user_metadata?.full_name || 'Seller'}
                  </div>
                  <div className="text-[9px] text-[#8a8f98] truncate">
                    {user?.email || 'Active Account'}
                  </div>
                </div>
              )}
            </div>

            {!sidebarCollapsed && (
              <button
                onClick={() => void signOut().then(onSignedOut)}
                className="p-1 rounded text-[#575a65] hover:text-[#e5484d] transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. Main Content Workspace */}
      <div className="flex-1 flex flex-col h-dvh min-w-0 overflow-hidden bg-[#0b0b0f]">
        {/* Top Workspace Header & Breadcrumbs */}
        <header className="h-14 px-3 sm:px-6 border-b border-[#22222b] flex items-center justify-between gap-3 bg-[#0e0e13]/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#8a8f98] hover:text-white hover:bg-[#18181f] shrink-0"
              aria-label="Open workspace navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-[#8a8f98]">Workspace</span>
            <ChevronRight className="hidden sm:block w-3.5 h-3.5 text-[#575a65]" />
            <span className="hidden sm:block text-[#f7f8f8] font-medium truncate">
              {workspace?.name || 'Personal Workspace'}
            </span>
            <ChevronRight className="hidden sm:block w-3.5 h-3.5 text-[#575a65]" />
            <span className="text-[#707bfb] font-mono capitalize truncate">
              {activeTab === 'board' ? 'Research Pipeline' : activeTab === 'watchlist' ? 'Saved Listings' : 'Settings'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCommandMenu}
              className="hidden md:flex h-8 items-center gap-2 rounded-lg border border-[#282835] bg-[#121216] px-2.5 text-[11px] text-[#8a8f98] transition-colors hover:border-[#383848] hover:text-white"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Quick search</span>
              <span className="eh-kbd ml-1">⌘K</span>
            </button>

            <button
              onClick={onOpenTagAnalyzer}
              className="px-3 py-1.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_14px_rgba(94,106,210,0.35)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Research Query</span>
            </button>
          </div>
        </header>

        {/* Global Status Banner */}
        <EtsyHunterStatusBanner
          onOpenSettings={() => handleTabSelect('settings')}
          onOpenResearch={onOpenTagAnalyzer}
          onSeedDemoData={onSeedSampleProducts}
          totalListingsCount={products.length}
        />

        {/* Main Tab Rendering Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {savedListingError && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-[#e5484d]/10 border border-[#e5484d]/30 text-xs text-[#e5484d] flex items-center justify-between gap-3">
              <span>{savedListingError}</span>
              <button
                type="button"
                onClick={() => setSavedListingError(null)}
                className="text-[#8a8f98] hover:text-white"
                aria-label="Dismiss saved listing error"
              >
                ×
              </button>
            </div>
          )}
          {activeTab === 'board' && (
            <div className="space-y-6">
              <DashboardPageHeader
                eyebrow="Customer workspace"
                title="Research pipeline"
                description="Organize listing candidates by research stage and compare the signals already attached to this session."
                icon={<Columns className="h-5 w-5" />}
                meta={boardSourceIndicator}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardStatCard
                  label="Board listings"
                  value={products.length}
                  description="Entries currently loaded in this session"
                  icon={<Layers className="h-4 w-4" />}
                  tone="indigo"
                />
                <DashboardStatCard
                  label="Saved to workspace"
                  value={savedListings.length}
                  description="Supabase-backed saved listing records"
                  icon={<Bookmark className="h-4 w-4" />}
                  tone="green"
                />
                <DashboardStatCard
                  label="Avg. opportunity"
                  value={averageOpportunity === null ? '—' : averageOpportunity}
                  description="Modeled score across current board entries"
                  icon={<TrendingUp className="h-4 w-4" />}
                  tone="indigo"
                />
                <DashboardStatCard
                  label="Avg. est. margin"
                  value={averageMargin === null ? '—' : `${averageMargin}%`}
                  description="Estimate across current board entries"
                  icon={<Percent className="h-4 w-4" />}
                  tone="yellow"
                />
              </div>

              <DashboardFilterBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by listing, shop, ID, or tag…"
                ariaLabel="Search research board"
                resultLabel={products.length === 0 ? 'No listings loaded' : `Showing ${filteredProducts.length} of ${products.length} listings`}
              >
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter by category"
                    className="h-9 rounded-lg border border-[#282835] bg-[#18181f] px-2.5 text-xs text-[#f7f8f8] outline-none transition-colors focus:border-[#5e6ad2]"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={competitionFilter}
                    onChange={(e) => setCompetitionFilter(e.target.value)}
                    aria-label="Filter by competition"
                    className="h-9 rounded-lg border border-[#282835] bg-[#18181f] px-2.5 text-xs text-[#f7f8f8] outline-none transition-colors focus:border-[#5e6ad2]"
                  >
                    <option value="all">Any Competition</option>
                    <option value="low">Low Competition</option>
                    <option value="medium">Medium Competition</option>
                    <option value="high">High Competition</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setMinMarginFilter(minMarginFilter === 0 ? 65 : 0)}
                    aria-pressed={minMarginFilter > 0}
                    className={`h-9 rounded-lg border px-2.5 text-xs transition-colors ${
                      minMarginFilter > 0
                        ? 'bg-[#30a46c]/15 border-[#30a46c]/40 text-[#30a46c] font-semibold'
                        : 'bg-[#18181f] border-[#282835] text-[#8a8f98] hover:text-white'
                    }`}
                  >
                    Min Margin &gt; 65%
                  </button>
              </DashboardFilterBar>

              {/* Empty state when new user has zero products */}
              {products.length === 0 ? (
                <DashboardEmptyState
                  title="Your research board is empty"
                  description="Run your first keyword search to evaluate niche opportunities. You can also load explicitly labeled sample listings to explore the board without treating them as marketplace data."
                  icon={<Search className="h-6 w-6" />}
                  action={
                    <button
                      onClick={onOpenTagAnalyzer}
                      className="px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold shadow-[0_0_16px_rgba(94,106,210,0.35)] cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start Research Query</span>
                    </button>
                  }
                  secondaryAction={onSeedSampleProducts ? (
                      <button
                        onClick={onSeedSampleProducts}
                        className="px-4 py-2 rounded-lg bg-[#18181f] hover:bg-[#22222b] border border-[#282835] text-xs text-[#f7f8f8] cursor-pointer"
                      >
                        Load clearly labeled demo listings
                      </button>
                  ) : undefined}
                />
              ) : (
                /* 4 Kanban Columns */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                  {STAGES.map((col) => {
                    const stageItems = filteredProducts.filter((p) => p.stage === col.key);

                    return (
                      <div
                        key={col.key}
                        className="rounded-2xl bg-[#121216] border border-[#22222b] p-3.5 flex flex-col min-h-[460px]"
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between mb-3 px-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: col.color }}
                            />
                            <h3 className="text-xs font-bold text-[#f7f8f8]">{col.title}</h3>
                          </div>
                          <span className="text-[11px] font-mono text-[#575a65] px-2 py-0.5 rounded bg-[#18181f] border border-[#282835]">
                            {stageItems.length}
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="space-y-3 flex-1 overflow-y-auto">
                          {stageItems.map((prod) => (
                            <div
                              key={prod.id}
                              onClick={() => onSelectProduct(prod)}
                              className="group p-3.5 rounded-xl bg-[#18181f] hover:bg-[#1f1f28] border border-[#282835] hover:border-[#383848] transition-all cursor-pointer shadow-sm relative space-y-3"
                            >
                              {/* Header row: ID + Competition Score + Save Listing */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono text-[#707bfb] font-semibold">
                                  {prod.identifier}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {demoProductIds.has(prod.id) && (
                                    <DashboardStatusIndicator label="demo" tone="warning" dot={false} />
                                  )}
                                  <DashboardStatusIndicator
                                    label={`${prod.competition} comp`}
                                    tone={prod.competition === 'low' ? 'success' : prod.competition === 'medium' ? 'warning' : 'danger'}
                                    dot={false}
                                  />

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleSavedListingToggle(prod);
                                    }}
                                    className={`p-1 rounded hover:bg-[#282835] transition-colors ${
                                      isListingSaved(prod.id)
                                        ? 'text-[#5e6ad2]'
                                        : demoProductIds.has(prod.id)
                                        ? 'cursor-not-allowed text-[#3f414a]'
                                        : 'text-[#575a65] hover:text-white'
                                    }`}
                                    title={isListingSaved(prod.id) ? 'Saved' : demoProductIds.has(prod.id) ? 'Demo listings cannot be saved' : 'Save Listing'}
                                    aria-label={isListingSaved(prod.id) ? 'Remove saved listing' : demoProductIds.has(prod.id) ? 'Demo listing cannot be saved' : 'Save listing'}
                                  >
                                    <Bookmark className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Thumbnail and Title */}
                              <div className="flex gap-2.5">
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.title}
                                  className="w-12 h-12 rounded-lg object-cover border border-[#282835] shrink-0"
                                />
                                <div className="min-w-0">
                                  <h4 className="text-xs font-semibold text-[#f7f8f8] line-clamp-2 leading-snug group-hover:text-white">
                                    {prod.title}
                                  </h4>
                                  <div className="text-[10px] text-[#8a8f98] mt-0.5 truncate">
                                    by <span className="text-[#f7f8f8]">{prod.shopName}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Metrics Strip: Observed Price vs Estimated Monthly Revenue */}
                              <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-[#282835]/50 text-[11px]">
                                <div>
                                  <span className="text-[10px] text-[#575a65] block">Observed Price</span>
                                  <span className="font-mono text-[#f7f8f8] font-medium">
                                    ${prod.observedPrice.toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-[#575a65] block">Est. Revenue</span>
                                  <span className="font-mono text-[#30a46c] font-semibold">
                                    ${prod.estimatedMonthlyRevenue.toLocaleString()}/mo
                                  </span>
                                </div>
                              </div>

                              {/* Tags and Margin Bottom Row */}
                              <div className="flex items-center justify-between text-[10px] text-[#8a8f98]">
                                <div className="flex items-center gap-1 font-mono">
                                  <Tag className="w-3 h-3 text-[#5e6ad2]" />
                                  <span>{prod.tags.length} Tags</span>
                                </div>

                                <div className="font-mono text-[#f7f8f8]">
                                  Est. Margin: <span className="text-[#30a46c] font-bold">{prod.estimatedMarginPct}%</span>
                                </div>
                              </div>

                              {/* Quick Stage Mover on hover */}
                              <div className="pt-2 border-t border-[#282835]/40 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">
                                <span className="text-[#575a65]">Move:</span>
                                <div className="flex items-center gap-1">
                                  {STAGES.filter((s) => s.key !== col.key).map((s) => (
                                    <button
                                      key={s.key}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateProductStage(prod.id, s.key);
                                      }}
                                      className="px-1.5 py-0.5 rounded bg-[#22222b] hover:bg-[#5e6ad2] text-[#8a8f98] hover:text-white transition-colors"
                                    >
                                      {s.title.split(' ')[0]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}

                          {stageItems.length === 0 && (
                            <div className="p-8 text-center border border-dashed border-[#282835] rounded-xl text-xs text-[#575a65]">
                              No listings in this stage.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'watchlist' && (
            <EtsyHunterWatchlist
              onOpenTagAnalyzer={onOpenTagAnalyzer}
            />
          )}

          {activeTab === 'settings' && (
            <EtsyHunterWorkspaceSettings onClose={() => handleTabSelect('board')} />
          )}
        </div>
      </div>
    </div>
  );
};
