// The step targets (PROGRESS 3.4): approve, fund, payee, pay, exception, claim and payee-change. Each runs on its
// own new agreement, taken through the steps before it, and prints its own block.

import {
  activate, approveBoth, authorise, client, create, deliverAndAccept, escrow, executingProcurement, fundTotal,
  header, line, negotiate, PRESETS, sealBoth, sleep, usdc, waitFor,
} from "../flow.js";
import type { World } from "../world.js";

async function attested(w: World, title: string): Promise<string> {
  const id = await create(w, "procurement", title);
  await sealBoth(w, id, PRESETS.procurement);
  const a = await negotiate(w, id);
  if (a.state !== "Attested") throw new Error(`${id}: ${a.state} after the negotiation`);
  return id;
}

export async function approve(w: World): Promise<void> {
  const id = await attested(w, "Liquidity reporting integration");
  const a = await w.reader.agreement(id).get();
  header("approve", id, "", w);
  line("terms", `${a.terms_hash} · signed by the Sealed Table`);
  const b = await client(w, "buyer", id).approveTerms(a.terms_hash!);
  line("buyer", `${w.principals.buyer.account} · approve_terms · tx ${b.txHash}`);
  const v = await client(w, "vendor", id).approveTerms(a.terms_hash!);
  line("vendor", `${w.principals.vendor.account} · approve_terms · tx ${v.txHash}`);
  const after = await w.reader.agreement(id).get();
  line("state", `${after.state} · ends ${new Date((after.ends_at ?? 0) * 1000).toISOString()}`);
  if (after.state !== "Executing") process.exitCode = 1;
}

export async function fund(w: World): Promise<void> {
  const id = await attested(w, "Liquidity reporting integration");
  await approveBoth(w, id);
  header("fund", id, "", w);
  const { total, tx } = await fundTotal(w, id);
  line("transfer", `buyer ft_transfer_call ${usdc(total)} · msg fund · tx ${tx.txHash}`);
  const a = await w.reader.agreement(id).get();
  const held = await escrow(w, id);
  line("escrow", `funded ${usdc(a.funded)} · held by ${id} · ${usdc(held)} on the token`);
  if (BigInt(a.funded) !== total || held !== total) process.exitCode = 1;
}

export async function payee(w: World): Promise<void> {
  const id = await attested(w, "Liquidity reporting integration");
  await approveBoth(w, id);
  await fundTotal(w, id);
  header("payee", id, "", w);
  const account = w.principals.recipient.account;
  const { version, rating } = await authorise(w, id, account);
  const v = (await w.reader.agreement(id).recipients())[version - 1]!;
  line("proposed", `vendor · ${account} · domain ${v.domain} · version ${version}`);
  line("proof", `Payee job · https://${v.domain}/.well-known/accord.json · rating ${rating}${v.reasons.length ? ` · ${v.reasons.join("; ")}` : ""}`);
  line("approved", `authority ${w.principals.authority.account}`);
  line("accepted", `buyer ${w.principals.buyer.account}`);
  line("active", `${v.status} · payments go only to ${account}`);
  if (v.status !== "Active") process.exitCode = 1;
}

export async function pay(w: World): Promise<void> {
  const r = await executingProcurement(w, "Liquidity reporting integration");
  await deliverAndAccept(w, r.id, 1);
  header("pay", r.id, ` · agent key ${r.agent.publicKey}`, w);
  line("delivery", "item 1 submitted by the vendor · accepted by the buyer");
  const due = await w.reader.agreement(r.id).dueItems();
  line("due", due.map((d) => `item ${d.item} ${usdc(d.amount)}`).join(" · "));
  const res = await r.agent.deal.pay({ item: 1, amount: due[0]!.amount, recipient: r.recipient });
  line("paid", `${res.status === "sent" ? "payment_sent" : res.code ?? res.status} ${usdc(due[0]!.amount)} → ${r.recipient} · tx ${res.txHash}`);
  const receipts = await w.reader.agreement(r.id).receipts();
  line("receipt", `payment ${receipts[0]?.payment_id} · block ${receipts[0]?.block} · evidence ${receipts[0]?.evidence_hash?.slice(0, 8) ?? "none"}…`);
  if (res.status !== "sent") process.exitCode = 1;
}

