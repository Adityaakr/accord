// The app is served under a path prefix (default /app) so it can sit behind the website at <site>/app.
// Next's basePath covers <Link>, the router and redirect(); this covers the rest: raw fetches, plain anchors, downloads.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/app";

/** Prefix an app-absolute path ("/api/…", "/agreements/…") with the base path; leaves full URLs alone. */
export function withBase(path: string): string {
  if (!BASE_PATH || !path.startsWith("/") || path.startsWith("//")) return path;
  if (path === BASE_PATH || path.startsWith(BASE_PATH + "/")) return path;
  return BASE_PATH + path;
}
