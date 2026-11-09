// Pure (no server-only) so it is testable; ratelimit.ts re-exports it.

/**
 * The caller's IP for per-IP limits. The site's proxy (apps/web/scripts/serve.mjs) sets `x-accord-client-ip` from
 * what Railway's edge reported (its `X-Real-IP`, else the rightmost X-Forwarded-For entry the proxy received, else
 * its own socket peer), overwriting anything the visitor sent. Without it, the rightmost X-Forwarded-For entry is the
 * one the nearest proxy appended; the leftmost is whatever the client chose to send. Limit: a caller who reaches the
 * app's own origin directly, not through the site, can set `x-accord-client-ip` itself.
 */
export function clientIp(req: Request): string {
  const trusted = req.headers.get("x-accord-client-ip")?.trim();
  if (trusted) return trusted;
  const xff = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff[xff.length - 1] || "local";
}
