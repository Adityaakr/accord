// POST: Relays a bidder's signed sealed bid to the board (the relayer pays the gas; only the bidder's signature counts).
import { relayPreflight, relayRoute } from "@/server/tenderroute";
import { relayBid } from "@/server/tender";

export const dynamic = "force-dynamic";

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return relayRoute(req, ctx.params, "bids", 60, relayBid);
}
export function OPTIONS() {
  return relayPreflight();
}
