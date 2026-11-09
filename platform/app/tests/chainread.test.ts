// The browser's read proxy (server/chainread.ts): reads only, a short cache, failover on busy endpoints, the node's
// own errors passed through, and balances that read 0 NEAR for an account the chain does not know yet while the
// token may already hold funds for it.
import { describe, expect, it } from "vitest";
import {
  BUSY_MESSAGE, ReadCache, TTL, cachedRead, forward, ftBalanceOf, ftFrom, nearFrom, readBalances, refuseRead, ttlFor, upstreamBusy, viewAccount,
  type RpcRequestBody, type RpcResponseBody,
} from "../src/server/chainread";

const IMPLICIT = "1121e57b92861350f5dfa8bf90c4b5cbd797f8c3228c953cffa385cf6c190145";
const CIRCLE = "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";
const bytes = (v: unknown) => Array.from(new TextEncoder().encode(JSON.stringify(v)));
const ok = (result: unknown): RpcResponseBody => ({ jsonrpc: "2.0", id: "x", result });
const unknownAccount: RpcResponseBody = {
  jsonrpc: "2.0", id: "x",
  error: { code: -32000, message: "Server error", name: "HANDLER_ERROR", cause: { name: "UNKNOWN_ACCOUNT", info: { requested_account_id: IMPLICIT } }, data: `account ${IMPLICIT} does not exist while viewing` },
};

/** A fake upstream: answers by URL, records the calls. */
function upstream(answers: Record<string, (b: RpcRequestBody) => { status: number; body: unknown } | "throw">) {
  const calls: string[] = [];
  const f = async (url: string, init: RequestInit) => {
    calls.push(url);
    const b = JSON.parse(String(init.body)) as RpcRequestBody;
    const a = answers[url]!(b);
    if (a === "throw") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(a.body), { status: a.status, headers: { "content-type": "application/json" } });
  };
  return { f, calls };
}

describe("refuseRead", () => {
  it("allows the reads the app makes", () => {
    expect(refuseRead(viewAccount("a.testnet"))).toBeNull();
    expect(refuseRead(ftBalanceOf("t.testnet", "a.testnet"))).toBeNull();
    expect(refuseRead({ method: "query", params: { request_type: "view_access_key_list", finality: "final", account_id: "a.testnet" } })).toBeNull();
    expect(refuseRead({ method: "query", params: { request_type: "view_access_key", finality: "final", account_id: "a.testnet", public_key: "ed25519:x" } })).toBeNull();
    expect(refuseRead({ method: "block", params: { finality: "final" } })).toBeNull();
  });
  it("refuses anything that sends, and reads it does not need", () => {
    expect(refuseRead({ method: "send_tx", params: { signed_tx_base64: "AA" } })).toMatch(/not a read/);
    expect(refuseRead({ method: "broadcast_tx_commit", params: {} })).toMatch(/not a read/);
    expect(refuseRead({ method: "query", params: { request_type: "view_state", account_id: "a.testnet" } })).toMatch(/not a read/);
    expect(refuseRead({ method: "query", params: { request_type: "view_account" } })).toMatch(/account_id/);
    expect(refuseRead(null)).toBeTruthy();
    expect(refuseRead({ method: "query", params: [] })).toMatch(/params/);
  });
});

describe("ttlFor", () => {
  it("keeps state about 2.5 s, balances longer, and a read at a fixed block for a minute", () => {
    expect(ttlFor({ method: "query", params: { request_type: "call_function", method_name: "get", account_id: "a" } })).toBe(TTL.state);
    expect(ttlFor({ method: "query", params: { request_type: "view_access_key_list", account_id: "a" } })).toBe(TTL.state);
    expect(ttlFor(viewAccount("a"))).toBe(TTL.balance);
    expect(ttlFor(ftBalanceOf("t", "a"))).toBe(TTL.balance);
    expect(ttlFor({ method: "query", params: { request_type: "call_function", method_name: "get", account_id: "a", block_id: 5 } })).toBe(TTL.pinned);
    expect(TTL.state).toBeGreaterThanOrEqual(2_000);
    expect(TTL.state).toBeLessThanOrEqual(3_000);
    expect(TTL.balance).toBeGreaterThan(TTL.state);
  });
});

describe("upstreamBusy", () => {
  it("is a rate limit, a 5xx or a body that is not JSON-RPC", () => {
    expect(upstreamBusy(429, null)).toBe(true);
    expect(upstreamBusy(503, ok(1))).toBe(true);
    expect(upstreamBusy(200, null)).toBe(true);
    expect(upstreamBusy(200, { jsonrpc: "2.0", id: 1, error: { code: -429, message: "Too many requests" } })).toBe(true);
    expect(upstreamBusy(200, { jsonrpc: "2.0", id: 1, error: { message: "rate limit exceeded" } })).toBe(true);
  });
  it("is not the read's own answer, an error included", () => {
    expect(upstreamBusy(200, ok({ amount: "1" }))).toBe(false);
    expect(upstreamBusy(200, unknownAccount)).toBe(false);
  });
});

