// This browser's tender bidder: one ed25519 key kept in localStorage, and per job the sealed prices and salts it
// bid with (needed later to reveal). Nothing here leaves the browser except a signed bid, a reveal after the
// deadline, and the signature that links the key to the signed-in account. Storage can be blocked or cleared; every
// read and write is wrapped, and a lost key or salt only means that bid cannot be revealed.
import { bidderKey, newBidderKey, signLink, type BidderKey } from "@accord/sdk";

const KEY = "accord.tender.bidder";
const linkedKey = (account: string) => `accord.tender.bidder.linked.${account}`;
export const bidsKey = (board: string, job: number) => `accord.tender.bids.${board}.${job}`;

export function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function write(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return localStorage.getItem(key) === value; } catch { return false; }
}

/** The key this browser already holds, or null. */
export function browserKey(): BidderKey | null {
  const seed = read(KEY);
  if (!seed) return null;
  try { return bidderKey(seed); } catch { return null; }
}

/** The key this browser holds, made on first use; null when storage is blocked (the key could not be kept). */
export function ensureBrowserKey(): { key: BidderKey; created: boolean } | null {
  const have = browserKey();
  if (have) return { key: have, created: false };
  const k = newBidderKey();
  return write(KEY, k.seed) ? { key: k, created: true } : null;
}

/** "alice.testnet" → "alice-browser"; an implicit account uses its first 8 characters. */
export function browserLabel(account: string): string {
  const head = (account.split(".")[0] ?? "me").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "me";
  return `${head.length === 64 ? head.slice(0, 8) : head}-browser`;
}

export const isLinked = (account: string, bidder: string) => read(linkedKey(account)) === bidder;

/**
 * Links this browser's key to the signed-in account (POST /api/tenders/agents, session cookie). Returns null on
 * success, else what went wrong in one line. 401 means the account has not confirmed it is this browser yet.
 */
export async function linkBrowserKey(key: BidderKey, account: string, label = browserLabel(account)): Promise<string | null> {
  try {
    const r = await fetch("/api/tenders/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bidder: key.id, label, signature: signLink(key, account), source: "browser" }),
    });
    if (r.ok) { write(linkedKey(account), key.id); return null; }
    const b = (await r.json().catch(() => ({}))) as { error?: string };
    return r.status === 401 ? "no_session" : (b.error ?? `HTTP ${r.status}`);
  } catch {
    return "Could not reach the app.";
  }
}

/** POST a JSON body to one of the board's relay routes; the relay answers {ok, tx} or {error}. */
export async function relay(path: string, body: unknown): Promise<{ ok: true; tx: string } | { ok: false; error: string }> {
  try {
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const b = (await r.json().catch(() => ({}))) as { tx?: string; error?: string };
    return r.ok && b.tx ? { ok: true, tx: b.tx } : { ok: false, error: b.error ?? `The relay answered ${r.status}.` };
  } catch {
    return { ok: false, error: "Could not reach the relay." };
  }
}
