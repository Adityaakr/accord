// The browser's chain reads go through the app's own server (/api/chain), never straight to a public NEAR RPC: a
// tab that polls a room would otherwise be rate limited by the public endpoint, and every refused request shows up
// in the visitor's console. This module is the proxy's whole logic, pure of server-only so it is testable:
//
// - Only reads: `query` for view_account, call_function, view_access_key and view_access_key_list, and `block`.
//   Nothing that signs or sends is forwarded; transactions still go through the wallet or Accord's relayer.
// - A short cache per request: about 2.5 s for state, 5 s for balances, 60 s for a read at a fixed past block, and
//   concurrent identical reads share one upstream request.
// - Upstream failover across the server's endpoints on rate limits and transport failures only, like the SDK's
//   RotatingRpcProvider. Every other answer, an error included (UNKNOWN_ACCOUNT, a contract panic), goes back
//   exactly as the node gave it, so the browser's SDK parses it as it always did.
// - When every endpoint is busy the answer is still HTTP 200, carrying a JSON-RPC -429 error the SDK reads as
//   "busy, retry quietly", so the visitor's console stays clean.

export interface RpcRequestBody {
  jsonrpc?: string;
  id?: string | number;
  method: string;
  params: Record<string, unknown>;
}

export interface RpcResponseBody {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code?: number; message?: string; name?: string; cause?: { name?: string; info?: unknown }; data?: unknown };
}

const QUERY_TYPES = new Set(["view_account", "call_function", "view_access_key", "view_access_key_list"]);
const BALANCE_METHODS = new Set(["ft_balance_of", "storage_balance_of"]);

export const TTL = { state: 2_500, balance: 5_000, block: 2_000, pinned: 60_000 } as const;

/** Checks a JSON-RPC body is a read this proxy forwards. Returns an error message, or null when it is allowed. */
export function refuseRead(body: unknown): string | null {
  if (!body || typeof body !== "object") return "a JSON-RPC body is required";
  const b = body as Partial<RpcRequestBody>;
  if (typeof b.method !== "string") return "method is required";
  if (!b.params || typeof b.params !== "object" || Array.isArray(b.params)) return "params must be an object";
  if (b.method === "block") return null;
  if (b.method !== "query") return `${b.method} is not a read this server forwards`;
  const t = b.params.request_type;
  if (typeof t !== "string" || !QUERY_TYPES.has(t)) return `query ${String(t)} is not a read this server forwards`;
  if (typeof b.params.account_id !== "string" || b.params.account_id.length > 128) return "account_id is required";
  return null;
}

/** How long one read's answer is kept. */
export function ttlFor(b: RpcRequestBody): number {
  const p = b.params;
  if (p.block_id !== undefined) return TTL.pinned;
  if (b.method === "block") return TTL.block;
  if (p.request_type === "view_account") return TTL.balance;
  if (p.request_type === "call_function" && BALANCE_METHODS.has(String(p.method_name))) return TTL.balance;
  return TTL.state;
}

/** The cache key: method and params, independent of the caller's JSON-RPC id. */
export function readKey(b: RpcRequestBody): string {
  const p = b.params;
  return `${b.method}|${JSON.stringify(Object.keys(p).sort().map((k) => [k, p[k]]))}`;
}

const RATE_LIMIT = /rate.?limit|too many requests/i;

/** An upstream answer that means "this endpoint is busy, ask another", as opposed to the read's own answer. */
export function upstreamBusy(status: number, body: RpcResponseBody | null): boolean {
  if (status === 429 || status === 408 || status >= 500) return true;
  if (!body || (body.result === undefined && body.error === undefined)) return true;
  const e = body.error;
  if (!e) return false;
  if (e.code === -429) return true;
  // a nearcore error has a name and a cause; anything else that mentions a rate limit is a gateway speaking
  return !e.cause && RATE_LIMIT.test(`${e.message ?? ""} ${typeof e.data === "string" ? e.data : ""}`);
}

export const BUSY_MESSAGE = "Rate limited: the network is busy";

