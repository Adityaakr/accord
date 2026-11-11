// Open tenders in the app: reads of the tender board (contracts/tender-board) and a relay that pays the gas for a
// bidder's signed bid, its reveal and the award. The relay holds no bidder key and cannot change a bid: the board
// checks the bidder's ed25519 signature over the commitment, and a reveal only opens a commitment the bidder made.
// Each request is checked here first (signature, window, commitment) so the relayer's gas is not spent on a call the
// board would refuse; only a request that passes counts against the job's shared allowance, so junk cannot use it up.
// A new bid carries the board's bond (TENDER_BID_BOND), attached by the relayer and returned to it on reveal; each IP
// may bring at most NEW_KEYS_PER_IP fresh bidder keys to a job per hour. Reads are cached for 2 s so many open tabs
// make one RPC call; the cache keeps at most a few hundred entries.
import "server-only";
import {
  KeySigner, TENDER_BOARDS, TenderBoardClient, commitment, verifyBidSignature, type TenderJob, type TxResult,
} from "@accord/sdk";
import { accord, config } from "./accord";
import { takeAll } from "./limiter";

export function boardId(): string {
  return process.env.TENDER_BOARD || TENDER_BOARDS[config().network] || TENDER_BOARDS.testnet!;
}
export const board = () => new TenderBoardClient(accord().chain, boardId());

let signer: KeySigner | null = null;
function relaySigner(): KeySigner {
  const id = process.env.RELAYER_ACCOUNT, key = process.env.RELAYER_KEY;
  if (!id || !key) throw new RelayError(503, "the relay is not configured on this server");
  return (signer ??= new KeySigner(id, key, accord().chain));
}

export class RelayError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const cache = new Map<string, { until: number; value: Promise<unknown> }>();
const CACHE_MAX = 300;
function cached<T>(key: string, ms: number, f: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value as Promise<T>;
  if (cache.size >= CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.until <= now) cache.delete(k);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  }
  const value = f();
  cache.set(key, { until: Date.now() + ms, value });
  value.catch(() => cache.delete(key));
  return value;
}
const forget = (id: number) => { cache.delete(`job:${id}`); cache.delete("jobs"); };

export const listJobs = () => cached("jobs", 2000, () => board().jobs(30));
export const getJob = (id: number) => cached(`job:${id}`, 2000, () => board().job(id));

export interface DealSummary { agreement: string; state: string; paid: number; refused: number; codes: string[] }

/** The linked agreement's state, for the board's last step. */
export function dealOf(agreement: string): Promise<DealSummary | null> {
  return cached(`deal:${agreement}`, 3000, async () => {
    const a = accord().agreement(agreement);
    const [view, refusals, receipts] = await Promise.all([a.get(), a.refusals(), a.receipts()]);
    return {
      agreement, state: String((view as { state?: string }).state ?? "unknown"),
      paid: receipts.length, refused: refusals.length,
      codes: [...new Set(refusals.map((r) => String((r as { code?: string }).code ?? "")).filter(Boolean))],
    };
  }).catch(() => null);
}

export function parseJobId(raw: string): number {
  if (!/^[1-9][0-9]{0,8}$/.test(raw)) throw new RelayError(400, "a job id is a positive integer");
  return Number(raw);
}

async function freshJob(id: number): Promise<TenderJob> {
  forget(id);
  const j = await getJob(id);
  if (!j) throw new RelayError(404, `no job ${id} on ${boardId()}`);
  return j;
}

/** Requests that passed their checks: per job, shared by everyone, so it is counted only after the checks. */
function spendJobAllowance(id: number, what: string) {
  if (takeAll([{ key: `tender:${what}:job:${id}`, max: 200, windowMs: 3_600_000 }])) throw new RelayError(429, `job ${id} has had its ${what} allowance for this hour`);
}
const NEW_KEYS_PER_IP = 3;

/** One submission of the same thing at a time: duplicates in flight would each pay gas for a refusal. */
const inFlight = new Set<string>();
async function once<T>(key: string, f: () => Promise<T>): Promise<T> {
  if (inFlight.has(key)) throw new RelayError(409, "the same request is already on its way");
  inFlight.add(key);
  try { return await f(); } finally { inFlight.delete(key); }
}

