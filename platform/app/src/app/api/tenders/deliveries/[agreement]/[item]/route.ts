// GET: the work a tender winner delivered for an item, as published with its vendor key. Served as plain text (never
// HTML, never rendered) with its sha256, which the agreement holds as the item's evidence hash.
import { deliveryOf } from "@/server/tenderwork";
import { readAllowed } from "@/server/tenderroute";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ agreement: string; item: string }> }) {
  if (!readAllowed(req)) return Response.json({ error: "too many requests" }, { status: 429 });
  const { agreement, item } = await ctx.params;
  if (!/^[a-z0-9._-]{2,64}$/.test(agreement) || !/^[1-9][0-9]?$/.test(item)) return Response.json({ error: "no such delivery" }, { status: 404 });
  const d = await deliveryOf(agreement, Number(item)).catch(() => null);
  if (!d) return Response.json({ error: "no such delivery" }, { status: 404 });
  // never serve a copy that differs from what the vendor recorded on chain
  if (d.matches === false) return Response.json({ error: "this hosted copy does not match the sha256 recorded on chain for the item" }, { status: 409 });
  return new Response(d.body, {
    headers: {
      "content-type": `${d.content_type === "application/json" ? "application/json" : "text/plain"}; charset=utf-8`,
      "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox",
      "x-accord-sha256": d.sha256, "x-accord-on-chain": d.matches === null ? "not delivered on chain yet" : "matches", "x-accord-vendor": d.bidder, "access-control-allow-origin": "*", "cache-control": "no-store",
    },
  });
}
