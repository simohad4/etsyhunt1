import React, { useState } from 'react';
import {
  Columns,
  List as ListIcon,
  Search,
  Plus,
  ChevronRight,
  Bookmark,
  Zap,
  LogOut,
  ArrowLeft,
  Settings,
  Sparkles,
  Filter,
  DollarSign,
  Tag,
  TrendingUp,
  Percent,
  Layers,
  ExternalLink,
  RotateCw,
  X,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal
} from 'lucide-react';
import { EtsyProductItem, ResearchStage, CompetitionLevel } from '../types/etsyHunter';
import { EtsyHunterWorkspaceSwitcher } from './EtsyHunterWorkspaceSwitcher';
import { EtsyHunterWatchlist } from './EtsyHunterWatchlist';
import { EtsyHunterWorkspaceSettings } from './EtsyHunterWorkspaceSettings';
import { EtsyHunterStatusBanner } from './EtsyHunterStatusBanner';
import { useAuth } from '../context/AuthContext';

interface EtsyHunterWorkspaceProps {
  onBackToLanding: () => void;
  onOpenTagAnalyzer: () => void;
  onOpenCommandMenu: () => void;
  onSelectProduct: (product: EtsyProductItem) => void;
  products: EtsyProductItem[];
  onUpdateProductStage: (id: string, newStage: ResearchStage) => void;
  activeTab?: 'board' | 'watchlist' | 'settings';
  onTabChange?: (tab: 'board' | 'watchlist' | 'settings') => void;
  onSeedSampleProducts?: () => void;
}

