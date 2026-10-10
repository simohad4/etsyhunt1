import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Search,
  Copy,
  Check,
  Plus,
  TrendingUp,
  Tag,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldAlert,
  Percent,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { EtsyProductItem, ResearchStage, CompetitionLevel } from '../types/etsyHunter';
import { MOCK_KEYWORD_DATABASE } from '../data/mockEtsyHunterData';
import { useAuth } from '../context/AuthContext';

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
  const { activeWorkspace, consumeCredit } = useAuth();
  const [searchTerm, setSearchTerm] = useState(initialKeyword);
  const [activeKeyword, setActiveKeyword] = useState('ghost');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Form for adding to board
  const [targetStage, setTargetStage] = useState<ResearchStage>('trending');
  const [targetCategory, setTargetCategory] = useState('Home & Living');
  const [retailPrice, setRetailPrice] = useState('28.50');
  const [profitMargin, setProfitMargin] = useState('72');
  const [customTitle, setCustomTitle] = useState('');

  if (!isOpen) return null;

  // Retrieve or compute keyword result
  const result =
    MOCK_KEYWORD_DATABASE[activeKeyword.toLowerCase()] ||
    MOCK_KEYWORD_DATABASE['ghost'] || {
      keyword: activeKeyword,
      searchVolume: 24500,
      competitionLevel: 'low' as CompetitionLevel,
      competitionCount: 1820,
      clickThroughRate: 9.2,
      avgPrice: 26.5,
      opportunityScore: 89,
      recommendedTags: [
        activeKeyword,
        `${activeKeyword} gift`,
        `handmade ${activeKeyword}`,
        `personalized ${activeKeyword}`,
        `custom ${activeKeyword}`,
        `vintage ${activeKeyword}`,
        `cute ${activeKeyword}`,
        `minimalist ${activeKeyword}`,
        `${activeKeyword} decor`,
        `trending ${activeKeyword}`,
        `aesthetic ${activeKeyword}`,
        `gift for her`,
        `instant gift`
      ]
    };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // Deduct 1 credit for Etsy API scan
    consumeCredit(1);

    const term = searchTerm.trim().toLowerCase();
    const matchedKey = Object.keys(MOCK_KEYWORD_DATABASE).find((k) =>
      term.includes(k)
    );
    if (matchedKey) {
      setActiveKeyword(matchedKey);
      setCustomTitle(MOCK_KEYWORD_DATABASE[matchedKey].keyword);
    } else {
      setActiveKeyword(searchTerm.trim());
      setCustomTitle(searchTerm.trim());
    }
  };

  const handleCopyAllTags = () => {
    const formatted = result.recommendedTags.join(', ');
    navigator.clipboard.writeText(formatted);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleCopySingleTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const handleSaveToBoard = () => {
    const titleToUse =
      customTitle.trim() ||
      result.keyword
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    const newProduct: Partial<EtsyProductItem> = {
      title: titleToUse,
      shopName: 'TrendingHuntShop',
      shopRating: 4.95,
      reviewsCount: Math.floor(120 + Math.random() * 2400),
      imageUrl:
        activeKeyword === 'sweatshirt'
          ? 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&auto=format&fit=crop&q=80'
          : activeKeyword === 'wedding'
          ? 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&auto=format&fit=crop&q=80'
          : activeKeyword === 'birth flower'
          ? 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80',
      price: parseFloat(retailPrice) || result.avgPrice,
      estimatedMonthlyRevenue: Math.floor(
        (parseFloat(retailPrice) || result.avgPrice) * (180 + Math.random() * 320)
      ),
      monthlySales: Math.floor(180 + Math.random() * 320),
      monthlyViews: result.searchVolume,
      inCartCount: Math.min(20, Math.floor(8 + Math.random() * 15)),
      stage: targetStage,
      competition: result.competitionLevel,
      category: targetCategory,
      tags: result.recommendedTags,
      estimatedMarginPct: parseInt(profitMargin, 10) || 70,
      isBestseller: result.opportunityScore > 90,
      notes: `Scanned via Etsy Tag Explorer with ${result.searchVolume.toLocaleString()} monthly search volume.`
    };

    onAddProduct(newProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#121216] border border-[#22222b] shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="h-12 px-5 border-b border-[#22222b] bg-[#0e0e13] flex items-center justify-between text-xs text-[#8a8f98] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5e6ad2]" />
            <span className="font-semibold text-[#f7f8f8]">Etsy Tag Analyzer &amp; Keyword Explorer</span>
            <span className="text-[#575a65]">·</span>
            <span className="font-mono text-[#707bfb]">13 Tags Generator</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#8a8f98] hidden sm:inline">
              1 Scan Credit per search
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#575a65] hover:text-[#f7f8f8] hover:bg-[#18181f] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Keyword Search Input Bar */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="block text-[11px] font-mono uppercase text-[#8a8f98] tracking-wider">
              Explore Niche or Enter Etsy Product Keyword
            </label>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#575a65] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="e.g. ghost campfire, retro nurse sweatshirt, wedding planner, birth flower..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0b0b0f] border border-[#22222b] rounded-lg text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_14px_rgba(94,106,210,0.35)] cursor-pointer shrink-0"
              >
                <span>Analyze</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Keyword Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[#575a65] font-mono mr-1">Trending:</span>
              {[
                { label: 'Ghost Night Light', key: 'ghost' },
                { label: 'Retro Sweatshirt', key: 'sweatshirt' },
                { label: 'Wedding Budget', key: 'wedding' },
                { label: 'Birth Flower Plaque', key: 'birth flower' }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSearchTerm(item.label);
                    setActiveKeyword(item.key);
                    consumeCredit(1);
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                    activeKeyword === item.key
                      ? 'bg-[#5e6ad2]/20 border-[#5e6ad2] text-[#707bfb]'
                      : 'bg-[#18181f] border-[#22222b] text-[#8a8f98] hover:text-[#f7f8f8]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </form>

          {/* Real-time Market Intelligence Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#0b0b0f] border border-[#22222b] space-y-1">
              <div className="text-[10px] font-mono text-[#8a8f98] uppercase">Monthly Searches</div>
              <div className="text-base font-bold font-mono text-[#f7f8f8]">
                {result.searchVolume.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#10b981] flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>High Buyer Intent</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0b0f] border border-[#22222b] space-y-1">
              <div className="text-[10px] font-mono text-[#8a8f98] uppercase">Competition</div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold capitalize text-[#f7f8f8]">
                  {result.competitionLevel}
                </span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#181822] text-[#707bfb] border border-[#262638]">
                  {result.competitionCount.toLocaleString()} shops
                </span>
              </div>
              <div className="text-[10px] text-[#8a8f98]">Easy Rank Potential</div>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0b0f] border border-[#22222b] space-y-1">
              <div className="text-[10px] font-mono text-[#8a8f98] uppercase">Click-Through Rate</div>
              <div className="text-base font-bold font-mono text-[#f7f8f8]">
                {result.clickThroughRate}%
              </div>
              <div className="text-[10px] text-[#8a8f98]">Benchmark: 4.5%</div>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0b0f] border border-[#22222b] space-y-1">
              <div className="text-[10px] font-mono text-[#8a8f98] uppercase">Opportunity Score</div>
              <div className="text-base font-bold font-mono text-[#707bfb]">
                {result.opportunityScore}/100
              </div>
              <div className="w-full bg-[#18181f] h-1 rounded-full overflow-hidden">
                <div
                  className="bg-[#5e6ad2] h-full rounded-full"
                  style={{ width: `${result.opportunityScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* 13 High-Ranking Etsy Tags Card */}
          <div className="p-4 rounded-xl bg-[#0e0e13] border border-[#22222b] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-[#5e6ad2]" />
                <span className="text-xs font-semibold text-[#f7f8f8]">
                  13 Bestseller Etsy Tags (Rank-Optimized)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#181820] text-[#707bfb] border border-[#262638]">
                  {result.recommendedTags.length}/13 Slots
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyAllTags}
                className="px-2.5 py-1 rounded bg-[#18181f] hover:bg-[#22222b] border border-[#282835] text-[11px] font-medium text-[#f7f8f8] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10b981]" />
                    <span className="text-[#10b981]">Copied 13 Tags!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#5e6ad2]" />
                    <span>Copy All 13 Tags</span>
                  </>
                )}
              </button>
            </div>

            {/* Tags Cloud */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {result.recommendedTags.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCopySingleTag(tag)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-mono transition-all flex items-center gap-1 cursor-pointer ${
                    copiedTag === tag
                      ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                      : 'bg-[#121217] hover:bg-[#181822] border-[#22222b] hover:border-[#5e6ad2]/50 text-[#8a8f98] hover:text-[#f7f8f8]'
                  }`}
                  title="Click to copy single tag"
                >
                  <span className="text-[#575a65] text-[10px]">#{idx + 1}</span>
                  <span>{tag}</span>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-[#575a65] pt-1">
              💡 Tip: Etsy allows exactly 13 tags up to 20 characters each. Using all 13 slots dramatically increases search visibility in the algorithm.
            </p>
          </div>

          {/* Add to Research Board Form */}
          <div className="p-4 rounded-xl bg-[#121216] border border-[#5e6ad2]/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#5e6ad2]" />
                Track &amp; Add to Research Kanban Board
              </span>
              <span className="text-[10px] font-mono text-[#8a8f98]">
                Stage &amp; Profit Parameters
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#8a8f98] mb-1">
                  Research Stage
                </label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value as ResearchStage)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0b0f] border border-[#22222b] rounded-md text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                >
                  <option value="trending">Trending Ideas (Backlog)</option>
                  <option value="high_potential">High Potential (Todo)</option>
                  <option value="optimized">Optimized (In Progress)</option>
                  <option value="tracked">Tracked / Watchlist (Done)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#8a8f98] mb-1">
                  Category
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0b0f] border border-[#22222b] rounded-md text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                >
                  <option value="Home & Living">Home &amp; Living</option>
                  <option value="Apparel & Sweatshirts">Apparel &amp; Sweatshirts</option>
                  <option value="Digital Downloads & Printables">Digital Downloads</option>
                  <option value="Jewelry & Accessories">Jewelry &amp; Accessories</option>
                  <option value="Craft Supplies & Tools">Craft Supplies</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#8a8f98] mb-1">
                  Retail Price ($)
                </label>
                <input
                  type="number"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0b0f] border border-[#22222b] rounded-md text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-md hover:bg-[#18181f] text-xs text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveToBoard}
                className="px-4 py-1.5 rounded-md bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(94,106,210,0.4)] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product to Kanban Board</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
