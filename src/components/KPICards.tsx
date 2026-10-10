import React from 'react';
import {
  TrendingUp,
  ShieldAlert,
  Zap,
  ShoppingCart,
  DollarSign,
  Award,
  Clock,
  ArrowUpRight,
  Activity
} from 'lucide-react';
import { MarketMetrics } from '../types';

interface KPICardsProps {
  metrics: MarketMetrics;
  isLiveScraped: boolean;
  totalListings: number;
  keyword: string;
}

export const KPICards: React.FC<KPICardsProps> = ({
  metrics,
  isLiveScraped,
  totalListings,
  keyword
}) => {
  const estimatedDailyOrders = Math.max(12, metrics.totalBought24h || Math.round(metrics.totalCarts * 0.35));
  const estimatedMonthlyRevenue = Math.round(estimatedDailyOrders * metrics.avgPrice * 30);

  return (
    <div className="space-y-3">
      {/* 3 Core Metric Cards with Etsy Hunter Card Treatment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Demand Score */}
        <div className="group relative rounded-xl bg-[#0D0E14] hover:bg-[#111219] border border-white/[0.08] hover:border-white/[0.14] p-4.5 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase text-zinc-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buyer Demand Score</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
              <span>{metrics.demandScore >= 80 ? 'High Velocity' : metrics.demandScore >= 60 ? 'Moderate' : 'Low'}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight tabular-nums font-mono">
              {metrics.demandScore}
            </span>
            <span className="text-zinc-600 text-xs font-mono font-medium">/100</span>
          </div>

          <div className="w-full bg-white/[0.05] h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              style={{ width: `${metrics.demandScore}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2.5 pt-2 border-t border-white/[0.05]">
            <span>Active Carts Sampled</span>
            <span className="text-zinc-300 font-medium font-mono">{metrics.totalCarts}+ items</span>
          </div>
        </div>

        {/* 2. Competition Saturation */}
        <div className="group relative rounded-xl bg-[#0D0E14] hover:bg-[#111219] border border-white/[0.08] hover:border-white/[0.14] p-4.5 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase text-zinc-400">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Competition Saturation</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-medium text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#F59E0B]" />
              <span>{metrics.competitionScore >= 75 ? 'Saturated' : metrics.competitionScore >= 50 ? 'Moderate' : 'Low Barrier'}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight tabular-nums font-mono">
              {metrics.competitionScore}
            </span>
            <span className="text-zinc-600 text-xs font-mono font-medium">/100</span>
          </div>

          <div className="w-full bg-white/[0.05] h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
              style={{ width: `${metrics.competitionScore}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2.5 pt-2 border-t border-white/[0.05]">
            <span>Bestseller Ratio</span>
            <span className="text-zinc-300 font-medium font-mono">{Math.round(metrics.bestsellerRatio * 100)}% of top listings</span>
          </div>
        </div>

        {/* 3. Opportunity Index */}
        <div className="group relative rounded-xl bg-[#0D0E14] hover:bg-[#111219] border border-white/[0.08] hover:border-white/[0.14] p-4.5 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              <span>Opportunity Index</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-medium text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_#F97316]" />
              <span>{metrics.opportunityScore >= 75 ? 'Prime Window' : metrics.opportunityScore >= 55 ? 'Viable' : 'Crowded'}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight tabular-nums font-mono">
              {metrics.opportunityScore}
            </span>
            <span className="text-zinc-600 text-xs font-mono font-medium">/100</span>
          </div>

          <div className="w-full bg-white/[0.05] h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
              style={{ width: `${metrics.opportunityScore}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2.5 pt-2 border-t border-white/[0.05]">
            <span>Algorithm Verdict</span>
            <span className="text-orange-400 font-medium font-mono">
              {metrics.opportunityScore >= 70 ? 'High Growth Target' : 'Niche Differentiation Required'}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Benchmark Band (High-density Etsy Hunter strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-lg bg-[#0C0D12] border border-white/[0.06] p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Average Listing Price
          </div>
          <div className="text-lg font-semibold text-zinc-100 font-mono mt-0.5">
            ${metrics.avgPrice.toFixed(2)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Range: ${(metrics.avgPrice * 0.55).toFixed(0)} - ${(metrics.avgPrice * 1.85).toFixed(0)}
          </div>
        </div>

        <div className="rounded-lg bg-[#0C0D12] border border-white/[0.06] p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            24h Cart Velocity
          </div>
          <div className="text-lg font-semibold text-emerald-400 font-mono mt-0.5">
            {metrics.totalCarts} in carts
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            ~{estimatedDailyOrders} orders/day
          </div>
        </div>

        <div className="rounded-lg bg-[#0C0D12] border border-white/[0.06] p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Est. Monthly Market GMV
          </div>
          <div className="text-lg font-semibold text-zinc-100 font-mono mt-0.5">
            ${estimatedMonthlyRevenue.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Calculated across top 20
          </div>
        </div>

        <div className="rounded-lg bg-[#0C0D12] border border-white/[0.06] p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Market Maturity
          </div>
          <div className="text-lg font-semibold text-zinc-100 font-mono mt-0.5">
            {metrics.marketMaturity || 'High Opportunity'}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Algorithm categorization
          </div>
        </div>
      </div>
    </div>
  );
};
