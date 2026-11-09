// The chain boundary: read-only views over RPC, and a `Signer` that sends function calls. The CLI and the agent
// sign with keys from the environment (`KeySigner`); the app wraps NEAR Connect in the same interface.

import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, SignedTransaction, actions, baseEncode, type KeyPairString } from "near-api-js";
import { InvalidNonceError, RpcError } from "near-api-js/rpc-errors";
import { sha256 } from "@noble/hashes/sha2";
import type { AccordEvent } from "./types.js";
import { fromBase64, utf8 } from "./bytes.js";

/**
 * The Accord factories deployed per network (DECISIONS.md sections 18 and 24). Each factory pins one settlement
 * token; an agreement copies it at creation and keeps it for life. `verify` accepts an agreement whose own factory
 * is on this list (or on the list the caller passes) and reads that factory's release.
 */
export const KNOWN_FACTORIES: Record<string, { factory: string; token: string; label: string }[]> = {
  testnet: [
    { factory: "accord-v2.testnet", token: "tusdc.accord-v1.testnet", label: "Test USDC" },
    { factory: "accord-usdc.testnet", token: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af", label: "Circle USDC (testnet)" },
  ],
};

/**
 * Public RPC endpoints per network. `urls` is the failover order `RotatingRpcProvider` walks when one answers with a
 * rate limit or a transport failure; `rpc` (the first) and `fallback` (the last) stay for callers that want one URL.
 */
export const RPC: Record<string, { rpc: string; fallback: string; urls: string[]; explorer: string }> = {
  testnet: {
    rpc: "https://test.rpc.fastnear.com",
    fallback: "https://rpc.testnet.near.org",
    urls: [
      "https://test.rpc.fastnear.com",
      "https://rpc.testnet.fastnear.com",
      "https://near-testnet.drpc.org",
      "https://rpc.testnet.near.org", // slower; last
    ],
    explorer: "https://testnet.nearblocks.io",
  },
  mainnet: {
    rpc: "https://free.rpc.fastnear.com",
    fallback: "https://rpc.mainnet.near.org",
    urls: ["https://free.rpc.fastnear.com", "https://rpc.mainnet.near.org"],
    explorer: "https://nearblocks.io",
  },
};

/**
 * The endpoints to use: the configured ones first (`NEAR_RPC_URL` may be one URL or a comma-separated list), then
 * the network's public defaults, without duplicates. A network with no defaults (the local sandbox) gets only what
 * was configured.
 */
export function rpcEndpoints(configured: string | string[] | undefined, network?: string): string[] {
  const given = (Array.isArray(configured) ? configured : (configured ?? "").split(","))
    .map((u) => u.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of [...given, ...(network ? RPC[network]?.urls ?? [] : [])]) {
    const key = u.replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

/** An endpoint as it may appear in logs and errors: scheme and host only, so an API key in a path or query never leaks. */
export function rpcHost(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "(invalid RPC URL)";
  }
}

/** How a failed RPC request failed, when the failure is the endpoint's and not the request's. */
export type RpcFailureKind = "rate_limit" | "transport";

const RATE_LIMIT = /rate.?limit|too many requests|"code"\s*:\s*-429\b/i;
const TRANSPORT = /fetch failed|failed to fetch|network ?error|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EPIPE|UND_ERR|socket hang up|other side closed|aborted|timed out|Bad Gateway|unavailable|Internal server error|Timeout error/i;

function causeText(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let i = 0; i < 4 && cur; i++) {
    if (typeof cur !== "object") break;
    const o = cur as { name?: unknown; message?: unknown; code?: unknown; cause?: unknown };
    parts.push([o.name, o.code, o.message].filter((x) => typeof x === "string").join(" "));
    cur = o.cause;
  }
  return parts.join(" | ");
}

/**
 * Whether an error from one endpoint is that endpoint's fault (rate limited, unreachable, 5xx, a body that is not
 * JSON-RPC), in which case another endpoint may answer, or the request's own result (a contract panic, a missing
 * account or access key, an invalid transaction), which every endpoint would give and which must reach the caller
 * unchanged. Returns null for the second kind.
 */
export function rpcFailureKind(e: unknown): RpcFailureKind | null {
  if (!(e instanceof Error)) return null;
  // Errors parsed from a nearcore error body: the request's own answer. The one exception is the plain RpcError
  // near-api-js makes when the error body has no nearcore shape at all, which is a gateway speaking, not a node.
  if (e instanceof RpcError) {
    if (e.constructor !== RpcError || e.message !== "Unknown RPC error") return null;
    return "transport";
  }
  // near-api-js's ProviderError keeps the HTTP status as a numeric `cause`.
  const status = typeof (e as { cause?: unknown }).cause === "number" ? ((e as { cause: number }).cause) : undefined;
  if (status === 429) return "rate_limit";
  if (status !== undefined && (status >= 500 || status === 408)) return RATE_LIMIT.test(e.message) ? "rate_limit" : "transport";
  const text = causeText(e);
  if (RATE_LIMIT.test(text)) return "rate_limit";
  if ((e as { type?: unknown }).type === "RetriesExceeded") return "transport";
  if (e.name === "AbortError" || e.name === "TimeoutError" || e instanceof SyntaxError) return "transport";
  if (e instanceof TypeError && /fetch|network|load failed/i.test(text)) return "transport";
  if (TRANSPORT.test(text)) return "transport";
  return null;
}

/** Every endpoint failed with a rate limit or a transport error. The message names the last cause, never a key. */
export class RpcUnavailableError extends Error {
  readonly code = "RPC_UNAVAILABLE";
  constructor(readonly method: string, readonly rateLimited: boolean, readonly attempts: number, last: { url: string; error: unknown }, urls: string[] = [last.url]) {
    let cause = last.error instanceof Error ? last.error.message : String(last.error);
    // near-api-js puts the full URL in some messages ("<url> Bad Gateway"); keep only the host.
    for (const u of [...urls].sort((a, b) => b.length - a.length)) cause = cause.split(u).join(rpcHost(u));
    super(`NEAR RPC unavailable: ${attempts} attempt(s) across ${urls.length} endpoint(s) failed for ${method}; last ${rpcHost(last.url)}: ${cause.slice(0, 300)}`,
      { cause: last.error });
    this.name = "RpcUnavailableError";
  }
}

/** Whether an error means the NEAR RPC is busy or unreachable right now (worth a quiet retry), not a real failure. */
export function isRpcBusy(e: unknown): boolean {
  return e instanceof RpcUnavailableError || (e instanceof Error && (e as { code?: unknown }).code === "RPC_UNAVAILABLE") || rpcFailureKind(e) !== null;
}

export interface RotatingRpcOptions {
  /** Passes over the whole list before giving up (default 2). */
  rounds?: number;
  /** Wait before the second and later passes, multiplied by the pass number (ms, default 600). */
  wait?: number;
  /** Per-request timeout (ms): 20 s for reads, 90 s for transactions by default. */
  timeoutMs?: number;
  txTimeoutMs?: number;
  /** How long an endpoint that just failed is tried after the others (ms, default 30 s). */
  cooldownMs?: number;
}

type RawSend = (method: string, params: object) => Promise<unknown>;

const TX_METHODS = new Set(["send_tx", "broadcast_tx_commit", "broadcast_tx_async", "tx", "EXPERIMENTAL_tx_status"]);
const SEND_METHODS = new Set(["send_tx", "broadcast_tx_commit", "broadcast_tx_async"]);

/**
 * A JSON-RPC provider over several endpoints that moves to the next one only when an endpoint fails as an
 * endpoint: HTTP 429 or 5xx, a JSON-RPC -429 or a rate-limit message, a network error or timeout. Every other RPC
 * error (a contract panic, AccessKeyDoesNotExist, an invalid transaction or nonce) is thrown unchanged from the
 * first endpoint that gave it, and nothing is sent again after one. near-api-js's own FailoverRpcProvider is not
 * used because it moves on after any error and replaces the real one with "Exceeded N providers".
 *
 * A signed transaction may be sent again after a transport failure: its hash is fixed by its bytes, so nearcore
 * either finds it already known and waits for it, or accepts it once. If the retry then answers InvalidNonce, the
 * first send got through; the provider looks the transaction up by hash instead of letting Account re-sign it
 * with a new nonce, which would run the call twice.
 */
export class RotatingRpcProvider extends JsonRpcProvider {
  readonly urls: string[];
  private readonly endpoints: JsonRpcProvider[];
  private readonly opts: Required<RotatingRpcOptions>;
  private readonly coolUntil = new Map<number, number>();

  constructor(urls: string | string[], options: RotatingRpcOptions = {}) {
    const list = Array.isArray(urls) ? urls : rpcEndpoints(urls);
    if (list.length === 0) throw new Error("RotatingRpcProvider needs at least one RPC URL");
    super({ url: list[0]! }, { retries: 1 });
    this.urls = list;
    // One attempt each: retrying, and on which errors, is decided here.
    this.endpoints = list.map((url) => new JsonRpcProvider({ url }, { retries: 1, wait: 0, backoff: 1 }));
    this.opts = { rounds: 2, wait: 600, timeoutMs: 20_000, txTimeoutMs: 90_000, cooldownMs: 30_000, ...options };
  }

  /** Endpoint indexes in the order to try: those not cooling down first, each group in configured order. */
  private order(): number[] {
    const now = Date.now();
    const idx = this.urls.map((_, i) => i);
    return [...idx.filter((i) => (this.coolUntil.get(i) ?? 0) <= now), ...idx.filter((i) => (this.coolUntil.get(i) ?? 0) > now)];
  }

  private once<T>(i: number, method: string, params: object): Promise<T> {
    const ms = TX_METHODS.has(method) ? this.opts.txTimeoutMs : this.opts.timeoutMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(`request timed out after ${ms} ms`), { name: "TimeoutError" })), ms);
    });
    const send = this.endpoints[i]!.sendJsonRpc as unknown as RawSend;
    return Promise.race([send.call(this.endpoints[i], method, params) as Promise<T>, timeout]).finally(() => clearTimeout(timer));
  }

  // Every near-api-js method on the provider (query, viewAccount, sendTransactionUntil, ...) goes through
  // sendJsonRpc. Its typed signature names an interface near-api-js does not export, so it is replaced on the
  // prototype here rather than redeclared.
  static {
    (this.prototype as unknown as { sendJsonRpc: RawSend }).sendJsonRpc = function (this: RotatingRpcProvider, method, params) {
      return this.request(method, params);
    };
  }

  /** A JSON-RPC call by method name with failover; what every near-api-js method on this provider goes through. */
  async request<T>(method: string, params: object): Promise<T> {
    let last: { url: string; error: unknown } | undefined;
    let rateLimited = false;
    let attempts = 0;
    for (let round = 0; round < this.opts.rounds; round++) {
      if (round > 0 && this.opts.wait > 0) await new Promise((r) => setTimeout(r, this.opts.wait * round));
      for (const i of this.order()) {
        attempts++;
        try {
          const out = await this.once<T>(i, method, params);
          this.coolUntil.delete(i);
          return out;
        } catch (e) {
          const kind = rpcFailureKind(e);
          if (kind === null) {
            if (last && SEND_METHODS.has(method) && e instanceof InvalidNonceError) return this.afterResend<T>(method, params, e);
            throw e;
          }
          if (kind === "rate_limit") rateLimited = true;
          this.coolUntil.set(i, Date.now() + this.opts.cooldownMs);
          last = { url: this.urls[i]!, error: e };
        }
      }
    }
    throw new RpcUnavailableError(method, rateLimited, attempts, last!, this.urls);
  }

  /**
   * A transaction was sent again after a transport failure and the retry says its nonce is used: the first send
   * reached the network. Returns that transaction's outcome by hash; never re-signs.
   */
  private async afterResend<T>(method: string, params: object, nonceError: Error): Promise<T> {
    const p = params as { signed_tx_base64?: string; wait_until?: string };
    if (method !== "send_tx" || !p.signed_tx_base64) throw nonceError;
    const signed = SignedTransaction.decode(fromBase64(p.signed_tx_base64));
    const hash = baseEncode(sha256(signed.transaction.encode()));
    try {
      return await this.request<T>("tx", {
        tx_hash: hash,
        sender_account_id: signed.transaction.signerId,
        wait_until: p.wait_until ?? "EXECUTED_OPTIMISTIC",
      });
    } catch (e) {
      throw new Error(`transaction ${hash} may already be on chain (a retry after a network error found its nonce used) and its status could not be read: ${(e as Error).message}`, { cause: e });
    }
  }
}

