import React, { useState } from 'react';
import {
  ChevronDown,
  Bookmark,
  Command,
  Search,
  HelpCircle,
  Sparkles,
  ArrowUpRight,
  Globe
} from 'lucide-react';

interface HeaderProps {
  onOpenSavedSearches: () => void;
  onOpenHelp: () => void;
  onGoToPricing: () => void;
  onGoToLanding: () => void;
  onOpenCommandMenu?: () => void;
  selectedMarket: string;
  onSelectMarket: (market: string) => void;
  userName?: string;
  userEmail?: string;
  creditsRemaining?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSavedSearches,
  onOpenHelp,
  onGoToPricing,
  onGoToLanding,
  onOpenCommandMenu,
  selectedMarket,
  onSelectMarket,
  userName = 'Alex Rivera',
  userEmail = 'alex.seller@gmail.com',
  creditsRemaining = 450
}) => {
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false);

  const markets = [
    { code: 'US', label: 'United States', flag: '🇺🇸', currency: 'USD ($)' },
    { code: 'UK', label: 'United Kingdom', flag: '🇬🇧', currency: 'GBP (£)' },
    { code: 'DE', label: 'Germany', flag: '🇩🇪', currency: 'EUR (€)' },
    { code: 'CA', label: 'Canada', flag: '🇨🇦', currency: 'CAD ($)' },
    { code: 'AU', label: 'Australia', flag: '🇦🇺', currency: 'AUD ($)' },
    { code: 'FR', label: 'France', flag: '🇫🇷', currency: 'EUR (€)' }
  ];

  const currentMarket = markets.find((m) => m.code === selectedMarket) || markets[0];

  return (
    <header className="h-14 bg-[#090A0F]/80 backdrop-blur-xl border-b border-white/[0.07] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: Breadcrumb & Market Selector */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
          <button
            onClick={onGoToLanding}
            className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            EtsyHunter
          </button>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-200">Product Radar</span>
        </div>

        {/* Etsy Hunter-style Marketplace Selector */}
        <div className="relative">
          <button
            onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#12131A] border border-white/[0.08] hover:border-white/[0.14] text-xs text-zinc-300 transition-colors cursor-pointer"
          >
            <span className="text-xs">{currentMarket.flag}</span>
            <span className="font-semibold text-zinc-100 text-[11px]">{currentMarket.code}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {marketDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-44 rounded-lg bg-[#0F1017] border border-white/[0.1] shadow-2xl py-1 z-50 animate-in fade-in duration-100">
              <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                Select Region
              </div>
              {markets.map((m) => (
                <button
                  key={m.code}
                  onClick={() => {
                    onSelectMarket(m.code);
                    setMarketDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-white/[0.04] transition-colors cursor-pointer ${
                    m.code === selectedMarket
                      ? 'text-orange-400 font-semibold bg-orange-500/10'
                      : 'text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{m.flag}</span>
                    <span className="text-[11px]">{m.label}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">{m.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle: Floating Quick Search Bar (Etsy Hunter Command trigger) */}
      {onOpenCommandMenu && (
        <div className="hidden md:flex items-center">
          <button
            onClick={onOpenCommandMenu}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12131A] hover:bg-[#161822] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer group shadow-inner"
          >
            <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
            <span className="text-[11px] text-zinc-400 font-normal">Search niches or run commands...</span>
            <div className="flex items-center gap-0.5 ml-3">
              <span className="eh-kbd">⌘</span>
              <span className="eh-kbd">K</span>
            </div>
          </button>
        </div>
      )}

      {/* Right side: Status indicators, Help & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={onOpenSavedSearches}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06] cursor-pointer"
        >
          <Bookmark className="w-3.5 h-3.5 text-zinc-500" />
          <span className="hidden sm:inline text-[11px]">Saved</span>
        </button>

        <button
          onClick={onOpenHelp}
          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors cursor-pointer"
          title="Methodology & Documentation"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/[0.08] mx-0.5" />

        {/* User Pill / Plan */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_8px_rgba(249,115,22,0.25)]">
            {userName ? userName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-[11px] font-medium text-zinc-200 leading-tight">
              {userName}
            </span>
            <span className="text-[9px] text-zinc-500 font-mono leading-tight">
              Pro Workspace
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
