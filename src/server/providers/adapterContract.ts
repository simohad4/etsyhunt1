/** Offline projection contracts; not provider execution or admission. */
export type AdapterErrorCode = 'INVALID_INPUT' | 'INVALID_RESPONSE' | 'SIZE_LIMIT' | 'UNSAFE_URL';
export class ProviderAdapterError extends Error {
  constructor(public readonly code: AdapterErrorCode) {
    super(`Offline provider adapter rejected input: ${code}.`);
    this.name = 'ProviderAdapterError';
  }
}
export function reject(code: AdapterErrorCode = 'INVALID_RESPONSE'): never {
  throw new ProviderAdapterError(code);
}
export function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) reject();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !keys.includes(key) ||
      !('value' in descriptors[key]) || !descriptors[key].enumerable)) reject();
  return value as Record<string, unknown>;
}
export function text(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum ||
      /[\u0000-\u001f\u007f]/u.test(value)) reject();
  return value;
}
export function integer(value: unknown, maximum: number, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) reject();
  return value as number;
}
export function json(raw: unknown, maximumBytes: number): unknown {
  if (typeof raw !== 'string') reject();
  if (Buffer.byteLength(raw, 'utf8') > maximumBytes) reject('SIZE_LIMIT');
  try { return JSON.parse(raw); } catch { return reject(); }
}
export function timestamp(value: unknown): string {
  const result = text(value, 24);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result) ||
      !Number.isFinite(Date.parse(result)) || new Date(result).toISOString() !== result) reject();
  return result;
}
export function freeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(child => freeze(child));
    Object.freeze(value);
  }
  return value;
}