describe("forward and the cache", () => {
  it("moves past a rate-limited and an unreachable endpoint, and passes the node's error through unchanged", async () => {
    const u = upstream({ a: () => ({ status: 429, body: { error: "Too Many Requests" } }), b: () => "throw", c: () => ({ status: 200, body: unknownAccount }) });
    const r = await forward(["a", "b", "c"], viewAccount(IMPLICIT), { fetch: u.f });
    expect(u.calls).toEqual(["a", "b", "c"]);
    expect(r?.error?.cause?.name).toBe("UNKNOWN_ACCOUNT");
  });

  it("answers a JSON-RPC -429 in an HTTP 200 when every endpoint is busy, never an HTTP error", async () => {
    const u = upstream({ a: () => ({ status: 429, body: {} }), b: () => ({ status: 502, body: {} }) });
    const r = await cachedRead(new ReadCache(), ["a", "b"], { ...viewAccount("a.testnet"), id: 7 }, u.f);
    expect(r).toEqual({ jsonrpc: "2.0", id: 7, error: { code: -429, message: BUSY_MESSAGE } });
  });

  it("serves a repeat from the cache inside its TTL, with the caller's id, and asks again after it", async () => {
    let t = 1_000;
    const cache = new ReadCache(100, () => t);
    const u = upstream({ a: () => ({ status: 200, body: ok({ amount: "5" }) }) });
    const r1 = await cachedRead(cache, ["a"], { ...viewAccount("x.testnet"), id: 1 }, u.f);
    t += TTL.balance - 1;
    const r2 = await cachedRead(cache, ["a"], { ...viewAccount("x.testnet"), id: 2 }, u.f);
    expect(u.calls).toHaveLength(1);
    expect([r1.id, r2.id]).toEqual([1, 2]);
    t += 2;
    await cachedRead(cache, ["a"], viewAccount("x.testnet"), u.f);
    expect(u.calls).toHaveLength(2);
  });

  it("shares one upstream request between identical reads in flight, and never keeps a busy answer", async () => {
    const cache = new ReadCache();
    let busy = true;
    const u = upstream({ a: () => (busy ? { status: 429, body: {} } : { status: 200, body: ok({ amount: "1" }) }) });
    const [x, y] = await Promise.all([cachedRead(cache, ["a"], viewAccount("x.testnet"), u.f), cachedRead(cache, ["a"], viewAccount("x.testnet"), u.f)]);
    expect(u.calls).toHaveLength(1);
    expect(x.error?.code).toBe(-429);
    expect(y.error?.code).toBe(-429);
    busy = false;
    expect((await cachedRead(cache, ["a"], viewAccount("x.testnet"), u.f)).result).toEqual({ amount: "1" });
  });

  it("drops the oldest entries past its size", async () => {
    const cache = new ReadCache(2);
    const u = upstream({ a: () => ({ status: 200, body: ok({ amount: "1" }) }) });
    for (const n of ["p", "q", "r"]) await cachedRead(cache, ["a"], viewAccount(`${n}.testnet`), u.f);
    expect(cache.size).toBe(2);
  });
});

describe("balances", () => {
  it("reads 0 NEAR for an account the chain does not know yet, and the token's balance separately", async () => {
    // the visitor's case: no NEAR (the faucet had refused it), 20.00 USDC from Circle's faucet
    const u = upstream({
      a: (b) => (b.params.request_type === "view_account"
        ? { status: 200, body: unknownAccount }
        : { status: 200, body: ok({ result: bytes(b.params.account_id === CIRCLE ? "20000000" : "0"), logs: [], block_height: 1, block_hash: "h" }) }),
    });
    expect(await readBalances(new ReadCache(), ["a"], IMPLICIT, CIRCLE, u.f)).toEqual({ account: IMPLICIT, exists: false, near: "0", token: CIRCLE, ft: "20000000" });
    expect(await readBalances(new ReadCache(), ["a"], IMPLICIT, "tusdc.accord-v1.testnet", u.f)).toMatchObject({ exists: false, near: "0", ft: "0" });
  });

  it("is busy, not zero, when the network cannot answer", async () => {
    const u = upstream({ a: () => ({ status: 429, body: {} }) });
    expect(await readBalances(new ReadCache(), ["a"], "a.testnet", CIRCLE, u.f)).toBe("busy");
  });

  it("parses the pieces", () => {
    expect(nearFrom(unknownAccount)).toEqual({ exists: false, near: "0" });
    expect(nearFrom(ok({ amount: "2500000000000000000000000" }))).toEqual({ exists: true, near: "2500000000000000000000000" });
    expect(nearFrom({ jsonrpc: "2.0", id: 1, error: { code: -429, message: "busy" } })).toBeNull();
    expect(ftFrom(ok({ result: bytes("123") }))).toBe("123");
    expect(ftFrom(ok({ result: bytes({ no: 1 }) }))).toBeNull();
  });
});
