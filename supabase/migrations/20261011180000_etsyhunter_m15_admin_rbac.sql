-- ==============================================================================
-- Etsy Hunter — M1.5 Phase A Admin RBAC Foundation (2026-10-11 18:00 UTC)
-- Additive only: this migration does not modify customer plans, subscriptions,
-- credit accounts, research history, or saved-listing entitlements.
-- ==============================================================================

-- Canonical permission catalog. Application and database code must reject keys
-- outside this table.
CREATE TABLE IF NOT EXISTS public.admin_permission_catalog (
    permission_key TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT admin_permission_catalog_key_format CHECK (
        permission_key ~ '^[a-z]+\.[a-z]+$'
    )
);

INSERT INTO public.admin_permission_catalog (permission_key, description)
VALUES
    ('dashboard.view', 'View the administrative dashboard'),
    ('users.view', 'View customer accounts'),
    ('users.manage', 'Perform approved customer account actions'),
    ('subscriptions.view', 'View subscription state'),
    ('subscriptions.manage', 'Perform approved subscription actions'),
    ('credits.view', 'View research credit balances and ledgers'),
    ('credits.adjust', 'Perform approved research credit adjustments'),
    ('research.view', 'View research operations and history'),
    ('analytics.view', 'View administrative analytics'),
    ('settings.view', 'View administrative settings'),
    ('settings.manage', 'Change administrative settings'),
    ('audit.view', 'View administrative audit logs')
