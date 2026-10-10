import React from 'react';
import { TrendingUp, ShieldAlert, Zap, ShoppingCart, DollarSign, Award, Clock } from 'lucide-react';
import { MarketMetrics } from '../types';

interface ScoreCardsProps {
  metrics: MarketMetrics;
  isLiveScraped: boolean;
  totalListings: number;
}

export const ScoreCards: React.FC<ScoreCardsProps> = ({
  metrics,
  isLiveScraped,
  totalListings
}) => {
  // Score helper colors
  const getDemandColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 stroke-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'text-amber-400 stroke-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 stroke-rose-500 bg-rose-500/10 border-rose-500/30';
  };

  const getCompColor = (score: number) => {
    if (score >= 80) return 'text-rose-400 stroke-rose-500 bg-rose-500/10 border-rose-500/30';
    if (score >= 60) return 'text-amber-400 stroke-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-400 stroke-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  };

  const getOppColor = (score: number) => {
    if (score >= 75) return 'text-orange-400 stroke-orange-500 bg-orange-500/10 border-orange-500/30';
    if (score >= 50) return 'text-amber-400 stroke-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-slate-400 stroke-slate-500 bg-slate-500/10 border-slate-500/30';
  };

  return (
    <div className="space-y-4">
      {/* Primary Score Trio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Demand Score */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Demand Velocity
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getDemandColor(metrics.demandScore)}`}>
              {metrics.demandScore >= 80 ? 'Very High' : metrics.demandScore >= 60 ? 'Moderate' : 'Low'}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-5xl font-black tracking-tight text-white">
              {metrics.demandScore}
            </div>
            <span className="text-slate-500 text-lg font-bold">/ 100</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800/80 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
              style={{ width: `${metrics.demandScore}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Derived from live buyer cart additions, recent checkouts, and customer search appetite.
          </p>
        </div>

        {/* Competition Score */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Competition Level
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCompColor(metrics.competitionScore)}`}>
              {metrics.competitionScore >= 80 ? 'High Barrier' : metrics.competitionScore >= 55 ? 'Competitive' : 'Low'}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-5xl font-black tracking-tight text-white">
              {metrics.competitionScore}
            </div>
            <span className="text-slate-500 text-lg font-bold">/ 100</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800/80 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-1000"
              style={{ width: `${metrics.competitionScore}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Evaluates bestseller shop dominance, review counts, and keyword ad density.
          </p>
        </div>

        {/* Opportunity Score */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-orange-500/30 p-6 shadow-xl shadow-orange-500/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-orange-400 fill-orange-400" />
              Opportunity Index
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getOppColor(metrics.opportunityScore)}`}>
              {metrics.marketMaturity}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-5xl font-black tracking-tight bg-gradient-to-r from-orange-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
              {metrics.opportunityScore}
            </div>
            <span className="text-slate-500 text-lg font-bold">/ 100</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800/80 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 rounded-full transition-all duration-1000"
              style={{ width: `${metrics.opportunityScore}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Net commercial viability score for new or established POD & handmade sellers.
          </p>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4">
          <div className="flex items-center text-slate-400 text-xs mb-1 gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-orange-400" />
            Active In-Carts
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.totalCarts}+
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Immediate purchase intent
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4">
          <div className="flex items-center text-slate-400 text-xs mb-1 gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Bought in Last 24h
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.totalBought24h}+
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Live 24-hour transactions
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4">
          <div className="flex items-center text-slate-400 text-xs mb-1 gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            Average Price
          </div>
          <div className="text-2xl font-bold text-white">
            ${metrics.avgPrice}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Median: ${metrics.medianPrice}
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4">
          <div className="flex items-center text-slate-400 text-xs mb-1 gap-1.5">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            Bestseller Density
          </div>
          <div className="text-2xl font-bold text-white">
            {Math.round(metrics.bestsellerRatio * 100)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Across {totalListings} analyzed listings
          </div>
        </div>
      </div>
    </div>
  );
};
