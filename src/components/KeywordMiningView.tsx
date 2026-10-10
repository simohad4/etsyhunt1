import React, { useState } from 'react';
import { ArrowRight, Copy, Check, Hash } from 'lucide-react';
import { HighDemandKeyword } from '../types';

interface KeywordMiningViewProps {
  keywords: HighDemandKeyword[];
  onSelectKeyword: (kw: string) => void;
}

export const KeywordMiningView: React.FC<KeywordMiningViewProps> = ({
  keywords,
  onSelectKeyword
}) => {
  const [copiedAll, setCopiedAll] = useState(false);

  if (!keywords || keywords.length === 0) return null;

  const copyAll = () => {
    navigator.clipboard.writeText(keywords.map((k) => k.keyword).join(', '));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="bg-[#0F1522] border border-slate-800/90 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800 text-[#F97316] border border-slate-700">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Search Query Mining &amp; Traffic Volume
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                · {keywords.length} Long-Tail Queries
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              High-converting buyer search queries with estimated volume and competitive saturation
            </p>
          </div>
        </div>

        <button
          onClick={copyAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141B29] border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
        >
          {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copiedAll ? 'Copied Phrases' : 'Copy All Phrases'}</span>
        </button>
      </div>

      {/* Grid of Keyword Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {keywords.map((kw, idx) => (
          <button
            key={idx}
            onClick={() => onSelectKeyword(kw.keyword)}
            className="flex flex-col justify-between p-3.5 rounded-xl bg-[#141B29] border border-slate-800 hover:border-orange-500/50 hover:bg-[#182132] text-left transition-colors group cursor-pointer"
          >
            <div className="flex items-start justify-between gap-1 mb-2">
              <span className="text-xs font-semibold text-white group-hover:text-orange-300 transition-colors leading-snug">
                &ldquo;{kw.keyword}&rdquo;
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800">
              <span className="text-slate-400 font-mono">
                {kw.searchVolumeEstimate}
              </span>
              <span
                className={`font-medium text-[11px] ${
                  kw.competitionLevel === 'Low'
                    ? 'text-emerald-400'
                    : kw.competitionLevel === 'Medium'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {kw.competitionLevel} Competition
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
