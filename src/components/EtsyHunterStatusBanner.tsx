import React from 'react';
import { ArrowRight, Zap, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EtsyHunterStatusBannerProps {
  onOpenSettings?: () => void;
  onOpenResearch?: () => void;
  onSeedDemoData?: () => void;
  totalListingsCount: number;
}

export const EtsyHunterStatusBanner: React.FC<EtsyHunterStatusBannerProps> = ({
  onOpenSettings,
  onOpenResearch,
  onSeedDemoData,
  totalListingsCount
}) => {
  const { workspace } = useAuth();

  if (!workspace) return null;

  const isLowCredits = workspace.creditsRemaining <= 2;

  return (
    <div className="w-full bg-[#121216]/90 border-b border-[#22222b] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8a8f98]">
      {/* Left side: Active Personal Workspace indicator & Research Credits */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#30a46c]" />
          </span>
          <span className="text-[#f7f8f8] font-medium">
            {workspace.name}
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#5e6ad2]/20 text-[#707bfb] border border-[#5e6ad2]/30 font-semibold">
            {workspace.plan === 'none' ? 'No Subscription' : `${workspace.plan} Plan`}
          </span>
        </div>

        <span className="text-[#575a65] hidden sm:inline">·</span>

        <div className="flex items-center gap-2 text-[11px]">
          <span>Research Credits:</span>
          <span
            className={`font-mono font-semibold ${
              isLowCredits ? 'text-[#e5484d]' : 'text-[#f7f8f8]'
            }`}
          >
            {workspace.creditsRemaining} / {workspace.totalCredits} available
          </span>
        </div>

        {totalListingsCount === 0 && onSeedDemoData && (
          <div className="flex items-center gap-1.5 text-[#8a8f98] bg-[#18181f] px-2 py-0.5 rounded border border-[#282835]">
            <Info className="w-3 h-3 text-[#5e6ad2] shrink-0" />
            <span>Empty library?</span>
            <button
              onClick={onSeedDemoData}
              className="text-[#707bfb] underline hover:text-white font-medium cursor-pointer ml-1"
            >
              Load 4 sample listings
            </button>
          </div>
        )}
      </div>

      {/* Right side: Quick hints and upgrade button */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className="hidden md:flex items-center gap-2 text-[#575a65]">
          <span>1 Credit = 1 Page (~36 listings)</span>
          <span className="text-[#22222b]">|</span>
          <span className="eh-kbd text-[10px]">⌘K</span>
          <span>command menu</span>
        </div>

        {isLowCredits && onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="px-2 py-1 rounded bg-[#e5484d]/15 text-[#e5484d] border border-[#e5484d]/30 text-xs font-medium hover:bg-[#e5484d]/25 transition-colors cursor-pointer flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Manage Plan</span>
          </button>
        )}
      </div>
    </div>
  );
};
