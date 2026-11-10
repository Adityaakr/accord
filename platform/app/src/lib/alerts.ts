// Refusal alerts, the pure half: which refusals a scan turns into alerts, the payload a webhook receives, its
// signature, the retry schedule, and the Telegram and email text. server/alerts.ts reads the chain and the store and
// calls these.

import { createHmac, timingSafeEqual } from "node:crypto";
import { words } from "./refusals";

export interface RefusalIn {
  seq: number; at: number; block: number; code: string; item: number; amount: string; recipient: string; signer: string | null; via: string;
}

export interface RoomIn {
  account: string; title: string; buyer: string; vendor: string;
  symbol: string; decimals: number;
  /** the active recipient the terms pay, or null */
  approved: string | null;
  /** the item's due amount, raw units, when the contract lists it */
  dueAmount: (item: number) => string | null;
  refusals: number;
  agentKey: string | null;
  revokedKeys: number;
  canaryTripped: boolean;
  refusalLimit: number;
  refusalWindowSecs: number;
}

export { REFUSAL_WORDS, words, refusalTx } from "./refusals";

/**
 * What a scan alerts on. `cursor` is the last sequence already alerted (null: this organisation has never seen the
 * agreement). On first sight only refusals newer than `backfillSecs` are alerted, so connecting an organisation does
 * not replay months of history; afterwards every refusal past the cursor is. `next` is the new cursor.
 */
export function plan(cursor: number | null, lastSeq: number, held: readonly RefusalIn[], nowSecs: number, backfillSecs: number): { alert: RefusalIn[]; next: number } {
  const after = cursor ?? 0;
  const fresh = held.filter((r) => r.seq > after && r.seq <= lastSeq).sort((a, b) => a.seq - b.seq);
  const alert = cursor === null ? fresh.filter((r) => nowSecs - r.at <= backfillSecs) : fresh;
  return { alert, next: Math.max(after, lastSeq) };
}

/** Whether this refusal is the one that took the key away: a canary, or the refusal limit reached inside the window,
 * with the key gone now. */
export function autoRevoked(r: RefusalIn, all: readonly RefusalIn[], room: Pick<RoomIn, "agentKey" | "revokedKeys" | "refusalLimit" | "refusalWindowSecs">, revokedInTx?: boolean): boolean {
  // the room's own transaction says so when it can be read: an agent_key_revoked event in the refusal's transaction
  if (revokedInTx !== undefined) return revokedInTx;
  if (room.agentKey || room.revokedKeys === 0) return false;
  if (r.code === "ERR_CANARY") return true;
  if (room.refusalLimit <= 0) return false;
  const inWindow = all.filter((x) => x.signer && x.code !== "ERR_REVOKED" && x.seq <= r.seq && r.at - x.at < room.refusalWindowSecs).length;
  return inWindow === room.refusalLimit;
}

const units = (raw: string, decimals: number) => {
  const v = BigInt(raw || "0");
  const base = 10n ** BigInt(decimals);
  const cents = (v * 100n + base / 2n) / base;
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
};

export interface RefusalPayload {
  type: "refusal";
  test: boolean;
  id: string;
  agreement: string;
  title: string;
  code: string;
  reason: string;
  item: number;
  attempted: { amount: string; amount_raw: string; token: string; recipient: string | null };
  approved: { amount: string | null; recipient: string | null };
  tx: { hash: string | null; url: string | null };
  at: string;
  refusal_seq: number;
  /** refusals in this agreement up to and including this one */
  refusals_so_far: number;
  /** refusals in this agreement when the alert was made */
  refusals_total: number;
  /** the agent key is revoked now (when the alert was made) */
  key_revoked: boolean;
  /** this refusal is the one that took the key away (a canary, or the refusal limit) */
  auto_revoked: boolean;
  links: { incident: string; verify: string };
}

export function payloadFor(r: RefusalIn, room: RoomIn, all: readonly RefusalIn[], ctx: { tx: string | null; revokedInTx?: boolean; explorer: string | null; appUrl: string; test?: boolean }): RefusalPayload {
  const due = room.dueAmount(r.item);
  return {
    type: "refusal",
    test: Boolean(ctx.test),
    id: `${room.account}#${r.seq}`,
    agreement: room.account,
    title: room.title,
    code: r.code,
    reason: words(r.code),
    item: r.item,
    attempted: { amount: units(r.amount, room.decimals), amount_raw: r.amount, token: room.symbol, recipient: r.recipient || null },
    approved: { amount: due ? units(due, room.decimals) : null, recipient: room.approved },
    tx: { hash: ctx.tx, url: ctx.tx && ctx.explorer ? `${ctx.explorer}/txns/${ctx.tx}` : null },
    at: new Date(r.at * 1000).toISOString(),
    refusal_seq: r.seq,
    refusals_so_far: r.seq,
    refusals_total: Math.max(room.refusals, r.seq),
    key_revoked: !room.agentKey && room.revokedKeys > 0,
    auto_revoked: autoRevoked(r, all, room, ctx.revokedInTx),
    links: {
      incident: `${ctx.appUrl}/agreements/${room.account}?tab=activity&incident=${r.seq}`,
      verify: `${ctx.appUrl}/verify/${room.account}`,
    },
  };
}

// ---- webhook signature ---------------------------------------------------------------------------------------
// X-Accord-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>. The signed string is `<t>.<raw body>`: the raw body
// exactly as sent, prefixed with the timestamp so a receiver can reject an old delivery replayed later (Stripe's
// scheme). Verify over the raw bytes you received, before parsing the JSON, with a constant-time compare.

