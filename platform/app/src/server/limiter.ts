// The in-memory sliding-window limiter behind server/ratelimit.ts, without "server-only" so it is unit-tested.
// Per process; enough for testnet.

const hits = new Map<string, number[]>();

export interface Limit { key: string; max: number; windowMs: number }

const recent = (l: Limit, now: number) => (hits.get(l.key) ?? []).filter((t) => now - t < l.windowMs);

/** True if `key` may make another call: at most `max` calls in the last `windowMs`. Counts the call when true. */
export function allow(key: string, max: number, windowMs: number): boolean {
  return takeAll([{ key, max, windowMs }]) === null;
}

/**
 * Takes one from every limit, or from none: returns the first limit that is full (and counts nothing), or null when
 * all had room and each now counts this call. So a refusal by one allowance never spends another.
 */
export function takeAll(limits: Limit[], now = Date.now()): Limit | null {
  for (const l of limits) {
    const r = recent(l, now);
    hits.set(l.key, r);
    if (r.length >= l.max) return l;
  }
  for (const l of limits) hits.get(l.key)!.push(now);
  return null;
}

/** Calls left under `l` right now (nothing is counted). */
export function remaining(l: Limit, now = Date.now()): number {
  return Math.max(0, l.max - recent(l, now).length);
}

/** Tests only: forget every count. */
export function resetLimits() {
  hits.clear();
}