const result = (id: number, r: TxResult) => {
  forget(id);
  if (!r.ok) throw new RelayError(409, r.failure ?? "the board refused the call");
  return { ok: true, tx: r.txHash };
};

const isHex = (v: unknown, len: number): v is string => typeof v === "string" && v.length === len && /^[0-9a-f]+$/.test(v);

/** Relays a signed sealed bid; `ip` limits how many fresh bidder keys one caller brings to a job. */
export async function relayBid(id: number, body: unknown, ip = "") {
  const b = (body ?? {}) as Record<string, unknown>;
  const bid = { board: boardId(), job: id, bidder: b.bidder, agent: b.agent, commitment: b.commitment, nonce: b.nonce, signature: b.signature };
  if (!isHex(bid.bidder, 64) || !isHex(bid.commitment, 64) || !isHex(bid.signature, 128) || typeof bid.agent !== "string" ||
      typeof bid.nonce !== "number" || !Number.isInteger(bid.nonce) || bid.nonce < 0 || bid.nonce > 0xffffffff) {
    throw new RelayError(400, "a bid is {bidder, agent, commitment, nonce, signature}: hex key, label, hex sha256, u32, hex signature");
  }
  const checked = bid as { board: string; job: number; bidder: string; agent: string; commitment: string; nonce: number; signature: string };
  if (!verifyBidSignature(checked)) throw new RelayError(400, "the signature does not match this bid on this board and job");
  const j = await freshJob(id);
  if (j.phase !== "open") throw new RelayError(409, `job ${id} is ${j.phase}; bids are taken only while it is open`);
  const mine = j.bids.find((x) => x.bidder === checked.bidder);
  if (mine && checked.nonce <= mine.nonce) throw new RelayError(409, "a newer bid from this key is already on the board (use a higher nonce)");
  if (!mine && j.bids.length >= 32) throw new RelayError(409, "this job already holds 32 bids");
  if (!mine && takeAll([{ key: `tender:newkey:${id}:${ip}`, max: NEW_KEYS_PER_IP, windowMs: 3_600_000 }])) {
    throw new RelayError(429, `at most ${NEW_KEYS_PER_IP} new bidder keys per caller per job each hour`);
  }
  spendJobAllowance(id, "bids");
  return once(`bid:${id}:${checked.bidder}`, async () => result(id, await board().submitBid(relaySigner(), checked, !!mine)));
}

/** Relays a reveal; checks the price and salt open the stored commitment before paying for it. */
export async function relayReveal(id: number, body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!isHex(b.bidder, 64) || !isHex(b.salt, 64) || typeof b.price !== "string" || !/^[1-9][0-9]{0,30}$/.test(b.price)) {
    throw new RelayError(400, "a reveal is {bidder, price, salt}: hex key, base units as a string, hex salt");
  }
  const j = await freshJob(id);
  if (j.phase !== "revealing") throw new RelayError(409, `job ${id} is ${j.phase}; reveals are taken only while it is revealing`);
  const bid = j.bids.find((x) => x.bidder === b.bidder);
  if (!bid) throw new RelayError(404, "no bid from this key on this job");
  if (bid.price !== null) throw new RelayError(409, "this bid is already revealed");
  if (commitment(boardId(), id, b.bidder, BigInt(b.price), b.salt) !== bid.commitment) throw new RelayError(400, "this price and salt do not open the bid's commitment");
  spendJobAllowance(id, "reveal");
  const bidder = b.bidder, price = b.price, salt = b.salt;
  return once(`reveal:${id}:${bidder}`, async () => result(id, await board().reveal(relaySigner(), id, bidder, price, salt)));
}

/** Relays the award once the board allows it (anyone may ask). */
export async function relayAward(id: number) {
  const j = await freshJob(id);
  const allRevealed = j.bids.length > 0 && j.bids.every((x) => x.price !== null);
  if (!(j.phase === "closed" || (j.phase === "revealing" && allRevealed))) throw new RelayError(409, `job ${id} is ${j.phase}; the award opens when the reveal window closes or every bid is revealed`);
  spendJobAllowance(id, "award");
  return once(`award:${id}`, async () => result(id, await board().award(relaySigner(), id)));
}
