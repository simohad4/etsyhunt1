import React from 'react';
import {
  FileText,
  Target,
  DollarSign,
  Compass,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { MarketSummary } from '../types';

interface AIMarketBriefingProps {
  summary: MarketSummary;
  keyword: string;
}

export const AIMarketBriefing: React.FC<AIMarketBriefingProps> = ({ summary, keyword }) => {
  return (
    <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#14151C] border border-white/[0.08] flex items-center justify-center text-orange-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                AI Market Intelligence &amp; Positioning Brief
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                GEMINI 1.5 FLASH
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Demand drivers, price structuring, and buyer psychology for &ldquo;{keyword}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Market Overview Narrative */}
      <div className="rounded-lg bg-[#111219] border border-white/[0.06] p-4 text-xs text-zinc-300 leading-relaxed font-normal">
        <span className="text-orange-400 font-semibold block text-[10px] uppercase tracking-wider mb-1">
          Market Dynamics
        </span>
        {summary.overview}
      </div>

      {/* Multi-Column Blocks in Etsy Hunter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Core Demand Drivers */}
        <div className="rounded-lg bg-[#111219] border border-white/[0.06] p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs tracking-wide">
            <Target className="w-3.5 h-3.5" />
            <span>Buyer Demand Drivers</span>
          </div>
          <ul className="space-y-1.5">
            {summary.keyDemandDrivers.map((driver, idx) => (
              <li key={idx} className="flex items-start gap-2 text-zinc-300">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981] shrink-0 mt-1.5" />
                <span className="leading-snug">{driver}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing Strategy */}
        <div className="rounded-lg bg-[#111219] border border-white/[0.06] p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-orange-400 font-semibold text-xs tracking-wide">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Pricing &amp; Margins</span>
          </div>
          <p className="text-zinc-300 leading-snug">
            {summary.pricingStrategy}
          </p>
        </div>

        {/* Untapped Angles */}
        <div className="rounded-lg bg-[#111219] border border-white/[0.06] p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-xs tracking-wide">
            <Compass className="w-3.5 h-3.5" />
            <span>Untapped Differentiation Angles</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.untappedAngles.map((angle, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-[#161822] text-zinc-300 border border-white/[0.06] text-[11px]"
              >
                {angle}
              </span>
            ))}
          </div>
        </div>

        {/* Risk Factors */}
        <div className="rounded-lg bg-[#111219] border border-white/[0.06] p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs tracking-wide">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Market Saturation &amp; Traps</span>
          </div>
          <ul className="space-y-1.5">
            {summary.riskFactors.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2 text-zinc-300">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                <span className="leading-snug">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
