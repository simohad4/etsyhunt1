import { createClient } from '@supabase/supabase-js';
import { hasValidSupabaseConfiguration } from '../security/supabaseConfiguration';

export const ANALYSIS_UNAVAILABLE_MESSAGE =
  'Analysis is unavailable during M1 security hardening.';

export interface VerifiedSupabaseUser {
  id: string;
}

export type AccessTokenVerifier = (
  accessToken: string
) => Promise<VerifiedSupabaseUser | null>;

export function extractBearerToken(authorizationHeader: string | null | undefined): string | null {
  const match = authorizationHeader?.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

export function isLiveScrapingEnabled(value = process.env.ENABLE_LIVE_SCRAPING): boolean {
  return value === 'true';
}

export function createSupabaseAccessTokenVerifier(
  env: NodeJS.ProcessEnv = process.env
): AccessTokenVerifier {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!hasValidSupabaseConfiguration(supabaseUrl, supabaseAnonKey)) {
    return async () => null;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return async (accessToken: string) => {
    try {
      const { data, error } = await authClient.auth.getUser(accessToken);
      if (error || !data.user?.id) return null;
      return { id: data.user.id };
    } catch {
      return null;
    }
  };
}
