export type CompetitionLevel = 'low' | 'medium' | 'high';
export type ResearchStage = 'trending' | 'high_potential' | 'optimized' | 'tracked';

export interface EtsyProductItem {
  id: string;
  identifier: string; // e.g. ETSY-101
  title: string;
  shopName: string;
  shopRating: number;
  reviewsCount: number;
  imageUrl: string;
  price: number;
  estimatedMonthlyRevenue: number;
  monthlySales: number;
  monthlyViews: number;
  inCartCount: number;
  stage: ResearchStage;
  competition: CompetitionLevel;
  category: string;
  tags: string[];
  estimatedMarginPct: number;
  etsyUrl?: string;
  isBestseller?: boolean;
  notes?: string;
  createdAt: string;
}

export interface EtsyKeywordResult {
  keyword: string;
  searchVolume: number;
  competitionLevel: CompetitionLevel;
  competitionCount: number;
  clickThroughRate: number;
  avgPrice: number;
  recommendedTags: string[];
  opportunityScore: number;
}
