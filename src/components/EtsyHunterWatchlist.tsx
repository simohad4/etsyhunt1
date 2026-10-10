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
  Star,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EtsyProductItem } from '../types/etsyHunter';

interface EtsyHunterWatchlistProps {
  onSelectProduct: (product: EtsyProductItem) => void;
  onOpenTagAnalyzer: () => void;
  allProducts: EtsyProductItem[];
}

export const EtsyHunterWatchlist: React.FC<EtsyHunterWatchlistProps> = ({
  onSelectProduct,
  onOpenTagAnalyzer,
  allProducts
}) => {
  const { workspace, savedListings, removeSavedListing } = useAuth();
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Match saved listing IDs with available products, or render saved listing item details
  const filteredSaved = savedListings.filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.shopName.toLowerCase().includes(q) ||
      item.identifier.toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    if (savedListings.length === 0) return;
    const headers = [
      'Identifier',
      'Title',
      'Shop',
      'Observed Price',
      'Est Monthly Revenue',
      'Competition Rating',
      'Added At'
    ];
    const rows = savedListings.map((p) => [
      p.identifier,
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.shopName}"`,
      p.observedPrice,
      p.estimatedMonthlyRevenue,
      p.competition,
      `"${p.addedAt}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `etsyhunter_saved_listings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner & Control Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#121216] border border-[#22222b]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#5e6ad2]" />
            <h2 className="text-base font-bold text-[#f7f8f8]">
              Saved Listings
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#18181f] text-[#707bfb] border border-[#282835]">
              {savedListings.length} / {workspace?.maxSavedListings || 50}
            </span>
          </div>
          <p className="text-xs text-[#8a8f98]">
            Curated candidate listings saved in your personal workspace for deeper analysis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCSV}
            disabled={savedListings.length === 0}
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
            <span>Explore More Listings</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {savedListings.length > 0 && (
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Filter saved listings by title, shop name, or ID..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#121216] border border-[#22222b] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2]"
          />
          <Search className="w-3.5 h-3.5 text-[#575a65] absolute left-3 top-2.5" />
        </div>
      )}

      {/* Products Table or Clean Empty State */}
      {filteredSaved.length > 0 ? (
        <div className="rounded-xl bg-[#121216] border border-[#22222b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e0e13] border-b border-[#22222b] text-[#8a8f98] font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Item &amp; Title</th>
                  <th className="py-3 px-4">Shop Name</th>
                  <th className="py-3 px-4">Observed Price</th>
                  <th className="py-3 px-4">Est. Monthly Revenue</th>
                  <th className="py-3 px-4">Competition</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22222b]/60">
                {filteredSaved.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#18181f] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-10 h-10 rounded-md object-cover border border-[#282835] shrink-0"
                        />
                        <div className="min-w-0 max-w-xs sm:max-w-md">
                          <span className="font-mono text-[#707bfb] text-[11px] font-semibold block mb-0.5">
                            {item.identifier}
                          </span>
                          <span className="text-xs text-[#f7f8f8] font-medium truncate block">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#8a8f98] font-medium">
                      {item.shopName}
                    </td>

                    <td className="py-3 px-4 font-mono text-[#f7f8f8]">
                      ${item.observedPrice.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 font-mono text-[#30a46c] font-semibold">
                      ${item.estimatedMonthlyRevenue.toLocaleString()}/mo
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono uppercase text-[9px] font-semibold border ${
                          item.competition === 'low'
                            ? 'bg-[#299764]/10 text-[#30a46c] border-[#299764]/30'
                            : item.competition === 'medium'
                            ? 'bg-[#f5d90a]/10 text-[#f5d90a] border-[#f5d90a]/30'
                            : 'bg-[#e5484d]/10 text-[#e5484d] border-[#e5484d]/30'
                        }`}
                      >
                        {item.competition}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => removeSavedListing(item.productId)}
                        className="p-1.5 rounded text-[#575a65] hover:text-[#e5484d] hover:bg-[#e5484d]/10 transition-colors cursor-pointer"
                        title="Remove from saved listings"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Meaningful Empty State for New Users */
        <div className="p-12 text-center rounded-2xl bg-[#121216] border border-[#22222b] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#18181f] border border-[#282835] flex items-center justify-center mx-auto text-[#5e6ad2]">
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-sm font-semibold text-[#f7f8f8]">
              No saved listings yet
            </h3>
            <p className="text-xs text-[#8a8f98] leading-relaxed">
              When researching niches, click the bookmark icon or &ldquo;Save Listing&rdquo; on any candidate to build your personal product tracking library.
            </p>
          </div>
          <button
            onClick={onOpenTagAnalyzer}
            className="px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-[0_0_16px_rgba(94,106,210,0.35)] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start a Product Search</span>
          </button>
        </div>
      )}
    </div>
  );
};
