import { createHash, randomBytes } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hasValidSupabaseConfiguration } from '../security/supabaseConfiguration';
import { extractBearerToken, type AccessTokenVerifier } from './m1Security';

export const ADMIN_PERMISSION_KEYS = [
  'dashboard.view',
  'users.view',
  'users.manage',
  'subscriptions.view',
  'subscriptions.manage',
  'credits.view',
  'credits.adjust',
  'research.view',
  'analytics.view',
  'settings.view',
  'settings.manage',
  'audit.view'
] as const;

export const FOUNDING_SUPER_ADMIN_USER_ID = '6c05db98-e615-459f-8e17-cda584049d26';

export type AdminPermission = (typeof ADMIN_PERMISSION_KEYS)[number];
export type AdminRole = 'super_admin' | 'limited_admin';

export interface AdminAccess {
  userId: string;
  role: AdminRole;
  status: 'active' | 'revoked';
  permissions: AdminPermission[];
}

export interface CreateAdminInvitationInput {
  actorUserId: string;
  email: string;
  role: 'limited_admin';
  permissions: AdminPermission[];
  tokenHash: string;
  expiresAt: string;
}

export interface AdminAuthorizationStore {
  getAdminAccess(userId: string): Promise<AdminAccess | null>;
  createInvitation(input: CreateAdminInvitationInput): Promise<{ invitationId: string }>;
  acceptInvitation(userId: string, tokenHash: string): Promise<AdminAccess>;
  setPermissions(
    actorUserId: string,
    targetUserId: string,
    permissions: AdminPermission[]
  ): Promise<void>;
  setRole(
    actorUserId: string,
    targetUserId: string,
    role: 'limited_admin',
    permissions: AdminPermission[]
  ): Promise<void>;
  revokeAccess(actorUserId: string, targetUserId: string, reason: string | null): Promise<void>;
}

export class AdminStoreError extends Error {
  constructor(
    public readonly code: string,
    message = 'Admin operation failed.'
  ) {
    super(message);
  }
}

function isAdminRole(value: unknown): value is AdminRole {
  return value === 'super_admin' || value === 'limited_admin';
}

function parsePermissions(value: unknown): AdminPermission[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > ADMIN_PERMISSION_KEYS.length) return null;
  const allowed = new Set<string>(ADMIN_PERMISSION_KEYS);
  const normalized = [...new Set(value)];
  if (!normalized.every((permission) => typeof permission === 'string' && allowed.has(permission))) {
    return null;
  }
  return normalized as AdminPermission[];
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 320 || !normalized.includes('@')) return null;
  return normalized;
}

function hasValidServiceConfiguration(env: NodeJS.ProcessEnv): boolean {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(
    hasValidSupabaseConfiguration(url, serviceRoleKey) &&
      serviceRoleKey !== 'your-supabase-service-role-key'
  );
}

function mapSupabaseError(error: { code?: string; message?: string }): AdminStoreError {
  if (error.code === '42501') return new AdminStoreError('forbidden');
  if (error.code === '22023') return new AdminStoreError('invalid_request');
  if (error.code === '23505') return new AdminStoreError('conflict');
  if (error.code === 'P0001') return new AdminStoreError('invitation_not_usable');
  return new AdminStoreError('backend_unavailable');
}

