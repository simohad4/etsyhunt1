export type CompetitionLevel = 'low' | 'medium' | 'high';
export type ResearchStage = 'trending' | 'high_potential' | 'optimized' | 'tracked';

export interface EtsyProductItem {
  id: string;
  identifier: string; // e.g. ETSY-101
  title: string;
  shopName: string;
  imageUrl: string;
  category: string;
  tags: string[];

  // 1. Observed Marketplace Signals (Directly observed from platform where available)
  observedPrice: number;
  observedShopRating?: number;
  observedReviewsCount?: number;
  observedShopLifetimeSales?: number;
  observedInCartCount?: number;
  observedIsBestseller?: boolean;
  observedIsSponsored?: boolean;
  etsyUrl?: string;

  // 2. Estimated Metrics (Statistically estimated from observed signals)
  estimatedMonthlyRevenue: number;
  estimatedMonthlySales: number;
  estimatedMonthlyViews: number;
  estimatedMarginPct: number;

  // 3. Modeled Indicators (Derived opportunity and competition scores)
  opportunityScore: number;
  competition: CompetitionLevel;
  stage: ResearchStage;

  notes?: string;
  createdAt: string;
}

export interface EtsyKeywordResult {
  keyword: string;
  // Estimated metrics
  estimatedSearchVolume: number;
  estimatedAvgPrice: number;
  // Modeled indicators
  competitionLevel: CompetitionLevel;
  modeledCompetitionCount: number;
  opportunityScore: number;
  // Candidate tags
  suggestedTags: string[];
}

export interface ResearchSearchHistoryItem {
  id: string;
  keyword: string;
  pagesRequested: number;
  creditsConsumed: number;
  timestamp: string;
  listingsFound: number;
}
