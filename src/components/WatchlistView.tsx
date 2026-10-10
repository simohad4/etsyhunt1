import React, { useState } from 'react';
import {
  ExternalLink,
  ShoppingCart,
  Flame,
  Star,
  Trash2,
  Download,
  Search,
  Copy,
  Check,
  Bookmark,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { EtsyListingItem } from '../types';

interface WatchlistViewProps {
  watchlist: EtsyListingItem[];
  onRemoveFromWatchlist: (id: string) => void;
  onClearWatchlist?: () => void;
  onAnalyzeListing?: (keyword: string) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlist,
  onRemoveFromWatchlist,
  onClearWatchlist,
  onAnalyzeListing
}) => {
  const [filterText, setFilterText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = watchlist.filter(
    (item) =>
      item.title.toLowerCase().includes(filterText.toLowerCase()) ||
      item.shopName.toLowerCase().includes(filterText.toLowerCase())
  );

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const exportCSV = () => {
    if (watchlist.length === 0) return;
    const headers = ['Listing ID', 'Title', 'Shop Name', 'Price', 'Currency', 'In Carts', 'Bought 24h', 'URL'];
    const rows = watchlist.map((item) => [
      `"${item.id}"`,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.shopName.replace(/"/g, '""')}"`,
      item.price,
      item.currency || 'USD',
      item.inCartCount || 0,
      item.boughtLast24h || 0,
      `"${item.url}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `etsy-hunter-watchlist-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white tracking-tight">Competitor Watchlist</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {watchlist.length} Tracked Listings
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor real-time shopping cart shifts, daily velocity, and price fluctuations across your top competitor listings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {watchlist.length > 0 && (
            <>
              <button
                onClick={exportCSV}
                className="px-3 py-1.5 rounded-lg bg-[#12131A] hover:bg-[#181A24] border border-white/[0.08] hover:border-white/[0.15] text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Export CSV</span>
              </button>

              {onClearWatchlist && (
                <button
                  onClick={onClearWatchlist}
                  className="px-3 py-1.5 rounded-lg bg-[#12131A] hover:bg-rose-950/40 border border-white/[0.08] hover:border-rose-500/30 text-zinc-400 hover:text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      {watchlist.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search watchlist by title or shop..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-[#101117] border border-white/[0.08] rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-orange-500/50"
            />
          </div>
        </div>
      )}

      {/* Table view */}
      {watchlist.length === 0 ? (
        <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#14151C] border border-white/[0.08] flex items-center justify-center mx-auto text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto">
            <h3 className="text-sm font-semibold text-zinc-200">No listings tracked yet</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Click the bookmark icon on any competitor row in Market Research to monitor its live buyer cart activity and daily velocity.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-[#0C0D12] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.07] bg-[#0F1017] text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  <th className="py-2.5 px-3">Listing</th>
                  <th className="py-2.5 px-3">Shop</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Live Carts</th>
                  <th className="py-2.5 px-3">24h Sales</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#12141D] transition-colors group"
                  >
                    <td className="py-2.5 px-3 max-w-md">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-10 h-10 rounded-md object-cover bg-zinc-900 border border-white/[0.08] shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=120&auto=format&fit=crop&q=60';
                          }}
                        />
                        <div className="min-w-0">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-zinc-200 hover:text-orange-400 transition-colors line-clamp-1 flex items-center gap-1 group/link"
                          >
                            <span>{item.title}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                          </a>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            ID: {item.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{item.shopName}</span>
                        {item.shopRating && (
                          <span className="flex items-center text-[10px] text-amber-400 font-mono">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
                            {item.shopRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-zinc-200 font-semibold">
                      ${item.price.toFixed(2)}
                    </td>

                    <td className="py-2.5 px-3">
                      {(item.inCartCount || 0) > 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-[11px] font-semibold">
                          <ShoppingCart className="w-3 h-3" />
                          <span>{item.inCartCount} in cart</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 font-mono text-[11px]">0</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {(item.boughtLast24h || 0) > 0 ? (
                        <div className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px] font-medium">
                          <Flame className="w-3 h-3" />
                          <span>{item.boughtLast24h} sold</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => copyUrl(item.id, item.url)}
                          className="p-1.5 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy listing URL"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onRemoveFromWatchlist(item.id)}
                          className="p-1.5 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove from watchlist"
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
      )}
    </div>
  );
};
