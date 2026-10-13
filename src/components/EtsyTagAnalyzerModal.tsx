import React, { useState } from 'react';
import {
  X,
  Search,
  Copy,
  Check,
  Tag,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { DEMO_KEYWORD_DATABASE } from '../data/mockEtsyHunterData';
import { useAuth } from '../context/AuthContext';
import { calculateRequiredCredits } from '../config/pricing';

interface EtsyTagAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialKeyword?: string;
}

export const EtsyTagAnalyzerModal: React.FC<EtsyTagAnalyzerModalProps> = ({
  isOpen,
  onClose,
  initialKeyword = 'ghost'
}) => {
  const { workspace } = useAuth();
  const [searchTerm, setSearchTerm] = useState(initialKeyword);
  const [pagesToSearch, setPagesToSearch] = useState<number>(1);
  const activeKeyword = 'ghost';
  const [isCopied, setIsCopied] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const [researchError, setResearchError] = useState<string | null>(null);

  if (!isOpen) return null;

  const requiredCredits = calculateRequiredCredits(1, pagesToSearch);
  const currentCredits = workspace?.creditsRemaining ?? 0;

  // Static sample content for interface preview only. This is never treated as a provider result.
  const result =
    DEMO_KEYWORD_DATABASE[activeKeyword.toLowerCase()] ||
    DEMO_KEYWORD_DATABASE['ghost'];

  const handleInitiateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setResearchError('Live research is paused in this release. No credits were consumed.');
  };

  const handleCopyAllTags = () => {
    const formatted = result.suggestedTags.join(', ');
    navigator.clipboard.writeText(formatted);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopySingleTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#121216] border border-[#22222b] shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="h-14 px-6 border-b border-[#22222b] flex items-center justify-between shrink-0 bg-[#0e0e13]">
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-[#5e6ad2]" />
            <div>
              <h2 className="text-sm font-bold text-[#f7f8f8]">
                Product Research &amp; Keyword Explorer
              </h2>
              <span className="text-[10px] text-[#8a8f98] font-mono">
                Demo preview · live research paused
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#575a65] hover:text-[#f7f8f8] hover:bg-[#18181f] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Query Input with Page Selector */}
        <div className="p-6 border-b border-[#22222b] bg-[#121216] space-y-4">
          <form onSubmit={handleInitiateSearch} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter keyword or product phrase (e.g. cute ghost mug)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2]"
                />
                <Search className="w-3.5 h-3.5 text-[#575a65] absolute left-3 top-3.5" />
              </div>

              {/* Pages to Search Selector (1 to 3 pages) */}
              <div className="flex items-center gap-1.5 bg-[#18181f] border border-[#282835] rounded-lg px-2.5 py-1 text-xs">
                <span className="text-[#8a8f98] text-[11px]">Pages:</span>
                <select
                  value={pagesToSearch}
                  onChange={(e) => setPagesToSearch(parseInt(e.target.value, 10))}
                  disabled
                  className="bg-transparent text-[#f7f8f8] text-xs focus:outline-none cursor-pointer"
                >
                  <option value={1} className="bg-[#121216]">1 page (1 credit)</option>
                  <option value={2} className="bg-[#121216]">2 pages (2 credits)</option>
                  <option value={3} className="bg-[#121216]">3 pages (3 credits)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled
                className="px-4 py-2.5 rounded-lg border border-[#282835] bg-[#18181f] text-[#575a65] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed shrink-0"
              >
                <span>Research unavailable</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Credit Quota & Requirements Notice */}
            <div className="flex items-center justify-between text-[11px] text-[#8a8f98] pt-1">
              <span>
                Planned cost: <strong className="text-[#f7f8f8]">{requiredCredits} research credit{requiredCredits > 1 ? 's' : ''}</strong>
              </span>
              <span>
                Account balance: <strong className="text-[#30a46c]">{currentCredits} credit{currentCredits !== 1 ? 's' : ''}</strong>
              </span>
            </div>
          </form>

          {/* Research availability / credit error banner */}
          <div role="status" className="p-3 rounded-lg bg-[#f5d90a]/10 border border-[#f5d90a]/30 text-xs text-[#e8d76b] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{researchError || 'Live research is paused in this release. No credits were consumed.'}</span>
              </div>
              <span className="text-[11px] text-[#8a8f98]">
                Sample data below is not a live result.
              </span>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-lg border border-[#5e6ad2]/30 bg-[#5e6ad2]/10 px-3 py-2 text-[11px] leading-5 text-[#aab1ff]">
            Demo preview: every value and tag below is sample content. Nothing was fetched from the marketplace or saved to account history.
          </div>
          {/* Metrics Overview Grid (Taxonomy: Estimated vs Modeled) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
              <span className="text-[#8a8f98] text-[10px] block mb-1">
                Sample Est. Volume
              </span>
              <span className="font-mono font-bold text-[#f7f8f8] text-sm">
                {result.estimatedSearchVolume.toLocaleString()}/mo
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
              <span className="text-[#8a8f98] text-[10px] block mb-1">
                Sample Avg Price
              </span>
              <span className="font-mono font-bold text-[#f7f8f8] text-sm">
                ${result.estimatedAvgPrice.toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
              <span className="text-[#8a8f98] text-[10px] block mb-1">
                Sample Competition
              </span>
              <span className="font-mono font-bold capitalize text-[#30a46c] text-sm">
                {result.competitionLevel} ({result.modeledCompetitionCount})
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
              <span className="text-[#8a8f98] text-[10px] block mb-1">
                Sample Opportunity Score
              </span>
              <span className="font-mono font-bold text-[#707bfb] text-sm">
                {result.opportunityScore} / 100
              </span>
            </div>
          </div>

          {/* Candidate Tags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#f7f8f8]">
                Candidate Keyword Tags ({result.suggestedTags.length})
              </h3>
              <button
                type="button"
                onClick={handleCopyAllTags}
                className="px-2.5 py-1 rounded-md bg-[#18181f] hover:bg-[#22222b] border border-[#282835] text-xs text-[#8a8f98] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-[#30a46c]" />
                    <span className="text-[#30a46c]">Copied All</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy All Tags</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {result.suggestedTags.map((tag, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCopySingleTag(tag)}
                  className="px-2.5 py-1 rounded-md bg-[#18181f] hover:bg-[#22222b] border border-[#282835] hover:border-[#3b3b4f] text-xs text-[#8a8f98] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{tag}</span>
                  {copiedTag === tag ? (
                    <Check className="w-3 h-3 text-[#30a46c]" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-[#575a65]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Demo results cannot enter authenticated customer state. */}
          <div className="p-4 rounded-xl bg-[#18181f] border border-[#282835] space-y-3 text-xs">
            <span className="font-semibold text-[#f7f8f8]">Demo preview only</span>
            <p className="text-[#8a8f98] leading-5">
              Sample keyword values cannot be added to the customer research board or saved to the account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
