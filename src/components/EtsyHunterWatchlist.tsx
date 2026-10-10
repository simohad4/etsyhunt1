import React, { useState } from 'react';
import {
  Bookmark,
  Search,
  Trash2,
  ExternalLink,
  Download,
  Plus,
  Tag,
  DollarSign,
  TrendingUp,
  Percent,
  Copy,
  Check,
  Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EtsyProductItem } from '../types/etsyHunter';

interface EtsyHunterWatchlistProps {
  onSelectProduct: (product: EtsyProductItem) => void;
  onOpenTagAnalyzer: () => void;
  allProducts: EtsyProductItem[];
  onRemoveFromWatchlist?: (id: string) => void;
}

export const EtsyHunterWatchlist: React.FC<EtsyHunterWatchlistProps> = ({
  onSelectProduct,
  onOpenTagAnalyzer,
  allProducts,
  onRemoveFromWatchlist
}) => {
  const { activeWorkspace, watchlist, removeFromWatchlist } = useAuth();
  const [filterQuery, setFilterQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Match items in watchlist with full product details
  const watchedProducts = allProducts.filter((p) =>
    watchlist.some((w) => w.productId === p.id) || p.stage === 'tracked'
  );

  const filteredProducts = watchedProducts.filter((item) => {
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.shopName.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  const exportCSV = () => {
    if (watchedProducts.length === 0) return;
    const headers = [
      'ID',
      'Title',
      'Shop',
      'Price',
      'Est Monthly Revenue',
      'Monthly Sales',
      'In Cart',
      'Competition',
      'Category',
      'Tags'
    ];
    const rows = watchedProducts.map((p) => [
      p.identifier,
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.shopName}"`,
      p.price,
      p.estimatedMonthlyRevenue,
      p.monthlySales,
      p.inCartCount,
      p.competition,
      `"${p.category}"`,
      `"${p.tags.join(', ')}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `etsyhunter_watchlist_${activeWorkspace?.slug || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyTags = (e: React.MouseEvent, id: string, tags: string[]) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tags.join(', '));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const categories = Array.from(new Set(allProducts.map((p) => p.category)));

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#121216] border border-[#22222b]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#5e6ad2]" />
            <h2 className="text-base font-bold text-[#f7f8f8]">
              Etsy Competitor Watchlist &amp; Radar
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#18181f] text-[#707bfb] border border-[#282835]">
              {watchedProducts.length} Tracked
            </span>
          </div>
          <p className="text-xs text-[#8a8f98]">
            Items pinned to your active workspace (<span className="text-white font-medium">{activeWorkspace?.name}</span>). Monitor live cart shifts and tag iterations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCSV}
            disabled={watchedProducts.length === 0}
            className="px-3 py-1.5 rounded-lg bg-[#18181f] hover:bg-[#202029] border border-[#282835] text-xs font-medium text-[#f7f8f8] flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#8a8f98]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenTagAnalyzer}
            className="px-3 py-1.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-medium flex items-center gap-1.5 shadow-[0_0_14px_rgba(94,106,210,0.35)] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Scan &amp; Add Listing</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Filter by title, shop name, or tag..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#121216] border border-[#22222b] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2]"
          />
          <Search className="w-3.5 h-3.5 text-[#575a65] absolute left-3 top-2.5" />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 ${
              categoryFilter === 'all'
                ? 'bg-[#18181f] text-[#f7f8f8] border border-[#282835] font-medium'
                : 'text-[#8a8f98] hover:text-[#f7f8f8]'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 ${
                categoryFilter === cat
                  ? 'bg-[#18181f] text-[#f7f8f8] border border-[#282835] font-medium'
                : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table / Cards */}
      {filteredProducts.length > 0 ? (
        <div className="rounded-xl bg-[#121216] border border-[#22222b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e0e13] border-b border-[#22222b] text-[#8a8f98] font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Item &amp; Title</th>
                  <th className="py-3 px-4">Shop</th>
                  <th className="py-3 px-4">Est. Revenue</th>
                  <th className="py-3 px-4">Buyers in Cart</th>
                  <th className="py-3 px-4">Competition</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22222b]/60">
                {filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProduct(p)}
                    className="hover:bg-[#18181f] transition-colors cursor-pointer group"
                  >
                    {/* Item & Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-10 h-10 rounded-md object-cover border border-[#282835] shrink-0"
                        />
                        <div className="min-w-0 max-w-xs sm:max-w-md">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[#707bfb] text-[11px] font-semibold">
                              {p.identifier}
                            </span>
                            <span className="text-[10px] text-[#575a65] font-mono">
                              ${p.price.toFixed(2)}
                            </span>
                            {p.isBestseller && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-[#f5d90a]/10 text-[#f5d90a] font-mono border border-[#f5d90a]/20">
                                Bestseller
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#f7f8f8] font-medium truncate group-hover:text-white">
                            {p.title}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Shop */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-[#f7f8f8] font-medium">{p.shopName}</div>
                      <div className="flex items-center gap-1 text-[11px] text-[#8a8f98]">
                        <Star className="w-3 h-3 text-[#f5d90a] fill-[#f5d90a]" />
                        <span>{p.shopRating}</span>
                        <span className="text-[#575a65]">({p.reviewsCount})</span>
                      </div>
                    </td>

                    {/* Est. Revenue */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-[#30a46c] font-semibold text-xs">
                        ${p.estimatedMonthlyRevenue.toLocaleString()}/mo
                      </div>
                      <div className="text-[10px] text-[#575a65] font-mono">
                        {p.monthlySales} sales/mo
                      </div>
                    </td>

                    {/* Buyers in Cart */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e5484d] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e5484d]" />
                        </span>
                        <span className="font-mono text-[#f7f8f8] font-medium">
                          {p.inCartCount} in cart
                        </span>
                      </div>
                    </td>

                    {/* Competition */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono uppercase text-[9px] font-semibold border ${
                          p.competition === 'low'
                            ? 'bg-[#299764]/10 text-[#30a46c] border-[#299764]/30'
                            : p.competition === 'medium'
                            ? 'bg-[#f5d90a]/10 text-[#f5d90a] border-[#f5d90a]/30'
                            : 'bg-[#e5484d]/10 text-[#e5484d] border-[#e5484d]/30'
                        }`}
                      >
                        {p.competition}
                      </span>
                    </td>

                    {/* Tags */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleCopyTags(e, p.id, p.tags)}
                          className="px-2 py-1 rounded bg-[#18181f] hover:bg-[#202029] border border-[#282835] text-[11px] text-[#8a8f98] hover:text-[#f7f8f8] flex items-center gap-1 transition-colors"
                          title="Copy all 13 Etsy tags to clipboard"
                        >
                          {copiedId === p.id ? (
                            <>
                              <Check className="w-3 h-3 text-[#30a46c]" />
                              <span className="text-[#30a46c]">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy {p.tags.length} Tags</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.etsyUrl && (
                          <a
                            href={p.etsyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded text-[#575a65] hover:text-[#f7f8f8] hover:bg-[#202029]"
                            title="View live on Etsy"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRemoveFromWatchlist) onRemoveFromWatchlist(p.id);
                            else removeFromWatchlist(p.id);
                          }}
                          className="p-1.5 rounded text-[#575a65] hover:text-[#e5484d] hover:bg-[#e5484d]/10 transition-colors"
                          title="Remove from Watchlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-2xl bg-[#121216] border border-[#22222b] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#18181f] border border-[#282835] flex items-center justify-center mx-auto text-[#5e6ad2]">
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-sm font-semibold text-[#f7f8f8]">
              No listings in your workspace radar yet
            </h3>
            <p className="text-xs text-[#8a8f98]">
              Click the bookmark icon on any research card or run the Tag Analyzer to pin winning competitor products here.
            </p>
          </div>
          <button
            onClick={onOpenTagAnalyzer}
            className="px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-[0_0_16px_rgba(94,106,210,0.35)] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch Tag Analyzer</span>
          </button>
        </div>
      )}
    </div>
  );
};
