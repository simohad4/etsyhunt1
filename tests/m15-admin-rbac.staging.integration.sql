\set ON_ERROR_STOP on
\set ECHO errors

BEGIN;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

SELECT pg_catalog.set_config('etsyhunter_test.staging_ref', :'staging_ref', true);
SELECT pg_catalog.set_config('etsyhunter_test.founder_id', :'founder_id', true);
SELECT pg_catalog.set_config('etsyhunter_test.founder_email', :'founder_email', true);
SELECT pg_catalog.set_config('etsyhunter_test.fixture_type', :'fixture_type', true);
SELECT pg_catalog.set_config('etsyhunter_test.run_id', :'run_id', true);
SELECT pg_catalog.set_config('etsyhunter_test.fixture_a_id', :'fixture_a_id', true);
SELECT pg_catalog.set_config('etsyhunter_test.fixture_a_email', :'fixture_a_email', true);
SELECT pg_catalog.set_config('etsyhunter_test.fixture_b_id', :'fixture_b_id', true);
SELECT pg_catalog.set_config('etsyhunter_test.fixture_b_email', :'fixture_b_email', true);
SELECT pg_catalog.set_config('etsyhunter_test.mismatch_hash', :'mismatch_hash', true);
SELECT pg_catalog.set_config('etsyhunter_test.replay_hash', :'replay_hash', true);
SELECT pg_catalog.set_config('etsyhunter_test.invalid_hash', :'invalid_hash', true);
SELECT pg_catalog.set_config('etsyhunter_test.limited_hash', :'limited_hash', true);

-- This guard runs before SET ROLE. Production cannot satisfy the staging-only
-- Auth metadata requirements even if an operator supplies the wrong DB URL.
DO $guard$
DECLARE
    v_staging_ref TEXT := pg_catalog.current_setting('etsyhunter_test.staging_ref');
    v_fixture_type TEXT := pg_catalog.current_setting('etsyhunter_test.fixture_type');
    v_run_id TEXT := pg_catalog.current_setting('etsyhunter_test.run_id');
BEGIN
    IF pg_catalog.current_database() <> 'postgres' THEN
        RAISE EXCEPTION 'staging guard: unexpected database';
    END IF;

    IF v_staging_ref <> 'iwqnyqaefovhvnunarfa' THEN
        RAISE EXCEPTION 'staging guard: unexpected project ref';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM auth.users AS auth_user
        WHERE auth_user.id = pg_catalog.current_setting('etsyhunter_test.founder_id')::UUID
          AND pg_catalog.lower(pg_catalog.btrim(auth_user.email)) =
              pg_catalog.current_setting('etsyhunter_test.founder_email')
          AND auth_user.email_confirmed_at IS NOT NULL
          AND auth_user.deleted_at IS NULL
          AND auth_user.raw_app_meta_data ->> 'etsyhunter_fixture_environment' = 'staging-only'
          AND auth_user.raw_app_meta_data ->> 'etsyhunter_fixture_project_ref' = v_staging_ref
          AND auth_user.raw_app_meta_data ->> 'etsyhunter_synthetic_staging_fixture' = 'true'
    ) THEN
        RAISE EXCEPTION 'staging guard: founder is not the marked staging fixture';
    END IF;

    IF (
        SELECT pg_catalog.count(*)
        FROM auth.users AS auth_user
        WHERE (
            (
                auth_user.id = pg_catalog.current_setting('etsyhunter_test.fixture_a_id')::UUID
                AND auth_user.email = pg_catalog.current_setting('etsyhunter_test.fixture_a_email')
            )
            OR (
                auth_user.id = pg_catalog.current_setting('etsyhunter_test.fixture_b_id')::UUID
                AND auth_user.email = pg_catalog.current_setting('etsyhunter_test.fixture_b_email')
            )
          )
          AND auth_user.email_confirmed_at IS NOT NULL
          AND auth_user.deleted_at IS NULL
          AND auth_user.raw_app_meta_data ->> 'etsyhunter_fixture' = v_fixture_type
          AND auth_user.raw_app_meta_data ->> 'etsyhunter_fixture_environment' = 'staging-only'
          AND auth_user.raw_app_meta_data ->> 'etsyhunter_fixture_project_ref' = v_staging_ref
          AND auth_user.raw_app_meta_data ->> 'etsyhunter_fixture_run_id' = v_run_id
          AND auth_user.raw_app_meta_data ->> 'etsyhunter_synthetic_staging_fixture' = 'true'
    ) <> 2 THEN
        RAISE EXCEPTION 'staging guard: disposable Auth fixtures do not match this run';
    END IF;
END;
$guard$;

