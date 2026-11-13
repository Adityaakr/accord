// POST: Keeps a timelocked reveal for a bid already on the board, signed by the bid's key; the keeper reveals it later.
import { relayPreflight, relayRoute } from "@/server/tenderroute";
import { relayTimelock } from "@/server/tender";

export const dynamic = "force-dynamic";

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return relayRoute(req, ctx.params, "timelock", 60, relayTimelock, 8192);
}
export function OPTIONS() {
  return relayPreflight();
}
