import React from 'react';
import { Sparkles, ArrowRight, Zap, ShoppingBag, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EtsyHunterStatusBannerProps {
  onOpenSettings?: () => void;
  onOpenTagAnalyzer?: () => void;
  onSeedSampleProducts?: () => void;
  totalProductsCount: number;
}

export const EtsyHunterStatusBanner: React.FC<EtsyHunterStatusBannerProps> = ({
  onOpenSettings,
  onOpenTagAnalyzer,
  onSeedSampleProducts,
  totalProductsCount
}) => {
  const { activeWorkspace, isLiveSupabase } = useAuth();

  if (!activeWorkspace) return null;

  const isLowCredits = activeWorkspace.creditsRemaining <= 10;

  return (
    <div className="w-full bg-[#121216]/90 border-b border-[#22222b] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8a8f98]">
      {/* Left side: Active Workspace indicator & Quick context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30a46c] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#30a46c]" />
          </span>
          <span className="text-[#f7f8f8] font-medium">
            {activeWorkspace.name}
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#5e6ad2]/20 text-[#707bfb] border border-[#5e6ad2]/30">
            {activeWorkspace.plan} Plan
          </span>
        </div>

        <span className="text-[#575a65] hidden sm:inline">·</span>

        <div className="hidden sm:flex items-center gap-2 text-[11px]">
          <span>Etsy API Scans:</span>
          <span
            className={`font-mono font-semibold ${
              isLowCredits ? 'text-[#e5484d]' : 'text-[#f7f8f8]'
            }`}
          >
            {activeWorkspace.creditsRemaining} / {activeWorkspace.totalCredits} left
          </span>
        </div>

        {totalProductsCount === 0 && onSeedSampleProducts && (
          <div className="flex items-center gap-1.5 text-[#f5d90a] bg-[#f5d90a]/10 px-2 py-0.5 rounded border border-[#f5d90a]/30">
            <Info className="w-3 h-3 shrink-0" />
            <span>Empty board?</span>
            <button
              onClick={onSeedSampleProducts}
              className="underline hover:text-white font-medium cursor-pointer ml-1"
            >
              Seed 10 winning listings
            </button>
          </div>
        )}
      </div>

      {/* Right side: Quick hints and action button */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className="hidden md:flex items-center gap-2 text-[#575a65]">
          <span>Press</span>
          <span className="eh-kbd text-[10px]">C</span>
          <span>to analyze tags</span>
          <span className="text-[#22222b]">|</span>
          <span className="eh-kbd text-[10px]">⌘K</span>
          <span>for command palette</span>
        </div>

        {onOpenTagAnalyzer && (
          <button
            onClick={onOpenTagAnalyzer}
            className="px-2.5 py-1 rounded bg-[#5e6ad2]/20 hover:bg-[#5e6ad2]/30 text-[#707bfb] border border-[#5e6ad2]/40 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Tag Analyzer</span>
          </button>
        )}

        {isLowCredits && onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="px-2 py-1 rounded bg-[#e5484d]/15 text-[#e5484d] border border-[#e5484d]/30 text-xs font-medium hover:bg-[#e5484d]/25 transition-colors cursor-pointer flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Upgrade Scans</span>
          </button>
        )}
      </div>
    </div>
  );
};
