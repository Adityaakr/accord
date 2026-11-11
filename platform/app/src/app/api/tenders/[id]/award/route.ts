// POST: Asks the board to choose the winner once it allows it; the rule is on chain and open to anyone.
import { relayPreflight, relayRoute } from "@/server/tenderroute";
import { relayAward } from "@/server/tender";

export const dynamic = "force-dynamic";

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return relayRoute(req, ctx.params, "award", 30, (id) => relayAward(id));
}
export function OPTIONS() {
  return relayPreflight();
}
