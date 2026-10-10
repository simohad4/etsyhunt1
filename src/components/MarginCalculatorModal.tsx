import React, { useState } from 'react';
import { X, Calculator, DollarSign, Percent, TrendingUp, Sparkles } from 'lucide-react';
import { WinningIdea } from '../types';

interface MarginCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetIdea?: WinningIdea | null;
}

export const MarginCalculatorModal: React.FC<MarginCalculatorModalProps> = ({
  isOpen,
  onClose,
  presetIdea
}) => {
  const [retailPrice, setRetailPrice] = useState<number>(presetIdea ? presetIdea.estimatedRetailPrice : 29.99);
  const [costOfGoods, setCostOfGoods] = useState<number>(presetIdea ? presetIdea.estimatedProductionCost : 11.50);
  const [shippingCharged, setShippingCharged] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [advertisingSpend, setAdvertisingSpend] = useState<number>(3.00);

  if (!isOpen) return null;

  // Etsy Fees Calculation
  const listingFee = 0.20;
  const transactionFee = Number(((retailPrice + shippingCharged) * 0.065).toFixed(2));
  const paymentFee = Number(((retailPrice + shippingCharged) * 0.03 + 0.25).toFixed(2));
  const totalEtsyFees = Number((listingFee + transactionFee + paymentFee).toFixed(2));

  // Net Profit
  const totalRevenue = retailPrice + shippingCharged;
  const totalExpenses = costOfGoods + shippingCost + totalEtsyFees + advertisingSpend;
  const netProfit = Number((totalRevenue - totalExpenses).toFixed(2));
  const netMargin = Number(((netProfit / totalRevenue) * 100).toFixed(1));
  const roi = Number(((netProfit / (costOfGoods + advertisingSpend)) * 100).toFixed(1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-xl bg-[#0D0E14] border border-white/[0.1] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.8)] space-y-5 text-zinc-200">
        {/* Subtle glowing accent */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#14151C] border border-white/[0.08] flex items-center justify-center text-orange-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Unit Economics &amp; Margin Simulator
              </h3>
              <p className="text-[11px] text-zinc-500">
                Calculates net take-home profit factoring Etsy transaction, payment processing, and blank costs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Concept Tag */}
        {presetIdea && (
          <div className="px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300 flex items-center justify-between">
            <span className="font-medium truncate max-w-sm">Preset: {presetIdea.title}</span>
            <span className="text-[10px] font-mono shrink-0">Simulated</span>
          </div>
        )}

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Retail Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={retailPrice}
              onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-3 bg-[#12131A] border border-white/[0.08] focus:border-orange-500/50 rounded-lg text-zinc-100 font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Blank / Production Cost ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={costOfGoods}
              onChange={(e) => setCostOfGoods(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-3 bg-[#12131A] border border-white/[0.08] focus:border-orange-500/50 rounded-lg text-zinc-100 font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Est. Ads / Acquisition ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={advertisingSpend}
              onChange={(e) => setAdvertisingSpend(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-3 bg-[#12131A] border border-white/[0.08] focus:border-orange-500/50 rounded-lg text-zinc-100 font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Shipping Charged to Buyer ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={shippingCharged}
              onChange={(e) => setShippingCharged(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-3 bg-[#12131A] border border-white/[0.08] focus:border-orange-500/50 rounded-lg text-zinc-100 font-mono text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Calculation Breakdown & Results Card */}
        <div className="p-4 rounded-xl bg-[#090A0E] border border-white/[0.08] space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.05]">
            <span className="text-zinc-400 font-sans">Etsy Platform Deductions (Listing + 6.5% + 3%+$0.25)</span>
            <span className="text-zinc-200">-${totalEtsyFees.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-lg bg-[#12131A] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 font-sans uppercase">Net Margin</div>
              <div className={`text-base font-bold mt-0.5 ${netMargin >= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {netMargin}%
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#12131A] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 font-sans uppercase">Take-Home Profit</div>
              <div className={`text-base font-bold mt-0.5 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${netProfit.toFixed(2)}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#12131A] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 font-sans uppercase">Estimated ROI</div>
              <div className="text-base font-bold text-orange-400 mt-0.5">
                {roi}%
              </div>
            </div>
          </div>
        </div>

        {/* Close CTA */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
