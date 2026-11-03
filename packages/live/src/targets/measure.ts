// `make measure` (PROGRESS 5.4): gas burned by each call of a full agreement, and the agreement account's storage,
// from real transactions. The runtime is the same on a local node and testnet; only the gas price differs.

import { formatNear, TGAS, type TxResult } from "@accord/sdk";
import {
  approveBoth, authorise, client, create, deliverAndAccept, fundTotal, installAgent, negotiate, PRESETS, say, sealBoth,
} from "../flow.js";
import type { World } from "../world.js";

export async function run(w: World): Promise<void> {
  const rows: [string, TxResult | bigint][] = [];
  const tgas = (g: bigint) => `${(Number(g) / Number(TGAS)).toFixed(1)} TGas`;
  const id = await create(w, "procurement", "Gas and storage");
  say(`accord measure · ${id}${w.suffix}`);
  const storage = async () => (await w.reader.chain.account(id)).storage_usage;
  const created = await storage();
  const sealed = await sealBoth(w, id, PRESETS.procurement);
  void sealed;
  const deal = w.reader.agreement(id);
  const start = await client(w, "keeper", id).startNegotiation();
  rows.push(["start_negotiation", start]);
  await negotiate(w, id);
  const afterTerms = await storage();
  const a = await deal.get();
  rows.push(["approve_terms (first)", await client(w, "buyer", id).approveTerms(a.terms_hash!)]);
  rows.push(["approve_terms (second, starts)", await client(w, "vendor", id).approveTerms(a.terms_hash!)]);
  await approveBoth(w, id);
  rows.push(["ft_transfer_call fund", (await fundTotal(w, id)).tx]);
  await authorise(w, id, w.principals.recipient.account);
  const agent = await installAgent(w, id);
  rows.push(["install_agent_key", agent.tx]);
  await deliverAndAccept(w, id, 1);
  const refused = await agent.deal.pay({ item: 2, amount: "12000000", recipient: w.attacker });
  rows.push(["act (refused)", refused.gasBurnt ?? 0n]);
  const paid = await agent.deal.pay({ item: 1, amount: "12000000", recipient: w.principals.recipient.account });
  rows.push(["act (pays, with callback)", paid.gasBurnt ?? 0n]);
  rows.push(["revoke_agent", await client(w, "buyer", id).revokeAgent()]);
  const before = await storage();
  rows.push(["mutual_close (buyer)", await client(w, "buyer", id).mutualClose()]);
  rows.push(["mutual_close (vendor, settles)", await client(w, "vendor", id).mutualClose()]);
  const settled = await storage();

  for (const [name, r] of rows) {
    const g = typeof r === "bigint" ? r : r.gasBurnt;
    say(`  ${name.padEnd(32)} ${tgas(g).padStart(10)}`);
  }
  const b = await deal.budget();
  say(`  storage   created ${created} B · with terms ${afterTerms} B · executing ${before} B · settled ${settled} B`);
  say(`  budget    stake ${formatNear(b.storage_stake)} NEAR · liquid ${formatNear(b.liquid)} NEAR`);
}
