// How long OutLayer is taking to answer, read from its contract with view calls only (no key, no cost).
//
// An agreement gets three negotiation attempts, and each must be answered inside NEAR's yield: 200 blocks, about
// `YIELD_SECS` on testnet. The Sealed Table itself runs for about `RUN_SECS`, so an attempt only succeeds when
// OutLayer's worker picks the request up within the difference. When the worker is further behind than that, every
// attempt expires and the agreement ends `NoDeal` (DECISIONS.md section 36).
//
// OutLayer keeps each unanswered request readable (`get_request(id)`, with the `timestamp` it was made at) and
// removes it when it is answered or its yield ends. `get_stats` counts the requests that have finished, so the
// unanswered ones sit at ids from about that count upwards. Their ages say how far behind the worker is: with the
// worker keeping up, nothing waits long; with it behind, several requests sit unanswered for most of a yield.
// Whoever is about to call `start_negotiation` reads this first and holds the attempt while the queue is slow.

import type { Chain } from "./chain.js";

export interface TableQueue {
  /** Requests still unanswered */
  pending: number;
  /** Of those, how many have waited longer than `SLOW_AFTER_SECS` */
  waiting: number;
  /** Age of the oldest one, in seconds; null when nothing is pending */
  oldestSecs: number | null;
  /** true when starting a negotiation now would probably waste an attempt */
  slow: boolean;
}

/** NEAR's yield on testnet: 200 blocks at about 0.6 s (measured 14 Nov 2026). */
export const YIELD_SECS = 120;
/** How long the Sealed Table runs once a worker has picked it up (52 to 64 s from request to answer on a quiet queue). */
export const RUN_SECS = 55;
/** A request unanswered for longer than this has waited on the worker for most of what our run can spare. */
export const SLOW_AFTER_SECS = 45;
/** This many requests waiting that long means a queue; one alone can be a single long job. */
export const SLOW_WAITING = 2;

/** Ids read per round, how far below the finished count to start, and the most ids read in one call. */
const ROUND = 30, BELOW = 5, MAX_IDS = 90;
/** More failed reads than this and the reading is not trusted: a missing answer must not read as "nothing pending". */
const MAX_FAILED_READS = 3;

/** The verdict from the ages (seconds) of the pending requests. */
export function judgeQueue(ages: number[]): TableQueue {
  const waiting = ages.filter((a) => a > SLOW_AFTER_SECS).length;
  return { pending: ages.length, waiting, oldestSecs: ages.length ? Math.max(...ages) : null, slow: waiting >= SLOW_WAITING };
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
  const ages: number[] = [];
  let failed = 0;
  for (let from = Math.max(1, finished - BELOW), read = 0; read < MAX_IDS; from += ROUND, read += ROUND) {
    const ids = Array.from({ length: ROUND }, (_, i) => from + i);
    const requests = await Promise.all(ids.map((request_id) =>
      view<{ timestamp?: number | string } | null>(outlayer, "get_request", { request_id }).catch(() => { failed += 1; return null; })));
    if (failed > MAX_FAILED_READS) throw new Error(`OutLayer queue: ${failed} reads failed`);
    for (const r of requests) {
      if (!r || r.timestamp === undefined) continue;
      const at = Number(BigInt(r.timestamp) / 1_000_000n); // nanoseconds to milliseconds
      ages.push(Math.max(0, Math.round((nowMs - at) / 1000)));
    }
    // the queue ends where ids stop existing: go on only while the top of this round still had requests
    if (!requests.slice(-BELOW).some((r) => r)) break;
  }
  return judgeQueue(ages);
}

/** The same read for callers that must not fail: unknown counts as not slow, so a negotiation is never held on a read error. */
export async function tableIsSlow(chain: Chain, outlayer: string): Promise<boolean> {
  return tableQueue(chain, outlayer).then((q) => q.slow, () => false);
}
