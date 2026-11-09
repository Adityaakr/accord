// `make dispute-close` (and `make dispute-close-usdc` on the Circle USDC factory): one new procurement agreement
// taken through a dispute and an early close, each step printed with its transaction and the balances before and
// after. Item 1 is delivered, accepted and paid; a redirect is refused; item 2 is delivered, disputed by the buyer,
// delivered again by the vendor, accepted and paid; item 3 is delivered and disputed and left so; the agent's attempt
// to pay it is refused; both parties call `mutual_close`, which settles and refunds the unspent escrow (item 3) to
// the buyer; the buyer withdraws the room's spare NEAR. Every call is the SDK's, signed by the principals in `.env`.

import { DEMO_PARAMS, demoDelivery, demoDeliveryPath } from "@accord/sdk";
import {
  approveBoth, authorise, client, escrow, fundTotal, header, installAgent, line, negotiate, procurementPreset,
  sealBoth, usdc,
} from "../flow.js";
import type { World } from "../world.js";

export async function run(w: World): Promise<void> {
  const link = (tx?: string) => (tx ? `${w.explorer ?? ""}/txns/${tx}` : "no transaction");
  const bal = async (account: string) => BigInt(await w.reader.chain.view<string>(w.token, "ft_balance_of", { account_id: account }));
  const buyer = w.principals.buyer.account;
  const recipient = w.principals.recipient.account;
  let ok = true;

  const before = { buyer: await bal(buyer), recipient: await bal(recipient) };
  const deposit = BigInt((await w.reader.config()).create_deposit);
  await w.gas(buyer, Number(deposit / 10n ** 24n) + 6);
  const created = await w.as("buyer").createAgreement({
    kind: "procurement", title: "Liquidity reporting integration", vendor: w.principals.vendor.account,
    vendor_authority: w.principals.authority.account, canaries: w.canaries, params: DEMO_PARAMS,
  });
  const id = created.agreement;
  header("dispute-close", id, ` · token ${w.token}`, w);
  line("before", `buyer ${buyer} ${usdc(before.buyer)} · recipient ${recipient} ${usdc(before.recipient)}`);
  line("create", `buyer · create_agreement · ${link(created.tx.txHash)}`);

  await sealBoth(w, id, procurementPreset(w));
  const a = await negotiate(w, id);
  if (a.state !== "Attested") throw new Error(`${id}: ${a.state} after the negotiation`);
  const terms = (await w.reader.agreement(id).terms())!;
  if (terms.items.length < 3) throw new Error(`${id}: ${terms.items.length} items; this flow needs 3`);
  line("terms", `${usdc(terms.total)} · ${terms.items.map((i, n) => `item ${i.id ?? n + 1} ${usdc(i.amount)}`).join(" · ")}`);
  await approveBoth(w, id);
  const funded = await fundTotal(w, id);
  line("fund", `buyer · ${usdc(funded.total)} escrowed · ${link(funded.tx.txHash)}`);
  const { version, rating } = await authorise(w, id, recipient);
  line("recipient", `${recipient} · version ${version} · proven by the Payee job · rating ${rating} · active`);
  const agent = await installAgent(w, id);
  line("agent", `buyer · install_agent_key ${agent.publicKey} · ${link(agent.tx.txHash)}`);

  const [i1, i2, i3] = terms.items.map((it, n) => ({ id: it.id ?? n + 1, amount: it.amount }));
  const vendor = client(w, "vendor", id);
  const buyerDeal = client(w, "buyer", id);
  const deliver = async (item: number) => {
    const ev = demoDelivery(id, item);
    return vendor.submitDelivery(item, ev.hash, `https://${w.domain}${demoDeliveryPath(id, item)}`);
  };
  const status = async (item: number) => (await w.reader.agreement(id).items()).find((x) => x.id === item)?.status;

  // Item 1: delivered, accepted, paid.
  line("deliver", `vendor · item ${i1!.id} · ${link((await deliver(i1!.id)).txHash)}`);
  line("accept", `buyer · item ${i1!.id} · ${link((await buyerDeal.acceptDelivery(i1!.id)).txHash)}`);
  const p1 = await agent.deal.pay({ item: i1!.id, amount: i1!.amount, recipient });
  ok &&= p1.status === "sent";
  line("pay", `agent · item ${i1!.id} ${usdc(i1!.amount)} → ${recipient} · ${p1.status} · ${link(p1.txHash)}`);
  const red = await agent.deal.pay({ item: i2!.id, amount: i2!.amount, recipient: w.attacker });
  ok &&= red.status === "refused" && red.code === "ERR_PAYEE_MISMATCH";
  line("redirect", `agent · item ${i2!.id} → ${w.attacker} · ${red.code ?? red.status} · ${link(red.txHash)}`);

  // Item 2: delivered, disputed, delivered again, accepted, paid.
  line("deliver", `vendor · item ${i2!.id} · ${link((await deliver(i2!.id)).txHash)}`);
  const d2 = await buyerDeal.disputeDelivery(i2!.id, "Dashboard panels missing the depth chart");
  line("dispute", `buyer · item ${i2!.id} · ${await status(i2!.id)} · ${link(d2.txHash)}`);
  const early = await agent.deal.pay({ item: i2!.id, amount: i2!.amount, recipient });
  ok &&= early.status === "refused";
  line("refused", `agent · disputed item ${i2!.id} · ${early.code ?? early.status} · ${link(early.txHash)}`);
  line("redeliver", `vendor · item ${i2!.id} · ${link((await deliver(i2!.id)).txHash)} · ${await status(i2!.id)}`);
  line("accept", `buyer · item ${i2!.id} · ${link((await buyerDeal.acceptDelivery(i2!.id)).txHash)}`);
  const p2 = await agent.deal.pay({ item: i2!.id, amount: i2!.amount, recipient });
  ok &&= p2.status === "sent";
  line("pay", `agent · item ${i2!.id} ${usdc(i2!.amount)} → ${recipient} · ${p2.status} · ${link(p2.txHash)}`);

  // Item 3: delivered, disputed, left disputed; the close refunds it.
  line("deliver", `vendor · item ${i3!.id} · ${link((await deliver(i3!.id)).txHash)}`);
  const d3 = await buyerDeal.disputeDelivery(i3!.id, "Handover not done; both parties end the agreement early");
  line("dispute", `buyer · item ${i3!.id} · ${await status(i3!.id)} · ${link(d3.txHash)}`);
  const p3 = await agent.deal.pay({ item: i3!.id, amount: i3!.amount, recipient });
  ok &&= p3.status === "refused";
  line("refused", `agent · disputed item ${i3!.id} · ${p3.code ?? p3.status} · ${link(p3.txHash)}`);

  const held = await escrow(w, id);
  line("escrow", `${usdc(held)} held by ${id} before the close`);
  const mb = await buyerDeal.mutualClose();
  line("close", `buyer · mutual_close · ${link(mb.txHash)}`);
  const mv = await vendor.mutualClose();
  line("close", `vendor · mutual_close · settles and refunds · ${link(mv.txHash)}`);
  const after = await w.reader.agreement(id).get();
  const leftOn = await escrow(w, id);
  ok &&= after.state === "Settled" && leftOn === 0n && BigInt(after.refunded) === BigInt(i3!.amount);
  line("settled", `${after.state} · paid ${usdc(after.paid)} · refunded ${usdc(after.refunded)} · ${usdc(leftOn)} left on ${id} · item ${i3!.id} ${await status(i3!.id)}`);
  const keys = after.agent_key ? "agent key still set" : "agent key removed at settlement";
  line("agent", keys);
  try {
    const wn = await buyerDeal.withdrawNear();
    line("withdraw", `buyer · withdraw_near · ${link(wn.txHash)}`);
  } catch (e) {
    line("withdraw", `not done: ${(e as Error).message.slice(0, 120)}`);
  }

  const end = { buyer: await bal(buyer), recipient: await bal(recipient) };
  line("after", `buyer ${usdc(end.buyer)} (spent ${usdc(before.buyer - end.buyer)}) · recipient ${usdc(end.recipient)} (+${usdc(end.recipient - before.recipient)})`);
  line("verify", `make verify DEAL=${id}`);
  if (!ok) process.exitCode = 1;
}
