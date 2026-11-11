// POST: Relays a reveal (price and salt) after the commit deadline; checked against the stored commitment first.
import { relayPreflight, relayRoute } from "@/server/tenderroute";
import { relayReveal } from "@/server/tender";

export const dynamic = "force-dynamic";

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return relayRoute(req, ctx.params, "reveal", 60, relayReveal);
}
export function OPTIONS() {
  return relayPreflight();
}
