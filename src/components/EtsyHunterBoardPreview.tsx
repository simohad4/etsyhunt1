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
  ChevronRight
} from 'lucide-react';
import { EtsyProductItem, ResearchStage } from '../types/etsyHunter';
import { MOCK_ETSY_PRODUCTS } from '../data/mockEtsyHunterData';

interface EtsyHunterBoardPreviewProps {
  onOpenWorkspace: () => void;
  onSelectProduct?: (product: EtsyProductItem) => void;
}

const STAGE_CONFIG: {
  key: ResearchStage;
  label: string;
  count: number;
  badgeBg: string;
  textColor: string;
}[] = [
  {
    key: 'trending',
    label: 'Trending Ideas',
    count: 3,
    badgeBg: 'bg-[#5e6ad2]/15 border-[#5e6ad2]/30',
    textColor: 'text-[#707bfb]'
  },
  {
    key: 'high_potential',
    label: 'High Potential',
    count: 3,
    badgeBg: 'bg-[#299764]/15 border-[#299764]/30',
    textColor: 'text-[#30a46c]'
  },
  {
    key: 'optimized',
    label: 'Optimized Listings',
    count: 2,
    badgeBg: 'bg-[#f5d90a]/15 border-[#f5d90a]/30',
    textColor: 'text-[#f5d90a]'
  },
  {
    key: 'tracked',
    label: 'Tracked / Watchlist',
    count: 2,
    badgeBg: 'bg-[#8a8f98]/15 border-[#8a8f98]/30',
    textColor: 'text-[#8a8f98]'
  }
];

export const EtsyHunterBoardPreview: React.FC<EtsyHunterBoardPreviewProps> = ({
  onOpenWorkspace,
  onSelectProduct
}) => {
  const [products, setProducts] = useState<EtsyProductItem[]>(MOCK_ETSY_PRODUCTS.slice(0, 10));

  const handleMoveStage = (id: string, newStage: ResearchStage) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stage: newStage } : item))
    );
  };

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
              <span className="text-[#8a8f98]">Etsy Hunter AI</span>
              <span className="text-[#575a65]">/</span>
              <span>Niche Intelligence Board</span>
              <span className="text-[#575a65]">/</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-[#18181f] text-[#707bfb] border border-[#282835]">
                Live Etsy Sync
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#575a65] hidden sm:inline">
              10 Listings · 13 Tags Analyzed
            </span>
            <button
              onClick={onOpenWorkspace}
              className="px-2.5 py-1 rounded-md bg-[#5e6ad2]/20 hover:bg-[#5e6ad2]/30 text-[#707bfb] border border-[#5e6ad2]/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Expand Workspace</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Dashboard Filter Bar */}
        <div className="px-5 py-3 border-b border-[#22222b] bg-[#121216]/60 backdrop-blur-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#18181f] border border-[#282835] text-[#f7f8f8]">
              <Columns className="w-3.5 h-3.5 text-[#5e6ad2]" />
              <span className="font-medium">Research Stages</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#18181f]/60 text-[#8a8f98] border border-[#22222b]">
              <span>Category: All (POD, Digital, Crafts)</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#18181f]/40 text-[#575a65] font-mono text-[11px]">
              Min Margin &gt; 65%
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                readOnly
                placeholder="Filter listings..."
                className="w-36 sm:w-48 pl-7 pr-2.5 py-1 rounded bg-[#18181f] border border-[#282835] text-xs text-[#8a8f98] placeholder-[#575a65] cursor-pointer"
                onClick={onOpenWorkspace}
              />
              <Search className="w-3 h-3 text-[#575a65] absolute left-2.5 top-2" />
            </div>
          </div>
        </div>

        {/* Preview Kanban Board Grid */}
        <div className="p-4 sm:p-5 overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[760px]">
            {STAGE_CONFIG.map((col) => {
              const colProducts = products.filter((p) => p.stage === col.key);

              return (
                <div
                  key={col.key}
                  className="rounded-xl bg-[#121216] border border-[#22222b] p-3 flex flex-col min-h-[460px]"
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
                        className="group relative p-3 rounded-lg bg-[#18181f] hover:bg-[#1f1f28] border border-[#282835] hover:border-[#3b3b4f] transition-all cursor-pointer shadow-sm hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                      >
                        {/* Top row: ID + Competition Score */}
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

                        {/* Shop and Revenue Metas */}
                        <div className="grid grid-cols-2 gap-1.5 py-2 border-t border-b border-[#282835]/60 text-[11px] text-[#8a8f98]">
                          <div>
                            <span className="text-[#575a65] text-[10px] block">Shop</span>
                            <span className="font-medium text-[#f7f8f8] truncate block">
                              {prod.shopName}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#575a65] text-[10px] block">Est. Revenue</span>
                            <span className="font-mono font-semibold text-[#30a46c]">
                              ${prod.estimatedMonthlyRevenue.toLocaleString()}/mo
                            </span>
                          </div>
                        </div>

                        {/* Bottom Tags Strip */}
                        <div className="mt-2 flex items-center justify-between text-[10px] text-[#575a65]">
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-[#5e6ad2]" />
                            <span>{prod.tags.length} SEO Tags</span>
                          </div>

                          <div className="flex items-center gap-1 font-mono text-[#f7f8f8]">
                            <span>{prod.inCartCount} in cart</span>
                          </div>
                        </div>

                        {/* Quick Move Trigger on Hover */}
                        <div className="mt-2 pt-1.5 border-t border-[#282835]/40 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-[#8a8f98]">Move stage:</span>
                          <div className="flex items-center gap-1">
                            {col.key !== 'high_potential' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStage(prod.id, 'high_potential');
                                }}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-[#22222b] hover:bg-[#5e6ad2] text-white transition-colors"
                              >
                                Potential
                              </button>
                            )}
                            {col.key !== 'optimized' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStage(prod.id, 'optimized');
                                }}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-[#22222b] hover:bg-[#f5d90a] hover:text-black text-white transition-colors"
                              >
                                Optimize
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Stage Prompt */}
                  <button
                    onClick={onOpenWorkspace}
                    className="mt-3 w-full py-1.5 rounded-md border border-dashed border-[#282835] hover:border-[#3b3b4f] text-[11px] text-[#575a65] hover:text-[#8a8f98] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Scan new niche listings</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3 border-t border-[#22222b] bg-[#0e0e13] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8a8f98]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30a46c]" />
              <span>Real-time scraping queue ready</span>
            </span>
            <span className="text-[#575a65]">·</span>
            <span className="text-[#575a65]">Zero-pill high-density architecture</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#575a65]">Keyboard shortcuts:</span>
            <span className="eh-kbd text-[10px]">C to Analyze Tags</span>
            <span className="eh-kbd text-[10px]">⌘K for Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
};
