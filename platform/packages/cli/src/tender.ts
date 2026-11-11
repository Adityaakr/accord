// `accord tender`: bid on open tenders with nothing but a key. The bidder key (an ed25519 seed) lives in
// ~/.accord/bidder.json (mode 0600) and is made on first use; its public key in hex is the bidder id and its NEAR
// implicit account. Each sealed bid's price and salt are kept in ~/.accord/tender-bids/<board>/<job>.json (0600) until
// the reveal. Bids, reveals and the award go through the app's relay (POST /api/tenders/...), which pays the gas and
// cannot change a bid: the board checks the bidder's signature. Reads come straight from the board on chain.
//
//   accord tender list | show <job> | key
//   accord tender bid <job> --price <USDC> --agent <label> [--wait]
//   accord tender reveal <job> | award <job>

import {
  Chain, RPC, TENDER_BOARDS, TenderBoardClient, addBidSecret, bidderKey, formatUnits, isBoardId, newBidderKey, nextNonce,
  prepareBid, secondsLeft, secretFor, type BidderKey, type TenderJob,
} from "@accord/sdk";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { flagBool, flagString } from "./args.js";
import { parseAmount } from "./amount.js";
import { header, line } from "./format.js";
import type { Ctx, Handler } from "./commands.js";

export const DEFAULT_RELAY = "https://accordweb-production.up.railway.app/app";

/** What `accord tender` touches, injected so tests run with fakes. */
export interface TenderDeps {
  board: Pick<TenderBoardClient, "board" | "job" | "jobs">;
  relay(path: string, body: object): Promise<{ tx: string }>;
  home: string;
  /** null when the file does not exist; any other read error throws. */
  readText(path: string): Promise<string | null>;
  /** Writes with mode 0600 (and 0600 again after, for a file that existed); `create` fails if the file exists. */
  writeSecret(path: string, content: string, create?: boolean): Promise<void>;
  sleep(ms: number): Promise<void>;
}

