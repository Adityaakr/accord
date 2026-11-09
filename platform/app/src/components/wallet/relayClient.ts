// Sending one signed delegate through Accord's relayer and waiting for its outcome, as one awaited promise. POST
// /api/relay answers within about 10 s with the relayer transaction's hash; this then polls GET /api/relay/status until
// the call is final and returns the outcome (the user's call as its status), exactly what the route used to hold the
// request open for. No request is held long: each post or poll is short, and a busy network is waited out here.
//
// No "use client": pure apart from the default fetch and timers, so it is unit-tested.

/** Tries left and the wait before each when the relayer answers 503 (the network busy) to the post. */
export const RELAY_BUSY_WAITS_MS = [3_000, 8_000, 15_000];
/** The wait before each status poll; the last one repeats. */
export const POLL_WAITS_MS = [800, 1_200, 1_500, 2_000, 2_500];
/** How long to poll before giving up on a sent call (the delegate's own expiry is about 5 minutes). */
export const MAX_POLL_MS = 240_000;
/** No single post or poll may take longer than this. */
const REQUEST_TIMEOUT_MS = 25_000;

export interface RelayClientOptions {
  post?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  busyWaits?: number[];
  pollWaits?: number[];
  maxPollMs?: number;
}

type Body = { outcome?: unknown; error?: string; busy?: boolean; hash?: string; sender?: string; final?: boolean };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Posts the delegate and polls until it is final. Throws an Error with the relayer's words when it refuses the call
 * (its policy, a busy network that never cleared) or the network refused it (the relayer's transaction failed, such
 * as AccessKeyNotFound for a deleted key). A refusal by the contract is not thrown: it is the outcome's status, as before.
 * On a busy 503 the same delegate is posted again: a delegate carries its own nonce, so a repeat runs nothing twice.
 */
export async function relayAndWait(signedDelegate: string, o: RelayClientOptions = {}): Promise<unknown> {
  const post = o.post ?? fetch, sleep = o.sleep ?? wait, now = o.now ?? Date.now;
  const busyWaits = o.busyWaits ?? RELAY_BUSY_WAITS_MS, pollWaits = o.pollWaits ?? POLL_WAITS_MS;
  let sent: Body;
  for (let attempt = 0; ; attempt++) {
    const res = await post("/api/relay", {
      method: "POST", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), headers: { "content-type": "application/json" }, body: JSON.stringify({ signedDelegate }),
    });
    const body = (await res.json().catch(() => ({}))) as Body;
    if (res.status === 503 && body.busy && attempt < busyWaits.length) {
      await sleep(busyWaits[attempt]!);
      continue;
    }
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    if (body.outcome) return body.outcome; // a relayer that still waits for the outcome itself
    if (!body.hash || !body.sender) throw new Error(body.error ?? "the relayer returned no transaction");
    sent = body;
    break;
  }
  const started = now();
  const url = `/api/relay/status?hash=${encodeURIComponent(sent.hash!)}&sender=${encodeURIComponent(sent.sender!)}`;
  for (let i = 0; ; i++) {
    if (now() - started > (o.maxPollMs ?? MAX_POLL_MS)) {
      throw new Error(`the call was sent (tx ${sent.hash}) but is not final yet; check the room in a moment`);
    }
    await sleep(pollWaits[Math.min(i, pollWaits.length - 1)]!);
    let res: Response;
    try {
      res = await post(url, { method: "GET", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch {
      continue; // a dropped poll: the call is on chain or on its way either way
    }
    const body = (await res.json().catch(() => ({}))) as Body;
    if (res.ok && body.final && body.outcome) return body.outcome;
    if (res.ok || (res.status === 503 && body.busy) || res.status === 429) continue;
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}
