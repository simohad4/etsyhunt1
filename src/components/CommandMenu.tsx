import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  Command,
  ArrowRight,
  Bookmark,
  Layers,
  BarChart3,
  Users,
  PackageSearch,
  Check,
  X
} from 'lucide-react';
import { NavItem } from './Sidebar';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchKeyword: (keyword: string) => void;
  onNavigateTab: (tab: NavItem) => void;
  onOpenMarginCalc: () => void;
  savedKeywords: string[];
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  onSearchKeyword,
  onNavigateTab,
  onOpenMarginCalc,
  savedKeywords
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  // Suggested trending seeds
  const trendingSearches = [
    'ghost mug',
    'wedding gift',
    'retro nurse sweatshirt',
    'leather keychain',
    'bachelorette party favor',
    'birth flower jewelry'
  ];

  // Actions list
  const actions = [
    {
      id: 'dashboard',
      type: 'action',
      label: 'Go to Dashboard',
      detail: 'KPI overview, market maturity & summary pulse',
      icon: BarChart3,
      run: () => onNavigateTab('dashboard')
    },
    {
      id: 'research',
      type: 'action',
      label: 'Go to Market Research',
      detail: 'Live cart tracking, 24h orders & competitor table',
      icon: PackageSearch,
      run: () => onNavigateTab('research')
    },
    {
      id: 'ideas',
      type: 'action',
      label: 'Go to AI Product Ideas',
      detail: 'High-margin POD concepts & ready-to-copy tags',
      icon: Sparkles,
      run: () => onNavigateTab('ideas')
    },
    {
      id: 'watchlist',
      type: 'action',
      label: 'Go to Competitor Watchlist',
      detail: 'View tracked listings and real-time carts',
      icon: Bookmark,
      run: () => onNavigateTab('watchlist')
    },
    {
      id: 'saved-searches',
      type: 'action',
      label: 'Go to Saved Searches',
      detail: 'Access previously analyzed niche keywords',
      icon: Search,
      run: () => onNavigateTab('saved-searches')
    },
    {
      id: 'reports',
      type: 'action',
      label: 'Go to Reports & Dossier',
      detail: 'Executive briefing dossier & full data export',
      icon: BarChart3,
      run: () => onNavigateTab('reports')
    },
    {
      id: 'margin-calc',
      type: 'action',
      label: 'Open Unit Margin Simulator',
      detail: 'Simulate Etsy fees, COGS, and profit margin',
      icon: Layers,
      run: onOpenMarginCalc
    }
  ];

  // Filter items based on query
  const matchingKeywords = query.trim()
    ? [
        query.trim(),
        ...trendingSearches.filter((s) => s.toLowerCase().includes(query.toLowerCase())),
        ...savedKeywords.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
      ]
    : trendingSearches;

  // Deduplicate
  const uniqueKeywords = Array.from(new Set(matchingKeywords)).slice(0, 6);

  const filteredActions = query.trim()
    ? actions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.detail.toLowerCase().includes(query.toLowerCase())
      )
    : actions;

  // Total selectable items
  const totalItems = uniqueKeywords.length + filteredActions.length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < uniqueKeywords.length) {
          const kw = uniqueKeywords[selectedIndex];
          onSearchKeyword(kw);
          onClose();
        } else {
          const action = filteredActions[selectedIndex - uniqueKeywords.length];
          if (action) {
            action.run();
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, uniqueKeywords, filteredActions, totalItems, onClose, onSearchKeyword]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl rounded-xl bg-[#0D0E12] border border-white/[0.1] shadow-[0_16px_70px_rgba(0,0,0,0.8)] overflow-hidden text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing subtle top border accent */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

        {/* Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a product niche, keyword, or command..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
              <span className="eh-kbd">ESC</span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-4">
          {/* Keyword Suggestions */}
          {uniqueKeywords.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
                Live Cart Radar Searches
              </div>
              <div className="mt-1 space-y-0.5">
                {uniqueKeywords.map((kw, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={kw}
                      onClick={() => {
                        onSearchKeyword(kw);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20'
                          : 'text-zinc-300 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isSelected ? 'bg-orange-400 shadow-[0_0_8px_#F97316]' : 'bg-zinc-600'
                          }`}
                        />
                        <span className="truncate font-medium">{kw}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 shrink-0 font-mono">
                        <span>Search radar</span>
                        <ArrowRight className="w-3 h-3 text-zinc-500" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
                Quick Navigation &amp; Tools
              </div>
              <div className="mt-1 space-y-0.5">
                {filteredActions.map((act, actIdx) => {
                  const itemIndex = uniqueKeywords.length + actIdx;
                  const isSelected = selectedIndex === itemIndex;
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={() => {
                        act.run();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-white/[0.08] text-white border border-white/[0.12]'
                          : 'text-zinc-300 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-orange-400' : 'text-zinc-400'}`} />
                        <div>
                          <div className="font-medium text-zinc-200">{act.label}</div>
                          <div className="text-[10px] text-zinc-500">{act.detail}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">↵ Enter</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {totalItems === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">
              No matching commands or keywords found.
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3.5 py-2 border-t border-white/[0.05] bg-[#090A0D] flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="eh-kbd">↑</span>
              <span className="eh-kbd">↓</span>
              <span className="text-[10px]">to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="eh-kbd">↵</span>
              <span className="text-[10px]">to select</span>
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-600">Etsy Hunter AI CMD Menu</span>
        </div>
      </div>
    </div>
  );
};
