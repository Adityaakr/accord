// `accord tender work <job> --deliver "<command>"`: a winning agent finishes the job on its own.
//
// 1. It names its approver and payee to the app, signed by its winning key (the payee signs too). Both are keys it makes
//    here and keeps in ~/.accord/tender-work/<board>/<job>.json (0600). The app funds the three accounts once so each
//    can pay its own gas, and registers the payee on its labelled demo domain so the Payee job can prove it.
// 2. It waits for the buyer to open the agreement from the job's page (vendor = this key) and link it on the board.
// 3. It plays the vendor, one move at a time (vendorMove in @accord/sdk): seals its mandate with its winning price as
//    the floor, starts the negotiation, approves the terms, proposes and approves its payee, delivers each item with the
//    output of --deliver (published to the app, its sha256 recorded in the agreement), and claims each accepted item
//    after the claim delay unless the buyer's agent paid it first. It stops when every item is paid or the deal ends.
//
// The contract decides every payment: the recipient, the evidence and the amount are checked on chain either way.

import { bidderKey, newBidderKey, signDelivery, signWinner, tenderVendorMandate, vendorMove, type BidderKey, type Mandate, type TenderJob, type VendorMove, type VendorView } from "@accord/sdk";
import { createHash } from "node:crypto";
import { flagString } from "./args.js";
import { header, line } from "./format.js";
import type { Ctx } from "./commands.js";

export interface WinnerKeys { vendor: BidderKey; authority: BidderKey; recipient: BidderKey }

/** The agreement as the winner sees it, and the moves it can make; real ones sign with the winner's keys over RPC. */
export interface WorkOps {
  view(): Promise<VendorView>;
  seal(m: Mandate): Promise<string>;
  negotiate(): Promise<string>;
  approve(terms: string): Promise<string>;
  propose(recipient: string, domain: string): Promise<string>;
  authorityApprove(version: number): Promise<string>;
  activate(version: number): Promise<string>;
  deliver(item: number, sha256: string, uri: string): Promise<string>;
  claim(item: number): Promise<{ tx: string; status: string; code: string | null }>;
}

export interface WorkDeps {
  board: { board: string; job(id: number): Promise<TenderJob | null> };
  /** POST JSON to the app's /api/tenders/<path>; throws with the app's error text. */
  post(path: string, body: object): Promise<Record<string, unknown>>;
  /** The app's base URL (…/app), for the delivery link written into the agreement. */
  appUrl: string;
  home: string;
  readText(path: string): Promise<string | null>;
  writeSecret(path: string, content: string, create?: boolean): Promise<void>;
  sleep(ms: number): Promise<void>;
  ops(agreement: string, keys: WinnerKeys): WorkOps;
  /** Runs the agent's own work for one item and returns what it printed (its delivery). */
  runDeliver(command: string, env: Record<string, string>): Promise<string>;
  now(): number;
}

const workFile = (d: WorkDeps, job: number) => `${d.home}/.accord/tender-work/${d.board.board}/${job}.json`;

/** The approver and payee keys for this job: made once and kept, because the agreement will name them. */
export async function winnerKeys(d: WorkDeps, job: number, vendor: BidderKey): Promise<WinnerKeys> {
  const file = workFile(d, job);
  const text = await d.readText(file);
  if (text !== null) {
    const k = JSON.parse(text) as { vendor?: string; authority?: string; recipient?: string };
    if (k.vendor !== vendor.id) throw new Error(`${file} was made for another winning key (${k.vendor}); left as it is`);
    return { vendor, authority: bidderKey(String(k.authority)), recipient: bidderKey(String(k.recipient)) };
  }
  const authority = newBidderKey(), recipient = newBidderKey();
  await d.writeSecret(file, JSON.stringify({ vendor: vendor.id, authority: authority.seed, recipient: recipient.seed, note: "approver and payee seeds for this won job; the payee holds what the job paid" }, null, 2), true);
  return { vendor, authority, recipient };
}

/** Tells the app the approver and payee; the app funds the three accounts once. Returns the payee's proof domain. */
export async function registerWinner(d: WorkDeps, job: number, k: WinnerKeys): Promise<{ domain: string; funded: string[] }> {
  const args = [d.board.board, job, k.authority.id, k.recipient.id] as const;
  const r = await d.post(`${job}/winner`, {
    bidder: k.vendor.id, authority: k.authority.id, recipient: k.recipient.id,
    signature: signWinner(k.vendor.seed, ...args), recipient_signature: signWinner(k.recipient.seed, ...args),
  });
  const setup = r.setup as { domain?: string } | undefined;
  if (!setup?.domain) throw new Error("the app did not return the payee's domain");
  return { domain: setup.domain, funded: Array.isArray(r.txs) ? (r.txs as string[]) : [] };
}

/** One delivery: the agent's output, published to the app with the vendor key's signature, recorded by its sha256. */
async function deliver(d: WorkDeps, ops: WorkOps, job: TenderJob, agreement: string, item: number, k: WinnerKeys, command: string): Promise<string> {
  const body = await d.runDeliver(command, {
    ACCORD_JOB: String(job.id), ACCORD_ITEM: String(item), ACCORD_AGREEMENT: agreement, ACCORD_TITLE: job.title, ACCORD_SPEC: job.spec,
  });
  if (!body.trim()) throw new Error(`--deliver printed nothing for item ${item}; its output is the delivery`);
  const sha = createHash("sha256").update(body, "utf8").digest("hex");
  const r = await d.post(`${job.id}/deliveries`, { agreement, item, body, content_type: "text/plain", signature: signDelivery(k.vendor.seed, agreement, item, sha) });
  if (r.sha256 !== sha) throw new Error("the app stored a different delivery than the one sent");
  return ops.deliver(item, sha, `${d.appUrl}${String(r.path)}`);
}

