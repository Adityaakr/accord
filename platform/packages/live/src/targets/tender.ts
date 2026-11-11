// `make tender`: an open tender from posting to a refused redirect. A fresh buyer posts a job on the tender board;
// three bidding agents, each with nothing but its own ed25519 key and no NEAR, submit sealed bids through a relay
// (the app's /api/tenders routes when APP_URL serves them, else any account pays the gas); the bids are revealed after
// the deadline and the board picks the lowest valid price. The winner's key is its NEAR implicit account: it becomes
// the vendor of an ordinary Accord procurement agreement on the factory's current release, the buyer links it on the
// board (checked against the factory), and the deal runs as in `make demo`: both mandates sealed (the winner's floor
// is its bid), terms negotiated in the Sealed Table, both approve, the recipient proven, funded, a delivery, a payment,
// and one attack refused.
//
// TENDER_RELAY_URL sends bids, reveals and the award through another app (a local one) than APP_URL.
// TENDER_COMMIT_SECS (default 40) and TENDER_REVEAL_SECS (default 60) set the windows; a longer commit window leaves
// time for an outside agent to bid on the printed job (`accord tender bid <job> ...`).

import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { sha256 } from "@noble/hashes/sha2";
import { utf8ToBytes } from "@noble/hashes/utils";
import { Account, KeyPair, KeyPairSigner, actions, type KeyPairString } from "near-api-js";
import {
  DEMO_PARAMS, KeySigner, TENDER_BOARDS, TenderBoardClient, bidderKey, bidderNearKey, demoDelivery, demoDeliveryPath, newBidderKey,
  prepareBid, toBase64, type BidderKey, type Mandate, type SealedBid, type TenderJob,
} from "@accord/sdk";
import { activate, client, companyMandate, fundTotal, installAgent, negotiate, procurementPreset, say, usdc, waitFor } from "../flow.js";
import type { Principal, World } from "../world.js";

const BUDGET = 40_000_000n; // the buyer's public ceiling: the procurement preset's max_total
const PREFUND = 40_000_000n;
const NEAR = 10n ** 24n;
/** The house agents: a label and a price each (base units, 6 decimals). Different strategies, one winner. */
const HOUSE: { agent: string; price: bigint }[] = [
  { agent: "halcyon-quote-bot", price: 36_750_000n },
  { agent: "lowball-lab", price: 34_500_000n },
  { agent: "premium-pipelines", price: 39_900_000n },
];

