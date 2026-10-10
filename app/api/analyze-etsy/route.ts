import { fetchApifyListings, analyzeEtsyMarket } from '@/src/services/analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Next.js App Router Route Handler: POST /api/analyze-etsy
 * Compatible with Next.js 13+, 14+, and 15+ (App Router)
 * Accepts JSON body: { keyword: string, apifyToken?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { keyword, apifyToken } = body;

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return Response.json(
        { error: 'Keyword parameter is required and cannot be empty.' },
        { status: 400 }
      );
    }

    const cleanKeyword = keyword.trim();

    // 1. Fetch Etsy listings via Apify Actor (yumitori/etsy-listings-scraper)
    const tokenHeader = req.headers.get('x-apify-token');
    const effectiveToken = apifyToken || tokenHeader || process.env.APIFY_TOKEN;

    const { listings, isLive, error: scrapeNotice } = await fetchApifyListings(
      cleanKeyword,
      effectiveToken
    );

    if (!listings || listings.length === 0) {
      return Response.json(
        { error: 'No listings could be retrieved for this keyword.' },
        { status: 404 }
      );
    }

    // 2. Perform deep AI market intelligence using Google Gemini API
    const analysis = await analyzeEtsyMarket(
      cleanKeyword,
      listings,
      isLive,
      scrapeNotice
    );

    return Response.json(analysis, { status: 200 });
  } catch (error: any) {
    console.error('[API Route /api/analyze-etsy Error]:', error);

    const errorMessage = error.message || 'Internal server error analyzing Etsy market.';
    const statusCode = error.message?.includes('GEMINI_API_KEY') ? 500 : 502;

    return Response.json(
      {
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