/** One raw JSON-RPC call with the same failover as `Chain`: `rpcRequest(urls, "block", { finality: "final" })`. */
export function rpcRequest<T>(urls: string | string[] | RotatingRpcProvider, method: string, params: object, options?: RotatingRpcOptions): Promise<T> {
  const p = urls instanceof RotatingRpcProvider ? urls : new RotatingRpcProvider(urls, options);
  return p.request<T>(method, params);
}

export const TGAS = 1_000_000_000_000n;

export interface TxResult {
  txHash: string;
  ok: boolean;
  /** The last receipt's return value, JSON-decoded when it is JSON. */
  value: unknown;
  logs: string[];
  events: AccordEvent[];
  /** The first failure's message, such as `ERR_NOT_BUYER`, when `ok` is false. */
  failure?: string;
  gasBurnt: bigint;
}

export interface CallOptions {
  gas?: bigint;
  deposit?: bigint;
}

/** Anything that can send a function call as `accountId`. */
export interface Signer {
  accountId: string;
  call(contractId: string, method: string, args: object, opts?: CallOptions): Promise<TxResult>;
  /** NEP-413, for the document key and the app's signed approvals. */
  signMessage?(message: string, recipient: string, nonce: Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }>;
}

export interface AccessKeyEntry {
  public_key: string;
  access_key: {
    nonce: number;
    permission: "FullAccess" | { FunctionCall: { allowance: string | null; receiver_id: string; method_names: string[] } };
  };
}

