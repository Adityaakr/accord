// Caps how long a request waits on the chain. A transaction (start_negotiation waits for the enclave's callback) or a
// busy RPC can take minutes; the browser should not hold a request open that long. `settleWithin` returns the work's
// result if it settles in time, else `null`, and lets the work run on: the caller answers "pending, poll again" and
// keeps its per-room lock until the work is done, so a second call never sends the same move twice.

/** The longest a demo endpoint holds a request before answering "pending" (ms). */
export const REQUEST_DEADLINE_MS = 15_000;

export async function settleWithin<T>(work: Promise<T>, ms: number): Promise<{ done: true; value: T } | { done: false }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<{ done: false }>((r) => { timer = setTimeout(() => r({ done: false }), ms); });
  try {
    return await Promise.race([work.then((value) => ({ done: true as const, value })), late]);
  } finally {
    clearTimeout(timer);
  }
}

/** Rejects with a busy-RPC error (the pages' error boundary reads again) when `work` takes longer than `ms`. */
export async function readWithin<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  const r = await settleWithin(work, ms);
  if (r.done) return r.value;
  work.catch(() => undefined); // its late failure is not unhandled
  throw Object.assign(new Error(`NEAR RPC unavailable: ${what} took longer than ${ms / 1000} s`), { code: "RPC_UNAVAILABLE" });
}
