import React, { useState } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  ArrowLeft,
  ShieldCheck,
  Bookmark,
  History,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PRICING_PLANS } from '../config/pricing';
import {
  DashboardEmptyState,
  DashboardPageHeader,
  DashboardSectionCard,
  DashboardStatusIndicator
} from './dashboard/DashboardUI';

interface EtsyHunterWorkspaceSettingsProps {
  onClose?: () => void;
}

export const EtsyHunterWorkspaceSettings: React.FC<EtsyHunterWorkspaceSettingsProps> = ({ onClose }) => {
  const {
    user,
    workspace,
    searchHistory,
    clearHistory,
    updatePassword
  } = useAuth();

  const [historyError, setHistoryError] = useState<string | null>(null);

  // Password update form state
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  if (!workspace) return null;

  const isPaidPlan = workspace.plan !== 'none';
  const currentPlan = workspace.plan !== 'none' ? PRICING_PLANS[workspace.plan as 'starter' | 'pro' | 'agency'] : null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } else {
      setPasswordStatus('Password successfully updated.');
      setNewPassword('');
      setTimeout(() => setPasswordStatus(null), 4000);
    }
  };

  const handleClearHistory = async () => {
    setHistoryError(null);
    const result = await clearHistory();
    if (!result.success) {
      setHistoryError(result.error || 'Unable to clear research history right now.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-150">
      <DashboardPageHeader
        eyebrow="Customer workspace"
        title="Plan & quotas"
        description="Manage your account security and review the plan limits stored for your authenticated workspace."
        icon={<CreditCard className="h-5 w-5" />}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <DashboardStatusIndicator label="Supabase workspace" tone="success" />
            <DashboardStatusIndicator
              label={isPaidPlan ? `${currentPlan?.name} plan` : 'No active subscription'}
              tone={isPaidPlan ? 'info' : 'neutral'}
              dot={false}
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-[10px] text-[#8a8f98]">Billing rate</span>
              <span className="font-mono text-xs font-semibold text-[#f7f8f8]">
                {isPaidPlan ? `$${currentPlan?.price}/month` : '$0 / month'}
              </span>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#282835] bg-[#18181f] px-3 text-xs font-medium text-[#f7f8f8] transition-colors hover:bg-[#22222b]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Board
              </button>
            )}
          </div>
        }
      />

      {/* Real-time Usage Limits & Quotas */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#575a65]">
          Supabase entitlements
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Research Credits Meter */}
          <div className="p-5 rounded-xl bg-[#121216] border border-[#22222b] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8a8f98]">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#5e6ad2]" />
                <span className="font-medium text-[#f7f8f8]">Research Credits</span>
              </div>
              <span className="font-mono text-[#f7f8f8] font-bold">
                {workspace.creditsRemaining} / {workspace.totalCredits} remaining
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#18181f] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#707bfb] rounded-full transition-all duration-300"
                style={{
                  width: `${
                    workspace.totalCredits > 0
                      ? Math.min(100, Math.round((workspace.creditsRemaining / workspace.totalCredits) * 100))
                      : 0
                  }%`
                }}
              />
            </div>

            <p className="text-[11px] text-[#575a65]">
              Balance and allowance are shown only for a currently active subscription. Research providers remain disabled.
            </p>
          </div>

          {/* Saved Listings Library Meter */}
          <div className="p-5 rounded-xl bg-[#121216] border border-[#22222b] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8a8f98]">
              <div className="flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-[#30a46c]" />
                <span className="font-medium text-[#f7f8f8]">Saved Listings</span>
              </div>
              <span className="font-mono text-[#f7f8f8] font-bold">
                {workspace.savedListingsCount} / {workspace.maxSavedListings} used
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#18181f] overflow-hidden">
              <div
                className="h-full bg-[#30a46c] rounded-full"
                style={{
                  width: `${
                    workspace.maxSavedListings > 0
                      ? Math.min(100, Math.round((workspace.savedListingsCount / workspace.maxSavedListings) * 100))
                      : 0
                  }%`
                }}
              />
            </div>

            <p className="text-[11px] text-[#575a65]">
              Records currently stored in your authenticated Supabase workspace.
            </p>
          </div>
        </div>
      </div>

      {/* Subscription plan reference */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#575a65]">
            Plan reference
          </h3>
          <span className="text-[10px] text-[#8a8f98] font-mono">
            Billing unavailable
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['starter', 'pro', 'agency'] as const).map((planKey) => {
            const plan = PRICING_PLANS[planKey];
            const isCurrent = workspace.plan === planKey;

            return (
              <div
                key={planKey}
                className={`p-5 rounded-xl bg-[#121216] border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-[#5e6ad2] bg-[#18181f]'
                    : 'border-[#22222b] hover:border-[#383848]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-[#f7f8f8]">{plan.name}</h4>
                    {isCurrent && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#5e6ad2]/20 text-[#707bfb]">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-extrabold text-[#f7f8f8] mb-1">
                    ${plan.price}
                    <span className="text-xs text-[#8a8f98] font-normal"> / month</span>
                  </div>

                  <p className="text-xs text-[#8a8f98] mb-4">
                    {plan.description}
                  </p>

                  <ul className="space-y-1.5 text-xs text-[#8a8f98] mb-5">
                    {plan.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-[#30a46c] shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isCurrent ? (
                  <div className="w-full py-2 rounded bg-[#18181f] text-center text-xs text-[#575a65] font-mono border border-[#282835]">
                    Current Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded border border-[#282835] bg-[#18181f] py-2 text-xs font-semibold text-[#575a65]"
                  >
                    Billing unavailable
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Security & Password */}
      {user && (
        <DashboardSectionCard
          title="Account security"
          description="Update the password for your authenticated Etsy Hunter account."
          icon={<ShieldCheck className="h-4 w-4" />}
          bodyClassName="space-y-4 p-4 sm:p-5"
        >
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-[#f7f8f8]">Email: </span>
                <span className="text-[#8a8f98]">{user.email}</span>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3 pt-2 border-t border-[#22222b]">
              <label className="block text-xs font-medium text-[#8a8f98]">
                Update Password
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2]"
                />
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="py-2 px-4 rounded-lg bg-[#18181f] hover:bg-[#22222e] border border-[#282835] text-xs font-semibold text-[#f7f8f8] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Change Password'}
                </button>
              </div>

              {passwordStatus && (
                <p className={`text-xs ${passwordStatus.startsWith('Error') ? 'text-[#e5484d]' : 'text-[#30a46c]'}`}>
                  {passwordStatus}
                </p>
              )}
            </form>
        </DashboardSectionCard>
      )}

      {/* Research History Section */}
      <DashboardSectionCard
        title={`Recent research query history (${searchHistory.length})`}
        description="Queries loaded from the authenticated workspace."
        icon={<History className="h-4 w-4" />}
        action={searchHistory.length > 0 ? (
            <button
              onClick={() => void handleClearHistory()}
              className="text-xs text-[#8a8f98] hover:text-[#e5484d] flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
        ) : undefined}
        bodyClassName={searchHistory.length > 0 ? 'p-0' : 'p-4'}
      >
        {historyError && (
          <div role="alert" className="border-b border-[#e5484d]/30 bg-[#e5484d]/10 px-4 py-3 text-xs text-[#ff7b80]">
            {historyError}
          </div>
        )}
        {searchHistory.length > 0 ? (
          <div className="divide-y divide-[#22222b]/60 text-xs">
            {searchHistory.slice(0, 10).map((h) => (
              <div key={h.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#f7f8f8]">{h.keyword}</span>
                  <div className="text-[11px] text-[#8a8f98] mt-0.5">
                    {h.pagesRequested} page{h.pagesRequested > 1 ? 's' : ''} queried · {h.listingsFound} listings evaluated
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-[#707bfb] font-medium">
                    -{h.creditsConsumed} credit{h.creditsConsumed > 1 ? 's' : ''}
                  </span>
                  <div className="text-[10px] text-[#575a65]">{h.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DashboardEmptyState
            title="No research history yet"
            description="Completed workspace queries will appear here when history records are available."
            icon={<History className="h-5 w-5" />}
          />
        )}
      </DashboardSectionCard>
    </div>
  );
};