-- Browser roles must not be able to call the privileged authorization RPC.
SET LOCAL ROLE authenticated;
DO $authenticated_denial$
BEGIN
    PERFORM public.get_admin_access(
        pg_catalog.current_setting('etsyhunter_test.founder_id')::UUID
    );
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'authenticated unexpectedly executed admin RPC';
EXCEPTION
    WHEN insufficient_privilege THEN NULL;
END;
$authenticated_denial$;
RESET ROLE;

-- All intended backend calls execute with the same database role used by the
-- server-only Supabase client.
SET LOCAL ROLE service_role;

DO $service_role_access$
DECLARE
    v_access JSONB;
BEGIN
    v_access := public.get_admin_access(
        pg_catalog.current_setting('etsyhunter_test.founder_id')::UUID
    );
    IF v_access IS NULL OR v_access ->> 'role' <> 'super_admin' THEN
        RAISE EXCEPTION 'service_role could not resolve founding Super Admin';
    END IF;
END;
$service_role_access$;

-- Invitation email binding: fixture B cannot accept fixture A's invitation.
DO $create_mismatch_invitation$
BEGIN
    PERFORM public.create_admin_invitation(
        pg_catalog.current_setting('etsyhunter_test.founder_id')::UUID,
        pg_catalog.current_setting('etsyhunter_test.fixture_a_email'),
        'limited_admin',
        pg_catalog.current_setting('etsyhunter_test.mismatch_hash'),
        pg_catalog.now() + INTERVAL '30 minutes',
        ARRAY['dashboard.view']::TEXT[]
    );
END;
$create_mismatch_invitation$;

DO $email_mismatch$
BEGIN
    PERFORM public.accept_admin_invitation(
        pg_catalog.current_setting('etsyhunter_test.fixture_b_id')::UUID,
        pg_catalog.current_setting('etsyhunter_test.mismatch_hash')
    );
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'email mismatch unexpectedly accepted';
EXCEPTION
    WHEN insufficient_privilege THEN
        IF SQLERRM <> 'invitation does not belong to authenticated user' THEN
            RAISE;
        END IF;
END;
$email_mismatch$;

DO $mismatch_created_no_membership$
BEGIN
    IF public.get_admin_access(
        pg_catalog.current_setting('etsyhunter_test.fixture_b_id')::UUID
    ) IS NOT NULL THEN
        RAISE EXCEPTION 'email mismatch created an admin membership';
    END IF;
END;
$mismatch_created_no_membership$;

-- Invalid permissions fail before an invitation or permission mutation commits.
DO $invalid_invitation_permissions$
BEGIN
    PERFORM public.create_admin_invitation(
        pg_catalog.current_setting('etsyhunter_test.founder_id')::UUID,
        pg_catalog.current_setting('etsyhunter_test.fixture_b_email'),
        'limited_admin',
        pg_catalog.current_setting('etsyhunter_test.invalid_hash'),
        pg_catalog.now() + INTERVAL '30 minutes',
        ARRAY['dashboard.view', 'root.all']::TEXT[]
    );
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'invalid invitation permission accepted';
EXCEPTION
    WHEN invalid_parameter_value THEN
        IF SQLERRM <> 'invalid admin permission set' THEN
            RAISE;
        END IF;
END;
$invalid_invitation_permissions$;

-- Creating a replacement invitation revokes the prior pending invitation for
-- the same email. The replacement is then accepted exactly once.
DO $create_replay_invitation$
BEGIN
    PERFORM public.create_admin_invitation(
        pg_catalog.current_setting('etsyhunter_test.founder_id')::UUID,
        pg_catalog.current_setting('etsyhunter_test.fixture_a_email'),
        'limited_admin',
        pg_catalog.current_setting('etsyhunter_test.replay_hash'),
        pg_catalog.now() + INTERVAL '30 minutes',
        ARRAY['dashboard.view']::TEXT[]
    );
END;
$create_replay_invitation$;

DO $first_acceptance$
DECLARE
    v_result JSONB;
BEGIN
    v_result := public.accept_admin_invitation(
        pg_catalog.current_setting('etsyhunter_test.fixture_a_id')::UUID,
        pg_catalog.current_setting('etsyhunter_test.replay_hash')
    );
    IF v_result ->> 'role' <> 'limited_admin'
       OR NOT (v_result -> 'permissions' @> '["dashboard.view"]'::JSONB) THEN
        RAISE EXCEPTION 'first invitation acceptance returned unexpected access';
    END IF;
END;
$first_acceptance$;