function createDatabaseStore(client: SupabaseClient): AdminAuthorizationStore {
  const callRpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await client.rpc(name, args);
    if (error) throw mapSupabaseError(error);
    return data as any;
  };

  return {
    async getAdminAccess(userId) {
      const { data: membership, error: membershipError } = await client.rpc(
        'get_admin_access',
        { p_user_id: userId }
      );

      if (membershipError) throw mapSupabaseError(membershipError);
      if (!membership || !isAdminRole(membership.role)) return null;
      if (membership.user_id !== userId) throw new AdminStoreError('backend_unavailable');
      if (
        membership.role === 'super_admin' &&
        userId !== FOUNDING_SUPER_ADMIN_USER_ID
      ) {
        throw new AdminStoreError('backend_unavailable');
      }

      if (membership.status !== 'active') {
        return { userId, role: membership.role, status: 'revoked', permissions: [] };
      }

      if (membership.role === 'super_admin') {
        return {
          userId,
          role: 'super_admin',
          status: 'active',
          permissions: [...ADMIN_PERMISSION_KEYS]
        };
      }

      const permissions = parsePermissions(membership.permissions);
      if (!permissions) throw new AdminStoreError('backend_unavailable');

      return { userId, role: 'limited_admin', status: 'active', permissions };
    },

    async createInvitation(input) {
      const result = await callRpc('create_admin_invitation', {
        p_actor_user_id: input.actorUserId,
        p_email: input.email,
        p_role: input.role,
        p_token_hash: input.tokenHash,
        p_expires_at: input.expiresAt,
        p_permissions: input.permissions
      });
      if (!result?.invitation_id) throw new AdminStoreError('backend_unavailable');
      return { invitationId: result.invitation_id };
    },

    async acceptInvitation(userId, tokenHash) {
      const result = await callRpc('accept_admin_invitation', {
        p_user_id: userId,
        p_token_hash: tokenHash
      });
      if (result?.role !== 'limited_admin' || !Array.isArray(result?.permissions)) {
        throw new AdminStoreError('backend_unavailable');
      }
      const permissions = parsePermissions(result.permissions);
      if (!permissions) throw new AdminStoreError('backend_unavailable');
      return { userId, role: result.role, status: 'active', permissions };
    },

    async setPermissions(actorUserId, targetUserId, permissions) {
      await callRpc('set_limited_admin_permissions', {
        p_actor_user_id: actorUserId,
        p_target_user_id: targetUserId,
        p_permissions: permissions
      });
    },

    async setRole(actorUserId, targetUserId, role, permissions) {
      await callRpc('set_admin_role', {
        p_actor_user_id: actorUserId,
        p_target_user_id: targetUserId,
        p_role: role,
        p_permissions: permissions
      });
    },

    async revokeAccess(actorUserId, targetUserId, reason) {
      await callRpc('revoke_admin_access', {
        p_actor_user_id: actorUserId,
        p_target_user_id: targetUserId,
        p_reason: reason
      });
    }
  };
}

export function createSupabaseAdminAuthorizationStore(
  env: NodeJS.ProcessEnv = process.env
): AdminAuthorizationStore | null {
  if (!hasValidServiceConfiguration(env)) return null;

  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL)!;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY!;
  const client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  return createDatabaseStore(client);
}

interface AdminRouteDependencies {
  verifyAccessToken: AccessTokenVerifier;
  adminStore: AdminAuthorizationStore | null;
}

interface AuthorizedAdmin {
  userId: string;
  access: AdminAccess;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

async function authenticateUser(
  req: Request,
  res: Response,
  verifyAccessToken: AccessTokenVerifier
): Promise<string | null> {
  const token = extractBearerToken(req.get('authorization'));
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  const user = await verifyAccessToken(token).catch(() => null);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
    return null;
  }
  return user.id;
}

async function authorizeAdmin(
  req: Request,
  res: Response,
  dependencies: AdminRouteDependencies,
  options: { permission?: AdminPermission; superAdminOnly?: boolean; targetUserId?: string } = {}
): Promise<AuthorizedAdmin | null> {
  const userId = await authenticateUser(req, res, dependencies.verifyAccessToken);
  if (!userId) return null;
  if (options.targetUserId !== undefined && !isUuid(options.targetUserId)) {
    res.status(400).json({ error: 'Invalid admin target user ID.' });
    return null;
  }
  if (!dependencies.adminStore) {
    res.status(503).json({ error: 'Admin authorization is unavailable.' });
    return null;
  }

  let access: AdminAccess | null;
  try {
    access = await dependencies.adminStore.getAdminAccess(userId);
  } catch {
    res.status(503).json({ error: 'Admin authorization is unavailable.' });
    return null;
  }

  if (!access || access.userId !== userId || access.status !== 'active') {
    res.status(403).json({ error: 'Admin access denied.' });
    return null;
  }
  if (
    access.role === 'super_admin' &&
    userId !== FOUNDING_SUPER_ADMIN_USER_ID
  ) {
    res.status(403).json({ error: 'Admin access denied.' });
    return null;
  }
  if (options.superAdminOnly && access.role !== 'super_admin') {
    res.status(403).json({ error: 'Super Admin access required.' });
    return null;
  }
  if (
    options.permission &&
    access.role !== 'super_admin' &&
    !access.permissions.includes(options.permission)
  ) {
    res.status(403).json({ error: 'Required admin permission is missing.' });
    return null;
  }

  return { userId, access };
}