export const EtsyHunterWorkspace: React.FC<EtsyHunterWorkspaceProps> = ({
  onBackToLanding,
  onOpenTagAnalyzer,
  onOpenCommandMenu,
  onSelectProduct,
  products,
  onUpdateProductStage,
  activeTab: externalActiveTab,
  onTabChange,
  onSeedSampleProducts
}) => {
  const { user, activeWorkspace, watchlist, toggleWatchlist, isInWatchlist, signOut } = useAuth();

  const [internalActiveTab, setInternalActiveTab] = useState<'board' | 'watchlist' | 'settings'>('board');
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;

  const handleTabSelect = (tab: 'board' | 'watchlist' | 'settings') => {
    if (onTabChange) onTabChange(tab);
    else setInternalActiveTab(tab);
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [minMarginFilter, setMinMarginFilter] = useState<number>(0);

  // Group columns for Kanban board
  const STAGES: { key: ResearchStage; title: string; color: string }[] = [
    { key: 'trending', title: 'Trending Ideas', color: '#5e6ad2' },
    { key: 'high_potential', title: 'High Potential', color: '#30a46c' },
    { key: 'optimized', title: 'Optimized Listings', color: '#f5d90a' },
    { key: 'tracked', title: 'Tracked / Watchlist', color: '#8a8f98' }
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

  return (
    <div className="flex h-screen w-full bg-[#0b0b0f] text-[#f7f8f8] overflow-hidden">
      {/* 1. Left Minimalist Sidebar */}
      <aside
        className={`shrink-0 border-r border-[#22222b] bg-[#0b0b0f] flex flex-col justify-between transition-all duration-200 z-30 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="p-3 space-y-4">
          {/* Workspace Switcher Component */}
          <EtsyHunterWorkspaceSwitcher
            collapsed={sidebarCollapsed}
            onOpenSettings={() => handleTabSelect('settings')}
          />

          {/* Quick Action: Analyze Tags */}
          <button
            onClick={onOpenTagAnalyzer}
            className={`w-full py-2 px-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold flex items-center transition-all shadow-[0_0_14px_rgba(94,106,210,0.3)] cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'justify-between'
            }`}
            title="Scan & Analyze 13 Tags (C)"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>13-Tag Analyzer</span>}
            </div>
            {!sidebarCollapsed && (
              <span className="eh-kbd text-[9px] bg-white/20 border-white/30 text-white">
                C
              </span>
            )}
          </button>

          {/* Search trigger inside sidebar */}
          <button
            onClick={onOpenCommandMenu}
            className={`w-full py-1.5 px-2.5 rounded-lg bg-[#121216] border border-[#22222b] hover:border-[#383848] text-xs text-[#8a8f98] hover:text-[#f7f8f8] flex items-center transition-colors cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              {!sidebarCollapsed && <span>Quick Search</span>}
            </div>
            {!sidebarCollapsed && <span className="eh-kbd text-[9px]">⌘K</span>}
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
              {!sidebarCollapsed && <span>Product Pipeline</span>}
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
                {!sidebarCollapsed && <span>Radar Watchlist</span>}
              </div>
              {!sidebarCollapsed && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#18181f] text-[#8a8f98]">
                  {watchlist.length}
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
              {!sidebarCollapsed && <span>Shop Settings</span>}
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
              <img
                src={
                  user?.user_metadata?.avatar_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                }
                alt="User Avatar"
                className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-[#5e6ad2]"
              />
              {!sidebarCollapsed && (
                <div className="min-w-0 truncate">
                  <div className="text-[11px] font-semibold text-[#f7f8f8] truncate">
                    {user?.user_metadata?.full_name || 'Elena Rostova'}
                  </div>
                  <div className="text-[9px] text-[#8a8f98] truncate">
                    {user?.email || 'elena.rostova@etsyhunter.ai'}
                  </div>
                </div>
              )}
            </div>

            {!sidebarCollapsed && (
              <button
                onClick={() => signOut()}
                className="p-1 rounded text-[#575a65] hover:text-[#e5484d] transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. Main Content Workspace */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-[#0b0b0f]">
        {/* Top Workspace Header & Breadcrumbs */}
        <header className="h-14 px-6 border-b border-[#22222b] flex items-center justify-between gap-4 bg-[#0e0e13]/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8a8f98]">Shops</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#575a65]" />
            <span className="text-[#f7f8f8] font-medium">
              {activeWorkspace?.name || 'AuraCraft Studios'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#575a65]" />
            <span className="text-[#707bfb] font-mono capitalize">
              {activeTab === 'board' ? 'Niche Pipeline' : activeTab === 'watchlist' ? 'Radar Watchlist' : 'Settings'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products, shops, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-64 pl-8 pr-3 py-1.5 rounded-lg bg-[#121216] border border-[#22222b] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2]"
              />
              <Search className="w-3.5 h-3.5 text-[#575a65] absolute left-2.5 top-2" />
            </div>

            <button
              onClick={onOpenTagAnalyzer}
              className="px-3 py-1.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_14px_rgba(94,106,210,0.35)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Niche Scan</span>
            </button>
          </div>
        </header>

        {/* Global Status Banner (Quotas, live tips, seed data) */}
        <EtsyHunterStatusBanner
          onOpenSettings={() => handleTabSelect('settings')}
          onOpenTagAnalyzer={onOpenTagAnalyzer}
          onSeedSampleProducts={onSeedSampleProducts}
          totalProductsCount={products.length}
        />

        {/* Main Tab Rendering Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'board' && (
            <div className="space-y-6">
              {/* Secondary Filter Strip for Board */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#121216] border border-[#22222b] text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[#8a8f98] font-mono text-[11px] uppercase mr-1">
                    Filters:
                  </span>

                  {/* Category Dropdown */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1 rounded bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {/* Competition Dropdown */}
                  <select
                    value={competitionFilter}
                    onChange={(e) => setCompetitionFilter(e.target.value)}
                    className="px-2.5 py-1 rounded bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] focus:outline-none cursor-pointer"
                  >
                    <option value="all">Any Competition</option>
                    <option value="low">Low Competition</option>
                    <option value="medium">Medium Competition</option>
                    <option value="high">High Competition</option>
                  </select>

                  {/* Min Margin Selector */}
                  <button
                    onClick={() => setMinMarginFilter(minMarginFilter === 0 ? 65 : 0)}
                    className={`px-2.5 py-1 rounded border text-xs transition-colors cursor-pointer ${
                      minMarginFilter > 0
                        ? 'bg-[#30a46c]/15 border-[#30a46c]/40 text-[#30a46c] font-semibold'
                        : 'bg-[#18181f] border-[#282835] text-[#8a8f98] hover:text-white'
                    }`}
                  >
                    Min Margin &gt; 65%
                  </button>
                </div>

                <div className="text-[11px] font-mono text-[#575a65]">
                  Showing {filteredProducts.length} of {products.length} products
                </div>
              </div>

              {/* 4 Kanban Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                {STAGES.map((col) => {
                  const stageItems = filteredProducts.filter((p) => p.stage === col.key);

                  return (
                    <div
                      key={col.key}
                      className="rounded-2xl bg-[#121216] border border-[#22222b] p-3.5 flex flex-col min-h-[500px]"
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
                            {/* Header row: ID + Competition Score + Bookmark */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-[#707bfb] font-semibold">
                                {prod.identifier}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-1.5 py-0.2 rounded font-mono uppercase text-[9px] font-semibold border ${
                                    prod.competition === 'low'
                                      ? 'bg-[#299764]/10 text-[#30a46c] border-[#299764]/30'
                                      : prod.competition === 'medium'
                                      ? 'bg-[#f5d90a]/10 text-[#f5d90a] border-[#f5d90a]/30'
                                      : 'bg-[#e5484d]/10 text-[#e5484d] border-[#e5484d]/30'
                                  }`}
                                >
                                  {prod.competition} Comp
                                </span>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWatchlist(prod);
                                  }}
                                  className={`p-1 rounded hover:bg-[#282835] transition-colors ${
                                    isInWatchlist(prod.id)
                                      ? 'text-[#5e6ad2]'
                                      : 'text-[#575a65] hover:text-white'
                                  }`}
                                  title="Pin to Watchlist"
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

                            {/* Metrics Strip */}
                            <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-[#282835]/50 text-[11px]">
                              <div>
                                <span className="text-[10px] text-[#575a65] block">Est. Revenue</span>
                                <span className="font-mono text-[#30a46c] font-semibold">
                                  ${prod.estimatedMonthlyRevenue.toLocaleString()}/mo
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-[#575a65] block">Cart Momentum</span>
                                <span className="font-mono text-[#f7f8f8]">
                                  {prod.inCartCount} in carts
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
                                Margin: <span className="text-[#30a46c] font-bold">{prod.estimatedMarginPct}%</span>
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
                            No products in this stage.
                          </div>
                        )}
                      </div>

                      {/* Add listing trigger */}
                      <button
                        onClick={onOpenTagAnalyzer}
                        className="mt-3 w-full py-2 rounded-lg border border-dashed border-[#282835] hover:border-[#383848] text-xs text-[#8a8f98] hover:text-[#f7f8f8] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Scan listing into {col.title}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'watchlist' && (
            <EtsyHunterWatchlist
              onSelectProduct={onSelectProduct}
              onOpenTagAnalyzer={onOpenTagAnalyzer}
              allProducts={products}
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