DO $replay_denial$
BEGIN
    PERFORM public.accept_admin_invitation(
        pg_catalog.current_setting('etsyhunter_test.fixture_a_id')::UUID,
        pg_catalog.current_setting('etsyhunter_test.replay_hash')
    );
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'invitation replay unexpectedly succeeded';
EXCEPTION
    WHEN raise_exception THEN
        IF SQLERRM <> 'invitation is invalid, expired, revoked, or already used' THEN
            RAISE;
        END IF;
END;
$replay_denial$;

-- A limited admin cannot use the service-mediated RPCs to elevate itself or
-- invite another administrator, even if its UUID is supplied as the actor.
DO $limited_invite_denial$
BEGIN
    PERFORM public.create_admin_invitation(
        pg_catalog.current_setting('etsyhunter_test.fixture_a_id')::UUID,
        pg_catalog.current_setting('etsyhunter_test.fixture_b_email'),
        'limited_admin',
        pg_catalog.current_setting('etsyhunter_test.limited_hash'),
        pg_catalog.now() + INTERVAL '30 minutes',
        ARRAY['dashboard.view']::TEXT[]
    );
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'limited admin unexpectedly invited an admin';
EXCEPTION
    WHEN insufficient_privilege THEN
        IF SQLERRM <> 'active super admin required' THEN
            RAISE;
        END IF;
END;
$limited_invite_denial$;

DO $limited_promotion_denial$
BEGIN
    PERFORM public.set_admin_role(
        pg_catalog.current_setting('etsyhunter_test.fixture_a_id')::UUID,
        pg_catalog.current_setting('etsyhunter_test.fixture_a_id')::UUID,
        'super_admin',
        '{}'::TEXT[]
    );
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'limited admin unexpectedly promoted itself';
EXCEPTION
    WHEN insufficient_privilege THEN
        IF SQLERRM <> 'active super admin required' THEN
            RAISE;
        END IF;
END;
$limited_promotion_denial$;

DO $role_still_limited$
DECLARE
    v_access JSONB;
BEGIN
    v_access := public.get_admin_access(
        pg_catalog.current_setting('etsyhunter_test.fixture_a_id')::UUID
    );
    IF v_access IS NULL OR v_access ->> 'role' <> 'limited_admin' THEN
        RAISE EXCEPTION 'failed escalation changed the limited-admin role';
    END IF;
END;
$role_still_limited$;

DO $invalid_permission_update$
BEGIN
    PERFORM public.set_limited_admin_permissions(
        pg_catalog.current_setting('etsyhunter_test.founder_id')::UUID,
        pg_catalog.current_setting('etsyhunter_test.fixture_a_id')::UUID,
        ARRAY['dashboard.view', 'root.all']::TEXT[]
    );
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'invalid permission update unexpectedly succeeded';
EXCEPTION
    WHEN invalid_parameter_value THEN
        IF SQLERRM <> 'invalid admin permission set' THEN
            RAISE;
        END IF;
END;
$invalid_permission_update$;

DO $permissions_unchanged$
DECLARE
    v_access JSONB;
BEGIN
    v_access := public.get_admin_access(
        pg_catalog.current_setting('etsyhunter_test.fixture_a_id')::UUID
    );
    IF v_access -> 'permissions' <> '["dashboard.view"]'::JSONB THEN
        RAISE EXCEPTION 'failed invalid update changed permissions';
    END IF;
END;
$permissions_unchanged$;

-- Exactly one Super Admin exists, so a revocation attempt necessarily targets
-- the founder as its own actor. The self-revocation guard must reject it and the
-- membership must remain active.
DO $founder_revocation_denial$
BEGIN
    PERFORM public.revoke_admin_access(
        pg_catalog.current_setting('etsyhunter_test.founder_id')::UUID,
        pg_catalog.current_setting('etsyhunter_test.founder_id')::UUID,
        'integration-test'
    );
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'founder revocation unexpectedly succeeded';
EXCEPTION
    WHEN insufficient_privilege THEN
        IF SQLERRM NOT IN (
            'cannot revoke own admin access',
            'founding super admin cannot be revoked'
        ) THEN
            RAISE;
        END IF;
END;
$founder_revocation_denial$;

DO $founder_still_active$
DECLARE
    v_access JSONB;
BEGIN
    v_access := public.get_admin_access(
        pg_catalog.current_setting('etsyhunter_test.founder_id')::UUID
    );
    IF v_access IS NULL OR v_access ->> 'role' <> 'super_admin' THEN
        RAISE EXCEPTION 'founder access changed after rejected revocation';
    END IF;
END;
$founder_still_active$;

RESET ROLE;
ROLLBACK;

\echo 'PASS: PostgreSQL RBAC assertions completed; transaction rolled back'
