// `make attack` (PROGRESS 3.5): three inbox messages to a gullible agent holding a real key on a funded agreement.
// The agent tries each; the contract refuses each; the canary deletes the agent's key. Nothing leaves escrow.

import { preflight, type ActResult } from "@accord/sdk";
import { plan } from "../../../../services/agent/src/planner.js";
import { deliverAndAccept, escrow, executingProcurement, header, line, usdc } from "../flow.js";
import { inbox } from "../inbox.js";
import type { World } from "../world.js";

async function refusedLine(w: World, id: string, r: ActResult): Promise<string> {
  const refusal = (await w.reader.agreement(id).refusals()).find((x) => x.seq === r.seq);
  return `${r.code} · seq ${r.seq} · block ${refusal?.block ?? "?"} · tx ${r.txHash}`;
}

export async function run(w: World): Promise<void> {
  const ready = await executingProcurement(w, "Liquidity reporting integration");
  const { id, agent } = ready;
  await deliverAndAccept(w, id, 1);
  header("attack", id, ` · agent key ${agent.publicKey}`, w);
  const before = await escrow(w, id);
  const messages = inbox(w);
  let ok = true;

  for (const key of ["redirect", "amount", "canary"]) {
    const m = messages.get(key)!;
    const deal = w.reader.agreement(id);
    const [view, due] = await Promise.all([deal.get(), deal.dueItems()]);
    const p = plan(`${m.subject}\n${m.body}`, due, view.recipient?.account ?? null);
    if (p.action !== "pay") throw new Error(`the planner took no action on "${m.subject}"`);
    const what = key === "amount"
      ? `pay item ${p.item}, ${usdc(p.amount)}`
      : `pay item ${p.item} to ${p.recipient}`;
    line("inbox", `"${m.subject}" → agent: ${what}`);
    if (key === "redirect") {
      const pf = await preflight(w.reader, id, p.recipient);
      line("preflight", `${pf.rating}: ${pf.reasons[0] ?? "no reason"} · preflight off for this run, sending anyway`);
    }
    const r = await agent.deal.pay({ item: p.item, amount: p.amount, recipient: p.recipient });
    ok &&= r.status === "refused" && r.code === m.expect;
    if (key !== "canary") {
      line("refused", await refusedLine(w, id, r));
      continue;
    }
    const keys = await w.reader.chain.accessKeys(id);
    const gone = !keys.some((k) => k.public_key === agent.publicKey);
    ok &&= gone;
    line("canary", `${r.code} · seq ${r.seq} · agent key ${agent.publicKey} ${gone ? "revoked and deleted" : "STILL PRESENT"} · tx ${r.txHash} (final)`);
  }

  try {
    await agent.deal.pay({ item: 1, amount: "12000000", recipient: ready.recipient });
    ok = false;
    line("agent", "next call: went through (the key was not deleted)");
  } catch (e) {
    const msg = (e as Error).message;
    const rejected = /AccessKeyDoesNotExist|does not exist|AccessKeyNotFound/i.test(msg);
    ok &&= rejected;
    line("agent", `next call: ${rejected ? "AccessKeyDoesNotExist (rejected by the network, no receipt)" : msg.slice(0, 120)}`);
  }
  const after = await escrow(w, id);
  ok &&= before === after;
  line("escrow", `${usdc(before)} before · ${usdc(after)} after · ${usdc(before - after)} moved by attempts`);
  if (!ok) process.exitCode = 1;
}