ON CONFLICT (permission_key) DO UPDATE
SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.admin_memberships (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'limited_admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    is_founding_super_admin BOOLEAN NOT NULL DEFAULT false,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT admin_memberships_revocation_state CHECK (
        (status = 'active' AND revoked_at IS NULL AND revoked_by IS NULL)
        OR (status = 'revoked' AND revoked_at IS NOT NULL)
    ),
    CONSTRAINT admin_memberships_single_super_identity CHECK (
        (
            user_id = '6c05db98-e615-459f-8e17-cda584049d26'::UUID
            AND role = 'super_admin'
            AND is_founding_super_admin
        )
        OR (
            user_id <> '6c05db98-e615-459f-8e17-cda584049d26'::UUID
            AND role = 'limited_admin'
            AND NOT is_founding_super_admin
        )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_memberships_single_founding_uidx
    ON public.admin_memberships (is_founding_super_admin)
    WHERE is_founding_super_admin;
CREATE UNIQUE INDEX IF NOT EXISTS admin_memberships_single_super_admin_uidx
    ON public.admin_memberships (role)
    WHERE role = 'super_admin';
CREATE INDEX IF NOT EXISTS admin_memberships_active_role_idx
    ON public.admin_memberships (role, user_id)
    WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.admin_permissions (
    admin_user_id UUID NOT NULL REFERENCES public.admin_memberships(user_id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL REFERENCES public.admin_permission_catalog(permission_key) ON DELETE RESTRICT,
    granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    PRIMARY KEY (admin_user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS admin_permissions_permission_idx
    ON public.admin_permissions (permission_key, admin_user_id);

CREATE TABLE IF NOT EXISTS public.admin_invitations (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    intended_email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'limited_admin' CHECK (role = 'limited_admin'),
    token_hash TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT admin_invitations_normalized_email CHECK (
        intended_email = pg_catalog.lower(pg_catalog.btrim(intended_email))
        AND pg_catalog.strpos(intended_email, '@') > 1
        AND pg_catalog.char_length(intended_email) <= 320
    ),
    CONSTRAINT admin_invitations_sha256_hash CHECK (
        token_hash ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT admin_invitations_short_lived CHECK (
        expires_at > created_at
        AND expires_at <= created_at + INTERVAL '24 hours'
    ),
    CONSTRAINT admin_invitations_terminal_state CHECK (
        NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL)
        AND ((accepted_at IS NULL AND accepted_by IS NULL) OR accepted_at IS NOT NULL)
        AND ((revoked_at IS NULL AND revoked_by IS NULL) OR revoked_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS admin_invitations_email_created_idx
    ON public.admin_invitations (intended_email, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_invitations_pending_expiry_idx
    ON public.admin_invitations (expires_at)
    WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS admin_invitations_one_pending_email_uidx
    ON public.admin_invitations (intended_email)
    WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.admin_invitation_permissions (
    invitation_id UUID NOT NULL REFERENCES public.admin_invitations(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL REFERENCES public.admin_permission_catalog(permission_key) ON DELETE RESTRICT,
    PRIMARY KEY (invitation_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    -- Deliberately not foreign keys: deleting an Auth user must neither rewrite
    -- immutable audit history nor be blocked by historical audit records.
    actor_user_id UUID,
    target_user_id UUID,
    action TEXT NOT NULL CHECK (
        action IN (
            'membership.created',
            'membership.role_changed',
            'membership.revoked',
            'membership.reactivated',
            'permission.granted',
            'permission.revoked',
            'invitation.created',
            'invitation.accepted',
            'invitation.revoked',
            'invitation.permission_added',
            'invitation.permission_removed'
        )
    ),
    resource_type TEXT NOT NULL CHECK (
        resource_type IN ('admin_membership', 'admin_permission', 'admin_invitation')
    ),
    resource_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT admin_audit_logs_metadata_object CHECK (
        pg_catalog.jsonb_typeof(metadata) = 'object'
    )
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx
    ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_created_idx
    ON public.admin_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_created_idx
    ON public.admin_audit_logs (target_user_id, created_at DESC);

-- No application-facing role receives direct table access. The backend service
-- role reaches authorization state only through the explicitly granted RPCs.
ALTER TABLE public.admin_permission_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitation_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.admin_permission_catalog
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.admin_memberships
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.admin_permissions
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.admin_invitations
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.admin_invitation_permissions
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.admin_audit_logs
    FROM PUBLIC, anon, authenticated, service_role;

-- Audit actors are explicit arguments supplied only after authorization inside a
-- privileged function. No custom session setting is trusted, so pooled database
-- sessions cannot leak or spoof attribution between requests.
CREATE OR REPLACE FUNCTION public.write_admin_audit_log(
    p_actor_user_id UUID,
    p_target_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    IF p_actor_user_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM auth.users AS auth_user WHERE auth_user.id = p_actor_user_id
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'invalid admin audit actor';
    END IF;

    INSERT INTO public.admin_audit_logs (
        actor_user_id, target_user_id, action, resource_type, resource_id, metadata
    ) VALUES (
        p_actor_user_id,
        p_target_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        COALESCE(p_metadata, '{}'::JSONB)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_admin_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin audit logs are immutable';
END;
$$;

REVOKE ALL ON FUNCTION public.write_admin_audit_log(UUID, UUID, TEXT, TEXT, UUID, JSONB)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_admin_audit_log_mutation()
    FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS prevent_admin_audit_log_update_delete ON public.admin_audit_logs;
CREATE TRIGGER prevent_admin_audit_log_update_delete
    BEFORE UPDATE OR DELETE ON public.admin_audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_audit_log_mutation();

-- Administrative access is tied to the current Auth record, not just a durable
-- membership row. A deleted, banned, or unverified account therefore loses
-- access immediately. The founding identity additionally requires its original
-- verified email as well as its immutable UUID.
CREATE OR REPLACE FUNCTION public.admin_auth_identity_is_active(
    p_user_id UUID,
    p_require_founding_identity BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM auth.users AS auth_user
        WHERE auth_user.id = p_user_id
          AND auth_user.email_confirmed_at IS NOT NULL
          AND auth_user.deleted_at IS NULL
          AND (auth_user.banned_until IS NULL OR auth_user.banned_until <= pg_catalog.now())
          AND (
              NOT p_require_founding_identity
              OR (
                  auth_user.id = '6c05db98-e615-459f-8e17-cda584049d26'::UUID
                  AND pg_catalog.lower(pg_catalog.btrim(auth_user.email)) = '3imranom@gmail.com'
              )
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_access(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_membership public.admin_memberships%ROWTYPE;
    v_permissions TEXT[];
BEGIN
    SELECT membership.*
    INTO v_membership
    FROM public.admin_memberships AS membership
    WHERE membership.user_id = p_user_id
      AND membership.status = 'active';

    IF NOT FOUND OR NOT public.admin_auth_identity_is_active(
        p_user_id,
        v_membership.role = 'super_admin'
    ) THEN
        RETURN NULL;
    END IF;

    IF v_membership.role = 'super_admin' AND (
        v_membership.user_id <> '6c05db98-e615-459f-8e17-cda584049d26'::UUID
        OR NOT v_membership.is_founding_super_admin
    ) THEN
        RETURN NULL;
    END IF;

    IF v_membership.role = 'super_admin' THEN
        SELECT COALESCE(
            pg_catalog.array_agg(catalog.permission_key ORDER BY catalog.permission_key),
            '{}'::TEXT[]
        )
        INTO v_permissions
        FROM public.admin_permission_catalog AS catalog;
    ELSE
        SELECT COALESCE(
            pg_catalog.array_agg(permission.permission_key ORDER BY permission.permission_key),
            '{}'::TEXT[]
        )
        INTO v_permissions
        FROM public.admin_permissions AS permission
        WHERE permission.admin_user_id = p_user_id;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'user_id', v_membership.user_id,
        'role', v_membership.role,
        'status', v_membership.status,
        'permissions', v_permissions
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_auth_identity_is_active(UUID, BOOLEAN)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_admin_access(UUID)
    FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assert_active_super_admin(p_actor_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    IF p_actor_user_id IS DISTINCT FROM '6c05db98-e615-459f-8e17-cda584049d26'::UUID
       OR NOT public.admin_auth_identity_is_active(p_actor_user_id, true)
       OR NOT EXISTS (
        SELECT 1
        FROM public.admin_memberships AS membership
        WHERE membership.user_id = p_actor_user_id
          AND membership.role = 'super_admin'
          AND membership.status = 'active'
          AND membership.is_founding_super_admin
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'active super admin required';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_admin_permissions(p_permissions TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    IF p_permissions IS NULL OR EXISTS (
        SELECT 1
        FROM pg_catalog.unnest(p_permissions) AS requested(permission_key)
        LEFT JOIN public.admin_permission_catalog AS catalog
          ON catalog.permission_key = requested.permission_key
        WHERE catalog.permission_key IS NULL
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid admin permission set';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_active_super_admin(UUID)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_admin_permissions(TEXT[])
    FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_admin_invitation(
    p_actor_user_id UUID,
    p_email TEXT,
    p_role TEXT,
    p_token_hash TEXT,
    p_expires_at TIMESTAMPTZ,
    p_permissions TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_email TEXT;
    v_invitation_id UUID;
    v_revoked_invitation_id UUID;
    v_permission_key TEXT;
BEGIN
    PERFORM public.assert_active_super_admin(p_actor_user_id);
    PERFORM public.validate_admin_permissions(p_permissions);

    v_email := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
    IF pg_catalog.char_length(v_email) < 3
       OR pg_catalog.char_length(v_email) > 320
       OR pg_catalog.strpos(v_email, '@') <= 1 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid invitation email';
    END IF;
    IF p_role IS DISTINCT FROM 'limited_admin' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'only limited_admin invitations are allowed';
    END IF;
    IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid invitation token hash';
    END IF;
    IF p_expires_at IS NULL
       OR p_expires_at <= pg_catalog.now()
       OR p_expires_at > pg_catalog.now() + INTERVAL '24 hours' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid invitation expiry';
    END IF;
    FOR v_revoked_invitation_id IN
        UPDATE public.admin_invitations
        SET revoked_at = pg_catalog.now(), revoked_by = p_actor_user_id
        WHERE intended_email = v_email
          AND accepted_at IS NULL
          AND revoked_at IS NULL
        RETURNING id
    LOOP
        PERFORM public.write_admin_audit_log(
            p_actor_user_id, NULL, 'invitation.revoked',
            'admin_invitation', v_revoked_invitation_id, '{}'::JSONB
        );
    END LOOP;

    INSERT INTO public.admin_invitations (
        intended_email, role, token_hash, invited_by, expires_at
    ) VALUES (
        v_email, p_role, p_token_hash, p_actor_user_id, p_expires_at
    )
    RETURNING id INTO v_invitation_id;

    PERFORM public.write_admin_audit_log(
        p_actor_user_id,
        NULL,
        'invitation.created',
        'admin_invitation',
        v_invitation_id,
        pg_catalog.jsonb_build_object('role', 'limited_admin', 'expires_at', p_expires_at)
    );

    FOR v_permission_key IN
        SELECT requested.permission_key
        FROM (
            SELECT DISTINCT permission_key
            FROM pg_catalog.unnest(p_permissions) AS permissions(permission_key)
        ) AS requested
    LOOP
        INSERT INTO public.admin_invitation_permissions (invitation_id, permission_key)
        VALUES (v_invitation_id, v_permission_key);
        PERFORM public.write_admin_audit_log(
            p_actor_user_id,
            NULL,
            'invitation.permission_added',
            'admin_invitation',
            v_invitation_id,
            pg_catalog.jsonb_build_object('permission_key', v_permission_key)
        );
    END LOOP;

    RETURN pg_catalog.jsonb_build_object('invitation_id', v_invitation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_admin_invitation(
    p_user_id UUID,
    p_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_email TEXT;
    v_invitation public.admin_invitations%ROWTYPE;
    v_permissions TEXT[];
    v_membership_existed BOOLEAN;
    v_permission_key TEXT;
BEGIN
    IF p_user_id IS NULL OR p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid invitation acceptance';
    END IF;

    IF NOT public.admin_auth_identity_is_active(p_user_id, false) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'active verified email account required';
    END IF;

    SELECT pg_catalog.lower(pg_catalog.btrim(auth_user.email))
    INTO v_email
    FROM auth.users AS auth_user
    WHERE auth_user.id = p_user_id;

    IF NOT FOUND OR v_email IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'active verified email account required';
    END IF;

    SELECT invitation.*
    INTO v_invitation
    FROM public.admin_invitations AS invitation
    WHERE invitation.token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND
       OR v_invitation.accepted_at IS NOT NULL
       OR v_invitation.revoked_at IS NOT NULL
       OR v_invitation.expires_at <= pg_catalog.now() THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invitation is invalid, expired, revoked, or already used';
    END IF;
    IF v_invitation.intended_email <> v_email THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'invitation does not belong to authenticated user';
    END IF;
    IF v_invitation.role IS DISTINCT FROM 'limited_admin' THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'only limited_admin invitations can be accepted';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.admin_memberships AS membership
        WHERE membership.user_id = p_user_id AND membership.status = 'active'
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'admin membership is already active';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.admin_memberships AS membership
        WHERE membership.user_id = p_user_id AND membership.is_founding_super_admin
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'founding membership cannot be changed by invitation';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.admin_memberships AS membership
        WHERE membership.user_id = p_user_id
    ) INTO v_membership_existed;

    INSERT INTO public.admin_memberships (
        user_id, role, status, is_founding_super_admin, invited_by,
        revoked_by, revoked_at, updated_at
    ) VALUES (
        p_user_id, v_invitation.role, 'active', false, v_invitation.invited_by,
        NULL, NULL, pg_catalog.now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'active',
        invited_by = EXCLUDED.invited_by,
        revoked_by = NULL,
        revoked_at = NULL,
        updated_at = pg_catalog.now();

    FOR v_permission_key IN
        DELETE FROM public.admin_permissions
        WHERE admin_user_id = p_user_id
        RETURNING permission_key
    LOOP
        PERFORM public.write_admin_audit_log(
            p_user_id,
            p_user_id,
            'permission.revoked',
            'admin_permission',
            p_user_id,
            pg_catalog.jsonb_build_object('permission_key', v_permission_key)
        );
    END LOOP;

    FOR v_permission_key IN
        SELECT invitation_permission.permission_key
        FROM public.admin_invitation_permissions AS invitation_permission
        WHERE invitation_permission.invitation_id = v_invitation.id
    LOOP
        INSERT INTO public.admin_permissions (
            admin_user_id, permission_key, granted_by
        )
        VALUES (p_user_id, v_permission_key, v_invitation.invited_by);
        PERFORM public.write_admin_audit_log(
            v_invitation.invited_by,
            p_user_id,
            'permission.granted',
            'admin_permission',
            p_user_id,
            pg_catalog.jsonb_build_object('permission_key', v_permission_key)
        );
    END LOOP;

    UPDATE public.admin_invitations
    SET accepted_at = pg_catalog.now(), accepted_by = p_user_id
    WHERE id = v_invitation.id
      AND accepted_at IS NULL
      AND revoked_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invitation was already used';
    END IF;

    PERFORM public.write_admin_audit_log(
        p_user_id,
        p_user_id,
        CASE WHEN v_membership_existed THEN 'membership.reactivated' ELSE 'membership.created' END,
        'admin_membership',
        p_user_id,
        pg_catalog.jsonb_build_object('invited_by', v_invitation.invited_by)
    );
    PERFORM public.write_admin_audit_log(
        p_user_id,
        p_user_id,
        'invitation.accepted',
        'admin_invitation',
        v_invitation.id,
        '{}'::JSONB
    );

    SELECT COALESCE(
        pg_catalog.array_agg(permission.permission_key ORDER BY permission.permission_key),
        '{}'::TEXT[]
    )
    INTO v_permissions
    FROM public.admin_permissions AS permission
    WHERE permission.admin_user_id = p_user_id;

    RETURN pg_catalog.jsonb_build_object(
        'role', 'limited_admin',
        'permissions', COALESCE(v_permissions, '{}'::TEXT[])
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_limited_admin_permissions(
    p_actor_user_id UUID,
    p_target_user_id UUID,
    p_permissions TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_permission_key TEXT;
BEGIN
    PERFORM public.assert_active_super_admin(p_actor_user_id);
    PERFORM public.validate_admin_permissions(p_permissions);
    IF p_target_user_id IS NULL OR p_target_user_id = p_actor_user_id THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'cannot change own permissions';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_memberships AS membership
        WHERE membership.user_id = p_target_user_id
          AND membership.role = 'limited_admin'
          AND membership.status = 'active'
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'active limited admin required';
    END IF;

    FOR v_permission_key IN
        DELETE FROM public.admin_permissions
        WHERE admin_user_id = p_target_user_id
        RETURNING permission_key
    LOOP
        PERFORM public.write_admin_audit_log(
            p_actor_user_id, p_target_user_id, 'permission.revoked',
            'admin_permission', p_target_user_id,
            pg_catalog.jsonb_build_object('permission_key', v_permission_key)
        );
    END LOOP;

    FOR v_permission_key IN
        SELECT DISTINCT permission_key
        FROM pg_catalog.unnest(p_permissions) AS permissions(permission_key)
    LOOP
        INSERT INTO public.admin_permissions (admin_user_id, permission_key, granted_by)
        VALUES (p_target_user_id, v_permission_key, p_actor_user_id);
        PERFORM public.write_admin_audit_log(
            p_actor_user_id, p_target_user_id, 'permission.granted',
            'admin_permission', p_target_user_id,
            pg_catalog.jsonb_build_object('permission_key', v_permission_key)
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admin_role(
    p_actor_user_id UUID,
    p_target_user_id UUID,
    p_role TEXT,
    p_permissions TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_permission_key TEXT;
BEGIN
    PERFORM public.assert_active_super_admin(p_actor_user_id);
    PERFORM public.validate_admin_permissions(p_permissions);
    IF p_target_user_id IS NULL OR p_target_user_id = p_actor_user_id THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'cannot change own admin role';
    END IF;
    IF p_role IS DISTINCT FROM 'limited_admin' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'only limited_admin role assignments are allowed';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_memberships AS membership
        WHERE membership.user_id = p_target_user_id
          AND membership.role = 'limited_admin'
          AND membership.status = 'active'
          AND NOT membership.is_founding_super_admin
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'eligible active admin required';
    END IF;

    UPDATE public.admin_memberships
    SET role = 'limited_admin', updated_at = pg_catalog.now()
    WHERE user_id = p_target_user_id;

    FOR v_permission_key IN
        DELETE FROM public.admin_permissions
        WHERE admin_user_id = p_target_user_id
        RETURNING permission_key
    LOOP
        PERFORM public.write_admin_audit_log(
            p_actor_user_id, p_target_user_id, 'permission.revoked',
            'admin_permission', p_target_user_id,
            pg_catalog.jsonb_build_object('permission_key', v_permission_key)
        );
    END LOOP;

    FOR v_permission_key IN
        SELECT DISTINCT permission_key
        FROM pg_catalog.unnest(p_permissions) AS permissions(permission_key)
    LOOP
        INSERT INTO public.admin_permissions (admin_user_id, permission_key, granted_by)
        VALUES (p_target_user_id, v_permission_key, p_actor_user_id);
        PERFORM public.write_admin_audit_log(
            p_actor_user_id, p_target_user_id, 'permission.granted',
            'admin_permission', p_target_user_id,
            pg_catalog.jsonb_build_object('permission_key', v_permission_key)
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_admin_access(
    p_actor_user_id UUID,
    p_target_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_permission_key TEXT;
    v_revoked_invitation_id UUID;
BEGIN
    PERFORM public.assert_active_super_admin(p_actor_user_id);
    IF p_target_user_id IS NULL OR p_target_user_id = p_actor_user_id THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'cannot revoke own admin access';
    END IF;
    IF p_reason IS NOT NULL AND pg_catalog.char_length(p_reason) > 500 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'revocation reason is too long';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.admin_memberships AS membership
        WHERE membership.user_id = p_target_user_id
          AND membership.is_founding_super_admin
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'founding super admin cannot be revoked';
    END IF;

    UPDATE public.admin_memberships
    SET status = 'revoked',
        revoked_by = p_actor_user_id,
        revoked_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE user_id = p_target_user_id
      AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'active admin membership required';
    END IF;

    PERFORM public.write_admin_audit_log(
        p_actor_user_id, p_target_user_id, 'membership.revoked',
        'admin_membership', p_target_user_id,
        pg_catalog.jsonb_build_object('reason_provided', p_reason IS NOT NULL)
    );

    FOR v_permission_key IN
        DELETE FROM public.admin_permissions
        WHERE admin_user_id = p_target_user_id
        RETURNING permission_key
    LOOP
        PERFORM public.write_admin_audit_log(
            p_actor_user_id, p_target_user_id, 'permission.revoked',
            'admin_permission', p_target_user_id,
            pg_catalog.jsonb_build_object('permission_key', v_permission_key)
        );
    END LOOP;

    FOR v_revoked_invitation_id IN
        UPDATE public.admin_invitations
        SET revoked_at = pg_catalog.now(), revoked_by = p_actor_user_id
        WHERE invited_by = p_target_user_id
          AND accepted_at IS NULL
          AND revoked_at IS NULL
        RETURNING id
    LOOP
        PERFORM public.write_admin_audit_log(
            p_actor_user_id, p_target_user_id, 'invitation.revoked',
            'admin_invitation', v_revoked_invitation_id, '{}'::JSONB
        );
    END LOOP;
END;
$$;

-- Pin every privileged or trigger function to Supabase's database-owner role.
-- Internal helpers remain non-executable by application roles; SECURITY DEFINER
-- entry points call them with the owner's implicit EXECUTE privilege.
ALTER FUNCTION public.write_admin_audit_log(UUID, UUID, TEXT, TEXT, UUID, JSONB)
    OWNER TO postgres;
ALTER FUNCTION public.prevent_admin_audit_log_mutation()
    OWNER TO postgres;
ALTER FUNCTION public.admin_auth_identity_is_active(UUID, BOOLEAN)
    OWNER TO postgres;
ALTER FUNCTION public.get_admin_access(UUID)
    OWNER TO postgres;
ALTER FUNCTION public.assert_active_super_admin(UUID)
    OWNER TO postgres;
ALTER FUNCTION public.validate_admin_permissions(TEXT[])
    OWNER TO postgres;
ALTER FUNCTION public.create_admin_invitation(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[])
    OWNER TO postgres;
ALTER FUNCTION public.accept_admin_invitation(UUID, TEXT)
    OWNER TO postgres;
ALTER FUNCTION public.set_limited_admin_permissions(UUID, UUID, TEXT[])
    OWNER TO postgres;
ALTER FUNCTION public.set_admin_role(UUID, UUID, TEXT, TEXT[])
    OWNER TO postgres;
ALTER FUNCTION public.revoke_admin_access(UUID, UUID, TEXT)
    OWNER TO postgres;

REVOKE ALL ON FUNCTION public.create_admin_invitation(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[])
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.accept_admin_invitation(UUID, TEXT)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_limited_admin_permissions(UUID, UUID, TEXT[])
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_admin_role(UUID, UUID, TEXT, TEXT[])
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_admin_access(UUID, UUID, TEXT)
    FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_admin_access(UUID)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.create_admin_invitation(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[])
    TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_admin_invitation(UUID, TEXT)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.set_limited_admin_permissions(UUID, UUID, TEXT[])
    TO service_role;
GRANT EXECUTE ON FUNCTION public.set_admin_role(UUID, UUID, TEXT, TEXT[])
    TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_admin_access(UUID, UUID, TEXT)
    TO service_role;

-- Bootstrap requires both the immutable Auth UUID and its already-verified email.
-- Email matching alone can never create or promote an administrator.
DO $$
DECLARE
    v_bootstrapped_user_id UUID;
BEGIN
    IF NOT public.admin_auth_identity_is_active(
        '6c05db98-e615-459f-8e17-cda584049d26'::UUID,
        true
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = 'verified founding Super Admin Auth identity was not found';
    END IF;

    INSERT INTO public.admin_memberships (
        user_id, role, status, is_founding_super_admin
    ) VALUES (
        '6c05db98-e615-459f-8e17-cda584049d26'::UUID,
        'super_admin',
        'active',
        true
    )
    ON CONFLICT (user_id) DO NOTHING
    RETURNING user_id INTO v_bootstrapped_user_id;

    IF v_bootstrapped_user_id IS NOT NULL THEN
        PERFORM public.write_admin_audit_log(
            NULL,
            v_bootstrapped_user_id,
            'membership.created',
            'admin_membership',
            v_bootstrapped_user_id,
            pg_catalog.jsonb_build_object('founding_super_admin', true)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.admin_memberships AS membership
        WHERE membership.user_id = '6c05db98-e615-459f-8e17-cda584049d26'::UUID
          AND membership.role = 'super_admin'
          AND membership.status = 'active'
          AND membership.is_founding_super_admin
    ) OR (
        SELECT pg_catalog.count(*)
        FROM public.admin_memberships AS membership
        WHERE membership.role = 'super_admin'
    ) <> 1 THEN
        RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = 'founding Super Admin bootstrap state is inconsistent';
    END IF;
END;
$$;
