// POST: A NEAR AI draft of one item's deliverable for the winner of a linked job, signed by the winning key.
import { relayPreflight, relayRoute } from "@/server/tenderroute";
import { draftItem } from "@/server/tenderdraft";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return relayRoute(req, ctx.params, "draft", 30, (id, body) => draftItem(id, body as Record<string, unknown>));
}
export function OPTIONS() {
  return relayPreflight();
}
