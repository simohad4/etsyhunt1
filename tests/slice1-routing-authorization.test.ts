import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { customerPathForPage, resolveAppRoute } from '../src/appRoutes';
import {
  canAccessAdminPage,
  parseAdminAccessPayload,
  requestAdminAccess,
  type VerifiedAdminAccess
} from '../src/security/adminAccess';

test('resolves public and customer routes without losing trailing-slash support', () => {
  assert.deepEqual(resolveAppRoute('/'), { scope: 'public', page: 'landing' });
  assert.deepEqual(resolveAppRoute('/app'), { scope: 'customer', page: 'board' });
  assert.deepEqual(resolveAppRoute('/app/board'), { scope: 'customer', page: 'board' });
  assert.deepEqual(resolveAppRoute('/app/research'), { scope: 'customer', page: 'research' });
  assert.deepEqual(resolveAppRoute('/app/saved'), { scope: 'customer', page: 'saved' });
  assert.deepEqual(resolveAppRoute('/app/saved/'), { scope: 'customer', page: 'saved' });
  assert.deepEqual(resolveAppRoute('/app/history'), { scope: 'customer', page: 'history' });
  assert.deepEqual(resolveAppRoute('/app/plan'), { scope: 'customer', page: 'plan' });
  assert.deepEqual(resolveAppRoute('/app/settings'), { scope: 'customer', page: 'settings' });
});

test('customerPathForPage returns correct paths for all six workspace destinations', () => {
  assert.equal(customerPathForPage('board'), '/app/board');
  assert.equal(customerPathForPage('research'), '/app/research');
  assert.equal(customerPathForPage('saved'), '/app/saved');
  assert.equal(customerPathForPage('history'), '/app/history');
  assert.equal(customerPathForPage('plan'), '/app/plan');
  assert.equal(customerPathForPage('settings'), '/app/settings');
});

test('keeps unknown customer and admin URLs inside their protected scopes', () => {
  assert.deepEqual(resolveAppRoute('/app/unknown'), { scope: 'customer', page: 'not_found' });
  assert.deepEqual(resolveAppRoute('/admin/unknown'), { scope: 'admin', page: 'not_found' });
  assert.deepEqual(resolveAppRoute('/unknown'), { scope: 'not_found', page: 'not_found' });
});

test('resolves all supported admin shell URLs', () => {
  const routes = ['overview', 'users', 'subscriptions', 'credits', 'research', 'analytics', 'admins', 'audit', 'settings'] as const;
  for (const page of routes) {
    assert.deepEqual(resolveAppRoute(`/admin/${page}`), { scope: 'admin', page });
  }
});

test('admin access requires a bearer token and never calls the server without one', async () => {
  let called = false;
  const state = await requestAdminAccess(null, undefined, async () => {
    called = true;
    return new Response(null, { status: 500 });
  });
  assert.equal(called, false);
  assert.equal(state.status, 'unauthorized');
});

test('admin access sends only the current bearer token and validates the response', async () => {
  let authorization: string | null = null;
  const state = await requestAdminAccess('verified-session-token', undefined, async (_input, init) => {
    authorization = new Headers(init?.headers).get('authorization');
    return Response.json({ role: 'limited_admin', permissions: ['dashboard.view', 'users.view'] });
  });

  assert.equal(authorization, 'Bearer verified-session-token');
  assert.deepEqual(state, {
    status: 'authorized',
    access: { role: 'limited_admin', permissions: ['dashboard.view', 'users.view'] }
  });
});

test('admin access fails closed for invalid payloads and server errors', async () => {
  const invalid = await requestAdminAccess('token', undefined, async () => Response.json({ role: 'limited_admin', permissions: ['root.all'] }));
  const unauthorized = await requestAdminAccess('token', undefined, async () => new Response(null, { status: 401 }));
  const forbidden = await requestAdminAccess('token', undefined, async () => new Response(null, { status: 403 }));
  const unavailable = await requestAdminAccess('token', undefined, async () => new Response(null, { status: 503 }));

  assert.equal(invalid.status, 'unavailable');
  assert.equal(unauthorized.status, 'unauthorized');
  assert.equal(forbidden.status, 'forbidden');
  assert.equal(unavailable.status, 'unavailable');
});

test('limited admin navigation cannot exceed server-verified permissions', () => {
  const limited: VerifiedAdminAccess = { role: 'limited_admin', permissions: ['dashboard.view', 'users.view'] };
  const superAdmin: VerifiedAdminAccess = { role: 'super_admin', permissions: [] };

  assert.equal(canAccessAdminPage(limited, 'overview'), true);
  assert.equal(canAccessAdminPage(limited, 'users'), true);
  assert.equal(canAccessAdminPage(limited, 'credits'), false);
  assert.equal(canAccessAdminPage(limited, 'admins'), false);
  assert.equal(canAccessAdminPage(superAdmin, 'admins'), true);
  assert.equal(canAccessAdminPage(superAdmin, 'credits'), true);
});

