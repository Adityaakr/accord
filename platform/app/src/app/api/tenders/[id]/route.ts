// One job with its bids (prices stay null until revealed) and, once linked, the Accord agreement's state.
import { readPreflight, withReadCors } from "@/server/cors";
import { RelayError, boardId, dealOf, getJob, parseJobId } from "@/server/tender";
import { readAllowed } from "@/server/tenderroute";
import { winnerSetup } from "@/server/tenderwork";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!readAllowed(req)) return withReadCors(Response.json({ error: "too many requests" }, { status: 429 }));
  try {
    const id = parseJobId((await ctx.params).id);
    const job = await getJob(id);
    if (!job) return withReadCors(Response.json({ error: `no job ${id}` }, { status: 404 }));
    const deal = job.agreement ? await dealOf(job.agreement) : null;
    const winner = job.winner ? await winnerSetup(id) : null;
    return withReadCors(Response.json({ board: boardId(), now: Date.now(), job, deal, winner }, { headers: { "cache-control": "no-store" } }));
  } catch (e) {
    const status = e instanceof RelayError ? e.status : 502;
    return withReadCors(Response.json({ error: (e as Error).message }, { status }));
  }
}
export function OPTIONS() {
  return readPreflight();
}
