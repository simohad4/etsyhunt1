import {
  ANALYSIS_UNAVAILABLE_MESSAGE,
  createSupabaseAccessTokenVerifier,
  extractBearerToken
} from '@/src/server/m1Security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const verifyAccessToken = createSupabaseAccessTokenVerifier();

export async function POST(req: Request) {
  const accessToken = extractBearerToken(req.headers.get('authorization'));
  if (!accessToken) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const verifiedUser = await verifyAccessToken(accessToken).catch(() => null);
  if (!verifiedUser) {
    return Response.json(
      { error: 'Invalid or expired authentication token.' },
      { status: 401 }
    );
  }

  return Response.json({ error: ANALYSIS_UNAVAILABLE_MESSAGE }, { status: 503 });
}

