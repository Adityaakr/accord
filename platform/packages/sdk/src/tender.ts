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
export const TENDER_BOARDS: Record<string, string> = { testnet: "tender-v2.accord-v2.testnet" };
/** The first board (tender.accord-v2.testnet, 11 Nov 2026), replaced after its audit; its jobs 1 to 4 stay readable. */
export const TENDER_BOARD_V1 = "tender.accord-v2.testnet";
/** NEAR the buyer attaches to `post_job` for the job's storage (the contract's POST_DEPOSIT). */
export const TENDER_POST_DEPOSIT = 300_000_000_000_000_000_000_000n;
/**
 * NEAR attached to each new bid by whoever submits it (the contract's BID_BOND): back to that payer when the bid is
 * revealed or the job is cancelled, forfeited to the buyer when the bid is left unrevealed. A bidder with no NEAR has
 * the relay attach it.
 */
export const TENDER_BID_BOND = 20_000_000_000_000_000_000_000n;
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
  bond_payer: string;
  bond_held: boolean;
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
  /** Base units of the job's token: use its decimals (tenderToken(job.token).decimals), never assume 6. */
  price: bigint | string;
  agent: string;
  key: BidderKey;
  /** Higher than any earlier bid by this key on this job; default: seconds since 2026-01-01 (use `nextNonce` to re-bid). */
  nonce?: number;
  salt?: string;
}

/**
 * An agent label as the board accepts it: 1 to 64 printable ASCII characters or spaces, no ':', no leading or
 * trailing space. Never trimmed, so the label signed is the label stored.
 */
export function validAgentLabel(agent: string): boolean {
  return /^[\x20-\x39\x3b-\x7e]{1,64}$/.test(agent) && !agent.startsWith(" ") && !agent.endsWith(" ");
}

