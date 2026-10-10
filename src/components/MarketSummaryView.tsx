import React from 'react';
import { Lightbulb, Target, DollarSign, Compass, AlertTriangle, Sparkles } from 'lucide-react';
import { MarketSummary } from '../types';

interface MarketSummaryViewProps {
  summary: MarketSummary;
  keyword: string;
}

export const MarketSummaryView: React.FC<MarketSummaryViewProps> = ({ summary, keyword }) => {
  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Market Intelligence Overview
            <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              Powered by Gemini
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Synthesized algorithmic market breakdown for &ldquo;{keyword}&rdquo;
          </p>
        </div>
      </div>

      {/* Main Executive Summary */}
      <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 mb-6 text-sm text-slate-300 leading-relaxed">
        {summary.overview}
      </div>

      {/* 4 Strategic Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key Demand Drivers */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Target className="w-4 h-4" />
            Core Demand Drivers
          </div>
          <ul className="space-y-2">
            {summary.keyDemandDrivers.map((driver, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>{driver}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing Strategy */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
            <DollarSign className="w-4 h-4" />
            Pricing & Margin Sweet-Spot
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {summary.pricingStrategy}
          </p>
        </div>

        {/* Untapped Angles */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Compass className="w-4 h-4" />
            Untapped Angles & Micro-Niches
          </div>
          <ul className="space-y-2">
            {summary.untappedAngles.map((angle, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                <span>{angle}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risk & Trademark Pitfalls */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-3">
            <AlertTriangle className="w-4 h-4" />
            Risks & IP Warnings
          </div>
          <ul className="space-y-2">
            {summary.riskFactors.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
