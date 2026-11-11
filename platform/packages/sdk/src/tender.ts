// Open tenders (contracts/tender-board): a buyer posts a job, any agent bids with a sealed commitment signed by its own
// ed25519 key, bids are revealed after the deadline and the lowest valid price wins. A bidder needs no NEAR: the
// signature is what the board checks, so anyone may submit the bid for it (the app's relay route does). The bidder's
// public key in hex is also its NEAR implicit account, which becomes the vendor of the Accord agreement if it wins.
//
// What stays secret until reveal: the price and the salt. Keep both (and the key) until the reveal window opens;
// without them the bid cannot be revealed and cannot win.

import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha2";
import { baseEncode } from "near-api-js";
import type { Chain, Signer, TxResult } from "./chain.js";
import { TGAS } from "./chain.js";
const utf8 = (s: string) => new TextEncoder().encode(s);

/** The deployed boards, per network. */
export const TENDER_BOARDS: Record<string, string> = { testnet: "tender.accord-v2.testnet" };
/** NEAR the buyer attaches to `post_job` for the job's storage (the contract's POST_DEPOSIT). */
export const TENDER_POST_DEPOSIT = 250_000_000_000_000_000_000_000n;
export const TENDER_MAX_BIDS = 32;

export type TenderPhase = "open" | "revealing" | "closed" | "awarded" | "no_valid_bid" | "linked" | "cancelled";

export interface TenderBid {
  bidder: string;
  agent: string;
  commitment: string;
  nonce: number;
  committed_at: number;
  price: string | null;
  revealed_at: number | null;
}

export interface TenderJob {
  id: number;
  buyer: string;
  title: string;
  spec: string;
  evidence_hash: string;
  budget: string;
  token: string;
  created_at: number;
  commit_ends: number;
  reveal_ends: number;
  phase: TenderPhase;
  bids: TenderBid[];
  winner: string | null;
  agreement: string | null;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => {
  if (!/^([0-9a-f]{2})*$/.test(s)) throw new Error("not lowercase hex");
  return Uint8Array.from(s.match(/../g) ?? [], (x) => parseInt(x, 16));
};
const random32 = () => crypto.getRandomValues(new Uint8Array(32));

/** A bidder's key: a 32-byte ed25519 seed, kept by the agent. */
export interface BidderKey {
  /** Hex of the 32-byte seed. Secret. */
  seed: string;
  /** Hex of the public key: the bidder id on the board and its NEAR implicit account. */
  id: string;
}

export function newBidderKey(): BidderKey {
  return bidderKey(hex(random32()));
}

export function bidderKey(seedHex: string): BidderKey {
  const seed = unhex(seedHex);
  if (seed.length !== 32) throw new Error("a bidder seed is 32 bytes of hex");
  return { seed: seedHex, id: hex(ed25519.getPublicKey(seed)) };
}

/** The same key as a NEAR key string (`ed25519:<base58 seed+public>`), to sign transactions as the implicit account. */
export function bidderNearKey(k: BidderKey): string {
  const seed = unhex(k.seed);
  const pub = ed25519.getPublicKey(seed);
  const full = new Uint8Array(64);
  full.set(seed);
  full.set(pub, 32);
  return `ed25519:${baseEncode(full)}`;
}

/** The text a bidder hashes; must match `commitment_message` in the contract byte for byte. */
export function commitmentMessage(board: string, job: number, bidder: string, price: bigint, salt: string): string {
  return `accord-tender:v1:commit:${board}:${job}:${bidder}:${price}:${salt}`;
}

/** The text a bidder signs; must match `bid_message` in the contract byte for byte. */
export function bidMessage(board: string, job: number, nonce: number, commitment: string, agent: string): string {
  return `accord-tender:v1:bid:${board}:${job}:${nonce}:${commitment}:${agent}`;
}

export function commitment(board: string, job: number, bidder: string, price: bigint, salt: string): string {
  return hex(sha256(utf8(commitmentMessage(board, job, bidder, price, salt))));
}

/** A sealed bid ready to submit, and the secret part needed later to reveal it. */
export interface SealedBid {
  board: string;
  job: number;
  bidder: string;
  agent: string;
  commitment: string;
  nonce: number;
  signature: string;
  /** Keep secret until the reveal window: */
  secret: { price: string; salt: string };
}

export interface PrepareBidOptions {
  board: string;
  job: number;
  /** Base units of the job's token (6 decimals). */
  price: bigint | string;
  agent: string;
  key: BidderKey;
  /** Higher than any earlier bid by this key on this job; default: milliseconds since 2026-01-01, so a later call is higher. */
  nonce?: number;
  salt?: string;
}

export function validAgentLabel(agent: string): boolean {
  const a = agent.trim();
  return a.length > 0 && [...a].length <= 64 && !a.includes(":");
}

export function prepareBid(o: PrepareBidOptions): SealedBid {
  const price = BigInt(o.price);
  if (price <= 0n) throw new Error("the price must be more than 0");
  const agent = o.agent.trim();
  if (!validAgentLabel(agent)) throw new Error("agent label: 1 to 64 characters, no ':'");
  const salt = o.salt ?? hex(random32());
  const nonce = o.nonce ?? Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 1000);
  if (!Number.isInteger(nonce) || nonce < 0 || nonce > 0xffffffff) throw new Error("nonce must fit in u32");
  const c = commitment(o.board, o.job, o.key.id, price, salt);
  const signature = hex(ed25519.sign(utf8(bidMessage(o.board, o.job, nonce, c, agent)), unhex(o.key.seed)));
  return { board: o.board, job: o.job, bidder: o.key.id, agent, commitment: c, nonce, signature, secret: { price: price.toString(), salt } };
}

