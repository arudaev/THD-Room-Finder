/**
 * Tiny localStorage cache with TTL — replaces the native app's Room DB. Network
 * is the source of truth; the cache lets the app open instantly and survive
 * offline by serving the last good payload. Ported from the old PWA `api.js`.
 */

interface Envelope<T> {
  timestamp: number;
  data: T;
}

function store(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // e.g. blocked storage in a private context
  }
}

function readEnvelope<T>(key: string): Envelope<T> | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(key);
    return raw ? (JSON.parse(raw) as Envelope<T>) : null;
  } catch {
    return null;
  }
}

/** Fresh cached value (within `ttlMs`), or null. */
export function readFresh<T>(key: string, ttlMs: number): T | null {
  const env = readEnvelope<T>(key);
  if (env && Date.now() - env.timestamp < ttlMs) return env.data;
  return null;
}

/** Any cached value regardless of age — for offline/error fallback. */
export function readStale<T>(key: string): T | null {
  return readEnvelope<T>(key)?.data ?? null;
}

export function write<T>(key: string, data: T): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(key, JSON.stringify({ timestamp: Date.now(), data } satisfies Envelope<T>));
  } catch {
    // Quota exceeded — ignore; the network value was already returned.
  }
}
