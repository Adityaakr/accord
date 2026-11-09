// GET /api/agreements/<id>/activity: the room's timeline (every Accord event the agreement emitted, newest first, from
// its own transactions; server/activity.ts) and the demo agent's transcript inputs: what it was asked and meant to do
// (the store's agent_actions) and, for the public /try room, the inbox messages it read. Results come from the chain;
// the stored records only add the inputs the chain cannot show. Read-only, cached server-side, limited per client.
import { NextResponse } from "next/server";
import { accord, isConfiguredAgreement } from "@/server/accord";
import { roomActivity } from "@/server/activity";
import { agentActions, recentMessages } from "@/server/store";
import { allow, clientIp } from "@/server/ratelimit";
import { chainErrorResponse } from "@/server/rpcerror";
import type { TranscriptMessage } from "@/lib/transcript";

export const dynamic = "force-dynamic";

/** The literal planner's plan as the agent stored it, when it planned a payment. */
function planned(p: unknown): TranscriptMessage["intent"] {
  const x = p as { action?: unknown; item?: unknown; amount?: unknown; recipient?: unknown } | null;
  if (!x || x.action !== "pay" || typeof x.item !== "number" || typeof x.amount !== "string" || typeof x.recipient !== "string") return null;
  return { item: x.item, amount: x.amount, recipient: x.recipient };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isConfiguredAgreement(id)) return NextResponse.json({ error: "not an agreement of this factory" }, { status: 400 });
  if (!allow(`activity:${clientIp(req)}`, 120, 60_000)) return NextResponse.json({ error: "too many requests; wait a minute" }, { status: 429, headers: { "retry-after": "20" } });
  try {
    const a = await accord().agreement(id).get();
    const [activity, records, inbox] = await Promise.all([
      roomActivity({ agreement: id, buyer: a.buyer, vendor: a.vendor, authority: a.vendor_authority, keeper: a.keeper }),
      agentActions.list(id, 50).catch(() => []),
      recentMessages(id, 20).catch(() => []),
    ]);
    const messages: TranscriptMessage[] = inbox.map((m) => ({
      id: m.id, at: Math.floor(new Date(m.received_at).getTime() / 1000), sender: m.sender, subject: m.subject, body: m.body,
      outcome: m.outcome, tx: m.tx_hash, intent: planned(m.agent_action),
    }));
    return NextResponse.json(
      { entries: activity?.entries ?? null, complete: activity?.complete ?? false, records, messages, now: a.now },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return chainErrorResponse(e);
  }
}
