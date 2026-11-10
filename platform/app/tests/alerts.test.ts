// Refusal alerts (src/lib/alerts.ts): what a scan alerts on (dedupe by cursor, a bounded backfill on first sight),
// the payload, the HMAC signature a receiver checks, the retry schedule, auto-revoke detection and the Telegram text.
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  autoRevoked, BACKOFF_SECS, cleanChat, cleanEmail, emailText, MAX_ATTEMPTS, nextAttempt, payloadFor, plan, refusalTx, retryable, sign,
  telegramText, testPayload, verify, type RefusalIn, type RoomIn,
} from "../src/lib/alerts";

const now = 1_794_000_000;
const ref = (seq: number, o: Partial<RefusalIn> = {}): RefusalIn => ({
  seq, at: now - 60 * (10 - seq), block: 1000 + seq, code: "ERR_PAYEE_MISMATCH", item: 1, amount: "12000000", recipient: "stranger.testnet",
  signer: "ed25519:k", via: "agent", ...o,
});
const room = (o: Partial<RoomIn> = {}): RoomIn => ({
  account: "a48.accord-v2.testnet", title: "Market data <Q4>", buyer: "northwind.testnet", vendor: "halcyon.testnet", symbol: "tUSDC", decimals: 6,
  approved: "halcyon-mm.testnet", dueAmount: (i) => (i === 1 ? "12000000" : null), refusals: 2, agentKey: "ed25519:k", revokedKeys: 0,
  canaryTripped: false, refusalLimit: 5, refusalWindowSecs: 3600, ...o,
});

describe("plan (dedupe)", () => {
  it("alerts only past the cursor, and moves it to the last sequence", () => {
    expect(plan(2, 4, [ref(1), ref(2), ref(3), ref(4)], now, 3600)).toEqual({ alert: [ref(3), ref(4)], next: 4 });
  });
  it("alerts nothing twice: the same scan again finds nothing", () => {
    const first = plan(2, 4, [ref(3), ref(4)], now, 3600);
    expect(plan(first.next, 4, [ref(3), ref(4)], now, 3600).alert).toEqual([]);
  });
  it("on first sight alerts only refusals inside the backfill window", () => {
    const old = ref(1, { at: now - 7200 });
    expect(plan(null, 2, [old, ref(2)], now, 3600)).toEqual({ alert: [ref(2)], next: 2 });
    expect(plan(null, 2, [old, ref(2)], now, 0).alert).toEqual([]);
  });
  it("never moves the cursor back", () => {
    expect(plan(5, 3, [ref(3)], now, 3600)).toEqual({ alert: [], next: 5 });
  });
});

describe("payload", () => {
  it("names what was tried, what was approved, the tx and the links", () => {
    const p = payloadFor(ref(2), room(), [ref(1), ref(2)], { tx: "TXH", explorer: "https://testnet.nearblocks.io", appUrl: "https://x.example/app" });
    expect(p).toMatchObject({
      type: "refusal", test: false, id: "a48.accord-v2.testnet#2", code: "ERR_PAYEE_MISMATCH", reason: "the recipient is not the approved one", item: 1,
      attempted: { amount: "12.00", amount_raw: "12000000", token: "tUSDC", recipient: "stranger.testnet" },
      approved: { amount: "12.00", recipient: "halcyon-mm.testnet" },
      tx: { hash: "TXH", url: "https://testnet.nearblocks.io/txns/TXH" }, refusal_seq: 2, refusals_so_far: 2, refusals_total: 2, key_revoked: false, auto_revoked: false,
      links: { incident: "https://x.example/app/agreements/a48.accord-v2.testnet?tab=activity&incident=2", verify: "https://x.example/app/verify/a48.accord-v2.testnet" },
    });
    expect(p.at).toBe(new Date(ref(2).at * 1000).toISOString());
  });
  it("detects the auto-revoke: the fifth counted refusal in the window with the key gone", () => {
    const all = [1, 2, 3, 4, 5].map((s) => ref(s));
    const gone = room({ agentKey: null, revokedKeys: 1 });
    expect(autoRevoked(all[4]!, all, gone)).toBe(true);
    expect(autoRevoked(all[3]!, all, gone)).toBe(false);
    expect(autoRevoked(all[4]!, all, room())).toBe(false);
    expect(autoRevoked(ref(1, { code: "ERR_CANARY" }), all, gone)).toBe(true);
    // the room's own transaction wins when it was read
    expect(autoRevoked(all[3]!, all, gone, true)).toBe(true);
  });
  it("finds the refusal's transaction and whether it revoked the key", () => {
    const rows = [
      { event: "act_refused", tx: "T1", block: 1002, item: 1, code: "ERR_PAYEE_MISMATCH", red: true },
      { event: "agent_key_revoked", tx: "T1", block: 1002, item: null, code: null, red: true },
      { event: "act_refused", tx: "T0", block: 1001, item: 1, code: "ERR_PAYEE_MISMATCH", red: true },
    ];
    expect(refusalTx(ref(2), rows)).toEqual({ tx: "T1", revokedInTx: true });
    expect(refusalTx(ref(1), rows)).toEqual({ tx: "T0", revokedInTx: false });
    expect(refusalTx(ref(3, { code: "ERR_NOT_DUE" }), rows)).toEqual({ tx: null, revokedInTx: undefined });
  });
});