export function tenderDeps(ctx: Ctx): TenderDeps {
  const boardId = flagString(ctx.args, "board") ?? ctx.env.TENDER_BOARD ?? TENDER_BOARDS.testnet!;
  if (!isBoardId(boardId)) throw new Error(`not a board account id: ${boardId}`);
  const rpc = ctx.env.NEAR_RPC_URL || RPC.testnet!.rpc;
  const relayUrl = (flagString(ctx.args, "relay") ?? ctx.env.ACCORD_APP_URL ?? DEFAULT_RELAY).replace(/\/+$/, "");
  return {
    board: new TenderBoardClient(new Chain(rpc, "testnet"), boardId),
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

const usdc = (base: string | null) => (base === null ? "sealed" : `${formatUnits(base)} USDC`);
const shortId = (s: string) => `${s.slice(0, 12)}…`;
const jobNo = (ctx: Ctx, i = 1) => {
  const v = ctx.rest[i];
  if (!v || !/^[1-9][0-9]*$/.test(v)) throw new Error("give the job number: accord tender <sub> <job>");
  return Number(v);
};

/** The bidder key: read if the file exists (a damaged file is an error, never replaced), made only if it does not. */
async function loadKey(d: TenderDeps, create: boolean): Promise<BidderKey> {
  const file = `${d.home}/.accord/bidder.json`;
  const text = await d.readText(file);
  if (text !== null) {
    try {
      return bidderKey(String((JSON.parse(text) as { seed?: string }).seed));
    } catch (e) {
      throw new Error(`${file} is not a readable bidder key (${(e as Error).message}); it may be the vendor key of a won agreement, so it is left as it is`);
    }
  }
  if (!create) throw new Error(`no bidder key at ${file}: run accord tender key`);
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
    line("budget", `${usdc(j.budget)} · buyer ${j.buyer}`),
    line("window", left ? `${left} s left to ${j.phase === "open" ? "bid" : "reveal"}` : j.phase),
  ];
  for (const b of j.bids) out.push(line(b.bidder === j.winner ? "winner" : "bid", `${b.agent.padEnd(18)} ${shortId(b.bidder)} ${usdc(b.price)}`));
  if (j.agreement) out.push(line("agreement", j.agreement));
  return out;
}

/** Reveals the bid the board holds for this key, with the kept entry whose commitment matches it. */
async function reveal(ctx: Ctx, d: TenderDeps, job: number): Promise<number> {
  const key = await loadKey(d, false);
  const j = await d.board.job(job);
  const onChain = j?.bids.find((b) => b.bidder === key.id);
  if (!onChain) throw new Error(`job ${job} holds no bid from ${key.id}`);
  const kept = secretFor(await d.readText(bidFile(d, job)), onChain);
  if (!kept) throw new Error(`no kept price and salt open the commitment on chain (${onChain.commitment.slice(0, 16)}…); see ${bidFile(d, job)}`);
  const r = await d.relay(`${job}/reveal`, { bidder: key.id, price: kept.price, salt: kept.salt });
  ctx.out.block([header("tender reveal", `job ${job}`), line("price", usdc(kept.price)), line("tx", r.tx)], { job, ...r, price: kept.price });
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
  switch (sub) {
    case "list": {
      const jobs = await d.board.jobs(20);
      const lines = [header("tender list", d.board.board, `${jobs.length} jobs`)];
      for (const j of jobs) lines.push(line(`job ${j.id}`, `${j.phase.padEnd(12)} ${usdc(j.budget).padEnd(13)} ${j.bids.length} bids · ${j.title}`));
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
      const k = await loadKey(d, true);
      ctx.out.block([header("tender key"), line("bidder", k.id), line("account", `${k.id} (NEAR implicit; funded only if you win)`), line("stored", `${d.home}/.accord/bidder.json (0600)`)], { bidder: k.id });
      return 0;
    }
    case "bid": {
      const job = jobNo(ctx);
      const priceText = flagString(ctx.args, "price");
      const agent = flagString(ctx.args, "agent");
      if (!priceText || !agent) throw new Error("accord tender bid <job> --price <USDC> --agent <label>");
      const price = parseAmount(priceText);
      const j = await d.board.job(job);
      if (!j) throw new Error(`no job ${job} on ${d.board.board}`);
      if (j.phase !== "open") throw new Error(`job ${job} is ${j.phase}; bids are taken while it is open`);
      if (BigInt(price) > BigInt(j.budget)) ctx.out.warn(`note: ${usdc(price)} is above the budget ${usdc(j.budget)}; it cannot win`);
      const key = await loadKey(d, true);
      const keptBefore = await d.readText(bidFile(d, job));
      const onChain = j.bids.find((b) => b.bidder === key.id);
      const sealed = prepareBid({ board: d.board.board, job, price, agent, key, nonce: nextNonce(keptBefore, onChain?.nonce ?? null) });
      // kept before sending and added, never overwritten: whichever submission lands can be revealed
      await d.writeSecret(bidFile(d, job), addBidSecret(keptBefore, sealed));
      const r = await d.relay(`${job}/bids`, { bidder: sealed.bidder, agent: sealed.agent, commitment: sealed.commitment, nonce: sealed.nonce, signature: sealed.signature });
      ctx.out.block([
        header("tender bid", `job ${job}`),
        line("bidder", key.id),
        line("sealed", `commitment ${sealed.commitment.slice(0, 16)}… · price hidden until the reveal`),
        line("tx", r.tx),
        line("kept", `${bidFile(d, job)} (price and salt; needed to reveal)`),
      ], { job, bidder: key.id, commitment: sealed.commitment, tx: r.tx });
      if (!flagBool(ctx.args, "wait")) return 0;
      const after = await waitPhase(d, job, (x) => x.phase !== "open", secondsLeft(j) + 60);
      if (after.phase === "revealing") await reveal(ctx, d, job);
      const decided = await waitPhase(d, job, (x) => !["open", "revealing", "closed"].includes(x.phase) || (x.phase === "revealing" && x.bids.every((b) => b.price !== null)), 600);
      if (decided.phase === "revealing" || decided.phase === "closed") await d.relay(`${job}/award`, {}).catch((e: Error) => ctx.out.warn(`award: ${e.message}`));
      const final = (await d.board.job(job))!;
      ctx.out.block([...jobLines(final), line("result", final.winner === key.id ? "you won: the buyer opens an Accord agreement with your key as vendor" : "another bid won")], final);
      return 0;
    }
    case "reveal":
      return reveal(ctx, d, jobNo(ctx));
    case "award": {
      const job = jobNo(ctx);
      const r = await d.relay(`${job}/award`, {});
      const j = await d.board.job(job);
      ctx.out.block([header("tender award", `job ${job}`), line("tx", r.tx), ...(j ? jobLines(j).slice(1) : [])], { job, ...r, result: j });
      return 0;
    }
    default:
      throw new Error("accord tender list | show <job> | key | bid <job> --price <USDC> --agent <label> [--wait] | reveal <job> | award <job>");
  }
}