export interface AccountInfo {
  amount: string;
  locked: string;
  code_hash: string;
  global_contract_hash?: string;
  storage_usage: number;
}

export interface BlockInfo {
  header: { height: number; hash: string; timestamp_nanosec: string };
}

export class Chain {
  readonly provider: RotatingRpcProvider;
  /**
   * `rpcUrl` is one URL or a comma-separated list; with a `network` that has public defaults (testnet, mainnet)
   * those follow it as fallbacks.
   */
  constructor(readonly rpcUrl: string, readonly network?: string, options?: RotatingRpcOptions) {
    this.provider = new RotatingRpcProvider(rpcEndpoints(rpcUrl, network), options);
  }

  get rpcUrls(): string[] {
    return this.provider.urls;
  }

  async view<T>(contractId: string, method: string, args: object = {}, blockId?: number): Promise<T> {
    const blockQuery = blockId === undefined ? { finality: "final" as const } : { blockId };
    const res = await this.provider.callFunction<T & object>({ contractId, method, args: args as Record<string, unknown>, blockQuery });
    return res as T;
  }

  async accessKeys(accountId: string): Promise<AccessKeyEntry[]> {
    const list = await this.provider.viewAccessKeyList({ accountId, finalityQuery: { finality: "final" } });
    return list.keys as unknown as AccessKeyEntry[];
  }