describe("signature", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ a: 1 });
  it("is HMAC-SHA256 over `<t>.<raw body>`, as t=<unix>,v1=<hex>", () => {
    const h = sign(secret, body, now);
    expect(h).toBe(`t=${now},v1=${createHmac("sha256", secret).update(`${now}.${body}`).digest("hex")}`);
  });
  it("verifies, and rejects a changed body, a wrong secret or an old timestamp", () => {
    const h = sign(secret, body, now);
    expect(verify(secret, h, body, now + 10)).toBe(true);
    expect(verify(secret, h, body + " ", now)).toBe(false);
    expect(verify("whsec_other", h, body, now)).toBe(false);
    expect(verify(secret, h, body, now + 301)).toBe(false);
    expect(verify(secret, "v1=abc", body, now)).toBe(false);
  });
});

describe("retries", () => {
  it("backs off 30 s, 2 min, 10 min, 1 h, 6 h, then stops", () => {
    const t0 = 1_000_000;
    expect(BACKOFF_SECS.map((_, i) => (nextAttempt(i + 1, t0) as { at: string }).at)).toEqual(BACKOFF_SECS.map((s) => new Date(t0 + s * 1000).toISOString()));
    expect(nextAttempt(MAX_ATTEMPTS, t0)).toEqual({ retry: false });
  });
  it("retries timeouts, 408, 429 and 5xx, not other 4xx", () => {
    expect([null, 408, 429, 500, 503].every(retryable)).toBe(true);
    expect([400, 401, 404, 410].some(retryable)).toBe(false);
  });
});

describe("Telegram and email", () => {
  const p = payloadFor(ref(5), room({ agentKey: null, revokedKeys: 1, refusals: 5 }), [1, 2, 3, 4, 5].map((s) => ref(s)), { tx: "TXH", explorer: "https://testnet.nearblocks.io", appUrl: "https://x.example/app" });
  it("formats a short Telegram message with the code in plain words, attempted against approved, and links", () => {
    expect(telegramText(p)).toBe([
      "<b>Payment refused</b> in Market data &lt;Q4&gt;",
      "a48.accord-v2.testnet · item 1",
      "The recipient is not the approved one (<code>ERR_PAYEE_MISMATCH</code>)",
      "Tried: 12.00 tUSDC to stranger.testnet",
      "Approved: 12.00 tUSDC to halcyon-mm.testnet",
      "Nothing was sent. Refusals so far: 5 · the agent key was revoked",
      '<a href="https://x.example/app/agreements/a48.accord-v2.testnet?tab=activity&amp;incident=5">Open the incident</a> · <a href="https://testnet.nearblocks.io/txns/TXH">transaction</a>',
    ].join("\n"));
  });
  it("marks a test message", () => {
    expect(telegramText(testPayload("https://x.example/app", null)).startsWith("<b>Test alert · Payment refused</b>")).toBe(true);
  });
  it("writes an email subject and body", () => {
    const e = emailText(p);
    expect(e.subject).toBe("Accord refused a payment in Market data <Q4> (ERR_PAYEE_MISMATCH)");
    expect(e.text).toContain("Tried: 12.00 tUSDC to stranger.testnet.");
    expect(e.text).toContain("Incident: https://x.example/app/agreements/a48.accord-v2.testnet?tab=activity&incident=5");
  });
  it("accepts Telegram chat ids and checks emails", () => {
    expect(cleanChat(" -1001234567890 ")).toBe("-1001234567890");
    expect(cleanChat("@accord_alerts")).toBe("@accord_alerts");
    expect(cleanChat("")).toBeNull();
    expect(() => cleanChat("https://t.me/x")).toThrow();
    expect(cleanEmail("ops@northwind.example")).toBe("ops@northwind.example");
    expect(() => cleanEmail("nope")).toThrow();
  });
});
