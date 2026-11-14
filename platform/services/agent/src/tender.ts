// The house tender keeper: keeps one live job on the open tender board so a visitor's agent always has something to
// bid on. Every TENDER_EVERY_MIN minutes (when no house job is still running) the house buyer posts a job with a
// TENDER_COMMIT_SECS bidding window; three house agents bid on it at once with their own keys; after the deadline they
// reveal and the keeper asks for the award. Outside agents bid in the same window through the app's relay and win if
// their price is lower. The keeper signs as the house buyer only (post, and paying the gas of the house agents' bids,
// reveals and the award, which the board allows from anyone). Each house agent's key and salt are derived from
// TENDER_HOUSE_SEED, so a restart can still reveal its bids.
//
// It also reveals for bidders who are offline: a bid sent with a timelocked price and salt (sdk/timelock.ts, kept by
// the app's relay) opens once drand publishes the round after the bidding deadline, and the keeper sends that reveal
// on any job on the board. The board checks the reveal against the bid's commitment, so the keeper cannot alter it.
//
// After the award: when an agent outside the house set wins and accepts the job, the keeper opens the agreement and
// plays the buyer (./tenderdeal.ts), so the winner can deliver and be paid. That costs the factory's creation deposit
// per such job (returned when the agreement ends) and the winning price in test USDC. A house agent that wins has
// nobody to do the work, so its job stops at the award: the job deposit (0.25 NEAR) and gas.

import { createHash, createHmac } from "node:crypto";
import { tenderTimelocks, type TenderTimelock } from "@accord/store";
import {
  KeySigner, TENDER_BOARDS, openTimelockedBid, TENDER_MAX_BIDS, TenderBoardClient, tenderToken, bidderKey, prepareBid, type Accord, type TenderJob,
} from "@accord/sdk";
import { HouseBuyer } from "./tenderdeal.js";

export interface TenderKeeperConfig {
  board: string;
  buyer: { account: string; key: string };
  houseSeed: string;
  token: string;
  everyMin: number;
  commitSecs: number;
  revealSecs: number;
}

export const HOUSE_AGENTS = ["halcyon-quote-bot", "lowball-lab", "premium-pipelines"] as const;
const BASE_PRICES = [36_750_000n, 34_500_000n, 39_900_000n];
export const HOUSE_BUDGET = 40_000_000n;

const JOBS = [
  { title: "Liquidity reporting integration", spec: "Three milestones: data pipeline, daily report, dashboard. Evidence: the delivery file named in the agreement." },
  { title: "Treasury reconciliation export", spec: "Monthly CSV of every payment matched to its invoice. Evidence: the export file and its sha256." },
  { title: "Market data feed for two pairs", spec: "NEAR/USDC and ETH/USDC mid prices every minute for 30 days. Evidence: the feed archive." },
  { title: "Contract translation, three documents", spec: "English to German, legal register. Evidence: the translated files." },
];

export function tenderKeeperConfig(env: Record<string, string | undefined>): TenderKeeperConfig | null {
  if (env.TENDER_KEEPER !== "on") return null;
  const account = env.TENDER_BUYER_ACCOUNT || env.TRY_BUYER_ACCOUNT || "";
  const key = env.TENDER_BUYER_KEY || env.TRY_BUYER_KEY || "";
  if (!account || !key) throw new Error("TENDER_KEEPER=on needs TENDER_BUYER_ACCOUNT and TENDER_BUYER_KEY (or the TRY_BUYER_* pair)");
  const houseSeed = env.TENDER_HOUSE_SEED || createHash("sha256").update(`accord-tender-house:${key}`).digest("hex");
  const num = (name: string, fallback: number, min: number, max: number) => {
    const v = Number(env[name] ?? fallback);
    if (!Number.isFinite(v) || v < min || v > max) throw new Error(`${name} must be a number from ${min} to ${max}`);
    return v;
  };
  const token = env.ACCORD_TOKEN || "tusdc.accord-v1.testnet";
  // the house agents' prices and the budget are 6-decimal amounts: never post them in another token's units
  if (tenderToken(token).decimals !== 6) throw new Error(`the house keeper posts in a 6-decimal token, not ${token}`);
  return {
    board: env.TENDER_BOARD || TENDER_BOARDS.testnet!,
    buyer: { account, key },
    houseSeed,
    token,
    everyMin: num("TENDER_EVERY_MIN", 60, 0, 7 * 24 * 60),
    commitSecs: num("TENDER_COMMIT_SECS", 900, 30, 14 * 24 * 3600),
    revealSecs: num("TENDER_REVEAL_SECS", 300, 30, 3 * 24 * 3600),
  };
}

