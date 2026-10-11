import React, { useState } from 'react';
import {
  Bookmark,
  Database,
  DollarSign,
  Download,
  Plus,
  Store,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  DashboardDataTable,
  DashboardEmptyState,
  DashboardFilterBar,
  DashboardPageHeader,
  DashboardStatCard,
  DashboardStatusIndicator,
  type DashboardTableColumn
} from './dashboard/DashboardUI';

interface EtsyHunterWatchlistProps {
  onOpenTagAnalyzer: () => void;
}

export const EtsyHunterWatchlist: React.FC<EtsyHunterWatchlistProps> = ({ onOpenTagAnalyzer }) => {
  const { workspace, savedListings, removeSavedListing } = useAuth();
  const [filterQuery, setFilterQuery] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const normalizedQuery = filterQuery.trim().toLowerCase();
  const filteredSaved = savedListings.filter((item) => {
    if (!normalizedQuery) return true;
    return (
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.shopName.toLowerCase().includes(normalizedQuery) ||
      item.identifier.toLowerCase().includes(normalizedQuery)
    );
  });
  const remainingSlots = Math.max(0, (workspace?.maxSavedListings ?? 0) - savedListings.length);
  const storedEstimatedRevenue = savedListings.reduce(
    (total, item) => total + item.estimatedMonthlyRevenue,
    0
  );
  const uniqueShops = new Set(savedListings.map((item) => item.shopName)).size;

  const exportCSV = () => {
    if (savedListings.length === 0) return;
    const headers = [
      'Identifier',
      'Title',
      'Shop',
      'Stored Price',
      'Est Monthly Revenue',
      'Competition Rating',
      'Added At'
    ];
    const rows = savedListings.map((item) => [
      item.identifier,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.shopName.replace(/"/g, '""')}"`,
      item.observedPrice,
      item.estimatedMonthlyRevenue,
      item.competition,
      `"${item.addedAt.replace(/"/g, '""')}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `etsyhunter_saved_listings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveSavedListing = async (productId: string) => {
    setMutationError(null);
    const result = await removeSavedListing(productId);
    if (!result.success) {
      setMutationError(result.error || 'Unable to remove this saved listing right now.');
    }
  };

  type SavedListing = (typeof savedListings)[number];
  const columns: DashboardTableColumn<SavedListing>[] = [
    {
      key: 'listing',
      header: 'Item & title',
      render: (item) => (
        <div className="flex items-center gap-3">
          <img
            src={item.imageUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg border border-[#282835] object-cover"
            loading="lazy"
          />
          <div className="min-w-0 max-w-xs sm:max-w-md">
            <span className="mb-0.5 block font-mono text-[10px] font-semibold text-[#707bfb]">
              {item.identifier}
            </span>
            <span className="block truncate font-medium text-[#f7f8f8]">{item.title}</span>
          </div>
        </div>
      )
    },
    {
      key: 'shop',
      header: 'Shop name',
      className: 'font-medium text-[#8a8f98]',
      render: (item) => item.shopName
    },
    {
      key: 'price',
      header: 'Stored price',
      className: 'font-mono text-[#f7f8f8]',
      render: (item) => `$${item.observedPrice.toFixed(2)}`
    },
    {
      key: 'revenue',
      header: 'Est. monthly revenue',
      className: 'font-mono font-semibold text-[#30a46c]',
      render: (item) => `$${item.estimatedMonthlyRevenue.toLocaleString()}/mo`
    },
    {
      key: 'competition',
      header: 'Competition',
      render: (item) => (
        <DashboardStatusIndicator
          label={item.competition}
          tone={item.competition === 'low' ? 'success' : item.competition === 'medium' ? 'warning' : 'danger'}
          dot={false}
        />
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (item) => (
        <button
          type="button"
          onClick={() => void handleRemoveSavedListing(item.productId)}
          className="rounded-lg p-2 text-[#575a65] transition-colors hover:bg-[#e5484d]/10 hover:text-[#e5484d]"
          title="Remove from saved listings"
          aria-label={`Remove ${item.title} from saved listings`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <DashboardPageHeader
        eyebrow="Customer workspace"
        title="Saved listings"
        description="Review candidate listings saved to your personal Supabase workspace. Revenue values remain estimates, not verified shop sales."
        icon={<Bookmark className="h-5 w-5" />}
        meta={<DashboardStatusIndicator label="Supabase data" tone="success" title="These records are loaded from your authenticated workspace." />}
        actions={
          <>
            <button
              type="button"
              onClick={exportCSV}
              disabled={savedListings.length === 0}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#282835] bg-[#18181f] px-3 text-xs font-medium text-[#f7f8f8] transition-colors hover:border-[#383848] hover:bg-[#202029] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5 text-[#8a8f98]" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={onOpenTagAnalyzer}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#5e6ad2] px-3 text-xs font-semibold text-white shadow-[0_0_14px_rgba(94,106,210,0.3)] transition-colors hover:bg-[#6875e5]"
            >
              <Plus className="h-3.5 w-3.5" />
              Research preview
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Saved records"
          value={savedListings.length}
          description={`${remainingSlots} workspace slots remaining`}
          icon={<Database className="h-4 w-4" />}
          tone="indigo"
        />
        <DashboardStatCard
          label="Workspace quota"
          value={workspace?.maxSavedListings ?? 0}
          description="Maximum saved listings for the active plan"
          icon={<Bookmark className="h-4 w-4" />}
          tone="green"
        />
        <DashboardStatCard
          label="Stored est. revenue"
          value={savedListings.length > 0 ? `$${storedEstimatedRevenue.toLocaleString()}` : '—'}
          description="Sum of stored estimates; not verified sales"
          icon={<DollarSign className="h-4 w-4" />}
          tone="green"
        />
        <DashboardStatCard
          label="Unique shops"
          value={savedListings.length > 0 ? uniqueShops : '—'}
          description="Distinct shop names in saved records"
          icon={<Store className="h-4 w-4" />}
          tone="neutral"
        />
      </div>

      {mutationError && (
        <div role="alert" className="rounded-xl border border-[#e5484d]/30 bg-[#e5484d]/10 px-4 py-3 text-xs text-[#ff7b80]">
          {mutationError}
        </div>
      )}

      {savedListings.length > 0 && (
        <DashboardFilterBar
          value={filterQuery}
          onChange={setFilterQuery}
          placeholder="Filter by title, shop, or listing ID…"
          ariaLabel="Filter saved listings"
          resultLabel={`Showing ${filteredSaved.length} of ${savedListings.length} saved listings`}
        />
      )}

      {filteredSaved.length > 0 ? (
        <DashboardDataTable
          rows={filteredSaved}
          columns={columns}
          getRowKey={(item) => item.id}
          caption="Saved listing records from the active Supabase workspace"
        />
      ) : savedListings.length > 0 ? (
        <DashboardEmptyState
          title="No saved listings match this filter"
          description="Try a different title, shop name, or listing ID. Your saved records have not been changed."
          icon={<Bookmark className="h-6 w-6" />}
          action={
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="rounded-lg border border-[#282835] bg-[#18181f] px-4 py-2 text-xs font-medium text-[#f7f8f8] transition-colors hover:bg-[#22222b]"
            >
              Clear filter
            </button>
          }
        />
      ) : (
        <DashboardEmptyState
          title="No saved listings yet"
          description="Verified saved records will appear here when an enabled research source provides a listing you choose to save."
          icon={<Bookmark className="h-6 w-6" />}
          action={
            <button
              type="button"
              onClick={onOpenTagAnalyzer}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5e6ad2] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(94,106,210,0.3)] transition-colors hover:bg-[#6875e5]"
            >
              <Plus className="h-3.5 w-3.5" />
              View research preview
            </button>
          }
        />
      )}
    </div>
  );
};
