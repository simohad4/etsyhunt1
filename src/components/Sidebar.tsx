import React from 'react';
import {
  LayoutDashboard,
  Search,
  Lightbulb,
  Bookmark,
  Clock,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Command,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Percent,
  Layers
} from 'lucide-react';

export type NavItem =
  | 'dashboard'
  | 'research'
  | 'ideas'
  | 'watchlist'
  | 'saved-searches'
  | 'reports'
  | 'settings'
  // Backward compatibility aliases
  | 'product-research'
  | 'market-overview'
  | 'ai-blueprints'
  | 'competitor-spy'
  | 'keyword-mining'
  | 'profit-calc';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  creditsRemaining?: number;
  totalCredits?: number;
  watchlistCount?: number;
  onOpenUpgrade?: () => void;
  onGoToLanding?: () => void;
  onOpenCommandMenu?: () => void;
  onOpenMarginCalc?: () => void;
}

interface NavMenuItem {
  id: NavItem;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  count?: number;
  shortcut?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  creditsRemaining = 450,
  totalCredits = 500,
  watchlistCount = 0,
  onOpenUpgrade,
  onGoToLanding,
  onOpenCommandMenu,
  onOpenMarginCalc
}) => {
  // Normalize tab for selection highlights
  const activeNormalizedTab: NavItem =
    currentTab === 'product-research' || currentTab === 'competitor-spy' || currentTab === 'keyword-mining'
      ? 'research'
      : currentTab === 'market-overview'
      ? 'dashboard'
      : currentTab === 'ai-blueprints'
      ? 'ideas'
      : currentTab;

  const coreNav: NavMenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      shortcut: 'G D'
    },
    {
      id: 'research',
      label: 'Market Research',
      icon: Search,
      shortcut: 'G R'
    },
    {
      id: 'ideas',
      label: 'AI Product Ideas',
      icon: Lightbulb,
      badge: 'AI',
      shortcut: 'G I'
    },
    {
      id: 'watchlist',
      label: 'Watchlist',
      icon: Bookmark,
      count: watchlistCount,
      shortcut: 'G W'
    },
    {
      id: 'saved-searches',
      label: 'Saved Searches',
      icon: Clock,
      shortcut: 'G S'
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: FileText,
      shortcut: 'G E'
    }
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-200 ease-in-out flex flex-col bg-[#090A0F] border-r border-white/[0.07] ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-white/[0.06] bg-[#090A0F]/90 backdrop-blur-md">
        <div
          onClick={onGoToLanding}
          className="flex items-center gap-2.5 overflow-hidden cursor-pointer select-none group"
          title="Return to Public Overview"
        >
          <div className="w-7 h-7 rounded-lg bg-[#14151C] border border-white/[0.1] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.18)] group-hover:border-orange-500/50 transition-colors">
            <svg
              className="w-4 h-4 text-orange-400 transition-transform group-hover:scale-105"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-semibold text-xs tracking-tight text-zinc-100">
                Etsy<span className="text-orange-400">Hunter</span>
              </span>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
                AI
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Quick Command Finder Button (Etsy Hunter-style Cmd+K) */}
      {!isCollapsed && onOpenCommandMenu && (
        <div className="px-3 pt-3">
          <button
            onClick={onOpenCommandMenu}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#111218] hover:bg-[#161822] border border-white/[0.08] hover:border-white/[0.15] text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-orange-400 transition-colors" />
              <span className="text-[11px] font-normal">Quick search...</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-400 bg-white/[0.05] border border-white/[0.08] px-1.5 py-0.5 rounded">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </button>
        </div>
      )}

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Core Workspace Sections */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Workspace
            </div>
          )}

          {coreNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeNormalizedTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-[#181A24] text-white shadow-sm border border-white/[0.08]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#12131A]'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-orange-400 rounded-r shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
                )}

                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-orange-400' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                />

                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">{item.label}</span>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
                          {item.badge}
                        </span>
                      )}

                      {typeof item.count === 'number' && item.count > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300">
                          {item.count}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Tools */}
        {onOpenMarginCalc && !isCollapsed && (
          <div className="space-y-1 pt-2 border-t border-white/[0.05]">
            <div className="px-2.5 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Simulators
            </div>
            <button
              onClick={onOpenMarginCalc}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-[#12131A] transition-colors cursor-pointer group"
            >
              <Percent className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <span>Margin Simulator</span>
                <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  PROFIT
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Footer / Account & Usage */}
      <div className="p-3 border-t border-white/[0.06] bg-[#090A0F] space-y-2">
        {/* Credits remaining mini bar */}
        {!isCollapsed ? (
          <div className="rounded-lg bg-[#111218] border border-white/[0.06] p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
                Analysis Quota
              </span>
              <span className="font-mono text-zinc-300 font-medium text-[10px]">
                {creditsRemaining} / {totalCredits}
              </span>
            </div>

            <div className="w-full bg-white/[0.06] h-1 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${(creditsRemaining / totalCredits) * 100}%` }}
              />
            </div>

            {onOpenUpgrade && (
              <button
                onClick={onOpenUpgrade}
                className="w-full flex items-center justify-between pt-1 text-[11px] text-orange-400 hover:text-orange-300 font-medium transition-colors cursor-pointer group"
              >
                <span>Upgrade to Pro</span>
                <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>
        ) : (
          <div
            onClick={onOpenUpgrade}
            className="w-8 h-8 mx-auto rounded-lg bg-[#12131A] border border-white/[0.08] flex items-center justify-center cursor-pointer hover:border-orange-500/30 transition-colors"
            title="Analysis Quota"
          >
            <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
          </div>
        )}

        {/* Settings button */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#12131A] transition-colors cursor-pointer ${
            activeNormalizedTab === 'settings' ? 'bg-[#181A24] text-white' : ''
          }`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="w-4 h-4 shrink-0 text-zinc-400" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
};
