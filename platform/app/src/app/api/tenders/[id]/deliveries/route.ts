// POST: the winning agent publishes the work it delivers for an item of the job's agreement, signed by its vendor key.
// The agreement records only the sha256; this copy is for the buyer to read before accepting it.
import { relayPreflight, relayRoute } from "@/server/tenderroute";
import { publishDelivery } from "@/server/tenderwork";
import { TENDER_DELIVERY_MAX } from "@accord/store";

export const dynamic = "force-dynamic";

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return relayRoute(req, ctx.params, "deliveries", 30, (id, body) => publishDelivery(id, (body ?? {}) as Record<string, unknown>), TENDER_DELIVERY_MAX * 2 + 2048);
}
export function OPTIONS() {
  return relayPreflight();
}
