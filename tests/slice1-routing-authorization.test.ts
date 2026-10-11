import assert from 'node:assert/strict';
import test from 'node:test';
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
  assert.deepEqual(resolveAppRoute('/app/saved/'), { scope: 'customer', page: 'saved' });
  assert.deepEqual(resolveAppRoute('/app/settings'), { scope: 'customer', page: 'settings' });
  assert.equal(customerPathForPage('board'), '/app/board');
  assert.equal(customerPathForPage('saved'), '/app/saved');
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
