// The room's timeline (lib/activity.ts) from the agreement account's own transactions. The list of transactions comes
// from FastNEAR's transactions API (tx.<network>.fastnear.com/v0/account), held in the app's read cache for a few
// seconds and dropped with it whenever this server sends a transaction for the room (readCache.invalidate). Each
// transaction's receipts and logs come in batches of 20 from the same API (per-receipt times, predecessors), or, if
// that answers nothing, one by one from RPC EXPERIMENTAL_tx_status through the app's rotating provider. A
// transaction older than ten minutes cannot gain receipts any more (an enclave job's yield times out long before),
// so it is kept for good; a newer one is read again.

import "server-only";
import { accord, config } from "./accord";
import { readCache } from "./chainproxy";
import { fromFastnear, fromRpc, timeline, type ActivityEntry, type FastnearTx, type Parties, type RawTx, type RpcTxStatus } from "@/lib/activity";
import type { RpcResponseBody } from "./chainread";

const LIST_TTL_MS = 6_000;
const SETTLED_AFTER_NS = 600n * 1_000_000_000n;
const RECENT_TTL_MS = 8_000;

interface ListedTx { transaction_hash: string; tx_block_height: number; tx_block_timestamp: string }

function txApi(): string | null {
  const n = config().network;
  if (process.env.ACCORD_TX_API) return process.env.ACCORD_TX_API;
  return n === "testnet" ? "https://tx.test.fastnear.com" : n === "mainnet" ? "https://tx.main.fastnear.com" : null;
}

async function post<T>(url: string, body: object): Promise<T | null> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8_000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** The agreement account's transactions, newest first, through the read cache (null when the API is unreachable). */
async function listTxs(account: string): Promise<ListedTx[] | null> {
  const api = txApi();
  if (!api) return null;
  const body = await readCache.read(
    { method: "fastnear_account_txs", params: { account_id: account } },
    async (): Promise<RpcResponseBody | null> => {
      const r = await post<{ account_txs?: ListedTx[] }>(`${api}/v0/account`, { account_id: account, limit: 200 });
      return r?.account_txs ? { jsonrpc: "2.0", id: "accord", result: r.account_txs } : null;
    },
    LIST_TTL_MS,
  );
  return (body?.result as ListedTx[] | undefined) ?? null;
}

const details = new Map<string, { raw: RawTx; at: number; final: boolean }>();
const MAX_DETAILS = 5_000;

function keep(raw: RawTx, nowNs: bigint) {
  const final = nowNs - BigInt(raw.timestampNs) > SETTLED_AFTER_NS;
  details.set(raw.hash, { raw, at: Date.now(), final });
  while (details.size > MAX_DETAILS) details.delete(details.keys().next().value as string);
}

async function loadDetails(account: string, listed: ListedTx[]): Promise<RawTx[]> {
  const nowNs = BigInt(Date.now()) * 1_000_000n;
  const fresh = (h: string) => { const d = details.get(h); return d && (d.final || Date.now() - d.at < RECENT_TTL_MS) ? d.raw : null; };
  const want = listed.filter((t) => !fresh(t.transaction_hash));
  const api = txApi();
  for (let i = 0; i < want.length && api; i += 20) {
    const batch = want.slice(i, i + 20);
    const r = await post<{ transactions?: FastnearTx[] }>(`${api}/v0/transactions`, { tx_hashes: batch.map((t) => t.transaction_hash) });
    for (const t of r?.transactions ?? []) {
      try { keep(fromFastnear(t), nowNs); } catch { /* an entry we cannot read: RPC below */ }
    }
  }
  const provider = accord().chain.provider;
  await Promise.all(listed.filter((t) => !fresh(t.transaction_hash)).map(async (t) => {
    try {
      const s = await provider.request<RpcTxStatus>("EXPERIMENTAL_tx_status", { tx_hash: t.transaction_hash, sender_account_id: account, wait_until: "NONE" });
      keep(fromRpc(s, String(t.tx_block_timestamp), t.tx_block_height), nowNs);
    } catch {
      // left out of this answer; the next read tries again
    }
  }));
  return listed.map((t) => details.get(t.transaction_hash)?.raw).filter((x): x is RawTx => !!x);
}

export interface RoomActivity { entries: ActivityEntry[]; complete: boolean; source: string }

/** Every Accord event in the room, newest first. `complete` is false when some transactions could not be read. */
export async function roomActivity(p: Parties): Promise<RoomActivity | null> {
  const listed = await listTxs(p.agreement);
  if (!listed) return null;
  const raws = await loadDetails(p.agreement, listed);
  return { entries: timeline(raws, p), complete: raws.length === listed.length, source: txApi() ?? "" };
}
