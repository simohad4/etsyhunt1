import { EtsyProductItem, EtsyKeywordResult } from '../types/etsyHunter';

export const DEMO_ETSY_PRODUCTS: EtsyProductItem[] = [
  {
    id: 'demo-prod-1',
    identifier: 'ETSY-241',
    title: 'Custom Birth Flower Acrylic Plaque with Wooden LED Base',
    shopName: 'AuraCraftStudio',
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80',
    category: 'Home & Living',
    tags: [
      'birth flower gift',
      'custom acrylic sign',
      'led night light',
      'mothers day plaque',
      'personalized gift',
      'desk decor',
      'acrylic keepsake',
      'grandma gift',
      'custom flower art',
      'gift for mom'
    ],
    // Observed marketplace signals
    observedPrice: 34.99,
    observedShopRating: 4.95,
    observedReviewsCount: 3820,
    observedShopLifetimeSales: 48200,
    observedInCartCount: 20,
    observedIsBestseller: true,
    observedIsSponsored: false,
    etsyUrl: 'https://www.etsy.com',

    // Estimated metrics
    estimatedMonthlyRevenue: 14695,
    estimatedMonthlySales: 420,
    estimatedMonthlyViews: 28400,
    estimatedMarginPct: 74,

    // Modeled indicators
    opportunityScore: 88,
    competition: 'low',
    stage: 'trending',

    notes: 'Seasonal Mother’s Day gift angle. Wooden LED base available from multiple fulfillment partners.',
    createdAt: 'Sample listing'
  },
  {
    id: 'demo-prod-2',
    identifier: 'ETSY-239',
    title: 'Retro Nurse Comfort Colors Embroidered Sweatshirt',
    shopName: 'ThreadVibeCo',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&auto=format&fit=crop&q=80',
    category: 'Apparel & Sweatshirts',
    tags: [
      'nurse sweatshirt',
      'comfort colors 1717',
      'retro nurse crewneck',
      'rn graduation gift',
      'pediatric nurse',
      'embroidered crewneck',
      'nursing school',
      'healthcare worker'
    ],
    // Observed marketplace signals
    observedPrice: 42.00,
    observedShopRating: 4.92,
    observedReviewsCount: 1450,
    observedShopLifetimeSales: 16400,
    observedInCartCount: 18,
    observedIsBestseller: true,
    observedIsSponsored: false,
    etsyUrl: 'https://www.etsy.com',

    // Estimated metrics
    estimatedMonthlyRevenue: 11760,
    estimatedMonthlySales: 280,
    estimatedMonthlyViews: 19500,
    estimatedMarginPct: 62,

    // Modeled indicators
    opportunityScore: 78,
    competition: 'medium',
    stage: 'trending',

    notes: 'Apparel listing with heavy gift seasonality around graduation and holidays.',
    createdAt: 'Sample listing'
  },
  {
    id: 'demo-prod-3',
    identifier: 'ETSY-184',
    title: 'Minimalist Wedding Budget Planner Spreadsheet (Google Sheets)',
    shopName: 'PaperlessPlannerShop',
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&auto=format&fit=crop&q=80',
    category: 'Digital Downloads',
    tags: [
      'wedding budget sheet',
      'google sheets planner',
      'wedding checklist',
      'bridal budget template',
      'event spreadsheet',
      'digital wedding guide'
    ],
    // Observed marketplace signals
    observedPrice: 12.50,
    observedShopRating: 4.98,
    observedReviewsCount: 4200,
    observedShopLifetimeSales: 78500,
    observedInCartCount: 24,
    observedIsBestseller: true,
    observedIsSponsored: false,
    etsyUrl: 'https://www.etsy.com',

    // Estimated metrics
    estimatedMonthlyRevenue: 8500,
    estimatedMonthlySales: 680,
    estimatedMonthlyViews: 34000,
    estimatedMarginPct: 92,

    // Modeled indicators
    opportunityScore: 94,
    competition: 'low',
    stage: 'high_potential',

    notes: 'Instant digital delivery template with near-zero marginal production cost.',
    createdAt: 'Sample listing'
  },
  {
    id: 'demo-prod-4',
    identifier: 'ETSY-112',
    title: 'Personalized Dainty Birthstone Stacking Ring Set',
    shopName: 'AuraCraftStudio',
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&auto=format&fit=crop&q=80',
    category: 'Jewelry & Accessories',
    tags: [
      'birthstone ring',
      'custom stackable rings',
      'gold filled jewelry',
      'dainty mother ring',
      'family keepsake',
      'minimalist ring'
    ],
    // Observed marketplace signals
    observedPrice: 38.00,
    observedShopRating: 4.94,
    observedReviewsCount: 8900,
    observedShopLifetimeSales: 94000,
    observedInCartCount: 15,
    observedIsBestseller: false,
    observedIsSponsored: false,
    etsyUrl: 'https://www.etsy.com',

    // Estimated metrics
    estimatedMonthlyRevenue: 13680,
    estimatedMonthlySales: 360,
    estimatedMonthlyViews: 22000,
    estimatedMarginPct: 78,

    // Modeled indicators
    opportunityScore: 72,
    competition: 'high',
    stage: 'optimized',

    notes: 'Competitive niche with strong repeat purchasing for milestones.',
    createdAt: 'Sample listing'
  }
];

export const DEMO_KEYWORD_DATABASE: Record<string, EtsyKeywordResult> = {
  ghost: {
    keyword: 'cute ghost mug',
    estimatedSearchVolume: 24500,
    estimatedAvgPrice: 24.50,
    competitionLevel: 'low',
    modeledCompetitionCount: 1820,
    opportunityScore: 89,
    suggestedTags: [
      'cute ghost mug',
      'ghost coffee cup',
      'halloween mug gift',
      'aesthetic ceramic',
      'fall coffee cup',
      'handmade ghost mug',
      'cute halloween gift'
    ]
  },
  wedding: {
    keyword: 'wedding budget planner google sheets',
    estimatedSearchVolume: 32000,
    estimatedAvgPrice: 14.20,
    competitionLevel: 'low',
    modeledCompetitionCount: 940,
    opportunityScore: 94,
    suggestedTags: [
      'wedding budget',
      'google sheets wedding',
      'wedding calculator',
      'bridal planner spreadsheet',
      'wedding organizer digital'
    ]
  },
  nurse: {
    keyword: 'nurse embroidered sweatshirt',
    estimatedSearchVolume: 18900,
    estimatedAvgPrice: 42.00,
    competitionLevel: 'medium',
    modeledCompetitionCount: 3100,
    opportunityScore: 76,
    suggestedTags: [
      'nurse sweatshirt',
      'comfort colors crewneck',
      'rn graduation gift',
      'hospital nurse gift',
      'healthcare worker crew'
    ]
  }
};
