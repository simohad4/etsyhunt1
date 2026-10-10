export interface PricingPlan {
  id: 'starter' | 'pro' | 'agency';
  name: string;
  price: number; // Monthly price in USD
  billingPeriod: 'month';
  creditsPerMonth: number;
  maxSavedListings: number;
  description: string;
  features: string[];
  recommended?: boolean;
  ctaText: string;
}

export const PRICING_PLANS: Record<'starter' | 'pro' | 'agency', PricingPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    billingPeriod: 'month',
    creditsPerMonth: 20,
    maxSavedListings: 50,
    description: 'Essential research tools for independent sellers starting out.',
    features: [
      '20 research credits / month',
      'Up to 50 saved listings',
      'Core product & niche research',
      'Observed marketplace price & shop metrics',
      'Modeled opportunity & competition scores',
      'Single personal workspace'
    ],
    recommended: false,
    ctaText: 'Choose Starter'
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 59,
    billingPeriod: 'month',
    creditsPerMonth: 60,
    maxSavedListings: 250,
    description: 'Advanced market intelligence for active Etsy and print-on-demand sellers.',
    features: [
      '60 research credits / month',
      'Up to 250 saved listings',
      'Advanced listing & niche comparisons',
      'Full CSV data exports',
      'Additional demand trend indicators where available',
      'Observed in-cart counts & bestseller flags',
      'Modeled demand & margin projections',
      'Single personal workspace'
    ],
    recommended: true,
    ctaText: 'Choose Pro'
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 119,
    billingPeriod: 'month',
    creditsPerMonth: 120,
    maxSavedListings: 1000,
    description: 'Comprehensive research capacity for high-volume catalogs and multiple brands.',
    features: [
      '120 research credits / month',
      'Up to 1,000 saved listings',
      'Extended research workflows',
      'Full CSV data exports',
      'Comprehensive listing comparisons',
      'Observed signals & estimated metrics',
      'Single personal workspace'
    ],
    recommended: false,
    ctaText: 'Choose Agency'
  }
};

/**
 * Calculates required research credits based on the standard credit rule:
 * Required credits = number of keywords × number of requested pages
 *
 * Each credit represents 1 keyword search page with approximately up to 36 Etsy listings
 * (depending on provider availability).
 */
export function calculateRequiredCredits(keywordCount: number, pagesPerKeyword: number): number {
  const safeKeywords = Math.max(0, Math.floor(keywordCount));
  const safePages = Math.min(3, Math.max(1, Math.floor(pagesPerKeyword)));
  return safeKeywords * safePages;
}
