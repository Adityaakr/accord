// How long OutLayer is taking to answer, read from its contract with view calls only (no key, no cost).
//
// An agreement gets three negotiation attempts, and each must be answered inside NEAR's yield (about 200 blocks).
// When OutLayer's worker is behind, every attempt expires and the agreement ends `NoDeal` (DECISIONS.md section 36).
// OutLayer keeps each unanswered request in state with the time it was made and removes it when it is answered or
// its yield ends, so the ages of the requests still pending among the newest ids say how far behind the worker is.
// Whoever is about to call `start_negotiation` reads this first and holds the attempt while the queue is slow.

import type { Chain } from "./chain.js";

export interface TableQueue {
  /** Requests still unanswered among the newest ids looked at */
  pending: number;
  /** Of those, how many have waited longer than `SLOW_AFTER_SECS` */
  waiting: number;
  /** Age of the oldest one, in seconds; null when nothing is pending */
  oldestSecs: number | null;
  /** true when starting a negotiation now would probably waste an attempt */
  slow: boolean;
}

/** How many of the newest request ids to read. */
export const QUEUE_LOOK_BACK = 30;
/** A request older than this is waiting on the worker, not running: our own negotiation is answered in about a minute. */
export const SLOW_AFTER_SECS = 60;
/** This many requests waiting that long means a queue, not one long job. */
export const SLOW_WAITING = 3;

/** The verdict from the ages (seconds) of the pending requests. */
export function judgeQueue(ages: number[]): TableQueue {
  const waiting = ages.filter((a) => a > SLOW_AFTER_SECS).length;
  return { pending: ages.length, waiting, oldestSecs: ages.length ? Math.max(...ages) : null, slow: waiting >= SLOW_WAITING };
}

/** Reads OutLayer's newest requests. Throws when its contract cannot be read; callers decide what unknown means. */
export async function tableQueue(chain: Chain, outlayer: string, nowMs: number = Date.now()): Promise<TableQueue> {
  const [total] = await chain.view<[number, string]>(outlayer, "get_stats", {});
  const ids = Array.from({ length: QUEUE_LOOK_BACK }, (_, i) => total + 1 - i).filter((id) => id > 0);
  const requests = await Promise.all(ids.map((request_id) =>
    chain.view<{ timestamp?: number | string } | null>(outlayer, "get_request", { request_id }).catch(() => null)));
  const ages = requests.flatMap((r) => {
    if (!r || r.timestamp === undefined) return [];
    const at = Number(BigInt(r.timestamp) / 1_000_000n); // nanoseconds to milliseconds
    return [Math.max(0, Math.round((nowMs - at) / 1000))];
  });
  return judgeQueue(ages);
}

/** The same read for callers that must not fail: unknown counts as not slow, so a negotiation is never held on a read error. */
export async function tableIsSlow(chain: Chain, outlayer: string): Promise<boolean> {
  return tableQueue(chain, outlayer).then((q) => q.slow, () => false);
}
