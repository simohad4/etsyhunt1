import React, { useState } from 'react';
import {
  Columns,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  Tag,
  DollarSign,
  Sparkles,
  ExternalLink,
  Percent,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { EtsyProductItem, ResearchStage } from '../types/etsyHunter';
import { DEMO_ETSY_PRODUCTS } from '../data/mockEtsyHunterData';

interface EtsyHunterBoardPreviewProps {
  onOpenWorkspace: () => void;
  onSelectProduct?: (product: EtsyProductItem) => void;
}

const STAGE_CONFIG: {
  key: ResearchStage;
  label: string;
  badgeBg: string;
  textColor: string;
}[] = [
  {
    key: 'trending',
    label: 'Trending Ideas',
    badgeBg: 'bg-[#5e6ad2]/15 border-[#5e6ad2]/30',
    textColor: 'text-[#707bfb]'
  },
  {
    key: 'high_potential',
    label: 'High Potential',
    badgeBg: 'bg-[#299764]/15 border-[#299764]/30',
    textColor: 'text-[#30a46c]'
  },
  {
    key: 'optimized',
    label: 'Optimized Listings',
    badgeBg: 'bg-[#f5d90a]/15 border-[#f5d90a]/30',
    textColor: 'text-[#f5d90a]'
  },
  {
    key: 'tracked',
    label: 'Saved Listings',
    badgeBg: 'bg-[#8a8f98]/15 border-[#8a8f98]/30',
    textColor: 'text-[#8a8f98]'
  }
];

export const EtsyHunterBoardPreview: React.FC<EtsyHunterBoardPreviewProps> = ({
  onOpenWorkspace,
  onSelectProduct
}) => {
  const [products] = useState<EtsyProductItem[]>(DEMO_ETSY_PRODUCTS);

  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-20">
      {/* Outer Glow frame */}
      <div className="relative rounded-2xl bg-[#0b0b0f] border border-[#22222b] shadow-[0_20px_80px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Top Window Bar */}
        <div className="h-11 px-4 border-b border-[#22222b] bg-[#0e0e13] flex items-center justify-between text-xs text-[#8a8f98]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#27272a]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27272a]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27272a]" />
            </div>
            <div className="h-3 w-px bg-[#22222b] mx-1" />
            <div className="flex items-center gap-1.5 font-medium text-[#f7f8f8]">
              <span className="text-[#8a8f98]">Etsy Hunter</span>
              <span className="text-[#575a65]">/</span>
              <span>Product Research Preview</span>
              <span className="text-[#575a65]">/</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-[#18181f] text-[#707bfb] border border-[#282835]">
                Sample Demo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenWorkspace}
              className="px-2.5 py-1 rounded-md bg-[#5e6ad2]/20 hover:bg-[#5e6ad2]/30 text-[#707bfb] border border-[#5e6ad2]/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Open Research Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Informative Notice (Distinguishing Sample Data) */}
        <div className="px-5 py-2.5 border-b border-[#22222b] bg-[#121216]/90 text-xs text-[#8a8f98] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#5e6ad2] shrink-0" />
            <span>Illustrative research data. Observed prices and cart counts are clearly separated from modeled revenue estimates.</span>
          </div>
          <span className="font-mono text-[11px] text-[#575a65] hidden md:inline">
            1 Credit = 1 Page Query
          </span>
        </div>

        {/* Preview Kanban Board Grid */}
        <div className="p-4 sm:p-5 overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[760px]">
            {STAGE_CONFIG.map((col) => {
              const colProducts = products.filter((p) => p.stage === col.key);

              return (
                <div
                  key={col.key}
                  className="rounded-xl bg-[#121216] border border-[#22222b] p-3 flex flex-col min-h-[380px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.key === 'trending' ? 'bg-[#5e6ad2]' : col.key === 'high_potential' ? 'bg-[#30a46c]' : col.key === 'optimized' ? 'bg-[#f5d90a]' : 'bg-[#8a8f98]'}`} />
                      <span className="text-xs font-semibold text-[#f7f8f8]">
                        {col.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#575a65] px-1.5 py-0.2 rounded bg-[#18181f]">
                      {colProducts.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                    {colProducts.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => onSelectProduct && onSelectProduct(prod)}
                        className="group relative p-3 rounded-lg bg-[#18181f] hover:bg-[#1f1f28] border border-[#282835] hover:border-[#3b3b4f] transition-all cursor-pointer shadow-sm"
                      >
                        {/* Top row: ID + Modeled Competition Score */}
                        <div className="flex items-center justify-between text-[11px] mb-2">
                          <span className="font-mono text-[#707bfb] font-medium">
                            {prod.identifier}
                          </span>
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
                        </div>

                        {/* Title and Thumbnail */}
                        <div className="flex gap-2.5 mb-2.5">
                          <img
                            src={prod.imageUrl}
                            alt={prod.title}
                            className="w-11 h-11 rounded-md object-cover border border-[#282835] shrink-0"
                          />
                          <h4 className="text-xs font-medium text-[#f7f8f8] line-clamp-2 leading-snug group-hover:text-white">
                            {prod.title}
                          </h4>
                        </div>

                        {/* Observed Price vs Estimated Monthly Revenue */}
                        <div className="grid grid-cols-2 gap-1.5 py-2 border-t border-b border-[#282835]/60 text-[11px] text-[#8a8f98]">
                          <div>
                            <span className="text-[#575a65] text-[10px] block">Observed Price</span>
                            <span className="font-mono font-medium text-[#f7f8f8]">
                              ${prod.observedPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#575a65] text-[10px] block">Est. Revenue</span>
                            <span className="font-mono font-semibold text-[#30a46c]">
                              ${prod.estimatedMonthlyRevenue.toLocaleString()}/mo
                            </span>
                          </div>
                        </div>

                        {/* Bottom Observed In-Cart Signal */}
                        <div className="mt-2 flex items-center justify-between text-[10px] text-[#575a65]">
                          <span>{prod.tags.length} candidate tags</span>
                          {prod.observedInCartCount && (
                            <span className="text-[#f7f8f8] font-mono">
                              {prod.observedInCartCount} in carts
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {colProducts.length === 0 && (
                      <div className="py-8 text-center text-xs text-[#575a65] border border-dashed border-[#282835] rounded-lg">
                        Empty column
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
