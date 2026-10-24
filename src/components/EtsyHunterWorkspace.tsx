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
  Tag,
  Layers,
  Menu,
  X,
  LayoutDashboard,
  History,
  CreditCard,
  UserCog,
  ArrowRight,
  Activity
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
  DashboardSectionCard,
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
  activeView?: 'board' | 'research' | 'saved' | 'history' | 'plan' | 'settings';
  onViewChange?: (view: 'board' | 'research' | 'saved' | 'history' | 'plan' | 'settings') => void;
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
  activeView: externalActiveView,
  onViewChange,
  onSeedSampleProducts,
  onSignedOut
}) => {
  const { user, workspace, savedListings, searchHistory, isListingSaved, saveListing, removeSavedListing, signOut } = useAuth();

  const [internalActiveView, setInternalActiveView] = useState<'board' | 'research' | 'saved' | 'history' | 'plan' | 'settings'>('board');
  const activeView = externalActiveView !== undefined ? externalActiveView : internalActiveView;
  const [sidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleViewSelect = (view: 'board' | 'research' | 'saved' | 'history' | 'plan' | 'settings') => {
    setMobileSidebarOpen(false);
    if (onViewChange) onViewChange(view);
    else setInternalActiveView(view);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [minMarginFilter, setMinMarginFilter] = useState<number>(0);
  const [savedListingError, setSavedListingError] = useState<string | null>(null);

  const handleSavedListingToggle = async (product: EtsyProductItem) => {
    setSavedListingError(null);
    if (isListingSaved(product.id)) {
      const result = await removeSavedListing(product.id);
      if (!result.success) {
        setSavedListingError(result.error || 'Unable to remove this saved listing right now.');
      }
      return;
    }

    if (demoProductIds.has(product.id)) {
      setSavedListingError('Demo listings are for interface exploration and cannot be saved to your account.');
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
  const boardSourceIndicator = boardDataSource === 'demo'
    ? <DashboardStatusIndicator label="Demo data" tone="warning" title="These are sample listings loaded for product exploration." />
    : boardDataSource === 'mixed'
      ? <DashboardStatusIndicator label="Mixed session + demo" tone="warning" title="This board contains both sample listings and entries added during this session." />
      : boardDataSource === 'empty'
        ? <DashboardStatusIndicator label="No board data" tone="neutral" title="No listing records are loaded on this board." />
        : <DashboardStatusIndicator label="Session data" tone="info" title="Research board entries are kept only for this signed-in session." />;

  const navigation = [
    { id: 'board', label: 'Overview', icon: LayoutDashboard },
    { id: 'research', label: 'Research', icon: Search },
    { id: 'saved', label: 'Saved Listings', icon: Bookmark, count: savedListings.length },
    { id: 'history', label: 'History', icon: History },
    { id: 'plan', label: 'Plan & Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: UserCog }
  ] as const;
  const activeViewLabel = navigation.find((item) => item.id === activeView)?.label ?? 'Overview';

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#0c0c0e] text-[#f4f4f5]">
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
        className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col justify-between border-r border-[#24242b] bg-[#0f0f12] transition-transform duration-200 lg:static lg:z-30 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarCollapsed ? 'w-64 lg:w-16' : 'w-72 lg:w-60'
        }`}
        aria-label="Customer workspace navigation"
      >
        <div className="p-3 space-y-4">
          {/* Personal Workspace Switcher/Badge */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <EtsyHunterWorkspaceSwitcher
                collapsed={sidebarCollapsed}
                onOpenSettings={() => handleViewSelect('settings')}
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
            className={`flex w-full items-center rounded-md border border-[#7478e6]/60 bg-[#686cdf] px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#7478e6] ${
              sidebarCollapsed ? 'justify-center px-0' : 'justify-between'
            }`}
            title="Open the disabled research preview"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>New research</span>}
            </div>
            {!sidebarCollapsed && (
              <span className="eh-kbd text-[9px] bg-white/20 border-white/30 text-white">
                ⌘K
              </span>
            )}
          </button>

          <nav className="space-y-0.5 border-t border-[#24242b] pt-3" aria-label="Customer pages">
            {!sidebarCollapsed && <div className="px-2.5 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#5f5f69]">Workspace</div>}
            {navigation.map((item) => {
              const Icon = item.icon;
              const selected = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleViewSelect(item.id)}
                  aria-current={selected ? 'page' : undefined}
                  className={`group flex w-full items-center rounded-md border px-2.5 py-2 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-[#30303a] bg-[#1a1a20] text-[#f4f4f5]'
                      : 'border-transparent text-[#91919b] hover:bg-[#15151a] hover:text-[#e4e4e7]'
                  } ${sidebarCollapsed ? 'justify-center px-0' : 'justify-between'}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-[#9699f4]' : 'text-[#666670] group-hover:text-[#a1a1aa]'}`} />
                    {!sidebarCollapsed && item.label}
                  </span>
                  {!sidebarCollapsed && 'count' in item && (
                    <span className="rounded bg-[#24242b] px-1.5 py-0.5 text-[9px] tabular-nums text-[#91919b]">{item.count}</span>
                  )}
                </button>
              );
            })}
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
      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-[#0c0c0e]">
        {/* Top Workspace Header & Breadcrumbs */}
        <header className="flex h-13 shrink-0 items-center justify-between gap-3 border-b border-[#24242b] bg-[#101014] px-3 sm:px-6">
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
              {activeViewLabel}
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
              className="flex h-8 items-center gap-1.5 rounded-md bg-[#686cdf] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#7478e6]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New research</span>
            </button>
          </div>
        </header>

        {/* Global Status Banner */}
        <EtsyHunterStatusBanner
          onOpenSettings={() => handleViewSelect('plan')}
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
          {activeView === 'board' && (
            <div className="mx-auto max-w-6xl space-y-5 pb-10">
              <DashboardPageHeader
                eyebrow="Workspace"
                title={`Welcome back${user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}`}
                description="A clear view of your account usage, saved research, and recent activity."
                icon={<LayoutDashboard className="h-5 w-5" />}
                meta={<DashboardStatusIndicator label={workspace?.plan === 'none' ? 'No active plan' : `${workspace?.plan} plan`} tone={workspace?.plan === 'none' ? 'neutral' : 'info'} />}
                actions={
                  <button type="button" onClick={() => handleViewSelect('research')} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#686cdf] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#7478e6]">
                    Open research <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                }
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardStatCard label="Research credits" value={`${workspace?.creditsRemaining ?? 0} / ${workspace?.totalCredits ?? 0}`} description="Available with the current subscription" icon={<Zap className="h-4 w-4" />} tone="indigo" />
                <DashboardStatCard label="Saved listings" value={workspace?.savedListingsCount ?? 0} description={`${workspace?.maxSavedListings ?? 0} account slots total`} icon={<Bookmark className="h-4 w-4" />} tone="green" />
                <DashboardStatCard label="Completed research" value={searchHistory.length} description="Recorded in account history" icon={<History className="h-4 w-4" />} tone="neutral" />
                <DashboardStatCard label="Current plan" value={workspace?.plan === 'none' ? 'None' : workspace?.plan ?? 'None'} description={workspace?.plan === 'none' ? 'Research credits remain unavailable' : 'Subscription status is active'} icon={<CreditCard className="h-4 w-4" />} tone="yellow" />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                <DashboardSectionCard
                  title="Recent activity"
                  description="Completed research recorded for this account."
                  icon={<Activity className="h-4 w-4" />}
                  action={<button type="button" onClick={() => handleViewSelect('history')} className="text-xs font-medium text-[#9da0ff] hover:text-white">View history</button>}
                  bodyClassName={searchHistory.length > 0 ? 'p-0' : 'p-4'}
                >
                  {searchHistory.length > 0 ? (
                    <div className="divide-y divide-[#24242b]">
                      {searchHistory.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                          <div className="min-w-0"><div className="truncate text-xs font-medium text-[#f4f4f5]">{item.keyword}</div><div className="mt-0.5 text-[10px] text-[#70707a]">{item.timestamp}</div></div>
                          <div className="shrink-0 text-right text-[11px] text-[#91919b]">{item.listingsFound} listings</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState title="No recent research" description="Completed research will appear here when real results are recorded." icon={<History className="h-5 w-5" />} />
                  )}
                </DashboardSectionCard>

                <DashboardSectionCard title="Service status" description="Current account availability." icon={<Layers className="h-4 w-4" />} bodyClassName="space-y-3 p-4">
                  <StatusRow label="Account access" value="Active" tone="success" />
                  <StatusRow label="Live research" value="Paused" tone="warning" />
                  <StatusRow label="Saved listing storage" value={workspace && workspace.maxSavedListings > 0 ? 'Available' : 'Unavailable'} tone={workspace && workspace.maxSavedListings > 0 ? 'success' : 'neutral'} />
                  <p className="border-t border-[#24242b] pt-3 text-[11px] leading-4 text-[#70707a]">Usage values reflect this account. Demo listings remain clearly labeled and separate.</p>
                </DashboardSectionCard>
              </div>
            </div>
          )}

          {activeView === 'research' && (
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
                  label="Research credits"
                  value={`${workspace?.creditsRemaining ?? 0} / ${workspace?.totalCredits ?? 0}`}
                  description="Available with the current subscription"
                  icon={<Zap className="h-4 w-4" />}
                  tone="indigo"
                />
                <DashboardStatCard
                  label="Saved to workspace"
                  value={`${workspace?.savedListingsCount ?? 0} / ${workspace?.maxSavedListings ?? 0}`}
                  description="Authoritative saved-listing usage and quota"
                  icon={<Bookmark className="h-4 w-4" />}
                  tone="green"
                />
                <DashboardStatCard
                  label="Active plan"
                  value={workspace?.plan === 'none' ? 'None' : workspace?.plan ?? 'None'}
                  description="Current account subscription status"
                  icon={<Layers className="h-4 w-4" />}
                  tone="neutral"
                />
                <DashboardStatCard
                  label="Session board entries"
                  value={products.length}
                  description={boardDataSource === 'demo' ? 'Explicitly labeled demo entries' : boardDataSource === 'mixed' ? 'Mixed demo and session entries' : 'Kept only for this session'}
                  icon={<Columns className="h-4 w-4" />}
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
                  description="Live research is paused, so no live results can populate this board. Load clearly labeled demo listings to explore the interface without treating them as marketplace data."
                  icon={<Search className="h-6 w-6" />}
                  action={
                    <button
                      onClick={onOpenTagAnalyzer}
                      className="flex items-center gap-1.5 rounded-md bg-[#686cdf] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#7478e6]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>View Research Preview</span>
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
                        className="flex min-h-[420px] flex-col rounded-lg border border-[#24242b] bg-[#131317] p-3.5"
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
                            <article
                              key={prod.id}
                              className="group relative space-y-3 rounded-lg border border-[#292931] bg-[#18181d] p-3.5 transition-colors hover:border-[#3a3a45] hover:bg-[#1c1c22]"
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

                              <button
                                type="button"
                                onClick={() => onSelectProduct(prod)}
                                className="flex w-full gap-2.5 rounded-md text-left"
                                aria-label={`Open details for ${prod.title}`}
                              >
                                <img src={prod.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md border border-[#292931] object-cover" />
                                <span className="min-w-0">
                                  <span className="line-clamp-2 text-xs font-semibold leading-snug text-[#f4f4f5] group-hover:text-white">{prod.title}</span>
                                  <span className="mt-0.5 block truncate text-[10px] text-[#91919b]">by <span className="text-[#d7d7dc]">{prod.shopName}</span></span>
                                </span>
                              </button>

                              {/* Metrics Strip: Observed Price vs Estimated Monthly Revenue */}
                              <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-[#282835]/50 text-[11px]">
                                <div>
                                  <span className="text-[10px] text-[#575a65] block">
                                    {demoProductIds.has(prod.id) ? 'Sample Price' : 'Observed Price'}
                                  </span>
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
                              <div className="flex items-center justify-between border-t border-[#292931] pt-2 text-[10px] opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
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
                            </article>
                          ))}

                          {stageItems.length === 0 && (
                            <div className="rounded-md border border-dashed border-[#303039] p-8 text-center text-xs text-[#70707a]">
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

          {activeView === 'saved' && (
            <EtsyHunterWatchlist
              onOpenTagAnalyzer={onOpenTagAnalyzer}
            />
          )}

          {(activeView === 'history' || activeView === 'plan' || activeView === 'settings') && (
            <EtsyHunterWorkspaceSettings section={activeView} />
          )}
        </div>
      </div>
    </div>
  );
};

function StatusRow({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'success' | 'warning';
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#24242b] bg-[#101014] px-3 py-2.5">
      <span className="text-xs text-[#a1a1aa]">{label}</span>
      <DashboardStatusIndicator label={value} tone={tone} />
    </div>
  );
}
