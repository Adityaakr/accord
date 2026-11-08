// `make revoke` (PROGRESS 3.6): the buyer's kill switch. The key is deleted in the same transaction; the network
// rejects the agent's next call before it reaches the contract; a new key resumes payments.

import { deliverAndAccept, executingProcurement, header, installAgent, line, usdc } from "../flow.js";
import type { World } from "../world.js";
import { formatNear, type AccessKeyEntry } from "@accord/sdk";

function describe(k: AccessKeyEntry): string {
  const p = k.access_key.permission;
  if (p === "FullAccess") return `${k.public_key} · FullAccess`;
  const allowance = p.FunctionCall.allowance ? `${formatNear(p.FunctionCall.allowance)} NEAR` : "unlimited";
  return `${k.public_key} · FunctionCall · receiver ${p.FunctionCall.receiver_id} · methods [${p.FunctionCall.method_names.join(", ")}] · allowance ${allowance}`;
}

export async function run(w: World): Promise<void> {
  const ready = await executingProcurement(w, "Liquidity reporting integration");
  const { id, agent } = ready;
  await deliverAndAccept(w, id, 1);
  await deliverAndAccept(w, id, 2);
  header("revoke", id, "", w);
  let ok = true;
  // pay each item at its negotiated amount: the terms differ from run to run
  const terms = (await w.reader.agreement(id).terms())!;
  const item1 = terms.items[0]!;
  const item2 = terms.items[1] ?? item1;

  const before = await w.reader.chain.accessKeys(id);
  line("before", `${before.length} key · ${before.map(describe).join(" | ")}`);
  const tx = await w.as("buyer").agreement(id).revokeAgent();
  line("revoke", `buyer ${w.principals.buyer.account} · tx ${tx.txHash} · revoke_agent → DeleteKey ${agent.publicKey} (final)`);

  const after = await w.reader.chain.accessKeys(id);
  let rejected = "";
  try {
    await agent.deal.pay({ item: item1.id ?? 1, amount: item1.amount, recipient: ready.recipient });
    rejected = "went through";
  } catch (e) {
    rejected = /AccessKeyDoesNotExist|does not exist|AccessKeyNotFound/i.test((e as Error).message)
      ? "AccessKeyDoesNotExist (rejected by the network, no receipt)"
      : (e as Error).message.slice(0, 120);
  }
  ok &&= after.length === 0 && rejected.startsWith("AccessKeyDoesNotExist");
  line("after", `${after.length} keys · agent call: ${rejected}`);

  const fresh = await installAgent(w, id);
  const keys = await w.reader.chain.accessKeys(id);
  const added = keys.find((k) => k.public_key === fresh.publicKey);
  const p = added?.access_key.permission;
  const allowance = p && p !== "FullAccess" && p.FunctionCall.allowance ? `${formatNear(p.FunctionCall.allowance)} NEAR` : "?";
  line("install", `buyer · tx ${fresh.tx.txHash} · AddKey ${fresh.publicKey} · FunctionCall [act] · allowance ${allowance}`);

  const r = await fresh.deal.pay({ item: item2.id ?? 2, amount: item2.amount, recipient: ready.recipient });
  ok &&= r.status === "sent";
  line("resume", `agent pays item 2 · ${r.status === "sent" ? "payment_sent" : r.code ?? r.status} ${usdc(item2.amount)} → ${ready.recipient} · tx ${r.txHash}`);
  if (!ok) process.exitCode = 1;
}
