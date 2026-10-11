import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { createApiApp } from '../server';
import {
  AdminStoreError,
  FOUNDING_SUPER_ADMIN_USER_ID,
  type AdminAccess,
  type AdminAuthorizationStore,
  type AdminPermission,
  type CreateAdminInvitationInput
} from '../src/server/adminRbac';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20261011180000_etsyhunter_m15_admin_rbac.sql'
);
const migration = fs.readFileSync(migrationPath, 'utf8');
const TARGET_USER_ID = '22222222-2222-4222-8222-222222222222';

interface TestResponse {
  status: number;
  body: any;
}

class MemoryAdminStore implements AdminAuthorizationStore {
  readonly access = new Map<string, AdminAccess>();
  readonly acceptedHashes = new Set<string>();
  createInvitationCalls: CreateAdminInvitationInput[] = [];
  accessCalls = 0;
  permissionCalls = 0;
  roleCalls = 0;
  revokeCalls = 0;

  async getAdminAccess(userId: string) {
    this.accessCalls += 1;
    return this.access.get(userId) ?? null;
  }

  async createInvitation(input: CreateAdminInvitationInput) {
    this.createInvitationCalls.push(input);
    return { invitationId: '11111111-1111-4111-8111-111111111111' };
  }

  async acceptInvitation(userId: string, tokenHash: string) {
    if (this.acceptedHashes.has(tokenHash)) {
      throw new AdminStoreError('invitation_not_usable');
    }
    this.acceptedHashes.add(tokenHash);
    return {
      userId,
      role: 'limited_admin' as const,
      status: 'active' as const,
      permissions: ['dashboard.view'] as AdminPermission[]
    };
  }

  async setPermissions(_actor: string, _target: string, _permissions: AdminPermission[]) {
    this.permissionCalls += 1;
  }

  async setRole(
    _actor: string,
    _target: string,
    _role: 'limited_admin',
    _permissions: AdminPermission[]
  ) {
    this.roleCalls += 1;
  }

  async revokeAccess(_actor: string, _target: string, _reason: string | null) {
    this.revokeCalls += 1;
  }
}

