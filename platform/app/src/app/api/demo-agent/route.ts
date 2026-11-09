// POST /api/demo-agent {agreement, action}: the demo agent run by Accord for test rooms opened against the demo vendor.
//   "key"    returns the public key the buyer installs (install_agent_key, signed in the buyer's wallet).
//   "pay"    pays the first eligible item once, to the active recipient, signed as the agreement with that key.
//   "attack" asks the agent to pay a new account instead; the contract refuses it (ERR_PAYEE_MISMATCH) on the record.
//   "tick"   the agent's own move: pays the first due item if it is payable and not already paid (server/demoagent.ts).
//            The room calls it while the buyer has it open, so an accepted delivery is paid without a click.
// Every act call is written to the agent's record (instruction and intent) before it is signed, for the transcript.
// The agent signs act itself with the agreement's function-call key; nothing is relayed. Revoke stays the buyer's.
// Allowances (server/agentlimit.ts): the buyer's "pay" and "attack" share 12 per room an hour; the agent's own payments
// have their own 30 an hour and one per due item; a tick that sends nothing counts against neither.
// "pay" and "attack" need the session of the room's buyer (demoguard.ts): five refusals revoke the key, so nobody
// else may make the agent act in someone's room.
import { NextResponse } from "next/server";
import { chainErrorResponse } from "@/server/rpcerror";
import { AccordError } from "@accord/sdk";
import { sameOriginJson } from "@/server/ratelimit";
import { allowTick, spendAgentAction } from "@/server/agentlimit";
import { demoAgent, demoAgentKey, demoConfig, demoReady, isDemoRoom } from "@/server/demo";
import { accord, isConfiguredAgreement } from "@/server/accord";
import { sessionAccount } from "@/server/session";
import { agentGuard } from "@/server/demoguard";
import { PAY_INSTRUCTION, agentBusy, agentTick, attackInstruction, recordedPay } from "@/server/demoagent";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bad = sameOriginJson(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 415 });
  if (!demoReady().agent) return NextResponse.json({ error: "the demo agent is not configured on this server" }, { status: 503 });
  const { agreement, action } = (await req.json().catch(() => ({}))) as { agreement?: string; action?: string };
  if (typeof agreement !== "string" || !isConfiguredAgreement(agreement)) {
    return NextResponse.json({ error: "not an agreement of this factory" }, { status: 400 });
  }
  if (action !== "key" && action !== "pay" && action !== "attack" && action !== "tick") return NextResponse.json({ error: "action is key, pay, attack or tick" }, { status: 400 });
  const a = await accord().agreement(agreement).get().catch(() => null);
  if (!a) return NextResponse.json({ error: "no such agreement" }, { status: 404 });
  if (!isDemoRoom(a)) return NextResponse.json({ error: "the demo agent only runs in rooms opened against Accord's demo vendor" }, { status: 403 });
  const refused = agentGuard(action, await sessionAccount(), a.buyer);
  if (refused) return NextResponse.json({ error: refused.error, code: refused.code }, { status: refused.status });
  const key = demoAgentKey(agreement, a.revoked_keys);
  if (action === "key") return NextResponse.json({ publicKey: key.publicKey, installed: a.agent_key === key.publicKey });
  if (action === "tick") {
    // a tick that sends nothing counts against no action allowance; only a loose read limit (server/agentlimit.ts)
    if (!allowTick(agreement)) return NextResponse.json({ action, paid: false, reason: "the agent looked recently; it looks again on the next change" });
    try {
      const r = await agentTick(agreement);
      return NextResponse.json("paid" in r ? { action, paid: true, ...r.paid } : { action, paid: false, reason: r.skipped });
    } catch (e) {
      if (e instanceof AccordError) return NextResponse.json({ error: `${e.code ?? "failed"} · tx ${e.tx.txHash}` }, { status: 502 });
      return chainErrorResponse(e);
    }
  }

  if (a.agent_key !== key.publicKey) {
    const why = a.agent_key ? "the installed agent key is not the demo agent's"
      : a.revoked_keys > 0 ? "the buyer revoked the agent's key: the agent can no longer act in this room"
      : "install the demo agent's key first";
    return NextResponse.json({ error: why }, { status: 409 });
  }
  if (agentBusy.has(agreement)) return NextResponse.json({ error: "the demo agent is already acting in this room" }, { status: 409 });
  agentBusy.add(agreement);
  try {
    const deal = demoAgent(agreement, a.revoked_keys);
    const due = (await deal.dueItems()).find((d) => d.eligible_at !== null && d.eligible_at <= a.now) ?? null;
    if (action === "pay") {
      if (!due) return NextResponse.json({ error: "no item is eligible yet: the vendor delivers, you accept, then the agent pays" }, { status: 409 });
      // the buyer's own allowance and the one-payment-per-item limit, counted only now that a call is about to be signed
      const no = spendAgentAction({ kind: "pay", agreement, item: due.item });
      if (no) return NextResponse.json({ error: no.error }, { status: no.status });
      const r = await recordedPay(a, "pay", PAY_INSTRUCTION, { item: due.item, amount: due.amount, recipient: due.recipient ?? a.recipient?.account ?? "" }, "demo agent run by Accord");
      return NextResponse.json({ action, item: due.item, amount: due.amount, recipient: due.recipient, result: r.result });
    }
    // The redirect attempt: the same item (or the first one) to an account the agreement never approved.
    const items = await deal.items();
    const item = due?.item ?? items.find((it) => it.status !== "Paid")?.id ?? items[0]?.id ?? 0;
    const amount = due?.amount ?? items.find((it) => it.id === item)?.amount ?? "1";
    const no = spendAgentAction({ kind: "attack", agreement });
    if (no) return NextResponse.json({ error: no.error }, { status: no.status });
    const r = await recordedPay(a, "attack", attackInstruction(), { item, amount, recipient: demoConfig().stranger }, "pay the new account instead");
    return NextResponse.json({ action, item, amount, recipient: demoConfig().stranger, result: r.result });
  } catch (e) {
    if (e instanceof AccordError) return NextResponse.json({ error: `${e.code ?? "failed"} · tx ${e.tx.txHash}` }, { status: 502 });
    return chainErrorResponse(e);
  } finally {
    agentBusy.delete(agreement);
  }
}