export function busyBody(id: string | number): RpcResponseBody {
  return { jsonrpc: "2.0", id, error: { code: -429, message: BUSY_MESSAGE } };
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** Sends one read to the first endpoint that answers as a node, or returns null when every endpoint is busy. */
export async function forward(urls: string[], b: RpcRequestBody, opts: { fetch?: Fetch; timeoutMs?: number } = {}): Promise<RpcResponseBody | null> {
  const f = opts.fetch ?? ((u, i) => fetch(u, i));
  const payload = JSON.stringify({ jsonrpc: "2.0", id: "accord", method: b.method, params: b.params });
  for (const url of urls) {
    try {
      const res = await f(url, {
        method: "POST", headers: { "content-type": "application/json" }, body: payload, signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
      });
      const body = (await res.json().catch(() => null)) as RpcResponseBody | null;
      if (upstreamBusy(res.status, body)) continue;
      return body;
    } catch {
      // network error or timeout: the next endpoint
    }
  }
  return null;
}

/** A small TTL cache that also shares in-flight reads. Busy answers are never kept. */
export class ReadCache {
  private readonly done = new Map<string, { at: number; ttl: number; body: RpcResponseBody; account: string | null }>();
  private readonly flying = new Map<string, Promise<RpcResponseBody | null>>();
  private readonly gen = new Map<string, number>();
  constructor(private readonly max = 2_000, private readonly now: () => number = Date.now) {}

  /** `ttl` overrides the read's own (ttlFor) for a body this proxy does not forward, such as the activity list. */
  async read(b: RpcRequestBody, load: () => Promise<RpcResponseBody | null>, ttl?: number): Promise<RpcResponseBody | null> {
    const key = readKey(b);
    const account = typeof b.params.account_id === "string" ? b.params.account_id : null;
    const hit = this.done.get(key);
    if (hit && this.now() - hit.at < hit.ttl) return hit.body;
    const inFlight = this.flying.get(key);
    if (inFlight) return inFlight;
    const gen = account ? this.gen.get(account) ?? 0 : 0;
    const p = load()
      .then((body) => {
        // a read that started before an invalidation may carry the old state: answer it, never cache it
        if (body && (!account || (this.gen.get(account) ?? 0) === gen)) this.put(key, ttl ?? ttlFor(b), body, account);
        return body;
      })
      .finally(() => { if (this.flying.get(key) === p) this.flying.delete(key); });
    this.flying.set(key, p);
    return p;
  }

  /**
   * Drops every cached read of these accounts, so the next read after a transaction this server sent (relayed, the
   * demo agent's or the counterparty's) sees it at once instead of after the cache's few seconds. A read already in
   * flight still answers its caller but is not cached.
   */
  invalidate(...accounts: string[]): number {
    const drop = new Set(accounts);
    for (const a of drop) this.gen.set(a, (this.gen.get(a) ?? 0) + 1);
    let n = 0;
    for (const [key, hit] of this.done) if (hit.account && drop.has(hit.account)) { this.done.delete(key); n++; }
    // later callers start a fresh read instead of joining one that began before the transaction
    for (const key of [...this.flying.keys()]) if (accounts.some((a) => key.includes(JSON.stringify(a)))) this.flying.delete(key);
    return n;
  }

  private put(key: string, ttl: number, body: RpcResponseBody, account: string | null = null) {
    this.done.delete(key);
    this.done.set(key, { at: this.now(), ttl, body, account });
    while (this.done.size > this.max) this.done.delete(this.done.keys().next().value as string);
  }

  get size(): number {
    return this.done.size;
  }
}

/** A cached read answered with the caller's own id. */
export async function cachedRead(cache: ReadCache, urls: string[], b: RpcRequestBody, f?: Fetch): Promise<RpcResponseBody> {
  const id = b.id ?? "accord";
  const body = await cache.read(b, () => forward(urls, b, { fetch: f }));
  return body ? { ...body, id } : busyBody(id);
}

// ---- balances ----------------------------------------------------------------------------------------------------

export interface ReadBalances {
  account: string;
  /** False when the account does not exist on chain yet: its NEAR is 0, though a token may already hold funds for it. */
  exists: boolean;
  /** yoctoNEAR */
  near: string;
  token: string;
  /** The token's smallest unit (6 decimals for USDC and tUSDC). */
  ft: string;
}

/** Whether a view_account answer says the account does not exist (yet). */
export function isUnknownAccount(body: RpcResponseBody): boolean {
  const e = body.error;
  if (e) return e.cause?.name === "UNKNOWN_ACCOUNT" || /UNKNOWN_ACCOUNT|does not exist/i.test(`${e.name ?? ""} ${e.message ?? ""} ${typeof e.data === "string" ? e.data : ""}`);
  const r = body.result as { error?: unknown } | undefined;
  return typeof r?.error === "string" && /does not exist/i.test(r.error);
}

/** The NEAR balance from a view_account answer: 0 for an account that does not exist yet; null for any other error. */
export function nearFrom(body: RpcResponseBody): { exists: boolean; near: string } | null {
  if (isUnknownAccount(body)) return { exists: false, near: "0" };
  const r = body.result as { amount?: string } | undefined;
  if (body.error || typeof r?.amount !== "string") return null;
  return { exists: true, near: r.amount };
}

/** The balance from an ft_balance_of answer (a JSON string in result bytes); null when the read failed. */
export function ftFrom(body: RpcResponseBody): string | null {
  if (body.error) return null;
  const r = body.result as { result?: number[]; error?: string } | undefined;
  if (!r || !Array.isArray(r.result)) return null;
  try {
    const v = JSON.parse(new TextDecoder().decode(Uint8Array.from(r.result))) as unknown;
    return typeof v === "string" && /^\d+$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export const viewAccount = (account: string): RpcRequestBody => ({
  method: "query", params: { request_type: "view_account", finality: "final", account_id: account },
});

export const ftBalanceOf = (token: string, account: string): RpcRequestBody => ({
  method: "query",
  params: {
    request_type: "call_function", finality: "final", account_id: token, method_name: "ft_balance_of",
    args_base64: btoa(JSON.stringify({ account_id: account })),
  },
});

/** Both balances through the cache. "busy" when the network could not answer either read. */
export async function readBalances(cache: ReadCache, urls: string[], account: string, token: string, f?: Fetch): Promise<ReadBalances | "busy"> {
  const [a, t] = await Promise.all([cachedRead(cache, urls, viewAccount(account), f), cachedRead(cache, urls, ftBalanceOf(token, account), f)]);
  const n = nearFrom(a);
  if (!n || t.error?.code === -429) return "busy";
  // a token that answers with an error (not deployed on this network, say) holds nothing for anyone
  const ft = ftFrom(t) ?? "0";
  return { account, exists: n.exists, near: n.near, token, ft };
}