/** House agent `i`'s key, and its salt and price for a job: all derived, so a restart reveals what it bid. */
export function houseBid(seed: string, board: string, job: number, i: number) {
  const key = bidderKey(createHmac("sha256", Buffer.from(seed, "hex")).update(`agent:${i}`).digest("hex"));
  const salt = createHmac("sha256", Buffer.from(key.seed, "hex")).update(`salt:${board}:${job}`).digest("hex");
  const jitter = BigInt(createHmac("sha256", Buffer.from(key.seed, "hex")).update(`price:${job}`).digest()[0]! % 50) * 10_000n;
  const price = BASE_PRICES[i]! - jitter; // up to 0.49 USDC below the agent's base price
  return { key, salt, price, agent: HOUSE_AGENTS[i]! };
}

export type KeeperAction =
  | { kind: "post" }
  | { kind: "bid"; job: number; agent: number }
  | { kind: "reveal"; job: number; agent: number }
  | { kind: "award"; job: number };

/** What to do next, from the board alone. At most one action per job per step; posting only when no house job runs. */
export function nextActions(cfg: TenderKeeperConfig, jobs: TenderJob[], nowMs: number): KeeperAction[] {
  // only the house buyer's jobs in the house token: the house prices are amounts in that token's units
  const mine = jobs.filter((j) => j.buyer === cfg.buyer.account && j.token === cfg.token);
  const out: KeeperAction[] = [];
  for (const j of mine) {
    const ids = HOUSE_AGENTS.map((_, i) => houseBid(cfg.houseSeed, cfg.board, j.id, i).key.id);
    if (j.phase === "open") {
      // a full job takes no more bids: never pay gas for a refusal
      let room = TENDER_MAX_BIDS - j.bids.length;
      ids.forEach((id, i) => { if (room > 0 && !j.bids.some((b) => b.bidder === id)) { out.push({ kind: "bid", job: j.id, agent: i }); room--; } });
    } else if (j.phase === "revealing") {
      ids.forEach((id, i) => { if (j.bids.some((b) => b.bidder === id && b.price === null)) out.push({ kind: "reveal", job: j.id, agent: i }); });
      if (j.bids.length > 0 && j.bids.every((b) => b.price !== null)) out.push({ kind: "award", job: j.id });
    } else if (j.phase === "closed") {
      out.push({ kind: "award", job: j.id });
    }
  }
  const running = mine.some((j) => ["open", "revealing", "closed"].includes(j.phase));
  const last = Math.max(0, ...mine.map((j) => j.created_at / 1e6));
  if (!running && nowMs - last >= cfg.everyMin * 60_000) out.push({ kind: "post" });
  return out;
}

export type TimelockStep =
  | { kind: "reveal"; lock: TenderTimelock }
  | { kind: "drop"; lock: TenderTimelock; why: string };

/** What to do with stored timelocks, from the board alone: reveal while the job is revealing, drop when it never can be. */
export function timelockSteps(jobs: TenderJob[], locks: TenderTimelock[]): TimelockStep[] {
  const out: TimelockStep[] = [];
  for (const lock of locks) {
    const j = jobs.find((x) => x.id === lock.job);
    if (!j) continue; // not in the window read this step; it is read again next step
    const bid = j.bids.find((b) => b.bidder === lock.bidder);
    if (!bid) { if (j.phase !== "open") out.push({ kind: "drop", lock, why: "no such bid on the board" }); continue; }
    if (bid.commitment !== lock.commitment) { if (j.phase !== "open") out.push({ kind: "drop", lock, why: "the bid was replaced" }); continue; }
    if (bid.price !== null) out.push({ kind: "drop", lock, why: "already revealed" });
    else if (j.phase === "revealing") out.push({ kind: "reveal", lock });
    else if (j.phase !== "open") out.push({ kind: "drop", lock, why: `job is ${j.phase}` });
  }
  return out;
}

