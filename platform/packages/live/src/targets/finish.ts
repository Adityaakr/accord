// `make finish DEAL=<agreement>`: one existing agreement taken the whole way on one set of principals, each step
// printed with its transaction: the Sealed Table's negotiation (if not done), both approvals, funding, the recipient
// proven by the Payee job, the agent's key, a delivery, a payment, a redirected payment refused, the kill switch, and
// the agent's next call rejected by the network. Used to run the full flow on testnet without spending a negotiation
// per step (each other target creates its own agreement).

import { approveBoth, authorise, deliverAndAccept, escrow, fundTotal, header, installAgent, line, negotiate, usdc } from "../flow.js";
import type { World } from "../world.js";

export async function run(w: World): Promise<void> {
  const id = process.env.DEAL ?? "";
  if (!id) throw new Error("usage: make finish DEAL=<agreement account>");
  header("finish", id, "", w);
  const link = (tx?: string) => (tx ? `${w.explorer}/txns/${tx}` : "");
  let ok = true;

  let a = await w.reader.agreement(id).get();
  if (a.state === "Sealed") {
    a = await negotiate(w, id);
    line("negotiate", `${a.state}`);
  }
  if (a.state !== "Attested" && a.state !== "Executing") throw new Error(`${id}: ${a.state}, not attested`);
  const terms = (await w.reader.agreement(id).terms())!;
  line("terms", `${usdc(terms.total)} · ${terms.items.length} items · ${a.terms_hash}`);

  if (a.state === "Attested") {
    await approveBoth(w, id);
    const { total, tx } = await fundTotal(w, id);
    line("funded", `${usdc(total)} · ${link(tx.txHash)}`);
  }
  a = await w.reader.agreement(id).get();
  line("state", `${a.state} · escrow ${usdc(await escrow(w, id))}`);

  if (!a.recipient) {
    const { version, rating } = await authorise(w, id, w.principals.recipient.account);
    const v = (await w.reader.agreement(id).recipients())[version - 1]!;
    line("recipient", `${w.principals.recipient.account} · proven on ${v.domain} by the Payee job · rating ${rating} · ${v.status}`);
  }

  const agent = await installAgent(w, id);
  line("agent", `key ${agent.publicKey} · FunctionCall [act] · ${link(agent.tx.txHash)}`);
  await deliverAndAccept(w, id, 1);
  const item1 = terms.items[0]!;
  const paid = await agent.deal.pay({ item: 1, amount: item1.amount, recipient: w.principals.recipient.account });
  ok &&= paid.status === "sent";
  line("paid", `item 1 · ${usdc(item1.amount)} → ${w.principals.recipient.account} · ${paid.status} · ${link(paid.txHash)}`);

  const item2 = terms.items[1] ?? item1;
  const attack = await agent.deal.pay({ item: item2.id ?? 2, amount: item2.amount, recipient: w.attacker });
  ok &&= attack.status === "refused" && attack.code === "ERR_PAYEE_MISMATCH";
  line("refused", `pay ${usdc(item2.amount)} → ${w.attacker} · ${attack.code ?? attack.status} · ${link(attack.txHash)}`);

  const rv = await w.as("buyer").agreement(id).revokeAgent();
  line("revoked", `buyer · revoke_agent · ${link(rv.txHash)}`);
  let after = "";
  try {
    await agent.deal.pay({ item: item2.id ?? 2, amount: item2.amount, recipient: w.principals.recipient.account });
    after = "went through";
  } catch (e) {
    after = /AccessKeyDoesNotExist|does not exist|AccessKeyNotFound/i.test((e as Error).message)
      ? "AccessKeyDoesNotExist (rejected by the network)"
      : (e as Error).message.slice(0, 120);
  }
  ok &&= after.startsWith("AccessKeyDoesNotExist");
  line("after", `agent's next call: ${after}`);
  line("verify", `make verify DEAL=${id}`);
  if (!ok) process.exitCode = 1;
}
