// `accord tender`: bid on open tenders with nothing but a key. The bidder key (an ed25519 seed) lives in
// ~/.accord/bidder.json (mode 0600) and is made on first use; its public key in hex is the bidder id and its NEAR
// implicit account. Each sealed bid's price and salt are kept in ~/.accord/tender-bids/<board>/<job>.json (0600) until
// the reveal. Bids, reveals and the award go through the app's relay (POST /api/tenders/...), which pays the gas and
// cannot change a bid: the board checks the bidder's signature. Reads come straight from the board on chain.
//
//   accord tender list | show <job> | key | link <account>
//   accord tender bid <job> --price <amount in the job token> --agent <label> [--account <you.testnet>] [--wait] [--deliver "<cmd>"]
//   accord tender reveal <job> | award <job>
//   accord tender work <job> --deliver "<cmd>"      (the winner finishes the job: ./tenderwork.ts)
//
// With --account (or ACCORD_ACCOUNT) the agent asks to join that account's dashboard: it shows there with an Approve
// button, no link to paste. With --wait a bid follows the job to the end: reveal, award, and if it won, the work.

import { exec } from "node:child_process";
import {
  Accord, KeySigner, bidderNearKey, signLink as signLinkFor,
  Chain, RPC, TENDER_BOARDS, TenderBoardClient, addBidSecret, bidderKey, isBoardId, newBidderKey, nextNonce,
  parseTenderAmount, prepareBid, secondsLeft, secretFor, signLink, tenderAmount, tenderToken, timelockBidSecret, type BidderKey, type TenderJob,
} from "@accord/sdk";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { flagBool, flagString } from "./args.js";
import { header, line } from "./format.js";
import type { Ctx, Handler } from "./commands.js";
import { work, type WinnerKeys, type WorkDeps, type WorkOps } from "./tenderwork.js";

export const DEFAULT_RELAY = "https://accordweb-production.up.railway.app/app";

/** What `accord tender` touches, injected so tests run with fakes. */
export interface TenderDeps extends Omit<WorkDeps, "board"> {
  board: Pick<TenderBoardClient, "board" | "job" | "jobs">;
  relay(path: string, body: object): Promise<{ tx: string }>;
  home: string;
  /** null when the file does not exist; any other read error throws. */
  readText(path: string): Promise<string | null>;
  /** Writes with mode 0600 (and 0600 again after, for a file that existed); `create` fails if the file exists. */
  writeSecret(path: string, content: string, create?: boolean): Promise<void>;
  sleep(ms: number): Promise<void>;
  /**
   * The bid's price and salt locked to the drand round after bidding closes, so Accord's keeper reveals it if this
   * agent is offline in the reveal window; null when drand cannot be reached (the bid still goes, revealed by hand).
   */
  lockBid(secret: { price: string; salt: string }, commitEndsNs: number): Promise<string | null>;
}

