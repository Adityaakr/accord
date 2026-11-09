// POST /api/demo-agent {agreement, action}: the demo agent run by Accord for test rooms opened against the demo vendor.
//   "key"    returns the public key the buyer installs (install_agent_key, signed in the buyer's wallet).
//   "pay"    pays the first eligible item once, to the active recipient, signed as the agreement with that key.
//   "attack" asks the agent to pay a new account instead; the contract refuses it (ERR_PAYEE_MISMATCH) on the record.
// The agent signs act itself with the agreement's function-call key; nothing is relayed. Revoke stays the buyer's.
// "pay" and "attack" need the session of the room's buyer (demoguard.ts): five refusals revoke the key, so nobody
// else may make the agent act in someone's room.
import { NextResponse } from "next/server";
import { AccordError } from "@accord/sdk";
import { allow, sameOriginJson } from "@/server/ratelimit";
import { demoAgent, demoAgentKey, demoConfig, demoReady, isDemoRoom } from "@/server/demo";
import { accord, isConfiguredAgreement } from "@/server/accord";
import { sessionAccount } from "@/server/session";
import { agentGuard } from "@/server/demoguard";

export const dynamic = "force-dynamic";
// the act outcome without its bigint gas figure, which JSON cannot carry
const plain = (r: { status: string; txHash?: string; code?: string; reasons?: string[] }) =>
  ({ status: r.status, txHash: r.txHash ?? null, code: r.code ?? null, reasons: r.reasons ?? null });
const busy = new Set<string>();

export async function POST(req: Request) {
  const bad = sameOriginJson(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 415 });
  if (!demoReady().agent) return NextResponse.json({ error: "the demo agent is not configured on this server" }, { status: 503 });
  const { agreement, action } = (await req.json().catch(() => ({}))) as { agreement?: string; action?: string };
  if (typeof agreement !== "string" || !isConfiguredAgreement(agreement)) {
    return NextResponse.json({ error: "not an agreement of this factory" }, { status: 400 });
  }
  if (action !== "key" && action !== "pay" && action !== "attack") return NextResponse.json({ error: "action is key, pay or attack" }, { status: 400 });
  const a = await accord().agreement(agreement).get().catch(() => null);
  if (!a) return NextResponse.json({ error: "no such agreement" }, { status: 404 });
  if (!isDemoRoom(a)) return NextResponse.json({ error: "the demo agent only runs in rooms opened against Accord's demo vendor" }, { status: 403 });
  const refused = agentGuard(action, await sessionAccount(), a.buyer);
  if (refused) return NextResponse.json({ error: refused.error, code: refused.code }, { status: refused.status });
  const key = demoAgentKey(agreement, a.revoked_keys);
  if (action === "key") return NextResponse.json({ publicKey: key.publicKey, installed: a.agent_key === key.publicKey });

  if (a.agent_key !== key.publicKey) {
    const why = a.agent_key ? "the installed agent key is not the demo agent's"
      : a.revoked_keys > 0 ? "the buyer revoked the agent's key: the agent can no longer act in this room"
      : "install the demo agent's key first";
    return NextResponse.json({ error: why }, { status: 409 });
  }
  if (!allow(`agent:${agreement}`, 6, 3600_000)) return NextResponse.json({ error: "the demo agent has acted enough in this room for an hour" }, { status: 429 });
  if (busy.has(agreement)) return NextResponse.json({ error: "the demo agent is already acting in this room" }, { status: 409 });
  busy.add(agreement);
  try {
    const deal = demoAgent(agreement, a.revoked_keys);
    const due = (await deal.dueItems()).find((d) => d.eligible_at !== null && d.eligible_at <= a.now) ?? null;
    if (action === "pay") {
      if (!due) return NextResponse.json({ error: "no item is eligible yet: the vendor delivers, you accept, then the agent pays" }, { status: 409 });
      if (!allow(`agent:pay:${agreement}:${due.item}`, 1, 24 * 3600_000)) return NextResponse.json({ error: `the demo agent already paid item ${due.item}` }, { status: 409 });
      const r = await deal.pay({ item: due.item, amount: due.amount, recipient: due.recipient ?? a.recipient?.account ?? "", memo: "demo agent run by Accord" });
      return NextResponse.json({ action, item: due.item, amount: due.amount, recipient: due.recipient, result: plain(r) });
    }
    // The redirect attempt: the same item (or the first one) to an account the agreement never approved.
    const items = await deal.items();
    const item = due?.item ?? items.find((it) => it.status !== "Paid")?.id ?? items[0]?.id ?? 0;
    const amount = due?.amount ?? items.find((it) => it.id === item)?.amount ?? "1";
    const r = await deal.pay({ item, amount, recipient: demoConfig().stranger, memo: "pay the new account instead" });
    return NextResponse.json({ action, item, amount, recipient: demoConfig().stranger, result: plain(r) });
  } catch (e) {
    const msg = e instanceof AccordError ? `${e.code ?? "failed"} · tx ${e.tx.txHash}` : e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    busy.delete(agreement);
  }
}
