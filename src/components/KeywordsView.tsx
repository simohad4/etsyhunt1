import React from 'react';
import { Search, Hash, ArrowRight } from 'lucide-react';
import { HighDemandKeyword } from '../types';

interface KeywordsViewProps {
  keywords: HighDemandKeyword[];
  onSelectKeyword: (kw: string) => void;
}

export const KeywordsView: React.FC<KeywordsViewProps> = ({
  keywords,
  onSelectKeyword
}) => {
  if (!keywords || keywords.length === 0) return null;

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Hash className="w-5 h-5 text-orange-400" />
            High-Demand Long-Tail Keywords
          </h3>
          <p className="text-xs text-slate-400">
            Discovered SEO phrases with high buyer conversion intent. Click any phrase to analyze its sub-niche.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {keywords.map((kw, idx) => (
          <button
            key={idx}
            onClick={() => onSelectKeyword(kw.keyword)}
            className="flex flex-col justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-900/90 text-left transition-all group"
          >
            <div className="flex items-start justify-between gap-1 mb-2">
              <span className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">
                &ldquo;{kw.keyword}&rdquo;
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">{kw.searchVolumeEstimate}</span>
              <span
                className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                  kw.competitionLevel === 'Low'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : kw.competitionLevel === 'Medium'
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-rose-400 bg-rose-500/10'
                }`}
              >
                {kw.competitionLevel} Comp
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
