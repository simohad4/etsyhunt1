import React, { useState } from 'react';
import { ExternalLink, ShoppingCart, Flame, Star, ArrowUpDown, Download, Search, CheckCircle2 } from 'lucide-react';
import { EtsyListingItem } from '../types';

interface CompetitorsTableProps {
  competitors: EtsyListingItem[];
  keyword: string;
}

export const CompetitorsTable: React.FC<CompetitorsTableProps> = ({ competitors, keyword }) => {
  const [sortBy, setSortBy] = useState<'carts' | 'bought' | 'price' | 'rating'>('carts');
  const [filterText, setFilterText] = useState('');

  // Sorting
  const sorted = [...competitors]
    .filter((c) =>
      c.title.toLowerCase().includes(filterText.toLowerCase()) ||
      c.shopName.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'carts') return (b.inCartCount || 0) - (a.inCartCount || 0);
      if (sortBy === 'bought') return (b.boughtLast24h || 0) - (a.boughtLast24h || 0);
      if (sortBy === 'price') return b.price - a.price;
      if (sortBy === 'rating') return (b.shopRating || 0) - (a.shopRating || 0);
      return 0;
    });

  const exportToCSV = () => {
    const headers = ['Title', 'Shop Name', 'Price', 'Currency', 'In Carts', 'Bought Last 24h', 'Rating', 'Reviews', 'URL'];
    const rows = sorted.map((c) => [
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.shopName.replace(/"/g, '""')}"`,
      c.price,
      c.currency,
      c.inCartCount || 0,
      c.boughtLast24h || 0,
      c.shopRating || '',
      c.reviewsCount || 0,
      `"${c.url}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `etsy-hunter-${keyword.replace(/\s+/g, '-')}-competitors.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-4">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-400" />
            Top Etsy Competitors & Demand Velocity
          </h3>
          <p className="text-xs text-slate-400">
            Real-time listing metrics sorted by high buyer demand and active cart counts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick filter input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter listings..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 w-36 sm:w-44"
            />
          </div>

          {/* Export CSV button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-16">Item</th>
              <th className="py-3 px-3 min-w-[220px]">Listing Title & Shop</th>
              <th
                onClick={() => setSortBy('price')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  Price
                  <ArrowUpDown className={`w-3 h-3 ${sortBy === 'price' ? 'text-orange-400' : 'text-slate-600'}`} />
                </div>
              </th>
              <th
                onClick={() => setSortBy('carts')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  In Carts
                  <ArrowUpDown className={`w-3 h-3 ${sortBy === 'carts' ? 'text-orange-400' : 'text-slate-600'}`} />
                </div>
              </th>
              <th
                onClick={() => setSortBy('bought')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  Bought (24h)
                  <ArrowUpDown className={`w-3 h-3 ${sortBy === 'bought' ? 'text-orange-400' : 'text-slate-600'}`} />
                </div>
              </th>
              <th
                onClick={() => setSortBy('rating')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  Shop Rating
                  <ArrowUpDown className={`w-3 h-3 ${sortBy === 'rating' ? 'text-orange-400' : 'text-slate-600'}`} />
                </div>
              </th>
              <th className="py-3 px-3 text-right">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {sorted.map((item, idx) => {
              const highDemand = (item.inCartCount || 0) >= 15;

              return (
                <tr
                  key={item.id || idx}
                  className="hover:bg-slate-900/50 transition-colors group"
                >
                  {/* Thumbnail */}
                  <td className="py-2.5 px-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-900 overflow-hidden border border-slate-800 shrink-0 relative">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </td>

                  {/* Title & Shop */}
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-white group-hover:text-orange-300 transition-colors line-clamp-2 max-w-sm">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="text-slate-300 font-medium">{item.shopName}</span>
                      {item.isBestseller && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                          Bestseller
                        </span>
                      )}
                      {item.badge && (
                        <span className="text-slate-500 text-[10px]">
                          • {item.badge}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-bold text-white text-sm">
                      ${item.price.toFixed(2)}
                    </div>
                    {item.shippingPrice === 0 ? (
                      <div className="text-[10px] text-emerald-400 font-medium">Free Shipping</div>
                    ) : item.shippingPrice ? (
                      <div className="text-[10px] text-slate-500">+${item.shippingPrice} ship</div>
                    ) : null}
                  </td>

                  {/* In Cart Count */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {item.inCartCount ? (
                      <div className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${
                        highDemand
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {highDemand && <Flame className="w-3 h-3 fill-orange-400 text-orange-400" />}
                        <span>{item.inCartCount} in cart</span>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Bought in Last 24h */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {item.boughtLast24h ? (
                      <div className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{item.boughtLast24h} bought</span>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Rating */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-300 font-medium">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{item.shopRating?.toFixed(1) || '4.8'}</span>
                      <span className="text-slate-500 text-[10px]">
                        ({item.reviewsCount?.toLocaleString() || '150+'})
                      </span>
                    </div>
                  </td>

                  {/* External Link */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-orange-500 text-slate-400 hover:text-white border border-slate-800 hover:border-orange-500 transition-all"
                      title="Inspect on Etsy"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
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
