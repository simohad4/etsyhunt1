import React from 'react';
import {
  X,
  ExternalLink,
  Tag,
  DollarSign,
  TrendingUp,
  Percent,
  Copy,
  Check,
  Star,
  Trash2,
  Bookmark,
  ShieldAlert,
  Info
} from 'lucide-react';
import { EtsyProductItem, ResearchStage } from '../types/etsyHunter';
import { useAuth } from '../context/AuthContext';

interface EtsyProductDetailModalProps {
  isOpen: boolean;
  product: EtsyProductItem | null;
  onClose: () => void;
  onUpdateProduct?: (updated: EtsyProductItem) => void;
  onDeleteProduct?: (id: string) => void;
}

export const EtsyProductDetailModal: React.FC<EtsyProductDetailModalProps> = ({
  isOpen,
  product,
  onClose,
  onUpdateProduct,
  onDeleteProduct
}) => {
  const { isListingSaved, saveListing, removeSavedListing } = useAuth();
  const [copiedTag, setCopiedTag] = React.useState<string | null>(null);
  const [copiedAll, setCopiedAll] = React.useState(false);

  if (!isOpen || !product) return null;

  const isSaved = isListingSaved(product.id);

  const handleCopyTags = () => {
    navigator.clipboard.writeText(product.tags.join(', '));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingleTag = (t: string) => {
    navigator.clipboard.writeText(t);
    setCopiedTag(t);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const handleToggleSaved = () => {
    if (isSaved) {
      removeSavedListing(product.id);
    } else {
      saveListing(product);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#121216] border border-[#22222b] shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header Bar */}
        <div className="h-14 px-6 border-b border-[#22222b] flex items-center justify-between shrink-0 bg-[#0e0e13]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-[#707bfb]">
              {product.identifier}
            </span>
            <span className="text-[#575a65]">·</span>
            <span className="text-xs text-[#8a8f98]">{product.category}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSaved}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-[#5e6ad2] text-white'
                  : 'bg-[#18181f] text-[#8a8f98] hover:text-white border border-[#282835]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isSaved ? 'Saved in Workspace' : 'Save Listing'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-[#575a65] hover:text-[#f7f8f8] hover:bg-[#18181f] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Info Strip */}
          <div className="flex flex-col sm:flex-row gap-5">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full sm:w-40 h-40 object-cover rounded-xl border border-[#282835] shrink-0"
            />
            <div className="space-y-2 min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-[#f7f8f8] leading-snug">
                {product.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#8a8f98]">
                <span>Shop: <strong className="text-[#f7f8f8]">{product.shopName}</strong></span>
                {product.observedShopRating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-[#f5d90a] fill-[#f5d90a]" />
                    <span>{product.observedShopRating}</span>
                    {product.observedReviewsCount && (
                      <span className="text-[#575a65]">({product.observedReviewsCount} reviews)</span>
                    )}
                  </span>
                )}
              </div>

              {product.etsyUrl && (
                <div className="pt-1">
                  <a
                    href={product.etsyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#707bfb] hover:text-[#8a94fd] hover:underline"
                  >
                    <span>View original listing on Etsy</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Observed Marketplace Signals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#707bfb] font-semibold">
                1. Observed Marketplace Signals
              </h3>
              <span className="text-[10px] text-[#575a65]">
                Directly observed where available
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
                <span className="text-[#8a8f98] text-[10px] block mb-1">Listing Price</span>
                <span className="font-mono font-bold text-[#f7f8f8] text-sm">
                  ${product.observedPrice.toFixed(2)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
                <span className="text-[#8a8f98] text-[10px] block mb-1">In-Cart Count</span>
                <span className="font-mono font-bold text-[#f7f8f8] text-sm">
                  {product.observedInCartCount ? `${product.observedInCartCount} in carts` : 'Not available'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
                <span className="text-[#8a8f98] text-[10px] block mb-1">Bestseller Status</span>
                <span className="font-mono font-bold text-[#f7f8f8] text-sm">
                  {product.observedIsBestseller ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
                <span className="text-[#8a8f98] text-[10px] block mb-1">Sponsored Listing</span>
                <span className="font-mono font-bold text-[#f7f8f8] text-sm">
                  {product.observedIsSponsored ? 'Sponsored' : 'Organic'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Estimated Metrics & Modeled Indicators */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#30a46c] font-semibold">
                2. Estimated Metrics &amp; Modeled Indicators
              </h3>
              <span className="text-[10px] text-[#575a65]">
                Statistically modeled projections
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
                <span className="text-[#8a8f98] text-[10px] block mb-1">Est. Monthly Revenue</span>
                <span className="font-mono font-bold text-[#30a46c] text-sm">
                  ${product.estimatedMonthlyRevenue.toLocaleString()}/mo
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
                <span className="text-[#8a8f98] text-[10px] block mb-1">Est. Monthly Sales</span>
                <span className="font-mono font-bold text-[#f7f8f8] text-sm">
                  ~{product.estimatedMonthlySales} orders
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
                <span className="text-[#8a8f98] text-[10px] block mb-1">Estimated Net Margin</span>
                <span className="font-mono font-bold text-[#f5d90a] text-sm">
                  {product.estimatedMarginPct}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
                <span className="text-[#8a8f98] text-[10px] block mb-1">Opportunity Score</span>
                <span className="font-mono font-bold text-[#707bfb] text-sm">
                  {product.opportunityScore} / 100
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Candidate Tags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#f7f8f8]">
                Associated Candidate Tags ({product.tags.length})
              </h3>
              <button
                type="button"
                onClick={handleCopyTags}
                className="px-2.5 py-1 rounded bg-[#18181f] hover:bg-[#202029] border border-[#282835] text-xs text-[#8a8f98] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3 h-3 text-[#30a46c]" />
                    <span className="text-[#30a46c]">Copied All</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy All</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {product.tags.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCopySingleTag(t)}
                  className="px-2.5 py-1 rounded-md bg-[#18181f] hover:bg-[#22222b] border border-[#282835] text-xs text-[#8a8f98] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{t}</span>
                  {copiedTag === t ? (
                    <Check className="w-3 h-3 text-[#30a46c]" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-[#575a65]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Research Notes */}
          {product.notes && (
            <div className="p-3.5 rounded-xl bg-[#18181f] border border-[#282835] text-xs space-y-1">
              <span className="font-semibold text-[#f7f8f8] block">Research Notes</span>
              <p className="text-[#8a8f98] leading-relaxed">{product.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
