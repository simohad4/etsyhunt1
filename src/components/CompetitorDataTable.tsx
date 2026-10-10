import React, { useState } from 'react';
import {
  ExternalLink,
  ShoppingCart,
  Flame,
  Star,
  ArrowUpDown,
  Download,
  Search,
  Copy,
  Check,
  Filter,
  CheckSquare,
  Square,
  Bookmark
} from 'lucide-react';
import { EtsyListingItem } from '../types';

interface CompetitorDataTableProps {
  competitors: EtsyListingItem[];
  keyword: string;
  watchlistIds?: string[];
  onToggleWatchlist?: (item: EtsyListingItem) => void;
}

export const CompetitorDataTable: React.FC<CompetitorDataTableProps> = ({
  competitors,
  keyword,
  watchlistIds = [],
  onToggleWatchlist
}) => {
  const [sortBy, setSortBy] = useState<'carts' | 'bought' | 'price' | 'rating'>('carts');
  const [filterText, setFilterText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sorting and filtering
  const filtered = competitors.filter(
    (c) =>
      c.title.toLowerCase().includes(filterText.toLowerCase()) ||
      c.shopName.toLowerCase().includes(filterText.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'carts') return (b.inCartCount || 0) - (a.inCartCount || 0);
    if (sortBy === 'bought') return (b.boughtLast24h || 0) - (a.boughtLast24h || 0);
    if (sortBy === 'price') return b.price - a.price;
    if (sortBy === 'rating') return (b.shopRating || 0) - (a.shopRating || 0);
    return 0;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === sorted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sorted.map((s) => s.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = () => {
    const targetData = selectedIds.length > 0 ? sorted.filter((s) => selectedIds.includes(s.id)) : sorted;
    if (targetData.length === 0) return;

    const headers = [
      'Listing ID',
      'Title',
      'Shop Name',
      'Price',
      'Currency',
      'In Carts',
      'Bought 24h',
      'Rating',
      'Reviews Count',
      'Is Bestseller',
      'Etsy URL'
    ];

    const rows = targetData.map((c) => [
      `"${c.id}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.shopName.replace(/"/g, '""')}"`,
      c.price,
      c.currency,
      c.inCartCount || 0,
      c.boughtLast24h || 0,
      c.shopRating || '',
      c.reviewsCount || 0,
      c.isBestseller ? 'Yes' : 'No',
      `"${c.url}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `etsyhunter_${keyword.replace(/\s+/g, '_')}_competitors.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] overflow-hidden shadow-sm">
      {/* Table Toolbar (Etsy Hunter Style) */}
      <div className="p-3.5 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0C11]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter listings or shops..."
              className="h-8 pl-8 pr-3 text-xs bg-[#12131A] border border-white/[0.08] hover:border-white/[0.14] focus:border-orange-500/50 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-none w-48 sm:w-64 transition-colors"
            />
          </div>

          <div className="text-xs text-zinc-400 font-mono">
            <span>{sorted.length}</span>
            <span className="text-zinc-600">/{competitors.length} rows</span>
          </div>
        </div>

        {/* Sort & CSV Action */}
        <div className="flex items-center gap-2">
          {/* Sort tabs */}
          <div className="flex items-center bg-[#12131A] border border-white/[0.08] rounded-md p-0.5 text-[11px]">
            <button
              onClick={() => setSortBy('carts')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                sortBy === 'carts' ? 'bg-white/[0.1] text-orange-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Carts ↓
            </button>
            <button
              onClick={() => setSortBy('bought')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                sortBy === 'bought' ? 'bg-white/[0.1] text-orange-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              24h Orders ↓
            </button>
            <button
              onClick={() => setSortBy('price')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                sortBy === 'price' ? 'bg-white/[0.1] text-orange-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Price
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[#12131A] hover:bg-[#161822] border border-white/[0.08] hover:border-white/[0.15] text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Etsy Hunter-grade Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0A0B10] text-[10px] uppercase font-semibold tracking-wider text-zinc-500 select-none">
              <th className="py-2.5 pl-4 pr-2 w-8">
                <button
                  onClick={toggleSelectAll}
                  className="text-zinc-500 hover:text-zinc-300 cursor-pointer block"
                >
                  {selectedIds.length === sorted.length && sorted.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-orange-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                </button>
              </th>
              <th className="py-2.5 px-3">Listing Details</th>
              <th className="py-2.5 px-3">Shop</th>
              <th className="py-2.5 px-3">Price</th>
              <th className="py-2.5 px-3">In Carts</th>
              <th className="py-2.5 px-3">24h Sales</th>
              <th className="py-2.5 px-3">Reviews</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 pr-4 pl-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {sorted.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isHighDemand = (item.inCartCount || 0) >= 15;

              return (
                <tr
                  key={item.id}
                  className={`group transition-colors ${
                    isSelected ? 'bg-orange-500/[0.04]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-3 pl-4 pr-2">
                    <button
                      onClick={() => toggleSelectRow(item.id)}
                      className="text-zinc-600 hover:text-zinc-300 cursor-pointer block"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-orange-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>

                  {/* Thumbnail & Title */}
                  <td className="py-3 px-3 max-w-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#14151C] border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-[10px] text-zinc-600 font-mono">ETSY</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-zinc-200 hover:text-orange-400 line-clamp-1 transition-colors block text-xs"
                          title={item.title}
                        >
                          {item.title}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 font-mono">
                          <span>ID: {item.id}</span>
                          {item.badge && (
                            <>
                              <span>·</span>
                              <span>{item.badge}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Shop Name */}
                  <td className="py-3 px-3">
                    <span className="text-zinc-300 font-medium text-xs truncate block max-w-[120px]">
                      {item.shopName}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Verified Seller</span>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-3">
                    <div className="font-mono font-medium text-zinc-100 text-xs">
                      ${item.price.toFixed(2)}
                    </div>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <div className="text-[10px] text-zinc-500 line-through font-mono">
                        ${item.originalPrice.toFixed(2)}
                      </div>
                    )}
                  </td>

                  {/* In Cart Velocity Indicator */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isHighDemand
                            ? 'bg-orange-400 shadow-[0_0_6px_#F97316]'
                            : (item.inCartCount || 0) > 0
                            ? 'bg-emerald-400 shadow-[0_0_6px_#10B981]'
                            : 'bg-zinc-600'
                        }`}
                      />
                      <span
                        className={`font-mono font-semibold text-xs ${
                          isHighDemand ? 'text-orange-400' : 'text-zinc-200'
                        }`}
                      >
                        {item.inCartCount || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block">active carts</span>
                  </td>

                  {/* 24h Sales */}
                  <td className="py-3 px-3">
                    <div className="font-mono text-zinc-200 text-xs">
                      {item.boughtLast24h ? `${item.boughtLast24h}+ sold` : '—'}
                    </div>
                    <span className="text-[10px] text-zinc-500 block">last 24h</span>
                  </td>

                  {/* Reviews & Star Rating */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 text-zinc-200 font-mono text-xs">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{item.shopRating ? item.shopRating.toFixed(1) : '5.0'}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono block">
                      ({item.reviewsCount || 0})
                    </span>
                  </td>

                  {/* Tags / Status */}
                  <td className="py-3 px-3">
                    {item.isBestseller ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Flame className="w-2.5 h-2.5" />
                        <span>BESTSELLER</span>
                      </span>
                    ) : isHighDemand ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <span>HIGH VELOCITY</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-600 font-mono">REGULAR</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 pr-4 pl-2 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      {onToggleWatchlist && (
                        <button
                          onClick={() => onToggleWatchlist(item)}
                          title={watchlistIds.includes(item.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            watchlistIds.includes(item.id)
                              ? 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/20'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
                          }`}
                        >
                          <Bookmark
                            className={`w-3.5 h-3.5 ${
                              watchlistIds.includes(item.id) ? 'fill-orange-400 text-orange-400' : ''
                            }`}
                          />
                        </button>
                      )}

                      <button
                        onClick={() => copyUrl(item.id, item.url)}
                        title="Copy Etsy URL"
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors cursor-pointer"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on Etsy"
                        className="p-1 rounded text-zinc-400 hover:text-orange-400 hover:bg-white/[0.05] transition-colors inline-block"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
