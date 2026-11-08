// A small in-memory limiter for routes that spend the relayer's gas. Per process; enough for testnet.
import "server-only";

const hits = new Map<string, number[]>();

/** True if `key` may make another call: at most `max` calls in the last `windowMs`. */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(key, recent); return false; }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Same-origin JSON only, like the app's other write routes. */
export function sameOriginJson(req: Request): string | null {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return "JSON only";
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return "cross-origin request";
  return null;
}

/** Gives back the last call counted for `key`, for a call that failed before it spent anything. */
export function forget(key: string): void {
  const recent = hits.get(key);
  if (recent?.length) recent.pop();
}
