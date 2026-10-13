import React from 'react';
import { AlertTriangle, Info, PauseCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EtsyHunterStatusBannerProps {
  onOpenSettings?: () => void;
  onSeedDemoData?: () => void;
  totalListingsCount: number;
}

export const EtsyHunterStatusBanner: React.FC<EtsyHunterStatusBannerProps> = ({
  onOpenSettings,
  onSeedDemoData,
  totalListingsCount
}) => {
  const { workspace } = useAuth();
  if (!workspace) return null;

  const hasActiveSubscription = workspace.plan !== 'none';
  const isLowCredits = hasActiveSubscription && workspace.creditsRemaining <= 2;

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-[#24242b] bg-[#101014] px-3 py-2 text-[11px] text-[#91919b] sm:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#65d39a]" aria-hidden="true" />
          <span className="max-w-36 truncate font-medium text-[#d7d7dc] sm:max-w-none">{workspace.name}</span>
          <span className="rounded border border-[#303039] bg-[#18181d] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#91919b]">
            {hasActiveSubscription ? `${workspace.plan} plan` : 'No plan'}
          </span>
        </div>
        <span className="hidden text-[#3f3f47] sm:inline">/</span>
        <span className={`tabular-nums ${isLowCredits ? 'text-[#ff8b8f]' : 'text-[#a1a1aa]'}`}>
          {workspace.creditsRemaining} of {workspace.totalCredits} research credits
        </span>
        <span className="hidden items-center gap-1.5 text-[#777781] md:flex">
          <PauseCircle className="h-3.5 w-3.5" />
          Live research paused
        </span>
      </div>

      <div className="flex items-center gap-2">
        {totalListingsCount === 0 && onSeedDemoData && (
          <button type="button" onClick={onSeedDemoData} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[#9da0ff] transition-colors hover:bg-[#6c70dc]/10 hover:text-white">
            <Info className="h-3.5 w-3.5" />
            Load labeled demo
          </button>
        )}
        {onOpenSettings && (!hasActiveSubscription || isLowCredits) && (
          <button type="button" onClick={onOpenSettings} className="inline-flex items-center gap-1.5 rounded-md border border-[#d6b84c]/25 bg-[#d6b84c]/8 px-2 py-1 text-[#e8d58c] transition-colors hover:bg-[#d6b84c]/14">
            <AlertTriangle className="h-3.5 w-3.5" />
            {hasActiveSubscription ? 'Review usage' : 'View plans'}
          </button>
        )}
      </div>
    </div>
  );
};