export function prepareBid(o: PrepareBidOptions): SealedBid {
  const price = BigInt(o.price);
  if (price <= 0n) throw new Error("the price must be more than 0");
  const agent = o.agent;
  if (!validAgentLabel(agent)) throw new Error("agent label: 1 to 64 printable ASCII characters, no ':', no leading or trailing space");
  const salt = o.salt ?? hex(random32());
  if (!/^[0-9a-f]{64}$/.test(salt)) throw new Error("the salt is 32 bytes of lowercase hex");
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
    if (!validAgentLabel(b.agent)) return false;
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
  /** `replacing`: true when this key already has a bid on the job (a replacement attaches no bond). */
  submitBid(s: Signer, b: SealedBid | Omit<SealedBid, "secret">, replacing = false): Promise<TxResult> {
    return s.call(this.board, "submit_bid", { job: b.job, bidder: b.bidder, commitment: b.commitment, agent: b.agent, nonce: b.nonce, signature: b.signature },
      { gas: 50n * TGAS, deposit: replacing ? 0n : TENDER_BID_BOND });
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

/**
 * The secrets a bidder keeps per job, keyed by commitment: a re-bid adds an entry instead of overwriting, so the
 * bid that is actually on chain can always be revealed, whichever submission landed.
 */
export interface BidSecrets {
  bidder: string;
  entries: { commitment: string; price: string; salt: string; nonce: number }[];
}

export function parseBidSecrets(text: string | null): BidSecrets | null {
  if (!text) return null;
  const v = JSON.parse(text) as Partial<BidSecrets> & { price?: string; salt?: string; commitment?: string; nonce?: number };
  if (Array.isArray(v.entries)) return { bidder: String(v.bidder), entries: v.entries };
  // the single-entry shape written before 11 Nov 2026
  if (v.price && v.salt && v.commitment) return { bidder: String(v.bidder), entries: [{ commitment: v.commitment, price: v.price, salt: v.salt, nonce: v.nonce ?? 0 }] };
  return null;
}

export function addBidSecret(prev: string | null, b: SealedBid): string {
  const cur = parseBidSecrets(prev);
  const entries = (cur && cur.bidder === b.bidder ? cur.entries : []).filter((e) => e.commitment !== b.commitment);
  entries.push({ commitment: b.commitment, price: b.secret.price, salt: b.secret.salt, nonce: b.nonce });
  return JSON.stringify({ bidder: b.bidder, entries } satisfies BidSecrets, null, 2);
}

/** The kept entry that opens the bid the board holds for this bidder, or null. */
export function secretFor(text: string | null, onChain: Pick<TenderBid, "bidder" | "commitment">): BidSecrets["entries"][number] | null {
  const cur = parseBidSecrets(text);
  if (!cur || cur.bidder !== onChain.bidder) return null;
  return cur.entries.find((e) => e.commitment === onChain.commitment) ?? null;
}

/** A nonce above every one this bidder used on the job, here or on chain, and not below the clock default. */
export function nextNonce(text: string | null, onChainNonce: number | null, nowMs = Date.now()): number {
  const kept = parseBidSecrets(text)?.entries.map((e) => e.nonce) ?? [];
  const clock = Math.floor((nowMs - Date.UTC(2026, 0, 1)) / 1000);
  return Math.max(clock, ...kept.map((n) => n + 1), (onChainNonce ?? -1) + 1);
}

/** Board ids are NEAR account ids; checked before one is used in a file path. */
export const isBoardId = (s: string): boolean => /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/.test(s) && !s.includes("..");

/** What a bidder key signs to say "the account <account> runs me": the app links the key to that account's dashboard. */
export const linkMessage = (account: string): string => `accord-tender:v1:link:${account}`;

/** The hex ed25519 signature of `linkMessage(account)` by this bidder key. */
export function signLink(key: BidderKey, account: string): string {
  return hex(ed25519.sign(utf8(linkMessage(account)), unhex(key.seed)));
}

export function verifyLink(bidder: string, account: string, signature: string): boolean {
  try {
    if (!/^[0-9a-f]{64}$/.test(bidder) || !/^[0-9a-f]{128}$/.test(signature)) return false;
    return ed25519.verify(unhex(signature), utf8(linkMessage(account)), unhex(bidder));
  } catch {
    return false;
  }
}

/**
 * The tokens a job's budget can be in. The board stores amounts as raw base units and never reads the token, so every
 * client must use the job's own decimals: a 6-decimal price on a 24-decimal job would be a near-zero bid that wins.
 * `links`: whether this board (whose factory is accord-v2.testnet) can link the winner's agreement for this token.
 */
export interface TenderToken { id: string; symbol: string; decimals: number; label: string; links: boolean }
export const TENDER_TOKENS: TenderToken[] = [
  { id: "tusdc.accord-v1.testnet", symbol: "tUSDC", decimals: 6, label: "tUSDC (test token)", links: true },
  { id: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af", symbol: "USDC", decimals: 6, label: "Circle USDC (testnet)", links: false },
  { id: "wrap.testnet", symbol: "NEAR", decimals: 24, label: "NEAR (wrapped, wrap.testnet)", links: false },
]

/** The job token's entry; an unknown token is an error (never guess its decimals). */
export function tenderToken(id: string): TenderToken {
  const t = TENDER_TOKENS.find((x) => x.id === id)
  if (!t) throw new Error(`unknown tender token ${id}: its decimals are not known here`)
  return t
}

/** A human amount for a job's token: 2 places for 6-decimal tokens, up to 4 for NEAR, no float. */
export function tenderAmount(base: string | bigint, token: string): string {
  const t = tenderToken(token)
  const v = BigInt(base)
  const unit = 10n ** BigInt(t.decimals)
  const places = t.decimals > 6 ? 4 : 2
  const whole = v / unit
  const frac = ((v % unit) * 10n ** BigInt(places)) / unit
  if (v > 0n && whole === 0n && frac === 0n) return t.decimals > 6 ? "<0.0001" : "<0.01"
  let f = frac.toString().padStart(places, "0")
  if (t.decimals > 6) f = f.replace(/0+$/, "").padEnd(2, "0")
  return `${whole}.${f}`
}

/** Parses a human amount for a job's token into base units (at most 6 fractional digits typed). */
export function parseTenderAmount(text: string, token: string): bigint {
  const t = tenderToken(token)
  const m = /^(\d{1,12})(?:\.(\d{1,6}))?$/.exec(text.trim())
  if (!m) throw new Error("an amount like 34.50 (up to 6 decimals)")
  return BigInt(m[1]!) * 10n ** BigInt(t.decimals) + BigInt((m[2] ?? "").padEnd(t.decimals, "0").slice(0, t.decimals) || "0")
}

/**
 * What a bidder key signs to hand the relay its timelocked reveal for a bid already on the board (one sent on chain
 * directly, or before it carried a timelock): the board, job, commitment and the ciphertext's sha256. The keeper opens
 * it after the drand round and reveals, so the bid is revealed even if its agent is offline.
 */
export const timelockMessage = (board: string, job: number, commitment: string, ciphertextSha256: string): string =>
  `accord-tender:v1:timelock:${board}:${job}:${commitment}:${ciphertextSha256}`;

export function signTimelock(key: BidderKey, board: string, job: number, commitment: string, ciphertextSha256: string): string {
  return hex(ed25519.sign(utf8(timelockMessage(board, job, commitment, ciphertextSha256)), unhex(key.seed)));
}

export function verifyTimelock(bidder: string, board: string, job: number, commitment: string, ciphertextSha256: string, signature: string): boolean {
  try {
    if (!/^[0-9a-f]{64}$/.test(bidder) || !/^[0-9a-f]{128}$/.test(signature)) return false;
    return ed25519.verify(unhex(signature), utf8(timelockMessage(board, job, commitment, ciphertextSha256)), unhex(bidder));
  } catch {
    return false;
  }
}
