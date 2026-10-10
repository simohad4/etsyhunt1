import React, { useState } from 'react';
import {
  Settings,
  CreditCard,
  Users,
  HardDrive,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  ShieldCheck,
  Store,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WorkspaceData } from '../services/supabase';

interface EtsyHunterWorkspaceSettingsProps {
  onClose?: () => void;
}

export const EtsyHunterWorkspaceSettings: React.FC<EtsyHunterWorkspaceSettingsProps> = ({ onClose }) => {
  const {
    activeWorkspace,
    workspaces,
    createWorkspace,
    switchWorkspace,
    updateWorkspacePlan
  } = useAuth();

  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'standard' | 'plus'>('standard');
  const [isCreating, setIsCreating] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (!activeWorkspace) return null;

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    createWorkspace(newWorkspaceName.trim(), selectedPlan);
    setNewWorkspaceName('');
    setIsCreating(false);
    setSaveMessage('New Etsy shop workspace created successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handlePlanUpgrade = (plan: 'free' | 'standard' | 'plus' | 'enterprise') => {
    updateWorkspacePlan(plan);
    setSaveMessage(`Workspace plan updated to ${plan.toUpperCase()}! API scan credits refreshed.`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#121216] border border-[#22222b]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-4 h-4 text-[#5e6ad2]" />
            <h2 className="text-lg font-bold text-[#f7f8f8]">
              {activeWorkspace.name} — Shop Settings
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#18181f] text-[#707bfb] border border-[#282835] uppercase">
              {activeWorkspace.plan}
            </span>
          </div>
          <p className="text-xs text-[#8a8f98]">
            Manage Etsy shop configurations, team member seats, and live API scan quotas.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-3.5 py-1.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-[0_0_16px_rgba(94,106,210,0.35)] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Etsy Workspace</span>
        </button>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-xl bg-[#299764]/10 border border-[#299764]/30 text-xs text-[#30a46c] flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Workspace Creation Form Modal/Card */}
      {isCreating && (
        <form
          onSubmit={handleCreateWorkspace}
          className="p-6 rounded-2xl bg-[#121216] border border-[#5e6ad2] shadow-2xl space-y-4 animate-in slide-in-from-top-2"
        >
          <h3 className="text-sm font-bold text-[#f7f8f8]">
            Create Additional Etsy Shop Workspace
          </h3>

          <div>
            <label className="block text-xs text-[#8a8f98] mb-1.5">
              Shop or Brand Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AuraCraft Apparel, Lumina Digital Goods"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#8a8f98] mb-1.5">
              Starting Tier Plan
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['free', 'standard', 'plus'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedPlan(tier)}
                  className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    selectedPlan === tier
                      ? 'border-[#5e6ad2] bg-[#18181f] text-white'
                      : 'border-[#282835] bg-[#0e0e13] text-[#8a8f98] hover:border-[#383848]'
                  }`}
                >
                  <div className="font-semibold capitalize text-[#f7f8f8]">{tier}</div>
                  <div className="text-[10px] text-[#575a65] mt-0.5">
                    {tier === 'plus' ? '500 Scans' : tier === 'standard' ? '250 Scans' : '100 Scans'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#5e6ad2] text-white text-xs font-semibold hover:bg-[#6875e5] cursor-pointer"
            >
              Confirm &amp; Provision Workspace
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-lg bg-[#18181f] text-[#8a8f98] text-xs hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Real-time Usage Limits & Quotas */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#575a65]">
          Live Quotas &amp; Scan Meters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Etsy API Credits Meter */}
          <div className="p-5 rounded-xl bg-[#121216] border border-[#22222b] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8a8f98]">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#5e6ad2]" />
                <span>Etsy API &amp; Scan Credits</span>
              </div>
              <span className="font-mono text-[#f7f8f8] font-bold">
                {activeWorkspace.creditsRemaining} / {activeWorkspace.totalCredits}
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#18181f] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#707bfb] rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    (activeWorkspace.creditsRemaining / activeWorkspace.totalCredits) * 100
                  )}%`
                }}
              />
            </div>

            <p className="text-[11px] text-[#575a65]">
              Consumed when scraping seller tags or fetching live cart counts. Refreshes monthly.
            </p>
          </div>

          {/* Team Seats */}
          <div className="p-5 rounded-xl bg-[#121216] border border-[#22222b] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8a8f98]">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#30a46c]" />
                <span>Team Seats Active</span>
              </div>
              <span className="font-mono text-[#f7f8f8] font-bold">
                {activeWorkspace.membersCount} / {activeWorkspace.maxMembers}
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#18181f] overflow-hidden">
              <div
                className="h-full bg-[#30a46c] rounded-full"
                style={{
                  width: `${(activeWorkspace.membersCount / activeWorkspace.maxMembers) * 100}%`
                }}
              />
            </div>

            <p className="text-[11px] text-[#575a65]">
              Virtual assistants and copywriters with shared access to this research radar.
            </p>
          </div>

          {/* Database Storage */}
          <div className="p-5 rounded-xl bg-[#121216] border border-[#22222b] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8a8f98]">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[#f5d90a]" />
                <span>Data Cache Usage</span>
              </div>
              <span className="font-mono text-[#f7f8f8] font-bold">
                {activeWorkspace.storageUsedMb} MB / {activeWorkspace.storageLimitMb} MB
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#18181f] overflow-hidden">
              <div
                className="h-full bg-[#f5d90a] rounded-full"
                style={{
                  width: `${(activeWorkspace.storageUsedMb / activeWorkspace.storageLimitMb) * 100}%`
                }}
              />
            </div>

            <p className="text-[11px] text-[#575a65]">
              Saved historical bestseller ranks and high-res listing thumbnail caches.
            </p>
          </div>
        </div>
      </div>

      {/* Plan Upgrades */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#575a65]">
          Upgrade or Switch Workspace Plan
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(
            [
              { tier: 'free', price: '$0', scans: 100, seats: 3 },
              { tier: 'standard', price: '$19/mo', scans: 250, seats: 10 },
              { tier: 'plus', price: '$39/mo', scans: 500, seats: 20 },
              { tier: 'enterprise', price: '$99/mo', scans: 2000, seats: 100 }
            ] as const
          ).map((item) => (
            <div
              key={item.tier}
              className={`p-4 rounded-xl bg-[#121216] border transition-all flex flex-col justify-between ${
                activeWorkspace.plan === item.tier
                  ? 'border-[#5e6ad2] bg-[#18181f]'
                  : 'border-[#22222b] hover:border-[#333342]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase text-[#f7f8f8]">{item.tier}</h4>
                  {activeWorkspace.plan === item.tier && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#5e6ad2]/20 text-[#707bfb]">
                      Active
                    </span>
                  )}
                </div>

                <div className="text-xl font-extrabold text-[#f7f8f8] mb-3">{item.price}</div>

                <ul className="space-y-1.5 text-[11px] text-[#8a8f98] mb-4">
                  <li>• {item.scans} Scans / mo</li>
                  <li>• Up to {item.seats} seats</li>
                </ul>
              </div>

              {activeWorkspace.plan === item.tier ? (
                <div className="w-full py-1.5 rounded bg-[#18181f] text-center text-[11px] text-[#575a65] font-mono border border-[#282835]">
                  Current Tier
                </div>
              ) : (
                <button
                  onClick={() => handlePlanUpgrade(item.tier)}
                  className="w-full py-1.5 rounded bg-[#5e6ad2]/20 hover:bg-[#5e6ad2] text-[#707bfb] hover:text-white border border-[#5e6ad2]/40 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Switch to {item.tier}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Switch Across Existing Workspaces */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#575a65]">
          Your Managed Etsy Shops ({workspaces.length})
        </h3>

        <div className="rounded-xl bg-[#121216] border border-[#22222b] divide-y divide-[#22222b]/60 overflow-hidden">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="p-4 flex items-center justify-between hover:bg-[#18181f]/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 flex items-center justify-center text-[#707bfb] font-bold text-xs">
                  {ws.name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#f7f8f8]">{ws.name}</div>
                  <div className="text-[10px] text-[#8a8f98] font-mono">
                    ID: {ws.id} · {ws.plan.toUpperCase()} · Created {ws.createdAt}
                  </div>
                </div>
              </div>

              {ws.id === activeWorkspace.id ? (
                <span className="text-xs text-[#30a46c] flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Current Active</span>
                </span>
              ) : (
                <button
                  onClick={() => switchWorkspace(ws.id)}
                  className="px-3 py-1 rounded-md bg-[#18181f] hover:bg-[#22222b] border border-[#282835] text-xs text-[#f7f8f8] transition-colors cursor-pointer"
                >
                  Switch Shop
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
