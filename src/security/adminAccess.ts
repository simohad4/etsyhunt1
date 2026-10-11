import { useCallback, useEffect, useState } from 'react';
import type { AdminPage } from '../appRoutes';

export const ADMIN_PERMISSION_KEYS = [
  'dashboard.view', 'users.view', 'users.manage', 'subscriptions.view',
  'subscriptions.manage', 'credits.view', 'credits.adjust', 'research.view',
  'analytics.view', 'settings.view', 'settings.manage', 'audit.view'
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_KEYS)[number];
export type AdminRole = 'super_admin' | 'limited_admin';

export interface VerifiedAdminAccess {
  role: AdminRole;
  permissions: AdminPermission[];
}

const ADMIN_PAGE_PERMISSIONS: Partial<Record<AdminPage, AdminPermission>> = {
  overview: 'dashboard.view',
  users: 'users.view',
  subscriptions: 'subscriptions.view',
  credits: 'credits.view',
  research: 'research.view',
  analytics: 'analytics.view',
  audit: 'audit.view',
  settings: 'settings.view'
};

export function canAccessAdminPage(access: VerifiedAdminAccess, page: AdminPage): boolean {
  if (page === 'not_found') return true;
  if (page === 'admins') return access.role === 'super_admin';
  const permission = ADMIN_PAGE_PERMISSIONS[page];
  return Boolean(permission && (access.role === 'super_admin' || access.permissions.includes(permission)));
}

export type AdminAccessState =
  | { status: 'loading' }
  | { status: 'authorized'; access: VerifiedAdminAccess }
  | { status: 'unauthorized'; message: string }
  | { status: 'forbidden'; message: string }
  | { status: 'unavailable'; message: string };

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function parseAdminAccessPayload(value: unknown): VerifiedAdminAccess | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as { role?: unknown; permissions?: unknown };
  if (payload.role !== 'super_admin' && payload.role !== 'limited_admin') return null;
  if (!Array.isArray(payload.permissions)) return null;

  const allowed = new Set<string>(ADMIN_PERMISSION_KEYS);
  if (!payload.permissions.every((permission) => typeof permission === 'string' && allowed.has(permission))) {
    return null;
  }

  return {
    role: payload.role,
    permissions: [...new Set(payload.permissions)] as AdminPermission[]
  };
}

export async function requestAdminAccess(
  accessToken: string | null | undefined,
  signal?: AbortSignal,
  fetcher: FetchLike = fetch
): Promise<AdminAccessState> {
  if (!accessToken) {
    return { status: 'unauthorized', message: 'A valid Supabase session is required.' };
  }

  try {
    const response = await fetcher('/api/admin/access', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal
    });

    if (response.status === 401) {
      return { status: 'unauthorized', message: 'Your session is invalid or has expired.' };
    }
    if (response.status === 403) {
      return { status: 'forbidden', message: 'This account does not have active admin access.' };
    }
    if (!response.ok) {
      return { status: 'unavailable', message: 'Admin authorization is currently unavailable.' };
    }

    const access = parseAdminAccessPayload(await response.json().catch(() => null));
    if (!access) {
      return { status: 'unavailable', message: 'Admin authorization returned an invalid response.' };
    }

    return { status: 'authorized', access };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return { status: 'unavailable', message: 'Admin authorization could not be verified.' };
  }
}

export function useAdminAccess(accessToken: string | null | undefined, routeKey: string) {
  const [state, setState] = useState<AdminAccessState>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    void requestAdminAccess(accessToken, controller.signal)
      .then(setState)
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setState({ status: 'unavailable', message: 'Admin authorization could not be verified.' });
        }
      });
    return () => controller.abort();
  }, [accessToken, routeKey, revision]);

  useEffect(() => {
    const revalidate = () => setRevision((value) => value + 1);
    window.addEventListener('focus', revalidate);
    return () => window.removeEventListener('focus', revalidate);
  }, []);

  return { state, retry };
}
