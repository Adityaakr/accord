// RotatingRpcProvider against local mock JSON-RPC servers: it moves on only when an endpoint fails as an endpoint
// (rate limit, 5xx, network) and hands every other RPC error back unchanged.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { KeyPair, KeyPairSigner, actions, baseDecode, baseEncode, createTransaction, type KeyPairString } from "near-api-js";
import { AccessKeyDoesNotExistError, ContractExecutionError } from "near-api-js/rpc-errors";
import { Accord, Chain, RotatingRpcProvider, RpcUnavailableError, isRpcBusy, rpcEndpoints, rpcFailureKind, rpcRequest } from "../src/index.js";

type Body = { method: string; params: unknown; id: string };
type Handler = (req: Body, res: ServerResponse) => void;

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((r) => { s.close(r); s.closeAllConnections(); })));
});

/** A mock RPC; records the methods it was asked for. */
async function mock(handler: Handler): Promise<{ url: string; calls: string[] }> {
  const calls: string[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw) as Body;
      calls.push(body.method);
      handler(body, res);
    });
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, calls };
}

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const ok = (result: unknown): Handler => (req, res) => json(res, 200, { jsonrpc: "2.0", id: req.id, result });
const BLOCK = { header: { height: 7, hash: "h", timestamp_nanosec: "1" } };
const fast = { wait: 0, cooldownMs: 0 };

/** A port nothing listens on. */
async function deadUrl(): Promise<string> {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const port = (s.address() as AddressInfo).port;
  await new Promise((r) => s.close(r));
  return `http://127.0.0.1:${port}`;
}

