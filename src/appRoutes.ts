import { useCallback, useEffect, useState } from 'react';

export type CustomerPage = 'board' | 'saved' | 'settings' | 'not_found';

export type AdminPage =
  | 'overview'
  | 'users'
  | 'subscriptions'
  | 'credits'
  | 'research'
  | 'analytics'
  | 'admins'
  | 'audit'
  | 'settings'
  | 'not_found';

export type AppRoute =
  | { scope: 'public'; page: 'landing' }
  | { scope: 'customer'; page: CustomerPage }
  | { scope: 'admin'; page: AdminPage }
  | { scope: 'not_found'; page: 'not_found' };

const CUSTOMER_ROUTES: Record<string, CustomerPage> = {
  '/app': 'board',
  '/app/board': 'board',
  '/app/saved': 'saved',
  '/app/settings': 'settings'
};

const ADMIN_ROUTES: Record<string, AdminPage> = {
  '/admin': 'overview',
  '/admin/overview': 'overview',
  '/admin/users': 'users',
  '/admin/subscriptions': 'subscriptions',
  '/admin/credits': 'credits',
  '/admin/research': 'research',
  '/admin/analytics': 'analytics',
  '/admin/admins': 'admins',
  '/admin/audit': 'audit',
  '/admin/settings': 'settings'
};

function normalizePathname(pathname: string): string {
  if (!pathname.startsWith('/')) return `/${pathname}`;
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.replace(/\/+$/, '');
  return pathname;
}

export function resolveAppRoute(pathname: string): AppRoute {
  const normalized = normalizePathname(pathname);
  if (normalized === '/') return { scope: 'public', page: 'landing' };

  const customerPage = CUSTOMER_ROUTES[normalized];
  if (customerPage) return { scope: 'customer', page: customerPage };
  if (normalized.startsWith('/app/')) return { scope: 'customer', page: 'not_found' };

  const adminPage = ADMIN_ROUTES[normalized];
  if (adminPage) return { scope: 'admin', page: adminPage };
  if (normalized.startsWith('/admin/')) return { scope: 'admin', page: 'not_found' };

  return { scope: 'not_found', page: 'not_found' };
}

export function customerPathForPage(page: Exclude<CustomerPage, 'not_found'>): string {
  if (page === 'board') return '/app/board';
  if (page === 'saved') return '/app/saved';
  return '/app/settings';
}

interface NavigateOptions {
  replace?: boolean;
}

export function useBrowserPath() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((nextPath: string, options: NavigateOptions = {}) => {
    const normalized = normalizePathname(nextPath);
    if (options.replace) window.history.replaceState(null, '', normalized);
    else window.history.pushState(null, '', normalized);
    setPathname(window.location.pathname);
  }, []);

  return { pathname, navigate };
}