  async account(accountId: string): Promise<AccountInfo> {
    return (await this.provider.viewAccount({ accountId, blockQuery: { finality: "final" } })) as unknown as AccountInfo;
  }

  async block(finality: "final" | "optimistic" = "final"): Promise<BlockInfo> {
    return (await this.provider.viewBlock({ finality })) as unknown as BlockInfo;
  }
}

/** Signs with a key pair held in the environment (`ed25519:<base58 secret>`). */
export class KeySigner implements Signer {
  private readonly account: Account;
  private readonly keyPair: KeyPair;
  constructor(readonly accountId: string, secretKey: string, chain: Chain) {
    this.keyPair = KeyPair.fromString(secretKey as KeyPairString);
    this.account = new Account(accountId, chain.provider, new KeyPairSigner(this.keyPair));
  }

  get publicKey(): string {
    return this.keyPair.getPublicKey().toString();
  }

  async call(contractId: string, method: string, args: object, opts: CallOptions = {}): Promise<TxResult> {
    const res = await this.account.signAndSendTransaction({
      receiverId: contractId,
      actions: [actions.functionCall(method, args, opts.gas ?? 100n * TGAS, opts.deposit ?? 0n)],
      waitUntil: "FINAL",
      throwOnFailure: false,
    });
    return toTxResult(res);
  }

