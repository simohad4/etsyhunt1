import React, { useState, useEffect } from 'react';
import { Search, Plus, Columns, ExternalLink, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { EtsyProductItem } from '../types/etsyHunter';

interface EtsyHunterCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  products: EtsyProductItem[];
  onSelectProduct: (product: EtsyProductItem) => void;
  onOpenTagAnalyzer: () => void;
  onNavigateWorkspace: () => void;
  onNavigateHome: () => void;
}

export const EtsyHunterCommandMenu: React.FC<EtsyHunterCommandMenuProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  onOpenTagAnalyzer,
  onNavigateWorkspace,
  onNavigateHome
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    p.shopName.toLowerCase().includes(query.toLowerCase()) ||
    p.identifier.toLowerCase().includes(query.toLowerCase()) ||
    p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32 p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#121216] border border-[#22222b] shadow-[0_20px_70px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#22222b]">
          <Search className="w-4 h-4 text-[#8a8f98] shrink-0 mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, product keyword, shop name, or tag..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[#f7f8f8] placeholder-[#575a65] focus:outline-none"
          />
          <span className="eh-kbd text-[9px]">ESC</span>
        </div>

        {/* Menu Body */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-4 text-xs">
          {/* Quick Actions */}
          <div>
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#575a65]">
              Quick Actions
            </div>
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => {
                  onClose();
                  onOpenTagAnalyzer();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#18181f] text-left text-[#f7f8f8] group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded bg-[#5e6ad2]/20 flex items-center justify-center text-[#707bfb]">
                    <Tag className="w-3 h-3" />
                  </div>
                  <span>Launch 13-Tag Reverse Extractor</span>
                </div>
                <span className="eh-kbd text-[9px] group-hover:border-[#383848]">
                  C
                </span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onNavigateWorkspace();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#18181f] text-left text-[#f7f8f8] group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded bg-[#18181f] flex items-center justify-center text-[#8a8f98]">
                    <Columns className="w-3 h-3" />
                  </div>
                  <span>Open Niche Research Dashboard</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#575a65] group-hover:text-white" />
              </button>

              <button
                onClick={() => {
                  onClose();
                  onNavigateHome();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#18181f] text-left text-[#f7f8f8] group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded bg-[#18181f] flex items-center justify-center text-[#8a8f98]">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span>Return to Landing Overview</span>
                </div>
              </button>
            </div>
          </div>

          {/* Tracked Listings */}
          <div>
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#575a65] flex items-center justify-between">
              <span>Etsy Listings &amp; Niches ({filteredProducts.length})</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {filteredProducts.slice(0, 7).map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => {
                    onClose();
                    onSelectProduct(prod);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#18181f] text-left text-[#f7f8f8] group transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[11px] text-[#707bfb] shrink-0">
                      {prod.identifier}
                    </span>
                    <span className="truncate text-xs text-[#8a8f98] group-hover:text-[#f7f8f8]">
                      {prod.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[11px] font-mono text-[#30a46c]">
                      ${prod.estimatedMonthlyRevenue.toLocaleString()}/mo
                    </span>
                    <span className="text-[9px] uppercase px-1 rounded bg-[#18181f] border border-[#282835] text-[#575a65]">
                      {prod.competition}
                    </span>
                  </div>
                </button>
              ))}

              {filteredProducts.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-[#575a65]">
                  No matching Etsy products found for &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[#22222b] bg-[#0e0e13] flex items-center justify-between text-[11px] text-[#575a65]">
          <div className="flex items-center gap-2 font-mono">
            <span>Navigation:</span>
            <span className="eh-kbd text-[9px]">↑</span>
            <span className="eh-kbd text-[9px]">↓</span>
            <span className="eh-kbd text-[9px]">↵</span>
          </div>
          <span className="font-mono text-[10px] text-[#707bfb]">Etsy Hunter Command Engine</span>
        </div>
      </div>
    </div>
  );
};
