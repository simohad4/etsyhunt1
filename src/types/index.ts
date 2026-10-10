export interface EtsyListingItem {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  currency: string;
  url: string;
  imageUrl: string;
  shopName: string;
  shopRating?: number;
  reviewsCount?: number;
  inCartCount?: number;
  boughtLast24h?: number;
  isBestseller?: boolean;
  badge?: string;
  tags?: string[];
  shippingPrice?: number;
}

export interface WinningIdea {
  id: string;
  title: string;
  nicheAngle: string;
  targetAudience: string;
  whyItSells: string;
  estimatedRetailPrice: number;
  estimatedProductionCost: number;
  estimatedMarginPercentage: number;
  recommendedTags: string[];
  differentiationStrategy: string;
  podFulfillmentTip: string;
}

export interface MarketMetrics {
  demandScore: number;
  competitionScore: number;
  opportunityScore: number;
  avgPrice: number;
  medianPrice: number;
  totalCarts: number;
  totalBought24h: number;
  bestsellerRatio: number;
  marketMaturity: 'Emerging' | 'Growth' | 'Saturated' | 'High Opportunity';
}

export interface MarketSummary {
  overview: string;
  keyDemandDrivers: string[];
  pricingStrategy: string;
  untappedAngles: string[];
  riskFactors: string[];
}

export interface HighDemandKeyword {
  keyword: string;
  searchVolumeEstimate: string;
  competitionLevel: 'Low' | 'Medium' | 'High';
}

export interface MarketAnalysisResult {
  keyword: string;
  timestamp: string;
  isLiveScraped: boolean;
  dataSource: 'apify' | 'fallback_market_engine';
  totalListingsAnalyzed: number;
  metrics: MarketMetrics;
  marketSummary: MarketSummary;
  winningIdeas: WinningIdea[];
  competitors: EtsyListingItem[];
  highDemandKeywords: HighDemandKeyword[];
  notes?: string;
}
