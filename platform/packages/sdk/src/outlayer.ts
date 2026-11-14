// How long OutLayer is taking to answer, read from its contract with view calls only (no key, no cost).
//
// An agreement gets three negotiation attempts, and each must be answered inside NEAR's yield: 200 blocks, about
// `YIELD_SECS` on testnet. The Sealed Table itself runs for about `RUN_SECS`, so an attempt only succeeds when
// OutLayer's worker picks the request up within the difference. When the worker is further behind than that, every
// attempt expires and the agreement ends `NoDeal` (DECISIONS.md section 36).
//
// OutLayer keeps each unanswered request readable (`get_request(id)`, with the `timestamp` it was made at) and
// removes it when it is answered or its yield ends. `get_stats` counts the requests that have finished, so the
// unanswered ones sit at ids from about that count upwards, in the order they were made.
//
// Old unanswered requests alone prove little: some projects' jobs hang until their yield ends while newer requests
// are answered in seconds. What shows a worker that is behind is the newest requests: when the newest several are
// all still unanswered and the oldest of that unbroken run has waited longer than our run can spare, nothing asked
// recently has been answered, and a negotiation started now would wait at least that long. An answered request
// anywhere in between (a missing id with unanswered ones below it) means the worker is answering, and ends the run.
// Whoever is about to call `start_negotiation` reads this first and holds the attempt while the queue is slow.

import type { Chain } from "./chain.js";

export interface TableQueue {
  /** Requests still unanswered, whatever their age */
  pending: number;
  /** The newest requests in a row that are all unanswered (the run that ends at the newest id) */
  unanswered: number;
  /** Age of the oldest request in that run, in seconds: nothing asked since then has been answered. null when the run is empty */
  sinceSecs: number | null;
  /** true when starting a negotiation now would probably waste an attempt */
  slow: boolean;
  /**
   * The accounts whose requests make up that run (`sender_id` on each request, as OutLayer's contract reports it),
   * each once, the longest waiting first. These are whoever is waiting on the same worker, not a cause.
   */
  senders: string[];
}

/** NEAR's yield on testnet: 200 blocks at about 0.58 s (measured 14 Nov 2026). */
export const YIELD_SECS = 116;
/** How long the Sealed Table runs once a worker has picked it up (41 to 64 s from request to answer on a quiet queue). */
export const RUN_SECS = 55;
/** The newest run counts as a queue once its oldest request has waited this long: about what our run can spare. */
export const SLOW_AFTER_SECS = 45;
/** ...and it is at least this many requests long, so one or two slow jobs are not read as a queue. */
export const SLOW_RUN = 3;

/** Ids read per round, how far below the finished count to start, and the most ids read in one call. */
const ROUND = 30, BELOW = 5, MAX_IDS = 90;
/** More failed reads than this and the reading is not trusted: a missing answer must not read as "nothing pending". */
const MAX_FAILED_READS = 3;

/** The verdict from the unanswered requests (id and age in seconds), in any order. */
export function judgeQueue(requests: { id: number; age: number; sender?: string }[]): TableQueue {
  const newestFirst = [...requests].sort((a, b) => b.id - a.id);
  const run = newestFirst.filter((r, i) => r.id === newestFirst[0]!.id - i); // unbroken from the newest id down
  const sinceSecs = run.length ? Math.max(...run.map((r) => r.age)) : null;
  const senders = [...new Set([...run].sort((a, b) => b.age - a.age || a.id - b.id).flatMap((r) => (r.sender ? [r.sender] : [])))];
  return {
    pending: requests.length, unanswered: run.length, sinceSecs, senders,
    slow: run.length >= SLOW_RUN && sinceSecs !== null && sinceSecs >= SLOW_AFTER_SECS,
  };
}

type View = <T>(contractId: string, method: string, args?: object) => Promise<T>;

/**
 * Reads OutLayer's unanswered requests. `nowMs` is the time to measure ages against: pass the chain's clock
 * (`agreement.now * 1000`) where the local one may be wrong. Throws when the contract cannot be read well enough to
 * trust; callers decide what unknown means.
 */
export async function tableQueue(chain: { view: View } | Chain, outlayer: string, nowMs: number = Date.now()): Promise<TableQueue> {
  const view = (chain as { view: View }).view.bind(chain);
  const [finished] = await view<[number, string]>(outlayer, "get_stats", {});
  const pending: { id: number; age: number; sender?: string }[] = [];
  let failed = 0;
  for (let from = Math.max(1, finished - BELOW), read = 0; read < MAX_IDS; from += ROUND, read += ROUND) {
    const ids = Array.from({ length: ROUND }, (_, i) => from + i);
    const requests = await Promise.all(ids.map((request_id) =>
      view<{ timestamp?: number | string; sender_id?: string } | null>(outlayer, "get_request", { request_id }).catch(() => { failed += 1; return null; })));
    if (failed > MAX_FAILED_READS) throw new Error(`OutLayer queue: ${failed} reads failed`);
    requests.forEach((r, i) => {
      if (!r || r.timestamp === undefined) return;
      const at = Number(BigInt(r.timestamp) / 1_000_000n); // nanoseconds to milliseconds
      pending.push({ id: ids[i]!, age: Math.max(0, Math.round((nowMs - at) / 1000)), sender: typeof r.sender_id === "string" ? r.sender_id : undefined });
    });
    // the queue ends where ids stop existing: go on only while the top of this round still had requests
    if (!requests.slice(-BELOW).some((r) => r)) break;
  }
  return judgeQueue(pending);
}

/** The same read for callers that must not fail: unknown counts as not slow, so a negotiation is never held on a read error. */
export async function tableIsSlow(chain: Chain, outlayer: string): Promise<boolean> {
  return tableQueue(chain, outlayer).then((q) => q.slow, () => false);
}