function clock(started: number): string {
  const s = Math.floor((Date.now() - started) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Bids, reveals and the award go through the app's relay when it serves them, else through a funded signer. */
interface Relay {
  via: string;
  bid(b: SealedBid): Promise<string>;
  reveal(job: number, bidder: string, price: string, salt: string): Promise<string>;
  award(job: number): Promise<string>;
}

async function appRelay(appUrl: string): Promise<Relay | null> {
  if (!appUrl) return null;
  const ok = await fetch(`${appUrl}/api/tenders`).then((r) => r.ok, () => false);
  if (!ok) return null;
  const post = async (path: string, body: object) => {
    const r = await fetch(`${appUrl}/api/tenders/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { tx?: string; error?: string };
    if (!r.ok || !j.tx) throw new Error(`relay ${path}: ${j.error ?? r.status}`);
    return j.tx;
  };
  return {
    via: `${appUrl}/api/tenders`,
    bid: (b) => post(`${b.job}/bids`, { bidder: b.bidder, agent: b.agent, commitment: b.commitment, nonce: b.nonce, signature: b.signature }),
    reveal: (job, bidder, price, salt) => post(`${job}/reveal`, { bidder, price, salt }),
    award: (job) => post(`${job}/award`, {}),
  };
}

function signerRelay(board: TenderBoardClient, s: KeySigner): Relay {
  const tx = async (p: Promise<{ ok: boolean; txHash: string; failure?: string }>, what: string) => {
    const r = await p;
    if (!r.ok) throw new Error(`${what}: ${r.failure}`);
    return r.txHash;
  };
  return {
    via: `${s.accountId} (pays the gas; the board checks each bidder's signature)`,
    bid: (b) => tx(board.submitBid(s, b), "submit_bid"),
    reveal: (job, bidder, price, salt) => tx(board.reveal(s, job, bidder, price, salt), "reveal_bid"),
    award: (job) => tx(board.award(s, job), "award"),
  };
}

async function keepKeys(name: string, seeds: Record<string, string>): Promise<void> {
  const dir = `${homedir()}/.accord/runs`;
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(`${dir}/${name}.json`, JSON.stringify(seeds, null, 2), { mode: 0o600, flag: "wx" });
}

/** NEAR to an implicit account (which creates it), from the demo's funder. */
async function fundImplicit(w: World, funder: Principal, account: string, near: bigint): Promise<void> {
  const acct = new Account(funder.account, w.reader.chain.provider, new KeyPairSigner(KeyPair.fromString(funder.key as KeyPairString)));
  await acct.signAndSendTransaction({ receiverId: account, actions: [actions.transfer(near)], waitUntil: "FINAL" });
  await waitFor(`${account} on chain`, 20, () => w.reader.chain.account(account).then(() => true, () => false));
}

async function registerDemoVendor(w: World, recipient: Principal, authority: string): Promise<void> {
  const message = `accord:demo-vendor:v1:${recipient.account}:${authority}`;
  const signer = new KeySigner(recipient.account, recipient.key, w.reader.chain);
  const { signature, publicKey } = await signer.signMessage(message, recipient.account, sha256(utf8ToBytes(message)));
  const res = await fetch(`${w.app.url}/api/demo-vendor/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipient: recipient.account, authority, signature: toBase64(signature), public_key: publicKey }),
  });
  if (!res.ok) throw new Error(`demo domain registration: ${res.status} ${await res.text()}`);
}

/** The winner's sealed mandate: the vendor preset with its floor and target set to its winning bid. */
function winnerMandate(file: string, price: bigint): Mandate {
  const m = companyMandate(file);
  return { ...m, limits: { ...m.limits, min_total: price.toString(), target_total: price.toString() } } as Mandate;
}

export async function run(base: World): Promise<void> {
  if (!base.app.url) throw new Error("make tender needs the app for its demo domain: set APP_URL (make dev runs it locally)");
  if (base.network !== "testnet") throw new Error("make tender runs on testnet (the tender board is deployed there)");
  const started = Date.now();
  const at = (label: string, text: string) => say(`  ${clock(started)}  ${label.padEnd(10)} ${text}`);
  const boardId = process.env.TENDER_BOARD || TENDER_BOARDS.testnet!;
  const board = new TenderBoardClient(base.reader.chain, boardId);
  const commitSecs = Number(process.env.TENDER_COMMIT_SECS ?? 40);
  const revealSecs = Number(process.env.TENDER_REVEAL_SECS ?? 60);
  say(`accord tender · board ${boardId} · factory ${base.reader.factory} · token ${base.token}`);

  const tag = Date.now().toString(36);
  // The demo's own buyer posts and pays (no throwaway buyer account to strand NEAR in); the recipient is a fresh implicit
  // account, funded just enough to exist.
  const buyer = base.principals.buyer;
  const payKey = newBidderKey();
  await fundImplicit(base, buyer, payKey.id, NEAR / 10n);
  const recipient: Principal = { account: payKey.id, key: bidderNearKey(payKey) };
  const w0 = base;
  const relay = (await appRelay(process.env.TENDER_RELAY_URL || base.app.url)) ?? signerRelay(board, new KeySigner(buyer.account, buyer.key, base.reader.chain));
  at("accounts", `buyer ${buyer.account} · recipient ${recipient.account.slice(0, 12)}… (implicit)`);

  // 1. The buyer posts the job: public budget, evidence the buyer will require, two windows.
  const evidence = Array.from(sha256(utf8ToBytes(`tender ${tag}: liquidity reporting integration, 3 milestones`)), (b) => b.toString(16).padStart(2, "0")).join("");
  const posted = await board.postJob(new KeySigner(buyer.account, buyer.key, base.reader.chain), {
    title: "Liquidity reporting integration", spec: "Three milestones: data pipeline, daily report, dashboard. Evidence: the delivery file named in the agreement.",
    evidenceHash: evidence, budget: BUDGET, token: base.token, commitSecs, revealSecs,
  });
  if (!posted.ok) throw new Error(`post_job: ${posted.failure}`);
  const job = Number(posted.value);
  at("posted", `job ${job} · budget ${usdc(BUDGET)} · bids for ${commitSecs} s · tx ${posted.txHash}`);
  say(`             outside agents may bid now: accord tender bid ${job} --price <USDC> --agent <name>`);

  // 2. Three agents bid. Each holds only its key: no NEAR, no account. The relay pays the gas.
  const keys: BidderKey[] = HOUSE.map(() => newBidderKey());
  const bids = HOUSE.map((h, i) => prepareBid({ board: boardId, job, price: h.price, agent: h.agent, key: keys[i]! }));
  const bidTx = await Promise.all(bids.map((b) => relay.bid(b)));
  at("sealed", `${bids.length} bids via ${relay.via}`);
  for (const [i, b] of bids.entries()) say(`             ${b.agent.padEnd(18)} ${b.bidder.slice(0, 12)}…  commitment ${b.commitment.slice(0, 12)}…  tx ${bidTx[i]}`);
  const sealedView = (await board.job(job))!;
  if (sealedView.bids.some((b) => b.price !== null)) throw new Error("a price is visible before the reveal");
  at("hidden", `${sealedView.bids.length} bids on chain, every price hidden until the reveal`);

  // 3. After the commit deadline each agent reveals; then anyone may ask for the award.
  await waitFor("the commit window to close", commitSecs + 30, async () => (await board.job(job))?.phase !== "open");
  for (const [i, b] of bids.entries()) await relay.reveal(job, b.bidder, b.secret.price, b.secret.salt).then((tx) => say(`             revealed ${HOUSE[i]!.agent.padEnd(18)} ${usdc(b.secret.price)}  tx ${tx}`));
  let j: TenderJob = (await board.job(job))!;
  if (j.phase === "revealing" && !j.bids.every((b) => b.price !== null)) {
    at("waiting", `${j.bids.filter((b) => b.price === null).length} bid(s) not revealed; waiting for the reveal window to close`);
    await waitFor("the reveal window to close", revealSecs + 30, async () => (await board.job(job))?.phase === "closed");
  }
  // Anyone may ask for the award (a bidder's script often does); a second ask is refused, which is fine.
  const awardTx = await relay.award(job).catch(async (e: Error) => {
    if ((await board.job(job))?.phase === "awarded") return "(already awarded by another caller)";
    throw e;
  });
  j = (await board.job(job))!;
  const win = j.bids.find((b) => b.bidder === j.winner);
  if (!win) throw new Error(`job ${job}: ${j.phase}, no winner`);
  at("awarded", `${win.agent} · ${usdc(win.price!)} · lowest valid price · tx ${awardTx}`);
  const mine = bids.findIndex((b) => b.bidder === win.bidder);
  if (mine < 0) {
    // An outside agent won with its own key: only it can sign as the vendor, so the run stops at the award.
    say(`tender: job ${job} won by an outside agent (${win.agent}, ${win.bidder.slice(0, 12)}…); the agreement waits for its key`);
    return;
  }
  const key = bidderKey(keys[mine]!.seed);

  // 4. The winner's key is its implicit account: funded, it signs as the vendor. Its approver is a second key of its own.
  const authKey = newBidderKey();
  await Promise.all([fundImplicit(base, buyer, key.id, NEAR / 2n), fundImplicit(base, buyer, authKey.id, NEAR / 5n)]);
  // kept so the NEAR left on these accounts after the run can be recovered (0600, outside the repository)
  await keepKeys(`tender-${boardId}-${job}`, { vendor: key.seed, approver: authKey.seed, recipient: payKey.seed });
  const vendor: Principal = { account: key.id, key: bidderNearKey(key) };
  const authority: Principal = { account: authKey.id, key: bidderNearKey(authKey) };
  const w = w0.with({ vendor, authority, recipient: recipient });
  at("winner", `vendor ${vendor.account.slice(0, 12)}… (the bid key) · approver ${authority.account.slice(0, 12)}…`);

  const deposit = BigInt((await w.reader.config()).create_deposit);
  await w.gas(buyer.account, Number(deposit / NEAR) + 6);
  const created = await w.as("buyer").createAgreement({
    kind: "procurement", title: `Tender ${job}: liquidity reporting integration`, vendor: vendor.account, vendor_authority: authority.account,
    canaries: w.canaries, params: DEMO_PARAMS,
  });
  const id = created.agreement;
  const agreementNo = Number(id.slice(1, id.indexOf(".")));
  const linked = await board.link(new KeySigner(buyer.account, buyer.key, base.reader.chain), job, agreementNo);
  if (!linked.ok) throw new Error(`link_agreement: ${linked.failure}`);
  j = (await board.job(job))!;
  if (j.agreement !== id) throw new Error(`the board did not link ${id} (factory check refused it?)`);
  at("linked", `${id} · checked against the factory: buyer, vendor = winner, procurement · tx ${linked.txHash}`);

  // 5. The deal, as in make demo.
  const preset = procurementPreset(w);
  const registered = registerDemoVendor(w, recipient, authority.account);
  const prefund = w.fund(buyer.account, PREFUND);
  await Promise.all([
    client(w, "vendor", id).sealMandate(winnerMandate(preset.vendor, BigInt(win.price!)), { role: "vendor" }),
    client(w, "buyer", id).sealMandate(companyMandate(preset.buyer), { role: "buyer" }),
  ]);
  at("sealed", "both mandates committed (the winner's floor is its bid)");
  const negotiation = negotiate(w, id);
  const recipientReady = (async () => {
    await registered;
    const version = Number((await client(w, "vendor", id).proposeRecipient(recipient.account, w.app.demoDomain)).value);
    const proven = await waitFor("the Payee job's proof", 150, async () => {
      const v = (await w.reader.agreement(id).recipients())[version - 1];
      if (v?.status === "ProofFailed") throw new Error(`the payee proof failed: ${v.failure}`);
      return v && v.status !== "Proposed" ? v : undefined;
    });
    await client(w, "authority", id).approveRecipient(version);
    await client(w, "buyer", id).acceptRecipient(version, { acknowledgeWarnings: proven.rating === "warn" });
    await activate(w, id, version);
    at("recipient", "proven on the demo domain · approved by the winner's approver · accepted · active");
  })();
  const [a] = await Promise.all([negotiation, recipientReady, prefund]);
  if (a.state !== "Attested") throw new Error(`${id}: ${a.state} after the negotiation`);
  const terms = (await w.reader.agreement(id).terms())!;
  at("attested", `${usdc(terms.total)} · ${terms.items.length} items (winning bid ${usdc(win.price!)})`);

  await Promise.all([client(w, "buyer", id).approveTerms(a.terms_hash!), client(w, "vendor", id).approveTerms(a.terms_hash!)]);
  const { total } = await fundTotal(w, id);
  at("executing", `approved by both · funded ${usdc(total)}`);

  const ev = demoDelivery(id, 1);
  const [agent] = await Promise.all([
    installAgent(w, id),
    client(w, "vendor", id).submitDelivery(1, ev.hash, `https://${w.domain}${demoDeliveryPath(id, 1)}`),
  ]);
  await client(w, "buyer", id).acceptDelivery(1);
  at("delivery", "item 1 submitted by the winner · accepted");
  const item = terms.items[0]!;
  const paid = await agent.deal.pay({ item: 1, amount: item.amount, recipient: recipient.account });
  at("paid", `item 1 · ${usdc(item.amount)} → ${recipient.account}`);
  const attack = await agent.deal.pay({ item: 2, amount: terms.items[1]!.amount, recipient: w.attacker });
  at("refused", `${attack.code ?? attack.status} (a redirect to ${w.attacker})`);
  const s = Math.floor((Date.now() - started) / 1000);
  say(`tender: job ${job} → ${id} in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
  if (paid.status !== "sent" || attack.status !== "refused") process.exitCode = 1;
}
