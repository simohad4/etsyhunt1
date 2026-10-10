import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  ChevronDown,
  X,
  Sparkles,
  Command
} from 'lucide-react';

interface FilterBarProps {
  keyword: string;
  onChangeKeyword: (val: string) => void;
  onSearch: (val: string) => void;
  isLoading: boolean;
  minPriceFilter: string;
  maxPriceFilter: string;
  minCartsFilter: string;
  onChangeMinPrice: (val: string) => void;
  onChangeMaxPrice: (val: string) => void;
  onChangeMinCarts: (val: string) => void;
  bestsellerOnly: boolean;
  onToggleBestseller: () => void;
  categoryFilter: string;
  onChangeCategory: (val: string) => void;
  onResetFilters: () => void;
  onOpenCommandMenu?: () => void;
}

const PRESET_QUERIES = [
  'ghost mug',
  'wedding gift',
  'retro nurse sweatshirt',
  'leather keychain',
  'bachelorette party favor',
  'birth flower jewelry'
];

export const SellerSpriteFilterBar: React.FC<FilterBarProps> = ({
  keyword,
  onChangeKeyword,
  onSearch,
  isLoading,
  minPriceFilter,
  maxPriceFilter,
  minCartsFilter,
  onChangeMinPrice,
  onChangeMaxPrice,
  onChangeMinCarts,
  bestsellerOnly,
  onToggleBestseller,
  categoryFilter,
  onChangeCategory,
  onResetFilters,
  onOpenCommandMenu
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const categories = [
    'All Categories',
    'Clothing & POD Apparel',
    'Home Decor & Drinkware',
    'Jewelry & Accessories',
    'Weddings & Party Favors',
    'Paper & Craft Supplies'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keyword);
  };

  const hasActiveFilters =
    minPriceFilter || maxPriceFilter || minCartsFilter || bestsellerOnly || categoryFilter !== 'All Categories';

  return (
    <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-3.5 sm:p-4 shadow-sm space-y-3">
      {/* Search Bar Row (Etsy Hunter Input Style) */}
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row items-stretch gap-2.5">
        {/* Category Dropdown */}
        <div className="relative shrink-0 min-w-[170px]">
          <select
            value={categoryFilter}
            onChange={(e) => onChangeCategory(e.target.value)}
            className="w-full h-10 bg-[#12131A] border border-white/[0.08] hover:border-white/[0.14] rounded-lg px-3 text-xs font-medium text-zinc-200 focus:outline-none focus:border-orange-500/50 appearance-none cursor-pointer transition-colors"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="bg-[#12131A] text-zinc-200">
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Keyword Search Input */}
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => onChangeKeyword(e.target.value)}
            placeholder="Search Etsy keywords, niches, or product types (e.g. ghost mug, wedding gift)..."
            className="w-full h-10 pl-10 pr-24 bg-[#12131A] border border-white/[0.08] hover:border-white/[0.14] focus:border-orange-500/50 rounded-lg text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
            disabled={isLoading}
          />
          {keyword && !isLoading && (
            <button
              type="button"
              onClick={() => onChangeKeyword('')}
              className="absolute right-12 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Cmd Shortcut Indicator */}
          {onOpenCommandMenu && (
            <button
              type="button"
              onClick={onOpenCommandMenu}
              className="absolute right-3 hidden sm:flex items-center gap-0.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              title="Open command palette"
            >
              <span className="eh-kbd">⌘K</span>
            </button>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showAdvancedFilters || hasActiveFilters
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : 'bg-[#12131A] border-white/[0.08] hover:border-white/[0.15] text-zinc-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_#F97316]" />
            )}
          </button>

          <button
            type="submit"
            disabled={isLoading || !keyword.trim()}
            className="h-10 px-4 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-[0_0_14px_rgba(249,115,22,0.25)] transition-all cursor-pointer min-w-[110px]"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Run Radar</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preset Radar Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/[0.04]">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mr-1">
          Trending Signals:
        </span>
        {PRESET_QUERIES.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              onChangeKeyword(preset);
              onSearch(preset);
            }}
            className="px-2 py-0.5 rounded-md bg-[#12131A] hover:bg-[#161822] border border-white/[0.06] hover:border-white/[0.12] text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Expandable Advanced Parameter Drawer */}
      {showAdvancedFilters && (
        <div className="p-3.5 rounded-lg bg-[#0A0B10] border border-white/[0.07] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in duration-100">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
              Min Price ($)
            </label>
            <input
              type="number"
              placeholder="e.g. 15"
              value={minPriceFilter}
              onChange={(e) => onChangeMinPrice(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#12131A] border border-white/[0.08] focus:border-orange-500/50 rounded-md text-zinc-200 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
              Max Price ($)
            </label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={maxPriceFilter}
              onChange={(e) => onChangeMaxPrice(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#12131A] border border-white/[0.08] focus:border-orange-500/50 rounded-md text-zinc-200 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
              Min In Carts
            </label>
            <input
              type="number"
              placeholder="e.g. 10"
              value={minCartsFilter}
              onChange={(e) => onChangeMinCarts(e.target.value)}
              className="w-full h-8 px-2.5 bg-[#12131A] border border-white/[0.08] focus:border-orange-500/50 rounded-md text-zinc-200 text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-end justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={bestsellerOnly}
                onChange={onToggleBestseller}
                className="rounded border-zinc-700 text-orange-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-zinc-300 text-xs">Bestsellers Only</span>
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 pb-2 cursor-pointer underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
