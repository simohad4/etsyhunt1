import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  canApplyPrivateStateLoad,
  createAuthoritativeUserPrivateState,
  createEmptyUserPrivateState,
  didAuthenticatedUserChange
} from '../src/security/privateWorkspaceState';
import {
  canSubmitRecoveredPassword,
  inspectPasswordRecoveryRedirect,
  passwordRecoveryStateFromAuthEvent,
  updateRecoveredPasswordWithSupabase
} from '../src/security/passwordRecovery';
import { canAccessPrivateWorkspace } from '../src/security/workspaceAccess';

test('User A logout followed by User B login clears all User A private state', () => {
  const userAState = createAuthoritativeUserPrivateState(
    'user-a',
    { id: 'workspace-a' },
    [{ id: 'listing-a' }],
    [{ id: 'history-a' }]
  );
  assert.equal(userAState.savedListings.length, 1);

  assert.equal(didAuthenticatedUserChange('user-a', null), true);
  const loggedOutState = createEmptyUserPrivateState(null);
  assert.equal(loggedOutState.workspace, null);
  assert.deepEqual(loggedOutState.savedListings, []);
  assert.deepEqual(loggedOutState.searchHistory, []);

  assert.equal(didAuthenticatedUserChange(null, 'user-b'), true);
  const userBLoadingState = createEmptyUserPrivateState('user-b');
  assert.equal(userBLoadingState.ownerUserId, 'user-b');
  assert.deepEqual(userBLoadingState.savedListings, []);
  assert.deepEqual(userBLoadingState.searchHistory, []);

  assert.equal(canApplyPrivateStateLoad('user-b', 3, 'user-a', 1), false);
});

test('User B authoritative zero listings and history replace prior arrays', () => {
  const userBState = createAuthoritativeUserPrivateState(
    'user-b',
    { id: 'workspace-b' },
    [],
    []
  );

  assert.equal(userBState.ownerUserId, 'user-b');
  assert.deepEqual(userBState.savedListings, []);
  assert.deepEqual(userBState.searchHistory, []);
});

test('session expiration clears private state and workspace access', () => {
  const expiredState = createEmptyUserPrivateState(null);

  assert.equal(expiredState.workspace, null);
  assert.deepEqual(expiredState.savedListings, []);
  assert.deepEqual(expiredState.searchHistory, []);
  assert.equal(
    canAccessPrivateWorkspace({
      isSupabaseConfigured: true,
      user: null,
      workspace: expiredState.workspace
    }),
    false
  );
});

test('private browser state is not stored in global custom localStorage keys', () => {
  const files = [
    path.resolve(process.cwd(), 'src/context/AuthContext.tsx'),
    path.resolve(process.cwd(), 'src/App.tsx')
  ];
  const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

  for (const forbiddenKey of [
    'etsyhunter_personal_workspace',
    'etsyhunter_saved_listings',
    'etsyhunter_search_history',
    'etsyhunter_products'
  ]) {
    assert.equal(source.includes(forbiddenKey), false, `${forbiddenKey} must not be persisted`);
  }
  assert.equal(source.includes('localStorage.'), false);
});

test('valid PASSWORD_RECOVERY session authorizes exactly one matching user flow', async () => {
  const recoveryState = passwordRecoveryStateFromAuthEvent('PASSWORD_RECOVERY', 'user-b');
  assert.ok(recoveryState);
  assert.equal(recoveryState.status, 'ready');
  assert.equal(canSubmitRecoveredPassword(recoveryState, 'user-b'), true);
  assert.equal(canSubmitRecoveredPassword(recoveryState, 'user-a'), false);

  let updateCalls = 0;
  const result = await updateRecoveredPasswordWithSupabase(
    recoveryState,
    'user-b',
    {
      updateUser: async ({ password }) => {
        updateCalls += 1;
        assert.equal(password, 'new-secure-password');
        return { error: null };
      }
    },
    'new-secure-password'
  );

  assert.equal(result.error, null);
  assert.equal(updateCalls, 1);
});

test('invalid or expired recovery links never call updateUser', async () => {
  const redirect = inspectPasswordRecoveryRedirect(
    '?recovery=1&error=access_denied&error_code=otp_expired&error_description=link+expired',
    ''
  );
  assert.equal(redirect.hasRecoveryIntent, true);
  assert.match(redirect.error ?? '', /expired/i);

  const invalidState = passwordRecoveryStateFromAuthEvent('PASSWORD_RECOVERY', null);
  assert.ok(invalidState);
  assert.equal(invalidState.status, 'invalid');

  let updateCalls = 0;
  const result = await updateRecoveredPasswordWithSupabase(
    invalidState,
    null,
    {
      updateUser: async () => {
        updateCalls += 1;
        return { error: null };
      }
    },
    'must-not-be-used'
  );

  assert.match(result.error?.message ?? '', /missing or has expired/i);
  assert.equal(updateCalls, 0);
});