export function tenderDeps(ctx: Ctx): TenderDeps {
  const boardId = flagString(ctx.args, "board") ?? ctx.env.TENDER_BOARD ?? TENDER_BOARDS.testnet!;
  if (!isBoardId(boardId)) throw new Error(`not a board account id: ${boardId}`);
  const rpc = ctx.env.NEAR_RPC_URL || RPC.testnet!.rpc;
  const relayUrl = (flagString(ctx.args, "relay") ?? ctx.env.ACCORD_APP_URL ?? DEFAULT_RELAY).replace(/\/+$/, "");
  const chain = new Chain(rpc, "testnet");
  const factory = ctx.env.ACCORD_FACTORY || "accord-v2.testnet";
  const post = async (path: string, body: object) => {
    const r = await fetch(`${relayUrl}/api/tenders/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) throw new Error(`app: ${String(j.error ?? `HTTP ${r.status}`)}`);
    return j;
  };
  return {
    board: new TenderBoardClient(chain, boardId),
    post,
    appUrl: relayUrl,
    ops: (agreement, keys) => realOps(new Accord({ network: "testnet", factory, rpc }), agreement, keys),
    runDeliver: (command, env) => new Promise((resolve, reject) => {
      exec(command, { env: { ...process.env, ...env }, maxBuffer: 1 << 20, timeout: 10 * 60_000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(`--deliver failed: ${err.message}${stderr ? ` (${stderr.trim().slice(0, 300)})` : ""}`));
        else resolve(stdout);
      });
    }),
    now: () => Date.now(),
    lockBid: (secret, commitEndsNs) => timelockBidSecret(secret, commitEndsNs).catch(() => null),
    relay: async (path, body) => {
      const r = await fetch(`${relayUrl}/api/tenders/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { tx?: string; error?: string };
      if (!r.ok || !j.tx) throw new Error(`relay: ${j.error ?? `HTTP ${r.status}`}`);
      return { tx: j.tx };
    },
    home: ctx.env.HOME || homedir(),
    readText: async (p) => readFile(p, "utf8").catch((e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") return null;
      throw e;
    }),
    writeSecret: async (p, content, create) => {
      await mkdir(dirname(p), { recursive: true, mode: 0o700 });
      await writeFile(p, content, { mode: 0o600, flag: create ? "wx" : "w" });
      await chmod(p, 0o600);
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  };
}

/** The winner's real moves: the vendor key signs as the vendor, the approver key as the vendor's authority. */
function realOps(base: Accord, agreement: string, k: WinnerKeys): WorkOps {
  const as = (key: BidderKey) => base.withSigner(new KeySigner(key.id, bidderNearKey(key), base.chain)).agreement(agreement);
  const vendor = as(k.vendor), authority = as(k.authority), read = base.agreement(agreement);
  return {
    view: async () => {
      const [a, c, recipients, items] = await Promise.all([read.get(), read.commitments(), read.recipients(), read.items()]);
      return { agreement: a, sealed: { buyer: !!c.buyer, vendor: !!c.vendor }, recipients, items, now: a.now };
    },
    seal: async (m) => (await vendor.sealMandate(m, { role: "vendor" })).txHash,
    negotiate: async () => (await vendor.startNegotiation()).txHash,
    approve: async (terms) => (await vendor.approveTerms(terms)).txHash,
    propose: async (r, domain) => (await vendor.proposeRecipient(r, domain)).txHash,
    authorityApprove: async (v) => (await authority.approveRecipient(v)).txHash,
    activate: async (v) => (await vendor.activateRecipient(v)).txHash,
    deliver: async (item, sha, uri) => (await vendor.submitDelivery(item, sha, uri)).txHash,
    claim: async (item) => { const r = await vendor.claim(item); return { tx: r.txHash ?? "(no tx)", status: r.status, code: r.code ?? null }; },
  };
}

/** Asks to join an account's dashboard: signed by the agent's key; the owner approves it there. */
async function claimAccount(d: TenderDeps, key: BidderKey, account: string, label: string): Promise<void> {
  await d.post("agents/claims", { account, bidder: key.id, label, source: "cli", signature: signLinkFor(key, account) });
}
const ownerOf = (ctx: Ctx): string | undefined => {
  const a = (flagString(ctx.args, "account") ?? ctx.env.ACCORD_ACCOUNT)?.trim().toLowerCase();
  if (a && !/^[a-z0-9._-]{2,64}$/.test(a)) throw new Error(`--account ${a} is not a NEAR account id`);
  return a || undefined;
};

/** An amount in the job's own token (its decimals and symbol); a token this CLI does not know shows raw base units. */
const amt = (base: string | null, token: string) => {
  if (base === null) return "sealed";
  try { return `${tenderAmount(base, token)} ${tenderToken(token).symbol}`; } catch { return `${base} base units of ${token}`; }
};
const shortId = (s: string) => `${s.slice(0, 12)}…`;
const jobNo = (ctx: Ctx, i = 1) => {
  const v = ctx.rest[i];
  if (!v || !/^[1-9][0-9]*$/.test(v)) throw new Error("give the job number: accord tender <sub> <job>");
  return Number(v);
};

/** The bidder key: read if the file exists (a damaged file is an error, never replaced), made only if it does not. */
async function loadKey(d: TenderDeps, create: boolean, path?: string): Promise<BidderKey> {
  const file = path ?? `${d.home}/.accord/bidder.json`;
  const text = await d.readText(file);
  if (text !== null) {
    try {
      return bidderKey(String((JSON.parse(text) as { seed?: string }).seed));
    } catch (e) {
      throw new Error(`${file} is not a readable bidder key (${(e as Error).message}); it may be the vendor key of a won agreement, so it is left as it is`);
    }
  }
  if (!create || path) throw new Error(`no bidder key at ${file}${path ? "" : ": run accord tender key"}`);
  const k = newBidderKey();
  await d.writeSecret(file, JSON.stringify({ seed: k.seed, id: k.id }, null, 2), true);
  return k;
}

const bidFile = (d: TenderDeps, job: number) => `${d.home}/.accord/tender-bids/${d.board.board}/${job}.json`;

function jobLines(j: TenderJob): string[] {
  const left = secondsLeft(j);
  const out = [
    header("tender", `job ${j.id}`, j.phase),
    line("title", j.title),
    line("budget", `${amt(j.budget, j.token)} · buyer ${j.buyer}`),
    line("window", left ? `${left} s left to ${j.phase === "open" ? "bid" : "reveal"}` : j.phase),
  ];
  for (const b of j.bids) out.push(line(b.bidder === j.winner ? "winner" : "bid", `${b.agent.padEnd(18)} ${shortId(b.bidder)} ${amt(b.price, j.token)}`));
  if (j.agreement) out.push(line("agreement", j.agreement));
  return out;
}

/** Reveals the bid the board holds for this key, with the kept entry whose commitment matches it. */
async function reveal(ctx: Ctx, d: TenderDeps, job: number, keyPath?: string): Promise<number> {
  const key = await loadKey(d, false, keyPath);
  const j = await d.board.job(job);
  const onChain = j?.bids.find((b) => b.bidder === key.id);
  if (!onChain) throw new Error(`job ${job} holds no bid from ${key.id}`);
  const kept = secretFor(await d.readText(bidFile(d, job)), onChain);
  const token = j!.token;
  if (!kept) throw new Error(`no kept price and salt open the commitment on chain (${onChain.commitment.slice(0, 16)}…); see ${bidFile(d, job)}`);
  const r = await d.relay(`${job}/reveal`, { bidder: key.id, price: kept.price, salt: kept.salt });
  ctx.out.block([header("tender reveal", `job ${job}`), line("price", amt(kept.price, token)), line("tx", r.tx)], { job, ...r, price: kept.price });
  return 0;
}

async function waitPhase(d: TenderDeps, job: number, done: (j: TenderJob) => boolean, maxSecs: number): Promise<TenderJob> {
  for (let i = 0; i < maxSecs / 3; i++) {
    const j = await d.board.job(job);
    if (j && done(j)) return j;
    await d.sleep(3000);
  }
  throw new Error(`job ${job}: still waiting after ${maxSecs} s`);
}

export const tender: Handler = async (ctx) => {
  const d = tenderDeps(ctx);
  return runTender(ctx, d);
};

export async function runTender(ctx: Ctx, d: TenderDeps): Promise<number> {
  const sub = ctx.rest[0];
  // --key <file>: another bidder key file, such as one downloaded from the browser that bid with it
  const keyPath = flagString(ctx.args, "key");
  switch (sub) {
    case "list": {
      const jobs = await d.board.jobs(20);
      const lines = [header("tender list", d.board.board, `${jobs.length} jobs`)];
      for (const j of jobs) lines.push(line(`job ${j.id}`, `${j.phase.padEnd(12)} ${amt(j.budget, j.token).padEnd(14)} ${j.bids.length} bids · ${j.title}`));
      ctx.out.block(lines, { board: d.board.board, jobs });
      return 0;
    }
    case "show": {
      const j = await d.board.job(jobNo(ctx));
      if (!j) throw new Error(`no job ${ctx.rest[1]} on ${d.board.board}`);
      ctx.out.block(jobLines(j), j);
      return 0;
    }
    case "key": {
      const k = await loadKey(d, true, keyPath);
      ctx.out.block([header("tender key"), line("bidder", k.id), line("account", `${k.id} (NEAR implicit; funded only if you win)`), line("stored", `${d.home}/.accord/bidder.json (0600)`)], { bidder: k.id });
      return 0;
    }
    case "bid": {
      const job = jobNo(ctx);
      const priceText = flagString(ctx.args, "price");
      const agent = flagString(ctx.args, "agent");
      if (!priceText || !agent) throw new Error("accord tender bid <job> --price <amount in the job token> --agent <label>");
      const job0 = await d.board.job(job);
      if (!job0) throw new Error(`no job ${job} on ${d.board.board}`);
      const price = parseTenderAmount(priceText, job0.token).toString();
      const j = await d.board.job(job);
      if (!j) throw new Error(`no job ${job} on ${d.board.board}`);
      if (j.phase !== "open") throw new Error(`job ${job} is ${j.phase}; bids are taken while it is open`);
      if (BigInt(price) > BigInt(j.budget)) ctx.out.warn(`note: ${amt(price, j.token)} is above the budget ${amt(j.budget, j.token)}; it cannot win`);
      const key = await loadKey(d, true, keyPath);
      const keptBefore = await d.readText(bidFile(d, job));
      const onChain = j.bids.find((b) => b.bidder === key.id);
      const sealed = prepareBid({ board: d.board.board, job, price, agent, key, nonce: nextNonce(keptBefore, onChain?.nonce ?? null) });
      // kept before sending and added, never overwritten: whichever submission lands can be revealed
      await d.writeSecret(bidFile(d, job), addBidSecret(keptBefore, sealed));
      const timelock = flagBool(ctx.args, "no-timelock") ? null : await d.lockBid(sealed.secret, j.commit_ends);
      if (!timelock && !flagBool(ctx.args, "no-timelock")) ctx.out.warn("note: drand could not be reached, so this bid has no timelock; reveal it yourself (accord tender reveal) after bidding closes");
      const r = await d.relay(`${job}/bids`, { bidder: sealed.bidder, agent: sealed.agent, commitment: sealed.commitment, nonce: sealed.nonce, signature: sealed.signature, ...(timelock ? { timelock } : {}) });
      const owner = ownerOf(ctx);
      const claimed = owner ? await claimAccount(d, key, owner, agent).then(() => true, (e: Error) => { ctx.out.warn(`could not ask to join ${owner}'s dashboard: ${e.message}`); return false; }) : false;
      ctx.out.block([
        header("tender bid", `job ${job}`),
        line("bidder", key.id),
        line("sealed", `commitment ${sealed.commitment.slice(0, 16)}… · price hidden until the reveal`),
        line("tx", r.tx),
        line("kept", `${bidFile(d, job)} (price and salt; needed to reveal)`),
        ...(timelock ? [line("timelock", "price and salt locked to drand until bidding closes; Accord reveals it if this agent is offline")] : []),
        ...(claimed ? [line("dashboard", `asked to join ${owner}'s agents: approve it at ${d.appUrl}/tenders/agents`)] : []),
      ], { job, bidder: key.id, commitment: sealed.commitment, tx: r.tx, claimed: owner ?? null });
      if (!flagBool(ctx.args, "wait")) return 0;
      const after = await waitPhase(d, job, (x) => x.phase !== "open", secondsLeft(j) + 60);
      if (after.phase === "revealing") await reveal(ctx, d, job, keyPath);
      const decided = await waitPhase(d, job, (x) => !["open", "revealing", "closed"].includes(x.phase) || (x.phase === "revealing" && x.bids.every((b) => b.price !== null)), 600);
      if (decided.phase === "revealing" || decided.phase === "closed") await d.relay(`${job}/award`, {}).catch((e: Error) => ctx.out.warn(`award: ${e.message}`));
      const final = (await d.board.job(job))!;
      const won = final.winner === key.id;
      ctx.out.block([...jobLines(final), line("result", won ? "you won: now doing the job (accord tender work)" : "another bid won")], final);
      return won ? work(ctx, d, job, key) : 0;
    }
    case "link": {
      const account = String(ctx.rest[1] ?? "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{2,64}$/.test(account)) throw new Error("accord tender link <your-account.testnet> [--agent <label>]");
      const k = await loadKey(d, true, keyPath);
      const sig = signLink(k, account);
      const label = flagString(ctx.args, "agent") ?? `agent ${k.id.slice(0, 6)}`;
      await d.post("agents/claims", { account, bidder: k.id, label, source: "cli", signature: sig });
      const url = `${d.appUrl}/tenders/agents`;
      ctx.out.block([header("tender link", account), line("bidder", k.id), line("asked", `to join ${account}'s agents`), line("approve", `${url} (signed in as ${account})`)], { account, bidder: k.id, signature: sig, url });
      return 0;
    }
    case "work":
      return work(ctx, d, jobNo(ctx), await loadKey(d, false, keyPath));
    case "reveal":
      return reveal(ctx, d, jobNo(ctx), keyPath);
    case "award": {
      const job = jobNo(ctx);
      const r = await d.relay(`${job}/award`, {});
      const j = await d.board.job(job);
      ctx.out.block([header("tender award", `job ${job}`), line("tx", r.tx), ...(j ? jobLines(j).slice(1) : [])], { job, ...r, result: j });
      return 0;
    }
    default:
      throw new Error("accord tender list | show <job> | key | link <account> | bid <job> --price <amount in the job token> --agent <label> [--account <you.testnet>] [--wait] [--deliver <cmd>] | reveal <job> | award <job> | work <job> --deliver <cmd>");
  }
}