async function apiRequest(
  method: string,
  requestPath: string,
  token: string | undefined,
  body: unknown,
  store: AdminAuthorizationStore | null,
  users: Record<string, string> = {}
): Promise<TestResponse> {
  const app = createApiApp({
    adminStore: store,
    verifyAccessToken: async (accessToken) => {
      const id = users[accessToken];
      return id ? { id } : null;
    }
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));

  try {
    const { port } = server.address() as AddressInfo;
    return await new Promise<TestResponse>((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const request = http.request(
        {
          host: '127.0.0.1',
          port,
          path: requestPath,
          method,
          headers: {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...(payload
              ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) }
              : {})
          }
        },
        (response) => {
          let rawBody = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => {
            rawBody += chunk;
          });
          response.on('end', () => {
            resolve({
              status: response.statusCode ?? 0,
              body: rawBody ? JSON.parse(rawBody) : null
            });
          });
        }
      );
      request.on('error', reject);
      if (payload) request.write(payload);
      request.end();
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('admin gate rejects missing, invalid, and non-admin authentication', async () => {
  const store = new MemoryAdminStore();
  const users = { customer: 'customer-user' };

  assert.equal((await apiRequest('GET', '/api/admin/access', undefined, undefined, store, users)).status, 401);
  assert.equal((await apiRequest('GET', '/api/admin/access', 'invalid', undefined, store, users)).status, 401);
  assert.equal((await apiRequest('GET', '/api/admin/access', 'customer', undefined, store, users)).status, 403);
  assert.equal((await apiRequest('GET', '/api/admin/access', 'customer', undefined, null, users)).status, 503);
});

test('every admin endpoint rejects missing and invalid JWTs', async () => {
  const endpoints = [
    { method: 'GET', path: '/api/admin/access', body: undefined },
    {
      method: 'POST',
      path: '/api/admin/invitations',
      body: { email: 'target@example.com', role: 'limited_admin', permissions: [] }
    },
    {
      method: 'POST',
      path: '/api/admin/invitations/accept',
      body: { token: 'x'.repeat(32) }
    },
    {
      method: 'PUT',
      path: `/api/admin/members/${TARGET_USER_ID}/permissions`,
      body: { permissions: [] }
    },
    {
      method: 'PUT',
      path: `/api/admin/members/${TARGET_USER_ID}/role`,
      body: { role: 'limited_admin', permissions: [] }
    },
    {
      method: 'DELETE',
      path: `/api/admin/members/${TARGET_USER_ID}`,
      body: {}
    }
  ];

  for (const endpoint of endpoints) {
    const store = new MemoryAdminStore();
    const missing = await apiRequest(
      endpoint.method,
      endpoint.path,
      undefined,
      endpoint.body,
      store
    );
    const invalid = await apiRequest(
      endpoint.method,
      endpoint.path,
      'invalid-token',
      endpoint.body,
      store
    );

    assert.equal(missing.status, 401, `${endpoint.method} ${endpoint.path} missing JWT`);
    assert.equal(invalid.status, 401, `${endpoint.method} ${endpoint.path} invalid JWT`);
    assert.equal(store.accessCalls, 0, `${endpoint.method} ${endpoint.path} queried admin access`);
  }
});

test('admin access identity must match the verified JWT subject', async () => {
  const store = new MemoryAdminStore();
  store.access.set('verified-user', {
    userId: 'different-user',
    role: 'limited_admin',
    status: 'active',
    permissions: ['dashboard.view']
  });

  const response = await apiRequest('GET', '/api/admin/access', 'verified-token', undefined, store, {
    'verified-token': 'verified-user'
  });

  assert.equal(response.status, 403);
});

test('limited admins receive only explicit permission access', async () => {
  const store = new MemoryAdminStore();
  store.access.set('limited', {
    userId: 'limited',
    role: 'limited_admin',
    status: 'active',
    permissions: ['dashboard.view']
  });
  store.access.set('no-dashboard', {
    userId: 'no-dashboard',
    role: 'limited_admin',
    status: 'active',
    permissions: ['users.view']
  });

  const allowed = await apiRequest('GET', '/api/admin/access', 'limited-token', undefined, store, {
    'limited-token': 'limited'
  });
  assert.equal(allowed.status, 200);
  assert.deepEqual(allowed.body.permissions, ['dashboard.view']);

  const denied = await apiRequest('GET', '/api/admin/access', 'other-token', undefined, store, {
    'other-token': 'no-dashboard'
  });
  assert.equal(denied.status, 403);
});

test('revoked admins fail fresh authorization checks', async () => {
  const store = new MemoryAdminStore();
  store.access.set('revoked', {
    userId: 'revoked',
    role: 'super_admin',
    status: 'revoked',
    permissions: []
  });

  const response = await apiRequest('GET', '/api/admin/access', 'revoked-token', undefined, store, {
    'revoked-token': 'revoked'
  });
  assert.equal(response.status, 403);
});

test('limited admins cannot invite, change permissions, change roles, or revoke access', async () => {
  const store = new MemoryAdminStore();
  store.access.set('limited', {
    userId: 'limited',
    role: 'limited_admin',
    status: 'active',
    permissions: [
      'dashboard.view',
      'users.manage',
      'settings.manage',
      'credits.adjust'
    ]
  });
  const users = { limited: 'limited' };

  const requests = [
    apiRequest('POST', '/api/admin/invitations', 'limited', {
      email: 'target@example.com', role: 'super_admin', permissions: []
    }, store, users),
    apiRequest('PUT', `/api/admin/members/${TARGET_USER_ID}/permissions`, 'limited', {
      permissions: ['dashboard.view']
    }, store, users),
    apiRequest('PUT', `/api/admin/members/${TARGET_USER_ID}/role`, 'limited', {
      role: 'super_admin', permissions: []
    }, store, users),
    apiRequest('DELETE', `/api/admin/members/${TARGET_USER_ID}`, 'limited', {}, store, users)
  ];

  const responses = await Promise.all(requests);
  assert.deepEqual(responses.map((response) => response.status), [403, 403, 403, 403]);
  assert.equal(store.createInvitationCalls.length, 0);
  assert.equal(store.permissionCalls, 0);
  assert.equal(store.roleCalls, 0);
  assert.equal(store.revokeCalls, 0);
});

test('invitation tokens are hashed before storage and cannot be replayed', async () => {
  const store = new MemoryAdminStore();
  store.access.set(FOUNDING_SUPER_ADMIN_USER_ID, {
    userId: FOUNDING_SUPER_ADMIN_USER_ID,
    role: 'super_admin',
    status: 'active',
    permissions: []
  });
  const users = { super: FOUNDING_SUPER_ADMIN_USER_ID, invitee: 'invitee' };

  const created = await apiRequest('POST', '/api/admin/invitations', 'super', {
    email: 'Invitee@Example.com',
    role: 'limited_admin',
    permissions: ['dashboard.view'],
    expiresInMinutes: 30
  }, store, users);
  assert.equal(created.status, 201);
  assert.equal(typeof created.body.token, 'string');
  assert.equal(store.createInvitationCalls.length, 1);
  assert.equal(store.createInvitationCalls[0].email, 'invitee@example.com');
  assert.match(store.createInvitationCalls[0].tokenHash, /^[0-9a-f]{64}$/);
  assert.notEqual(store.createInvitationCalls[0].tokenHash, created.body.token);

  const accepted = await apiRequest('POST', '/api/admin/invitations/accept', 'invitee', {
    token: created.body.token
  }, store, users);
  const replayed = await apiRequest('POST', '/api/admin/invitations/accept', 'invitee', {
    token: created.body.token
  }, store, users);
  assert.equal(accepted.status, 200);
  assert.equal(replayed.status, 409);
});

test('active super_admin data for any non-founding UUID is rejected', async () => {
  const store = new MemoryAdminStore();
  store.access.set('second-super', {
    userId: 'second-super',
    role: 'super_admin',
    status: 'active',
    permissions: []
  });
  const users = { rogue: 'second-super' };

  const access = await apiRequest('GET', '/api/admin/access', 'rogue', undefined, store, users);
  const invite = await apiRequest('POST', '/api/admin/invitations', 'rogue', {
    email: 'target@example.com', role: 'limited_admin', permissions: []
  }, store, users);

  assert.equal(access.status, 403);
  assert.equal(invite.status, 403);
  assert.equal(store.createInvitationCalls.length, 0);
});

test('founding Super Admin cannot invite or promote another super_admin', async () => {
  const store = new MemoryAdminStore();
  store.access.set(FOUNDING_SUPER_ADMIN_USER_ID, {
    userId: FOUNDING_SUPER_ADMIN_USER_ID,
    role: 'super_admin',
    status: 'active',
    permissions: []
  });
  const users = { founder: FOUNDING_SUPER_ADMIN_USER_ID };

  const invite = await apiRequest('POST', '/api/admin/invitations', 'founder', {
    email: 'target@example.com', role: 'super_admin', permissions: []
  }, store, users);
  const promotion = await apiRequest('PUT', `/api/admin/members/${TARGET_USER_ID}/role`, 'founder', {
    role: 'super_admin', permissions: []
  }, store, users);

  assert.equal(invite.status, 400);
  assert.equal(promotion.status, 400);
  assert.equal(store.createInvitationCalls.length, 0);
  assert.equal(store.roleCalls, 0);
});

test('admin member endpoints reject malformed target UUIDs before database RPCs', async () => {
  const store = new MemoryAdminStore();
  store.access.set(FOUNDING_SUPER_ADMIN_USER_ID, {
    userId: FOUNDING_SUPER_ADMIN_USER_ID,
    role: 'super_admin',
    status: 'active',
    permissions: []
  });
  const users = { founder: FOUNDING_SUPER_ADMIN_USER_ID };
  const malformedTarget = 'not-a-uuid';

  const responses = await Promise.all([
    apiRequest('PUT', `/api/admin/members/${malformedTarget}/permissions`, 'founder', {
      permissions: []
    }, store, users),
    apiRequest('PUT', `/api/admin/members/${malformedTarget}/role`, 'founder', {
      role: 'limited_admin', permissions: []
    }, store, users),
    apiRequest('DELETE', `/api/admin/members/${malformedTarget}`, 'founder', {}, store, users)
  ]);

  assert.deepEqual(responses.map(({ status }) => status), [400, 400, 400]);
  assert.equal(store.accessCalls, 0);
  assert.equal(store.permissionCalls, 0);
  assert.equal(store.roleCalls, 0);
  assert.equal(store.revokeCalls, 0);
});

test('concurrent invitation acceptance has exactly one winner', async () => {
  const store = new MemoryAdminStore();
  const users = { invitee: 'invitee' };
  const token = 'concurrent-single-use-invitation-token-0001';

  const responses = await Promise.all([
    apiRequest('POST', '/api/admin/invitations/accept', 'invitee', { token }, store, users),
    apiRequest('POST', '/api/admin/invitations/accept', 'invitee', { token }, store, users)
  ]);

  assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 409]);
  assert.equal(store.acceptedHashes.size, 1);
});