const DESCRIBE: Record<VendorMove["kind"], string> = {
  seal: "sealed", negotiate: "negotiate", approve: "approved", propose: "recipient", "authority-approve": "approver", activate: "activated",
  deliver: "delivered", claim: "claimed", wait: "waiting", done: "done",
};

/** The vendor's loop: one move per reading of the agreement, until every item is paid or the deal ends. */
export async function work(ctx: Ctx, d: WorkDeps, jobId: number, vendor: BidderKey): Promise<number> {
  const deliverCmd = flagString(ctx.args, "deliver");
  const maxMins = Number(flagString(ctx.args, "max-minutes") ?? "120");
  const say = (label: string, text: string, data: object = {}) => ctx.out.block([line(label, text)], { step: label, text, ...data });
  const deadline = d.now() + maxMins * 60_000;
  const timedOut = () => d.now() > deadline;

  let j = await d.board.job(jobId);
  if (!j) throw new Error(`no job ${jobId} on ${d.board.board}`);
  ctx.out.block([header("tender work", `job ${jobId}`, j.title)], { job: jobId });
  // A job still taking bids or being revealed: wait for the award.
  while (j.phase === "open" || j.phase === "revealing" || j.phase === "closed") {
    if (timedOut()) throw new Error(`job ${jobId} is still ${j.phase}`);
    await d.sleep(5000);
    j = (await d.board.job(jobId))!;
  }
  if (j.winner !== vendor.id) {
    say("result", j.winner ? `another bid won job ${jobId}; nothing to do` : `job ${jobId} is ${j.phase}; nothing to do`);
    return 0;
  }
  const win = j.bids.find((b) => b.bidder === vendor.id)!;
  const keys = await winnerKeys(d, jobId, vendor);
  const { domain, funded } = await registerWinner(d, jobId, keys);
  say("won", `job ${jobId} at your price ${win.price}; vendor ${vendor.id.slice(0, 12)}… · approver ${keys.authority.id.slice(0, 12)}… · payee ${keys.recipient.id.slice(0, 12)}…`);
  if (funded.length) say("funded", `the app sent NEAR for gas to your three accounts (tx ${funded[0]})`);
  say("payee", `${keys.recipient.id} on ${domain}; its key is in ${workFile(d, jobId)}`);

  // The buyer opens the agreement from the job's page; the board checks it names this key as the vendor.
  let waitingSaid = false;
  while (!j.agreement) {
    if (!waitingSaid) { say("waiting", `the buyer opens the agreement from ${d.appUrl}/tenders/${jobId}`); waitingSaid = true; }
    if (timedOut()) throw new Error("the buyer has not opened the agreement yet; run this again later");
    await d.sleep(5000);
    j = (await d.board.job(jobId))!;
  }
  const agreement = j.agreement;
  say("agreement", `${agreement} · deal room ${d.appUrl}/agreements/${agreement}`, { agreement });
  const ops = d.ops(agreement, keys);
  const mandate = tenderVendorMandate(BigInt(win.price!), { job: jobId, title: j.title });

  let said = "";
  for (;;) {
    const move = vendorMove(await ops.view(), { recipient: keys.recipient.id, domain });
    if (move.kind === "done") { say("done", move.why); return 0; }
    if (move.kind === "wait") {
      const why = move.buyer ? `buyer's move: ${move.why}` : move.why;
      if (why !== said) { say("waiting", why); said = why; }
      if (timedOut()) { say("paused", `stopped after ${maxMins} min; run accord tender work ${jobId} again to carry on`); return 0; }
      await d.sleep(5000);
      continue;
    }
    said = "";
    if (move.kind === "deliver" && !deliverCmd) {
      say("your move", `deliver item ${move.item}: run accord tender work ${jobId} --deliver "<command that prints the work>"`);
      return 0;
    }
    const tx = await (async () => {
      switch (move.kind) {
        case "seal": return ops.seal(mandate);
        case "negotiate": return ops.negotiate();
        case "approve": return ops.approve(move.terms);
        case "propose": return ops.propose(move.recipient, move.domain);
        case "authority-approve": return ops.authorityApprove(move.version);
        case "activate": return ops.activate(move.version);
        case "deliver": return deliver(d, ops, j, agreement, move.item, keys, deliverCmd!);
        case "claim": {
          const r = await ops.claim(move.item);
          if (r.status !== "sent") { say("refused", `claim ${move.item}: ${r.code ?? r.status}`); await d.sleep(10_000); }
          return r.tx;
        }
      }
    })();
    const what = move.kind === "deliver" || move.kind === "claim" ? `item ${move.item}` : move.kind === "seal" ? `mandate, floor ${win.price}` : "";
    say(DESCRIBE[move.kind], `${what ? `${what} · ` : ""}tx ${tx}`, { tx });
  }
}
