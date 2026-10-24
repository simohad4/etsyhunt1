import { ProviderAdapterError } from './adapterContract';

export type WireDraftErrorCode = 'INVALID_INPUT' | 'INVALID_RESPONSE' | 'SIZE_LIMIT' | 'BLOCKED_OUTCOME' | 'PROVIDER_ERROR';
export class WireDraftError extends Error {
  constructor(public readonly code: WireDraftErrorCode) {
    super(`Offline wire draft rejected: ${code}.`);
    this.name = 'WireDraftError';
  }
}
export function block(code: WireDraftErrorCode): never { throw new WireDraftError(code); }
export function guarded<T>(fallback: WireDraftErrorCode, action: () => T): T {
  try { return action(); } catch (error) {
    if (error instanceof WireDraftError) throw error;
    if (error instanceof ProviderAdapterError && error.code === 'SIZE_LIMIT') block('SIZE_LIMIT');
    return block(fallback);
  }
}
export const WIRE_DRAFT_SAFETY = Object.freeze({
  mode: 'offline-wire-draft' as const, fixtureTrust: 'synthetic_unverified' as const,
  wireSchemaVerified: false as const, liveWireCertified: false as const,
  activationBlocked: true as const, executionAuthorized: false as const,
  automaticRetryAllowed: false as const, requiresAuthoritativeDatabaseValidation: true as const
});