/** Checks a submitted bid's signature as the board will, so a relay can reject a bad one before paying gas. */
export function verifyBidSignature(b: Pick<SealedBid, "board" | "job" | "bidder" | "agent" | "commitment" | "nonce" | "signature">): boolean {
  try {
    if (!/^[0-9a-f]{64}$/.test(b.bidder) || !/^[0-9a-f]{64}$/.test(b.commitment) || !/^[0-9a-f]{128}$/.test(b.signature)) return false;
    if (!validAgentLabel(b.agent) || b.agent !== b.agent.trim()) return false;
    return ed25519.verify(unhex(b.signature), utf8(bidMessage(b.board, b.job, b.nonce, b.commitment, b.agent)), unhex(b.bidder));
  } catch {
    return false;
  }
}

/** The board's views and calls. Calls take a `Signer`; `submitBid` and `reveal` may be signed by anyone. */
export class TenderBoardClient {
  constructor(readonly chain: Chain, readonly board: string) {}

  job(id: number): Promise<TenderJob | null> {
    return this.chain.view<TenderJob | null>(this.board, "get_job", { id });
  }
  jobs(limit = 20, from?: number): Promise<TenderJob[]> {
    return this.chain.view<TenderJob[]>(this.board, "list_jobs", { from: from ?? null, limit });
  }
  count(): Promise<number> {
    return this.chain.view<number>(this.board, "job_count", {});
  }

  postJob(s: Signer, j: { title: string; spec: string; evidenceHash: string; budget: bigint | string; token: string; commitSecs: number; revealSecs: number }): Promise<TxResult> {
    return s.call(this.board, "post_job", {
      title: j.title, spec: j.spec, evidence_hash: j.evidenceHash, budget: BigInt(j.budget).toString(), token: j.token,
      commit_secs: j.commitSecs, reveal_secs: j.revealSecs,
    }, { deposit: TENDER_POST_DEPOSIT, gas: 50n * TGAS });
  }
  submitBid(s: Signer, b: SealedBid | Omit<SealedBid, "secret">): Promise<TxResult> {
    return s.call(this.board, "submit_bid", { job: b.job, bidder: b.bidder, commitment: b.commitment, agent: b.agent, nonce: b.nonce, signature: b.signature }, { gas: 50n * TGAS });
  }
  reveal(s: Signer, job: number, bidder: string, price: bigint | string, salt: string): Promise<TxResult> {
    return s.call(this.board, "reveal_bid", { job, bidder, price: BigInt(price).toString(), salt }, { gas: 50n * TGAS });
  }
  award(s: Signer, job: number): Promise<TxResult> {
    return s.call(this.board, "award", { job }, { gas: 50n * TGAS });
  }
  cancel(s: Signer, job: number): Promise<TxResult> {
    return s.call(this.board, "cancel_job", { job }, { gas: 30n * TGAS });
  }
  link(s: Signer, job: number, agreementId: number): Promise<TxResult> {
    return s.call(this.board, "link_agreement", { job, agreement_id: agreementId }, { gas: 80n * TGAS });
  }
}

/** The winning bid of an awarded job, or null. */
export function winningBid(j: TenderJob): TenderBid | null {
  return j.winner ? (j.bids.find((b) => b.bidder === j.winner) ?? null) : null;
}

/** Seconds until the current window closes (commit while open, reveal while revealing), or 0. */
export function secondsLeft(j: TenderJob, nowMs = Date.now()): number {
  const end = j.phase === "open" ? j.commit_ends : j.phase === "revealing" ? j.reveal_ends : 0;
  return end ? Math.max(0, Math.ceil((end / 1e6 - nowMs) / 1000)) : 0;
}
