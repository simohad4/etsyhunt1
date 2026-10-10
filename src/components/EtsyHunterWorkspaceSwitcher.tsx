import React, { useState } from 'react';
import { ChevronDown, Plus, Check, Settings, Sparkles, Building2, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EtsyHunterWorkspaceSwitcherProps {
  onOpenSettings: () => void;
  collapsed?: boolean;
}

export const EtsyHunterWorkspaceSwitcher: React.FC<EtsyHunterWorkspaceSwitcherProps> = ({
  onOpenSettings,
  collapsed = false
}) => {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    createWorkspace(newWsName.trim(), 'standard');
    setNewWsName('');
    setIsCreating(false);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-2 rounded-lg bg-[#121216] border border-[#22222b] hover:border-[#333342] transition-colors cursor-pointer text-left ${
          collapsed ? 'justify-center p-2' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#5e6ad2] flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm">
            {activeWorkspace?.name.charAt(0) || 'E'}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#f7f8f8] truncate">
                {activeWorkspace?.name || 'Etsy Hunter Workspace'}
              </div>
              <div className="text-[10px] font-mono text-[#8a8f98] uppercase">
                {activeWorkspace?.plan || 'Free'} Plan
              </div>
            </div>
          )}
        </div>

        {!collapsed && <ChevronDown className="w-3.5 h-3.5 text-[#8a8f98] shrink-0 ml-1" />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setIsCreating(false);
            }}
          />
          <div className="absolute top-full left-0 mt-1.5 w-64 rounded-xl bg-[#121216] border border-[#22222b] shadow-2xl p-2 z-50 animate-in fade-in duration-100">
            <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#575a65]">
              Etsy Shops &amp; Workspaces
            </div>

            <div className="space-y-1 my-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    switchWorkspace(ws.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    ws.id === activeWorkspace?.id
                      ? 'bg-[#18181f] text-[#f7f8f8] font-medium border border-[#282835]'
                      : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#18181f]/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Store className="w-3.5 h-3.5 text-[#5e6ad2] shrink-0" />
                    <span className="truncate">{ws.name}</span>
                  </div>
                  {ws.id === activeWorkspace?.id && (
                    <Check className="w-3.5 h-3.5 text-[#30a46c] shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>

            {/* Create new workspace trigger */}
            {isCreating ? (
              <form onSubmit={handleCreate} className="mt-2 pt-2 border-t border-[#22222b] p-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Boho Jewelry Studio"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2] mb-2"
                />
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 py-1 rounded bg-[#5e6ad2] text-white text-xs font-medium cursor-pointer"
                  >
                    Add Shop
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2 py-1 rounded bg-[#18181f] text-[#8a8f98] text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-2 border-t border-[#22222b] space-y-1">
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 p-1.5 rounded-md text-xs text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#18181f] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#5e6ad2]" />
                  <span>Create new Etsy workspace</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2 p-1.5 rounded-md text-xs text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#18181f] transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-[#8a8f98]" />
                  <span>Shop Settings &amp; Quotas</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