test('admin migration is additive, browser-inaccessible, and service-role mediated', () => {
  assert.equal(path.basename(migrationPath), '20261011180000_etsyhunter_m15_admin_rbac.sql');
  assert.ok(path.basename(migrationPath) > '20261011170000_etsyhunter_m1_existing_users_backfill.sql');

  for (const table of [
    'admin_memberships',
    'admin_permissions',
    'admin_invitations',
    'admin_audit_logs'
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`));
    assert.match(
      migration,
      new RegExp(`REVOKE ALL PRIVILEGES ON TABLE public\\.${table}[\\s\\S]*?FROM PUBLIC, anon, authenticated, service_role;`)
    );
  }

  for (const fn of [
    'create_admin_invitation\\(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT\\[\\]\\)',
    'accept_admin_invitation\\(UUID, TEXT\\)',
    'set_limited_admin_permissions\\(UUID, UUID, TEXT\\[\\]\\)',
    'set_admin_role\\(UUID, UUID, TEXT, TEXT\\[\\]\\)',
    'revoke_admin_access\\(UUID, UUID, TEXT\\)'
  ]) {
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}[\\s\\S]*?FROM PUBLIC, anon, authenticated, service_role;`));
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}[\\s\\S]*?TO service_role;`));
  }

  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.get_admin_access\(UUID\)[\s\S]*?FROM PUBLIC, anon, authenticated, service_role;[\s\S]*?GRANT EXECUTE ON FUNCTION public\.get_admin_access\(UUID\)\s+TO service_role;/
  );
  assert.doesNotMatch(migration, /GRANT\s+\w+\s+ON TABLE public\.admin_/i);

  const serviceRpcGrants = [...migration.matchAll(
    /GRANT EXECUTE ON FUNCTION public\.([a-z_]+)\([^;]+?\)\s+TO service_role;/g
  )].map((match) => match[1]).sort();
  assert.deepEqual(serviceRpcGrants, [
    'accept_admin_invitation',
    'create_admin_invitation',
    'get_admin_access',
    'revoke_admin_access',
    'set_admin_role',
    'set_limited_admin_permissions'
  ]);
});

test('privileged functions have fixed ownership and SQL contains no Markdown artifacts', () => {
  const ownedFunctions = [
    'write_admin_audit_log\\(UUID, UUID, TEXT, TEXT, UUID, JSONB\\)',
    'prevent_admin_audit_log_mutation\\(\\)',
    'admin_auth_identity_is_active\\(UUID, BOOLEAN\\)',
    'get_admin_access\\(UUID\\)',
    'assert_active_super_admin\\(UUID\\)',
    'validate_admin_permissions\\(TEXT\\[\\]\\)',
    'create_admin_invitation\\(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT\\[\\]\\)',
    'accept_admin_invitation\\(UUID, TEXT\\)',
    'set_limited_admin_permissions\\(UUID, UUID, TEXT\\[\\]\\)',
    'set_admin_role\\(UUID, UUID, TEXT, TEXT\\[\\]\\)',
    'revoke_admin_access\\(UUID, UUID, TEXT\\)'
  ];

  for (const fn of ownedFunctions) {
    assert.match(migration, new RegExp(`ALTER FUNCTION public\\.${fn}\\s+OWNER TO postgres;`));
  }
  assert.doesNotMatch(migration, /```|\\\r?$/m);
  assert.equal((migration.match(/\$\$/g) ?? []).length % 2, 0);
});