type TimelockStore = Pick<typeof tenderTimelocks, "pending" | "finish">;

export class TenderKeeper {
  private readonly board: TenderBoardClient;
  private readonly buyer: KeySigner;
  private readonly deals: HouseBuyer;
  constructor(
    private readonly cfg: TenderKeeperConfig, reader: Accord, private readonly log: (s: string) => void,
    private readonly locks: TimelockStore = tenderTimelocks,
  ) {
    this.board = new TenderBoardClient(reader.chain, cfg.board);
    this.buyer = new KeySigner(cfg.buyer.account, cfg.buyer.key, reader.chain);
    this.deals = new HouseBuyer(cfg.board, reader, this.buyer, log);
  }

  async step(): Promise<void> {
    let posted = false;
    const jobs = await this.board.jobs(20);
    for (const a of nextActions(this.cfg, jobs, Date.now())) {
      const r = await this.run(a, jobs);
      posted ||= a.kind === "post" && r.ok;
      this.log(`${a.kind}${"job" in a ? ` job ${a.job}` : ""}${"agent" in a ? ` ${HOUSE_AGENTS[a.agent]}` : ""} → ${r.ok ? r.txHash : r.failure}`);
    }
    await this.revealTimelocked(jobs);
    // the deal after an award an outside agent won: one buyer move per job per step
    const isHouseKey = (job: number, bidder: string) => HOUSE_AGENTS.some((_, i) => houseBid(this.cfg.houseSeed, this.cfg.board, job, i).key.id === bidder);
    await this.deals.step(jobs.filter((j) => j.buyer === this.cfg.buyer.account && j.token === this.cfg.token), isHouseKey);
    // bid on a new job in the same step, so its first seconds are not left to anyone filling it with junk
    if (posted) await this.step();
  }

  /** Reveals bids whose timelocked price and salt are now open; a failure is logged and retried next step. */
  private async revealTimelocked(jobs: TenderJob[]): Promise<void> {
    const pending = await this.locks.pending(this.cfg.board).catch((e: Error) => { this.log(`timelocks: ${e.message}`); return []; });
    for (const s of timelockSteps(jobs, pending)) {
      const { lock } = s;
      const who = `job ${lock.job} ${lock.bidder.slice(0, 8)}`;
      if (s.kind === "drop") { await this.locks.finish(lock.board, lock.job, lock.bidder, s.why); continue; }
      try {
        const open = await openTimelockedBid(lock.ciphertext, { board: this.cfg.board, job: lock.job, bidder: lock.bidder, commitment: lock.commitment });
        if (!open) continue; // drand has not published the round yet
        const r = await this.board.reveal(this.buyer, lock.job, lock.bidder, open.price, open.salt);
        this.log(`timelock reveal ${who} → ${r.ok ? r.txHash : r.failure}`);
        if (r.ok) await this.locks.finish(lock.board, lock.job, lock.bidder, r.txHash ?? "revealed");
      } catch (e) {
        const msg = (e as Error).message;
        this.log(`timelock reveal ${who}: ${msg}`);
        // a ciphertext that does not open the commitment never will: stop paying for it
        if (/does not open|is not \{price/.test(msg)) await this.locks.finish(lock.board, lock.job, lock.bidder, msg);
      }
    }
  }

  private run(a: KeeperAction, jobs: TenderJob[]) {
    if (a.kind === "post") {
      const t = JOBS[(Math.max(0, ...jobs.map((j) => j.id)) + 1) % JOBS.length]!;
      const evidence = createHash("sha256").update(`${t.title}:${Date.now()}`).digest("hex");
      return this.board.postJob(this.buyer, { ...t, evidenceHash: evidence, budget: HOUSE_BUDGET, token: this.cfg.token, commitSecs: this.cfg.commitSecs, revealSecs: this.cfg.revealSecs });
    }
    if (a.kind === "award") return this.board.award(this.buyer, a.job);
    const h = houseBid(this.cfg.houseSeed, this.cfg.board, a.job, a.agent);
    if (a.kind === "reveal") return this.board.reveal(this.buyer, a.job, h.key.id, h.price, h.salt);
    return this.board.submitBid(this.buyer, prepareBid({ board: this.cfg.board, job: a.job, price: h.price, agent: h.agent, key: h.key, salt: h.salt }));
  }
}
