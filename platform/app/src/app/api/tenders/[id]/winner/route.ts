// POST: the winning key names its approver and payee (both keys it holds; the payee signs too). The app keeps them so
// the buyer can open the agreement with one button, registers the payee on the labelled demo domain, and funds the
// three accounts once from the faucet. GET: what the winner named, or null.
import { readPreflight, withReadCors } from "@/server/cors";
import { RelayError, parseJobId } from "@/server/tender";
import { readAllowed, relayRoute } from "@/server/tenderroute";
import { registerWinner, winnerSetup } from "@/server/tenderwork";

export const dynamic = "force-dynamic";

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return relayRoute(req, ctx.params, "winner", 20, (id, body) => registerWinner(id, (body ?? {}) as Record<string, unknown>));
}
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!readAllowed(req)) return withReadCors(Response.json({ error: "too many requests" }, { status: 429 }));
  try {
    const id = parseJobId((await ctx.params).id);
    return withReadCors(Response.json({ job: id, setup: await winnerSetup(id) }, { headers: { "cache-control": "no-store" } }));
  } catch (e) {
    return withReadCors(Response.json({ error: (e as Error).message }, { status: e instanceof RelayError ? e.status : 502 }));
  }
}
export function OPTIONS() {
  return readPreflight();
}