describe("RotatingRpcProvider", () => {
  it("fails over after an HTTP 429", async () => {
    const a = await mock((_, res) => json(res, 429, { error: { code: -429, message: "Rate limits exceeded, try again later" } }));
    const b = await mock(ok(BLOCK));
    const p = new RotatingRpcProvider([a.url, b.url], fast);
    expect(((await p.viewBlock({ finality: "final" })) as unknown as typeof BLOCK).header.height).toBe(7);
    expect(a.calls).toEqual(["block"]);
    expect(b.calls).toEqual(["block"]);
  });

  it("fails over after a JSON-RPC -429 error in an HTTP 200", async () => {
    const a = await mock((req, res) => json(res, 200, { jsonrpc: "2.0", id: req.id, error: { code: -429, message: "Rate limits exceeded" } }));
    const b = await mock(ok(BLOCK));
    const out = await rpcRequest<typeof BLOCK>([a.url, b.url], "block", { finality: "final" }, fast);
    expect(out.header.height).toBe(7);
    expect(a.calls.length).toBe(1);
  });

  it("fails over after a 502 and a 503", async () => {
    const a = await mock((_, res) => { res.writeHead(502); res.end("bad gateway"); });
    const b = await mock((_, res) => { res.writeHead(503); res.end("unavailable"); });
    const c = await mock(ok(BLOCK));
    const out = await rpcRequest<typeof BLOCK>([a.url, b.url, c.url], "block", { finality: "final" }, fast);
    expect(out.header.height).toBe(7);
  });

  it("does not fail over on a contract execution error, and keeps its message", async () => {
    const a = await mock((req, res) => json(res, 200, {
      jsonrpc: "2.0", id: req.id,
      error: {
        name: "HANDLER_ERROR", code: -32000, message: "Server error",
        cause: { name: "CONTRACT_EXECUTION_ERROR", info: { vm_error: { ExecutionError: "Smart contract panicked: ERR_RATE_LIMITED" }, block_height: 1, block_hash: "x" } },
      },
    }));
    const b = await mock(ok(BLOCK));
    const p = new RotatingRpcProvider([a.url, b.url], fast);
    const err = await p.callFunction({ contractId: "c.testnet", method: "m", args: {}, blockQuery: { finality: "final" } }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ContractExecutionError);
    expect((err as Error).message).toContain("Smart contract panicked: ERR_RATE_LIMITED");
    expect(rpcFailureKind(err)).toBeNull();
    expect(b.calls).toEqual([]);
  });

  it("keeps AccessKeyDoesNotExist as it is", async () => {
    const pk = KeyPair.fromRandom("ed25519").getPublicKey().toString();
    const a = await mock((req, res) => json(res, 200, {
      jsonrpc: "2.0", id: req.id,
      error: { name: "HANDLER_ERROR", code: -32000, message: "Server error", cause: { name: "UNKNOWN_ACCESS_KEY", info: { public_key: pk, block_height: 9, block_hash: "x" } } },
    }));
    const b = await mock(ok(BLOCK));
    const p = new RotatingRpcProvider([a.url, b.url], fast);
    const err = await p.viewAccessKey({ accountId: "x.testnet", publicKey: pk, finalityQuery: { finality: "final" } }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AccessKeyDoesNotExistError);
    expect((err as Error).message).toMatch(/does not exist/);
    expect(b.calls).toEqual([]);
  });

  it("rotates on a network error", async () => {
    const dead = await deadUrl();
    const b = await mock(ok(BLOCK));
    const out = await rpcRequest<typeof BLOCK>([dead, b.url], "block", { finality: "final" }, fast);
    expect(out.header.height).toBe(7);
  });

  it("rotates on a timeout", async () => {
    const slow = await mock(() => { /* never answers */ });
    const b = await mock(ok(BLOCK));
    const out = await rpcRequest<typeof BLOCK>([slow.url, b.url], "block", { finality: "final" }, { ...fast, timeoutMs: 200 });
    expect(out.header.height).toBe(7);
  });

  it("gives a clear error with the last cause when every endpoint fails", async () => {
    const dead = await deadUrl();
    const a = await mock((_, res) => json(res, 429, { error: { code: -429, message: "Rate limits exceeded" } }));
    const b = await mock((_, res) => { res.writeHead(500); res.end("boom"); });
    const err = await rpcRequest([dead, a.url, b.url], "block", { finality: "final" }, { ...fast, rounds: 2 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RpcUnavailableError);
    const e = err as RpcUnavailableError;
    expect(e.rateLimited).toBe(true);
    expect(e.attempts).toBe(6);
    expect(e.message).toMatch(/NEAR RPC unavailable: 6 attempt\(s\) across 3 endpoint\(s\) failed for block; last http:\/\/127\.0\.0\.1:\d+: Internal server error/);
    expect(isRpcBusy(e)).toBe(true);
    expect(a.calls.length).toBe(2);
  });

  it("prefers an endpoint that is not cooling down after a rate limit", async () => {
    const a = await mock((_, res) => json(res, 429, { error: { code: -429, message: "Rate limits exceeded" } }));
    const b = await mock(ok(BLOCK));
    const p = new RotatingRpcProvider([a.url, b.url], { wait: 0, cooldownMs: 60_000 });
    await p.request("block", { finality: "final" });
    await p.request("block", { finality: "final" });
    expect(a.calls.length).toBe(1);
    expect(b.calls.length).toBe(2);
  });

  it("after a transport failure and then InvalidNonce, reads the transaction by hash instead of re-signing", async () => {
    const kp = KeyPair.fromString(KeyPair.fromRandom("ed25519").toString() as KeyPairString);
    const tx = createTransaction("alice.testnet", kp.getPublicKey(), "bob.testnet", 5n,
      [actions.functionCall("m", {}, 1n, 0n)], baseDecode("11111111111111111111111111111111"));
    const { txHash: hashBytes, signedTransaction: signed } = await new KeyPairSigner(kp).signTransaction(tx);
    const hash = baseEncode(hashBytes);
    const outcome = { status: { SuccessValue: "" }, transaction: { hash }, transaction_outcome: {}, receipts_outcome: [] };
    const a = await mock((_, res) => { res.writeHead(502); res.end("bad gateway"); });
    const seen: unknown[] = [];
    const b = await mock((req, res) => {
      seen.push(req.params);
      if (req.method === "send_tx") {
        json(res, 200, {
          jsonrpc: "2.0", id: req.id,
          error: { name: "HANDLER_ERROR", code: -32000, message: "Server error", cause: { name: "INVALID_TRANSACTION", info: {} },
            data: { TxExecutionError: { InvalidTxError: { InvalidNonce: { ak_nonce: 5, tx_nonce: 5 } } } } },
        });
      } else ok(outcome)(req, res);
    });
    const p = new RotatingRpcProvider([a.url, b.url], fast);
    const out = (await p.sendTransactionUntil(signed, "FINAL")) as unknown as typeof outcome;
    expect(out.transaction.hash).toBe(hash);
    expect(b.calls).toEqual(["send_tx", "tx"]);
    expect(seen[1]).toEqual({ tx_hash: hash, sender_account_id: "alice.testnet", wait_until: "FINAL" });
  });

  it("InvalidNonce on a first send is thrown as it is (Account then re-signs)", async () => {
    const a = await mock((req, res) => json(res, 200, {
      jsonrpc: "2.0", id: req.id,
      error: { name: "HANDLER_ERROR", code: -32000, message: "Server error", cause: { name: "INVALID_TRANSACTION", info: {} },
        data: { TxExecutionError: { InvalidTxError: { InvalidNonce: { ak_nonce: 5, tx_nonce: 5 } } } } },
    }));
    const err = await rpcRequest([a.url], "send_tx", { signed_tx_base64: "AA==", wait_until: "FINAL" }, fast).catch((e: unknown) => e);
    expect((err as Error).message).toMatch(/Invalid nonce/);
    expect(a.calls).toEqual(["send_tx"]);
  });
});

describe("rpcEndpoints", () => {
  it("puts a configured list first, then the network's defaults, without duplicates", () => {
    expect(rpcEndpoints("https://my.rpc/, https://rpc.testnet.near.org", "testnet")).toEqual([
      "https://my.rpc/",
      "https://rpc.testnet.near.org",
      "https://test.rpc.fastnear.com",
      "https://rpc.testnet.fastnear.com",
      "https://near-testnet.drpc.org",
    ]);
    expect(rpcEndpoints(undefined, "mainnet")).toEqual(["https://free.rpc.fastnear.com", "https://rpc.mainnet.near.org"]);
    expect(rpcEndpoints("http://127.0.0.1:3030", "sandbox")).toEqual(["http://127.0.0.1:3030"]);
  });

  it("Chain on testnet falls back to the public endpoints", () => {
    expect(new Chain("https://test.rpc.fastnear.com", "testnet").rpcUrls).toHaveLength(4);
  });

  it("Chain with fallbacks off reads only from the configured URL, and Accord keeps that on every copy", () => {
    const proxy = "https://example.test/app/api/chain";
    expect(new Chain(proxy, "testnet", { fallbacks: false }).rpcUrls).toEqual([proxy]);
    const a = new Accord({ network: "testnet", factory: "accord-v2.testnet", rpc: proxy, rpcFallbacks: false });
    expect(a.chain.rpcUrls).toEqual([proxy]);
    expect(a.onFactory("accord-usdc.testnet").chain.rpcUrls).toEqual([proxy]);
    expect(a.withSigner({ accountId: "x.testnet", call: async () => { throw new Error("unused"); } }).chain.rpcUrls).toEqual([proxy]);
    expect(new Accord({ network: "testnet", factory: "accord-v2.testnet", rpc: proxy }).chain.rpcUrls).toHaveLength(5);
  });

  it("a busy JSON-RPC body in an HTTP 200 (what the app's read proxy answers) reads as busy", async () => {
    const m = await mock((req, res) => json(res, 200, { jsonrpc: "2.0", id: req.id, error: { code: -429, message: "Rate limited: the network is busy" } }));
    const c = new Chain(m.url, "testnet", { fallbacks: false, rounds: 1 });
    const e = await c.view("x.testnet", "config").catch((x: unknown) => x);
    expect(isRpcBusy(e)).toBe(true);
    expect(m.calls).toEqual(["query"]);
  });

  it("an endpoint's API key never appears in the error", async () => {
    const a = await mock((_, res) => { res.writeHead(502); res.end(); });
    const keyed = `${a.url}/v1/secret-key-123?apiKey=secret-key-123`;
    const err = (await rpcRequest([keyed], "block", {}, { ...fast, rounds: 1 }).catch((e: unknown) => e)) as Error;
    expect(err.message).toContain("Bad Gateway");
    expect(err.message).not.toContain("secret-key-123");
  });
});
