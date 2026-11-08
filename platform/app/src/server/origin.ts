// Which hosts count as "this site" for the app's same-origin write checks.
//
// The app is served behind the website (<site>/app is proxied to the app service). Railway's edge rewrites
// x-forwarded-host to the app service's own host on the way in, so the visitor's host would be lost and every
// browser write would look cross-origin. The website's proxy therefore also sends the visitor's host in
// x-accord-site-host, which the edge leaves alone. A page on another site cannot set that header on a
// cross-origin request without a CORS preflight, which the app never approves, so trusting it keeps CSRF out.
// ACCORD_PUBLIC_HOSTS (comma-separated) adds the site's public hosts explicitly.

const DEFAULT_PUBLIC_HOSTS = ["accordweb-production.up.railway.app", "useaccord.tech", "www.useaccord.tech"];

export function siteHosts(req: Request): Set<string> {
  const hosts = new Set<string>();
  for (const h of [req.headers.get("x-accord-site-host"), req.headers.get("x-forwarded-host"), req.headers.get("host")]) {
    if (h) hosts.add(h.split(",")[0]!.trim().toLowerCase());
  }
  const extra = (process.env.ACCORD_PUBLIC_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  for (const h of [...DEFAULT_PUBLIC_HOSTS, ...extra]) hosts.add(h);
  return hosts;
}

/** True when the request has no Origin (same-origin GET/forms) or its Origin is one of this site's hosts. */
export function fromThisSite(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return siteHosts(req).has(new URL(origin).host.toLowerCase());
  } catch {
    return false;
  }
}
