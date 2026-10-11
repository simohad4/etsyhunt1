import React, { useState } from 'react';
import {
  X,
  Search,
  Copy,
  Check,
  Plus,
  TrendingUp,
  Tag,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { EtsyProductItem, ResearchStage } from '../types/etsyHunter';
import { DEMO_KEYWORD_DATABASE } from '../data/mockEtsyHunterData';
import { useAuth } from '../context/AuthContext';
import { calculateRequiredCredits } from '../config/pricing';

interface EtsyTagAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Partial<EtsyProductItem>) => void;
  initialKeyword?: string;
}

export const EtsyTagAnalyzerModal: React.FC<EtsyTagAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  initialKeyword = 'ghost'
}) => {
  const { workspace, consumeCredits } = useAuth();
  const [searchTerm, setSearchTerm] = useState(initialKeyword);
  const [pagesToSearch, setPagesToSearch] = useState<number>(1);
  const [activeKeyword, setActiveKeyword] = useState('ghost');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Credit Confirmation dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  // Form for saving as candidate
  const [targetCategory, setTargetCategory] = useState('Home & Living');
  const [customPrice, setCustomPrice] = useState('28.50');
  const [customMargin, setCustomMargin] = useState('72');

  if (!isOpen) return null;

  const requiredCredits = calculateRequiredCredits(1, pagesToSearch);
  const currentCredits = workspace?.creditsRemaining ?? 0;

  // Retrieve demo keyword result or compute dynamic fallback
  const result =
    DEMO_KEYWORD_DATABASE[activeKeyword.toLowerCase()] ||
    DEMO_KEYWORD_DATABASE['ghost'] || {
      keyword: activeKeyword,
      estimatedSearchVolume: 24500,
      competitionLevel: 'low' as const,
      modeledCompetitionCount: 1820,
      opportunityScore: 88,
      estimatedAvgPrice: 26.50,
      suggestedTags: [
        activeKeyword,
        `${activeKeyword} gift`,
        `handmade ${activeKeyword}`,
        `custom ${activeKeyword}`,
        `cute ${activeKeyword}`,
        `${activeKeyword} decor`,
        `gift for her`,
        `personalized gift`
      ]
    };

  const handleInitiateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    if (currentCredits < requiredCredits) {
      setResearchError(`Insufficient research credits (${currentCredits} remaining, ${requiredCredits} required).`);
      return;
    }

    setResearchError(null);
    setShowConfirm(true);
  };

  const handleConfirmSearch = async () => {
    if (isSubmitting) return; // Prevent duplicate submission
    setIsSubmitting(true);

    try {
      const success = await consumeCredits(requiredCredits, {
        keyword: searchTerm.trim(),
        pages: pagesToSearch,
        listingsFound: Math.min(36 * pagesToSearch, 32 + Math.floor(Math.random() * 8))
      });

      if (!success) {
        setResearchError('Paid research is unavailable during M1 security hardening. No credits were consumed.');
        setShowConfirm(false);
        setIsSubmitting(false);
        return;
      }
    } catch {
      setResearchError('Paid research is unavailable during M1 security hardening. No credits were consumed.');
      setShowConfirm(false);
      setIsSubmitting(false);
      return;
    }

    const term = searchTerm.trim().toLowerCase();
    const matchedKey = Object.keys(DEMO_KEYWORD_DATABASE).find((k) =>
      term.includes(k)
    );
    if (matchedKey) {
      setActiveKeyword(matchedKey);
    } else {
      setActiveKeyword(searchTerm.trim());
    }

    setShowConfirm(false);
    setIsSubmitting(false);
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

  const handleSaveListingCandidate = () => {
    onAddProduct({
      title: `${activeKeyword.charAt(0).toUpperCase() + activeKeyword.slice(1)} Gift Collection`,
      category: targetCategory,
      observedPrice: parseFloat(customPrice) || 28.5,
      estimatedMonthlyRevenue: (parseFloat(customPrice) || 28.5) * 320,
      estimatedMonthlySales: 320,
      estimatedMonthlyViews: 14200,
      estimatedMarginPct: parseInt(customMargin, 10) || 72,
      tags: result.suggestedTags,
      competition: result.competitionLevel,
      opportunityScore: result.opportunityScore,
      stage: 'trending',
      notes: `Researched from keyword "${activeKeyword}". Modeled opportunity score: ${result.opportunityScore}.`
    });
    onClose();
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
                1 Credit = 1 Search Page (~36 listings max)
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
                  className="bg-transparent text-[#f7f8f8] text-xs focus:outline-none cursor-pointer"
                >
                  <option value={1} className="bg-[#121216]">1 page (1 credit)</option>
                  <option value={2} className="bg-[#121216]">2 pages (2 credits)</option>
                  <option value={3} className="bg-[#121216]">3 pages (3 credits)</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold shadow-[0_0_14px_rgba(94,106,210,0.35)] transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Execute Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Credit Quota & Requirements Notice */}
            <div className="flex items-center justify-between text-[11px] text-[#8a8f98] pt-1">
              <span>
                Required: <strong className="text-[#f7f8f8]">{requiredCredits} research credit{requiredCredits > 1 ? 's' : ''}</strong> (1 kw × {pagesToSearch} page{pagesToSearch > 1 ? 's' : ''})
              </span>
              <span>
                Available balance: <strong className="text-[#30a46c]">{currentCredits} credit{currentCredits !== 1 ? 's' : ''}</strong>
              </span>
            </div>
          </form>

          {/* Research availability / credit error banner */}
          {researchError && (
            <div className="p-3 rounded-lg bg-[#e5484d]/10 border border-[#e5484d]/30 text-xs text-[#e5484d] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{researchError}</span>
              </div>
              <span className="text-[11px] text-[#8a8f98]">
                Paid providers remain disabled in M1.
              </span>
            </div>
          )}

          {/* Confirmation Dialog Before Consuming Credits */}
          {showConfirm && (
            <div className="p-4 rounded-xl bg-[#18181f] border border-[#5e6ad2] text-xs space-y-3 animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#f7f8f8]">Confirm Credit Consumption</span>
                <span className="font-mono text-[#707bfb]">{requiredCredits} credit{requiredCredits > 1 ? 's' : ''}</span>
              </div>
              <p className="text-[#8a8f98] leading-relaxed">
                This search for &ldquo;{searchTerm}&rdquo; will query {pagesToSearch} page{pagesToSearch > 1 ? 's' : ''} of listing results (approx. up to {36 * pagesToSearch} listings) and consume {requiredCredits} research credit from your balance.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmSearch}
                  className="px-3.5 py-1.5 rounded-md bg-[#5e6ad2] text-white font-medium hover:bg-[#6875e5] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Querying...' : 'Confirm & Query'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1.5 rounded-md bg-[#22222b] text-[#8a8f98] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metrics Overview Grid (Taxonomy: Estimated vs Modeled) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
              <span className="text-[#8a8f98] text-[10px] block mb-1">
                Estimated Volume
              </span>
              <span className="font-mono font-bold text-[#f7f8f8] text-sm">
                {result.estimatedSearchVolume.toLocaleString()}/mo
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
              <span className="text-[#8a8f98] text-[10px] block mb-1">
                Observed Avg Price
              </span>
              <span className="font-mono font-bold text-[#f7f8f8] text-sm">
                ${result.estimatedAvgPrice.toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
              <span className="text-[#8a8f98] text-[10px] block mb-1">
                Modeled Competition
              </span>
              <span className="font-mono font-bold capitalize text-[#30a46c] text-sm">
                {result.competitionLevel} ({result.modeledCompetitionCount})
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#18181f] border border-[#282835]">
              <span className="text-[#8a8f98] text-[10px] block mb-1">
                Opportunity Score
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

          {/* Save as Listing Candidate Form */}
          <div className="p-4 rounded-xl bg-[#18181f] border border-[#282835] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#f7f8f8]">
                Save as Research Candidate Listing
              </span>
              <span className="text-[10px] text-[#8a8f98]">
                Adds to your personal library
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] text-[#8a8f98] block mb-1">
                  Category
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[#121216] border border-[#282835] text-xs text-[#f7f8f8] focus:outline-none"
                >
                  <option value="Home & Living">Home &amp; Living</option>
                  <option value="Apparel & Sweatshirts">Apparel &amp; Sweatshirts</option>
                  <option value="Digital Downloads">Digital Downloads</option>
                  <option value="Jewelry & Accessories">Jewelry &amp; Accessories</option>
                  <option value="Paper & Party Supplies">Paper &amp; Party Supplies</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8a8f98] block mb-1">
                  Target Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[#121216] border border-[#282835] text-xs text-[#f7f8f8] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8a8f98] block mb-1">
                  Est. Margin (%)
                </label>
                <input
                  type="number"
                  value={customMargin}
                  onChange={(e) => setCustomMargin(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[#121216] border border-[#282835] text-xs text-[#f7f8f8] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveListingCandidate}
              className="w-full py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Candidate to Personal Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
