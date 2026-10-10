import React, { useState } from 'react';
import { X, User, HelpCircle, Check } from 'lucide-react';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  creditsRemaining: number;
  totalCredits: number;
  onOpenPricing: () => void;
}

export const SettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  creditsRemaining,
  totalCredits,
  onOpenPricing
}) => {
  const [storeNickname, setStoreNickname] = useState('MyEtsyShop');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl bg-[#0F1522] border border-slate-800 p-6 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-[#F97316]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Account &amp; Workspace Settings
            </h3>
            <p className="text-xs text-slate-400">
              Manage your EtsyHunter subscription &amp; seller preferences
            </p>
          </div>
        </div>

        {/* Subscription Plan Card */}
        <div className="bg-[#141B29] border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Current Plan
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-base font-bold text-white">
                  Professional Plan
                </span>
                <span className="text-emerald-400 text-xs font-semibold">
                  · Active
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenPricing();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-orange-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Change Plan
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>Searches Remaining:</span>
              <span className="font-semibold text-white font-mono">{creditsRemaining} / {totalCredits}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F97316] rounded-full"
                style={{ width: `${(creditsRemaining / totalCredits) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase mb-1">
              Account Email
            </label>
            <input
              type="text"
              readOnly
              value={userEmail}
              className="w-full px-3 py-2 bg-[#0E1420] border border-slate-800 rounded-lg text-slate-400 cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase mb-1">
              Store Nickname
            </label>
            <input
              type="text"
              value={storeNickname}
              onChange={(e) => setStoreNickname(e.target.value)}
              className="w-full px-3 py-2 bg-[#141B29] border border-slate-800 focus:border-[#F97316] rounded-lg text-white focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg font-semibold bg-[#F97316] hover:bg-orange-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl bg-[#0F1522] border border-slate-800 p-6 shadow-2xl space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-[#F97316]">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">How EtsyHunter Works</h3>
            <p className="text-xs text-slate-400">Our 3-stage validation methodology</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 bg-[#141B29] rounded-lg border border-slate-800">
            <span className="font-semibold text-orange-400 block mb-1">
              1. Live Buyer Velocity Index
            </span>
            Calculates live buyer intent signals directly from active carts (`inCartCount`) and verified recent 24-hour transactions for searched keywords.
          </div>

          <div className="p-3 bg-[#141B29] rounded-lg border border-slate-800">
            <span className="font-semibold text-orange-400 block mb-1">
              2. Competition Saturation Analysis
            </span>
            Measures pricing distributions, median benchmarks, bestseller ratio, and review depth to quantify entry difficulty for new sellers.
          </div>

          <div className="p-3 bg-[#141B29] rounded-lg border border-slate-800">
            <span className="font-semibold text-orange-400 block mb-1">
              3. High-Margin Angles &amp; Tag Strategy
            </span>
            Formulates differentiated product concepts with recommended blank suppliers, unit profit economics, and 13 ready-to-paste Etsy SEO tags.
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
