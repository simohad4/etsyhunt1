import React from 'react';
import { useAuth } from '../context/AuthContext';

interface EtsyHunterWorkspaceSwitcherProps {
  onOpenSettings: () => void;
  collapsed?: boolean;
}

export const EtsyHunterWorkspaceSwitcher: React.FC<EtsyHunterWorkspaceSwitcherProps> = ({
  onOpenSettings,
  collapsed = false
}) => {
  const { workspace } = useAuth();

  return (
    <button
      type="button"
      onClick={onOpenSettings}
      className={`flex w-full items-center justify-between rounded-md border border-[#24242b] bg-[#111115] p-2 text-left transition-colors hover:border-[#363640] hover:bg-[#15151a] ${
        collapsed ? 'justify-center' : ''
      }`}
      title="Open account settings"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#777bea]/50 bg-[#686cdf] text-xs font-bold text-white">
          {workspace?.name?.charAt(0) || 'P'}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#f7f8f8] truncate">
              {workspace?.name || 'Personal Workspace'}
            </div>
            <div className="text-[10px] font-mono text-[#8a8f98] uppercase">
              {workspace?.plan && workspace.plan !== 'none'
                ? `${workspace.plan} Plan`
                : 'No Subscription'}
            </div>
          </div>
        )}
      </div>
    </button>
  );
};