test('admin payload parser rejects unverified roles and malformed permissions', () => {
  assert.equal(parseAdminAccessPayload({ role: 'owner', permissions: [] }), null);
  assert.equal(parseAdminAccessPayload({ role: 'limited_admin', permissions: 'dashboard.view' }), null);
  assert.equal(parseAdminAccessPayload(null), null);
});

test('customer routes map correctly to all six required destinations', () => {
  // Verify all six required routes from the task specification
  const requiredRoutes = [
    { path: '/app/board', page: 'board', label: 'Overview' },
    { path: '/app/research', page: 'research', label: 'Research' },
    { path: '/app/saved', page: 'saved', label: 'Saved Listings' },
    { path: '/app/history', page: 'history', label: 'History' },
    { path: '/app/plan', page: 'plan', label: 'Plan & Billing' },
    { path: '/app/settings', page: 'settings', label: 'Settings' }
  ] as const;

  for (const { path, page } of requiredRoutes) {
    assert.deepEqual(resolveAppRoute(path), { scope: 'customer', page }, `Route ${path} should resolve to ${page}`);
    assert.equal(customerPathForPage(page), path, `customerPathForPage(${page}) should return ${path}`);
  }
});

test('customerPathForPage and resolveAppRoute are bidirectional for all valid pages', () => {
  const validPages: Array<'board' | 'research' | 'saved' | 'history' | 'plan' | 'settings'> = ['board', 'research', 'saved', 'history', 'plan', 'settings'];

  for (const page of validPages) {
    const path = customerPathForPage(page);
    const resolved = resolveAppRoute(path);
    assert.equal(resolved.scope, 'customer', `Path ${path} should resolve to customer scope`);
    assert.equal(resolved.page, page, `Path ${path} should resolve to page ${page}`);
  }
});

test('unknown customer routes stay within customer scope for protected error handling', () => {
  // Unknown routes under /app/ should resolve to customer-scoped not_found
  // This ensures the auth wall remains active for bad URLs
  const unknownCustomerRoutes = ['/app/unknown', '/app/foo/bar', '/app/research/invalid'];

  for (const path of unknownCustomerRoutes) {
    const resolved = resolveAppRoute(path);
    assert.equal(resolved.scope, 'customer', `Unknown route ${path} should stay in customer scope`);
    assert.equal(resolved.page, 'not_found', `Unknown route ${path} should resolve to not_found`);
  }
});

// Execute the production handler with injected callbacks, without mounting Auth
// or contacting Supabase. This catches competing transitions, not just URL maps.
function workspaceViewHandler(scope: Record<string, unknown>) {
  const source = readFileSync(new URL('../src/components/EtsyHunterWorkspace.tsx', import.meta.url), 'utf8');
  const handler = source.match(/  const handleViewSelect = [\s\S]*?\n  };/)?.[0];
  assert.ok(handler, 'Workspace view-selection handler must exist');
  const { code } = transformSync(handler, { loader: 'ts', target: 'es2022' });
  return runInNewContext(`${code}\nhandleViewSelect;`, scope) as (view: string) => void;
}

test('workspace selections emit exactly one navigation transition for all six destinations', () => {
  const transitions: string[] = [];
  const mobileStates: boolean[] = [];
  const localViews: string[] = [];
  const selectView = workspaceViewHandler({
    setMobileSidebarOpen: (open: boolean) => mobileStates.push(open),
    onViewChange: (view: Parameters<typeof customerPathForPage>[0]) => transitions.push(customerPathForPage(view)),
    // Keep a legacy callback spy to detect the original double-dispatch regression.
    onTabChange: (tab: 'board' | 'watchlist' | 'settings') => transitions.push(customerPathForPage(tab === 'watchlist' ? 'saved' : tab)),
    setInternalActiveView: (view: string) => localViews.push(view)
  });

  for (const view of ['board', 'research', 'saved', 'history', 'plan', 'settings'] as const) {
    const previousCount = transitions.length;
    selectView(view);
    assert.equal(transitions.length, previousCount + 1, `${view} must navigate exactly once`);
    assert.equal(transitions.at(-1), customerPathForPage(view));
    assert.deepEqual(resolveAppRoute(transitions.at(-1)!), { scope: 'customer', page: view });
  }
  assert.deepEqual(mobileStates, Array(6).fill(false));
  assert.deepEqual(localViews, [], 'Controlled navigation must use the route as its state');
});

test('standalone workspace selection updates its view without a navigation callback', () => {
  const views: string[] = [];
  const selectView = workspaceViewHandler({
    setMobileSidebarOpen: () => {},
    onViewChange: undefined,
    setInternalActiveView: (view: string) => views.push(view)
  });
  for (const view of ['board', 'research', 'saved', 'history', 'plan', 'settings']) {
    selectView(view);
  }
  assert.deepEqual(views, ['board', 'research', 'saved', 'history', 'plan', 'settings']);
});