  async signMessage(message: string, recipient: string, nonce: Uint8Array) {
    const signed = await this.account.signNep413Message({ message, recipient, nonce });
    return { signature: signed.signature, publicKey: signed.publicKey.toString() };
  }
}

interface RawOutcome {
  outcome: { logs: string[]; gas_burnt: number; status: unknown };
}
interface RawTx {
  transaction: { hash: string };
  transaction_outcome: RawOutcome;
  receipts_outcome: RawOutcome[];
  status: { SuccessValue?: string; Failure?: unknown };
}

/** Normalises an RPC transaction response: hash, success, return value, logs and Accord events. */
export function toTxResult(res: unknown): TxResult {
  const tx = res as RawTx;
  const outcomes = [tx.transaction_outcome, ...tx.receipts_outcome];
  const logs = outcomes.flatMap((o) => o.outcome.logs);
  const gasBurnt = outcomes.reduce((sum, o) => sum + BigInt(o.outcome.gas_burnt), 0n);
  const receiptFailure = tx.receipts_outcome
    .map((o) => (o.outcome.status as { Failure?: unknown }).Failure)
    .find((f) => f !== undefined);
  const failure = tx.status.Failure ?? receiptFailure;
  let value: unknown = null;
  if (tx.status.SuccessValue) {
    const text = utf8(fromBase64(tx.status.SuccessValue));
    try {
      value = JSON.parse(text);
    } catch {
      value = text;
    }
  }
  return {
    txHash: tx.transaction.hash,
    ok: tx.status.Failure === undefined,
    value,
    logs,
    events: parseEvents(logs),
    failure: failure === undefined ? undefined : failureMessage(failure),
    gasBurnt,
  };
}

export function parseEvents(logs: string[]): AccordEvent[] {
  const out: AccordEvent[] = [];
  for (const line of logs) {
    if (!line.startsWith("EVENT_JSON:")) continue;
    try {
      const e = JSON.parse(line.slice("EVENT_JSON:".length)) as { standard: string; event: string; data: unknown[] };
      if (e.standard === "accord") out.push({ event: e.event, data: (e.data[0] ?? {}) as Record<string, unknown> });
    } catch {
      // not an Accord event
    }
  }
  return out;
}

/** The panic string (`ERR_*`) out of a NEAR failure, or the failure's JSON. */
export function failureMessage(failure: unknown): string {
  const text = JSON.stringify(failure);
  const err = text.match(/ERR_[A-Z_]+/);
  return err ? err[0] : text;
}