test('the database enforces one immutable founding Super Admin and limited-only delegation', () => {
  assert.match(migration, /admin_memberships_single_super_identity CHECK/);
  assert.match(migration, /auth_user\.id = '6c05db98-e615-459f-8e17-cda584049d26'::UUID/);
  assert.match(migration, /lower\(pg_catalog\.btrim\(auth_user\.email\)\) = '3imranom@gmail\.com'/);
  assert.match(migration, /auth_user\.email_confirmed_at IS NOT NULL/);
  assert.match(migration, /ON CONFLICT \(user_id\) DO NOTHING/);
  assert.match(migration, /admin_memberships_single_founding_uidx/);
  assert.match(migration, /admin_memberships_single_super_admin_uidx/);
  assert.match(migration, /role TEXT NOT NULL DEFAULT 'limited_admin' CHECK \(role = 'limited_admin'\)/);
  assert.match(migration, /p_role IS DISTINCT FROM 'limited_admin'[\s\S]*?only limited_admin invitations are allowed/);
  assert.match(migration, /p_role IS DISTINCT FROM 'limited_admin'[\s\S]*?only limited_admin role assignments are allowed/);
});

test('live Auth identity, acceptance locking, and replay defenses are encoded in SQL', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.admin_auth_identity_is_active/);
  assert.match(migration, /auth_user\.deleted_at IS NULL/);
  assert.match(migration, /auth_user\.banned_until IS NULL OR auth_user\.banned_until <= pg_catalog\.now\(\)/);
  assert.match(migration, /p_require_founding_identity[\s\S]*?3imranom@gmail\.com/);
  assert.match(migration, /p_actor_user_id IS DISTINCT FROM '6c05db98-e615-459f-8e17-cda584049d26'::UUID/);
  assert.match(migration, /WHERE invitation\.token_hash = p_token_hash[\s\S]*?FOR UPDATE;/);
  assert.match(migration, /v_invitation\.accepted_at IS NOT NULL/);
  assert.match(migration, /v_invitation\.intended_email <> v_email/);
  assert.match(migration, /membership\.status = 'active'[\s\S]*?membership\.role = 'super_admin'|membership\.role = 'super_admin'[\s\S]*?membership\.status = 'active'/);
  assert.match(migration, /cannot change own admin role/);
  assert.match(migration, /founding super admin cannot be revoked/);
});

test('audit attribution is explicit, immutable, and unavailable to application roles', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.write_admin_audit_log/);
  assert.match(migration, /CREATE TRIGGER prevent_admin_audit_log_update_delete/);
  assert.match(migration, /admin audit logs are immutable/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.write_admin_audit_log\(UUID, UUID, TEXT, TEXT, UUID, JSONB\)[\s\S]*?FROM PUBLIC, anon, authenticated, service_role;/
  );
  assert.doesNotMatch(migration, /app\.admin_actor_id|set_config\(|current_setting\(/);
  assert.doesNotMatch(migration, /GRANT (?:INSERT|UPDATE|DELETE|ALL)[^;]*admin_audit_logs/i);
  assert.doesNotMatch(migration, /jsonb_build_object\([^)]*token_hash/i);
});
