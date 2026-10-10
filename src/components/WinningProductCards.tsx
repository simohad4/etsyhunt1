import React, { useState } from 'react';
import {
  DollarSign,
  Copy,
  Check,
  TrendingUp,
  Package,
  Tag,
  Lightbulb,
  Sparkles,
  Layers
} from 'lucide-react';
import { WinningIdea } from '../types';

interface WinningProductCardsProps {
  ideas: WinningIdea[];
  onOpenCalculatorWithIdea?: (idea: WinningIdea) => void;
}

export const WinningProductCards: React.FC<WinningProductCardsProps> = ({
  ideas,
  onOpenCalculatorWithIdea
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTagsId, setCopiedTagsId] = useState<string | null>(null);

  const copyText = (id: string, text: string) => {
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-orange-400" />
              <span>Winning Product Blueprints</span>
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              AI GENERATED
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Validated concept angles engineered to capture buyer demand with clear unit economics
          </p>
        </div>
        <div className="text-xs text-zinc-500 font-mono self-start sm:self-auto">
          {ideas.length} blueprints formulated
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ideas.map((idea, index) => {
          const profit = Number((idea.estimatedRetailPrice - idea.estimatedProductionCost).toFixed(2));
          const margin = idea.estimatedMarginPercentage || Math.round((profit / idea.estimatedRetailPrice) * 100);
          const conceptIndex = String(index + 1).padStart(2, '0');

          return (
            <div
              key={idea.id || index}
              className="group relative rounded-xl bg-[#0D0E14] hover:bg-[#111219] border border-white/[0.08] hover:border-white/[0.14] p-4.5 flex flex-col justify-between transition-all duration-200 shadow-sm"
            >
              <div className="space-y-3">
                {/* Concept header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-zinc-500 bg-[#161822] px-1.5 py-0.5 rounded border border-white/[0.06]">
                      #{conceptIndex}
                    </span>
                    <span className="text-[11px] font-medium text-orange-400 truncate max-w-[140px]">
                      {idea.targetAudience}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
                    <span className="text-[11px] font-mono font-semibold text-emerald-400">
                      ~{margin}% Margin
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug">
                  {idea.title}
                </h4>

                {/* Niche Angle & Why It Sells */}
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {idea.whyItSells || idea.differentiationStrategy}
                </p>

                {/* Unit Economics Etsy Hunter Strip */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#0A0B10] border border-white/[0.06] text-center font-mono">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500">Retail</div>
                    <div className="text-xs font-semibold text-zinc-200 mt-0.5">
                      ${idea.estimatedRetailPrice.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500">Blank Cost</div>
                    <div className="text-xs font-semibold text-zinc-400 mt-0.5">
                      ${idea.estimatedProductionCost.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500">Net Profit</div>
                    <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                      +${profit.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Etsy SEO Recommended Tags */}
                {idea.recommendedTags && idea.recommendedTags.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                      <span>Suggested Tags ({idea.recommendedTags.length})</span>
                      <button
                        onClick={() => copyTags(idea.id, idea.recommendedTags)}
                        className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedTagsId === idea.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Tags</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {idea.recommendedTags.slice(0, 5).map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-1.5 py-0.5 rounded bg-[#14151C] text-[10px] text-zinc-400 border border-white/[0.06] font-mono"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-4 mt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <button
                  onClick={() => copyText(idea.id, `${idea.title}\n\n${idea.whyItSells}`)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer py-1"
                >
                  {copiedId === idea.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-xs">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Brief</span>
                    </>
                  )}
                </button>

                {onOpenCalculatorWithIdea && (
                  <button
                    onClick={() => onOpenCalculatorWithIdea(idea)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#161822] hover:bg-[#1C1E2B] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Layers className="w-3 h-3 text-orange-400" />
                    <span>Simulate</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
