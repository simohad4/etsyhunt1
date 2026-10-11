export const SUPABASE_CONFIGURATION_ERROR =
  'Authentication is unavailable because Supabase is not configured correctly.';

const PLACEHOLDER_URL = 'https://your-project.supabase.co';
const PLACEHOLDER_KEYS = new Set([
  'your-anon-key',
  'your-supabase-anon-key'
]);

export function hasValidSupabaseConfiguration(
  url: string | undefined,
  anonKey: string | undefined
): url is string {
  const normalizedUrl = url?.trim();
  const normalizedKey = anonKey?.trim();

  if (
    !normalizedUrl ||
    !normalizedKey ||
    normalizedUrl === PLACEHOLDER_URL ||
    PLACEHOLDER_KEYS.has(normalizedKey)
  ) {
    return false;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
  } catch {
    return false;
  }
}
