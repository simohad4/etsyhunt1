import React, { useState } from 'react';
import {
  X,
  Tag,
  Copy,
  Check,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Percent,
  Star,
  ShoppingCart,
  Eye,
  Trash2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { EtsyProductItem, ResearchStage, CompetitionLevel } from '../types/etsyHunter';

interface EtsyProductDetailModalProps {
  product: EtsyProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProduct: (product: EtsyProductItem) => void;
  onDeleteProduct?: (id: string) => void;
}

export const EtsyProductDetailModal: React.FC<EtsyProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onUpdateProduct,
  onDeleteProduct
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [stage, setStage] = useState<ResearchStage>(product?.stage || 'trending');
  const [notes, setNotes] = useState(product?.notes || '');
  const [price, setPrice] = useState(product?.price ? String(product.price) : '24.99');

  if (!isOpen || !product) return null;

  const handleCopyTags = () => {
    navigator.clipboard.writeText(product.tags.join(', '));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSave = () => {
    onUpdateProduct({
      ...product,
      stage,
      notes: notes.trim(),
      price: parseFloat(price) || product.price
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#121216] border border-[#22222b] shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="h-12 px-5 border-b border-[#22222b] bg-[#0e0e13] flex items-center justify-between text-xs text-[#8a8f98] shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[#707bfb] font-medium">{product.identifier}</span>
            <span className="text-[#575a65]">·</span>
            <span className="text-[#f7f8f8] font-medium truncate max-w-xs">{product.shopName}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#181820] text-[#707bfb] border border-[#282835]">
              {product.category}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onDeleteProduct && (
              <button
                onClick={() => {
                  onDeleteProduct(product.id);
                  onClose();
                }}
                className="p-1 rounded text-[#575a65] hover:text-[#e5484d] transition-colors"
                title="Delete listing from board"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-[#575a65] hover:text-[#f7f8f8] hover:bg-[#18181f] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Main Info Hero */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-24 h-24 rounded-xl object-cover ring-1 ring-[#22222b] shrink-0 bg-[#0e0e13]"
            />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#181820] text-[#f2994a] font-semibold border border-[#2a2a38]">
                  {product.inCartCount}+ IN CARTS
                </span>
                <span className="text-[10px] font-mono text-[#8a8f98]">
                  {product.shopRating}★ ({product.reviewsCount} reviews)
                </span>
                {product.isBestseller && (
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#5e6ad2]/20 text-[#707bfb] border border-[#5e6ad2]/30 font-semibold">
                    BESTSELLER
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-[#f7f8f8] leading-snug">
                {product.title}
              </h3>
              <p className="text-xs text-[#8a8f98] flex items-center gap-2">
                <span>Shop: <strong className="text-[#f7f8f8]">{product.shopName}</strong></span>
                <span className="text-[#575a65]">•</span>
                <a
                  href={product.etsyUrl || 'https://www.etsy.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#707bfb] hover:underline flex items-center gap-1"
                >
                  <span>View on Etsy</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#0b0b0f] border border-[#22222b] space-y-0.5">
              <span className="text-[10px] font-mono text-[#8a8f98] uppercase">Est. Revenue</span>
              <div className="text-sm font-bold font-mono text-[#10b981]">
                ${product.estimatedMonthlyRevenue.toLocaleString()}/mo
              </div>
              <span className="text-[10px] text-[#575a65]">~{product.monthlySales} orders</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0b0f] border border-[#22222b] space-y-0.5">
              <span className="text-[10px] font-mono text-[#8a8f98] uppercase">Retail Price</span>
              <div className="text-sm font-bold font-mono text-[#f7f8f8]">
                ${product.price.toFixed(2)}
              </div>
              <span className="text-[10px] text-[#575a65]">Avg in category</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0b0f] border border-[#22222b] space-y-0.5">
              <span className="text-[10px] font-mono text-[#8a8f98] uppercase">Profit Margin</span>
              <div className="text-sm font-bold font-mono text-[#707bfb]">
                {product.estimatedMarginPct}%
              </div>
              <span className="text-[10px] text-[#575a65]">Est. net margin</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0b0f] border border-[#22222b] space-y-0.5">
              <span className="text-[10px] font-mono text-[#8a8f98] uppercase">Monthly Views</span>
              <div className="text-sm font-bold font-mono text-[#f7f8f8]">
                {product.monthlyViews.toLocaleString()}
              </div>
              <span className="text-[10px] text-[#10b981]">High velocity</span>
            </div>
          </div>

          {/* Research Stage Selector */}
          <div className="p-3.5 rounded-xl bg-[#0e0e13] border border-[#22222b] space-y-2">
            <label className="block text-[11px] font-mono uppercase text-[#8a8f98]">
              Current Research Stage
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'trending', label: 'Trending Ideas' },
                { id: 'high_potential', label: 'High Potential' },
                { id: 'optimized', label: 'Optimized' },
                { id: 'tracked', label: 'Tracked' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStage(st.id as ResearchStage)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    stage === st.id
                      ? 'bg-[#5e6ad2]/20 border-[#5e6ad2] text-[#707bfb] font-semibold'
                      : 'bg-[#121217] border-[#22222b] text-[#8a8f98] hover:text-[#f7f8f8]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* 13 Etsy Tags List */}
          <div className="p-4 rounded-xl bg-[#0e0e13] border border-[#22222b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#5e6ad2]" />
                Top Ranking Etsy Tags ({product.tags.length})
              </span>
              <button
                type="button"
                onClick={handleCopyTags}
                className="px-2.5 py-1 rounded bg-[#18181f] hover:bg-[#22222b] border border-[#282835] text-[11px] text-[#f7f8f8] flex items-center gap-1.5 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-[#10b981]" />
                    <span className="text-[#10b981]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[#5e6ad2]" />
                    <span>Copy All Tags</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#121217] border border-[#22222b] text-[#8a8f98]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Sourcing & Competitive Notes */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono uppercase text-[#8a8f98]">
              Supplier Notes &amp; Fulfillment Strategy
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. SwiftPOD Comfort Colors 1717 blank cost is $13.50, shipping 3-5 days..."
              className="w-full px-3 py-2 bg-[#0b0b0f] border border-[#22222b] rounded-lg text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-5 border-t border-[#22222b] bg-[#0e0e13] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md hover:bg-[#18181f] text-xs text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-md bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold transition-all shadow-[0_0_12px_rgba(94,106,210,0.3)] cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