function sendAdminOperationError(res: Response, error: unknown) {
  if (error instanceof AdminStoreError) {
    if (error.code === 'forbidden') return res.status(403).json({ error: 'Admin operation denied.' });
    if (error.code === 'invalid_request') return res.status(400).json({ error: 'Invalid admin request.' });
    if (error.code === 'conflict' || error.code === 'invitation_not_usable') {
      return res.status(409).json({ error: 'The invitation or requested change is no longer usable.' });
    }
  }
  return res.status(503).json({ error: 'Admin operation is unavailable.' });
}

export function registerAdminRoutes(app: Express, dependencies: AdminRouteDependencies): void {
  app.get('/api/admin/access', async (req, res) => {
    const admin = await authorizeAdmin(req, res, dependencies, { permission: 'dashboard.view' });
    if (!admin) return;
    res.json({ role: admin.access.role, permissions: admin.access.permissions });
  });

  app.post('/api/admin/invitations', async (req, res) => {
    const admin = await authorizeAdmin(req, res, dependencies, { superAdminOnly: true });
    if (!admin || !dependencies.adminStore) return;

    const email = normalizeEmail(req.body?.email);
    const role = req.body?.role;
    const permissions = parsePermissions(req.body?.permissions ?? []);
    const expiresInMinutes = Number(req.body?.expiresInMinutes ?? 60);
    if (
      !email ||
      role !== 'limited_admin' ||
      !permissions ||
      !Number.isInteger(expiresInMinutes) ||
      expiresInMinutes < 5 ||
      expiresInMinutes > 1440
    ) {
      return res.status(400).json({ error: 'Invalid invitation request.' });
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000).toISOString();
    try {
      const { invitationId } = await dependencies.adminStore.createInvitation({
        actorUserId: admin.userId,
        email,
        role,
        permissions,
        tokenHash,
        expiresAt
      });
      return res.status(201).json({ invitationId, token, expiresAt });
    } catch (error) {
      return sendAdminOperationError(res, error);
    }
  });

  app.post('/api/admin/invitations/accept', async (req, res) => {
    const userId = await authenticateUser(req, res, dependencies.verifyAccessToken);
    if (!userId) return;
    if (!dependencies.adminStore) {
      return res.status(503).json({ error: 'Admin authorization is unavailable.' });
    }

    const token = req.body?.token;
    if (typeof token !== 'string' || token.length < 32 || token.length > 512) {
      return res.status(400).json({ error: 'Invalid invitation token.' });
    }

    const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
    try {
      const access = await dependencies.adminStore.acceptInvitation(userId, tokenHash);
      return res.json({ role: access.role, permissions: access.permissions });
    } catch (error) {
      return sendAdminOperationError(res, error);
    }
  });

  app.put('/api/admin/members/:userId/permissions', async (req, res) => {
    const admin = await authorizeAdmin(req, res, dependencies, {
      superAdminOnly: true,
      targetUserId: req.params.userId
    });
    if (!admin || !dependencies.adminStore) return;
    const permissions = parsePermissions(req.body?.permissions);
    if (!permissions) return res.status(400).json({ error: 'Invalid permission set.' });

    try {
      await dependencies.adminStore.setPermissions(admin.userId, req.params.userId, permissions);
      return res.status(204).end();
    } catch (error) {
      return sendAdminOperationError(res, error);
    }
  });

  app.put('/api/admin/members/:userId/role', async (req, res) => {
    const admin = await authorizeAdmin(req, res, dependencies, {
      superAdminOnly: true,
      targetUserId: req.params.userId
    });
    if (!admin || !dependencies.adminStore) return;
    const role = req.body?.role;
    const permissions = parsePermissions(req.body?.permissions ?? []);
    if (role !== 'limited_admin' || !permissions) {
      return res.status(400).json({ error: 'Invalid role change.' });
    }

    try {
      await dependencies.adminStore.setRole(
        admin.userId,
        req.params.userId,
        role,
        permissions
      );
      return res.status(204).end();
    } catch (error) {
      return sendAdminOperationError(res, error);
    }
  });

  app.delete('/api/admin/members/:userId', async (req, res) => {
    const admin = await authorizeAdmin(req, res, dependencies, {
      superAdminOnly: true,
      targetUserId: req.params.userId
    });
    if (!admin || !dependencies.adminStore) return;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : null;
    if (reason && reason.length > 500) {
      return res.status(400).json({ error: 'Revocation reason is too long.' });
    }

    try {
      await dependencies.adminStore.revokeAccess(
        admin.userId,
        req.params.userId,
        reason || null
      );
      return res.status(204).end();
    } catch (error) {
      return sendAdminOperationError(res, error);
    }
  });
}
