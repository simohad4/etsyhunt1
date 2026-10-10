import React from 'react';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  ShieldCheck,
  Zap,
  Target,
  DollarSign,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { MarketAnalysisResult } from '../types';

interface ReportsViewProps {
  analysis: MarketAnalysisResult;
  keyword: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ analysis, keyword }) => {
  const { metrics, marketSummary, winningIdeas, competitors } = analysis;

  const handlePrint = () => {
    window.print();
  };

  const handleExportFullCSV = () => {
    const headers = ['Listing ID', 'Title', 'Shop Name', 'Price', 'Currency', 'In Carts', 'Bought 24h', 'Rating', 'URL'];
    const rows = competitors.map((item) => [
      `"${item.id}"`,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.shopName.replace(/"/g, '""')}"`,
      item.price,
      item.currency || 'USD',
      item.inCartCount || 0,
      item.boughtLast24h || 0,
      item.shopRating || 5.0,
      `"${item.url}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `etsy-hunter-dossier-${keyword.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Report Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">
              EXECUTIVE DOSSIER
            </span>
            <h2 className="text-base font-semibold text-white tracking-tight capitalize">
              {keyword} Market Intelligence Report
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Generated on {new Date(analysis.timestamp).toLocaleDateString()} &bull; Source: {analysis.isLiveScraped ? 'Apify Live Cart Scraper' : 'Algorithmic Market Pulse Engine'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFullCSV}
            className="px-3 py-1.5 rounded-lg bg-[#12131A] hover:bg-[#181A24] border border-white/[0.08] hover:border-white/[0.15] text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(249,115,22,0.3)]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Demand Index
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {metrics.demandScore}/100
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {metrics.totalCarts} active shopper carts tracked
          </div>
        </div>

        <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Saturation Index
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {metrics.competitionScore}/100
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {metrics.bestsellerRatio}% bestseller saturation
          </div>
        </div>

        <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Price Sweet Spot
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            ${metrics.avgPrice.toFixed(2)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Median: ${metrics.medianPrice.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Opportunity Score
          </div>
          <div className="text-2xl font-bold font-mono text-orange-400 mt-1">
            {metrics.opportunityScore}/100
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Status: {metrics.marketMaturity}
          </div>
        </div>
      </div>

      {/* Executive Summary & Demand Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            <Target className="w-4 h-4 text-orange-400" />
            <span>Market Context & Strategy</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {marketSummary.overview}
          </p>
          <div className="p-3 rounded-lg bg-[#14151D] border border-white/[0.06] text-xs text-zinc-300 space-y-1">
            <div className="font-medium text-orange-400 text-[11px] uppercase tracking-wider">
              Pricing Guidance
            </div>
            <div>{marketSummary.pricingStrategy}</div>
          </div>
        </div>

        <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Core Buyer Demand Drivers</span>
          </div>
          <ul className="space-y-2">
            {marketSummary.keyDemandDrivers.map((driver, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>{driver}</span>
              </li>
            ))}
          </ul>

          <div className="pt-2 border-t border-white/[0.06]">
            <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              <span>Risk & Saturation Warnings</span>
            </div>
            <ul className="space-y-1">
              {marketSummary.riskFactors.map((risk, idx) => (
                <li key={idx} className="text-xs text-zinc-400 flex items-start gap-1.5">
                  <span className="text-rose-400">&bull;</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Untapped Product Opportunities */}
      <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>Top Product Opportunities ({winningIdeas.length} Formats)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {winningIdeas.map((idea, idx) => (
            <div
              key={idea.id || idx}
              className="p-3.5 rounded-lg bg-[#12131A] border border-white/[0.06] space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-semibold text-white">{idea.title}</h4>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                  {idea.estimatedMarginPercentage}% Margin
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2">
                {idea.whyItSells}
              </p>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-white/[0.04]">
                <span>Target: {idea.targetAudience}</span>
                <span className="font-mono text-zinc-300 font-medium">${idea.estimatedRetailPrice.toFixed(2)} retail</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
