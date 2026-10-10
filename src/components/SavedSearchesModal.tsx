import React from 'react';
import { X, Bookmark, Trash2, ArrowRight, History } from 'lucide-react';

interface SavedSearchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedKeywords: string[];
  onSelectSearch: (kw: string) => void;
  onClearAll: () => void;
  onRemoveItem: (kw: string) => void;
}

export const SavedSearchesModal: React.FC<SavedSearchesModalProps> = ({
  isOpen,
  onClose,
  savedKeywords,
  onSelectSearch,
  onClearAll,
  onRemoveItem
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl bg-[#0F1522] border border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-[#F97316] border border-slate-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Saved Searches &amp; Niche History
              </h3>
              <p className="text-[11px] text-slate-400">
                Bookmarked market intelligence queries stored in your workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedKeywords.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No saved searches yet. Run a search in your workspace to save niches here.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {savedKeywords.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-[#141B29] border border-slate-800 hover:border-slate-700 transition-colors group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Bookmark className="w-4 h-4 text-[#F97316] shrink-0" />
                  <span className="text-xs font-semibold text-white truncate capitalize">
                    {item}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectSearch(item);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#F97316]/10 hover:bg-[#F97316] text-[#F97316] hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Analyze</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => onRemoveItem(item)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs">
          {savedKeywords.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear All History
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
