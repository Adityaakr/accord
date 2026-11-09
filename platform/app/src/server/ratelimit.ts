// A small in-memory limiter for routes that spend the relayer's gas. Per process; enough for testnet.
import "server-only";
import { fromThisSite } from "./origin";

export { allow, takeAll, remaining, type Limit } from "./limiter";
export { clientIp } from "./clientip";

/** Same-origin JSON only, like the app's other write routes. */
export function sameOriginJson(req: Request): string | null {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return "JSON only";
  if (!fromThisSite(req)) return "cross-origin request";
  return null;
}