export const SIGNATURE_HEADER = "X-Accord-Signature";

export function sign(secret: string, body: string, t: number): string {
  const mac = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${mac}`;
}

/** Checks a signature header against the raw body: the MAC, and the timestamp within `toleranceSecs` of `now`. */
export function verify(secret: string, header: string, body: string, nowSecs: number, toleranceSecs = 300): boolean {
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1 || Math.abs(nowSecs - t) > toleranceSecs) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"));
  const got = Buffer.from(parts.v1);
  return want.length === got.length && timingSafeEqual(want, got);
}

// ---- retries -------------------------------------------------------------------------------------------------

/** Delay before attempt n+1 after n failed attempts: 30 s, 2 min, 10 min, 1 h, 6 h; then the send is failed. */
export const BACKOFF_SECS = [30, 120, 600, 3600, 21_600] as const;
export const MAX_ATTEMPTS = BACKOFF_SECS.length + 1;

export function nextAttempt(attemptsSoFar: number, nowMs: number): { retry: true; at: string } | { retry: false } {
  const d = BACKOFF_SECS[attemptsSoFar - 1];
  return d === undefined ? { retry: false } : { retry: true, at: new Date(nowMs + d * 1000).toISOString() };
}

/** Whether an HTTP status is worth another attempt: timeouts, rate limits and server errors are; other 4xx are not. */
export const retryable = (status: number | null) => status === null || status === 408 || status === 429 || status >= 500;

// ---- Telegram and email --------------------------------------------------------------------------------------

const esc = (s: string) => s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));

/** The Telegram message (parse_mode HTML): short, the code in plain words, attempted against approved, two links. */
export function telegramText(p: RefusalPayload): string {
  const lines = [
    `<b>${p.test ? "Test alert · " : ""}Payment refused</b> in ${esc(p.title)}`,
    `${esc(p.agreement)} · item ${p.item}`,
    `${esc(p.reason[0]!.toUpperCase() + p.reason.slice(1))} (<code>${esc(p.code)}</code>)`,
    `Tried: ${esc(p.attempted.amount)} ${esc(p.attempted.token)} to ${esc(p.attempted.recipient ?? "no recipient")}`,
    `Approved: ${p.approved.amount ? `${esc(p.approved.amount)} ${esc(p.attempted.token)}` : "the terms' amount"} to ${esc(p.approved.recipient ?? "no active recipient")}`,
    `Nothing was sent. Refusals so far: ${p.refusals_so_far}${p.auto_revoked ? " · the agent key was revoked" : p.key_revoked ? " · the agent key is revoked" : ""}`,
    `<a href="${esc(p.links.incident)}">Open the incident</a>${p.tx.url ? ` · <a href="${esc(p.tx.url)}">transaction</a>` : ""}`,
  ];
  return lines.join("\n");
}

/** The email: subject and plain text. */
export function emailText(p: RefusalPayload): { subject: string; text: string } {
  return {
    subject: `${p.test ? "[test] " : ""}Accord refused a payment in ${p.title} (${p.code})`,
    text: [
      `The contract refused a payment the agent asked for in ${p.title} (${p.agreement}), item ${p.item}.`,
      `Why: ${p.reason} (${p.code}).`,
      `Tried: ${p.attempted.amount} ${p.attempted.token} to ${p.attempted.recipient ?? "no recipient"}.`,
      `Approved: ${p.approved.amount ? `${p.approved.amount} ${p.attempted.token}` : "the terms' amount"} to ${p.approved.recipient ?? "no active recipient"}.`,
      `Nothing was sent. Refusals so far: ${p.refusals_so_far}.${p.auto_revoked ? " The agent key was revoked." : ""}`,
      "",
      `Incident: ${p.links.incident}`,
      p.tx.url ? `Transaction: ${p.tx.url}` : "",
      `Verify: ${p.links.verify}`,
    ].filter((l, i, a) => l || a[i - 1]).join("\n"),
  };
}

/** A Telegram chat id: a number (a group's is negative, a channel's starts -100) or @channelname. */
export function cleanChat(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (/^-?\d{1,20}$/.test(s) || /^@[A-Za-z0-9_]{5,32}$/.test(s)) return s;
  throw new Error("a Telegram chat id is a number like -1001234567890, or @yourchannel");
}

export function cleanEmail(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const s = v.trim();
  if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error("that email address does not look right");
  return s;
}

/** A sample payload for "Send test": the organisation's newest alert's shape, marked test. */
export function testPayload(appUrl: string, explorer: string | null): RefusalPayload {
  const room: RoomIn = {
    account: "a0.example.testnet", title: "Test alert", buyer: "buyer.testnet", vendor: "vendor.testnet", symbol: "tUSDC", decimals: 6,
    approved: "halcyon-mm.testnet", dueAmount: () => "12000000", refusals: 1, agentKey: "ed25519:test", revokedKeys: 0, canaryTripped: false,
    refusalLimit: 5, refusalWindowSecs: 3600,
  };
  const r: RefusalIn = { seq: 1, at: Math.floor(Date.now() / 1000), block: 0, code: "ERR_PAYEE_MISMATCH", item: 1, amount: "12000000", recipient: "stranger.testnet", signer: "ed25519:test", via: "agent" };
  return payloadFor(r, room, [r], { tx: null, explorer, appUrl, test: true });
}
