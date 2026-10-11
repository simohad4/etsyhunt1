export type PasswordRecoveryStatus = 'idle' | 'ready' | 'invalid';

export interface PasswordRecoveryState {
  status: PasswordRecoveryStatus;
  recoveryUserId: string | null;
  error: string | null;
}

export interface RecoveryRedirectState {
  hasRecoveryIntent: boolean;
  error: string | null;
}

export const EMPTY_PASSWORD_RECOVERY_STATE: PasswordRecoveryState = {
  status: 'idle',
  recoveryUserId: null,
  error: null
};

function readParams(value: string, prefix: '?' | '#'): URLSearchParams {
  return new URLSearchParams(value.startsWith(prefix) ? value.slice(1) : value);
}

export function inspectPasswordRecoveryRedirect(
  search: string,
  hash: string
): RecoveryRedirectState {
  const searchParams = readParams(search, '?');
  const hashParams = readParams(hash, '#');
  const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
  const errorDescription =
    searchParams.get('error_description') || hashParams.get('error_description');
  const providerError = searchParams.get('error') || hashParams.get('error');
  const hasRecoveryIntent =
    searchParams.get('recovery') === '1' ||
    hashParams.get('type') === 'recovery' ||
    hash === '#reset-password';

  if (errorCode || providerError) {
    const expired = errorCode === 'otp_expired' || /expired/i.test(errorDescription || '');
    return {
      hasRecoveryIntent: true,
      error: expired
        ? 'This password recovery link has expired. Request a new recovery email.'
        : 'This password recovery link is invalid. Request a new recovery email.'
    };
  }

  return { hasRecoveryIntent, error: null };
}

export function passwordRecoveryStateFromAuthEvent(
  event: string,
  sessionUserId: string | null
): PasswordRecoveryState | null {
  if (event !== 'PASSWORD_RECOVERY') return null;

  if (!sessionUserId) {
    return {
      status: 'invalid',
      recoveryUserId: null,
      error: 'This password recovery link is invalid or has expired.'
    };
  }

  return {
    status: 'ready',
    recoveryUserId: sessionUserId,
    error: null
  };
}

export function canSubmitRecoveredPassword(
  recoveryState: PasswordRecoveryState,
  sessionUserId: string | null
): boolean {
  return (
    recoveryState.status === 'ready' &&
    Boolean(sessionUserId) &&
    recoveryState.recoveryUserId === sessionUserId
  );
}

interface PasswordUpdateAuthClient {
  updateUser(input: { password: string }): Promise<{ error: { message: string } | null }>;
}

export async function updateRecoveredPasswordWithSupabase(
  recoveryState: PasswordRecoveryState,
  sessionUserId: string | null,
  authClient: PasswordUpdateAuthClient,
  newPassword: string
): Promise<{ error: Error | null }> {
  if (!canSubmitRecoveredPassword(recoveryState, sessionUserId)) {
    return {
      error: new Error(
        'Password recovery authorization is missing or has expired. Request a new recovery email.'
      )
    };
  }

  try {
    const { error } = await authClient.updateUser({ password: newPassword });
    return { error: error ? new Error(error.message) : null };
  } catch (error: any) {
    return { error: error instanceof Error ? error : new Error('Password update failed.') };
  }
}
