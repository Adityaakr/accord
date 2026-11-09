// A busy NEAR RPC reaches visitors as a short 503 with Retry-After and a calm line, never as the RPC's raw body; the
// demo panel backs off from 8 s to at most 30 s while it lasts; the throwaway signer re-posts a delegate on a 503.
import { describe, expect, it } from "vitest";
import { RpcUnavailableError } from "@accord/sdk";
import { chainError, looksRaw, RPC_BUSY_TEXT } from "../src/server/rpcerror";
import { MAX_MS, POLL_MS, nextPollDelay } from "../src/components/pollbackoff";
import { postRelay } from "../src/components/wallet/throwaway";

const rateLimited = () => {
  const cause = Object.assign(new Error('{"error":{"code":-429,"message":"Rate limits exceeded"}}'), { cause: 429 });
  return new RpcUnavailableError("query", true, 8, { url: "https://test.rpc.fastnear.com", error: cause });
};

describe("chainError", () => {
  it("turns a rate-limited RPC into 503, Retry-After and a calm line", () => {
    const r = chainError(rateLimited());
    expect(r.status).toBe(503);
    expect(r.headers?.["Retry-After"]).toBe("5");
    expect(r.body).toEqual({ error: RPC_BUSY_TEXT, busy: true });
  });

  it("keeps a contract's own error and status", () => {
    expect(chainError(Object.assign(new Error("ERR_NOT_BUYER"), { status: 409 }))).toEqual({ status: 409, body: { error: "ERR_NOT_BUYER" } });
    expect(chainError(new Error("the relayer is not configured")).status).toBe(502);
  });

  it("never passes on a raw JSON-RPC body", () => {
    const raw = '{"jsonrpc":"2.0","error":{"code":-32000,"message":"Server error"}}';
    expect(looksRaw(raw)).toBe(true);
    expect(chainError(new Error(raw)).body.error).not.toContain("jsonrpc");
    expect(looksRaw("ERR_PAYEE_MISMATCH")).toBe(false);
  });
});

describe("nextPollDelay", () => {
  it("doubles while busy up to about 30 s, honours Retry-After, and resets when the server answers", () => {
    let d = POLL_MS;
    const seen: number[] = [];
    for (let i = 0; i < 4; i++) seen.push((d = nextPollDelay(d, true)));
    expect(seen).toEqual([16_000, 30_000, 30_000, 30_000]);
    expect(nextPollDelay(POLL_MS, true, 25)).toBe(25_000);
    expect(nextPollDelay(MAX_MS, false)).toBe(POLL_MS);
  });
});

describe("postRelay", () => {
  it("posts the same delegate again after a busy 503, then returns the outcome", async () => {
    const bodies: string[] = [];
    let n = 0;
    const post = (async (_url: string, init?: RequestInit) => {
      bodies.push(String(init?.body));
      n++;
      return n === 1
        ? Response.json({ error: RPC_BUSY_TEXT, busy: true }, { status: 503, headers: { "Retry-After": "5" } })
        : Response.json({ outcome: { ok: 1 } });
    }) as typeof fetch;
    expect(await postRelay("AAAA", { busyWaits: [0, 0], post })).toEqual({ ok: 1 });
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toBe(bodies[1]);
  });

  it("gives up with the calm line after its retries", async () => {
    const post = (async () => Response.json({ error: RPC_BUSY_TEXT, busy: true }, { status: 503 })) as typeof fetch;
    await expect(postRelay("AAAA", { busyWaits: [0], post })).rejects.toThrow(/network is busy/);
  });

  it("does not retry a refusal", async () => {
    let n = 0;
    const post = (async () => { n++; return Response.json({ error: "ERR_NOT_ALLOWED" }, { status: 400 }); }) as typeof fetch;
    await expect(postRelay("AAAA", { busyWaits: [0, 0], post })).rejects.toThrow(/ERR_NOT_ALLOWED/);
    expect(n).toBe(1);
  });
});