export async function exception(w: World): Promise<void> {
  const r = await executingProcurement(w, "Liquidity reporting integration");
  header("exception", r.id, "", w);
  const reduced = "9000000";
  const req = await client(w, "vendor", r.id).requestException({ item: 3, amount: reduced, waiveEvidence: true, reason: "Handover scope reduced by agreement" });
  const ex = (await w.reader.agreement(r.id).exceptions()).at(-1)!;
  line("request", `vendor · item 3 · ${usdc(reduced)} · waive evidence · "${ex.reason}" · tx ${req.txHash}`);
  const ap = await client(w, "buyer", r.id).approveException(ex.id);
  line("approve", `buyer · exception ${ex.id} · tx ${ap.txHash}`);
  const wrong = await r.agent.deal.pay({ item: 3, amount: "12000000", recipient: r.recipient });
  line("refused", `the original amount: ${wrong.code ?? wrong.status} · tx ${wrong.txHash}`);
  const res = await r.agent.deal.pay({ item: 3, amount: reduced, recipient: r.recipient });
  line("paid", `${res.status === "sent" ? "payment_sent" : res.code ?? res.status} ${usdc(reduced)} → ${r.recipient} · tx ${res.txHash}`);
  if (res.status !== "sent" || wrong.status !== "refused") process.exitCode = 1;
}

export async function claim(w: World): Promise<void> {
  const r = await executingProcurement(w, "Liquidity reporting integration");
  await deliverAndAccept(w, r.id, 1);
  header("claim", r.id, "", w);
  const rv = await client(w, "buyer", r.id).revokeAgent();
  line("revoke", `buyer · the agent's key is gone · tx ${rv.txHash}`);
  const a = await w.reader.agreement(r.id).get();
  const item = (await w.reader.agreement(r.id).items())[0]!;
  const ready = (item.eligible_at ?? a.now) + a.params.claim_delay_secs;
  line("wait", `item 1 eligible · the vendor may claim ${a.params.claim_delay_secs} s after (demo timings)`);
  const early = await client(w, "vendor", r.id).claim(1);
  line("early", `${early.code ?? early.status} · tx ${early.txHash}`);
  await sleep(Math.max(0, ready - a.now + 3) * 1000);
  const res = await waitFor("the claim delay", 60, async () => {
    const c = await client(w, "vendor", r.id).claim(1);
    return c.status === "sent" ? c : c.code === "ERR_TOO_EARLY" || c.code === "ERR_NOT_DUE" ? undefined : c;
  });
  line("claimed", `vendor · ${res.status === "sent" ? "payment_sent" : res.code ?? res.status} ${usdc(item.amount)} → ${r.recipient} · tx ${res.txHash}`);
  if (res.status !== "sent") process.exitCode = 1;
}

export async function payeeChange(w: World): Promise<void> {
  const r = await executingProcurement(w, "Liquidity reporting integration");
  const next = w.second;
  if (!next) throw new Error("payee-change needs a second recipient listed in the domain file (RECIPIENT2_ACCOUNT)");
  await deliverAndAccept(w, r.id, 1);
  header("payee-change", r.id, "", w);
  const prop = await client(w, "vendor", r.id).proposeRecipient(next, w.domain);
  const version = Number(prop.value);
  line("propose", `vendor · version ${version} · ${next} · tx ${prop.txHash}`);
  const proven = await waitFor("the Payee job's proof", w.network === "sandbox" ? 60 : 300, async () => {
    const v = (await w.reader.agreement(r.id).recipients())[version - 1];
    return v && v.status !== "Proposed" ? v : undefined;
  });
  line("proof", `${proven.status} · rating ${proven.rating}`);
  await client(w, "authority", r.id).approveRecipient(version);
  await client(w, "buyer", r.id).acceptRecipient(version, { acknowledgeWarnings: proven.rating === "warn" });
  const accepted = (await w.reader.agreement(r.id).recipients())[version - 1]!;
  const a = await w.reader.agreement(r.id).get();
  line("timelock", `approved and accepted · active at ${new Date((accepted.active_at ?? 0) * 1000).toISOString()} (${a.params.timelock_secs} s)`);
  const early = await r.agent.deal.pay({ item: 1, amount: "12000000", recipient: next });
  line("early", `pay to ${next} before activation: ${early.code ?? early.status}`);
  await activate(w, r.id, version);
  line("active", `version ${version} · ${next}`);
  const old = await r.agent.deal.pay({ item: 1, amount: "12000000", recipient: r.recipient });
  line("old", `pay to ${r.recipient}: ${old.code ?? old.status}`);
  const res = await r.agent.deal.pay({ item: 1, amount: "12000000", recipient: next });
  line("paid", `${res.status === "sent" ? "payment_sent" : res.code ?? res.status} ${usdc("12000000")} → ${next} · tx ${res.txHash}`);
  if (res.status !== "sent" || early.status !== "refused" || old.status !== "refused") process.exitCode = 1;
}

