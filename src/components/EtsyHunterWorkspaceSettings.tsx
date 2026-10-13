import React, { useState } from 'react';
import { Bookmark, Check, CreditCard, History, LockKeyhole, ShieldCheck, Trash2, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PRICING_PLANS } from '../config/pricing';
import { DashboardEmptyState, DashboardPageHeader, DashboardSectionCard, DashboardStatusIndicator } from './dashboard/DashboardUI';

export type WorkspaceSettingsSection = 'history' | 'plan' | 'settings';

export const EtsyHunterWorkspaceSettings: React.FC<{ section?: WorkspaceSettingsSection }> = ({ section = 'plan' }) => {
  const { user, workspace, searchHistory, clearHistory, updatePassword } = useAuth();
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  if (!workspace) return null;

  const isPaidPlan = workspace.plan !== 'none';
  const currentPlan = isPaidPlan ? PRICING_PLANS[workspace.plan as 'starter' | 'pro' | 'agency'] : null;
  const creditsPercent = workspace.totalCredits > 0 ? Math.min(100, Math.round((workspace.creditsRemaining / workspace.totalCredits) * 100)) : 0;
  const listingsPercent = workspace.maxSavedListings > 0 ? Math.min(100, Math.round((workspace.savedListingsCount / workspace.maxSavedListings) * 100)) : 0;

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus('Password must be at least 6 characters.');
      return;
    }
    setPasswordLoading(true);
    setPasswordStatus(null);
    const { error } = await updatePassword(newPassword);
    setPasswordLoading(false);
    if (error) {
      setPasswordStatus(`Error: ${error.message}`);
      return;
    }
    setPasswordStatus('Password successfully updated.');
    setNewPassword('');
    window.setTimeout(() => setPasswordStatus(null), 4000);
  };

  const handleClearHistory = async () => {
    setHistoryError(null);
    const result = await clearHistory();
    if (!result.success) setHistoryError(result.error || 'Unable to clear research history right now.');
  };

  if (section === 'history') {
    return (
      <div className="mx-auto max-w-5xl space-y-5 pb-10">
        <DashboardPageHeader
          eyebrow="Insights"
          title="Research history"
          description="Review completed research recorded for this account. Empty history stays empty until a real result is stored."
          icon={<History className="h-5 w-5" />}
          meta={<DashboardStatusIndicator label="Account history" tone="info" />}
        />
        <DashboardSectionCard
          title={`Completed research (${searchHistory.length})`}
          description="Only recorded account activity appears here."
          icon={<History className="h-4 w-4" />}
          action={searchHistory.length > 0 ? (
            <button type="button" onClick={() => void handleClearHistory()} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#91919b] transition-colors hover:bg-[#e5484d]/10 hover:text-[#ff8b8f]">
              <Trash2 className="h-3.5 w-3.5" /> Clear history
            </button>
          ) : undefined}
          bodyClassName={searchHistory.length > 0 ? 'p-0' : 'p-4'}
        >
          {historyError && <div role="alert" className="border-b border-[#e5484d]/30 bg-[#e5484d]/10 px-4 py-3 text-xs text-[#ff8b8f]">{historyError}</div>}
          {searchHistory.length > 0 ? (
            <div className="divide-y divide-[#24242b]">
              {searchHistory.slice(0, 20).map((item) => (
                <div key={item.id} className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-[#17171c] sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-[#f4f4f5]">{item.keyword}</div>
                    <div className="mt-1 text-[11px] text-[#91919b]">{item.pagesRequested} page{item.pagesRequested === 1 ? '' : 's'} requested · {item.listingsFound} listings recorded</div>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <div className="text-xs font-medium tabular-nums text-[#9da0ff]">{item.creditsConsumed} credit{item.creditsConsumed === 1 ? '' : 's'}</div>
                    <div className="mt-0.5 text-[10px] text-[#70707a]">{item.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DashboardEmptyState title="No research history yet" description="Completed research will appear here after the service is enabled and a result is successfully recorded." icon={<History className="h-5 w-5" />} />
          )}
        </DashboardSectionCard>
      </div>
    );
  }

  if (section === 'settings') {
    return (
      <div className="mx-auto max-w-4xl space-y-5 pb-10">
        <DashboardPageHeader eyebrow="Account" title="Settings" description="Manage your Etsy Hunter account details and sign-in security." icon={<ShieldCheck className="h-5 w-5" />} meta={<DashboardStatusIndicator label="Private account" tone="success" />} />
        {user && (
          <DashboardSectionCard title="Account security" description="Update the password used to sign in to this account." icon={<LockKeyhole className="h-4 w-4" />} bodyClassName="space-y-5 p-4 sm:p-5">
            <div className="rounded-md border border-[#24242b] bg-[#101014] px-3 py-2.5">
              <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#70707a]">Email address</div>
              <div className="mt-1 break-all text-xs text-[#d7d7dc]">{user.email}</div>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <label htmlFor="account-password" className="block text-xs font-medium text-[#b5b5be]">New password</label>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <input id="account-password" type="password" autoComplete="new-password" minLength={6} placeholder="At least 6 characters" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-10 flex-1 rounded-md border border-[#2b2b34] bg-[#18181d] px-3 text-xs text-[#f4f4f5] outline-none placeholder:text-[#666670] focus:border-[#7478e6] focus:ring-2 focus:ring-[#7478e6]/15" />
                <button type="submit" disabled={passwordLoading} className="h-10 rounded-md border border-[#34343e] bg-[#202027] px-4 text-xs font-semibold text-[#f4f4f5] transition-colors hover:bg-[#292931] disabled:cursor-not-allowed disabled:opacity-50">{passwordLoading ? 'Updating…' : 'Change password'}</button>
              </div>
              {passwordStatus && <p role="status" className={`text-xs ${passwordStatus.startsWith('Error') ? 'text-[#ff8b8f]' : 'text-[#65d39a]'}`}>{passwordStatus}</p>}
            </form>
          </DashboardSectionCard>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <DashboardPageHeader
        eyebrow="Usage"
        title="Plan & billing"
        description="Review the subscription and usage limits currently assigned to your account."
        icon={<CreditCard className="h-5 w-5" />}
        meta={<DashboardStatusIndicator label={isPaidPlan ? `${currentPlan?.name} plan` : 'No active subscription'} tone={isPaidPlan ? 'info' : 'neutral'} />}
        actions={<div className="text-left sm:text-right"><span className="block text-[10px] text-[#777781]">Current rate</span><span className="text-xs font-semibold tabular-nums text-[#f4f4f5]">{isPaidPlan ? `$${currentPlan?.price} / month` : '$0 / month'}</span></div>}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <UsageMeter label="Research credits" value={`${workspace.creditsRemaining} / ${workspace.totalCredits} available`} percent={creditsPercent} icon={<Zap className="h-4 w-4" />} color="bg-[#7478e6]" description="Usable credits are available only while the subscription is active." />
        <UsageMeter label="Saved listings" value={`${workspace.savedListingsCount} / ${workspace.maxSavedListings} used`} percent={listingsPercent} icon={<Bookmark className="h-4 w-4" />} color="bg-[#30a46c]" description="Listings currently saved to this account." />
      </div>
      <DashboardSectionCard title="Plans" description="Plan checkout and changes are not available yet." icon={<CreditCard className="h-4 w-4" />} bodyClassName="grid grid-cols-1 gap-3 p-4 lg:grid-cols-3">
        {(['starter', 'pro', 'agency'] as const).map((planKey) => {
          const plan = PRICING_PLANS[planKey];
          const isCurrent = workspace.plan === planKey;
          return (
            <article key={planKey} className={`flex flex-col rounded-lg border p-4 ${isCurrent ? 'border-[#6c70dc]/60 bg-[#6c70dc]/8' : 'border-[#24242b] bg-[#101014]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-sm font-semibold text-[#f4f4f5]">{plan.name}</h3><p className="mt-1 text-xs leading-5 text-[#91919b]">{plan.description}</p></div>
                {isCurrent && <DashboardStatusIndicator label="Current" tone="info" dot={false} />}
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#f4f4f5]"><span>$</span>{plan.price}<span className="text-xs font-normal text-[#777781]"> / month</span></div>
              <ul className="mt-4 flex-1 space-y-2 text-xs text-[#a1a1aa]">
                {plan.features.slice(0, 4).map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#65d39a]" /><span>{feature}</span></li>)}
              </ul>
              <button type="button" disabled className="mt-5 h-9 cursor-not-allowed rounded-md border border-[#2b2b34] bg-[#18181d] text-xs font-medium text-[#666670]">{isCurrent ? 'Current plan' : 'Unavailable'}</button>
            </article>
          );
        })}
      </DashboardSectionCard>
    </div>
  );
};

function UsageMeter({ label, value, percent, icon, color, description }: { label: string; value: string; percent: number; icon: React.ReactNode; color: string; description: string }) {
  return (
    <section className="rounded-lg border border-[#24242b] bg-[#131317] p-4">
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-medium text-[#f4f4f5]"><span className="text-[#9da0ff]">{icon}</span>{label}</div>
        <span className="font-semibold tabular-nums text-[#d7d7dc]">{value}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#24242b]" aria-hidden="true"><div className={`h-full rounded-full transition-[width] duration-300 ${color}`} style={{ width: `${percent}%` }} /></div>
      <p className="mt-3 text-[11px] leading-4 text-[#70707a]">{description}</p>
    </section>
  );
}
