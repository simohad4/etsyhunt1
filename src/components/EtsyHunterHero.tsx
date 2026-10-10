import React from 'react';
import { ArrowRight, ChevronRight, Search, ShieldCheck } from 'lucide-react';

interface EtsyHunterHeroProps {
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenWorkspace: () => void;
  onOpenResearch?: () => void;
}

export const EtsyHunterHero: React.FC<EtsyHunterHeroProps> = ({
  onOpenAuth,
  onOpenWorkspace,
  onOpenResearch
}) => {
  return (
    <section className="relative pt-20 pb-12 sm:pt-28 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center overflow-hidden">
      {/* Signature radial gradient indigo/purple glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[480px] eh-hero-glow pointer-events-none -z-10" />

      {/* Announcement badge with subtle pulse */}
      <div
        onClick={onOpenResearch || onOpenWorkspace}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121216] border border-[#22222b] hover:border-[#333342] text-[12px] font-medium text-[#8a8f98] hover:text-[#f7f8f8] transition-all cursor-pointer shadow-sm group"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5e6ad2] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5e6ad2]" />
        </span>
        <span className="text-[#f7f8f8] font-medium">Etsy Hunter</span>
        <span className="text-[#575a65]">·</span>
        <span className="group-hover:text-[#f7f8f8] transition-colors">
          Listing Analysis, Tag Research &amp; Demand Signals
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-[#8a8f98] group-hover:translate-x-0.5 transition-transform" />
      </div>

      {/* Hero Heading: Large editorial headline */}
      <h1 className="mt-8 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.035em] text-[#f7f8f8] max-w-4xl mx-auto leading-[1.08]">
        The Etsy product research &amp; <br className="hidden sm:inline" />
        <span className="bg-gradient-to-b from-[#f7f8f8] via-[#f7f8f8] to-[#8a8f98] bg-clip-text text-transparent">
          market intelligence tool for sellers
        </span>
      </h1>

      {/* Value Proposition without inflated claims */}
      <p className="mt-6 text-base sm:text-lg text-[#8a8f98] max-w-2xl mx-auto leading-relaxed">
        Etsy Hunter helps sellers evaluate marketplace opportunities, analyze competitor listings, inspect candidate tags, and estimate demand trends with structured research credits.
      </p>

      {/* Dual CTA buttons */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onOpenAuth('signup')}
          className="px-5 py-2.5 rounded-md bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-sm font-medium transition-all shadow-[0_0_24px_rgba(94,106,210,0.35)] hover:shadow-[0_0_36px_rgba(94,106,210,0.55)] flex items-center gap-2 cursor-pointer"
        >
          <span>Get Started Free</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenWorkspace}
          className="px-5 py-2.5 rounded-md bg-[#18181f] hover:bg-[#202029] border border-[#282835] hover:border-[#383848] text-[#f7f8f8] text-sm font-medium transition-all flex items-center gap-2 cursor-pointer group"
        >
          <Search className="w-4 h-4 text-[#8a8f98] group-hover:text-white transition-colors" />
          <span>Explore Product Research Demo</span>
          <span className="eh-kbd">⌘K</span>
        </button>
      </div>

      {/* Verified Product Pillars (replaces unsupported 1.4M claims) */}
      <div className="mt-14 pt-8 border-t border-[#22222b]/60 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-[#8a8f98]">
        <div className="flex items-center gap-2">
          <span className="text-[#5e6ad2] font-semibold">Observed Signals</span>
          <span>Prices, in-cart counts &amp; shop metrics</span>
        </div>
        <div className="h-3 w-px bg-[#22222b] hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-[#5e6ad2] font-semibold">Estimated Metrics</span>
          <span>Sales &amp; revenue projections</span>
        </div>
        <div className="h-3 w-px bg-[#22222b] hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-[#5e6ad2] font-semibold">Credit-Based</span>
          <span>Transparent 1 credit per page quota</span>
        </div>
      </div>
    </section>
  );
};
