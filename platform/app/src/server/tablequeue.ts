// OutLayer's queue as the app shows it: one live read shared by every visitor. `tableQueue` costs 30 to 90 view
// calls, so the reading is kept for 20 s (shorter than the 45 s a request must wait to count as waiting) and
// concurrent renders share one read. A read that fails or takes over 4 s is "unreadable" (null), kept for 5 s,
// and never shown as fast.

import "server-only";
import { tableQueue, type TableQueue } from "@accord/sdk";
import { accord } from "./accord";

export interface QueueReading {
  queue: TableQueue;
  /** when it was read, unix milliseconds */
  at: number;
}

const TTL_MS = 20_000;
const FAIL_TTL_MS = 5_000;
const READ_MS = 4_000;
const cache = new Map<string, { at: number; value: QueueReading | null }>();
const flying = new Map<string, Promise<QueueReading | null>>();

async function read(outlayer: string): Promise<QueueReading | null> {
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), READ_MS));
  const queue = await Promise.race([tableQueue(accord().chain, outlayer).catch(() => null), timeout]);
  return queue ? { queue, at: Date.now() } : null;
}

/** The current reading for this OutLayer account, or null when it cannot be read. */
export async function queueReading(outlayer?: string): Promise<QueueReading | null> {
  const id = outlayer ?? (await accord().config().then((c) => c.outlayer, () => null));
  if (!id) return null;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < (hit.value ? TTL_MS : FAIL_TTL_MS)) return hit.value;
  let p = flying.get(id);
  if (!p) {
    p = read(id).then((value) => { cache.set(id, { at: Date.now(), value }); return value; }).finally(() => flying.delete(id));
    flying.set(id, p);
  }
  return p;
}
