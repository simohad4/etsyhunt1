import React from 'react';
import { User, Store } from 'lucide-react';
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
    <div
      onClick={onOpenSettings}
      className={`w-full flex items-center justify-between p-2 rounded-lg bg-[#121216] border border-[#22222b] hover:border-[#333342] transition-colors cursor-pointer text-left ${
        collapsed ? 'justify-center p-2' : ''
      }`}
      title="Personal Workspace Settings"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-md bg-[#5e6ad2] flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm">
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
                : 'Free Account'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
