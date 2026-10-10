import React, { useState } from 'react';
import { Award, Copy, Check, TrendingUp, DollarSign, Package, Tag, ArrowUpRight, Flame } from 'lucide-react';
import { WinningIdea } from '../types';

interface WinningIdeasViewProps {
  ideas: WinningIdea[];
}

export const WinningIdeasView: React.FC<WinningIdeasViewProps> = ({ ideas }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTagsId, setCopiedTagsId] = useState<string | null>(null);

  const copyTitle = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyTags = (id: string, tags: string[]) => {
    navigator.clipboard.writeText(tags.join(', '));
    setCopiedTagsId(id);
    setTimeout(() => setCopiedTagsId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-400" />
            AI Winning Product Opportunities
          </h3>
          <p className="text-xs text-slate-400">
            Validated product blueprints engineered to outrank current bestsellers
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
          {ideas.length} Concepts Generated
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {ideas.map((idea, index) => {
          const profit = Number((idea.estimatedRetailPrice - idea.estimatedProductionCost).toFixed(2));
          const margin = idea.estimatedMarginPercentage || Math.round((profit / idea.estimatedRetailPrice) * 100);

          return (
            <div
              key={idea.id || index}
              className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 flex flex-col justify-between shadow-xl relative group hover:border-orange-500/40 transition-all duration-300"
            >
              {/* Badge Rank */}
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  <Flame className="w-3 h-3 fill-orange-400" />
                  Concept #{index + 1}
                </span>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                  {idea.nicheAngle}
                </span>
              </div>

              {/* Title */}
              <div className="mb-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base font-bold text-white group-hover:text-orange-300 transition-colors leading-snug">
                    {idea.title}
                  </h4>
                  <button
                    onClick={() => copyTitle(idea.id, idea.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                    title="Copy Title to Clipboard"
                  >
                    {copiedId === idea.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Target: <span className="text-slate-300 font-medium">{idea.targetAudience}</span>
                </div>
              </div>

              {/* Why It Sells Box */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 mb-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Why It Sells & Converts
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {idea.whyItSells}
                </p>
              </div>

              {/* Differentiation Edge */}
              <div className="mb-4 text-xs text-slate-400 leading-relaxed">
                <span className="text-orange-400 font-semibold block mb-0.5">
                  Competitive Edge:
                </span>
                {idea.differentiationStrategy}
              </div>

              {/* Financial & Margin Cards */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Unit Economics</span>
                  <span className="text-emerald-400 font-bold">{margin}% Margin</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 rounded-lg p-2 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">Retail Price</div>
                    <div className="text-sm font-bold text-white">${idea.estimatedRetailPrice}</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">Base Cost</div>
                    <div className="text-sm font-bold text-slate-300">${idea.estimatedProductionCost}</div>
                  </div>
                  <div className="bg-emerald-950/40 rounded-lg p-2 border border-emerald-500/30">
                    <div className="text-[10px] text-emerald-400 font-medium">Net Profit</div>
                    <div className="text-sm font-bold text-emerald-400">+${profit}</div>
                  </div>
                </div>
              </div>

              {/* POD Fulfillment Advice */}
              <div className="flex items-start gap-2 bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-xs mb-4">
                <Package className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-indigo-300 font-semibold block text-[11px]">
                    Fulfillment Recommendation:
                  </span>
                  <span className="text-slate-300 text-[11px]">
                    {idea.podFulfillmentTip}
                  </span>
                </div>
              </div>

              {/* Tags Box */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-orange-400" />
                    Recommended Etsy Tags ({idea.recommendedTags.length})
                  </span>
                  <button
                    onClick={() => copyTags(idea.id, idea.recommendedTags)}
                    className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    {copiedTagsId === idea.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {idea.recommendedTags.map((t, tidx) => (
                    <span
                      key={tidx}
                      className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60 hover:border-orange-500/40 transition-colors"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
